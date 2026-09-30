import type { GameManager } from '../core/GameManager';
import type { JournalCat, JournalEntry } from '../core/types';
import { bus } from '../core/EventBus';

/** The automatic journal records facts, never conclusions. */
export class JournalSystem {
  constructor(private g: GameManager) {}

  add(cat: JournalCat, text: string, id?: string): void {
    const m = this.g.meta;
    const key = id ?? cat + ':' + text;
    if (m.journal.some(e => e.id === key)) return;
    const entry: JournalEntry = { id: key, cat, text, room: this.g.run?.currentRoom, run: m.runCount, t: Date.now() };
    m.journal.push(entry);
    bus.emit('journal', entry);
    this.g.ui.journalPing();
  }

  byCat(cat: JournalCat): JournalEntry[] {
    return this.g.meta.journal.filter(e => e.cat === cat);
  }
}
