// DoorManager — visibility, destinations, persistent door state, locks and every way to open a door.
import type { GameManager } from '../core/GameManager';
import type { DoorDefinition, DoorRecord, DoorStateName, LockDefinition, Side, WallKind } from '../core/types';
import { ITEMS } from '../data/items';
import { THEMES } from '../data/themes';
import { evalCond } from '../systems/Conditions';
import { seededChance, hashStr } from '../core/rng';
import { CHAR } from '../data/characters';

export interface DoorView {
  door: DoorDefinition;
  reverse: boolean;
  latch: boolean;
  entry: boolean;
  x: number;
  wall: WallKind;
  d?: number;
  locked: boolean;
  chalk: boolean;
  pos: 'left' | 'center' | 'right';
}

export interface DoorAction { id: string; label: string }

const MATERIAL_DESC: Record<string, string> = {
  wood_dark: 'Uma porta de madeira escura', wood_light: 'Uma porta de madeira clara', white: 'Uma porta branca',
  green: 'Uma porta verde, antiga', blue: 'Uma porta azul-acinzentada', grey: 'Uma porta cinzenta, velha', oxblood: 'Uma porta cor de vinho',
  red: 'Uma porta vermelha. Vermelha de verdade', metal: 'Uma porta de metal', apartment: 'Uma porta de apartamento, com olho mágico',
  old: 'Uma porta velha, de tinta descascando', black: 'Uma porta preta', teal: 'Uma porta verde-azulada', gold: 'Uma porta dourada',
  bone: 'Uma porta clara como osso', painted: 'Uma porta pintada na parede', glass: 'Uma porta de vidro fosco',
};

export class DoorManager {
  constructor(private g: GameManager) {}

  get house() { return this.g.house; }

  rec(id: string): DoorRecord {
    return (this.g.meta.doors[id] ??= { state: 'unknown', seen: false, used: 0 });
  }
  state(id: string): DoorStateName { return this.g.meta.doors[id]?.state ?? 'unknown'; }
  lock(id: string): LockDefinition | undefined {
    const l = this.house.lockByDoor[id];
    return l ? this.house.locks[l] : undefined;
  }

  isLocked(id: string): boolean {
    const lock = this.lock(id);
    if (!lock) return false;
    const r = this.g.meta.doors[id];
    if (r?.unlocked || r?.state === 'destroyed' || r?.state === 'permanently_open') return false;
    if (lock.methods.some(m => m.kind === 'flag' && this.g.meta.flags[m.flag])) return false;
    return true;
  }

