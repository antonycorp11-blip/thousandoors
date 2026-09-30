// Shared room geometry (world units, 1920×1080 reference). Used by data builders and renderer.
import type { ShellLayout } from '../core/types';

export const W = 1920;
export const H = 1080;
export const FLOOR_Y = 800;          // back-wall / floor junction
export const CEIL_Y = 90;            // back-wall top
export const DOOR_H = 372;           // standard door height on back wall
export const DOOR_W = 176;

export interface ShellGeom { left: number; right: number; top: number; floor: number }

export function shellGeom(layout: ShellLayout = 'box'): ShellGeom {
  switch (layout) {
    case 'corridor': return { left: 640, right: 1280, top: 250, floor: 700 };
    case 'narrow': return { left: 420, right: 1500, top: 120, floor: 790 };
    case 'wide': return { left: 90, right: 1830, top: 80, floor: 810 };
    case 'void': return { left: -400, right: 2320, top: -200, floor: 820 };
    default: return { left: 180, right: 1740, top: CEIL_Y, floor: FLOOR_Y };
  }
}

/** Floor props: depth 0 = against back wall, 1 = at camera. */
export function floorY(d: number, g: ShellGeom = shellGeom()): number { return g.floor + d * (H - g.floor + 60) * 0.85; }
export function depthScale(d: number): number { return 1 + 0.5 * d; }

/** Height (unscaled px) of surfaces that hold small objects. */
export const TOP_HEIGHT: Record<string, number> = {
  table: 150, desk: 158, nightstand: 118, dresser: 172, dresser_small: 128, cabinet: 182, table_long: 146,
  tea_table: 108, side_table: 128, pedestal: 190, stool: 86, piano: 176, counter: 168, altar: 160, sheet_table: 150, shelf: 0,
};

/** y of the top surface of a host prop placed at depth d. */
export function topY(host: string, d: number): number {
  return floorY(d) - (TOP_HEIGHT[host] ?? 150) * depthScale(d);
}

export const DOOR_SLOTS: Record<number, number[]> = {
  1: [960], 2: [700, 1220], 3: [560, 960, 1360], 4: [430, 790, 1150, 1510],
};
