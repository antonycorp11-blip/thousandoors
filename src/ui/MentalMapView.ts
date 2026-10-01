// The Mental Map: an investigation board that grows by itself. Drag to pan, wheel/pinch to zoom.
import type { GameManager } from '../core/GameManager';
import type { MapEdge, MapNode } from '../systems/MapSystem';
import { MARKS, markGlyph } from '../systems/MapSystem';
import { CHAR } from '../data/characters';
import { h } from './dom';
import { hashStr } from '../core/rng';

interface N extends MapNode { x: number; y: number; vx: number; vy: number; fixed: boolean }

export class MentalMapView {
  el: HTMLElement;
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodes: N[] = [];
  private edges: MapEdge[] = [];
  private byId = new Map<string, N>();
  private zoom = 1; private ox = 0; private oy = 0;
  private info: HTMLElement;
  private trailEl: HTMLElement;
  private toolsEl: HTMLElement;
  private legendEl: HTMLElement;
  private tabsEl: HTMLElement;
  private mode: 'trail' | 'known' = 'trail';
  private selected: string | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private dragMoved = 0;
  private pinchDist = 0;
  private raf = 0;
  private dpr = Math.min(2, window.devicePixelRatio || 1);
  private ro: ResizeObserver;

  constructor(private g: GameManager, close: () => void) {
    this.cv = h('canvas');
    this.ctx = this.cv.getContext('2d')!;
    this.info = h('div', { class: 'map-info hidden' });
    this.trailEl = h('div', { class: 'map-trail' });
    this.toolsEl = h('div', { class: 'map-tools' },
        h('button', { onclick: () => this.zoomBy(1.25), 'aria-label': 'Aproximar' }, '+'),
        h('button', { onclick: () => this.zoomBy(0.8), 'aria-label': 'Afastar' }, '−'),
        h('button', { onclick: () => this.center(), 'aria-label': 'Centralizar' }, '◎'));
    this.legendEl = h('div', { class: 'map-legend' }, '— porta conhecida · - - instável · → sentido único · 🔒 promessa · ◈ enigma · ⚓ âncora');
    const wrap = h('div', { class: 'map-wrap' }, this.cv, this.info, this.trailEl, this.toolsEl, this.legendEl);
    const known = Object.keys(g.meta.rooms).length;
    this.tabsEl = h('div', { class: 'map-tabs' },
      h('button', { onclick: () => this.setMode('trail') }, 'Meu caminho'),
      h('button', { onclick: () => this.setMode('known') }, 'Portas conhecidas'));
    this.el = h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h2', {}, 'Mapa Mental'), h('span', { class: 'sub' }, `${known} salas lembradas`), h('button', { class: 'close', onclick: close, 'aria-label': 'Fechar' }, '×')), this.tabsEl, wrap);
    this.build();
    this.selected = this.g.run?.currentRoom ?? null;
    this.renderTrail();
    this.setMode(this.g.run ? 'trail' : 'known');
    this.bind();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(wrap);
    requestAnimationFrame(() => { this.resize(); this.center(); });
  }

  destroy = () => { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.saveLayout(); };

  private setMode(mode: 'trail' | 'known') {
    this.mode = mode;
    this.cv.style.display = mode === 'known' ? '' : 'none';
    this.info.style.display = mode === 'known' ? '' : 'none';
    this.toolsEl.style.display = mode === 'known' ? '' : 'none';
    this.legendEl.style.display = mode === 'known' ? '' : 'none';
    this.trailEl.style.display = mode === 'trail' ? '' : 'none';
    [...this.tabsEl.children].forEach((el, i) => el.classList.toggle('on', i === (mode === 'trail' ? 0 : 1)));
    if (mode === 'known') { this.resize(); this.showInfo(); this.center(); }
  }

  private renderTrail() {
    const run = this.g.run;
    this.trailEl.innerHTML = '';
    if (!run) { this.trailEl.appendChild(h('p', {}, 'Seu caminho aparecerá quando você entrar na Casa.')); return; }
    this.trailEl.appendChild(h('p', { class: 'map-trail-intro' }, 'Uma corda pela Casa: cada passo desta exploração, na ordem em que você o deu. Toque numa sala para vê-la no mapa de portas.'));
    const path = run.path.length ? run.path : [run.currentRoom];
    for (let i = 0; i < path.length; i++) {
      const id = path[i];
      const step = i > 0 ? run.trail?.[i - 1] : null;
      const d = step?.to === id ? this.g.house.doors[step.door] : null;
      const via = i === 0 ? 'Início desta exploração' : d ? `pela porta ${d.displayNumber}${step?.reverse ? ' · retorno' : ''}` : 'passagem não registrada';
      const room = this.g.house.rooms[id];
      this.trailEl.appendChild(h('button', { class: `map-trail-step${i === path.length - 1 ? ' current' : ''}`, onclick: () => {
        this.selected = id; this.setMode('known');
      } }, h('span', { class: 'map-trail-index' }, String(i + 1).padStart(2, '0')),
      h('span', {}, h('b', {}, `${this.g.roomLabel(id)} · ${room?.title ?? ''}`), h('small', {}, via))));
    }
    requestAnimationFrame(() => { this.trailEl.scrollTop = this.trailEl.scrollHeight; });
  }