  // ── visibility ───────────────────────────────────────────
  visible(roomId: string, side: Side): DoorView[] {
    const run = this.g.run;
    const rs = this.g.roomState;
    const out: DoorView[] = [];
    const own = (this.house.outDoors[roomId] ?? []).map(id => this.house.doors[id]).filter(d => d.side === side);
    for (const d of own) {
      if (d.hidden && !this.rec(d.id).revealed && !run?.doorOverrides[d.id]?.revealed) continue;
      if (run?.doorOverrides[d.id]?.hidden || rs.hiddenDoors.has(d.id)) continue;
      if (this.state(d.id) === 'vanished') continue;
      out.push(this.view(d, false, false, d.x ?? 960, d.wall ?? 'back', d.d));
    }
    if (roomId === 'r000' && side === 'back') {
      this.g.meta.anchors.forEach((a, i) => {
        const d: DoorDefinition = {
          id: 'z_anchor_' + a, displayNumber: 0, type: 'memory', origin: 'r000', side: 'back', to: a, bidirectional: false,
          visual: { material: 'wood_light', lightUnder: '#e6b469', panels: 4 }, audio: 'soft', meta: true, important: true,
        };
        this.house.doors[d.id] = d;
        out.push(this.view(d, false, false, [960, 330, 1590][i] ?? 960, 'back'));
      });
    }
    if (side === 'back' && roomId !== 'r000') {
      const taken = out.map(v => v.x);
      const place = () => {
        for (const x of [960, 620, 1300, 330, 1590]) if (taken.every(t => Math.abs(t - x) > 230)) { taken.push(x); return x; }
        return null;
      };
      const addReverse = (d: DoorDefinition, entry: boolean, latch: boolean) => {
        if (out.some(v => v.door.id === d.id)) return;
        const x = place();
        if (x === null) return;
        out.push(this.view(d, true, latch, x, 'back', undefined, entry));
      };
      const entry = run?.entryDoor ? this.house.doors[run.entryDoor] : undefined;
      if (entry && entry.bidirectional && !entry.meta && !rs.hiddenDoors.has(entry.id) && !run?.doorOverrides[entry.id]?.hidden && entry.origin !== roomId && this.resolveTo(entry, false) === roomId) {
        addReverse(entry, true, false);
      }
      const incoming = (this.house.inDoors[roomId] ?? []).map(id => this.house.doors[id]).filter(d => d.to === roomId && d.origin !== roomId && !d.meta);
      for (const d of incoming) {
        if (this.isLocked(d.id) && this.lock(d.id)?.methods.some(m => m.kind === 'otherSide')) addReverse(d, false, true);
      }
      for (const d of incoming) {
        if (out.length >= 5) break;
        if (d.bidirectional && (this.g.meta.doors[d.id]?.used ?? 0) > 0 && !this.isLocked(d.id) && d.type !== 'oneway') addReverse(d, false, false);
      }
    }
    // left/center/right positions (for "the rightmost door" instructions)
    const sorted = [...out].sort((a, b) => a.x - b.x);
    sorted.forEach((v, i) => { v.pos = sorted.length === 1 ? 'center' : i === 0 ? 'left' : i === sorted.length - 1 ? 'right' : 'center'; });
    return out;
  }

  private view(d: DoorDefinition, reverse: boolean, latch: boolean, x: number, wall: WallKind, depth?: number, entry = false): DoorView {
    const rec = this.g.meta.doors[d.id];
    const chalk = !!rec?.chalk || (this.g.meta.upgrades.includes('marca_giz') && (rec?.used ?? 0) > 0);
    return { door: d, reverse, latch, entry, x, wall, d: depth, locked: reverse ? latch : this.isLocked(d.id), chalk, pos: 'center' };
  }

  /** Mark the doors of the current view as seen (persistent memory of doors). */
  markSeen(views: DoorView[]): void {
    const run = this.g.run;
    for (const v of views) {
      if (v.door.meta) continue;
      const r = this.rec(v.door.id);
      if (!r.seen) {
        r.seen = true;
        r.firstSeenRun = this.g.meta.runCount;
        r.firstSeenAt = this.g.meta.flags.totalRooms ?? 0;
      }
      if (r.state === 'unknown') r.state = v.locked && !v.reverse ? 'locked' : 'seen';
      if (!v.reverse && v.locked && r.state === 'seen') r.state = 'locked';
    }
    void run;
  }

  // ── destinations ─────────────────────────────────────────
  resolveTo(d: DoorDefinition, reverse: boolean): string | null {
    if (reverse) return d.origin;
    const run = this.g.run;
    const ov = run?.doorOverrides[d.id]?.to;
    if (ov) return ov;
    const m = this.g.meta.doorDestOverrides[d.id];
    if (m) return m;
    for (const rule of d.destinationRules ?? []) if (evalCond(rule.cond, this.g, { salt: 'dest:' + d.id, door: d })) return rule.to;
    return d.to;
  }

