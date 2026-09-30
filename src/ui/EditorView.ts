// Simple internal room editor (debug mode, F3). Edits a room in memory with live preview;
// overrides are stored in localStorage and exported as JSON to be pasted into src/data/rooms.
import type { GameManager } from '../core/GameManager';
import type { PropDef, DoorDefinition, EventDefinition, Condition } from '../core/types';
import { h } from './dom';
import { bus } from '../core/EventBus';
import { PROP_KINDS } from '../render/paint/props';
import { THEMES } from '../data/themes';
import { CHARACTERS } from '../data/characters';
import { EVENTS } from '../data/events';
import { floorY } from '../render/geometry';
import { rid } from '../world/HouseGenerator';

const LS = 'atd.editor.overrides';

interface Override { room: string; theme?: string; layout?: string; category?: string; title?: string; subtitle?: string; frontProps?: PropDef[]; backProps?: PropDef[]; doorPatches?: Record<string, Partial<DoorDefinition>>; events?: EventDefinition[]; npcs?: { npc: string; x: number }[] }

export function applyEditorOverrides(g: GameManager) {
  let all: Override[] = [];
  try { all = JSON.parse(localStorage.getItem(LS) ?? '[]'); } catch { all = []; }
  for (const o of all) applyOne(g, o);
}

function applyOne(g: GameManager, o: Override) {
  const r = g.house.rooms[o.room];
  if (!r) return;
  if (o.theme) r.theme = o.theme;
  if (o.layout) r.layout = o.layout as any;
  if (o.category) r.category = o.category as any;
  if (o.title) r.title = o.title;
  if (o.subtitle !== undefined) r.subtitle = o.subtitle;
  if (o.frontProps) r.front.props = o.frontProps;
  if (o.backProps) r.back.props = o.backProps;
  for (const [id, patch] of Object.entries(o.doorPatches ?? {})) {
    const d = g.house.doors[id];
    if (!d) continue;
    const oldTo = d.to;
    Object.assign(d, patch);
    if (patch.to !== undefined && patch.to !== oldTo) {
      if (oldTo) g.house.inDoors[oldTo] = (g.house.inDoors[oldTo] ?? []).filter(x => x !== id);
      if (patch.to) (g.house.inDoors[patch.to] ??= []).push(id);
    }
  }
  for (const ev of o.events ?? []) if (!EVENTS.some(e => e.id === ev.id)) EVENTS.push(ev);
  for (const n of o.npcs ?? []) if (g.run) g.npcs.spawn(n.npc, o.room, 'front', n.x);
}

