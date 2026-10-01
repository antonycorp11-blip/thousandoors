// ─────────────────────────────────────────────────────────────
// HouseGenerator — builds the canonical House: 334 rooms + Sala Zero, exactly 1000 doors.
// Authored content is fixed; generated content is deterministic (HOUSE_SEED).
// Per-run variation happens elsewhere (unstable doors, events, NPC placement).
// ─────────────────────────────────────────────────────────────
import type {
  RoomDefinition, DoorDefinition, LockDefinition, PropDef, DoorVisual, DoorType, DoorMaterial,
  Side, WallKind, RoomCategory, RegionId, Effect, LockType, PuzzleDefinition, ItemDefinition, Condition,
} from '../core/types';
import { RNG } from '../core/rng';
import { AUTHORED_1 } from '../data/rooms/authored1';
import { AUTHORED_2 } from '../data/rooms/authored2';
import type { AuthoredRoom, ExitSpec } from '../data/rooms/builders';
import { NAMES_BY_THEME, SUBTITLES, categoryWeights, PROP_POOLS, GENERATED_EXAMINES } from '../data/rooms/templates';
import { THEMES, REGIONS } from '../data/themes';
import { AUTHORED_LOCKS, GENERATED_KEY_FLAVORS, KEYS } from '../data/keys';
import { ITEMS } from '../data/items';
import { PUZZLES, lightsSolvable } from '../data/puzzles';
import { DOOR_SLOTS, floorY, topY } from '../render/geometry';

export const HOUSE_SEED = 1000;
export const TOTAL_ROOMS = 334;
export const TOTAL_DOORS = 1000;
export const FINAL_ROOM = 'r334';
export const ANTECHAMBER = 'r333';
export const ROOM_ZERO = 'r000';

export const rid = (n: number) => 'r' + String(n).padStart(3, '0');
export const rnum = (id: string) => parseInt(id.slice(1), 10);

// Rooms that only open through a specific lock / puzzle / secret — the spine never targets them.
const LOCK_ONLY = new Set([147, 171, 210, 280, 250, 180, 233, 270]);
const MEMORY_SPECIAL = new Set([163, 215, 275]);
const SECRET_ONLY = new Set([16, 20]);
const PUZZLE_ONLY = new Set([17, 33]);
const NO_SPINE = new Set<number>([...LOCK_ONLY, ...MEMORY_SPECIAL, ...SECRET_ONLY, ...PUZZLE_ONLY, 334]);

export interface House {
  rooms: Record<string, RoomDefinition>;
  doors: Record<string, DoorDefinition>;
  locks: Record<string, LockDefinition>;
  lockByDoor: Record<string, string>;
  refs: Record<string, string>;
  outDoors: Record<string, string[]>;
  inDoors: Record<string, string[]>;
  keySources: Record<string, string[]>;   // item → rooms where it can be found as a prop
  generatedKeys: string[];
  rewardRooms: string[];
  spineDoors: Set<string>;
  resolve(ref: string): string;
  roomIds: string[];
}

interface TempDoor {
  tid: string;
  origin: number;
  to: number | null;
  side: Side;
  wall?: WallKind;
  x?: number;
  d?: number;
  type: DoorType;
  bidirectional: boolean;
  hidden?: boolean;
  revealHint?: string;
  lock?: string;
  visual: Partial<DoorVisual>;
  ref?: string;
  important?: boolean;
  spine?: boolean;
  authored?: boolean;
  alt?: number;
  secretTo?: number;
  listen?: string; peek?: string; observe?: string; onOpen?: Effect[]; talk?: string;
  requirements?: Condition; failText?: string;
  removable?: boolean;
}

