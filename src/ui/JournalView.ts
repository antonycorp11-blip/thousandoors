// The automatic Journal: facts, not conclusions. Theories group evidence without judging it.
import type { GameManager } from '../core/GameManager';
import type { JournalCat } from '../core/types';
import { ACHIEVEMENTS, LORE } from '../data/lore';
import { h } from './dom';

const TABS: { id: string; label: string }[] = [
  { id: 'pessoas', label: 'Pessoas' }, { id: 'salas', label: 'Salas' }, { id: 'portas', label: 'Portas' }, { id: 'chaves', label: 'Chaves' },
  { id: 'objetos', label: 'Objetos' }, { id: 'simbolos', label: 'Símbolos' }, { id: 'memorias', label: 'Memórias' }, { id: 'teorias', label: 'Teorias' },
  { id: 'eventos', label: 'Eventos' }, { id: 'rumores', label: 'Rumores' }, { id: 'documentos', label: 'Documentos' }, { id: 'runs', label: 'Explorações' }, { id: 'conquistas', label: 'Marcas' },
];

export class JournalView {
  el: HTMLElement;
  private body: HTMLElement;
  private tabsEl: HTMLElement;
  constructor(private g: GameManager, close: () => void, private tab = 'salas') {
    this.body = h('div', { class: 'panel-body' });
    this.tabsEl = h('div', { class: 'tabs' });
    this.el = h('div', { class: 'panel' },
      h('div', { class: 'panel-head' }, h('h2', {}, 'Diário'), h('span', { class: 'sub' }, `${g.meta.journal.length} anotações`), h('button', { class: 'close', onclick: close, 'aria-label': 'Fechar' }, '×')),
      this.tabsEl, this.body);
    this.render();
  }

  private render() {
    this.tabsEl.innerHTML = '';
    for (const t of TABS) this.tabsEl.appendChild(h('button', { class: t.id === this.tab ? 'on' : '', onclick: () => { this.tab = t.id; this.render(); } }, t.label));
    this.body.innerHTML = '';
    const g = this.g, m = g.meta;
    if (this.tab === 'teorias') {
      const ts = g.memory.theories();
      if (!ts.length) this.body.appendChild(h('div', { class: 'empty' }, 'Nada se conecta ainda. Continue abrindo portas.'));
      for (const t of ts) this.body.appendChild(h('div', { class: 'entry theory' }, h('h3', {}, 'TEORIA: ' + t.title), h('div', { class: 'meta' }, 'Evidências:'), h('ul', {}, ...t.evidence.map(e => h('li', {}, e)))));
      const contra = g.journal.byCat('teorias');
      for (const e of contra) this.body.appendChild(h('div', { class: 'entry' }, e.text));
      return;
    }
    if (this.tab === 'runs') {
      if (!m.runs.length) this.body.appendChild(h('div', { class: 'empty' }, 'Nenhuma exploração terminou ainda.'));
      for (const r of [...m.runs].reverse()) {
        this.body.appendChild(h('div', { class: 'entry' },
          h('b', {}, `Exploração ${r.run}`),
          h('div', {}, `Salas visitadas: ${r.roomsVisited} · Novas salas: ${r.newRooms} · Segredos: ${r.secrets} · Portas abertas: ${r.doorsOpened} · Chaves usadas: ${r.keysUsed}`),
          h('div', { class: 'meta' }, `Última sala: ${g.roomLabel(r.lastRoom)} · Causa: ${r.ending ? 'A Porta 1000' : r.cause ?? '???'}${r.anchor ? ' · começou numa âncora' : ''}`)));
      }
      return;
    }
    if (this.tab === 'conquistas') {
      for (const a of ACHIEVEMENTS) {
        const got = m.achievements.includes(a.id);
        if (!got && a.hidden) continue;
        this.body.appendChild(h('div', { class: 'entry', style: { opacity: got ? '1' : '.35' } }, h('b', { style: { fontFamily: 'var(--font-head)', letterSpacing: '.08em' } }, a.title), h('div', {}, got ? a.description : '—')));
      }
      return;
    }
    if (this.tab === 'documentos') {
      const read = LORE.filter(l => m.lore.includes(l.id));
      if (!read.length) this.body.appendChild(h('div', { class: 'empty' }, 'Nenhum documento guardado.'));
      for (const l of read) this.body.appendChild(h('button', { class: 'entry', style: { display: 'block', width: '100%', textAlign: 'left' }, onclick: () => g.ui.read(l.id) }, h('b', {}, l.title), h('div', { class: 'meta' }, l.kind)));
      return;
    }
    const entries = m.journal.filter(e => e.cat === (this.tab as JournalCat)).slice().reverse();
    if (!entries.length) this.body.appendChild(h('div', { class: 'empty' }, 'Nada anotado aqui.'));
    for (const e of entries) this.body.appendChild(h('div', { class: 'entry' }, e.text, h('div', { class: 'meta' }, `exploração ${e.run}${e.room ? ' · ' + g.roomLabel(e.room) : ''}`)));
  }
}
