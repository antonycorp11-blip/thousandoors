// HouseGraph — graph queries and the full content validator (used by debug screen, tests and scripts/validate.ts).
import type { House } from './HouseGenerator';
import { FINAL_ROOM, ANTECHAMBER, TOTAL_DOORS, TOTAL_ROOMS, flattenEffects } from './HouseGenerator';
import type { DoorDefinition, Effect, LockDefinition } from '../core/types';
import { ITEMS } from '../data/items';
import { PUZZLES, lightsSolvable } from '../data/puzzles';
import { DIALOGUES } from '../data/dialogues';
import { EVENTS } from '../data/events';
import { CHARACTERS } from '../data/characters';
import { LORE } from '../data/lore';

export interface EdgeOpts {
  allowLocked?: boolean | ((lockId: string) => boolean);
  allowHidden?: boolean;
  allowReverse?: boolean;
  blocked?: Set<string>;
}

export class HouseGraph {
  constructor(public house: House) {}

  /** Neighbours reachable from a room in one traversal. */
  next(room: string, o: EdgeOpts = {}): { to: string; door: DoorDefinition }[] {
    const out: { to: string; door: DoorDefinition }[] = [];
    const h = this.house;
    const lockOk = (d: DoorDefinition) => {
      if (!d.lock) return true;
      const a = o.allowLocked;
      return typeof a === 'function' ? a(d.lock) : !!a;
    };
    for (const id of h.outDoors[room] ?? []) {
      const d = h.doors[id];
      if (d.meta || o.blocked?.has(id)) continue;
      if (d.hidden && !o.allowHidden) continue;
      if (!lockOk(d)) continue;
      const targets = [d.to, ...(d.destinationRules ?? []).map(r => r.to), d.observerAlt].filter(Boolean) as string[];
      for (const t of targets) out.push({ to: t, door: d });
    }
    if (o.allowReverse !== false) {
      for (const id of h.inDoors[room] ?? []) {
        const d = h.doors[id];
        if (d.meta || !d.bidirectional || d.to !== room || o.blocked?.has(id)) continue;
        if (d.hidden && !o.allowHidden) continue;
        if (!lockOk(d)) {
          // a lock with an "otherSide" latch can be opened from here
          const L = d.lock ? h.locks[d.lock] : undefined;
          if (!L?.methods.some(m => m.kind === 'otherSide')) continue;
        }
        out.push({ to: d.origin, door: d });
      }
    }
    return out;
  }

  reach(from: string, o: EdgeOpts = {}): Map<string, number> {
    const dist = new Map<string, number>([[from, 0]]);
    const q = [from];
    while (q.length) {
      const r = q.shift()!;
      for (const { to } of this.next(r, o)) if (!dist.has(to)) { dist.set(to, dist.get(r)! + 1); q.push(to); }
    }
    return dist;
  }

  distance(a: string, b: string, max = 99): number {
    if (a === b) return 0;
    const dist = new Map<string, number>([[a, 0]]);
    const q = [a];
    while (q.length) {
      const r = q.shift()!;
      const d = dist.get(r)!;
      if (d >= max) continue;
      for (const { to } of this.next(r, { allowHidden: true, allowLocked: true })) {
        if (dist.has(to)) continue;
        if (to === b) return d + 1;
        dist.set(to, d + 1); q.push(to);
      }
    }
    return Infinity;
  }

  shortestPath(a: string, b: string, o: EdgeOpts = {}): string[] | null {
    const prev = new Map<string, string>();
    const seen = new Set([a]);
    const q = [a];
    while (q.length) {
      const r = q.shift()!;
      if (r === b) break;
      for (const { to } of this.next(r, o)) if (!seen.has(to)) { seen.add(to); prev.set(to, r); q.push(to); }
    }
    if (!seen.has(b)) return null;
    const path = [b];
    while (path[0] !== a) path.unshift(prev.get(path[0])!);
    return path;
  }