  private build() {
    const { nodes, edges } = this.g.map.graph();
    const layout = this.g.meta.map.layout;
    this.edges = edges;
    this.nodes = nodes.map(n => {
      const saved = layout[n.id];
      return { ...n, x: saved?.x ?? NaN, y: saved?.y ?? NaN, vx: 0, vy: 0, fixed: !!saved };
    });
    this.byId = new Map(this.nodes.map(n => [n.id, n]));
    // place new nodes near a placed neighbour
    for (let pass = 0; pass < 3; pass++) for (const n of this.nodes) {
      if (!isNaN(n.x)) continue;
      const nb = this.edges.map(e => e.from === n.id ? e.to : e.to === n.id ? e.from : null).filter(Boolean).map(id => this.byId.get(id!)).find(m => m && !isNaN(m.x));
      const r = hashStr(n.id);
      if (nb) { n.x = nb.x + ((r % 200) - 100) + (n.kind === 'stub' ? 0 : 60); n.y = nb.y + (((r >> 8) % 200) - 100); }
      else if (pass === 2) { const num = n.number ?? 0; n.x = num * 9 + ((r % 80) - 40); n.y = ((r >> 4) % 400) - 200; }
    }
    this.relax(160);
  }

  private relax(iters: number) {
    const ns = this.nodes;
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
        const a = ns[i], b = ns[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy + 0.01;
        if (d2 > 260 * 260) continue;
        const f = 2200 / d2;
        const d = Math.sqrt(d2); dx /= d; dy /= d;
        a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      }
      for (const e of this.edges) {
        const a = this.byId.get(e.from), b = this.byId.get(e.to);
        if (!a || !b) continue;
        const target = b.kind === 'stub' ? 70 : 130;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - target) * 0.03;
        a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f;
      }
      for (const n of ns) {
        const k = n.fixed ? 0.08 : 1;
        n.x += Math.max(-20, Math.min(20, n.vx)) * k; n.y += Math.max(-20, Math.min(20, n.vy)) * k;
        n.vx *= 0.5; n.vy *= 0.5;
      }
    }
  }

  private saveLayout() {
    const layout = this.g.meta.map.layout;
    for (const n of this.nodes) layout[n.id] = { x: Math.round(n.x), y: Math.round(n.y) };
    this.g.save();
  }

  private resize() {
    const r = this.cv.getBoundingClientRect();
    this.cv.width = r.width * this.dpr; this.cv.height = r.height * this.dpr;
    this.draw();
  }

  private center() {
    const cur = this.nodes.find(n => n.current) ?? this.nodes[0];
    const r = this.cv.getBoundingClientRect();
    if (cur) { this.ox = r.width / 2 - cur.x * this.zoom; this.oy = r.height / 2 - cur.y * this.zoom; }
    this.draw();
  }
  private zoomBy(f: number, cx?: number, cy?: number) {
    const r = this.cv.getBoundingClientRect();
    const px = cx ?? r.width / 2, py = cy ?? r.height / 2;
    const nz = Math.max(0.25, Math.min(3, this.zoom * f));
    this.ox = px - (px - this.ox) * (nz / this.zoom); this.oy = py - (py - this.oy) * (nz / this.zoom);
    this.zoom = nz; this.draw();
  }

  private bind() {
    const cv = this.cv;
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); this.zoomBy(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.dragMoved = 0; if (this.pointers.size === 2) this.pinchDist = this.pdist(); });
    cv.addEventListener('pointermove', e => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      if (this.pointers.size === 1) { this.ox += e.clientX - p.x; this.oy += e.clientY - p.y; this.dragMoved += Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y); }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) { const d = this.pdist(); if (this.pinchDist) { const pts = [...this.pointers.values()]; const r = cv.getBoundingClientRect(); this.zoomBy(d / this.pinchDist, (pts[0].x + pts[1].x) / 2 - r.left, (pts[0].y + pts[1].y) / 2 - r.top); } this.pinchDist = d; this.dragMoved = 99; }
      this.draw();
    });
    const up = (e: PointerEvent) => {
      if (this.pointers.size === 1 && this.dragMoved < 8) this.tap(e.clientX, e.clientY);
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinchDist = 0;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  }
  private pdist() { const p = [...this.pointers.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }

  private tap(cx: number, cy: number) {
    const r = this.cv.getBoundingClientRect();
    const x = (cx - r.left - this.ox) / this.zoom, y = (cy - r.top - this.oy) / this.zoom;
    let best: N | null = null, bd = 40 / this.zoom + 20;
    for (const n of this.nodes) { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n; } }
    this.selected = best?.id ?? null;
    this.showInfo();
    this.draw();
  }

  private showInfo() {
    const id = this.selected;
    if (!id) { this.info.classList.add('hidden'); return; }
    this.info.classList.remove('hidden');
    this.info.innerHTML = '';
    if (id.startsWith('stub:')) {
      const doorId = id.slice(5);
      const d = this.g.house.doors[doorId];
      const rec = this.g.meta.doors[doorId];
      const L = this.g.doors.lock(doorId);
      this.info.append(
        h('h3', {}, '🔒 Porta trancada'),
        h('div', { class: 'sub' }, `${this.g.roomLabel(d.origin)} · porta ${d.displayNumber}`),
        h('div', {}, rec?.lockExamined && L ? L.shortDesc : 'Você não examinou a fechadura.'),
        ...(Object.keys(rec?.triedKeys ?? {}).length ? [h('h4', {}, 'Chaves tentadas'), h('ul', {}, ...Object.entries(rec!.triedKeys!).map(([k, r]) => h('li', {}, `${this.g.keys.displayName(k)} — ${r === 'no_turn' ? 'entrou, mas não girou' : 'não encaixou'}`)))] : []),
        h('h4', {}, 'Marcar'), this.marksRow(rec?.marks ?? [], m => { this.g.map.toggleDoorMark(doorId, m); this.rebuildKeep(); }),
      );
      return;
    }
    const info = this.g.map.roomInfo(id);
    const route = this.g.map.routeTo(id);
    this.info.append(...[
      h('h3', {}, info.title), h('div', { class: 'sub' }, info.subtitle),
      h('div', { class: 'meta' }, `Visitas: ${info.visits}`),
      route?.length ? h('h4', {}, 'Como chegar daqui') : null,
      route?.length ? h('ol', { class: 'map-directions' }, ...route.map(s => h('li', {}, `${this.g.roomLabel(s.from)}: porta ${this.g.house.doors[s.door]?.displayNumber ?? '?'} → ${this.g.roomLabel(s.to)}${s.uncertain ? ' (pode mudar)' : ''}`))) : null,
      route === null && info.visits ? h('div', { class: 'meta' }, 'Não há um caminho de volta confirmado pelas portas conhecidas.') : null,
      info.doors.length ? h('h4', {}, 'Portas conhecidas') : null, info.doors.length ? h('ul', {}, ...info.doors.map(d => h('li', {}, d.text))) : null,
      info.objects.length ? h('h4', {}, 'Objetos notados') : null, info.objects.length ? h('ul', {}, ...info.objects.map(o => h('li', {}, o))) : null,
      info.npcs.length ? h('h4', {}, 'Pessoas vistas aqui') : null, info.npcs.length ? h('ul', {}, ...info.npcs.map(o => h('li', {}, o))) : null,
      info.notes.length ? h('h4', {}, 'Observações') : null, info.notes.length ? h('ul', {}, ...info.notes.map(o => h('li', {}, o))) : null,
      info.mysteries.length ? h('h4', {}, 'Mistérios') : null, info.mysteries.length ? h('ul', {}, ...info.mysteries.map(o => h('li', {}, o))) : null,
      h('h4', {}, 'Marcar'), this.marksRow(info.marks, m => { this.g.map.toggleRoomMark(id, m); this.rebuildKeep(); }),
    ].filter(Boolean) as HTMLElement[]);
  }

  private marksRow(active: string[], fn: (m: any) => void) {
    return h('div', { class: 'marks' }, ...MARKS.map(m => h('button', { class: active.includes(m.id) ? 'on' : '', onclick: () => fn(m.id) }, markGlyph(m.id) + ' ' + m.label)));
  }

  private rebuildKeep() {
    this.saveLayout();
    this.build();
    this.showInfo();
    this.draw();
  }

  private draw() {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.paint());
  }

  private paint() {
    const c = this.ctx, W = this.cv.width, H = this.cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0);
    // board background
    const bg = c.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, Math.max(W, H));
    bg.addColorStop(0, '#2a2420'); bg.addColorStop(1, '#141112');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.setTransform(this.dpr * this.zoom, 0, 0, this.dpr * this.zoom, this.dpr * this.ox, this.dpr * this.oy);
    // edges (threads)
    for (const e of this.edges) {
      const a = this.byId.get(e.from), b = this.byId.get(e.to);
      if (!a || !b) continue;
      c.save();
      c.strokeStyle = e.locked ? (e.highlight ? 'rgba(230,180,105,0.9)' : 'rgba(185,165,138,0.55)') : e.style === 'faint' ? 'rgba(185,165,138,0.18)' : 'rgba(150,40,40,0.75)';
      c.lineWidth = e.highlight ? 2.4 : 1.6;
      if (e.style === 'dashed' || e.style === 'faint') c.setLineDash([6, 6]);
      c.beginPath(); c.moveTo(a.x, a.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + 10;
      c.quadraticCurveTo(mx, my, b.x, b.y); c.stroke();
      if (!e.locked && (e.from === this.selected || e.to === this.selected)) {
        c.setLineDash([]);
        c.font = '11px sans-serif'; c.textAlign = 'center';
        const label = String(this.g.house.doors[e.door]?.displayNumber ?? '?');
        c.fillStyle = 'rgba(10,10,11,.88)'; c.fillRect(mx - 16, my - 11, 32, 20);
        c.fillStyle = '#e6b469'; c.fillText(label, mx, my);
      }
      if (e.oneway) { const ang = Math.atan2(b.y - my, b.x - mx); c.setLineDash([]); c.fillStyle = c.strokeStyle as string; c.beginPath(); c.moveTo(b.x - Math.cos(ang) * 18, b.y - Math.sin(ang) * 18); c.lineTo(b.x - Math.cos(ang - 0.4) * 30, b.y - Math.sin(ang - 0.4) * 30); c.lineTo(b.x - Math.cos(ang + 0.4) * 30, b.y - Math.sin(ang + 0.4) * 30); c.fill(); }
      c.restore();
    }
    // nodes (paper cards pinned to the board)
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const n of this.nodes) {
      const sel = n.id === this.selected;
      if (n.kind === 'stub') {
        c.fillStyle = n.lockHint ? 'rgba(230,180,105,0.25)' : 'rgba(20,18,18,0.8)';
        c.beginPath(); c.arc(n.x, n.y, 15, 0, 7); c.fill();
        c.strokeStyle = sel ? '#e6b469' : 'rgba(185,165,138,0.6)'; c.lineWidth = 1.5; c.stroke();
        c.font = '14px serif'; c.fillStyle = '#e9e1d3'; c.fillText(n.label, n.x, n.y + 1);
        if (n.marks.length) { c.font = '12px sans-serif'; c.fillStyle = '#e6b469'; c.fillText(n.marks.map(m => markGlyph(m as any)).join(''), n.x, n.y - 24); }
        continue;
      }
      c.font = '15px "Cormorant Garamond", Georgia, serif';
      const w = Math.max(70, c.measureText(n.label).width + 22), hh = 30;
      c.save();
      c.translate(n.x, n.y); c.rotate(((hashStr(n.id) % 9) - 4) * 0.006);
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
      c.fillStyle = n.kind === 'visited' ? (n.zero ? '#bfb29a' : '#d6cab0') : n.kind === 'phantom' ? 'rgba(160,60,60,0.35)' : 'rgba(200,190,170,0.35)';
      c.fillRect(-w / 2, -hh / 2, w, hh);
      c.shadowColor = 'transparent';
      if (n.current) { c.strokeStyle = '#e6b469'; c.lineWidth = 3; c.strokeRect(-w / 2 - 3, -hh / 2 - 3, w + 6, hh + 6); }
      if (sel) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.strokeRect(-w / 2 - 1, -hh / 2 - 1, w + 2, hh + 2); }
      c.fillStyle = n.kind === 'visited' ? '#2a221c' : '#e9e1d3';
      c.fillText(n.label, 0, 1);
      // pin
      c.fillStyle = '#8a2a22'; c.beginPath(); c.arc(0, -hh / 2, 4, 0, 7); c.fill();
      // badges
      let bx = w / 2 + 4;
      c.font = '13px sans-serif'; c.textAlign = 'left';
      const badge = (t: string, col: string) => { c.fillStyle = col; c.fillText(t, bx, 0); bx += c.measureText(t).width + 4; };
      if (n.unsolved) badge('◈', '#e6b469');
      if (n.anchor) badge('⚓', '#c9544a');
      if (n.hasLockedStub) badge('🔒', '#b9a58a');
      for (const m of n.marks) badge(markGlyph(m as any), '#e6b469');
      for (const npc of n.npcs.slice(0, 3)) badge(CHAR[npc] && this.g.meta.npcs[npc]?.known ? '☺' : '·', '#a99f91');
      c.textAlign = 'center';
      c.restore();
    }
  }
}
