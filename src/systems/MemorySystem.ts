// Memory Fragments (meta currency), lore, clues, rumors, symbols, hidden route affinity and theories.
import type { GameManager } from '../core/GameManager';
import type { Axis } from '../core/types';
import { AXES } from '../core/types';
import { LORE, RUMORS, THEORIES } from '../data/lore';
import { SYMBOLS, PUZZLES } from '../data/puzzles';
import { evalCond } from './Conditions';
import { bus } from '../core/EventBus';

export class MemorySystem {
  constructor(private g: GameManager) {}

  addFragments(n: number, reason?: string): void {
    if (!n) return;
    const m = this.g.meta;
    m.fragments += n;
    m.fragmentsTotal += n;
    this.g.ui.fragments(n, reason);
    bus.emit('hud');
  }

  addLore(id: string): boolean {
    const m = this.g.meta;
    if (m.lore.includes(id)) return false;
    const l = LORE.find(x => x.id === id);
    if (!l) return false;
    m.lore.push(id);
    this.route(l.axis, 1);
    this.addFragments(l.fragments ?? 1, 'memória');
    const cat = l.kind === 'foto' || l.kind === 'memoria' || l.kind === 'carta' ? 'memorias' : l.kind === 'desenho' || l.kind === 'inscricao' ? 'simbolos' : 'objetos';
    this.g.journal.add(cat as any, `${l.title}: ${summarize(l.text)}`, 'lore_' + id);
    if (l.contradicts?.some(c => m.lore.includes(c))) this.g.journal.add('teorias', `"${l.title}" contradiz algo que eu já tinha encontrado.`, 'contra_' + id);
    this.checkTheories();
    return true;
  }

  addClue(id: string): void {
    const m = this.g.meta;
    if (m.clues.includes(id)) return;
    m.clues.push(id);
    const p = PUZZLES.find(pz => pz.clues.some(c => c.clueId === id));
    const c = p?.clues.find(cc => cc.clueId === id);
    if (c) {
      this.g.journal.add('simbolos', `Pista: ${c.text}`, 'clue_' + id);
      // the mental map pins the clue to the room where it was found — without solving anything
      const room = this.g.run?.currentRoom;
      if (room) (m.map.notes[room] ??= []).includes('Pista: ' + c.text) || m.map.notes[room].push('Pista: ' + c.text);
    }
  }

  addSymbol(id: string): void {
    const m = this.g.meta;
    if (m.symbols.includes(id)) return;
    m.symbols.push(id);
    const s = SYMBOLS[id];
    if (s) this.g.journal.add('simbolos', `${s.glyph} ${s.name}${this.g.meta.upgrades.includes('olhos_simbolo') ? ' — ' + s.desc : ''}`, 'sym_' + id);
  }

  addRumor(id: string): void {
    const m = this.g.meta;
    if (m.rumors.includes(id)) return;
    m.rumors.push(id);
    const r = RUMORS.find(x => x.id === id);
    if (r) this.g.journal.add('rumores', `Rumor (${r.source}): "${r.text}"`, 'rumor_' + id);
  }

  route(axis: Axis, n: number): void {
    this.g.meta.route[axis] = (this.g.meta.route[axis] ?? 0) + n;
  }

  dominantRoute(): Axis | null {
    const r = this.g.meta.route;
    let best: Axis | null = null;
    let bv = 2;
    for (const a of AXES) if (r[a] > bv) { bv = r[a]; best = a; }
    return best;
  }

  theories(): { id: string; title: string; evidence: string[]; total: number }[] {
    return THEORIES.map(t => {
      const ev = t.evidence.filter(e => evalCond(e.cond, this.g)).map(e => e.text);
      return { id: t.id, title: t.title, evidence: ev, total: t.evidence.length, min: t.minEvidence };
    }).filter((t: any) => t.evidence.length >= t.min);
  }

  theoryBoard(): { id: string; title: string; evidence: string[]; total: number; formed: boolean }[] {
    return THEORIES.map(t => {
      const evidence = t.evidence.filter(e => evalCond(e.cond, this.g)).map(e => e.text);
      return { id: t.id, title: t.title, evidence, total: t.evidence.length, formed: evidence.length >= t.minEvidence };
    }).filter(t => t.evidence.length > 0).sort((a, b) => Number(b.formed) - Number(a.formed) || b.evidence.length - a.evidence.length);
  }

  checkTheories(): void {
    const m = this.g.meta;
    const ts = this.theories();
    for (const t of ts) {
      if (!m.theoriesSeen.includes(t.id)) {
        m.theoriesSeen.push(t.id);
        this.g.ui.toast(`Nova teoria no diário: ${t.title}`);
      }
    }
    if (ts.length >= 5) this.g.progress.achievement('ach_teorias');
  }
}

function summarize(t: string): string {
  return t.length > 140 ? t.slice(0, 137).replace(/\s+\S*$/, '') + '…' : t;
}