export function buildHouse(): House {
  const rng = RNG.from('house', HOUSE_SEED);
  const authored = new Map<number, AuthoredRoom>();
  for (const a of [...AUTHORED_1, ...AUTHORED_2]) authored.set(a.number, a);

  const rooms: Record<string, RoomDefinition> = {};
  const temps: TempDoor[] = [];
  let tcount = 0;
  const newDoor = (d: Omit<TempDoor, 'tid'>): TempDoor => { const t = { ...d, tid: 't' + (++tcount) }; temps.push(t); return t; };

  // ── 1. rooms ─────────────────────────────────────────────
  const desired: Record<number, number> = {};
  const REWARD_ROOMS = pickRewardRooms(rng, authored);
  const rewardSet = new Set(REWARD_ROOMS);
  for (const r of REWARD_ROOMS) NO_SPINE.add(r);

  for (let n = 0; n <= TOTAL_ROOMS; n++) {
    const a = authored.get(n);
    const depth = n / TOTAL_ROOMS;
    if (a) {
      rooms[rid(n)] = fromAuthored(a, depth);
      desired[n] = a.fixedExits ? 0 : Math.max(a.minExits ?? 2, (a.exits ?? []).filter(e => (e.side ?? 'front') === 'front').length);
    } else {
      const r = generateRoom(n, depth, rng, rewardSet.has(n));
      rooms[r.id] = r;
      desired[n] = r.category === 'transition' ? 2 : rng.weighted([1, 2, 3, 3, 4], k => ({ 1: 10, 2: 34, 3: 46, 4: 10 } as any)[k]);
      if ((r.tags.includes('empty')) && rng.chance(0.7)) desired[n] = 3;
    }
  }

  // ── 2. authored exits ─────────────────────────────────────
  for (const a of authored.values()) {
    for (const e of a.exits ?? []) {
      newDoor({
        origin: a.number, to: e.to, side: e.side ?? 'front', wall: e.wall, x: e.x, d: e.d,
        type: e.type ?? (e.to === null ? 'false' : e.hidden ? 'hidden' : e.lock ? 'sealed' : 'stable'),
        bidirectional: !(e.oneway || e.type === 'oneway'), hidden: e.hidden, revealHint: e.revealHint,
        lock: e.lock, visual: { material: e.m ?? 'wood_dark', ...(e.v ?? {}) }, ref: e.ref,
        important: e.important || !!e.lock, authored: true, alt: e.alt, secretTo: e.secretTo,
        listen: e.listen, peek: e.peek, observe: e.observe, onOpen: e.onOpen, talk: e.talk,
        requirements: e.requirements, failText: e.failText,
      });
    }
  }
  const frontCount = (n: number) => temps.filter(t => t.origin === n && t.side === 'front').length;
  const has = (o: number, to: number) => temps.some(t => t.origin === o && t.to === to);
  const isFixed = (n: number) => !!authored.get(n)?.fixedExits;
  const canHost = (n: number) => n >= 1 && n <= 333 && !isFixed(n);

  // ── 3. spine: every ordinary room gets a lock-free incoming door from a nearby ordinary room ─
  const lockFreeIncoming = (m: number) => temps.some(t => t.to === m && !t.lock && !t.hidden && t.type !== 'false' && !NO_SPINE.has(t.origin) && t.origin !== m);
  for (let m = 2; m <= 333; m++) {
    if (NO_SPINE.has(m) || lockFreeIncoming(m)) continue;
    const window: number[] = [];
    for (let o = Math.max(1, m - 9); o < m; o++) if (canHost(o) && !NO_SPINE.has(o)) window.push(o);
    if (!window.length) for (let o = m - 1; o >= 1; o--) if (canHost(o) && !NO_SPINE.has(o)) { window.push(o); break; }
    const withCap = window.filter(o => frontCount(o) < desired[o]);
    const pool = withCap.length ? withCap : window;
    const o = rng.weighted(pool, x => 1 + (x - (m - 10)) * 0.6);
    newDoor({ origin: o, to: m, side: 'front', type: 'stable', bidirectional: true, visual: {}, spine: true, important: true });
  }

  // ── 3b. special incoming: memory rooms, the second way into room 37, the antechamber ─
  const addSpecial = (fromRange: [number, number], to: number, type: DoorType, visual: Partial<DoorVisual> = {}) => {
    const cands: number[] = [];
    for (let o = fromRange[0]; o <= fromRange[1]; o++) if (canHost(o) && !NO_SPINE.has(o) && !has(o, to)) cands.push(o);
    if (!cands.length) return;
    const o = rng.pick(cands);
    newDoor({ origin: o, to, side: 'front', type, bidirectional: true, visual, important: true });
  };
  addSpecial([120, 160], 163, 'memory', { material: 'wood_light', lightUnder: '#ffd28a' });
  addSpecial([190, 212], 215, 'memory', { material: 'wood_light', lightUnder: '#ffd28a' });
  addSpecial([255, 272], 275, 'memory', { material: 'white', lightUnder: '#ffd28a' });
  addSpecial([92, 92], 37, 'stable');
  for (const r of [105, 188, 290]) addSpecial([r - 14, r - 3], r, 'echo');
  for (let i = 0; i < 3; i++) addSpecial([318, 332], 333, 'stable');
  // secret-only rooms: 16 via authored hidden door; 20 via a hidden door near it (+ false doors w/ unreal key)
  newDoor({ origin: 19, to: 20, side: 'back', type: 'hidden', hidden: true, bidirectional: true, visual: { material: 'painted' }, important: true, revealHint: 'costura no papel de parede' });

  // ── 4. fill exits ─────────────────────────────────────────
  for (let n = 1; n <= 333; n++) {
    if (!canHost(n)) continue;
    const depth = n / TOTAL_ROOMS;
    let guard = 0;
    while (frontCount(n) < desired[n] && guard++ < 40) {
      const kind = rng.weighted(['fwd', 'loop', 'hidden', 'false', 'impossible'], k => ({
        fwd: 70, loop: 8 + depth * 10, hidden: depth > 0.05 ? 4 : 0, false: depth > 0.12 ? 3 : 0, impossible: depth > 0.55 ? 3 : 0,
      } as any)[k]);
      if (kind === 'fwd') {
        const off = rng.weighted([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14], k => 16 - k);
        const to = n + off;
        if (to > 333 || NO_SPINE.has(to) || has(n, to)) continue;
        newDoor({ origin: n, to, side: 'front', type: 'stable', bidirectional: true, visual: {}, removable: true });
      } else if (kind === 'loop') {
        const to = n - rng.int(2, 25);
        if (to < 1 || NO_SPINE.has(to) || has(n, to)) continue;
        newDoor({ origin: n, to, side: 'front', type: 'cyclic', bidirectional: true, visual: {}, removable: true });
      } else if (kind === 'hidden') {
        const to = n + rng.int(15, 45);
        if (to > 333 || NO_SPINE.has(to) || has(n, to)) continue;
        newDoor({ origin: n, to, side: 'front', type: 'hidden', hidden: true, bidirectional: true, visual: { material: 'painted' }, removable: true });
      } else if (kind === 'false') {
        const secret = rng.pick([20, 16, n + rng.int(20, 60)].filter(s => s <= 333));
        newDoor({ origin: n, to: null, side: 'front', type: 'false', bidirectional: false, visual: {}, secretTo: secret, removable: true });
      } else {
        const to = Math.min(333, n + rng.int(30, 80));
        if (NO_SPINE.has(to) || has(n, to)) continue;
        newDoor({ origin: n, to, side: 'front', type: 'impossible', bidirectional: false, visual: rng.chance(0.5) ? { yOffset: -rng.int(120, 260) } : { scale: rng.pick([0.55, 1.3]) }, removable: true });
      }
    }
    // return corridors: a back-side door leading a little backwards
    if (n >= 5 && rng.chance(0.14)) {
      const to = n - rng.int(1, 12);
      if (to >= 1 && !NO_SPINE.has(to) && !has(n, to)) newDoor({ origin: n, to, side: 'back', type: 'stable', bidirectional: true, visual: {}, removable: true });
    }
  }

  // ── 5. door personalities: materials, instability, one-way, observers ─
  for (const t of temps) {
    const depth = t.origin / TOTAL_ROOMS;
    if (!t.visual.material) t.visual.material = pickMaterial(rng, depth, t.type);
    if (t.visual.panels === undefined) t.visual.panels = rng.pick([4, 4, 6, 2, 0] as const);
    if (t.visual.peeling === undefined) t.visual.peeling = rng.chance(0.35) ? rng.float(0.1, 0.7) : 0;
    if (t.visual.scratches === undefined) t.visual.scratches = rng.chance(0.25) ? rng.float(0.1, 0.8) : 0;
    if (t.visual.window === undefined) t.visual.window = t.visual.material === 'apartment' || (!t.authored && rng.chance(0.06));
    if (t.authored || t.spine || t.lock || t.hidden || t.type !== 'stable') continue;
    if (depth > 0.09 && t.to !== null && rng.chance(0.06 + depth * 0.1)) {
      t.type = 'unstable';
      t.alt = Math.min(333, Math.max(2, t.to + rng.int(-6, 9)));
      if (NO_SPINE.has(t.alt) || t.alt === t.origin) t.type = 'stable';
    } else if (depth > 0.12 && rng.chance(0.05)) {
      t.type = 'observer';
      t.alt = Math.min(333, t.origin + rng.int(1, 12));
      if (NO_SPINE.has(t.alt)) t.type = 'stable';
    } else if (depth > 0.1 && rng.chance(0.04 + depth * 0.1)) {
      t.type = 'oneway'; t.bidirectional = false;
    } else if (depth > 0.2 && t.to !== null && rng.chance(0.04)) {
      t.type = 'conditional';
      t.requirements = rng.pick<Condition>([{ turnsHere: { gte: 1 } }, { timeHere: { gte: 5 } }, { hp: { gte: 2 } }, { turnsHere: { eq: 0 } }]);
      t.failText = rng.pick(['A maçaneta não gira. Ainda.', 'A porta não cede. Parece esperar alguma coisa.', 'Trancada — não. Só teimosa.']);
    }
  }

  // ── 6. locks & keys ─────────────────────────────────────
  const locks: Record<string, LockDefinition> = {};
  for (const L of AUTHORED_LOCKS) locks[L.id] = { ...L };
  const generatedKeys: string[] = [];
  const keySources: Record<string, string[]> = {};
  const addKeyProp = (roomN: number, item: string, lockRef: string | null, text: string) => {
    const r = rooms[rid(roomN)];
    const side: Side = rng.chance(0.3) ? 'back' : 'front';
    const pid = 'key_' + item;
    const x = freeX(rng, temps.filter(t => t.origin === roomN && t.side === side), r.front.props.concat(r.back.props));
    const cond: Condition = lockRef ? { noItem: item, doorLocked: lockRef } : { noItem: item };
    const prop: PropDef = {
      id: pid, kind: rng.pick(['key_floor', 'glint']), x, d: 0.5, y: floorY(0.5), label: 'Algo no chão', cond,
      examine: 'Um brilho pequeno, perto do rodapé.',
      interact: [{ label: 'Pegar', cond, once: 'run', effects: [{ type: 'giveItem', item }, { type: 'prop', prop: pid, hidden: true, scope: 'run' }, { type: 'text', text }] }],
    };
    (side === 'front' ? r.front : r.back).props.push(prop);
    (keySources[item] ??= []).push(r.id);
  };

  // reachability helper over temp doors (lock-free, no hidden, no false)
  const reach = (blocked: Set<string>) => {
    const seen = new Set<number>([1]);
    const q = [1];
    while (q.length) {
      const n = q.shift()!;
      for (const t of temps) {
        if (blocked.has(t.tid) || t.lock || t.hidden || t.to === null) continue;
        let nx: number | null = null;
        if (t.origin === n) nx = t.to;
        if (nx !== null && !seen.has(nx)) { seen.add(nx); q.push(nx); }
      }
    }
    return seen;
  };
  // authored doors with puzzle/secret semantics count as reachable routes for validation of generated keys
  const baseReach = reach(new Set());

  let flavorIdx = 0;
  const makeKey = (doorRef: string, lockType: LockType): string => {
    const f = GENERATED_KEY_FLAVORS[flavorIdx % GENERATED_KEY_FLAVORS.length];
    const id = 'gkey_' + String(++flavorIdx).padStart(2, '0');
    const def: ItemDefinition = {
      id, name: f.name, category: 'chave', description: f.desc, icon: 'key_' + f.variant, tags: ['key'],
      key: {
        id, name: f.name, unknownName: f.unknown, description: f.desc, keyType: 'plain', opensLocks: [], opensDoors: [doorRef],
        fitsButNoTurn: [lockType], consumable: false, persistentAcrossRuns: false, visualVariant: f.variant, origin: 'Gerada',
      },
    };
    ITEMS[id] = def;
    generatedKeys.push(id);
    return id;
  };
  const pickKeyRoom = (o: number, lo: number, hi: number, avoid: number): number | null => {
    const cands: number[] = [];
    for (let k = o + lo; k <= Math.min(330, o + hi); k++) {
      if (k === avoid || NO_SPINE.has(k) || !baseReach.has(k)) continue;
      const r = rooms[rid(k)];
      if (!r || r.category === 'danger' || r.category === 'final') continue;
      cands.push(k);
    }
    return cands.length ? rng.pick(cands) : null;
  };

  // 6a. reward rooms: a locked door is the ONLY way in. A promise worth keeping.
  let gi = 0;
  for (const t of REWARD_ROOMS) {
    const oc: number[] = [];
    for (let o = Math.max(3, t - 60); o <= t - 6; o++) if (canHost(o) && !NO_SPINE.has(o) && baseReach.has(o)) oc.push(o);
    if (!oc.length) continue;
    const o = rng.pick(oc);
    const ref = 'g_reward_' + (++gi);
    const lockType = rng.pick<LockType>(['simple', 'old_iron', 'padlock', 'brass_small']);
    const lockId = 'L_' + ref;
    const door = newDoor({
      origin: o, to: t, side: rng.chance(0.35) ? 'back' : 'front', type: 'sealed', bidirectional: true,
      visual: { lock: lockVisualFor(lockType), material: pickMaterial(rng, o / TOTAL_ROOMS, 'stable'), chain: lockType === 'padlock' && rng.chance(0.4) },
      lock: lockId, ref, important: true,
    });
    void door;
    const keyRoom = pickKeyRoom(o, 6, 45, t);
    if (keyRoom === null) continue;
    const keyId = makeKey('@' + ref, lockType);
    const forceable = rng.chance(0.4);
    locks[lockId] = {
      id: lockId, door: '@' + ref, lockType, visual: lockVisualFor(lockType),
      description: lockDescription(lockType), shortDesc: `porta com ${lockShort(lockType)}`,
      methods: [{ kind: 'key' }, ...(forceable ? [{ kind: 'force' as const, hpRisk: 1 }] : [])], forceable,
      forceConsequence: [{ type: 'route', axis: 'ruptura', n: 1 }], reward: `Sala secreta ${t}`,
      wrongKeyHint: 'no_turn',
    };
    addKeyProp(keyRoom, keyId, '@' + ref, `Uma chave. ${ITEMS[keyId].key!.unknownName}.`);
  }

  // 6b. shortcut locks on ordinary doors (destination stays reachable — "one destination, two journeys")
  const shortcutCands = rng.shuffle(temps.filter(t => t.removable && t.type === 'stable' && t.to !== null && t.origin >= 3 && t.origin <= 300 && !t.hidden));
  let shortcuts = 0;
  let serviceLocks = 0;
  const serviceFirst = [...shortcutCands.filter(t => rooms[rid(t.origin)].region === 'servico'), ...shortcutCands.filter(t => rooms[rid(t.origin)].region !== 'servico')];
  for (const t of serviceFirst) {
    if (shortcuts >= 16) break;
    if (t.lock) continue;
    const blocked = new Set([t.tid]);
    const r2 = reach(blocked);
    if (r2.size < baseReach.size) continue;
    const region = rooms[rid(t.origin)].region;
    const wantService = serviceLocks < 4;
    if (wantService && region !== 'servico') continue;
    const lockType: LockType = wantService ? 'service' : rng.pick<LockType>(['simple', 'old_iron', 'padlock', 'simple']);
    if (wantService) serviceLocks++;
    const ref = 'g_short_' + (++gi);
    const lockId = 'L_' + ref;
    t.lock = lockId; t.ref = ref; t.type = 'sealed'; t.removable = false; t.important = true;
    t.visual.lock = lockVisualFor(lockType);
    const forceable = lockType !== 'service' && rng.chance(0.6);
    const methods: LockDefinition['methods'] = [{ kind: 'key' }];
    if (rng.chance(0.55) && t.bidirectional) methods.push({ kind: 'otherSide' });
    if (forceable) methods.push({ kind: 'force', hpRisk: 1 });
    locks[lockId] = {
      id: lockId, door: '@' + ref, lockType, visual: lockVisualFor(lockType), description: lockDescription(lockType),
      shortDesc: `porta com ${lockShort(lockType)}`, methods, forceable,
      forceConsequence: [{ type: 'route', axis: 'ruptura', n: 1 }], reward: 'Atalho', wrongKeyHint: 'no_fit',
    };
    if (lockType !== 'service') {
      const keyRoom = pickKeyRoom(t.origin, 4, 40, t.to!);
      if (keyRoom === null) { delete locks[lockId]; t.lock = undefined; t.type = 'stable'; continue; }
      const keyId = makeKey('@' + ref, lockType);
      addKeyProp(keyRoom, keyId, '@' + ref, `Uma chave. ${ITEMS[keyId].key!.unknownName}.`);
    }
    shortcuts++;
  }

  // ── 7. generated puzzles (clues via turning around, or in a neighbouring room) ─
  const genPuzzles: PuzzleDefinition[] = [];
  for (const r of Object.values(rooms)) {
    if (r.authored || r.category !== 'puzzle') continue;
    const n = rnum(r.id);
    const p = makeGeneratedPuzzle(rng, r, rooms, n);
    genPuzzles.push(p);
    if (rng.chance(0.55)) {
      const to = n + rng.int(8, 28);
      if (to <= 333 && !NO_SPINE.has(to) && !has(n, to)) {
        const ref = 'g_puz_' + n;
        newDoor({ origin: n, to, side: 'front', type: 'hidden', hidden: true, bidirectional: true, visual: { material: 'painted' }, ref });
        p.onSolve.push({ type: 'revealDoor', door: '@' + ref });
      }
    }
  }
  for (const p of genPuzzles) if (!PUZZLES.find(x => x.id === p.id)) PUZZLES.push(p);

  // hidden fill doors get a discoverable crack
  for (const t of temps) {
    if (!t.hidden || t.authored || t.ref?.startsWith('g_puz_')) continue;
    t.ref = t.ref ?? 'g_hid_' + t.tid;
  }

  // ── 8. exactly 1000 doors ─────────────────────────────────
  const counted = () => temps.filter(t => t.ref !== 'door1000').length;
  const TARGET = TOTAL_DOORS - 1;
  let guard = 0;
  while (counted() > TARGET && guard++ < 5000) {
    const cand = temps.filter(t => t.removable && frontCount(t.origin) >= 3 && !t.lock);
    if (!cand.length) break;
    const t = rng.pick(cand);
    temps.splice(temps.indexOf(t), 1);
  }
  guard = 0;
  while (counted() < TARGET && guard++ < 5000) {
    const n = rng.int(5, 330);
    if (!canHost(n) || NO_SPINE.has(n)) continue;
    const back = temps.filter(t => t.origin === n && t.side === 'back').length;
    if (back >= 2) continue;
    const to = n - rng.int(1, 14);
    if (to < 1 || NO_SPINE.has(to) || has(n, to)) continue;
    newDoor({ origin: n, to, side: 'back', type: 'stable', bidirectional: true, visual: { material: pickMaterial(rng, n / TOTAL_ROOMS, 'stable'), panels: 4 }, removable: true });
  }

  // ── 9. numbering & final door definitions ────────────────
  temps.sort((a, b) => a.origin - b.origin || (a.side === b.side ? 0 : a.side === 'front' ? -1 : 1) || (a.x ?? 0) - (b.x ?? 0) || tidNum(a) - tidNum(b));
  const doors: Record<string, DoorDefinition> = {};
  const refs: Record<string, string> = {};
  const idOf: Record<string, string> = {};
  let num = 0;
  for (const t of temps) {
    const dn = t.ref === 'door1000' ? 1000 : ++num;
    const id = 'd' + String(dn).padStart(4, '0');
    idOf[t.tid] = id;
    if (t.ref) refs['@' + t.ref] = id;
  }
  // slot layout per room/side
  const bySide = new Map<string, TempDoor[]>();
  for (const t of temps) { const k = t.origin + t.side; if (!bySide.has(k)) bySide.set(k, []); bySide.get(k)!.push(t); }
  for (const [k, list] of bySide) {
    const isBack = k.endsWith('back');
    const needSlots = list.filter(t => t.x === undefined && !t.wall);
    const fixedXs = list.filter(t => t.x !== undefined).map(t => t.x!);
    const count = needSlots.length + fixedXs.length;
    let slots = (DOOR_SLOTS[Math.min(4, Math.max(1, count))] ?? DOOR_SLOTS[3]).slice();
    if (isBack) slots = [360, 1560, 700, 1220].slice(0, Math.max(needSlots.length, 1));
    slots = slots.filter(s => fixedXs.every(fx => Math.abs(fx - s) > 200));
    if (slots.length < needSlots.length) slots = spreadSlots(needSlots.length, fixedXs, isBack);
    // portas nunca atrás de móveis grandes com interação (lareira, piano, máquina...)
    const roomN = parseInt(k, 10);
    const blockers = interactiveBlockers(rooms[rid(roomN)], isBack ? 'back' : 'front');
    const blocked = (x: number) => blockers.some(b => Math.abs(b.x - x) < b.half + 120);
    if (blockers.length && slots.slice(0, needSlots.length).some(blocked)) {
      const free: number[] = [];
      for (let x = 330; x <= 1590 && free.length < needSlots.length; x += 10) {
        if (blocked(x) || fixedXs.concat(free).some(f => Math.abs(f - x) < 300)) continue;
        free.push(x);
      }
      if (free.length >= needSlots.length) slots = free;
    }
    needSlots.forEach((t, i) => { t.x = slots[i] ?? 300 + i * 360; });
  }
  for (const t of temps) {
    const id = idOf[t.tid];
    const displayNumber = parseInt(id.slice(1), 10);
    const to = t.to === null ? null : rid(t.to);
    const rules = [];
    if ((t.type === 'unstable') && t.alt) rules.push({ cond: { chance: 0.5 } as Condition, to: rid(t.alt) });
    doors[id] = {
      id, displayNumber, type: t.type, origin: rid(t.origin), side: t.side, wall: t.wall, x: t.x, d: t.d, to,
      destinationRules: rules.length ? rules : undefined, bidirectional: t.bidirectional, hidden: t.hidden, revealHint: t.revealHint,
      lock: t.lock, requirements: t.requirements, failText: t.failText,
      visual: { material: 'wood_dark', ...t.visual } as DoorVisual, audio: audioFor(t.visual.material as DoorMaterial),
      listen: t.listen, peek: t.peek, observe: t.observe, onOpen: t.onOpen, talk: t.talk,
      important: !!(t.important || t.spine || t.lock), observerAlt: t.type === 'observer' && t.alt ? rid(t.alt) : undefined,
    };
    if (t.type === 'false' && t.secretTo) (doors[id] as any).secretTo = rid(t.secretTo);
  }
  // meta door: Sala Zero → Sala 1
  doors['z_front'] = { id: 'z_front', displayNumber: 0, type: 'stable', origin: ROOM_ZERO, side: 'front', x: 960, to: 'r001', bidirectional: false, visual: { material: 'wood_dark', panels: 4 }, audio: 'wood', meta: true, important: true };

  // resolve lock door references
  const lockByDoor: Record<string, string> = {};
  for (const L of Object.values(locks)) {
    const d = L.door.startsWith('@') ? refs[L.door] : L.door;
    if (d) { L.door = d; lockByDoor[d] = L.id; if (doors[d]) doors[d].lock = L.id; }
  }
  // hidden doors from fill get a secret crack prop on their wall
  for (const d of Object.values(doors)) {
    if (!d.hidden) continue;
    const r = rooms[d.origin];
    const persp = d.side === 'front' ? r.front : r.back;
    if (persp.props.some(p => p.kind === 'door_outline' && Math.abs(p.x - (d.x ?? 0)) < 40)) continue;
    const ref = Object.entries(refs).find(([, v]) => v === d.id)?.[0] ?? d.id;
    if (ref.startsWith('@g_puz_') || ref.startsWith('@r0') || ref.startsWith('@r095') || ref.startsWith('@r080')) continue; // revealed by puzzles / authored hotspots
    const pid = 'crack_' + d.id;
    persp.props.push({
      id: pid, kind: 'door_outline', x: d.x ?? 960, y: 800, hotspot: { w: 190, h: 380, secret: true },
      examine: d.revealHint ? `Você repara: ${d.revealHint}.` : 'Uma linha fina e reta no papel de parede. Reta demais.',
      interact: [{ label: 'Empurrar a parede', once: 'forever', effects: [{ type: 'revealDoor', door: d.id }, { type: 'prop', prop: pid, hidden: true, scope: 'meta' }, { type: 'achievement', id: 'ach_segredo' }, { type: 'fragments', n: 2 }, { type: 'text', text: 'A parede cede. Era uma porta.' }] }],
    });
  }

  const outDoors: Record<string, string[]> = {};
  const inDoors: Record<string, string[]> = {};
  for (const r of Object.keys(rooms)) { outDoors[r] = []; inDoors[r] = []; }
  for (const d of Object.values(doors)) {
    outDoors[d.origin]?.push(d.id);
    for (const t of [d.to, ...(d.destinationRules ?? []).map(r => r.to), d.observerAlt]) if (t && inDoors[t] && !inDoors[t].includes(d.id)) inDoors[t].push(d.id);
  }
  for (const r of Object.values(rooms)) {
    const tags = new Set(r.tags);
    for (const p of [...r.front.props, ...r.back.props]) {
      if (p.kind.startsWith('chair')) tags.add('has_chair');
      if (p.kind === 'painting') tags.add('has_painting');
      if (p.kind.includes('clock')) tags.add('has_clock');
    }
    r.tags = [...tags];
  }
  // key sources from authored props
  for (const r of Object.values(rooms)) for (const p of [...r.front.props, ...r.back.props]) for (const it of p.interact ?? []) for (const e of flattenEffects(it.effects)) {
    if (e.type === 'giveItem' && ITEMS[e.item]?.key) (keySources[e.item] ??= []).includes(r.id) || keySources[e.item].push(r.id);
  }

  const spineDoors = new Set(temps.filter(t => t.spine).map(t => idOf[t.tid]));
  const house: House = {
    rooms, doors, locks, lockByDoor, refs, outDoors, inDoors, keySources, generatedKeys,
    rewardRooms: REWARD_ROOMS.map(rid), spineDoors, roomIds: Object.keys(rooms),
    resolve(ref: string) { return ref.startsWith('@') ? (refs[ref] ?? ref) : ref; },
  };
  void KEYS;
  return house;
}