export class EditorView {
  el: HTMLElement;
  private out: HTMLTextAreaElement;
  private ov: Override = { room: 'r001' };
  constructor(private g: GameManager, root: HTMLElement) {
    this.out = h('textarea') as HTMLTextAreaElement;
    const sel = (opts: string[], val?: string) => h('select', {}, ...opts.map(o => h('option', { value: o, selected: o === val ? true : undefined }, o))) as HTMLSelectElement;
    const inp = (ph: string, w = 80, v = '') => h('input', { placeholder: ph, value: v, style: { width: w + 'px' } }) as HTMLInputElement;
    const themeSel = sel(Object.keys(THEMES)), layoutSel = sel(['box', 'corridor', 'narrow', 'wide', 'void']), catSel = sel(['normal', 'character', 'event', 'puzzle', 'object', 'secret', 'lore', 'transition', 'anomaly', 'echo', 'danger', 'sanctuary', 'impossible', 'memory']);
    const title = inp('título', 160), subtitle = inp('subtítulo', 220);
    const kindSel = sel(PROP_KINDS.sort()), px = inp('x', 60, '960'), pd = inp('d (0-1) ou vazio', 90, '0.2'), py = inp('y parede', 70), pside = sel(['front', 'back']), pexam = inp('texto ao examinar', 220), pact = inp('interação: rótulo|texto', 220);
    const doorSel = h('select') as HTMLSelectElement, doorTo = inp('destino nº', 70), doorMat = sel(['wood_dark', 'wood_light', 'white', 'green', 'blue', 'grey', 'oxblood', 'red', 'metal', 'apartment', 'old', 'black', 'teal']), doorLock = inp('lock id (vazio=nenhum)', 150), doorCond = inp('condição JSON', 200);
    const npcSel = sel(CHARACTERS.map(c => c.id)), npcX = inp('x', 60, '1300');
    const evJson = h('textarea', { style: { width: '100%', height: '80px' }, placeholder: '{"id":"ev_meu","trigger":"turn","cond":{"turnsHere":{"gte":2}},"effects":[{"type":"text","text":"..."}]}' }) as HTMLTextAreaElement;
    const b = (label: string, fn: () => void) => h('button', { onclick: () => { try { fn(); this.preview(); } catch (e: any) { alert(e.message); } } }, label);
    const refreshDoors = () => {
      doorSel.innerHTML = '';
      for (const id of this.g.house.outDoors[this.ov.room] ?? []) { const d = this.g.house.doors[id]; doorSel.appendChild(h('option', { value: id }, `${id} → ${d.to} (${d.side})`)); }
    };
    const load = () => {
      const r = this.g.house.rooms[this.ov.room];
      themeSel.value = r.theme; layoutSel.value = r.layout ?? 'box'; catSel.value = r.category; title.value = r.title; subtitle.value = r.subtitle ?? '';
      refreshDoors();
    };
    const roomIn = inp('sala nº', 60, '1');
    this.el = h('div', { class: 'debug editor interactive hidden', style: { left: 'auto', right: '10px' } },
      h('div', { class: 'row' }, h('b', {}, 'EDITOR DE SALAS'), b('fechar', () => this.toggle())),
      h('div', { class: 'row' }, roomIn, b('editar sala / ir', async () => { this.ov = this.loadOv(rid(parseInt(roomIn.value, 10))); load(); if (!this.g.run) await this.g.startRun(); await this.g.enterRoom(this.ov.room, null); })),
      h('h4', {}, 'Template'),
      h('div', { class: 'row' }, themeSel, layoutSel, catSel),
      h('div', { class: 'row' }, title, subtitle, b('aplicar', () => Object.assign(this.ov, { theme: themeSel.value, layout: layoutSel.value, category: catSel.value, title: title.value, subtitle: subtitle.value }))),
      h('h4', {}, 'Objeto / hotspot'),
      h('div', { class: 'row' }, kindSel, px, pd, py, pside),
      h('div', { class: 'row' }, pexam, pact, b('adicionar', () => {
        const r = this.g.house.rooms[this.ov.room];
        const side = pside.value as 'front' | 'back';
        const d = pd.value === '' ? undefined : parseFloat(pd.value);
        const p: PropDef = { id: kindSel.value + '_' + Date.now() % 100000, kind: kindSel.value, x: parseFloat(px.value), d, y: py.value ? parseFloat(py.value) : d !== undefined ? floorY(d) : 520, examine: pexam.value || undefined };
        if (pact.value.includes('|')) { const [label, text] = pact.value.split('|'); p.interact = [{ label, effects: [{ type: 'text', text }] }]; }
        const list = (side === 'front' ? (this.ov.frontProps ??= r.front.props.slice()) : (this.ov.backProps ??= r.back.props.slice()));
        list.push(p);
      }), b('remover último', () => { const s = pside.value === 'front' ? this.ov.frontProps : this.ov.backProps; s?.pop(); })),
      h('h4', {}, 'Porta'),
      h('div', { class: 'row' }, doorSel, doorTo, doorMat, doorLock, doorCond, b('alterar porta', () => {
        const patch: Partial<DoorDefinition> = { visual: { ...this.g.house.doors[doorSel.value].visual, material: doorMat.value as any } };
        if (doorTo.value) patch.to = rid(parseInt(doorTo.value, 10));
        if (doorLock.value) { patch.lock = doorLock.value; this.g.house.lockByDoor[doorSel.value] = doorLock.value; }
        if (doorCond.value) { patch.requirements = JSON.parse(doorCond.value) as Condition; patch.type = 'conditional'; }
        (this.ov.doorPatches ??= {})[doorSel.value] = { ...(this.ov.doorPatches?.[doorSel.value] ?? {}), ...patch };
      })),
      h('h4', {}, 'Personagem'),
      h('div', { class: 'row' }, npcSel, npcX, b('adicionar NPC', () => { (this.ov.npcs ??= []).push({ npc: npcSel.value, x: parseFloat(npcX.value) }); })),
      h('h4', {}, 'Evento (JSON, com condição)'), evJson,
      h('div', { class: 'row' }, b('criar evento nesta sala', () => { const ev = JSON.parse(evJson.value) as EventDefinition; ev.rooms = [this.ov.room]; (this.ov.events ??= []).push(ev); })),
      h('h4', {}, 'Salvar / exportar'),
      h('div', { class: 'row' }, b('salvar (localStorage)', () => this.persist()), b('exportar JSON', () => { this.out.value = JSON.stringify(this.ov, null, 2); navigator.clipboard?.writeText(this.out.value); }), b('descartar edições', () => { this.drop(); location.reload(); })),
      this.out);
    root.appendChild(this.el);
    bus.on('editor:toggle', () => this.toggle());
    window.addEventListener('keydown', e => { if (e.key === 'F3') { e.preventDefault(); this.toggle(); } });
  }

  toggle() { this.el.classList.toggle('hidden'); }

  private loadOv(room: string): Override {
    try { const all: Override[] = JSON.parse(localStorage.getItem(LS) ?? '[]'); return all.find(o => o.room === room) ?? { room }; } catch { return { room }; }
  }
  private persist() {
    let all: Override[] = [];
    try { all = JSON.parse(localStorage.getItem(LS) ?? '[]'); } catch { all = []; }
    all = all.filter(o => o.room !== this.ov.room); all.push(this.ov);
    localStorage.setItem(LS, JSON.stringify(all));
    this.out.value = 'salvo. ' + all.length + ' sala(s) editada(s).';
  }
  private drop() {
    let all: Override[] = [];
    try { all = JSON.parse(localStorage.getItem(LS) ?? '[]'); } catch { all = []; }
    localStorage.setItem(LS, JSON.stringify(all.filter(o => o.room !== this.ov.room)));
  }
  private preview() {
    applyOne(this.g, this.ov);
    this.g.refreshView();
    (this.g.scene as any)?.refresh?.(true);
    this.out.value = JSON.stringify(this.ov, null, 2);
  }
}
