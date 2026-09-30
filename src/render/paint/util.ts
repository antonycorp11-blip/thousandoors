// Painting helpers: a tiny "hand-painted" toolkit on top of Canvas2D.
import { mulberry32, hashStr } from '../../core/rng';

export type Ctx = CanvasRenderingContext2D;

export function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext('2d')!];
}

export function rng(seed: string | number) { return mulberry32(typeof seed === 'number' ? seed : hashStr(seed)); }

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgb(r: number, g: number, b: number, a = 1) { return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }
/** Lighten (amt>0) or darken (amt<0) a hex colour. */
export function shade(hex: string, amt: number, a = 1): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
  return rgb(f(r), f(g), f(b), a);
}
export function mix(h1: string, h2: string, t: number, a = 1): string {
  const [r1, g1, b1] = hexToRgb(h1), [r2, g2, b2] = hexToRgb(h2);
  return rgb(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t, a);
}

/** Soft blotches: the base of the painted look. */
export function blotches(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, count: number, rMin: number, rMax: number, alpha: number, seed: string) {
  const r = rng(seed);
  const [cr, cg, cb] = hexToRgb(color);
  for (let i = 0; i < count; i++) {
    const cx = x + r() * w, cy = y + r() * h, rad = rMin + r() * (rMax - rMin);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const a = alpha * (0.4 + r() * 0.6);
    g.addColorStop(0, rgb(cr, cg, cb, a));
    g.addColorStop(1, rgb(cr, cg, cb, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
}

/** Short brush strokes along a direction. */
export function strokes(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, count: number, len: number, width: number, alpha: number, seed: string, vertical = false) {
  const r = rng(seed);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    ctx.strokeStyle = shade(color, (r() - 0.5) * 0.25, alpha * (0.4 + r() * 0.6));
    ctx.lineWidth = width * (0.5 + r());
    const sx = x + r() * w, sy = y + r() * h;
    const l = len * (0.5 + r());
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    if (vertical) ctx.quadraticCurveTo(sx + (r() - 0.5) * 4, sy + l / 2, sx + (r() - 0.5) * 3, sy + l);
    else ctx.quadraticCurveTo(sx + l / 2, sy + (r() - 0.5) * 4, sx + l, sy + (r() - 0.5) * 3);
    ctx.stroke();
  }
  ctx.restore();
}

export function grain(ctx: Ctx, w: number, h: number, alpha: number, seed: string) {
  const r = rng(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const n = (r() - 0.5) * 255 * alpha;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A shaded box: face + light edge top/left + dark edge bottom/right. */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, base: string, opts: { edge?: number; grad?: boolean; outline?: boolean } = {}) {
  const e = opts.edge ?? 3;
  if (opts.grad !== false) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, shade(base, 0.08));
    g.addColorStop(1, shade(base, -0.25));
    ctx.fillStyle = g;
  } else ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = shade(base, 0.18, 0.8); ctx.fillRect(x, y, w, e); ctx.fillRect(x, y, e, h);
  ctx.fillStyle = shade(base, -0.45, 0.9); ctx.fillRect(x, y + h - e, w, e); ctx.fillRect(x + w - e, y, e, h);
  if (opts.outline) { ctx.strokeStyle = 'rgba(10,8,8,0.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
}

/** Wood grain lines on a rect. */
export function woodGrain(ctx: Ctx, x: number, y: number, w: number, h: number, base: string, seed: string, vertical = true, density = 1) {
  const r = rng(seed);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const n = Math.floor((vertical ? w : h) / 5 * density);
  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = shade(base, (r() - 0.6) * 0.35, 0.25 + r() * 0.3);
    ctx.lineWidth = 0.6 + r() * 1.4;
    ctx.beginPath();
    if (vertical) {
      const gx = x + r() * w;
      ctx.moveTo(gx, y);
      for (let t = 0; t <= 1; t += 0.1) ctx.lineTo(gx + Math.sin(t * 6 + r() * 3) * 1.5, y + t * h);
    } else {
      const gy = y + r() * h;
      ctx.moveTo(x, gy);
      for (let t = 0; t <= 1; t += 0.1) ctx.lineTo(x + t * w, gy + Math.sin(t * 6 + r() * 3) * 1.5);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); ctx.fill();
}

export function shadowEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, a = 0.45) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.scale(1, ry / rx); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy * rx / ry, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function poly(ctx: Ctx, pts: number[], fill?: string, stroke?: string, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function glowDot(ctx: Ctx, x: number, y: number, r: number, color: string, a = 1) {
  const [cr, cg, cb] = hexToRgb(color);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgb(cr, cg, cb, a)); g.addColorStop(0.35, rgb(cr, cg, cb, a * 0.45)); g.addColorStop(1, rgb(cr, cg, cb, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function outlineStroke(ctx: Ctx, a = 0.5, w = 1.6) { ctx.strokeStyle = `rgba(12,9,9,${a})`; ctx.lineWidth = w; ctx.stroke(); }