export function flattenEffects(effects: Effect[] = []): Effect[] {
  const out: Effect[] = [];
  for (const e of effects) {
    out.push(e);
    if (e.type === 'if') { out.push(...flattenEffects(e.then)); out.push(...flattenEffects(e.else)); }
    if (e.type === 'random') for (const o of e.options) out.push(...flattenEffects(o));
    if (e.type === 'choice') for (const o of e.options) out.push(...flattenEffects(o.effects));
  }
  return out;
}

/** Móveis de chão com interação, com meia-largura aproximada (para posicionar portas longe deles). */
function interactiveBlockers(r: RoomDefinition | undefined, side: Side): { x: number; half: number }[] {
  if (!r) return [];
  const BIG: Record<string, number> = { fireplace: 210, machine: 350, piano: 190, table_long: 380, puppet_theater: 230, stairs: 260, well: 190, bed: 210, counter: 280, chairs_row: 260, chairs_row_filled: 260, chairs_many: 600, bench: 150, altar: 180, boiler: 230, workbench: 180, drafting_table: 150, throne_chair: 110 };
  return r[side].props.filter(p => p.d !== undefined && p.z !== -1 && p.z !== 1 && (p.interact?.length || BIG[p.kind]))
    .map(p => ({ x: p.x, half: (BIG[p.kind] ?? 90) * (1 + 0.5 * (p.d ?? 0)) }));
}

