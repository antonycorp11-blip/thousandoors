// RoomManager — builds the view model of the current room/side from definition + persistent + temporary state.
import type { GameManager } from '../core/GameManager';
import type { PropDef, RoomDefinition, SavedRoomVisit, Side } from '../core/types';
import type { DoorView } from './DoorManager';
import type { NpcPresence } from '../systems/NpcSystem';
import { evalCond } from '../systems/Conditions';

export interface PropView extends PropDef { hiddenNow?: boolean }

export interface RoomView {
  room: RoomDefinition;
  side: Side;
  props: PropView[];
  doors: DoorView[];
  npcs: NpcPresence[];
  key: string;           // cache key for rendering
}

export interface RoomVisitState {
  roomId: string;
  turns: number;
  time: number;
  facing: Side;
  flags: Record<string, any>;
  onceEvents: Set<string>;
  hiddenDoors: Set<string>;
  propOverrides: Record<string, { hidden?: boolean; x?: number; side?: Side; variant?: string; flip?: boolean }>;
  visitIndex: number;
}

export function freshVisit(roomId: string, visitIndex = 0): RoomVisitState {
  return { roomId, turns: 0, time: 0, facing: 'front', flags: {}, onceEvents: new Set(), hiddenDoors: new Set(), propOverrides: {}, visitIndex };
}

export function saveVisit(state: RoomVisitState): SavedRoomVisit {
  return { ...state, onceEvents: [...state.onceEvents], hiddenDoors: [...state.hiddenDoors] };
}

export function restoreVisit(saved: SavedRoomVisit): RoomVisitState {
  return { ...saved, onceEvents: new Set(saved.onceEvents ?? []), hiddenDoors: new Set(saved.hiddenDoors ?? []) };
}

export class RoomManager {
  constructor(private g: GameManager) {}

  view(roomId: string, side: Side): RoomView {
    const g = this.g;
    const room = g.house.rooms[roomId];
    const run = g.run;
    const metaOv = g.meta.propOverrides[roomId] ?? {};
    const runOv = run?.propOverrides[roomId] ?? {};
    const visitOv = g.roomState.roomId === roomId ? g.roomState.propOverrides : {};
    const all: PropView[] = [];
    for (const s of ['front', 'back'] as Side[]) {
      for (const p of room[s].props) {
        const ov = { ...(metaOv[p.id] ?? {}), ...(runOv[p.id] ?? {}), ...(visitOv[p.id] ?? {}) };
        const effSide = ov.side ?? s;
        if (effSide !== side) continue;
        if (ov.hidden) continue;
        if (p.cond && !evalCond(p.cond, g, { salt: roomId + p.id })) continue;
        all.push({ ...p, x: ov.x ?? p.x, variant: ov.variant ?? p.variant, flip: ov.flip !== undefined ? (ov.flip ? !p.flip : p.flip) : p.flip });
      }
    }
    // anchors: sanctuaries offer a place to tie a memory (with the upgrade)
    if (side === 'front' && room.anchorable && g.progress.canAnchor(roomId)) {
      all.push({
        id: '__anchor', kind: 'anchor_nail', x: 1760, y: 620, label: 'Prego na parede',
        examine: 'Um prego antigo, na altura do coração. Parece feito para amarrar alguma coisa.',
        interact: [{ label: 'Fixar esta memória', effects: [{ type: 'anchor', room: roomId }] }],
      });
    }
    const doors = g.doors.visible(roomId, side);
    const npcs = g.npcs.presentIn(roomId).filter(n => n.side === side);
    const key = `${roomId}:${side}:${all.map(p => p.id + (p.variant ?? '') + (p.flip ? 'f' : '') + p.x).join(',')}:${doors.map(d => d.door.id + (d.locked ? 'L' : '') + (d.reverse ? 'R' : '')).join(',')}:${npcs.map(n => n.npc).join(',')}`;
    return { room, side, props: all, doors, npcs, key };
  }
}
