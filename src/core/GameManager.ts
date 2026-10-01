// ─────────────────────────────────────────────────────────────
// GameManager — the hub. Owns state, wires systems, drives the room loop.
// Rendering (ScenePort) and interface (UIPort) are plugged in from outside,
// so the whole game logic also runs headless in tests.
// ─────────────────────────────────────────────────────────────
import type { MetaState, RunState, Settings, Side, SaveData, RunRecord, RoomDefinition, MarkId } from './types';
import { defaultMeta, defaultSettings, newRun, SAVE_VERSION } from './state';
import { SaveManager } from './SaveManager';
import { AudioManager } from './AudioManager';
import { bus } from './EventBus';
import { hashStr } from './rng';
import { getHouse, type House, ROOM_ZERO } from '../world/HouseGenerator';
import { HouseGraph } from '../world/HouseGraph';
import { DoorManager, type DoorView } from '../world/DoorManager';
import { RoomManager, freshVisit, restoreVisit, saveVisit, type RoomVisitState, type RoomView } from '../world/RoomManager';
import { InventorySystem } from '../systems/InventorySystem';
import { KeySystem } from '../systems/KeySystem';
import { EffectRunner } from '../systems/Effects';
import { EventSystem } from '../systems/EventSystem';
import { NpcSystem } from '../systems/NpcSystem';
import { JournalSystem } from '../systems/JournalSystem';
import { MemorySystem } from '../systems/MemorySystem';
import { MapSystem } from '../systems/MapSystem';
import { MetaProgressionSystem } from '../systems/MetaProgressionSystem';
import { PuzzleSystem } from '../systems/PuzzleSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { OnboardingDirector } from '../systems/OnboardingDirector';
import { InvestigationSystem } from '../systems/InvestigationSystem';
import { evalCond } from '../systems/Conditions';
import { ITEMS } from '../data/items';
import { CHAR } from '../data/characters';

export interface TextOpts { style?: 'whisper' | 'loud' | 'system'; speaker?: string }

export interface EndingOption { id: string; label: string; hint: string }

export interface UIPort {
  text(t: string, o?: TextOpts): Promise<void>;
  toast(t: string): void;
  fragments(n: number, reason?: string): void;
  achievement(title: string, desc: string): void;
  choice(text: string, options: string[], speaker?: string): Promise<number>;
  dialogue(id: string, npc?: string): Promise<void>;
  puzzle(id: string): Promise<boolean>;
  read(loreId: string): Promise<void>;
  panel(name: string): void;
  glitch(text: string, ms: number): void;
  roomTitleOverride(text: string, ms: number): void;
  journalPing(): void;
  pulse(target: 'turn' | 'map' | 'journal' | 'bag'): void;
  death(cause: string, phrase: string): Promise<void>;
  ending(options: EndingOption[], context: string): Promise<string>;
  epilogue(title: string, text: string): Promise<void>;
}

export interface ScenePort {
  showRoom(view: RoomView, entering: boolean): Promise<void>;
  turn(view: RoomView): Promise<void>;
  openDoor(v: DoorView): Promise<void>;
  refresh(): void;
  fx(name: string, data: any): void;
}

/** Headless UI: resolves everything immediately (tests, simulations). */
export const HEADLESS_UI: UIPort = {
  text: async () => {}, toast: () => {}, fragments: () => {}, achievement: () => {},
  choice: async () => 0, dialogue: async () => {}, puzzle: async () => false, read: async () => {},
  panel: () => {}, pulse: () => {}, glitch: () => {}, roomTitleOverride: () => {}, journalPing: () => {},
  death: async () => {}, ending: async (o) => o[0].id, epilogue: async () => {},
};

export class GameManager {
  house: House;
  graph: HouseGraph;
  meta: MetaState = defaultMeta();
  run: RunState | null = null;
  settings: Settings = defaultSettings();
  roomState: RoomVisitState = freshVisit(ROOM_ZERO);
  ui: UIPort = HEADLESS_UI;
  scene: ScenePort | null = null;
  saves: SaveManager | null;
  audio: AudioManager;
  dead = false;
  busy = false;
  debug = false;

  doors: DoorManager; rooms: RoomManager; inventory: InventorySystem; keys: KeySystem; effects: EffectRunner;
  events: EventSystem; npcs: NpcSystem; journal: JournalSystem; memory: MemorySystem; map: MapSystem;
  progress: MetaProgressionSystem; puzzles: PuzzleSystem; dialogue: DialogueSystem;
  investigation: InvestigationSystem;
  director: OnboardingDirector;

