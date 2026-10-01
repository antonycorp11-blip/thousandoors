// The automatic Journal: facts, not conclusions. Theories group evidence without judging it.
import type { GameManager } from '../core/GameManager';
import type { JournalCat } from '../core/types';
import { ACHIEVEMENTS, LORE } from '../data/lore';
import { h } from './dom';

const TABS: { id: string; label: string }[] = [
  { id: 'investigacoes', label: 'Investigações' },
  { id: 'pessoas', label: 'Pessoas' }, { id: 'salas', label: 'Salas' }, { id: 'portas', label: 'Portas' }, { id: 'chaves', label: 'Chaves' },
  { id: 'objetos', label: 'Objetos' }, { id: 'simbolos', label: 'Símbolos' }, { id: 'memorias', label: 'Memórias' }, { id: 'teorias', label: 'Teorias' },
  { id: 'eventos', label: 'Eventos' }, { id: 'rumores', label: 'Rumores' }, { id: 'documentos', label: 'Documentos' }, { id: 'runs', label: 'Explorações' }, { id: 'conquistas', label: 'Marcas' },
];

export class JournalView {
  el: HTMLElement;
  private body: HTMLElement;
  private tabsEl: HTMLElement;
  constructor(private g: GameManager, close: () => void, private tab = 'investigacoes') {
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
    if (this.tab === 'investigacoes') {
      const entries = g.investigation.all();
      for (const { lead, done } of entries) {
        const active = g.investigation.active()?.id === lead.id;
        const targetKnown = lead.target && !!m.rooms[lead.target];
        this.body.appendChild(h('button', {
          class: `entry lead-entry${active ? ' active' : ''}${done ? ' done' : ''}`,
          onclick: () => { if (!done) { g.investigation.select(lead.id); this.render(); } },
        }, h('b', {}, `${done ? '✓ ' : active ? '◆ ' : '◇ '}${lead.title}`),
        h('div', {}, done ? 'Investigação concluída.' : lead.goal),
        !done && targetKnown ? h('div', { class: 'meta' }, `Lugar conhecido: ${g.roomLabel(lead.target!)} · consulte o mapa para voltar.`) : null));
      }
      return;
    }
    if (this.tab === 'teorias') {
      const ts = g.memory.theoryBoard();
      this.body.appendChild(h('div', { class: 'theory-intro' }, h('b', {}, `${ts.filter(t => t.formed).length} teorias formadas · ${ts.filter(t => !t.formed).length} suspeitas`), h('div', {}, 'Cada evidência sustenta uma possibilidade. As lacunas mostram quanto ainda falta descobrir; nenhuma teoria é uma resposta definitiva.')));
      if (!ts.length) this.body.appendChild(h('div', { class: 'empty' }, 'Nenhuma conexão ainda. Examine objetos, documentos e converse com quem encontrar.'));
      for (const t of ts) this.body.appendChild(h('section', { class: `entry theory${t.formed ? ' formed' : ' forming'}` },
        h('div', { class: 'theory-head' }, h('span', { class: 'theory-state' }, t.formed ? 'TEORIA EM ABERTO' : 'SUSPEITA'), h('span', { class: 'theory-count' }, `${t.evidence.length}/${t.total} pistas`)),
        h('h3', {}, t.title),
        h('div', { class: 'theory-meter', role: 'progressbar', 'aria-valuenow': String(t.evidence.length), 'aria-valuemax': String(t.total), 'aria-label': `Pistas de ${t.title}` }, h('span', { style: { width: `${100 * t.evidence.length / t.total}%` } })),
        h('div', { class: 'meta' }, 'O que encontrei'),
        h('ol', { class: 'theory-evidence' }, ...t.evidence.map(e => h('li', {}, e))),
        h('div', { class: 'theory-next' }, t.evidence.length === t.total ? 'Todas as pistas conhecidas foram reunidas. Outras descobertas ainda podem contradizê-las.' : `${t.total - t.evidence.length} ${t.total - t.evidence.length === 1 ? 'pista ainda não encontrada' : 'pistas ainda não encontradas'}. Continue investigando os lugares e pessoas ligados a esta suspeita.`)));
      const contra = g.journal.byCat('teorias');
      if (contra.length) this.body.appendChild(h('h3', { class: 'theory-contradictions' }, 'Contradições'));
      for (const e of contra) this.body.appendChild(h('div', { class: 'entry theory-contradiction' }, e.text));
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
      for (const l of read) this.body.appendChild(h('button', { class: 'entry document-entry', style: { display: 'flex', width: '100%', textAlign: 'left' }, onclick: () => g.ui.read(l.id) },
        l.image ? h('img', { src: l.image, alt: '', loading: 'lazy' }) : null,
        h('span', {}, h('b', {}, l.title), h('div', { class: 'meta' }, l.kind))));
      return;
    }
    const entries = m.journal.filter(e => e.cat === (this.tab as JournalCat)).slice().reverse();
    if (!entries.length) this.body.appendChild(h('div', { class: 'empty' }, 'Nada anotado aqui.'));
    for (const e of entries) this.body.appendChild(h('div', { class: 'entry' }, e.text, h('div', { class: 'meta' }, `exploração ${e.run}${e.room ? ' · ' + g.roomLabel(e.room) : ''}`)));
  }
}