  // ── actions menu ─────────────────────────────────────────
  actions(v: DoorView): DoorAction[] {
    const d = v.door;
    const acts: DoorAction[] = [];
    const lock = this.lock(d.id);
    const hasKeys = this.g.keys.carried().length > 0;
    if (v.latch) {
      acts.push({ id: 'unlatch', label: 'Destrancar pelo lado de dentro' });
      acts.push({ id: 'listen', label: 'Ouvir' });
      return acts;
    }
    if (v.locked && lock && !v.reverse) {
      acts.push({ id: 'examine_lock', label: 'Examinar fechadura' });
      acts.push({ id: 'listen', label: 'Ouvir' });
      if (hasKeys && lock.methods.some(m => m.kind === 'key')) acts.push({ id: 'use_key', label: 'Usar chave' });
      for (const m of lock.methods) {
        if (m.kind === 'puzzle' && !this.g.meta.puzzlesSolved.includes(m.puzzle) && this.g.puzzles.def(m.puzzle)?.room === this.g.run?.currentRoom) acts.push({ id: 'puzzle:' + m.puzzle, label: 'Examinar o mecanismo' });
        if (m.kind === 'npc' && this.g.npcs.isHere(m.npc) && evalCond(m.cond, this.g)) acts.push({ id: 'npc:' + m.npc, label: `Pedir ajuda a ${this.g.npcs.displayName(m.npc)}` });
        if (m.kind === 'tool' && this.g.inventory.has(m.item)) acts.push({ id: 'tool:' + m.item, label: `Usar ${ITEMS[m.item]?.name.toLowerCase()}` });
      }
      acts.push({ id: 'force', label: 'Tentar forçar' });
      if (d.visual.material !== 'metal' && lock.visual !== 'toothless') acts.push({ id: 'peek', label: 'Olhar pela fechadura' });
      return acts;
    }
    if (d.type === 'false' && !v.reverse) {
      acts.push({ id: 'open', label: 'Abrir' });
      if (hasKeys) acts.push({ id: 'use_key', label: 'Usar chave' });
      return acts;
    }
    const dest = this.resolveTo(d, v.reverse);
    const suspicious = this.isSuspicious(v, dest);
    const listenAll = this.g.meta.upgrades.includes('ouvido_atento') || this.g.inventory.has('estetoscopio');
    acts.push({ id: 'open', label: v.reverse ? 'Voltar por ela' : 'Abrir' });
    if (suspicious || listenAll) acts.push({ id: 'listen', label: 'Ouvir' });
    if (suspicious && d.visual.material !== 'metal') acts.push({ id: 'peek', label: 'Olhar pela fechadura' });
    if (suspicious) acts.push({ id: 'knock', label: 'Bater' });
    if (d.talk || (dest && this.g.npcs.presentIn(dest).length && seededChance(this.g.run?.seed ?? 1, 'talk' + d.id, 0.3))) acts.push({ id: 'talk', label: 'Falar através da porta' });
    if (this.g.inventory.has('giz') && !this.g.meta.doors[d.id]?.chalk) acts.push({ id: 'chalk', label: 'Marcar com giz' });
    return acts;
  }

  /** Simple doors open at a touch. Everything else shows a small menu. */
  isSimple(v: DoorView): boolean {
    return this.actions(v).length === 1 && this.actions(v)[0].id === 'open';
  }

  private isSuspicious(v: DoorView, dest: string | null): boolean {
    const d = v.door;
    if (v.reverse) return false;
    if (d.talk || d.listen || d.visual.lightUnder || d.visual.material === 'red' || d.visual.material === 'black') return true;
    if (['unstable', 'observer', 'echo', 'memory', 'impossible', 'conditional'].includes(d.type)) return true;
    if (dest && this.g.npcs.presentIn(dest).length) return true;
    return seededChance(this.g.run?.seed ?? 1, 'susp' + d.id, 0.12);
  }

  // ── individual interactions ──────────────────────────────
  observe(v: DoorView): string {
    const d = v.door;
    const r = this.g.meta.doors[d.id];
    const parts: string[] = [];
    parts.push((MATERIAL_DESC[d.visual.material] ?? 'Uma porta') + '.');
    if (d.visual.peeling && d.visual.peeling > 0.3) parts.push('A tinta descasca em lascas.');
    if (d.visual.scratches && d.visual.scratches > 0.4) parts.push('Arranhões na altura da maçaneta.');
    if (d.visual.chain) parts.push('Uma corrente atravessada.');
    if (d.visual.lightUnder) parts.push('Uma luz quente escapa por baixo dela.');
    const lock = this.lock(d.id);
    if (lock && this.isLocked(d.id)) parts.push(r?.lockExamined ? capitalize(lock.shortDesc.replace(/^porta (com )?/, '')) + '.' : 'Tem uma fechadura.');
    if (v.reverse) parts.push(v.entry ? 'É por onde você entrou.' : 'Você já passou por ela, do outro lado.');
    else if ((r?.used ?? 0) > 0) parts.push('Você já a atravessou.');
    if (v.chalk) parts.push('Uma marca de giz sua, na madeira.');
    if (!d.meta) parts.push(`No batente, a lápis, bem pequeno: ${d.displayNumber}.`);
    if (d.observe) parts.push(d.observe);
    return parts.join(' ');
  }