  private tickAcc = 0;
  private saveTimer: any = 0;
  private t0 = Date.now();

  constructor(opts: { headless?: boolean } = {}) {
    this.house = getHouse();
    this.graph = new HouseGraph(this.house);
    this.saves = opts.headless ? null : new SaveManager();
    this.audio = new AudioManager(() => this.settings);
    if (opts.headless) this.audio.enabled = false;
    this.doors = new DoorManager(this);
    this.rooms = new RoomManager(this);
    this.inventory = new InventorySystem(this);
    this.keys = new KeySystem(this);
    this.effects = new EffectRunner(this);
    this.events = new EventSystem(this);
    this.npcs = new NpcSystem(this);
    this.journal = new JournalSystem(this);
    this.memory = new MemorySystem(this);
    this.map = new MapSystem(this);
    this.progress = new MetaProgressionSystem(this);
    this.puzzles = new PuzzleSystem(this);
    this.dialogue = new DialogueSystem(this);
    this.investigation = new InvestigationSystem(this);
    this.director = new OnboardingDirector(this);
  }

  clockMs(): number { return Date.now() - this.t0; }

  // ── persistence ──────────────────────────────────────────
  async load(): Promise<void> {
    if (!this.saves) return;
    const data = await this.saves.load();
    this.meta = data.meta;
    this.run = data.run;
    this.settings = data.settings;
    this.audio.applyVolumes();
    bus.emit('settings');
  }

  snapshot(): SaveData {
    if (this.run && this.roomState.roomId === this.run.currentRoom) {
      this.run.facing = this.roomState.facing;
      this.run.roomVisit = saveVisit(this.roomState);
    }
    return { version: SAVE_VERSION, meta: this.meta, run: this.run, settings: this.settings };
  }

