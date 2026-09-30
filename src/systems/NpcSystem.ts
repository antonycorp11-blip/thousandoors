// NPCs: persistent state (alive, trust, memories, timeline) and per-run placement.
import type { GameManager } from '../core/GameManager';
import type { NpcState, Side, Effect } from '../core/types';
import { CHARACTERS, CHAR } from '../data/characters';
import { evalCond } from './Conditions';
import { RNG } from '../core/rng';
import { ITEMS } from '../data/items';

export interface NpcPresence { npc: string; side: Side; x: number }

export class NpcSystem {
  constructor(private g: GameManager) {}

  state(id: string): NpcState {
    return (this.g.meta.npcs[id] ??= { alive: true, location: undefined as any, trust: 0, known: false, memories: [], flags: {}, timelineState: 0, encounters: 0 });
  }

  displayName(id: string): string {
    const c = CHAR[id];
    if (!c) return id;
    return this.state(id).known ? c.name : c.unknownName;
  }

  /** Called at run start: decide where everyone is in this version of the House. */
  placeForRun(): void {
    const run = this.g.run!;
    run.npcPositions = {};
    run.npcSpawns = {};
    const rooms = Object.values(this.g.house.rooms);
    for (const c of CHARACTERS) {
      const st = this.state(c.id);
      if (!st.alive) continue;
      if (c.ages) st.timelineState = Math.min(2, Math.floor(this.g.meta.runCount / 3));
      if (c.youngs) st.timelineState = Math.min(2, Math.floor(this.g.meta.runCount / 3));
      if (st.location === null) continue;                 // gone (left the House / wandered off)
      if (typeof st.location === 'string') { this.put(c.id, st.location, 'front', 1300); continue; }
      const rng = RNG.from('npc', c.id, run.seed);
      c.spawn.forEach((rule) => {
        if (!evalCond(rule.cond, this.g)) return;
        if (rule.chance !== undefined && rng.next() > rule.chance) return;
        let cands: string[] = rule.rooms ? rule.rooms.slice() : rooms.filter(r =>
          (!rule.tags || rule.tags.some(t => r.tags.includes(t))) && (!rule.regions || rule.regions.includes(r.region)) &&
          r.id !== 'r000' && r.category !== 'final' && r.category !== 'memory' && r.category !== 'danger' && r.id !== 'r333').map(r => r.id);
        cands = cands.filter(r => this.g.house.rooms[r]);
        const count = rule.count ?? 1;
        for (let i = 0; i < count && cands.length; i++) {
          const room = rule.rooms && count === 1 ? cands[0] : cands.splice(Math.floor(rng.next() * cands.length), 1)[0];
          if (!room) continue;
          if (rule.rooms && (run.npcPositions[c.id] ?? []).length) continue;
          this.put(c.id, room, rule.side ?? 'front', rule.x ?? this.freeX(room, rng));
        }
      });
    }
  }

  private freeX(room: string, rng: RNG): number {
    const def = this.g.house.rooms[room];
    const doorsX = (this.g.house.outDoors[room] ?? []).map(id => this.g.house.doors[id]).filter(d => d.side === 'front').map(d => d.x ?? 960);
    const propsX = def.front.props.filter(p => p.d !== undefined).map(p => p.x);
    for (let i = 0; i < 20; i++) {
      const x = 260 + rng.next() * 1400;
      if (doorsX.every(d => Math.abs(d - x) > 170) && propsX.every(p => Math.abs(p - x) > 120)) return Math.round(x);
    }
    return 1300;
  }

  private put(npc: string, room: string, side: Side, x: number) {
    const run = this.g.run!;
    (run.npcPositions[npc] ??= []).push(room);
    (run.npcSpawns[npc] ??= []).push({ room, side, x });
  }

  spawn(npc: string, room: string, side: Side, x: number) {
    if (this.g.run) this.put(npc, room, side, x);
  }
  despawn(npc: string) {
    const run = this.g.run;
    if (!run) return;
    const room = run.currentRoom;
    run.npcPositions[npc] = (run.npcPositions[npc] ?? []).filter(r => r !== room);
    run.npcSpawns[npc] = (run.npcSpawns[npc] ?? []).filter(s => s.room !== room);
  }