  listen(v: DoorView): string {
    const d = v.door;
    if (d.listen) return d.listen;
    const dest = this.resolveTo(d, v.reverse);
    if (!dest) return 'Nada. Nem o ar se mexe do outro lado. Como se não houvesse outro lado.';
    const room = this.house.rooms[dest];
    const salt = hashStr(d.id);
    const pick = (arr: string[]) => arr[salt % arr.length];
    if (this.g.npcs.presentIn(dest).length) return pick(['Alguém respira do outro lado. Devagar.', 'Uma cadeira range. Alguém mudou de posição.', 'Você ouve alguém cantarolando baixinho.', 'Passos curtos. Alguém andando em círculos.']);
    switch (room.category) {
      case 'danger': return pick(['Algo pesado sendo arrastado.', 'Um gotejar grosso, lento.', 'Uma respiração que não é humana.']);
      case 'sanctuary': return pick(['Um silêncio bom, do tipo que descansa.', 'Chuva, longe. Um som que acalma.']);
      case 'memory': return pick(['Uma risada de criança, abafada.', 'Uma colher batendo numa xícara.']);
      case 'anomaly': case 'impossible': return pick(['Um sino tocando debaixo d\'água.', 'O som desta mesma sala, com um segundo de atraso.', 'Nada — e depois, a sua própria voz dizendo "nada".']);
      case 'puzzle': return pick(['Um tique-taque que para quando você presta atenção.', 'Um mecanismo, esperando.']);
      case 'lore': return pick(['Papel. Muito papel se mexendo.', 'Alguém folheando páginas.']);
      default: break;
    }
    const amb = THEMES[room.theme]?.ambience;
    if (amb === 'rain') return 'Chuva num telhado que não deveria existir.';
    if (amb === 'drip') return 'Uma torneira pingando.';
    if (amb === 'clock') return 'Um relógio. Tique. Tique.';
    if (amb === 'boiler') return 'Um ronco grave, como uma barriga enorme.';
    if (room.tags.includes('empty')) return 'Nada. Um nada muito grande.';
    return pick(['Silêncio.', 'O zumbido de uma lâmpada.', 'Madeira rangendo sozinha.', 'Um vento que não sabe de onde vem.', 'Silêncio. Silêncio demais?']);
  }

  peek(v: DoorView): string {
    const dest = this.resolveTo(v.door, v.reverse);
    if (!dest) return 'Pela fechadura: tijolos. Só tijolos.';
    const room = this.house.rooms[dest];
    const props = room.front.props.filter(p => !p.invisible && p.kind !== 'bulb');
    const thing = props.length ? propGlimpse(props[hashStr(dest) % props.length].kind) : 'o chão de madeira';
    const wall = ({ plain: 'uma parede de reboco velho', bedroom: 'um papel de parede listrado', corridor: 'um lambri escuro', parlor: 'um papel de parede adamascado', empty: 'uma parede nua', green: 'um papel de parede verde', blue: 'uma parede azulada', kitchen: 'azulejos', bathroom: 'azulejos manchados', storage: 'tábuas', library: 'estantes', gallery: 'molduras', nursery: 'listras claras', archive: 'gavetas de metal', infirmary: 'azulejos brancos', basement: 'tijolos úmidos', chapel: 'pedra', ruin: 'reboco caído', greenhouse: 'folhas', white: 'branco', void: 'escuro', warm: 'uma luz de manhã', flooded: 'água' } as any)[room.theme] ?? 'uma parede';
    if (!this.isLocked(v.door.id)) this.g.meta.seenRooms[dest] = this.g.meta.seenRooms[dest] ?? 'peeked';
    return `Pela fechadura: ${wall} e ${thing}.`;
  }

