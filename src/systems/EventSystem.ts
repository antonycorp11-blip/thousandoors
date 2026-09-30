// Event Engine + RoomPerspectiveEvent: condition-driven events on enter/turn/tick/door triggers.
import type { GameManager } from '../core/GameManager';
import type { EventDefinition, EventTrigger } from '../core/types';
import { EVENTS } from '../data/events';
import { evalCond, inRange, type CondExtra } from './Conditions';
import { seededChance } from '../core/rng';

const SCARE_COOLDOWN_MS = 35000;

export class EventSystem {
  private busy = new Set<string>();
  constructor(private g: GameManager) {}

  private matchesRoom(ev: EventDefinition): boolean {
    const room = this.g.currentRoomDef();
    if (!room) return false;
    if (ev.rooms && !ev.rooms.includes(room.id)) return false;
    if (ev.tags && !ev.tags.some(t => room.tags.includes(t))) return false;
    if (ev.categories && !ev.categories.includes(room.category)) return false;
    if (ev.regions && !ev.regions.includes(room.region)) return false;
    if (ev.depth && !inRange(room.depth, ev.depth)) return false;
    if (!ev.rooms && (room.id === 'r000' || room.category === 'final' || room.category === 'memory') && ev.scare) return false;
    return true;
  }

  candidates(trigger: EventTrigger, extra: CondExtra = {}): EventDefinition[] {
    const g = this.g;
    const run = g.run;
    const rs = g.roomState;
    const room = run?.currentRoom ?? 'r000';
    const out: EventDefinition[] = [];
    for (const ev of EVENTS) {
      if (ev.trigger !== trigger) continue;
      if (!this.matchesRoom(ev)) continue;
      if (ev.once === 'forever' && g.meta.onceEvents.includes(ev.id)) continue;
      if (ev.once === 'run' && run?.onceEvents.includes(ev.id)) continue;
      if (ev.once === 'visit' && rs.onceEvents.has(ev.id)) continue;
      if (ev.scare && !ev.rooms) {
        if (run && (run.roomsSinceScare < 2 || g.clockMs() - run.lastScareAt < SCARE_COOLDOWN_MS)) continue;
      }
      if (ev.strong && g.settings.softScares && ev.effects.some(e => e.type === 'jumpscare') && !ev.rooms) { /* soft variant handled in runner */ }
      if (!evalCond(ev.cond, g, { ...extra, salt: ev.id })) continue;
      if (ev.chance !== undefined && !seededChance(run?.seed ?? 1, ev.id + '|' + room + '|' + (run?.visited[room] ?? 0) + '|' + rs.turns, ev.chance)) continue;
      out.push(ev);
    }
    return out.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  async fire(trigger: EventTrigger, extra: CondExtra = {}): Promise<void> {
    const g = this.g;
    if (g.dead) return;
    const list = this.candidates(trigger, extra);
    for (const ev of list) {
      if (this.busy.has(ev.id)) continue;
      // re-check once-rules (a previous event in this batch may have changed things)
      if (ev.once === 'visit' && g.roomState.onceEvents.has(ev.id)) continue;
      this.markOnce(ev);
      if (ev.scare && g.run) { g.run.lastScareAt = g.clockMs(); g.run.roomsSinceScare = 0; }
      this.busy.add(ev.id);
      try {
        if (ev.delay) await new Promise(r => setTimeout(r, ev.delay));
        await g.effects.run(ev.effects, ev.id);
      } finally { this.busy.delete(ev.id); }
      if (trigger === 'tick' || trigger === 'turn') break; // one reactive event at a time keeps horror sparse
    }
  }

  private markOnce(ev: EventDefinition) {
    const g = this.g;
    if (ev.once === 'forever') g.meta.onceEvents.push(ev.id);
    else if (ev.once === 'run') g.run?.onceEvents.push(ev.id);
    else if (ev.once === 'visit') g.roomState.onceEvents.add(ev.id);
  }
}