  presentIn(room: string): NpcPresence[] {
    const run = this.g.run;
    if (!run) return [];
    const out: NpcPresence[] = [];
    for (const [npc, spawns] of Object.entries(run.npcSpawns)) {
      if (!this.state(npc).alive) continue;
      for (const s of spawns) if (s.room === room) out.push({ npc, side: s.side, x: s.x });
    }
    return out;
  }

  isHere(npc: string): boolean {
    return this.presentIn(this.g.run?.currentRoom ?? '').some(p => p.npc === npc);
  }

  onEnterRoom(room: string): void {
    const here = this.presentIn(room);
    const run = this.g.run;
    if (!run) return;
    for (const p of here) {
      if (p.npc === 'mercador') {
        const c = (run.flags.merchant_seen ?? 0) + 1;
        run.flags.merchant_seen = c;
        if (c >= 2) run.flags.mercador_visto_1 = true;
        if (c >= 3) run.flags.mercador_visto_2 = true;
      }
    }
  }

  dialogueFor(npc: string): string | null {
    const c = CHAR[npc];
    if (!c) return null;
    for (const t of c.talk) if (evalCond(t.cond, this.g)) return t.dialogue;
    return null;
  }

  onTalk(npc: string): void {
    const st = this.state(npc);
    st.encounters++;
    st.lastEncounter = { run: this.g.meta.runCount, room: this.g.run?.currentRoom ?? '' };
    if (!st.known && npc !== 'semrosto' && npc !== 'voz') {
      // known only after they say their name (dialogue sets known). First encounter logged:
      this.g.journal.add('pessoas', `Encontrei ${CHAR[npc]?.unknownName.toLowerCase()} (${this.g.roomLabel(this.g.run?.currentRoom ?? '')}).`, 'met_' + npc);
    }
    this.g.memory.addFragments(st.encounters === 1 ? 1 : 0, 'conversa');
  }

  adjustTrust(npc: string, n: number) { this.state(npc).trust += n; }

  apply(e: Extract<Effect, { type: 'npc' }>): void {
    const st = this.state(e.npc);
    if (e.trust) st.trust += e.trust;
    if (e.alive !== undefined) {
      st.alive = e.alive;
      if (!e.alive) this.g.journal.add('pessoas', `${this.displayName(e.npc)} não está mais aqui.`, 'dead_' + e.npc);
    }
    if (e.known !== undefined) { const was = st.known; st.known = e.known; if (!was && e.known) this.g.journal.add('pessoas', `Conheci ${CHAR[e.npc]?.name}.`, 'known_' + e.npc); }
    if (e.memory && !st.memories.includes(e.memory)) st.memories.push(e.memory);
    if (e.stage !== undefined) st.timelineState = e.stage;
    if (e.flag) st.flags[e.flag] = true;
    if (e.location !== undefined) st.location = e.location;
  }

  stealKey(npc: string): void {
    const g = this.g;
    const stealable = g.keys.carried().find(k => !ITEMS[k].key?.persistentAcrossRuns && ITEMS[k].key?.keyType !== 'gold');
    const st = this.state(npc);
    if (!stealable) { g.ui.text('Ele procura nos seus bolsos, não acha nada interessante e ri.'); return; }
    g.inventory.remove(stealable);
    (st.heldKeys ??= []).push(stealable);
    g.meta.flags[npc + '_roubou'] = true;
    g.journal.add('chaves', `${this.displayName(npc)} fugiu com ${g.keys.displayName(stealable).toLowerCase()}. Vou ter que encontrá-lo.`, 'stolen_' + stealable);
  }

  async returnKeys(npc: string): Promise<void> {
    const st = this.state(npc);
    for (const k of st.heldKeys ?? []) await this.g.inventory.add(k);
    st.heldKeys = [];
    delete this.g.meta.flags[npc + '_roubou'];
  }
}