  examineLock(v: DoorView): string {
    const lock = this.lock(v.door.id);
    if (!lock) return 'Não há fechadura.';
    const r = this.rec(v.door.id);
    const first = !r.lockExamined;
    r.lockExamined = true;
    r.lockKnown = true;
    if (r.state === 'seen' || r.state === 'unknown') r.state = 'locked';
    const room = this.g.run?.currentRoom ?? v.door.origin;
    if (first) {
      this.g.journal.add('portas', `${this.g.roomLabel(room)} — ${lock.shortDesc}. Não consegui abrir.`, 'lock_' + v.door.id);
      // subtle memory hint: do I carry anything that "looks like it belongs here"?
    }
    let extra = '';
    if (this.g.meta.upgrades.includes('olhos_simbolo')) extra = ` (${lockTypeName(lock.lockType)})`;
    const hints = Object.entries(r.triedKeys ?? {}).filter(([, v2]) => v2 === 'no_turn');
    if (hints.length) extra += ' Você lembra: uma chave sua entrou aqui, mas não girou.';
    return lock.description + extra;
  }

  // ── unlocking ────────────────────────────────────────────
  async tryKey(v: DoorView, keyId: string): Promise<boolean> {
    const d = v.door;
    const fit = this.g.keys.fit(keyId, d);
    const r = this.rec(d.id);
    this.g.audio.play(fit === 'opens' ? 'key_turn' : 'key_fail');
    const keyName = this.g.keys.displayName(keyId);
    if (fit === 'opens') {
      if (d.type === 'false' && !this.lock(d.id)) {
        // the unreal key turns a painted door into a passage
        const secret = (d as any).secretTo as string | undefined;
        if (!secret) { this.g.ui.text('A chave entra numa fechadura que não existe. Nada acontece. Ainda.'); return false; }
        this.g.meta.doorDestOverrides[d.id] = secret;
        r.state = 'permanently_open'; r.unlocked = true;
        (this.house.doors[d.id] as any).type = 'impossible';
        this.g.ui.text('A chave entra onde não havia fechadura. Gira. A pintura se abre como madeira de verdade.');
        this.g.progress.achievement('ach_segredo');
        this.g.memory.route('ruptura', 2);
        await this.g.keys.onUsed(keyId, d);
        return true;
      }
      await this.unlock(v, 'key', keyId);
      return true;
    }
    (r.triedKeys ??= {})[keyId] = fit;
    const krec = this.g.keys.record(keyId);
    const note = fit === 'no_turn' ? `Entrou, mas não girou na ${this.g.roomLabel(d.origin)}.` : `Não encaixou na ${this.g.roomLabel(d.origin)}.`;
    if (!krec.notes.includes(note)) krec.notes.push(note);
    this.g.ui.text(fit === 'no_turn' ? `${keyName}: ela entra, mas não gira.` : `${keyName}: não encaixa.`);
    await this.g.events.fire('lockedTry', { door: d });
    return false;
  }

