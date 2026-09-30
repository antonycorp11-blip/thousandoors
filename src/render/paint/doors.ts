// Modular doors: frame + slab (material, panels, window, damage, peeling, lock hardware, symbol, chain).
// Early doors stay banal on purpose. Strangeness is a layer, not a default.
import type { DoorVisual } from '../../core/types';
import { canvas, shade, woodGrain, rng, roundRect, glowDot, strokes, type Ctx } from './util';
import { DOOR_W, DOOR_H } from '../geometry';
import { SYMBOLS } from '../../data/puzzles';

export const MATERIAL_COLORS: Record<string, { base: string; wood: boolean; paint?: boolean }> = {
  wood_dark: { base: '#4a3226', wood: true }, wood_light: { base: '#8a6a4c', wood: true }, white: { base: '#c9bfae', wood: false, paint: true },
  green: { base: '#3e5145', wood: false, paint: true }, blue: { base: '#445463', wood: false, paint: true }, grey: { base: '#6a6660', wood: false, paint: true },
  oxblood: { base: '#5a2528', wood: false, paint: true }, red: { base: '#8f1f22', wood: false, paint: true }, metal: { base: '#4d5153', wood: false },
  apartment: { base: '#7a5a3e', wood: true }, old: { base: '#6b5d4e', wood: true }, black: { base: '#17161a', wood: false, paint: true },
  teal: { base: '#35585a', wood: false, paint: true }, gold: { base: '#8a6f35', wood: false }, bone: { base: '#cfc4ad', wood: false, paint: true },
  painted: { base: '#3a3433', wood: false, paint: true }, glass: { base: '#5d6a6c', wood: false },
};

export const FRAME = 20;
export const DOOR_CANVAS_W = DOOR_W + FRAME * 2;
export const DOOR_CANVAS_H = DOOR_H + FRAME;

/** Frame canvas (casing + dark opening). */
export function paintFrame(v: DoorVisual, seed: string): HTMLCanvasElement {
  const [c, ctx] = canvas(DOOR_CANVAS_W, DOOR_CANVAS_H + 8);
  const m = MATERIAL_COLORS[v.material] ?? MATERIAL_COLORS.wood_dark;
  const casing = v.material === 'painted' ? 'rgba(0,0,0,0)' : v.material === 'white' || v.material === 'bone' ? '#9d9280' : v.material === 'metal' ? '#3a3c3e' : '#3e2b20';
  if (v.material !== 'painted') {
    // casing
    ctx.fillStyle = casing;
    ctx.fillRect(0, 0, DOOR_CANVAS_W, DOOR_CANVAS_H);
    woodGrain(ctx, 0, 0, DOOR_CANVAS_W, DOOR_CANVAS_H, typeof casing === 'string' && casing.startsWith('#') ? casing : '#4a3226', seed + 'f', true, 0.6);
    ctx.fillStyle = 'rgba(255,230,190,0.12)'; ctx.fillRect(0, 0, DOOR_CANVAS_W, 4); ctx.fillRect(0, 0, 4, DOOR_CANVAS_H);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(DOOR_CANVAS_W - 5, 0, 5, DOOR_CANVAS_H);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, DOOR_CANVAS_W - 2, DOOR_CANVAS_H - 1);
  }
  // opening (visible when the slab swings)
  const og = ctx.createLinearGradient(0, FRAME, 0, DOOR_CANVAS_H);
  og.addColorStop(0, '#050506'); og.addColorStop(1, '#0d0c0e');
  ctx.fillStyle = og; ctx.fillRect(FRAME, FRAME, DOOR_W, DOOR_H);
  // threshold shadow
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(FRAME - 6, DOOR_CANVAS_H, DOOR_W + 12, 8);
  return c;
}