function tidNum(t: TempDoor) { return parseInt(t.tid.slice(1), 10); }

function spreadSlots(n: number, fixed: number[], back: boolean): number[] {
  const out: number[] = [];
  const lo = 330, hi = 1590;
  for (let x = lo; x <= hi && out.length < n; x += 60) {
    if (fixed.concat(out).every(f => Math.abs(f - x) > 210) && (!back || Math.abs(x - 960) > 200)) out.push(x);
  }
  return out;
}

function pickRewardRooms(rng: RNG, authored: Map<number, AuthoredRoom>): number[] {
  const out: number[] = [];
  for (let base = 20; base <= 300; base += 24) {
    for (let tries = 0; tries < 30; tries++) {
      const n = base + rng.int(0, 20);
      if (n > 330 || authored.has(n) || NO_SPINE.has(n) || out.includes(n)) continue;
      out.push(n); break;
    }
  }
  return out;
}

function fromAuthored(a: AuthoredRoom, depth: number): RoomDefinition {
  const region: RegionId = a.region ?? regionFor(a.number);
  const tags = new Set(a.tags ?? []);
  tags.add('authored'); tags.add(region); tags.add(a.theme);
  if (a.layout === 'corridor') tags.add('corridor');
  if (a.category === 'sanctuary') tags.add('sanctuary');
  const front = { props: dedupeIds(a.front ?? []), desc: a.frontDesc };
  const back = { props: dedupeIds(a.back ?? []), desc: a.backDesc };
  const r: RoomDefinition = {
    id: rid(a.number), number: a.number, name: a.name, title: a.title, subtitle: a.subtitle, category: a.category,
    region, theme: a.theme, layout: a.layout, depth, front, back, ambience: a.ambience ?? THEMES[a.theme]?.ambience,
    ambient: a.ambient, music: a.music, npcs: a.npcs, events: a.events, puzzle: a.puzzle, tags: [...tags],
    onEnter: a.onEnter, onFirstEnter: a.onFirstEnter, echoOf: a.echoOf, tilt: a.tilt, mirror: a.mirror,
    authored: true, hideNumber: a.hideNumber, anchorable: a.anchorable, noCeilingLamp: a.noCeilingLamp,
  };
  return r;
}