  async unlock(v: DoorView, method: string, keyId?: string): Promise<void> {
    const d = v.door;
    const lock = this.lock(d.id);
    const r = this.rec(d.id);
    const m = this.g.meta;
    const longAgo = (r.firstSeenRun !== undefined && r.firstSeenRun < m.runCount) || ((m.flags.totalRooms ?? 0) - (r.firstSeenAt ?? m.flags.totalRooms ?? 0) >= 5);
    const examinedBefore = !!r.lockExamined;
    r.unlocked = true;
    r.unlockedRun = m.runCount;
    r.lockMethod = method;
    r.state = method === 'force' ? 'destroyed' : 'unlocked';
    this.g.audio.play(method === 'force' ? 'crash' : 'unlock');
    if (keyId) await this.g.keys.onUsed(keyId, d);
    const label = this.g.roomLabel(d.origin);
    this.g.journal.add('portas', method === 'key' ? `Abri a porta trancada da ${label} com ${this.g.keys.displayName(keyId!).toLowerCase()}.` : method === 'force' ? `Arrombei a porta trancada da ${label}.` : method === 'otherSide' ? `Destranquei pelo lado de dentro uma porta que dá na ${label}.` : `A porta trancada da ${label} se abriu.`, 'unlock_' + d.id);
    if (longAgo) {
      this.g.ui.text(method === 'otherSide' ? 'Você reconhece esta porta. Do outro lado dela, uma vez, você ficou parado.' : 'Você lembrava desta porta.', { style: 'whisper' });
      this.g.progress.achievement('ach_promessa');
      this.g.memory.addFragments(3, 'promessa cumprida');
    } else {
      this.g.memory.addFragments(1, 'porta aberta');
    }
    if (keyId && examinedBefore && longAgo) this.g.progress.achievement('ach_eu_sei');
    if (lock?.onUnlock) await this.g.effects.run(lock.onUnlock);
    if (this.g.run) this.g.run.flags.forced_last = method === 'force';
    await this.g.events.fire('unlock', { door: d });
    this.g.save();
  }

  async unlatch(v: DoorView): Promise<void> {
    this.g.ui.text('Há um trinco deste lado. Ele cede com um estalo.');
    await this.unlock(v, 'otherSide');
  }

  async force(v: DoorView): Promise<boolean> {
    const d = v.door;
    const lock = this.lock(d.id);
    if (!lock) return false;
    const forceMethod = lock.methods.find(m => m.kind === 'force');
    if (!lock.forceable && !forceMethod) {
      this.g.ui.text(lock.unforceableText ?? 'Você empurra com o ombro. A porta nem percebe.');
      return false;
    }
    const run = this.g.run!;
    const crowbar = this.g.inventory.has('pe_de_cabra') || this.g.inventory.has('martelo');
    const ok = crowbar || seededChance(run.seed, 'force' + d.id + run.visited[run.currentRoom], 0.5);
    this.g.audio.play('bang');
    this.g.fx('shake', { intensity: 0.006, ms: 250 });
    if (!ok) {
      this.g.ui.text('Você joga o peso do corpo contra a porta. Ela aguenta. Você, nem tanto.');
      await this.g.damage(forceMethod && forceMethod.kind === 'force' ? forceMethod.hpRisk ?? 1 : 1, 'uma porta que não quis ceder');
      return false;
    }
    this.g.ui.text(crowbar ? 'A madeira estala em volta da fechadura. O estrondo ecoa pela Casa.' : 'A fechadura cede com um estalo feio. Você está sangrando um pouco. A Casa ouviu.');
    if (!crowbar) await this.g.damage(1, 'arrombar uma porta');
    if (lock.forceConsequence) await this.g.effects.run(lock.forceConsequence);
    this.g.npcs.adjustTrust('mordomo', -1);
    this.g.memory.route('ruptura', 1);
    if (this.g.inventory.has('pe_de_cabra') && seededChance(run.seed, 'bend' + d.id, 0.12)) {
      this.g.inventory.remove('pe_de_cabra');
      this.g.ui.text('O pé-de-cabra entorta e fica preso na madeira.');
    }
    await this.unlock(v, 'force');
    return true;
  }

  async useTool(v: DoorView, item: string): Promise<void> {
    const lock = this.lock(v.door.id);
    const m = lock?.methods.find(x => x.kind === 'tool' && x.item === item);
    if (!m || m.kind !== 'tool') return;
    this.g.ui.text(m.text ?? 'Você força o mecanismo com a ferramenta.');
    if (m.consequence) await this.g.effects.run(m.consequence);
    await this.unlock(v, 'tool');
  }

  async npcHelp(v: DoorView, npc: string): Promise<void> {
    const lock = this.lock(v.door.id);
    const m = lock?.methods.find(x => x.kind === 'npc' && x.npc === npc);
    if (!m || m.kind !== 'npc') return;
    this.g.ui.text(m.text ?? `${this.g.npcs.displayName(npc)} abre a porta para você.`);
    this.g.npcs.adjustTrust(npc, 1);
    await this.unlock(v, 'npc');
  }

