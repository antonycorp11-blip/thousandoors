// Mental map: a growing investigation board of rooms (nodes) and known doors (edges).
import type { GameManager } from '../core/GameManager';
import type { Effect, MarkId } from '../core/types';
import { lockTypeName } from '../world/DoorManager';
import { hashStr } from '../core/rng';
import { CHARACTERS } from '../data/characters';
import { ITEMS } from '../data/items';

export interface MapNode {
  id: string;
  label: string;
  number?: number;
  kind: 'visited' | 'mapped' | 'peeked' | 'phantom' | 'stub';
  current: boolean;
  npcs: string[];
  marks: MarkId[];
  hasLockedStub: boolean;
  unsolved: boolean;
  anchor: boolean;
  zero?: boolean;
  lockHint?: boolean;
}
export interface MapEdge {
  from: string; to: string; door: string;
  style: 'solid' | 'dashed' | 'faint';
  oneway: boolean; locked: boolean; highlight: boolean; hidden: boolean;
}
export interface RouteStep { from: string; to: string; door: string; uncertain: boolean }

export class MapSystem {
  constructor(private g: GameManager) {}

  /** Directions through doors the player has actually used. */
  routeTo(target: string): RouteStep[] | null {
    const start = this.g.run?.currentRoom;
    if (!start || !this.g.meta.rooms[target]) return null;
    if (start === target) return [];
    const { edges } = this.graph();
    const links = new Map<string, { to: string; door: string; uncertain: boolean }[]>();
    const addLink = (from: string, to: string, door: string, uncertain: boolean) => {
      const list = links.get(from) ?? [];
      list.push({ to, door, uncertain });
      links.set(from, list);
    };
    for (const e of edges) {
      if (e.locked || e.style === 'faint' || !this.g.meta.rooms[e.from] || !this.g.meta.rooms[e.to]) continue;
      const d = this.g.house.doors[e.door];
      if (!d || this.g.doors.isLocked(d.id)) continue;
      const uncertain = d.type === 'unstable' || d.type === 'observer';
      addLink(e.from, e.to, e.door, uncertain);
      if (d.bidirectional) addLink(e.to, e.from, e.door, uncertain);
    }
    // Current-run passages are more precise than the persistent map, especially when
    // an unstable door has led somewhere different on an earlier exploration.
    for (const step of this.g.run?.trail ?? []) {
      const d = this.g.house.doors[step.door];
      if (!d || !this.g.meta.rooms[step.from] || !this.g.meta.rooms[step.to] || this.g.doors.isLocked(d.id)) continue;
      const uncertain = d.type === 'unstable' || d.type === 'observer';
      addLink(step.from, step.to, d.id, uncertain);
      if (d.bidirectional) addLink(step.to, step.from, d.id, uncertain);
    }
    // The first instruction must name a door that actually exists in this room now.
    const exits = [...this.g.doors.visible(start, 'front'), ...this.g.doors.visible(start, 'back')];
    links.set(start, (links.get(start) ?? []).filter(link => exits.some(v =>
      v.door.id === link.door && !v.locked && this.g.doors.resolveTo(v.door, v.reverse) === link.to)));
    const queue = [start];
    const found = new Map<string, { from: string; door: string; uncertain: boolean }>();
    while (queue.length) {
      const from = queue.shift()!;
      for (const link of links.get(from) ?? []) {
        if (link.to === start || found.has(link.to)) continue;
        found.set(link.to, { from, door: link.door, uncertain: link.uncertain });
        if (link.to === target) {
          const route: { from: string; to: string; door: string; uncertain: boolean }[] = [];
          let to = target;
          while (to !== start) {
            const step = found.get(to)!;
            route.unshift({ from: step.from, to, door: step.door, uncertain: step.uncertain });
            to = step.from;
          }
          return route;
        }
        queue.push(link.to);
      }
    }
    return null;
  }

  routeInstruction(step: RouteStep): string {
    const number = this.g.house.doors[step.door]?.displayNumber ?? '?';
    const views = [...this.g.doors.visible(step.from, 'front'), ...this.g.doors.visible(step.from, 'back')];
    const view = views.find(v => v.door.id === step.door && this.g.doors.resolveTo(v.door, v.reverse) === step.to);
    if (!view) return `Porta ${number} → ${this.g.roomLabel(step.to)} (confira se ela ainda está acessível)`;
    const side = view.reverse || view.door.side === 'back' ? 'vire para trás' : 'olhe à frente';
    const position = view.pos === 'left' ? 'à esquerda' : view.pos === 'right' ? 'à direita' : 'no centro';
    return `${side}; abra a porta ${number}, ${position} → ${this.g.roomLabel(step.to)}${step.uncertain ? ' · destino instável' : ''}`;
  }