function dedupeIds(props: PropDef[]): PropDef[] {
  const seen = new Map<string, number>();
  return props.map(p => {
    const c = seen.get(p.id) ?? 0;
    seen.set(p.id, c + 1);
    return c ? { ...p, id: p.id + '_' + c } : p;
  });
}

export function regionFor(n: number): RegionId {
  if (n === 0) return 'zero';
  if (n <= 30) return 'residencial';
  const cands = REGIONS.filter(r => r.id !== 'zero' && n >= r.range[0] && n <= r.range[1]);
  if (!cands.length) return 'semnome';
  // deterministic interleave: rooms drift between overlapping regions
  return cands[(n * 7 + Math.floor(n / 5)) % cands.length].id;
}

function generateRoom(n: number, depth: number, rng: RNG, reward: boolean): RoomDefinition {
  const region = regionFor(n);
  const reg = REGIONS.find(r => r.id === region)!;
  let theme = rng.pick(reg.themes);
  let cat = rng.weighted(categoryWeights(depth), ([, w]) => w)[0] as RoomCategory | 'empty';
  if (reward) cat = 'secret';
  let empty = false;
  if (cat === 'empty') { empty = true; cat = 'normal'; if (rng.chance(0.6)) theme = 'empty'; }
  if (cat === 'impossible' && rng.chance(0.5)) theme = rng.pick(['void', 'white']);
  const category = cat as RoomCategory;
  const layout = theme === 'corridor' ? (rng.chance(0.6) ? 'corridor' : 'narrow') : theme === 'void' ? 'void' : rng.weighted(['box', 'box', 'box', 'narrow', 'wide'] as const, () => 1);
  const names = NAMES_BY_THEME[theme] ?? ['Sala'];
  const subPool = empty ? SUBTITLES.empty : SUBTITLES[category] ?? SUBTITLES.normal;
  const tags = ['generated', region, theme];
  if (empty) tags.push('empty');
  if (layout === 'corridor') tags.push('corridor');
  if (category === 'sanctuary' || category === 'secret') tags.push('important');
  const front: PropDef[] = [];
  const back: PropDef[] = [];
  // lighting
  const lampKind = theme === 'parlor' || theme === 'gallery' ? rng.pick(['chandelier', 'lamp_shade', 'bulb']) : theme === 'chapel' ? 'none' : rng.pick(['bulb', 'bulb', 'lamp_shade']);
  const dark = depth > 0.15 && rng.chance(0.08);
  if (lampKind !== 'none' && theme !== 'void' && theme !== 'white') {
    front.push({ id: 'ceiling', kind: lampKind, x: 960 + rng.int(-120, 120), y: 0, light: { r: dark ? 300 : rng.int(460, 680), i: dark ? 0.5 : rng.float(0.65, 1) }, anim: rng.chance(0.5) ? 'flicker' : undefined });
    back.push({ id: 'ceiling_b', kind: lampKind, x: 960, y: 0, light: { r: dark ? 260 : 440, i: dark ? 0.35 : 0.6 } });
  }
  if (theme === 'chapel') {
    front.push({ id: 'cand_l', kind: 'candle_floor', x: 300, d: 0.25, y: floorY(0.25), light: { r: 260, i: 0.9 }, anim: 'flame' });
    front.push({ id: 'cand_r', kind: 'candle_floor', x: 1620, d: 0.25, y: floorY(0.25), light: { r: 260, i: 0.9 }, anim: 'flame' });
  }
  // furniture — sparse, emptiness is a feature
  const pool = PROP_POOLS[theme] ?? PROP_POOLS.plain;
  const nProps = empty ? (rng.chance(0.3) ? 1 : 0) : category === 'normal' ? rng.int(1, 4) : rng.int(1, 3);
  const edges = [rng.int(220, 330), rng.int(1590, 1700)];
  const used: number[] = [];
  for (let i = 0; i < nProps && pool.length; i++) {
    const [kind, , place] = rng.weighted(pool, p => p[1]);
    const x = place === 'edge' ? edges[i % 2] + rng.int(-20, 20) : place === 'wall' ? rng.pick([300, 1620, 760, 1160]) : rng.pick([edges[0] + 180, edges[1] - 180, 760, 1160]);
    if (used.some(u => Math.abs(u - x) < 170)) continue;
    used.push(x);
    front.push(...expandProp(kind, x, rng, i));
  }
  // back wall: sometimes a painting, a window, nothing
  if (!empty && rng.chance(0.45)) {
    const kind = rng.pick(['painting', 'painting', 'window', 'sconce', 'chair', 'clock_wall']);
    back.push(...expandProp(kind, rng.pick([760, 1160, 960]), rng, 9));
  }
  if (reward) {
    front.push({
      id: 'reward', kind: rng.pick(['chest', 'trunk', 'gift']), x: 960, d: 0.35, y: floorY(0.35), label: 'Algo guardado',
      examine: 'Alguém guardou isto aqui, atrás de uma porta trancada, para quem voltasse.',
      interact: [{ label: 'Abrir', once: 'forever', effects: rewardEffects(rng, n) }],
    });
  }
  const r: RoomDefinition = {
    id: rid(n), number: n, name: `gen_${n}`, title: rng.pick(names), subtitle: rng.pick(subPool), category, region, theme,
    layout: layout as any, depth, front: { props: front }, back: { props: back }, ambience: THEMES[theme]?.ambience ?? 'room',
    tags, ambient: dark ? 0.15 : undefined,
  };
  // anomalies escalate with depth
  if (category === 'anomaly' || category === 'impossible') {
    const mods: string[] = [];
    if (rng.chance(0.5)) { r.tilt = rng.float(1.5, 2 + depth * 8) * (rng.chance(0.5) ? 1 : -1); mods.push('tilt'); }
    if (depth > 0.3 && rng.chance(0.3)) { for (const p of front) if (p.d !== undefined) { p.flipY = true; p.y = 300; } mods.push('ceiling_furniture'); }
    if (rng.chance(0.25)) mods.push('duplicate');
    if (depth > 0.45 && rng.chance(0.3)) { r.mirror = true; mods.push('mirror'); }
    if (rng.chance(0.2)) mods.push('fog');
    if (theme === 'ruin' || rng.chance(0.1)) mods.push('rain');
    if (mods.includes('duplicate') && front.length > 1) {
      const src = front.find(p => p.d !== undefined && !p.flipY);
      if (src) for (let i = 0; i < 4; i++) front.push({ ...src, id: src.id + '_dup' + i, x: 360 + i * 400, examine: 'Igual à outra. Exatamente igual. Até o arranhão.' });
    }
    r.modifiers = mods;
  }
  if (category === 'danger') r.onEnter = [{ type: 'if', cond: { chance: 0.35 }, then: dangerEffects(rng) }];
  if (category === 'sanctuary') { r.anchorable = true; r.tags.push('sanctuary'); }
  if (category === 'echo') r.subtitle = rng.pick(SUBTITLES.echo);
  return r;
}

