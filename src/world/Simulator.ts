// Headless simulation: random agents walk the House. Detects stuck rooms, crashes and reachability.
import { GameManager } from '../core/GameManager';
import { mulberry32 } from '../core/rng';

export interface SimReport { runs: number; stuck: number; stuckRooms: string[]; reachedFinal: number; maxRoom: number; visited: number; unlocks: number; errors: string[] }

export async function simulate(runs = 10, steps = 400, seed = 7, log: (s: string) => void = () => {}): Promise<SimReport> {
  const g = new GameManager({ headless: true });
  const r = mulberry32(seed);
  const rep: SimReport = { runs, stuck: 0, stuckRooms: [], reachedFinal: 0, maxRoom: 0, visited: 0, unlocks: 0, errors: [] };
  const visited = new Set<string>();
  for (let i = 0; i < runs; i++) {
    try {
      await g.startRun();
      for (let s = 0; s < steps && g.run; s++) {
        const room = g.run.currentRoom;
        visited.add(room);
        rep.maxRoom = Math.max(rep.maxRoom, parseInt(room.slice(1), 10));
        if (room === 'r334') { rep.reachedFinal++; break; }
        for (const side of ['front', 'back'] as const) {
          g.roomState.facing = side;
          for (const p of g.currentView().props) for (const a of g.propActions(p.id)) if (/Pegar|Abrir|Ler|Virar|Olhar|Dizer|Revirar|Empurrar|Levantar/.test(a.label) && r() < 0.7) await g.propAct(p.id, a.idx);
        }
        if (!g.run) break;
        g.roomState.facing = r() < 0.8 ? 'front' : 'back';
        for (const d of g.currentView().doors) if (d.locked && !d.reverse) for (const k of g.keys.carried()) if (g.keys.fit(k, d.door) === 'opens') { await g.doors.tryKey(d, k); rep.unlocks++; break; }
        let open = g.currentView().doors.filter(d => !d.locked && !(d.door.requirements));
        if (!open.length) { g.roomState.facing = g.roomState.facing === 'front' ? 'back' : 'front'; open = g.currentView().doors.filter(d => !d.locked); }
        if (!open.length) { rep.stuck++; rep.stuckRooms.push(room); log('STUCK ' + room); break; }
        const scored = open.map(d => ({ d, to: g.doors.resolveTo(d.door, d.reverse) })).sort((a, b) => parseInt(b.to?.slice(1) ?? '0', 10) - parseInt(a.to?.slice(1) ?? '0', 10));
        await g.openDoor(r() < 0.7 ? scored[0].d : open[Math.floor(r() * open.length)]);
      }
      if (g.run) await g.die('simulação');
    } catch (e: any) { rep.errors.push(String(e?.stack ?? e)); if (g.run) g.run = null; }
  }
  rep.visited = visited.size;
  return rep;
}