  save(): void {
    if (!this.saves) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saves?.save(this.snapshot()), 250);
  }

  async resetAll(): Promise<void> {
    clearTimeout(this.saveTimer);
    await this.saves?.reset();
    this.meta = defaultMeta();
    this.run = null;
  }

  // ── labels ───────────────────────────────────────────────
  roomLabel(id: string): string {
    const r = this.house.rooms[id];
    if (!r) return id;
    if (id === ROOM_ZERO) return 'Sala Zero';
    if (r.hideNumber) return r.title === '??' ? 'uma sala sem número' : r.title;
    return `Sala ${r.number}`;
  }
  currentRoomDef(): RoomDefinition | undefined {
    return this.house.rooms[this.run?.currentRoom ?? this.roomState.roomId];
  }
  currentView(): RoomView {
    return this.rooms.view(this.roomState.roomId, this.roomState.facing);
  }
  fx(name: string, data: any = {}): void { this.scene?.fx(name, data); bus.emit('fx', { name, data }); }
  refreshView(): void { this.scene?.refresh(); }

  // ── runs ─────────────────────────────────────────────────
  async startRun(anchor?: string): Promise<void> {
    const m = this.meta;
    m.runCount++;
    const seed = hashStr('run' + m.runCount + ':' + Date.now());
    const maxHp = 3 + (m.upgrades.includes('coracao') ? 1 : 0);
    const inv = m.preserved.slice();
    m.preserved = [];
    this.run = newRun(m.runCount, seed, anchor ?? 'r001', maxHp, inv);
    this.run.anchor = anchor;
    this.dead = false;
    this.doors.relockForNewRun();
    this.npcs.placeForRun();
    await this.events.fire('runStart');
    if (anchor) this.journal.add('salas', `Recomecei a partir de uma âncora: ${this.roomLabel(anchor)}.`, 'anchor_start_' + m.runCount);
    bus.emit('run:start', this.run);
    await this.enterRoom(anchor ?? 'r001', null);
    this.investigation.refresh();
  }

  /** Resume a saved run after a page reload, without counting a new visit. */
  async resume(): Promise<void> {
    const run = this.run;
    if (!run) return this.enterZero();
    this.roomState = run.roomVisit?.roomId === run.currentRoom
      ? restoreVisit(run.roomVisit)
      : freshVisit(run.currentRoom, run.visited[run.currentRoom] ?? 1);
    this.roomState.facing = run.roomVisit?.facing ?? run.facing ?? 'front';
    const room = this.house.rooms[run.currentRoom];
    this.audio.ambience(room?.ambience ?? 'room');
    this.audio.musicMood(room?.music ?? (room?.category === 'memory' ? 'memory' : room?.category === 'danger' ? 'danger' : room?.category === 'character' ? 'mystery' : 'quiet'));
    bus.emit('room:enter', { room: run.currentRoom });
    await this.scene?.showRoom(this.currentView(), true);
    bus.emit('hud');
    this.investigation.refresh();
  }

  async enterZero(): Promise<void> {
    this.run = null;
    this.dead = false;
    this.roomState = freshVisit(ROOM_ZERO);
    this.audio.ambience('zero');
    this.audio.musicMood('quiet');
    bus.emit('room:enter', { room: ROOM_ZERO });
    await this.scene?.showRoom(this.currentView(), true);
    this.save();
    void this.director.onZero();
  }

  async enterRoom(roomId: string, via: DoorDefinitionLike | null, opts: { side?: Side } = {}): Promise<void> {
    if (roomId === ROOM_ZERO) return this.enterZero();
    const run = this.run;
    if (!run) return;
    const m = this.meta;
    const room = this.house.rooms[roomId];
    if (!room) { console.error('room missing', roomId); return; }
    if (this.roomState.roomId && this.roomState.roomId !== roomId && this.roomState.roomId !== ROOM_ZERO) await this.events.fire('exit');
    const prev = run.currentRoom;
    run.cameFrom = prev !== roomId ? prev : run.cameFrom;
    run.currentRoom = roomId;
    run.entryDoor = via?.id ?? null;
    run.path.push(roomId);
    if (run.path.length > 1) {
      run.trail ??= [];
      while (run.trail.length < run.path.length - 1) {
        const i = run.trail.length;
        run.trail.push({ from: run.path[i], to: run.path[i + 1], door: '', reverse: false });
      }
    }
    run.visited[roomId] = (run.visited[roomId] ?? 0) + 1;
    run.roomsSinceScare++;
    run.clock += 3;
    m.flags.totalRooms = (m.flags.totalRooms ?? 0) + 1;
    const first = !m.rooms[roomId];
    if (first) {
      m.rooms[roomId] = { visits: 0, firstRun: m.runCount, lastRun: m.runCount, named: true };
      run.newRooms++;
      this.memory.addFragments(1, 'sala nova');
      this.journal.add('salas', `${this.roomLabel(roomId)} — ${room.title}${room.subtitle ? ': ' + room.subtitle : ''}`, 'room_' + roomId);
      if (room.category === 'secret') run.secrets++;
    }
    m.rooms[roomId].visits++;
    m.rooms[roomId].lastRun = m.runCount;
    delete m.seenRooms[roomId];
    this.roomState = freshVisit(roomId, run.visited[roomId]);
    if (opts.side) this.roomState.facing = opts.side;
    run.facing = this.roomState.facing;
    run.roomVisit = saveVisit(this.roomState);
    this.audio.ambience(room.ambience ?? 'room');
    this.audio.musicMood(room.music ?? (room.category === 'memory' ? 'memory' : room.category === 'danger' ? 'danger' : room.category === 'character' ? 'mystery' : 'quiet'));
    this.npcs.onEnterRoom(roomId);
    bus.emit('room:enter', { room: roomId, first });
    const view = this.currentView();
    await this.scene?.showRoom(view, true);
    this.doors.markSeen(view.doors);
    if (first && room.onFirstEnter) await this.effects.run(room.onFirstEnter, roomId + ':first');
    if (room.onEnter) await this.effects.run(room.onEnter, roomId + ':enter');
    if (first) await this.events.fire('firstEnter');
    await this.events.fire('enter');
    this.investigation.refresh(true);
    this.protagonistThought(run.visited[roomId] === 1);
    void this.director.onEnter(roomId, run.visited[roomId] === 1);
    const sense = this.keys.senseHere();
    if (sense) this.ui.text(sense, { style: 'whisper' });
    bus.emit('hud');
    this.save();
    if (room.category === 'final') setTimeout(() => this.ending('auto'), 2600);
  }

  private protagonistThought(firstRunVisit: boolean): void {
    const run = this.run;
    if (!run || !firstRunVisit) return;
    const n = Object.keys(run.visited).length;
    let line: string | null = null;
    if (n === 1 && run.run > 1) line = 'Outra vez. Desta vez quero encontrar uma resposta, não apenas sair.';
    else if (n === 5 && !this.meta.lore.includes('foto_casa')) line = 'Já passei por salas demais para chamar isto de uma casa comum.';
    else if (n > 0 && n % 18 === 0) {
      const lines = [
        'Eu ainda sei por onde vim? Preciso olhar o meu caminho.',
        'Há alguém mudando estas salas. Quero saber se também me procura.',
        'Não posso continuar abrindo portas sem lembrar o que estou buscando.',
      ];
      line = lines[(Math.floor(n / 18) - 1) % lines.length];
    }
    if (line) void this.ui.text(line, { speaker: 'Você', style: 'whisper' });
  }

  // ── perspective ──────────────────────────────────────────
  async turn(): Promise<void> {
    if (this.busy || this.dead) return;
    this.busy = true;
    try {
      const rs = this.roomState;
      const wasFront = rs.facing === 'front';
      rs.facing = wasFront ? 'back' : 'front';
      rs.turns++;
      if (this.run) { this.run.turnsTotal++; this.run.facing = rs.facing; }
      if (wasFront) this.doors.onTurnAway(rs.roomId);
      this.audio.play('turn');
      await this.scene?.turn(this.currentView());
      this.doors.markSeen(this.currentView().doors);
      if (this.run) await this.events.fire('turn');
      bus.emit('turn', rs.facing);
      void this.director.onTurn(rs.facing);
      this.save();
    } finally { this.busy = false; }
  }

  tick(dt: number): void {
    if (this.dead) return;
    this.roomState.time += dt;
    this.tickAcc += dt;
    if (this.tickAcc >= 1) {
      this.tickAcc = 0;
      if (this.run && !this.busy) this.events.fire('tick');
      this.director.onTick();
      if (this.meta.upgrades.includes('detalhes') && this.roomState.time > 9 && !this.roomState.flags.__shimmer) {
        this.roomState.flags.__shimmer = true;
        this.fx('shimmer', {});
      }
    }
  }

  // ── props ────────────────────────────────────────────────
  prop(propId: string) { return this.currentView().props.find(p => p.id === propId); }

  propActions(propId: string): { label: string; idx: number }[] {
    const p = this.prop(propId);
    if (!p) return [];
    return (p.interact ?? []).map((it, idx) => ({ it, idx })).filter(({ it, idx }) => {
      if (!evalCond(it.cond, this, { salt: propId + idx })) return false;
      const key = `${this.roomState.roomId}:${propId}:${idx}`;
      if (it.once === 'forever' && this.meta.onceEvents.includes(key)) return false;
      if (it.once === 'run' && this.run?.onceEvents.includes(key)) return false;
      if (it.once === 'visit' && this.roomState.onceEvents.has(key)) return false;
      return true;
    }).map(({ it, idx }) => ({ label: it.label, idx }));
  }

  async propAct(propId: string, idx: number): Promise<void> {
    const p = this.prop(propId);
    const it = p?.interact?.[idx];
    if (!p || !it) return;
    const key = `${this.roomState.roomId}:${propId}:${idx}`;
    if (it.once === 'forever') this.meta.onceEvents.push(key);
    if (it.once === 'run') this.run?.onceEvents.push(key);
    if (it.once === 'visit') this.roomState.onceEvents.add(key);
    this.audio.play('ui');
    await this.effects.run(it.effects, key);
    this.investigation.refresh(true);
    this.refreshView();
    bus.emit('hud');
    this.save();
  }

  async propExamine(propId: string): Promise<void> {
    const p = this.prop(propId);
    if (!p) return;
    this.meta.flags.ob_examined = true;
    if (Array.isArray(p.examine)) await this.effects.run(p.examine);
    else await this.ui.text(p.examine ?? defaultExamine(p.kind));
  }

  // ── npcs ─────────────────────────────────────────────────
  async talkTo(npc: string): Promise<void> {
    const firstMeeting = (this.meta.npcs[npc]?.encounters ?? 0) === 0;
    const d = this.npcs.dialogueFor(npc);
    this.npcs.onTalk(npc);
    if (d) await this.ui.dialogue(d, npc);
    if (firstMeeting) {
      const thoughts: Record<string, string> = {
        sentado: 'Ele falou como se me conhecesse. Talvez conheça uma versão de mim que esqueci.',
        cartografo: 'Se ele conseguiu desenhar estas salas, talvez eu consiga encontrar o caminho de volta.',
        menina: 'Ela parece saber onde vou chegar antes de mim.',
        arquivista: 'As respostas estão guardadas em algum lugar. Ele sabe em qual pasta.',
        helena: 'Eu conheço a voz dela. Isso me assusta mais do que a Casa.',
      };
      if (thoughts[npc]) await this.ui.text(thoughts[npc], { speaker: 'Você', style: 'whisper' });
    }
    this.investigation.refresh(true);
    if (npc === 'semrosto' && this.run) {
      // his presence marks important places: he "looks" at the door that leads somewhere that matters
      const views = this.doors.visible(this.run.currentRoom, 'front').filter(v => !v.reverse);
      const important = views.find(v => { const to = this.doors.resolveTo(v.door, false); const r = to ? this.house.rooms[to] : undefined; return !!r && (r.tags.includes('important') || r.authored); });
      if (important) await this.ui.text(`A cabeça dele se inclina, devagar, para a porta ${important.pos === 'left' ? 'da esquerda' : important.pos === 'right' ? 'da direita' : 'do meio'}.`, { style: 'whisper' });
      else await this.ui.text('Ele não olha para nenhuma porta. Olha para você.', { style: 'whisper' });
    }
    this.refreshView();
    this.save();
  }
  async observeNpc(npc: string): Promise<void> {
    await this.ui.text(CHAR[npc]?.observe ?? '...');
  }

  // ── doors ────────────────────────────────────────────────
  async doorAction(v: DoorView, action: string, param?: string): Promise<void> {
    if (this.busy || this.dead) return;
    const d = v.door;
    const [kind, arg] = action.split(':');
    switch (kind) {
      case 'open': return this.openDoor(v);
      case 'observe': await this.ui.text(this.doors.observe(v)); return;
      case 'listen':
        this.audio.play('breath', { volume: 0.15 });
        await this.ui.text(this.doors.listen(v), { style: 'whisper' });
        if (!this.isLockedRecordOnly(v)) this.markHeard(v);
        await this.events.fire('listen', { door: d, material: d.visual.material });
        return;
      case 'peek': await this.ui.text(this.doors.peek(v)); await this.events.fire('peek', { door: d }); return;
      case 'knock':
        this.audio.play('knock', { volume: 0.7 });
        await this.events.fire('knock', { door: d });
        { const dest = this.doors.resolveTo(d, v.reverse); if (dest && this.npcs.presentIn(dest).length) await this.ui.text('Do outro lado, alguém responde: "Está aberta."', { style: 'whisper' }); }
        return;
      case 'talk': await this.ui.dialogue(d.talk ?? 'voz', 'voz'); return;
      case 'examine_lock': await this.ui.text(this.doors.examineLock(v)); this.save(); return;
      case 'use_key': if (param) await this.doors.tryKey(v, param); this.refreshView(); bus.emit('hud'); this.save(); return;
      case 'force': await this.doors.force(v); this.refreshView(); this.save(); return;
      case 'unlatch': await this.doors.unlatch(v); this.refreshView(); return;
      case 'puzzle': await this.openPuzzle(arg); this.refreshView(); return;
      case 'npc': await this.doors.npcHelp(v, arg); this.refreshView(); return;
      case 'tool': await this.doors.useTool(v, arg); this.refreshView(); return;
      case 'chalk': this.doors.rec(d.id).chalk = true; this.ui.text('Você risca um X de giz na madeira.'); this.refreshView(); this.save(); return;
      case 'mark': if (param) this.map.toggleDoorMark(d.id, param as MarkId); return;
    }
  }

  private isLockedRecordOnly(v: DoorView) { return v.locked; }
  private markHeard(v: DoorView) {
    const dest = this.doors.resolveTo(v.door, v.reverse);
    if (dest && !this.meta.rooms[dest] && !this.meta.seenRooms[dest]) this.meta.seenRooms[dest] = 'heard';
  }

  async openDoor(v: DoorView): Promise<void> {
    const d = v.door;
    const run = this.run;
    // Room Zero doors start runs
    if (d.meta && d.origin === ROOM_ZERO) {
      this.busy = true;
      try { await this.scene?.openDoor(v); } finally { this.busy = false; }
      await this.startRun(d.id.startsWith('z_anchor_') ? d.to! : undefined);
      return;
    }
    if (!run) return;
    if (v.locked && !v.reverse) {
      this.audio.play('key_fail');
      const r = this.doors.rec(d.id);
      if (r.state === 'seen' || r.state === 'unknown') r.state = 'locked';
      const firstTry = !r.notes?.includes('tried');
      (r.notes ??= []).includes('tried') || r.notes.push('tried');
      const lock = this.doors.lock(d.id);
      if (firstTry && !r.lockExamined) this.journal.add('portas', `${this.roomLabel(run.currentRoom)} — uma porta trancada (${materialName(d.visual.material)}). Não abriu.`, 'locked_' + d.id);
      await this.ui.text(lock?.lockType === 'memory_lock' ? 'A maçaneta gira. A porta não. Há uma placa em branco, esperando um nome.' : 'Trancada.');
      this.fx('doorRattle', { door: d.id });
      await this.events.fire('lockedTry', { door: d });
      this.save();
      return;
    }
    if (v.latch) { await this.doors.unlatch(v); this.refreshView(); return; }
    if (d.requirements && !v.reverse && !evalCond(d.requirements, this, { door: d, salt: 'req' + d.id })) {
      this.fx('doorRattle', { door: d.id });
      await this.ui.text(d.failText ?? 'A porta não abre.');
      return;
    }
    const dest = this.doors.resolveTo(d, v.reverse);
    if (!dest) {
      this.busy = true;
      try { await this.scene?.openDoor({ ...v }); } finally { this.busy = false; }
      this.fx('falseDoor', { door: d.id });
      const r = this.doors.rec(d.id);
      r.state = 'opened';
      await this.ui.text(this.keys.carried().includes('chave_irreal') ? 'Tijolos. Mas a chave estranha no seu bolso pesa na direção desta porta.' : 'Você abre. Atrás dela: tijolos. Uma porta que é só uma porta.');
      this.journal.add('portas', `${this.roomLabel(d.origin)}: uma porta que não leva a lugar nenhum.`, 'false_' + d.id);
      return;
    }
    this.busy = true;
    try {
      const material = d.visual.material;
      await this.events.fire('doorOpen', { door: d, doorPos: v.pos, material });
      if (!v.reverse && d.onOpen) await this.effects.run(d.onOpen, 'open' + d.id);
      if (this.dead) return;
      run.flags.prev_blue = material === 'blue' && !v.reverse;
      // Knowledge of a door is stored from its authored origin. Returning through it
      // still confirms the room on the far side, never a self-loop at that origin.
      this.doors.recordUse(d, v.reverse ? run.currentRoom : dest);
      (run.trail ??= []).push({ from: run.currentRoom, to: dest, door: d.id, reverse: v.reverse });
      run.doorsOpened++;
      this.progress.achievement('ach_primeira');
      if (d.type === 'echo') this.progress.achievement('ach_eco');
      this.audio.door(d.audio);
      await this.scene?.openDoor(v);
    } finally { this.busy = false; }
    await this.enterRoom(dest, v.reverse ? null : d);
  }

  async openPuzzle(id: string): Promise<void> {
    if (this.puzzles.solved(id)) { await this.ui.text('Já está resolvido.'); return; }
    await this.ui.puzzle(id);
    this.investigation.refresh(true);
  }

  // ── health & death ───────────────────────────────────────
  async damage(n: number, cause: string): Promise<void> {
    const run = this.run;
    if (!run || this.dead) return;
    run.hp = Math.max(0, run.hp - n);
    this.audio.play('damage');
    this.fx('damage', { n });
    this.keys.onDamage();
    bus.emit('hud');
    if (run.hp <= 0) await this.die(cause);
  }
  heal(n: number): void {
    const run = this.run;
    if (!run) return;
    run.hp = Math.min(run.maxHp, run.hp + n);
    bus.emit('hud');
  }

  async die(cause: string, phrase?: string): Promise<void> {
    const run = this.run;
    if (!run || this.dead) return;
    this.dead = true;
    const m = this.meta;
    m.deaths++;
    const rec: RunRecord = {
      run: run.run, seed: run.seed, startedAt: run.startedAt, endedAt: Date.now(), roomsVisited: Object.keys(run.visited).length,
      newRooms: run.newRooms, secrets: run.secrets, lastRoom: run.currentRoom, cause, doorsOpened: run.doorsOpened, keysUsed: run.keysUsed, anchor: run.anchor,
    };
    m.runs.push(rec);
    this.dead = false; await this.events.fire('death'); this.dead = true;
    // what survives: persistent keys, and (upgrade) one pocket item
    const keep = this.keys.survivingKeys();
    if (m.upgrades.includes('bolso_costurado')) {
      const first = run.inventory.find(i => !ITEMS[i]?.key && !keep.includes(i)) ?? run.inventory.find(i => ITEMS[i]?.key && !keep.includes(i));
      if (first) keep.push(first);
    }
    m.preserved = keep;
    const lost = run.inventory.filter(i => !keep.includes(i) && ITEMS[i]?.key);
    if (lost.length) this.journal.add('chaves', `Perdi ${lost.map(k => this.keys.displayName(k).toLowerCase()).join(', ')} quando esqueci. Vou ter que encontrar de novo.`, 'lost_keys_' + run.run);
    this.journal.add('eventos', `Exploração ${run.run} terminou na ${this.roomLabel(run.currentRoom)}. Causa: ${cause}.`, 'death_' + run.run);
    this.audio.play('death');
    this.audio.ambience(null);
    this.audio.musicMood('quiet');
    const phrases = ['Você esqueceu alguma coisa.', 'A Casa guarda o que você deixou cair.', 'De novo.', 'Não foi a primeira vez.', 'Alguém apaga a luz.', 'Você acorda onde sempre acorda.'];
    await this.ui.death(cause, phrase ?? phrases[m.deaths % phrases.length]);
    this.run = null;
    this.save();
    await this.enterZero();
  }

  // ── the ending ───────────────────────────────────────────
  async ending(_id: string): Promise<void> {
    if (!this.run || this.roomState.roomId !== 'r334' || this.meta.flags.__endingOpen) return;
    this.meta.flags.__endingOpen = true;
    const m = this.meta, r = m.route;
    const opts: EndingOption[] = [{ id: 'sair', label: 'Abrir a porta que está atrás de você', hint: 'Sair.' }];
    if (m.lore.includes('memoria_despedida') || m.flags.disse_lia || m.flags.helena_lembrada) opts.push({ id: 'lembrar', label: 'Dizer o nome dela em voz alta', hint: 'Lembrar.' });
    if (r.obediencia >= 6 || m.lore.includes('velho_guardiao') || m.lore.includes('mordomo_regimento')) opts.push({ id: 'ficar', label: 'Sentar na cadeira e ficar', hint: 'Ficar.' });
    if (r.ruptura >= 6 || m.lore.includes('maquinas') || m.lore.includes('fenda')) opts.push({ id: 'quebrar', label: 'Arrancar a porta do batente', hint: 'Quebrar.' });
    if (r.perdidos >= 6 || m.flags.sentado_despedida || m.flags.ester_partiu || m.lore.includes('lista_perdidos')) opts.push({ id: 'levar', label: 'Voltar para buscar os outros', hint: 'Não sair sozinho.' });
    const context = this.endingContext();
    const choice = await this.ui.ending(opts, context);
    const [title, text] = this.epilogue(choice);
    this.progress.achievement('ach_mil');
    if (!m.endings.includes(choice)) m.endings.push(choice);
    m.flags.cycle = (m.flags.cycle ?? 0) + 1;
    const run = this.run!;
    m.runs.push({ run: run.run, seed: run.seed, startedAt: run.startedAt, endedAt: Date.now(), roomsVisited: Object.keys(run.visited).length, newRooms: run.newRooms, secrets: run.secrets, lastRoom: 'r334', cause: 'A Porta 1000', doorsOpened: run.doorsOpened, keysUsed: run.keysUsed, ending: choice });
    this.journal.add('eventos', `Atravessei a Porta 1000. Escolhi: ${opts.find(o => o.id === choice)?.hint}`, 'ending_' + m.runs.length);
    await this.ui.epilogue(title, text);
    delete m.flags.__endingOpen;
    this.run = null;
    this.save();
    await this.enterZero();
  }

  endingContext(): string {
    const m = this.meta;
    const lines: string[] = ['Uma sala simples. Uma lâmpada. Uma cadeira. Atrás de você, a porta por onde entrou — a milésima.'];
    if (m.lore.includes('foto_casa')) lines.push('Você pensa na fotografia. Sete pessoas. Você sorria.');
    if (m.npcs.helena?.known) lines.push('Helena disse que ficou para quando você esquecesse.');
    if (m.npcs.velho && !m.npcs.velho.alive) lines.push('O Velho chegou perto. Você chegou.');
    if (m.lore.includes('outro_eu')) lines.push('Em algum lugar, alguém com o seu casaco escolheu voltar.');
    lines.push(`${Object.keys(m.rooms).length} salas lembradas. ${m.deaths} vezes esquecido.`);
    return lines.join('\n');
  }

  epilogue(choice: string): [string, string] {
    const m = this.meta;
    const lia = m.flags.disse_lia || m.lore.includes('grav_fita');
    switch (choice) {
      case 'lembrar': return ['LEMBRAR', `Você diz o nome.${lia ? ' Lia.' : ''} Não acontece nada — e é por isso que você entende. A Casa não era uma prisão: era o lugar onde você guardou cada dia que teve com ela, para não ter que viver o dia seguinte. Mil portas. Novecentos e noventa e nove dias. A última era a que você nunca quis abrir.\n\nVocê abre.\n\nDo outro lado há uma manhã comum. ${m.npcs.helena?.known ? 'Alguém está fazendo café. Ela não se vira, mas diz: "Demorou."' : 'Alguém está fazendo café.'}`];
      case 'ficar': return ['FICAR', `Você se senta. A cadeira reconhece o seu peso. A lâmpada acima de você pisca uma vez, como quem suspira aliviado.\n\nA Casa precisa de alguém que se lembre dela. Quem lembra, cuida. Quem cuida, fica.\n\nAmanhã alguém vai acordar numa sala com três portas simples. Você vai deixar uma fotografia sobre uma mesa para ela. No verso você vai escrever: "Se você encontrou isto novamente, eu falhei." E vai estar mentindo, um pouco, por gentileza.`];
      case 'quebrar': return ['QUEBRAR', `Você arranca a porta do batente. Atrás dela não há outra sala: há as máquinas, as costuras, o céu desenhado a giz. A Casa grita — e depois se cala.\n\nPela primeira vez, nenhuma porta leva a lugar nenhum. As salas ficam onde estão. ${m.npcs.davi ? 'Em algum corredor, um garoto que tinha nove anos há décadas começa, finalmente, a envelhecer direito.' : ''}\n\nVocê sai andando por um lugar que não sabe mais mudar. É mais difícil assim. É seu.`];
      case 'levar': return ['NÃO SOZINHO', `Você não abre a porta. Você volta.\n\n${m.flags.sentado_despedida ? 'Joaquim, que um dia levantou da cadeira. ' : ''}${m.flags.ester_partiu ? 'Ester, que parou de fazer chá. ' : ''}Davi, Clara, Aurélio, Benedito. Um por um, você vai buscar. Leva tempo. Leva mil portas de novo.\n\nQuando finalmente atravessam juntos, a Casa não resiste. Ela só observa, do jeito que casas observam quem vai embora: com as luzes acesas.`];
      default: return ['SAIR', `Você abre a porta atrás de você. Não é a Sala Zero. Não é a Sala Inicial. É um corredor com uma janela no fim, e pela janela entra luz de verdade.\n\nVocê não lembra de tudo. ${m.lore.length > 20 ? 'Lembra o bastante.' : 'Talvez nunca lembre.'} Mas lembra do caminho — e o caminho, você descobre, era a parte que valia.\n\nEm algum lugar atrás de você, uma porta range. A Casa espera. Ela sempre espera.`];
    }
  }

  // ── settings ─────────────────────────────────────────────
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]): void {
    this.settings[k] = v;
    this.audio.applyVolumes();
    bus.emit('settings');
    this.save();
  }
}

type DoorDefinitionLike = { id: string };

function defaultExamine(kind: string): string {
  const m: Record<string, string> = {
    bulb: 'Uma lâmpada nua pendurada por um fio. Zumbe.', lamp_shade: 'Uma luminária de teto. A cúpula tem uma mancha de mosquito morto.',
    chandelier: 'Um lustre. Faltam lâmpadas.', sconce: 'Uma arandela. A luz é amarela e cansada.', rug: 'Um tapete gasto no caminho entre as portas.',
    boxes: 'Caixas.', crate: 'Um caixote de madeira. Vazio.', stool: 'Um banquinho.', armchair: 'Uma poltrona afundada.', table: 'Uma mesa.',
  };
  return m[kind] ?? 'Nada de especial. Ou nada que você consiga ver agora.';
}

function materialName(m: string): string {
  return ({ wood_dark: 'madeira escura', wood_light: 'madeira clara', white: 'branca', green: 'verde', blue: 'azul', grey: 'cinza', oxblood: 'cor de vinho', red: 'vermelha', metal: 'metal', apartment: 'de apartamento', old: 'velha', black: 'preta', teal: 'verde-azulada', gold: 'dourada', painted: 'pintada', glass: 'de vidro' } as any)[m] ?? m;
}