function expandProp(kind: string, x: number, rng: RNG, i: number): PropDef[] {
  const id = kind + '_' + i;
  const ex = GENERATED_EXAMINES[kind] ? rng.pick(GENERATED_EXAMINES[kind]) : undefined;
  const d = rng.float(0.06, 0.22);
  switch (kind) {
    case 'side_table_lamp': return [
      { id, kind: 'side_table', x, d, y: floorY(d) },
      { id: id + '_l', kind: 'lamp_table', x, d, y: topY('side_table', d), light: { r: 280, i: 0.9 }, anim: rng.chance(0.4) ? 'flicker' : undefined, z: 1 },
    ];
    case 'nightstand_lamp': return [
      { id, kind: 'nightstand', x, d, y: floorY(d) },
      { id: id + '_l', kind: 'lamp_table', x, d, y: topY('nightstand', d), light: { r: 260, i: 0.9 }, z: 1 },
    ];
    case 'desk_lamp': return [
      { id, kind: 'desk', x, d, y: floorY(d), examine: 'Uma escrivaninha. Papéis em branco, todos com a mesma dobra.' },
      { id: id + '_l', kind: 'lamp_table', x: x + 60, d, y: topY('desk', d), light: { r: 280, i: 0.9 }, z: 1 },
    ];
    case 'bust_pedestal': return [
      { id, kind: 'pedestal', x, d, y: floorY(d) },
      { id: id + '_b', kind: 'bust', x, d, y: topY('pedestal', d), z: 1, examine: 'Um busto. O rosto foi raspado.' },
    ];
    case 'painting': return [{ id: 'painting', kind, x, y: rng.int(480, 580), variant: rng.pick(['landscape', 'portrait', 'small_dark', 'still_life']), scale: rng.float(0.5, 0.9), examine: ex }];
    case 'sconce': return [{ id, kind, x, y: 470, light: { r: 240, i: 0.8 }, anim: 'flicker' }];
    case 'clock_wall': return [{ id, kind, x, y: 380, examine: ex }];
    case 'window': return [{ id, kind, x, y: 580, variant: rng.pick(['rain', 'night', 'bricks']), examine: ex ?? 'Uma janela para lugar nenhum.' }];
    case 'mirror': return [{ id: 'mirror', kind, x, y: 520, examine: ex }];
    case 'drawings_wall': return [{ id, kind, x, y: 560 }];
    case 'towel': return [{ id, kind, x, y: 560 }];
    case 'cross': return [{ id, kind, x, y: 470 }];
    case 'pipes': return [{ id, kind, x, y: 790 }];
    case 'clipboard': return [{ id, kind, x, y: 560 }];
    case 'rug': case 'runner_rug': case 'papers': case 'debris': return [{ id, kind, x: 960 + rng.int(-100, 100), d: 0.5, y: floorY(0.5), z: -1, examine: ex }];
    case 'chair': return [{ id: 'chair', kind, x, d, y: floorY(d), flip: rng.chance(0.5), examine: ex }];
    default: return [{ id, kind, x, d, y: floorY(d), examine: ex }];
  }
}