/** Slab canvas (the moving part). Knob drawn separately. */
export function paintSlab(v: DoorVisual, seed: string): HTMLCanvasElement {
  const W = DOOR_W, H = DOOR_H;
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  const m = MATERIAL_COLORS[v.material] ?? MATERIAL_COLORS.wood_dark;
  const base = v.tint ?? m.base;
  if (v.material === 'painted') {
    // a door painted on the wall (secret / false): only a trompe-l'œil outline
    ctx.strokeStyle = 'rgba(20,16,14,0.55)'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, W - 8, H - 4);
    ctx.strokeStyle = 'rgba(210,190,160,0.12)'; ctx.lineWidth = 1.5; ctx.strokeRect(7, 7, W - 14, H - 10);
    panels(ctx, W, H, 4, '#3a3433', 0.35);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(W - 26, H * 0.52, 7, 0, Math.PI * 2); ctx.fill();
    return c;
  }
  // body
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, shade(base, 0.1)); g.addColorStop(0.5, base); g.addColorStop(1, shade(base, -0.22));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (m.wood) woodGrain(ctx, 0, 0, W, H, base, seed + 'g', true, 1.2);
  else strokes(ctx, 0, 0, W, H, base, 60, 60, 5, 0.12, seed + 's', true);
  if (v.material === 'metal') {
    for (let y = 30; y < H; y += 90) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, y, W, 3); for (let x = 12; x < W; x += 36) { ctx.fillStyle = 'rgba(200,200,200,0.25)'; ctx.beginPath(); ctx.arc(x, y + 8, 2.5, 0, 7); ctx.fill(); } }
  } else if (v.material === 'glass') {
    ctx.fillStyle = 'rgba(140,160,160,0.25)'; ctx.fillRect(18, 18, W - 36, H * 0.62);
    ctx.strokeStyle = 'rgba(220,230,230,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, 40); ctx.lineTo(70, 20); ctx.stroke();
  } else {
    panels(ctx, W, H, v.panels ?? 4, base, 1);
  }
  if (v.window && v.material !== 'glass') {
    const wx = W / 2 - 26, wy = 46;
    ctx.fillStyle = shade(base, -0.4); ctx.fillRect(wx - 4, wy - 4, 60, 76);
    const wg = ctx.createLinearGradient(wx, wy, wx + 52, wy + 68);
    wg.addColorStop(0, '#1d2226'); wg.addColorStop(1, '#0b0d0f');
    ctx.fillStyle = wg; ctx.fillRect(wx, wy, 52, 68);
    ctx.strokeStyle = 'rgba(210,220,230,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + 8, wy + 20); ctx.lineTo(wx + 22, wy + 6); ctx.stroke();
    if (v.material === 'apartment') { ctx.fillStyle = '#b89a55'; ctx.beginPath(); ctx.arc(W / 2, 150, 5, 0, 7); ctx.fill(); }
  }
  // peeling paint: patches of bare wood
  if (v.peeling && m.paint) {
    for (let i = 0; i < Math.floor(v.peeling * 14); i++) {
      const px = r() * W, py = r() * H, pw = 2 + r() * 9, ph = 1.5 + r() * 4;
      ctx.fillStyle = shade(base, -0.45, 0.55);
      ctx.beginPath(); ctx.ellipse(px, py, pw, ph, (r() - 0.5) * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(base, 0.3, 0.35);
      ctx.fillRect(px - pw, py - ph - 1, pw * 1.6, 1);
    }
    strokes(ctx, 0, 0, W, H, shade(base, -0.3), Math.floor(v.peeling * 30), 30, 2, 0.35, seed + 'pe', true);
  }
  if (v.scratches) {
    ctx.strokeStyle = shade(base, 0.35, 0.35 * v.scratches); ctx.lineWidth = 1;
    for (let i = 0; i < Math.floor(v.scratches * 20); i++) {
      const sx = W * 0.55 + r() * W * 0.4, sy = H * 0.35 + r() * H * 0.35;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (r() - 0.5) * 12, sy + 18 + r() * 40); ctx.stroke();
    }
  }
  if (v.damage) {
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2;
    for (let i = 0; i < Math.floor(v.damage * 5); i++) { let x = r() * W, y = r() * H; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 24; y += r() * 30; ctx.lineTo(x, y); } ctx.stroke(); }
  }
  if (v.stain) {
    for (let i = 0; i < 9; i++) {
      const sx = W * 0.3 + r() * W * 0.5, sy = H * 0.3 + r() * H * 0.3, rad = 4 + r() * 18;
      ctx.fillStyle = `rgba(${90 + r() * 30},10,12,${0.55 + r() * 0.3})`;
      ctx.beginPath(); ctx.ellipse(sx, sy, rad, rad * (0.6 + r()), r() * 3, 0, 7); ctx.fill();
      ctx.fillRect(sx - 1.5, sy, 3, 20 + r() * 60);
    }
  }
  if (v.symbol) {
    const s = SYMBOLS[v.symbol];
    if (s) { ctx.strokeStyle = 'rgba(20,14,10,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, 100, 14, 0, 7); ctx.stroke(); }
  }
  if (v.numberPlate) {
    roundRect(ctx, W / 2 - 34, 26, 68, 30, 4); ctx.fillStyle = v.numberPlate === '1000' ? '#b39858' : '#d8d0bf'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
    ctx.fillStyle = v.numberPlate === '1000' ? 'rgba(90,70,30,0)' : '#2b2522'; ctx.font = 'bold 20px Georgia'; ctx.textAlign = 'center'; ctx.fillText(v.numberPlate === '1000' ? '' : v.numberPlate, W / 2, 48);
  }
  // lock hardware (subtle — you notice it by looking)
  paintLock(ctx, v, W, H);
  if (v.chain) {
    ctx.strokeStyle = '#6d6a62'; ctx.lineWidth = 5;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(W * 0.2 + i * 16, H * 0.5 + Math.sin(i / 2) * 6, 8, 5, 0.3, 0, 7); ctx.stroke(); }
  }
  // edge shading & outline
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(W - 4, 0, 4, H);
  ctx.fillStyle = 'rgba(255,235,200,0.08)'; ctx.fillRect(0, 0, 3, H);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
  return c;
}

