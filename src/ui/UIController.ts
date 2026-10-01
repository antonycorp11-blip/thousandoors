// UIController — the HTML layer over Phaser. Implements UIPort (what the game asks of the interface)
// and SceneInputHandler (what the player does in the room).
import type { GameManager, UIPort, TextOpts, EndingOption } from '../core/GameManager';
import type { SceneInputHandler } from '../scenes/RoomScene';
import type { PropView } from '../world/RoomManager';
import type { DoorView } from '../world/DoorManager';
import { h, svg, ICONS, clamp } from './dom';
import { bus } from '../core/EventBus';
import { LORE } from '../data/lore';
import { ITEMS } from '../data/items';
import { MARKS } from '../systems/MapSystem';
import { DialogueView } from './DialogueView';
import { PuzzleView } from './PuzzleView';
import { JournalView } from './JournalView';
import { MentalMapView } from './MentalMapView';
import { InventoryView } from './InventoryView';
import { PauseView } from './PauseView';
import { iconURL } from './icons';

export class UIController implements UIPort, SceneInputHandler {
  root: HTMLElement;
  private hudTop!: HTMLElement;
  private titleEl!: HTMLElement;
  private subEl!: HTMLElement;
  private heartsEl!: HTMLElement;
  private fragsEl!: HTMLElement;
  private statsEl!: HTMLElement;
  private leadEl!: HTMLElement;
  private journalDot!: HTMLElement;
  private turnBtn!: HTMLElement;
  private narration!: HTMLElement;
  private toasts!: HTMLElement;
  private menu: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private panelEl: HTMLElement | null = null;
  private titleOverrideUntil = 0;
  private ring: HTMLElement | null = null;
  private hudVisible = false;
  modal = 0;

  dialogueView: DialogueView;
  puzzleView: PuzzleView;

  constructor(private g: GameManager, root: HTMLElement) {
    this.root = root;
    this.dialogueView = new DialogueView(g, this);
    this.puzzleView = new PuzzleView(g, this);
    this.buildHud();
    try { if (window.self !== window.top) this.root.classList.add('embedded'); } catch { this.root.classList.add('embedded'); }
    bus.on('hud', () => this.updateHud());
    bus.on('room:enter', () => { this.closeMenu(); this.updateHud(); });
    bus.on('turn', () => this.updateHud());
    bus.on('inventory', () => this.updateHud());
    bus.on('settings', () => this.applySettings());
    bus.on('ui:pressring', (p: any) => this.pressRing(p));
    this.root.addEventListener('pointerdown', (e) => {
      if (this.menu && !this.menu.contains(e.target as Node)) this.closeMenu();
    });
    window.addEventListener('keydown', (e) => this.key(e));
    this.applySettings();
  }

  // ───────────────────────────── HUD ─────────────────────────────
  private buildHud() {
    const icon = (name: keyof typeof ICONS, label: string, fn: () => void) => {
      const b = h('button', { class: 'hud-icon interactive', 'aria-label': label, title: label, onclick: (e: Event) => { e.stopPropagation(); this.g.audio.unlock(); fn(); } });
      b.appendChild(svg(ICONS[name]));
      return b;
    };
    this.titleEl = h('h1');
    this.subEl = h('p');
    this.heartsEl = h('div', { class: 'hearts' });
    this.fragsEl = h('div', { class: 'frags' });
    this.statsEl = h('div', { class: 'hud-stats' }, this.heartsEl, this.fragsEl);
    // Objetivo: etiqueta de uma linha. 1º toque expande o texto; 2º toque abre o diário.
    let leadTimer = 0;
    this.leadEl = h('button', { class: 'hud-lead interactive', title: 'Objetivo', onclick: (e: Event) => {
      e.stopPropagation();
      if (!this.leadEl.classList.contains('open')) {
        this.leadEl.classList.add('open');
        clearTimeout(leadTimer);
        leadTimer = window.setTimeout(() => this.leadEl.classList.remove('open'), 6000);
      } else { this.leadEl.classList.remove('open'); this.panel('journal'); }
    } });
    const journalBtn = icon('journal', 'Diário', () => this.panel('journal'));
    this.journalDot = h('span', { class: 'dot hidden' });
    journalBtn.appendChild(this.journalDot);
    this.hudTop = h('div', { class: 'hud-top' },
      icon('menu', 'Menu', () => this.panel('pause')),
      h('div', { class: 'room-title' }, this.titleEl, this.subEl, h('div', { class: 'hud-meta' }, this.statsEl, this.leadEl)),
      h('div', { class: 'hud-right' }, icon('bag', 'Inventário', () => this.panel('inventory')), journalBtn, icon('map', 'Mapa mental', () => this.panel('map'))),
    );
    this.turnBtn = h('button', { class: 'turn-btn interactive', 'aria-label': 'Virar', onclick: (e: Event) => { e.stopPropagation(); this.g.audio.unlock(); this.closeMenu(); this.g.turn(); } });
    this.turnBtn.appendChild(svg(ICONS.turn));
    this.turnBtn.appendChild(h('span', {}, 'VIRAR'));
    this.narration = h('div', { class: 'narration' });
    this.toasts = h('div', { class: 'toasts' });
    this.root.append(this.hudTop, h('div', { class: 'hud-bottom' }, this.turnBtn), this.narration, this.toasts);
    this.setHudVisible(false);
  }