function rewardEffects(rng: RNG, n: number): Effect[] {
  const loreFor = ['diario_t2', 'diario_t3', 'diario_t4', 'helena_3', 'postal', 'grav_fita', 'davi_altura', 'regras_casa', 'relojoeiro_nota', 'lenco_lia', 'carta_selada', 'alianca'];
  const items = ['diario_pagina_2', 'diario_pagina_3', 'diario_pagina_4', 'carta_helena_3', 'cartao_postal', 'fita_cassete', 'nome_bordado', 'anel', 'carta_selada', 'lista_perdidos', 'bilhete_casa'];
  const pickI = items[n % items.length];
  const pickL = loreFor[(n * 3) % loreFor.length];
  return [
    { type: 'fragments', n: 4 },
    { type: 'text', text: 'Guardado com cuidado, como uma promessa cumprida:' },
    { type: 'if', cond: { noItem: pickI }, then: [{ type: 'giveItem', item: pickI }], else: [{ type: 'lore', id: pickL, read: true }] },
    rng.chance(0.5) ? { type: 'giveItem', item: rng.pick(['curativo', 'moeda_antiga', 'fita_vermelha', 'chave_efemera', 'lanterna', 'giz']) } : { type: 'heal', n: 2 },
  ];
}

function dangerEffects(rng: RNG): Effect[] {
  return rng.pick<Effect[]>([
    [{ type: 'text', text: 'O piso cede sob seu pé.' }, { type: 'damage', n: 1, cause: 'um piso podre' }],
    [{ type: 'text', text: 'Algo se move no escuro, rápido.' }, { type: 'choice', options: [
      { text: 'Ficar imóvel.', effects: [{ type: 'text', text: 'Passa.' }] },
      { text: 'Correr para uma porta.', effects: [{ type: 'damage', n: 1, cause: 'algo no escuro' }] },
    ] }],
    [{ type: 'darkness', ms: 1500 }, { type: 'text', text: 'Quando a luz volta, há arranhões novos no seu braço.' }, { type: 'damage', n: 1, cause: 'algo no escuro' }],
    [{ type: 'sound', id: 'heavy_steps', behind: true }, { type: 'text', text: 'Passos pesados. Você prende a respiração até passarem.' }],
  ]);
}