function panels(ctx: Ctx, W: number, H: number, n: number, base: string, a: number) {
  const rects: [number, number, number, number][] = [];
  const mx = 20, gap = 16;
  if (n === 2) { rects.push([mx, 24, W - mx * 2, H * 0.42], [mx, 24 + H * 0.42 + gap + 20, W - mx * 2, H * 0.44 - 24]); }
  else if (n === 4) { const pw = (W - mx * 2 - gap) / 2; rects.push([mx, 24, pw, H * 0.4], [mx + pw + gap, 24, pw, H * 0.4], [mx, H * 0.5, pw, H * 0.44], [mx + pw + gap, H * 0.5, pw, H * 0.44]); }
  else if (n === 6) { const pw = (W - mx * 2 - gap) / 2; const ph = (H - 60 - gap * 2) / 3; for (let i = 0; i < 3; i++) rects.push([mx, 24 + i * (ph + gap), pw, ph], [mx + pw + gap, 24 + i * (ph + gap), pw, ph]); }
  for (const [x, y, w, h] of rects) {
    ctx.fillStyle = shade(base, -0.12, a); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = shade(base, -0.5, 0.8 * a); ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y, 3, h);
    ctx.fillStyle = shade(base, 0.25, 0.5 * a); ctx.fillRect(x, y + h - 3, w, 3); ctx.fillRect(x + w - 3, y, 3, h);
    ctx.fillStyle = shade(base, 0.08, 0.35 * a); ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
  }
}

function paintLock(ctx: Ctx, v: DoorVisual, W: number, H: number) {
  const kx = W - 28, ky = H * 0.52;
  const lock = v.lock ?? 'none';
  // escutcheon under the knob (always, keyhole plate)
  const plate = (color: string, w: number, h: number) => { roundRect(ctx, kx - w / 2, ky + 14, w, h, 3); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke(); };
  const keyhole = (y: number, color = '#070606') => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(kx, y, 3.2, 0, 7); ctx.fill(); ctx.fillRect(kx - 1.6, y, 3.2, 8); };
  switch (lock) {
    case 'none': plate('rgba(40,30,20,0.5)', 12, 26); keyhole(ky + 24); break;
    case 'iron': plate('#2a2a2c', 20, 46); keyhole(ky + 32); ctx.fillStyle = '#3a3a3c'; ctx.fillRect(kx - 14, ky + 64, 28, 6); break;
    case 'brass': plate('#9a7a3e', 14, 34); keyhole(ky + 26); ctx.fillStyle = 'rgba(255,230,160,0.4)'; ctx.fillRect(kx - 6, ky + 16, 3, 28); break;
    case 'gold': plate('#c9a449', 18, 40); keyhole(ky + 30); glowDot(ctx, kx - 4, ky + 20, 8, '#fff0c0', 0.5); break;
    case 'bone': plate('#ddd3bd', 18, 40); keyhole(ky + 30, '#3a2f28'); break;
    case 'glass': plate('rgba(190,210,215,0.45)', 18, 40); keyhole(ky + 30, 'rgba(20,30,34,0.8)'); break;
    case 'padlock': ctx.fillStyle = '#2d2d2f'; ctx.fillRect(kx - 22, ky + 8, 30, 8); ctx.strokeStyle = '#555'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(kx - 6, ky + 30, 9, Math.PI, 0); ctx.stroke(); roundRect(ctx, kx - 18, ky + 30, 24, 26, 4); ctx.fillStyle = '#6a6b6d'; ctx.fill(); keyhole(ky + 40); break;
    case 'bolt': ctx.fillStyle = '#3a3a3c'; ctx.fillRect(kx - 40, ky - 60, 50, 12); break;
    case 'symbol': plate('#3d3a36', 22, 46); ctx.strokeStyle = 'rgba(210,190,140,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(kx, ky + 34, 9, 0, 7); ctx.stroke(); keyhole(ky + 31); break;
    case 'number': roundRect(ctx, kx - 16, ky + 12, 32, 50, 3); ctx.fillStyle = '#dcd5c4'; ctx.fill(); ctx.fillStyle = '#233'; ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'center'; ctx.fillText('17', kx, ky + 30); keyhole(ky + 42); break;
    case 'toothless': ctx.fillStyle = '#080707'; ctx.fillRect(kx - 1, ky + 14, 2, 34); break;
    case 'memory': roundRect(ctx, W / 2 - 48, H * 0.3, 96, 26, 3); ctx.fillStyle = '#a58a4f'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke(); break;
    case 'chain': break;
  }
}

/** Knob as its own small texture (so it can rotate before opening). */
export function paintKnob(v: DoorVisual): HTMLCanvasElement {
  const [c, ctx] = canvas(28, 28);
  if (v.handle === 'none' || v.material === 'painted') return c;
  const brass = v.material === 'metal' ? '#8a8d90' : v.material === 'gold' ? '#d6b25a' : '#a88845';
  const g = ctx.createRadialGradient(10, 10, 1, 14, 14, 13);
  g.addColorStop(0, '#fff2cc'); g.addColorStop(0.3, brass); g.addColorStop(1, shade(brass, -0.6));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(14, 14, 11, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(13, 3, 2, 22);
  return c;
}