  graph(): { nodes: MapNode[]; edges: MapEdge[] } {
    const g = this.g, m = g.meta, h = g.house;
    const nodes = new Map<string, MapNode>();
    const edges: MapEdge[] = [];
    const cur = g.run?.currentRoom;
    const npcSeen: Record<string, string[]> = {};
    for (const c of CHARACTERS) { const st = m.npcs[c.id]; if (st?.lastEncounter?.room) (npcSeen[st.lastEncounter.room] ??= []).push(c.id); }
    const carriedFamilies = new Set(g.keys.carried().map(k => keyFamily(ITEMS[k]?.key?.visualVariant ?? '')));
    const addRoom = (id: string, kind: MapNode['kind']) => {
      if (nodes.has(id)) return;
      const r = h.rooms[id];
      if (!r) return;
      const visited = kind === 'visited';
      const num = r.hideNumber ? undefined : r.number;
      const label = visited ? `${num !== undefined ? String(num).padStart(2, '0') + ' · ' : ''}${r.title}` : kind === 'mapped' ? `${num ?? '??'} · ???` : kind === 'phantom' ? `${num ?? '??'} · ???` : '???';
      nodes.set(id, {
        id, label, number: r.number, kind, current: id === cur, npcs: visited ? npcSeen[id] ?? [] : [], marks: m.map.roomMarks[id] ?? [],
        hasLockedStub: false, unsolved: visited && !!r.puzzle && !m.puzzlesSolved.includes(r.puzzle), anchor: m.anchors.includes(id), zero: id === 'r000',
      });
    };
    for (const id of Object.keys(m.rooms)) addRoom(id, 'visited');
    for (const [id, how] of Object.entries(m.seenRooms)) if (!m.rooms[id]) addRoom(id, how === 'phantom' ? 'phantom' : how === 'mapped' ? 'mapped' : 'peeked');

    for (const [doorId, rec] of Object.entries(m.doors)) {
      const d = h.doors[doorId];
      if (!d || d.meta || !nodes.has(d.origin)) continue;
      if (rec.used > 0 && rec.lastDest) {
        const dests = m.upgrades.includes('memoria_instavel') ? rec.destsSeen ?? [rec.lastDest] : [rec.lastDest];
        for (const to of dests) {
          addRoom(to, m.rooms[to] ? 'visited' : 'peeked');
          edges.push({ from: d.origin, to, door: doorId, style: d.type === 'unstable' || d.type === 'observer' ? 'dashed' : 'solid', oneway: !d.bidirectional, locked: false, highlight: false, hidden: !!d.hidden });
        }
      } else if (rec.seen && g.doors.isLocked(doorId)) {
        // a promise: we know WHERE the locked door is, never where it leads
        const stubId = 'stub:' + doorId;
        const L = g.doors.lock(doorId);
        const fam = L ? lockFamily(L.visual) : '';
        const highlight = !!rec.lockExamined && carriedFamilies.has(fam) && fam !== '';
        nodes.set(stubId, { id: stubId, label: '🔒', kind: 'stub', current: false, npcs: [], marks: rec.marks ?? [], hasLockedStub: true, unsolved: false, anchor: false, lockHint: highlight });
        nodes.get(d.origin)!.hasLockedStub = true;
        edges.push({ from: d.origin, to: stubId, door: doorId, style: 'solid', oneway: false, locked: true, highlight, hidden: false });
      } else if (rec.seen && rec.revealed && d.hidden) {
        const stubId = 'stub:' + doorId;
        nodes.set(stubId, { id: stubId, label: '?', kind: 'stub', current: false, npcs: [], marks: rec.marks ?? [], hasLockedStub: false, unsolved: false, anchor: false });
        edges.push({ from: d.origin, to: stubId, door: doorId, style: 'dashed', oneway: false, locked: false, highlight: false, hidden: true });
      }
    }
    // hearsay connections between mapped rooms (cartographer)
    for (const [id, how] of Object.entries(m.seenRooms)) {
      if (how !== 'mapped') continue;
      for (const dId of h.inDoors[id] ?? []) {
        const d = h.doors[dId];
        if (nodes.has(d.origin) && !edges.some(e => e.door === dId)) edges.push({ from: d.origin, to: id, door: dId, style: 'faint', oneway: false, locked: false, highlight: false, hidden: false });
      }
    }
    return { nodes: [...nodes.values()], edges };
  }