  /** Count shortest-path routes (DP over BFS layers), capped. */
  countShortestRoutes(a: string, b: string, o: EdgeOpts = {}): number {
    const dist = this.reach(a, o);
    if (!dist.has(b)) return 0;
    const ways = new Map<string, number>([[a, 1]]);
    const order = [...dist.entries()].sort((x, y) => x[1] - y[1]).map(e => e[0]);
    for (const r of order) {
      const w = ways.get(r) ?? 0;
      if (!w) continue;
      for (const { to } of this.next(r, o)) if (dist.get(to) === dist.get(r)! + 1) ways.set(to, Math.min(1e9, (ways.get(to) ?? 0) + w));
    }
    return ways.get(b) ?? 0;
  }
}

// ─────────────────────────── VALIDATION ───────────────────────────
export interface ValidationReport {
  totals: { rooms: number; doors: number; locks: number; keys: number; puzzles: number; events: number; characters: number; dialogues: number; lore: number; items: number };
  errors: string[];
  warnings: string[];
  orphanDoors: string[];
  unreachableRooms: string[];
  unreachableWithoutLocks: string[];
  deadEnds: string[];
  noReturn: number;
  finalReachable: boolean;
  shortestToFinal: number;
  routesToFinal: number;
  entrancesToAntechamber: number;
  keysWithoutDoor: string[];
  impossibleLocks: string[];
  inaccessibleKeys: string[];
  essentialBlocked: string[];
  puzzleProblems: string[];
}