  /** Puzzle solved somewhere: open any lock that accepts it. */
  async onPuzzleSolved(puzzleId: string): Promise<void> {
    for (const lock of Object.values(this.house.locks)) {
      if (!lock.methods.some(m => m.kind === 'puzzle' && m.puzzle === puzzleId)) continue;
      if (!this.isLocked(lock.door)) continue;
      const d = this.house.doors[lock.door];
      await this.unlock({ door: d, reverse: false, latch: false, entry: false, x: d.x ?? 960, wall: 'back', locked: true, chalk: false, pos: 'center' }, 'puzzle');
    }
  }

  /** Observer doors: when not observed, they may lead elsewhere. */
  onTurnAway(roomId: string): void {
    const run = this.g.run;
    if (!run) return;
    for (const id of this.house.outDoors[roomId] ?? []) {
      const d = this.house.doors[id];
      if (d.type !== 'observer' || !d.observerAlt) continue;
      const cur = run.doorOverrides[id]?.to;
      run.doorOverrides[id] = { ...(run.doorOverrides[id] ?? {}), to: cur === d.observerAlt ? (d.to ?? undefined) : d.observerAlt };
    }
  }

  recordUse(d: DoorDefinition, dest: string): void {
    if (d.meta) return;
    const r = this.rec(d.id);
    r.used++;
    r.lastDest = dest;
    r.destsSeen = Array.from(new Set([...(r.destsSeen ?? []), dest]));
    if (r.state !== 'destroyed' && r.state !== 'permanently_open') r.state = 'opened';
    if (d.type === 'unstable' || d.type === 'observer') this.g.journal.add('portas', `A porta ${d.displayNumber} (${this.g.roomLabel(d.origin)}) já levou a ${r.destsSeen.map(x => this.g.roomLabel(x)).join(' e a ')}.`, 'unstable_' + d.id);
  }

  /** At run start: golden (choice) locks are replaced by the House. */
  relockForNewRun(): void {
    for (const lock of Object.values(this.house.locks)) {
      if (lock.relock !== 'eachRun') continue;
      const r = this.g.meta.doors[lock.door];
      if (r?.unlocked) {
        r.unlocked = false; r.state = 'locked';
        this.g.run?.relockedDoors.push(lock.door);
        this.g.journal.add('portas', `A fechadura dourada da ${this.g.roomLabel(this.house.doors[lock.door].origin)} parece nova de novo.`, 'relock_' + lock.door + '_' + this.g.meta.runCount);
      }
    }
  }
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function lockTypeName(t: string): string {
  return ({
    old_iron: 'ferro antigo', brass_small: 'latão pequeno', simple: 'ferro simples', symbol_sun: 'símbolo do sol', number_17: 'número 17',
    memory_lock: 'memória', toothless: 'fenda lisa', bone: 'osso', gold: 'ouro', glass: 'vidro', service: 'serviço', chapel: 'capela',
    clock: 'relógio', impossible: 'impossível', padlock: 'cadeado', broken_pair: 'chave partida', warm: 'morna',
  } as any)[t] ?? t;
}

function propGlimpse(kind: string): string {
  const m: Record<string, string> = {
    bed: 'a perna de uma cama', chair: 'uma cadeira vazia', table: 'a quina de uma mesa', bookshelf: 'lombadas de livros', painting: 'um quadro torto',
    lamp_table: 'uma luz amarela', piano: 'teclas amareladas', fireplace: 'brasas', well: 'a borda de pedra de um poço', boxes: 'caixas empilhadas',
    hospital_bed: 'uma cama de ferro', altar: 'velas', stove: 'um fogão', bathtub: 'uma banheira', desk: 'uma escrivaninha', filing_cabinet: 'gavetas de metal',
    armchair: 'o encosto de uma poltrona', crate: 'um caixote', cradle: 'um berço balançando',
  };
  return m[kind] ?? 'uma sombra que não se mexe';
}
void CHAR;