  setHudVisible(on: boolean) {
    this.hudVisible = on;
    this.hudTop.inert = !on;
    this.hudTop.style.opacity = on ? '1' : '0';
    this.hudTop.style.pointerEvents = on ? '' : 'none';
    const bottom = this.turnBtn.parentElement as HTMLElement;
    bottom.inert = !on;
    bottom.style.display = on ? '' : 'none';
  }

  updateHud() {
    const g = this.g;
    const room = g.currentRoomDef();
    if (room && Date.now() > this.titleOverrideUntil) {
      const num = room.hideNumber || room.number === undefined ? '' : String(room.number).padStart(2, '0') + '. ';
      this.titleEl.textContent = room.id === 'r000' ? 'Sala Zero' : num + room.title;
      this.subEl.textContent = g.roomState.facing === 'back' ? (room.back.desc ?? '') : (room.subtitle ?? '');
    }
    this.heartsEl.innerHTML = '';
    const run = g.run;
    if (run) for (let i = 0; i < run.maxHp; i++) { const s = svg(ICONS.heart); if (i >= run.hp) s.classList.add('empty'); this.heartsEl.appendChild(s); }
    this.fragsEl.innerHTML = '';
    this.fragsEl.append(h('i'), h('span', {}, String(g.meta.fragments)));
    this.fragsEl.title = 'Fragmentos de Memória';
    const lead = g.investigation.active();
    this.leadEl.replaceChildren(h('span', { class: 'lead-tag' }, 'Objetivo'), h('span', { class: 'lead-text' }, lead ? lead.goal : 'Abrir a milésima porta'));
    this.leadEl.title = lead ? `${lead.title} · Abrir investigações` : 'Abrir investigações';
  }

  private applySettings() {
    const s = this.g.settings;
    document.documentElement.dataset.textsize = s.textSize;
    document.documentElement.dataset.contrast = s.highContrast ? 'high' : 'normal';
  }

  private pressRing(p: { x: number; y: number } | null) {
    this.ring?.remove(); this.ring = null;
    if (!p || !p.x) return;
    this.ring = h('div', { class: 'press-ring', style: { left: p.x + 'px', top: p.y + 'px' } });
    document.body.appendChild(this.ring);
  }

  private key(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
    if (e.key === 'Escape') { if (this.menu) this.closeMenu(); else if (this.panelEl) this.closePanel(); else if (!this.modal && this.hudVisible) this.panel('pause'); return; }
    if (!this.hudVisible || this.modal || this.panelEl) return;
    if (e.key === ' ' || e.key.toLowerCase() === 'v') { e.preventDefault(); this.g.turn(); }
    if (e.key.toLowerCase() === 'm') this.panel('map');
    if (e.key.toLowerCase() === 'j') this.panel('journal');
    if (e.key.toLowerCase() === 'i') this.panel('inventory');
  }