export function validateHouse(house: House): ValidationReport {
  const g = new HouseGraph(house);
  const errors: string[] = [];
  const warnings: string[] = [];
  const doors = Object.values(house.doors).filter(d => !d.meta);
  const canonical = Object.keys(house.rooms).filter(r => r !== 'r000');

  if (canonical.length !== TOTAL_ROOMS) errors.push(`Salas canônicas: ${canonical.length} (esperado ${TOTAL_ROOMS})`);
  if (doors.length !== TOTAL_DOORS) errors.push(`Portas: ${doors.length} (esperado ${TOTAL_DOORS})`);
  const nums = new Set(doors.map(d => d.displayNumber));
  if (nums.size !== doors.length) errors.push('Números de porta duplicados.');
  for (let i = 1; i <= TOTAL_DOORS; i++) if (!nums.has(i)) { errors.push(`Número de porta ausente: ${i}`); break; }
  const d1000 = doors.filter(d => d.displayNumber === 1000);
  if (d1000.length !== 1 || d1000[0].to !== FINAL_ROOM) errors.push('A Porta 1000 deve ser única e levar à sala final.');
  const intoFinal = doors.filter(d => d.to === FINAL_ROOM || d.destinationRules?.some(r => r.to === FINAL_ROOM));
  if (intoFinal.length !== 1) errors.push(`Portas que levam à sala final: ${intoFinal.length} (esperado 1)`);

  const orphanDoors = doors.filter(d => !house.rooms[d.origin] || (d.to && !house.rooms[d.to])).map(d => d.id);
  if (orphanDoors.length) errors.push(`Portas órfãs: ${orphanDoors.join(', ')}`);

  // what is reachable at all (every lock openable, hidden doors discoverable)
  const all = g.reach('r001', { allowLocked: true, allowHidden: true, allowReverse: false });
  const unreachableRooms = canonical.filter(r => !all.has(r));
  if (unreachableRooms.length) errors.push(`Salas inacessíveis: ${unreachableRooms.join(', ')}`);

  // without any lock (except the final memory lock)
  const noLocks = g.reach('r001', { allowLocked: false, allowHidden: true, allowReverse: false });
  const unreachableWithoutLocks = canonical.filter(r => !noLocks.has(r));

  // dead ends: rooms that cannot be left in any way (final room excepted)
  const deadEnds = canonical.filter(r => r !== FINAL_ROOM && g.next(r, { allowLocked: true, allowHidden: true }).length === 0);
  if (deadEnds.length) errors.push(`Salas sem saída: ${deadEnds.join(', ')}`);

  // one-way connections whose origin cannot be reached again from the destination
  let noReturn = 0;
  for (const d of doors) {
    if (d.bidirectional || !d.to || d.to === FINAL_ROOM) continue;
    if (g.distance(d.to, d.origin, 60) === Infinity) noReturn++;
  }

  // main route: r001 → r333 with no locks, then door 1000 (memory lock, always satisfiable in r333)
  const mainPath = g.shortestPath('r001', ANTECHAMBER, { allowLocked: false, allowHidden: false, allowReverse: false });
  const finalReachable = !!mainPath;
  if (!finalReachable) errors.push('Rota principal quebrada: a Antecâmara não é alcançável sem chaves.');
  const routesToFinal = g.countShortestRoutes('r001', ANTECHAMBER, { allowLocked: false, allowReverse: false });
  const entrancesToAntechamber = (house.inDoors[ANTECHAMBER] ?? []).length;

  // essential doors: every spine door must be lock-free
  const essentialBlocked = [...house.spineDoors].filter(id => house.doors[id]?.lock && house.doors[id].lock !== 'L_door1000');
  if (essentialBlocked.length) errors.push(`Portas essenciais trancadas: ${essentialBlocked.join(', ')}`);

  // ── keys & locks ──
  const keyItems = Object.values(ITEMS).filter(i => i.key);
  const sources = keySourceMap(house);
  const keysWithoutDoor: string[] = [];
  for (const it of keyItems) {
    const k = it.key!;
    if (k.special === 'half') continue;
    const opens = Object.values(house.locks).some(L => lockOpenableByKey(house, L, it.id)) || (k.special === 'unreal' && doors.some(d => d.type === 'false'));
    if (!opens) keysWithoutDoor.push(it.id);
  }
  if (keysWithoutDoor.length) errors.push(`Chaves sem porta: ${keysWithoutDoor.join(', ')}`);

  const inaccessibleKeys: string[] = [];
  const obtainable = (item: string, excludingLock?: LockDefinition): boolean => {
    const src = sources[item] ?? [];
    if (!src.length) return false;
    const blocked = excludingLock ? new Set([excludingLock.door]) : undefined;
    const reach = g.reach('r001', { allowLocked: true, allowHidden: true, blocked, allowReverse: false });
    return src.some(s => s === 'npc' || s === 'combine' || reach.has(s));
  };
  for (const it of keyItems) if (!obtainable(it.id)) inaccessibleKeys.push(it.id);
  if (inaccessibleKeys.length) errors.push(`Chaves inacessíveis: ${inaccessibleKeys.join(', ')}`);

  const impossibleLocks: string[] = [];
  for (const L of Object.values(house.locks)) {
    const door = house.doors[L.door];
    if (!door) { impossibleLocks.push(L.id + ' (porta inexistente)'); continue; }
    const ok = L.methods.some(m => {
      switch (m.kind) {
        case 'key': return keyItems.some(it => lockOpenableByKey(house, L, it.id) && obtainable(it.id, L));
        case 'puzzle': return PUZZLES.some(p => p.id === m.puzzle);
        case 'npc': return CHARACTERS.some(c => c.id === m.npc);
        case 'otherSide': return door.to ? g.reach('r001', { allowLocked: true, allowHidden: true, blocked: new Set([door.id]), allowReverse: false }).has(door.to) : false;
        case 'tool': return obtainable(m.item) || !!Object.values(house.rooms).some(r => [...r.front.props, ...r.back.props].some(p => (p.interact ?? []).some(i => flattenEffects(i.effects).some(e => e.type === 'giveItem' && e.item === m.item))));
        case 'force': return true;
        case 'flag': return flagIsSettable(house, m.flag);
      }
    });
    if (!ok) impossibleLocks.push(L.id);
  }
  if (impossibleLocks.length) errors.push(`Portas trancadas impossíveis de abrir: ${impossibleLocks.join(', ')}`);

  // ── puzzles ──
  const puzzleProblems: string[] = [];
  for (const p of PUZZLES) {
    if (!house.rooms[p.room]) puzzleProblems.push(`${p.id}: sala ${p.room} não existe`);
    else if (!all.has(p.room)) puzzleProblems.push(`${p.id}: sala inacessível`);
    for (const c of p.clues) if (!house.rooms[c.room]) puzzleProblems.push(`${p.id}: pista em sala inexistente ${c.room}`);
    switch (p.type) {
      case 'lights': if (!lightsSolvable(p.config.w, p.config.h, p.config.initial, p.solution)) puzzleProblems.push(`${p.id}: luzes sem solução`); break;
      case 'order': if ([...p.config.items].sort().join('|') !== [...p.solution].sort().join('|')) puzzleProblems.push(`${p.id}: ordem inválida`); break;
      case 'code': if (String(p.solution).length !== p.config.digits || [...String(p.solution)].some(ch => !p.config.charset.includes(ch))) puzzleProblems.push(`${p.id}: código inválido`); break;
      case 'symbols': if (p.solution.length !== p.config.length || p.solution.some((s: string) => !p.config.symbols.includes(s))) puzzleProblems.push(`${p.id}: símbolos inválidos`); break;
      case 'sequence': if (p.solution.length !== p.config.length || p.solution.some((s: number) => s < 0 || s >= p.config.buttons.length)) puzzleProblems.push(`${p.id}: sequência inválida`); break;
      case 'choice': if (p.solution < 0 || p.solution >= p.config.options.length) puzzleProblems.push(`${p.id}: escolha inválida`); break;
      case 'clock': if (p.solution.h < 1 || p.solution.h > 12 || p.solution.m < 0 || p.solution.m > 59) puzzleProblems.push(`${p.id}: hora inválida`); break;
    }
    for (const e of flattenEffects(p.onSolve)) if (e.type === 'giveItem' && !ITEMS[e.item]) puzzleProblems.push(`${p.id}: item inexistente ${e.item}`);
  }
  if (puzzleProblems.length) errors.push(...puzzleProblems);

  // ── references in content ──
  const loreIds = new Set(LORE.map(l => l.id));
  const checkEffects = (where: string, effects: Effect[] = []) => {
    for (const e of flattenEffects(effects)) {
      if ((e.type === 'giveItem' || e.type === 'takeItem') && !ITEMS[e.item]) errors.push(`${where}: item inexistente "${e.item}"`);
      if ((e.type === 'lore') && !loreIds.has(e.id)) errors.push(`${where}: lore inexistente "${e.id}"`);
      if (e.type === 'read' && !loreIds.has(e.lore)) errors.push(`${where}: lore inexistente "${e.lore}"`);
      if (e.type === 'puzzle' && !PUZZLES.some(p => p.id === e.id)) errors.push(`${where}: puzzle inexistente "${e.id}"`);
      if (e.type === 'dialogue' && !DIALOGUES.some(d => d.id === e.id)) errors.push(`${where}: diálogo inexistente "${e.id}"`);
      if ((e.type === 'revealDoor' || e.type === 'hideDoor') && e.door.startsWith('@') && !house.refs[e.door]) errors.push(`${where}: porta simbólica inexistente "${e.door}"`);
    }
  };
  for (const r of Object.values(house.rooms)) {
    for (const p of [...r.front.props, ...r.back.props]) for (const i of p.interact ?? []) checkEffects(`${r.id}/${p.id}`, i.effects);
    checkEffects(`${r.id}/onEnter`, r.onEnter); checkEffects(`${r.id}/onFirstEnter`, r.onFirstEnter);
  }
  for (const ev of EVENTS) { checkEffects(`evento ${ev.id}`, ev.effects); for (const rm of ev.rooms ?? []) if (!house.rooms[rm]) errors.push(`evento ${ev.id}: sala inexistente ${rm}`); }
  for (const dl of DIALOGUES) for (const [nid, n] of Object.entries(dl.nodes)) {
    checkEffects(`diálogo ${dl.id}/${nid}`, n.effects);
    if (n.next && !dl.nodes[n.next]) errors.push(`diálogo ${dl.id}/${nid}: próximo nó inexistente ${n.next}`);
    for (const c of n.choices ?? []) { checkEffects(`diálogo ${dl.id}/${nid}`, c.effects); if (c.next && !dl.nodes[c.next]) errors.push(`diálogo ${dl.id}/${nid}: escolha leva a nó inexistente ${c.next}`); }
    for (const t of n.trade ?? []) { if (!ITEMS[t.get]) errors.push(`troca ${dl.id}: item ${t.get}`); if (!t.give.startsWith('fragments:') && !ITEMS[t.give]) errors.push(`troca ${dl.id}: item ${t.give}`); }
  }
  for (const c of CHARACTERS) for (const t of c.talk) if (!DIALOGUES.some(d => d.id === t.dialogue)) errors.push(`personagem ${c.id}: diálogo ${t.dialogue} inexistente`);
  for (const L of LORE) void L;
  for (const [rid, r] of Object.entries(house.rooms)) if (r.puzzle && !PUZZLES.some(p => p.id === r.puzzle)) errors.push(`${rid}: puzzle ${r.puzzle} inexistente`);

  // anchors (sanctuaries) must reach the antechamber without locks
  for (const r of Object.values(house.rooms)) {
    if (!r.anchorable) continue;
    if (!g.shortestPath(r.id, ANTECHAMBER, { allowLocked: false, allowHidden: true, allowReverse: false })) warnings.push(`Âncora ${r.id} não alcança a Antecâmara sem chaves.`);
  }
  if (unreachableWithoutLocks.length > 40) warnings.push(`${unreachableWithoutLocks.length} salas só são alcançáveis com chaves/segredos.`);

  return {
    totals: {
      rooms: canonical.length, doors: doors.length, locks: Object.keys(house.locks).length, keys: keyItems.length,
      puzzles: PUZZLES.length, events: EVENTS.length, characters: CHARACTERS.length, dialogues: DIALOGUES.length, lore: LORE.length, items: Object.keys(ITEMS).length,
    },
    errors, warnings, orphanDoors, unreachableRooms, unreachableWithoutLocks, deadEnds, noReturn, finalReachable,
    shortestToFinal: mainPath ? mainPath.length : -1, routesToFinal, entrancesToAntechamber,
    keysWithoutDoor, impossibleLocks, inaccessibleKeys, essentialBlocked, puzzleProblems,
  };
}