function makeGeneratedPuzzle(rng: RNG, r: RoomDefinition, rooms: Record<string, RoomDefinition>, n: number): PuzzleDefinition {
  const id = 'gp_' + n;
  const type = rng.pick(['code', 'code', 'lights', 'order', 'clock', 'sequence', 'symbols'] as const);
  const clueRoomN = rng.chance(0.6) ? n : n - rng.int(1, 5);
  const clueRoom = rooms[rid(Math.max(1, clueRoomN))] && !rooms[rid(clueRoomN)].authored ? rid(clueRoomN) : r.id;
  let config: any = {}; let solution: any; let clueText = ''; let prompt = ''; let propKind = 'safe_wall'; let title = '';
  if (type === 'code') {
    const digits = rng.pick([3, 4]);
    solution = Array.from({ length: digits }, () => rng.int(0, 9)).join('');
    config = { digits, charset: '0123456789' };
    clueText = `Números riscados a unha: ${solution.split('').join(' — ')}.`;
    prompt = `Um cofre embutido na parede, com ${digits} rodas.`; propKind = 'safe_wall'; title = 'O Cofre';
  } else if (type === 'lights') {
    const w = rng.pick([2, 3]); const h = 2;
    let init = '';
    for (let tries = 0; tries < 50; tries++) {
      init = ''; for (let i = 0; i < w * h; i++) init += rng.chance(0.4) ? '1' : '0';
      if (init.includes('0') && lightsSolvable(w, h, init, '1'.repeat(w * h))) break;
    }
    config = { w, h, initial: init }; solution = '1'.repeat(w * h);
    clueText = 'Uma nota: "cada interruptor acende a si e aos vizinhos".'; prompt = 'Uma fileira de lâmpadas pequenas e interruptores.'; propKind = 'switch_panel'; title = 'As Lâmpadas';
  } else if (type === 'order') {
    const sets = [['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'], ['Primavera', 'Verão', 'Outono', 'Inverno'], ['Manhã', 'Tarde', 'Noite', 'Madrugada'], ['Semente', 'Broto', 'Flor', 'Fruto']];
    const set = rng.pick(sets);
    solution = set.slice(); config = { items: rng.shuffle(set.slice()) };
    clueText = `Escrito na parede: "${set.join(', ')}".`; prompt = 'Objetos numa prateleira, fora de ordem.'; propKind = 'shelf_objects'; title = 'A Prateleira';
  } else if (type === 'clock') {
    solution = { h: rng.int(1, 12), m: rng.pick([0, 5, 10, 15, 17, 20, 30, 45]) };
    clueText = `Uma anotação: "às ${solution.h}:${String(solution.m).padStart(2, '0')}, ela voltava".`; prompt = 'Um relógio sem corda, com os ponteiros soltos.'; propKind = 'clock_wall'; title = 'O Relógio';
  } else if (type === 'sequence') {
    config = { buttons: ['1º sino', '2º sino', '3º sino', '4º sino'], notes: [392, 440, 494, 523], length: 4 };
    solution = Array.from({ length: 4 }, () => rng.int(0, 3));
    clueText = `Riscado: "${solution.map((s: number) => s + 1).join(' ')}".`; prompt = 'Quatro sinos pequenos pendurados.'; propKind = 'bells'; title = 'Os Sinos';
  } else {
    const syms = ['lua', 'estrela', 'losango', 'sol', 'olho', 'espiral'];
    solution = [rng.pick(syms), rng.pick(syms), rng.pick(syms)];
    config = { symbols: syms, length: 3 };
    clueText = `Três símbolos desenhados a giz: ${solution.join(', ')}.`; prompt = 'Três placas giratórias com símbolos.'; propKind = 'symbol_dials'; title = 'As Placas';
  }
  const clueId = 'clue_' + id;
  // the clue: on the back wall (turn around!) or in a neighbouring room
  const clueProp: PropDef = { id: 'clue_' + id, kind: 'inscription', x: rng.pick([760, 1160]), y: 560, examine: 'Algo escrito na parede.', interact: [{ label: 'Ler', effects: [{ type: 'text', text: clueText }, { type: 'clue', id: clueId }] }] };
  (rooms[clueRoom] === r ? r.back.props : rooms[clueRoom].back.props).push(clueProp);
  r.front.props.push({
    id: 'puzzle_' + id, kind: propKind, x: rng.pick([330, 1590]), y: propKind === 'shelf_objects' || propKind === 'bells' ? 560 : propKind === 'clock_wall' ? 380 : 600,
    examine: prompt, interact: [{ label: 'Examinar o mecanismo', cond: { puzzleUnsolved: id }, effects: [{ type: 'puzzle', id }] }],
  });
  r.puzzle = id;
  return {
    id, type, title, prompt, room: r.id, config, solution, generated: true,
    clues: [{ room: clueRoom, clueId, text: clueText }],
    onSolve: [{ type: 'fragments', n: 2, reason: 'enigma' }, { type: 'giveItem', item: rng.pick(['curativo', 'moeda_antiga', 'giz', 'fosforos', 'pao', 'moeda_furada', 'lupa', 'agua']) }],
    onFail: type === 'lights' || type === 'code' ? [] : [{ type: 'text', text: 'Nada acontece. Ou quase nada.' }],
  };
}

function pickMaterial(rng: RNG, depth: number, type: DoorType): DoorMaterial {
  if (type === 'memory') return 'wood_light';
  const pool: [DoorMaterial, number][] = [
    ['wood_dark', 30], ['wood_light', 18], ['white', 14], ['green', 9], ['old', 10], ['apartment', depth > 0.05 ? 7 : 3], ['grey', 7],
    ['blue', depth > 0.06 ? 8 : 0], ['metal', depth > 0.15 ? 5 : 0], ['oxblood', depth > 0.08 ? 5 : 1], ['teal', depth > 0.2 ? 3 : 0],
    ['black', depth > 0.45 ? 3 : 0], ['red', depth > 0.3 ? 1 : 0],
  ];
  return rng.weighted(pool, p => p[1])[0];
}

function audioFor(m?: DoorMaterial): DoorDefinition['audio'] {
  if (m === 'metal') return 'metal';
  if (m === 'old' || m === 'grey') return 'squeak';
  if (m === 'black' || m === 'red') return 'heavy';
  if (m === 'glass' || m === 'painted') return 'soft';
  return 'wood';
}

function lockVisualFor(t: LockType) {
  return ({ simple: 'iron', old_iron: 'iron', brass_small: 'brass', padlock: 'padlock', service: 'brass' } as any)[t] ?? 'iron';
}
function lockDescription(t: LockType): string {
  return ({
    simple: 'Uma fechadura simples, de ferro. O buraco é comum. A chave não.',
    old_iron: 'Fechadura de ferro antiga, grande. A tinta ao redor está gasta de tantas tentativas.',
    brass_small: 'Uma pequena fechadura de latão, delicada.',
    padlock: 'Um cadeado atravessado numa argola. Pesado.',
    service: 'Fechadura de latão com uma plaquinha: "SERVIÇO".',
  } as any)[t] ?? 'Uma fechadura.';
}
function lockShort(t: LockType): string {
  return ({ simple: 'fechadura simples de ferro', old_iron: 'fechadura de ferro antiga', brass_small: 'fechadura pequena de latão', padlock: 'um cadeado pesado', service: 'fechadura de serviço' } as any)[t] ?? 'fechadura';
}

function freeX(rng: RNG, doors: TempDoor[], props: PropDef[]): number {
  for (let i = 0; i < 20; i++) {
    const x = rng.int(300, 1620);
    if (doors.every(d => Math.abs((d.x ?? 960) - x) > 140) && props.every(p => Math.abs(p.x - x) > 90)) return x;
  }
  return rng.pick([280, 1640]);
}

let cached: House | null = null;
export function getHouse(): House {
  if (!cached) cached = buildHouse();
  return cached;
}
export function resetHouseCache() { cached = null; }