  // ───────────────────────────── UIPort ─────────────────────────────
  async text(t: string, o: TextOpts = {}): Promise<void> {
    if (!t) return;
    const line = h('div', { class: `narr-line ${o.style ?? ''}` }, o.speaker ? h('span', { class: 'who' }, o.speaker) : null, t);
    line.addEventListener('pointerdown', (e) => { e.stopPropagation(); dismiss(); });
    this.narration.appendChild(line);
    while (this.narration.children.length > 3) this.narration.firstElementChild?.remove();
    const ms = 2600 + t.length * 55;
    let done = false;
    const dismiss = () => { if (done) return; done = true; line.classList.add('out'); setTimeout(() => line.remove(), 600); };
    setTimeout(dismiss, ms);
  }

  toast(t: string): void {
    if (!t || t === '−') return;
    const el = h('div', { class: 'toast' }, t);
    this.toasts.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .6s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 700); }, 2600);
  }

  fragments(n: number, reason?: string): void {
    if (n <= 0) return;
    const el = h('div', { class: 'toast frag' }, `◆ +${n} ${reason ? '· ' + reason : ''}`);
    this.toasts.appendChild(el);
    this.g.audio.play('fragment');
    setTimeout(() => { el.style.transition = 'opacity .6s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 700); }, 2200);
    this.updateHud();
  }

  achievement(title: string, desc: string): void {
    const el = h('div', { class: 'toast ach' }, title, h('small', {}, desc));
    this.toasts.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .8s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 900); }, 5200);
  }

  journalPing(): void { this.journalDot.classList.remove('hidden'); }

  choice(text: string, options: string[], speaker?: string): Promise<number> {
    return new Promise(res => {
      this.modal++;
      this.root.classList.add('in-dialogue');
      const box = h('div', { class: 'choice interactive' },
        speaker ? h('div', { class: 'who', style: { fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '.15em', color: 'var(--light)', textTransform: 'uppercase' } }, speaker) : null,
        text ? h('div', { class: 'q' }, text) : null,
        ...options.map((o, i) => h('button', { onclick: (e: Event) => { e.stopPropagation(); box.remove(); this.modal--; this.root.classList.remove('in-dialogue'); this.g.audio.play('ui'); res(i); } }, o)));
      this.root.appendChild(box);
    });
  }

  dialogue(id: string, npc?: string): Promise<void> { return this.dialogueView.open(id, npc); }
  puzzle(id: string): Promise<boolean> { return this.puzzleView.open(id); }

  read(loreId: string): Promise<void> {
    const l = LORE.find(x => x.id === loreId);
    if (!l) return Promise.resolve();
    return new Promise(res => {
      this.modal++;
      this.g.audio.play('page');
      const kinds: Record<string, string> = { carta: 'Carta', foto: 'Fotografia', gravacao: 'Gravação', documento: 'Documento', nota: 'Bilhete', livro: 'Livro', desenho: 'Desenho', inscricao: 'Inscrição', memoria: 'Memória' };
      const paper = h('div', { class: `paper ${l.kind === 'foto' ? 'foto' : ''}` }, h('div', { class: 'kind' }, kinds[l.kind] ?? ''), h('h3', {}, l.title),
        l.image ? h('img', { class: `evidence-photo${l.id === 'medalhao' ? ' locket' : ''}`, src: l.image, alt: l.title, loading: 'eager' }) : null,
        h('div', { class: 'photo-caption' }, l.text));
      const close = () => { wrap.remove(); this.modal--; res(); };
      if (l.back) {
        const btn = h('button', { class: 'turnover', onclick: (e: Event) => { e.stopPropagation(); btn.replaceWith(h('div', { class: 'back' }, l.back!)); this.g.audio.play(l.id === 'foto_casa' ? 'sting_soft' : 'page'); } }, l.kind === 'foto' ? 'Virar a fotografia' : 'Ver o verso');
        paper.appendChild(btn);
      }
      const wrap = h('div', { class: 'reader interactive', onclick: (e: Event) => { if (!(e.target as HTMLElement).closest('.turnover')) close(); } }, h('div', {}, paper, h('div', { class: 'hint' }, 'toque para fechar')));
      this.root.appendChild(wrap);
    });
  }

  panel(name: string): void {
    this.closeMenu();
    if (name === 'journal') this.journalDot.classList.add('hidden');
    this.closePanel();
    let view: { el: HTMLElement; destroy?: () => void } | null = null;
    const close = () => this.closePanel();
    switch (name) {
      case 'journal': view = new JournalView(this.g, close); break;
      case 'runs': view = new JournalView(this.g, close, 'runs'); break;
      case 'map': view = new MentalMapView(this.g, close); break;
      case 'inventory': view = new InventoryView(this.g, this, close, 'items'); break;
      case 'keyring': view = new InventoryView(this.g, this, close, 'keys'); break;
      case 'upgrades': view = new PauseView(this.g, this, close, 'upgrades'); break;
      case 'pause': view = new PauseView(this.g, this, close, 'pause'); break;
      case 'settings': view = new PauseView(this.g, this, close, 'settings'); break;
    }
    if (!view) return;
    this.panelEl = view.el;
    (this.panelEl as any).__destroy = view.destroy;
    this.root.appendChild(view.el);
  }

  closePanel() {
    if (!this.panelEl) return;
    (this.panelEl as any).__destroy?.();
    this.panelEl.remove();
    this.panelEl = null;
    this.g.refreshView();
  }

  glitch(text: string, ms: number): void {
    const prev = this.titleEl.textContent;
    this.titleEl.textContent = text; this.titleEl.classList.add('hud-glitch');
    this.titleOverrideUntil = Date.now() + ms;
    setTimeout(() => { this.titleEl.classList.remove('hud-glitch'); this.titleEl.textContent = prev; this.updateHud(); }, ms);
  }
  roomTitleOverride(text: string, ms: number): void {
    const prev = this.titleEl.textContent;
    this.titleEl.textContent = text;
    this.titleOverrideUntil = Date.now() + ms;
    setTimeout(() => { this.titleEl.textContent = prev; this.updateHud(); }, ms);
  }

  death(cause: string, phrase: string): Promise<void> {
    return new Promise(res => {
      this.modal++;
      this.setHudVisible(false);
      const el = h('div', { class: 'cine interactive' }, h('div', { class: 'phrase' }, phrase), h('div', { class: 'small' }, cause ? `— ${cause} —` : ''));
      el.style.animationDuration = '2.4s';
      this.root.appendChild(el);
      let ready = false;
      setTimeout(() => { ready = true; el.appendChild(h('div', { class: 'small', style: { marginTop: '50px', opacity: '.6' } }, 'toque')); }, 2600);
      el.addEventListener('click', () => { if (!ready) return; el.remove(); this.modal--; this.setHudVisible(true); res(); });
    });
  }

  ending(options: EndingOption[], context: string): Promise<string> {
    return new Promise(res => {
      this.modal++;
      this.setHudVisible(false);
      const el = h('div', { class: 'cine interactive' }, h('div', { class: 'context' }, context),
        h('div', { class: 'ending-opts' }, ...options.map(o => h('button', { onclick: () => { el.remove(); this.modal--; res(o.id); } }, o.label))));
      this.root.appendChild(el);
    });
  }

  epilogue(title: string, text: string): Promise<void> {
    return new Promise(res => {
      this.modal++;
      const el = h('div', { class: 'cine interactive' }, h('div', { class: 'epi-title' }, title), h('div', { class: 'epi' }, text), h('div', { class: 'small', style: { marginTop: '30px' } }, 'A Casa ainda está aqui. Toque para voltar à Sala Zero.'));
      this.root.appendChild(el);
      setTimeout(() => el.addEventListener('click', () => { el.remove(); this.modal--; this.setHudVisible(true); res(); }), 1500);
    });
  }

  // ───────────────────────────── menus ─────────────────────────────
  showMenu(title: string, items: { label: string; fn: () => void; dim?: boolean; icon?: string }[], sx: number, sy: number) {
    this.closeMenu();
    const m = h('div', { class: 'menu interactive' }, title ? h('div', { class: 'menu-title' }, title) : null,
      ...items.map(it => h('button', { class: it.dim ? 'dim' : '', onclick: (e: Event) => { e.stopPropagation(); this.closeMenu(); this.g.audio.play('ui'); it.fn(); } },
        it.icon ? h('span', { class: 'key-row' }, h('img', { src: it.icon, alt: '' }), it.label) : it.label)));
    this.root.appendChild(m);
    const r = this.root.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    const x = clamp((sx || r.width / 2) - r.left + 14, 8, r.width - mw - 8);
    const y = clamp((sy || r.height / 2) - r.top - mh / 2, 8, r.height - mh - 8);
    m.style.left = x + 'px'; m.style.top = y + 'px';
    this.menu = m;
    (m.querySelector('button') as HTMLElement | null)?.focus({ preventScroll: true });
  }
  closeMenu() { this.menu?.remove(); this.menu = null; }

  // ───────────────────────────── SceneInputHandler ─────────────────────────────
  private blocked() { return this.modal > 0 || !!this.panelEl || this.g.busy || this.g.dead; }

  propTap(p: PropView, sx: number, sy: number): void {
    if (this.blocked()) return;
    const acts = this.g.propActions(p.id);
    if (!acts.length) { this.g.propExamine(p.id); return; }
    if (acts.length === 1 && !p.examine) { this.g.propAct(p.id, acts[0].idx); return; }
    this.showMenu(p.label ?? '', [...acts.map(a => ({ label: a.label, fn: () => this.g.propAct(p.id, a.idx) })), ...(p.examine ? [{ label: 'Examinar', dim: true, fn: () => this.g.propExamine(p.id) }] : [])], sx, sy);
  }
  propExamine(p: PropView): void { if (this.blocked()) return; this.g.propExamine(p.id); }

  doorTap(v: DoorView, sx: number, sy: number): void {
    if (this.blocked()) return;
    const g = this.g;
    if (g.doors.isSimple(v)) { g.doorAction(v, 'open'); return; }
    const acts = g.doors.actions(v);
    const title = v.latch ? 'Trancada do outro lado' : v.locked ? 'Trancada.' : v.reverse ? 'A porta por onde você veio' : 'Porta';
    const items = acts.map(a => ({
      label: a.label, fn: () => {
        if (a.id === 'use_key') this.keyMenu(v, sx, sy);
        else g.doorAction(v, a.id);
      },
    }));
    if (!v.door.meta) items.push({ label: 'Marcar no mapa…', fn: () => this.markMenu(v, sx, sy) });
    if (v.locked && !v.latch) { this.text('Trancada.'); g.audio.play('key_fail'); }
    this.showMenu(title, items.map((i, idx) => ({ ...i, dim: idx >= acts.length })), sx, sy);
  }

  private keyMenu(v: DoorView, sx: number, sy: number) {
    const g = this.g;
    const keys = g.keys.carried();
    if (!keys.length) { this.text('Você não tem nenhuma chave.'); return; }
    this.showMenu('Qual chave?', keys.map(k => ({ label: g.keys.displayName(k), icon: iconURL(ITEMS[k]?.icon ?? 'key_plain'), fn: () => g.doorAction(v, 'use_key', k) })), sx, sy);
  }

  private markMenu(v: DoorView, sx: number, sy: number) {
    const rec = this.g.meta.doors[v.door.id];
    this.showMenu('Marcar esta porta', MARKS.map(m => ({ label: (rec?.marks?.includes(m.id) ? '✓ ' : '') + m.label, fn: () => { this.g.doorAction(v, 'mark', m.id); this.toast('Marcado no mapa mental.'); } })), sx, sy);
  }

  doorExamine(v: DoorView): void { if (this.blocked()) return; this.g.doorAction(v, 'observe'); }
  npcTap(npc: string): void { if (this.blocked()) return; this.g.talkTo(npc); }
  npcExamine(npc: string): void { if (this.blocked()) return; this.g.observeNpc(npc); }
  backgroundTap(): void { this.closeMenu(); }
}