function lockOpenableByKey(house: House, L: LockDefinition, itemId: string): boolean {
  const k = ITEMS[itemId]?.key;
  if (!k || !L.methods.some(m => m.kind === 'key')) return false;
  if ((k.opensDoors ?? []).map(r => house.resolve(r)).includes(L.door)) return true;
  if (k.notOpens?.includes(L.lockType)) return false;
  return k.opensLocks.includes(L.lockType);
}

/** Where can each item be obtained? rooms (props), 'npc' (dialogue/trade), 'combine'. */
export function keySourceMap(house: House): Record<string, string[]> {
  const src: Record<string, string[]> = {};
  const add = (item: string, where: string) => { (src[item] ??= []); if (!src[item].includes(where)) src[item].push(where); };
  for (const r of Object.values(house.rooms)) for (const p of [...r.front.props, ...r.back.props]) for (const i of p.interact ?? []) for (const e of flattenEffects(i.effects)) if (e.type === 'giveItem') add(e.item, r.id);
  for (const dl of DIALOGUES) for (const n of Object.values(dl.nodes)) {
    for (const e of flattenEffects([...(n.effects ?? []), ...(n.choices ?? []).flatMap(c => c.effects ?? [])])) if (e.type === 'giveItem') add(e.item, 'npc');
    for (const t of n.trade ?? []) add(t.get, 'npc');
  }
  for (const p of PUZZLES) {
    for (const e of flattenEffects(p.onSolve)) if (e.type === 'giveItem') add(e.item, p.room);
  }
  for (const ev of EVENTS) for (const e of flattenEffects(ev.effects)) {
    if (e.type === 'giveItem') add(e.item, 'npc');
    if (e.type === 'pickupKeyChoice') add(e.item, 'npc');
  }
  for (const it of Object.values(ITEMS)) if (it.key?.combineInto) add(it.key.combineInto, 'combine');
  return src;
}

function flagIsSettable(house: House, flag: string): boolean {
  for (const r of Object.values(house.rooms)) for (const p of [...r.front.props, ...r.back.props]) for (const i of p.interact ?? []) if (flattenEffects(i.effects).some(e => e.type === 'setFlag' && e.flag === flag)) return true;
  return PUZZLES.some(p => flattenEffects(p.onSolve).some(e => e.type === 'setFlag' && e.flag === flag));
}