  roomInfo(id: string) {
    const g = this.g, m = g.meta, h = g.house, r = h.rooms[id];
    const rec = m.rooms[id];
    const doors = (h.outDoors[id] ?? []).map(did => h.doors[did]).filter(d => m.doors[d.id]?.seen);
    const incoming = (h.inDoors[id] ?? []).map(did => h.doors[did]).filter(d => d.bidirectional && m.doors[d.id]?.used && d.origin !== id && !d.meta);
    const doorLines = doors.map(d => {
      const dr = m.doors[d.id];
      const L = g.doors.lock(d.id);
      let s = `Porta ${d.displayNumber} (${d.side === 'front' ? 'frente' : 'trás'})`;
      if (g.doors.isLocked(d.id)) s += dr?.lockExamined && L ? ` — 🔒 ${L.shortDesc}${m.upgrades.includes('olhos_simbolo') ? ' [' + lockTypeName(L.lockType) + ']' : ''}` : ' — 🔒 trancada';
      else if (dr?.used && dr.lastDest) s += ` → ${g.roomLabel(dr.lastDest)}`;
      else s += ' — não aberta';
      if (dr?.marks?.length) s += ' ' + dr.marks.map(markGlyph).join('');
      return { id: d.id, text: s };
    });
    for (const d of incoming) doorLines.push({ id: d.id, text: `Porta ${d.displayNumber} (atrás, retorno) → ${g.roomLabel(d.origin)}` });
    const objects = r ? [...r.front.props, ...r.back.props].filter(p => p.interact?.length && !p.invisible).map(p => p.label ?? p.kind) : [];
    const npcs = CHARACTERS.filter(c => m.npcs[c.id]?.lastEncounter?.room === id).map(c => g.npcs.displayName(c.id));
    const mysteries: string[] = [];
    if (r?.puzzle && !m.puzzlesSolved.includes(r.puzzle)) mysteries.push('Algo aqui ainda não foi resolvido.');
    if (doors.some(d => g.doors.isLocked(d.id))) mysteries.push('Uma porta trancada espera.');
    if (r?.front.props.concat(r.back.props).some(p => p.hotspot?.secret) && !rec) mysteries.push('?');
    return {
      title: rec ? g.roomLabel(id) : '???', subtitle: rec ? r?.subtitle ?? '' : '', visits: rec?.visits ?? 0,
      doors: doorLines, objects: [...new Set(objects)].slice(0, 8), npcs, notes: m.map.notes[id] ?? [], marks: m.map.roomMarks[id] ?? [], mysteries,
      region: rec ? r?.region : undefined,
    };
  }

  toggleRoomMark(id: string, mark: MarkId) {
    const arr = (this.g.meta.map.roomMarks[id] ??= []);
    const i = arr.indexOf(mark);
    if (i >= 0) arr.splice(i, 1); else arr.push(mark);
    this.g.save();
  }
  toggleDoorMark(doorId: string, mark: MarkId) {
    const r = this.g.doors.rec(doorId);
    const arr = (r.marks ??= []);
    const i = arr.indexOf(mark);
    if (i >= 0) arr.splice(i, 1); else arr.push(mark);
    this.g.save();
  }

  reveal(e: Extract<Effect, { type: 'revealMap' }>): void {
    const g = this.g;
    const from = g.run?.currentRoom ?? 'r001';
    const dist = g.graph.reach(from, { allowHidden: false, allowLocked: false });
    let cands = [...dist.entries()].filter(([id, d]) => !g.meta.rooms[id] && d <= (e.around ?? 3) + 2 && id !== 'r334').map(([id]) => id);
    if (e.rooms) cands = e.rooms;
    cands.sort((a, b) => hashStr(a + g.meta.runCount) - hashStr(b + g.meta.runCount));
    for (const id of cands.slice(0, e.count ?? 5)) if (!g.meta.seenRooms[id] || g.meta.seenRooms[id] !== 'mapped') g.meta.seenRooms[id] = 'mapped';
    g.ui.toast('O mapa mental cresceu.');
  }

  randomUnvisited(): string | null {
    const g = this.g;
    const cur = parseInt((g.run?.currentRoom ?? 'r001').slice(1), 10);
    const cands = g.house.roomIds.filter(r => !g.meta.rooms[r] && r !== 'r334' && r !== 'r000' && parseInt(r.slice(1), 10) > cur);
    if (!cands.length) return null;
    return cands[hashStr(String(g.run?.seed) + cur) % cands.length];
  }
}

export function markGlyph(m: MarkId): string {
  return ({ importante: '★', voltar: '↩', chave: '⚷', puzzle: '◈', perigo: '⚠', personagem: '☺', misterio: '?' } as Record<MarkId, string>)[m];
}
export const MARKS: { id: MarkId; label: string }[] = [
  { id: 'importante', label: 'Importante' }, { id: 'voltar', label: 'Voltar depois' }, { id: 'chave', label: 'Chave' },
  { id: 'puzzle', label: 'Enigma' }, { id: 'perigo', label: 'Perigo' }, { id: 'personagem', label: 'Personagem' }, { id: 'misterio', label: 'Mistério' },
];

function lockFamily(v: string): string {
  return ({ iron: 'iron', brass: 'brass', padlock: 'iron', gold: 'gold', bone: 'bone', glass: 'glass', symbol: 'symbol', number: 'numbered', toothless: 'toothless', memory: 'memory', chain: 'iron', bolt: 'iron' } as any)[v] ?? '';
}
function keyFamily(v: string): string {
  if (['iron', 'rusty', 'master', 'plain', 'string', 'bent', 'black', 'grease', 'wire', 'padlock', 'tally', 'damp', 'double', 'grey', 'ribbon_blue', 'tag', 'tiny', 'hotel', 'initial', 'bell', 'music', 'earth', 'copper', 'green', 'toy'].includes(v)) return 'iron';
  if (['brass_small', 'service', 'warm', 'numbered'].includes(v)) return v === 'numbered' ? 'numbered' : 'brass';
  if (v === 'gold') return 'gold';
  if (v === 'bone') return 'bone';
  if (v === 'glass') return 'glass';
  if (['sun', 'chapel', 'clock', 'mended', 'impossible'].includes(v)) return 'symbol';
  if (v === 'toothless') return 'toothless';
  return '';
}
