// Inventory (limited pockets), Keyring (separate, with memory of each key) and the permanent Collection.
import type { GameManager } from '../core/GameManager';
import type { UIController } from './UIController';
import { ITEMS } from '../data/items';
import { h } from './dom';
import { iconURL } from './icons';

export class InventoryView {
  el: HTMLElement;
  private body: HTMLElement;
  private tabsEl: HTMLElement;
  constructor(private g: GameManager, private ui: UIController, close: () => void, private tab: 'items' | 'keys' | 'collection' = 'items') {
    this.body = h('div', { class: 'panel-body' });
    this.tabsEl = h('div', { class: 'tabs' });
    this.el = h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h2', {}, 'Bolsos'), h('button', { class: 'close', onclick: close, 'aria-label': 'Fechar' }, '×')), this.tabsEl, this.body);
    this.render();
  }

  private render() {
    const g = this.g;
    this.tabsEl.innerHTML = '';
    for (const [id, label] of [['items', 'Objetos'], ['keys', 'Chaveiro'], ['collection', 'Memórias guardadas']] as const)
      this.tabsEl.appendChild(h('button', { class: this.tab === id ? 'on' : '', onclick: () => { this.tab = id; this.render(); } }, label));
    this.body.innerHTML = '';
    if (this.tab === 'items') {
      const items = g.inventory.slotItems();
      this.body.appendChild(h('div', { class: 'slots' }, g.run ? `${items.length} / ${g.inventory.capacity} espaços` : 'Fora da Casa, seus bolsos estão vazios.'));
      if (g.meta.preserved.length && !g.run) this.body.appendChild(h('div', { class: 'slots' }, 'Guardado para a próxima exploração: ' + g.meta.preserved.map(i => ITEMS[i]?.name).join(', ')));
      const grid = h('div', { class: 'grid' });
      for (const id of items) grid.appendChild(this.card(id, false));
      if (!items.length) grid.appendChild(h('div', { class: 'empty' }, 'Nada.'));
      this.body.appendChild(grid);
    } else if (this.tab === 'keys') {
      const carried = g.keys.carried();
      const known = Object.entries(g.meta.keyring).filter(([, r]) => r.found).map(([id]) => id);
      this.body.appendChild(h('div', { class: 'slots' }, `Chaves no chaveiro: ${carried.length}. Chaves já encontradas: ${known.length}.`));
      const grid = h('div', { class: 'grid' });
      for (const id of carried) grid.appendChild(this.card(id, true));
      for (const id of known.filter(k => !carried.includes(k))) grid.appendChild(this.card(id, true, true));
      if (!carried.length && !known.length) grid.appendChild(h('div', { class: 'empty' }, 'Nenhuma chave. Ainda.'));
      this.body.appendChild(grid);
    } else {
      const grid = h('div', { class: 'grid' });
      for (const id of g.meta.collection) grid.appendChild(this.card(id, false));
      if (!g.meta.collection.length) grid.appendChild(h('div', { class: 'empty' }, 'Nada ainda atravessou o esquecimento com você.'));
      this.body.appendChild(grid);
    }
  }

  private card(id: string, isKey: boolean, absent = false): HTMLElement {
    const g = this.g;
    const def = ITEMS[id];
    if (!def) return h('div');
    const name = isKey ? g.keys.displayName(id) : def.name;
    const desc = isKey ? g.keys.displayDescription(id) : def.description;
    const variant = isKey && def.key?.special === 'impossible' ? 'key_' + g.keys.impossibleLook(id).variant : def.icon;
    const kids: (HTMLElement | null)[] = [h('img', { src: iconURL(variant), alt: '' }), h('div', { class: 'name' }, name), h('div', { class: 'desc' }, desc)];
    if (isKey) {
      const rec = g.meta.keyring[id];
      const where = rec?.foundIn ? `Encontrada: ${g.roomLabel(rec.foundIn)}` : '';
      kids.push(h('div', { class: 'notes' }, [where, rec ? `Usada ${rec.timesUsed}×` : '', absent ? (rec?.broken ? 'Quebrada.' : 'Perdida. Precisa ser encontrada de novo.') : '', ...(rec?.notes ?? []).filter(n => n !== 'familiar').slice(-3)].filter(Boolean).join(' · ')));
      if (rec?.notes.includes('familiar') && !absent) kids.push(h('div', { class: 'notes', style: { color: 'var(--light)' } }, 'Parece familiar.'));
    }
    if (!absent && g.inventory.canUse(id) && (g.run || def.permanent)) {
      kids.push(h('button', { class: 'act', onclick: async () => { await g.inventory.use(id); this.render(); this.ui.updateHud(); } }, g.inventory.useLabel(id)));
    } else if (!absent && def.permanent && def.read) {
      kids.push(h('button', { class: 'act', onclick: () => g.ui.read(def.read!) }, 'Ler'));
    }
    if (!absent && g.run && !def.permanent && !isKey) kids.push(h('button', { class: 'act', style: { color: 'var(--text2)', borderColor: 'rgba(185,165,138,.2)' }, onclick: () => { g.inventory.remove(id); this.ui.toast(`Você largou ${def.name}.`); this.render(); } }, 'Largar'));
    return h('div', { class: 'card', style: absent ? { opacity: '.45' } : {} }, ...kids);
  }
}
