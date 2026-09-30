import type {
  PropDef, Effect, Interaction, RoomDefinition, RoomCategory, RegionId, Side, WallKind,
  DoorVisual, DoorType, Condition, ShellLayout, DoorMaterial,
} from '../../core/types';

/** Authoring spec for a door leaving an authored room. Converted to DoorDefinition by the generator. */
export interface ExitSpec {
  to: number | null;
  ref?: string;               // symbolic reference, e.g. "r001_c" → "@r001_c"
  x?: number;
  side?: Side;
  wall?: WallKind;
  d?: number;
  m?: DoorMaterial;
  v?: Partial<DoorVisual>;
  type?: DoorType;
  lock?: string;
  hidden?: boolean;
  revealHint?: string;
  oneway?: boolean;
  listen?: string;
  peek?: string;
  observe?: string;
  onOpen?: Effect[];
  talk?: string;
  requirements?: Condition;
  failText?: string;
  alt?: number;               // unstable/observer alternative destination
  important?: boolean;
  secretTo?: number;          // false doors: where the unreal key leads
}

export interface AuthoredRoom extends Omit<RoomDefinition, 'id' | 'region' | 'depth' | 'tags' | 'front' | 'back'> {
  number: number;
  region?: RegionId;
  tags?: string[];
  front?: PropDef[];
  back?: PropDef[];
  frontDesc?: string;
  backDesc?: string;
  exits?: ExitSpec[];
  fixedExits?: boolean;       // generator must not add doors
  minExits?: number;
}

// ── prop helpers ──
export function P(kind: string, x: number, o: Partial<PropDef> = {}): PropDef {
  return { id: o.id ?? kind, kind, x, ...o };
}
export const look = (text: string) => ({ examine: text });
export const act = (label: string, effects: Effect[], o: Partial<Interaction> = {}): Interaction => ({ label, effects, ...o });
export const say = (text: string, style?: 'whisper' | 'loud' | 'system'): Effect => ({ type: 'text', text, style });
export const give = (item: string): Effect => ({ type: 'giveItem', item });
export const loreE = (id: string, read = true): Effect => ({ type: 'lore', id, read });
export const frag = (n: number): Effect => ({ type: 'fragments', n });
export const hideProp = (prop: string, scope: 'run' | 'meta' | 'visit' = 'run'): Effect => ({ type: 'prop', prop, hidden: true, scope });
export const jr = (cat: any, text: string): Effect => ({ type: 'journal', cat, text });
export const route = (axis: any, n = 1): Effect => ({ type: 'route', axis, n });
export const clue = (id: string): Effect => ({ type: 'clue', id });
export const puzzle = (id: string): Effect => ({ type: 'puzzle', id });

/** A pickup: prop disappears once taken (meta scope for permanent memories, run scope otherwise). */
export function pickup(propId: string, item: string, label = 'Pegar', extra: Effect[] = [], permanent = false): Interaction {
  return { label, cond: { noItem: item }, effects: [give(item), hideProp(propId, permanent ? 'meta' : 'run'), ...extra], once: permanent ? 'forever' : 'run' };
}
export function reader(lore: string, label = 'Ler', extra: Effect[] = []): Interaction {
  return { label, effects: [loreE(lore), ...extra] };
}

export function room(a: AuthoredRoom): AuthoredRoom { return a; }

export type { RoomCategory, ShellLayout };

import { topY, floorY } from '../../render/geometry';
/** Object resting on top of a host prop (table, dresser...). */
export function ON(host: string, hostX: number, d: number, kind: string, dx = 0, o: Partial<PropDef> = {}): PropDef {
  return P(kind, hostX + dx, { y: topY(host, d), d, z: 1, ...o });
}
/** Floor prop at depth d. */
export function F(kind: string, x: number, d: number, o: Partial<PropDef> = {}): PropDef {
  return P(kind, x, { d, y: floorY(d), ...o });
}
/** Wall prop, bottom at y. */
export function WL(kind: string, x: number, y: number, o: Partial<PropDef> = {}): PropDef {
  return P(kind, x, { y, ...o });
}
