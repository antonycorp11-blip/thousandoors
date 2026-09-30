import type { Condition, Range, DoorDefinition } from '../core/types';
import type { GameManager } from '../core/GameManager';
import { seededChance } from '../core/rng';

export interface CondExtra {
  door?: DoorDefinition;
  doorPos?: 'left' | 'center' | 'right';
  material?: string;
  salt?: string;
}

export function inRange(v: number, r: Range | undefined): boolean {
  if (!r) return true;
  if (r.eq !== undefined && v !== r.eq) return false;
  if (r.gte !== undefined && v < r.gte) return false;
  if (r.lte !== undefined && v > r.lte) return false;
  return true;
}

/** Evaluates a Condition against the live game state. All keys are ANDed. */
export function evalCond(c: Condition | undefined, g: GameManager, extra: CondExtra = {}): boolean {
  if (!c) return true;
  const meta = g.meta, run = g.run, rs = g.roomState;
  const room = run?.currentRoom ?? 'r000';
  for (const k of Object.keys(c) as (keyof Condition)[]) {
    const v: any = (c as any)[k];
    if (v === undefined) continue;
    switch (k) {
      case 'flag': if (!meta.flags[v]) return false; break;
      case 'notFlag': if (meta.flags[v]) return false; break;
      case 'runFlag': if (!run?.flags[v]) return false; break;
      case 'notRunFlag': if (run?.flags[v]) return false; break;
      case 'roomFlag': if (!rs.flags[v]) return false; break;
      case 'notRoomFlag': if (rs.flags[v]) return false; break;
      case 'item': if (!g.inventory.has(v)) return false; break;
      case 'noItem': if (g.inventory.has(v)) return false; break;
      case 'itemTag': if (!g.inventory.hasTag(v)) return false; break;
      case 'keyFor': if (!g.keys.carriedKeyFor(g.house.resolve(v))) return false; break;
      case 'visitsHere': if (!inRange(meta.rooms[room]?.visits ?? 0, v)) return false; break;
      case 'runVisitsHere': if (!inRange(run?.visited[room] ?? 0, v)) return false; break;
      case 'visited': if (!meta.rooms[v]) return false; break;
      case 'notVisited': if (meta.rooms[v]) return false; break;
      case 'runs': if (!inRange(meta.runCount, v)) return false; break;
      case 'deaths': if (!inRange(meta.deaths, v)) return false; break;
      case 'hp': if (!inRange(run?.hp ?? 0, v)) return false; break;
      case 'npcAlive': if (!(g.npcs.state(v)?.alive ?? true)) return false; break;
      case 'npcDead': if (g.npcs.state(v)?.alive ?? true) return false; break;
      case 'npcKnown': if (!g.npcs.state(v)?.known) return false; break;
      case 'npcUnknown': if (g.npcs.state(v)?.known) return false; break;
      case 'npcTrust': if (!inRange(g.npcs.state(v.npc)?.trust ?? 0, v)) return false; break;
      case 'npcHere': if (!g.npcs.isHere(v)) return false; break;
      case 'npcStage': if (!inRange(g.npcs.state(v.npc)?.timelineState ?? 0, v)) return false; break;
      case 'route': if (!inRange(meta.route[v.axis as keyof typeof meta.route] ?? 0, v)) return false; break;
      case 'dominantRoute': if (g.memory.dominantRoute() !== v) return false; break;
      case 'turnsHere': if (!inRange(rs.turns, v)) return false; break;
      case 'turnsTotal': if (!inRange(run?.turnsTotal ?? 0, v)) return false; break;
      case 'timeHere': if (!inRange(rs.time, v)) return false; break;
      case 'facing': if (rs.facing !== v) return false; break;
      case 'firstVisit': if (((meta.rooms[room]?.visits ?? 0) <= 1) !== v) return false; break;
      case 'cameFrom': if (run?.cameFrom !== v) return false; break;
      case 'viaDoor': if (run?.entryDoor !== g.house.resolve(v)) return false; break;
      case 'chance': {
        const salt = (extra.salt ?? JSON.stringify(c)) + '|' + room + '|' + (run?.visited[room] ?? 0);
        if (!seededChance(run?.seed ?? 1, salt, v)) return false; break;
      }
      case 'lore': if (!meta.lore.includes(v)) return false; break;
      case 'noLore': if (meta.lore.includes(v)) return false; break;
      case 'loreCount': if (!inRange(meta.lore.length, v)) return false; break;
      case 'fragmentsTotal': if (!inRange(meta.fragmentsTotal, v)) return false; break;
      case 'collectionCount': if (!inRange(meta.collection.length, v)) return false; break;
      case 'anchorsCount': if (!inRange(meta.anchors.length, v)) return false; break;
      case 'achievementsCount': if (!inRange(meta.achievements.length, v)) return false; break;
      case 'puzzleSolved': if (!meta.puzzlesSolved.includes(v)) return false; break;
      case 'puzzleUnsolved': if (meta.puzzlesSolved.includes(v)) return false; break;
      case 'upgrade': if (!meta.upgrades.includes(v)) return false; break;
      case 'noUpgrade': if (meta.upgrades.includes(v)) return false; break;
      case 'runRooms': if (!inRange(Object.keys(run?.visited ?? {}).length, v)) return false; break;
      case 'doorState': {
        const st = g.doors.state(g.house.resolve(v.door));
        const is = Array.isArray(v.is) ? v.is : [v.is];
        if (!is.includes(st)) return false; break;
      }
      case 'doorUnlocked': if (g.doors.isLocked(g.house.resolve(v))) return false; break;
      case 'doorLocked': if (!g.doors.isLocked(g.house.resolve(v))) return false; break;
      case 'endingSeen': if (!meta.endings.includes(v)) return false; break;
      case 'doorPos': if (extra.doorPos !== v) return false; break;
      case 'doorMaterial': if ((extra.material ?? extra.door?.visual.material) !== v) return false; break;
      case 'since': {
        const t = rs.flags[v.flag];
        if (typeof t !== 'number') return false;
        if (!inRange((g.clockMs() - t) / 1000, v)) return false; break;
      }
      case 'setting': if ((g.settings as any)[v.key] !== v.value) return false; break;
      case 'any': if (!(v as Condition[]).some(sub => evalCond(sub, g, extra))) return false; break;
      case 'all': if (!(v as Condition[]).every(sub => evalCond(sub, g, extra))) return false; break;
      case 'not': if (evalCond(v, g, extra)) return false; break;
      default: break;
    }
  }
  return true;
}
