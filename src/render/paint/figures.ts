// Characters as painted silhouettes with a little light on them. Graphic-novel, not anime.
import type { FigureSpec } from '../../core/types';
import { canvas, shade, ellipse, poly, glowDot, box, type Ctx } from './util';

export interface FigureArt { canvas: HTMLCanvasElement; ax: number; ay: number }

const cache = new Map<string, FigureArt>();

export function paintFigure(spec: FigureSpec, stage = 0, key = ''): FigureArt {
  const ck = key + ':' + stage + ':' + JSON.stringify(spec);
  const hit = cache.get(ck);
  if (hit) return hit;
  const H = 520 * (spec.height ?? 1) * (spec.child ? (stage >= 2 ? 1 : stage === 1 ? 0.82 : 0.62) : 1);
  const Wd = 260;
  const [c, ctx] = canvas(Wd, H + 20);
  const cx = Wd / 2;
  const base = H + 10;
  // floor shadow
  const sg = ctx.createRadialGradient(cx, base, 2, cx, base, 90);
  sg.addColorStop(0, 'rgba(0,0,0,0.6)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.scale(1, 0.18); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, base / 0.18, 90, 0, 7); ctx.fill(); ctx.restore();

  const coat = spec.coat;
  const skin = spec.skin ?? '#bfa38c';
  const hair = spec.hair ?? '#2a211b';
  const b = spec.build ?? 1;
  const u = H / 520;          // unit scale
  const pose = spec.pose;

  if (pose === 'sit' || pose === 'hunch') {
    // chair
    const chairCol = '#4d3527';
    box(ctx, cx - 70 * u, base - 190 * u, 18 * u, 190 * u, shade(chairCol, -0.2));
    box(ctx, cx - 70 * u, base - 110 * u, 150 * u, 14 * u, chairCol);
    ctx.fillStyle = shade(chairCol, -0.3); ctx.fillRect(cx + 66 * u, base - 96 * u, 8 * u, 96 * u); ctx.fillRect(cx - 66 * u, base - 96 * u, 8 * u, 96 * u);
    const hunch = pose === 'hunch' ? 1 : 0;
    // legs
    poly(ctx, [cx - 30 * b * u, base - 118 * u, cx + 58 * u, base - 118 * u, cx + 64 * u, base - 8 * u, cx + 40 * u, base - 8 * u, cx + 36 * u, base - 96 * u, cx - 30 * u, base - 96 * u], shade(coat, -0.35));
    ellipse(ctx, cx + 56 * u, base - 6 * u, 20 * u, 8 * u, '#141213');
    // torso
    const tTop = base - (hunch ? 236 : 290) * u;
    const lean = hunch ? 52 * u : 6 * u;
    poly(ctx, [cx - 44 * b * u + lean, tTop, cx + 34 * b * u + lean, tTop, cx + 40 * b * u, base - 110 * u, cx - 46 * b * u, base - 110 * u], coat);
    rim(ctx, cx - 44 * b * u + lean, tTop, cx - 46 * b * u, base - 110 * u);
    // arms resting on knees
    poly(ctx, [cx + 20 * u + lean, tTop + 20 * u, cx + 40 * u + lean, tTop + 30 * u, cx + 60 * u, base - 118 * u, cx + 42 * u, base - 110 * u], shade(coat, -0.15));
    ellipse(ctx, cx + 56 * u, base - 118 * u, 12 * u, 10 * u, skin);
    head(ctx, spec, cx + lean + 4 * u, tTop - 36 * u, 30 * u, skin, hair, hunch ? 0.4 : 0);
    accessory(ctx, spec, cx + lean, tTop, base, u);
  } else if (pose === 'floor') {
    // sitting on the floor, drawing
    poly(ctx, [cx - 60 * u, base - 10 * u, cx + 70 * u, base - 10 * u, cx + 64 * u, base - 50 * u, cx - 50 * u, base - 56 * u], shade(coat, -0.2));
    const tTop = base - 190 * u;
    poly(ctx, [cx - 34 * u, tTop, cx + 28 * u, tTop, cx + 40 * u, base - 50 * u, cx - 44 * u, base - 50 * u], coat);
    rim(ctx, cx - 34 * u, tTop, cx - 44 * u, base - 50 * u);
    poly(ctx, [cx + 10 * u, tTop + 20 * u, cx + 26 * u, tTop + 26 * u, cx + 70 * u, base - 40 * u, cx + 60 * u, base - 30 * u], shade(coat, -0.1));
    head(ctx, spec, cx + 8 * u, tTop - 34 * u, 30 * u, skin, hair, 0.5);
    // paper and crayon
    ctx.save(); ctx.translate(cx + 70 * u, base - 14 * u); ctx.rotate(0.1); ctx.fillStyle = '#e3dac2'; ctx.fillRect(-26 * u, -8 * u, 60 * u, 16 * u); ctx.restore();
  } else {
    // standing
    const hH = 34 * u;
    const neck = base - 440 * u;
    const hip = base - 230 * u;
    const shoulderW = 52 * b * u;
    const hipW = 40 * b * u;
    // legs
    poly(ctx, [cx - hipW, hip, cx - 4 * u, hip, cx - 8 * u, base - 8 * u, cx - 32 * u, base - 8 * u], shade(coat, -0.4));
    poly(ctx, [cx + 4 * u, hip, cx + hipW, hip, cx + 30 * u, base - 8 * u, cx + 8 * u, base - 8 * u], shade(coat, -0.5));
    ellipse(ctx, cx - 22 * u, base - 6 * u, 18 * u, 7 * u, '#121012');
    ellipse(ctx, cx + 20 * u, base - 6 * u, 18 * u, 7 * u, '#121012');
    // coat / dress
    const hem = spec.dress ? base - 60 * u : base - 160 * u;
    poly(ctx, [cx - shoulderW, neck + 18 * u, cx + shoulderW, neck + 18 * u, cx + (spec.dress ? 70 : 54) * b * u, hem, cx - (spec.dress ? 70 : 54) * b * u, hem], coat);
    rim(ctx, cx - shoulderW, neck + 18 * u, cx - 54 * b * u, hem);
    ctx.fillStyle = shade(coat, -0.35, 0.8); ctx.fillRect(cx - 2 * u, neck + 30 * u, 3 * u, hem - neck - 40 * u);
    // arms
    poly(ctx, [cx - shoulderW, neck + 20 * u, cx - shoulderW + 18 * u, neck + 24 * u, cx - shoulderW + 12 * u, hip + 20 * u, cx - shoulderW - 6 * u, hip + 14 * u], shade(coat, -0.12));
    poly(ctx, [cx + shoulderW - 18 * u, neck + 24 * u, cx + shoulderW, neck + 20 * u, cx + shoulderW + 6 * u, hip + 14 * u, cx + shoulderW - 12 * u, hip + 20 * u], shade(coat, -0.25));
    ellipse(ctx, cx - shoulderW + 4 * u, hip + 24 * u, 10 * u, 12 * u, skin);
    ellipse(ctx, cx + shoulderW - 4 * u, hip + 24 * u, 10 * u, 12 * u, shade(skin, -0.2));
    head(ctx, spec, cx, neck - hH, hH, skin, hair, 0);
    accessory(ctx, spec, cx, neck, base, u);
  }
  const art = { canvas: c, ax: 0.5, ay: (H + 10) / (H + 20) };
  cache.set(ck, art);
  return art;
}

function rim(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  ctx.strokeStyle = 'rgba(230,180,105,0.35)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}

function head(ctx: Ctx, s: FigureSpec, x: number, y: number, r: number, skin: string, hair: string, tilt: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt * 0.4);
  ctx.fillStyle = shade(skin, -0.4); ctx.fillRect(-r * 0.35, r * 0.7, r * 0.7, r * 0.5);
  ellipse(ctx, 0, 0, r * 0.82, r, skin);
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(r * 0.25, 0, r * 0.55, r, 0, -1.5, 1.5); ctx.fill();
  if (!s.faceless) {
    ctx.fillStyle = '#1a1412';
    ctx.fillRect(-r * 0.42, -r * 0.08, r * 0.24, r * 0.1);
    ctx.fillRect(r * 0.14, -r * 0.08, r * 0.24, r * 0.1);
    ctx.fillStyle = 'rgba(40,20,20,0.6)'; ctx.fillRect(-r * 0.18, r * 0.45, r * 0.36, r * 0.07);
    if (s.glasses) { ctx.strokeStyle = '#1a1412'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.03, r * 0.2, 0, 7); ctx.arc(r * 0.26, -r * 0.03, r * 0.2, 0, 7); ctx.stroke(); }
    if (s.beard) { ctx.fillStyle = s.hair ?? '#3a2e24'; ctx.beginPath(); ctx.ellipse(0, r * 0.62, r * 0.6, r * 0.45, 0, 0, Math.PI); ctx.fill(); }
  }
  switch (s.hat) {
    case 'cap': ctx.fillStyle = '#2a2826'; ctx.beginPath(); ctx.ellipse(0, -r * 0.5, r * 0.92, r * 0.55, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-r * 0.1, -r * 0.55, r * 1.2, r * 0.18); break;
    case 'bowler': ctx.fillStyle = '#1c1a18'; ctx.beginPath(); ctx.ellipse(0, -r * 0.6, r * 0.8, r * 0.7, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-r * 1.1, -r * 0.66, r * 2.2, r * 0.14); break;
    case 'veil': ctx.fillStyle = 'rgba(10,10,12,0.9)'; ctx.beginPath(); ctx.ellipse(0, -r * 0.2, r * 1.05, r * 1.2, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-r * 1.05, -r * 0.2, r * 0.4, r * 1.6); ctx.fillRect(r * 0.65, -r * 0.2, r * 0.4, r * 1.6); break;
    case 'nurse': ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(0, -r * 0.4, r * 0.9, r * 0.7, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#e8e4da'; poly(ctx, [-r * 0.8, -r * 0.7, r * 0.8, -r * 0.7, r * 0.6, -r * 1.2, -r * 0.6, -r * 1.2]); ctx.fill(); break;
    case 'bun': ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(0, -r * 0.35, r * 0.9, r * 0.75, 0, Math.PI, 0); ctx.fill(); ellipse(ctx, -r * 0.6, -r * 0.6, r * 0.35, r * 0.35, hair); break;
    case 'hood': ctx.fillStyle = '#141214'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 1.25, 0, 0, 7); ctx.fill(); break;
    default:
      ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(0, -r * 0.35, r * 0.88, r * 0.72, 0, Math.PI, 0); ctx.fill();
      if (s.child || s.hat === 'long' || s.dress) { ctx.fillRect(-r * 0.88, -r * 0.35, r * 0.3, r * 1.2); ctx.fillRect(r * 0.58, -r * 0.35, r * 0.3, r * 1.2); }
  }
  ctx.restore();
}

function accessory(ctx: Ctx, s: FigureSpec, cx: number, neck: number, base: number, u: number) {
  switch (s.accessory) {
    case 'medallion': glowDot(ctx, cx, neck + 70 * u, 20 * u, '#f0d890', 0.7); ellipse(ctx, cx, neck + 70 * u, 9 * u, 11 * u, '#d6b25a'); break;
    case 'lantern': ctx.fillStyle = '#2a2a2a'; ctx.fillRect(cx + 60 * u, base - 260 * u, 22 * u, 34 * u); break;
    case 'backpack': poly(ctx, [cx - 80 * u, neck + 10 * u, cx - 40 * u, neck, cx - 40 * u, neck + 190 * u, cx - 96 * u, neck + 200 * u], '#3a2c20'); for (let i = 0; i < 5; i++) ellipse(ctx, cx - 90 * u + i * 10 * u, neck + 60 * u + i * 26 * u, 6 * u, 9 * u, ['#b8963e', '#8a8d90', '#6a3a2a', '#c9b690', '#5a5a5a'][i]); break;
    case 'maps': ctx.fillStyle = '#cbbd9a'; ctx.save(); ctx.translate(cx + 50 * u, neck + 150 * u); ctx.rotate(-0.4); ctx.fillRect(-10 * u, -60 * u, 20 * u, 120 * u); ctx.fillRect(4 * u, -54 * u, 18 * u, 110 * u); ctx.restore(); break;
    case 'papers': ctx.fillStyle = '#c9b690'; ctx.fillRect(cx - 40 * u, neck + 110 * u, 80 * u, 60 * u); ctx.fillStyle = '#a89468'; ctx.fillRect(cx - 36 * u, neck + 104 * u, 80 * u, 8 * u); break;
    case 'candle': ctx.fillStyle = '#e8dcc0'; ctx.fillRect(cx + 54 * u, neck + 130 * u, 8 * u, 30 * u); glowDot(ctx, cx + 58 * u, neck + 124 * u, 24 * u, '#ffcf7a', 0.9); break;
    case 'cane': ctx.strokeStyle = '#2a1d15'; ctx.lineWidth = 6 * u; ctx.beginPath(); ctx.moveTo(cx - 70 * u, base - 4); ctx.lineTo(cx - 60 * u, base - 200 * u); ctx.stroke(); break;
    case 'camera': break;
    case 'ruler': ctx.fillStyle = '#c9a449'; ctx.save(); ctx.translate(cx + 56 * u, neck + 180 * u); ctx.rotate(0.3); ctx.fillRect(-4 * u, -70 * u, 8 * u, 140 * u); ctx.restore(); break;
    case 'magnifier': glowDot(ctx, cx + 10 * u, neck - 34 * u, 10 * u, '#dfe8e8', 0.8); break;
    case 'keys': for (let i = 0; i < 4; i++) { ctx.strokeStyle = i === 2 ? '#e0d6c0' : '#8a8a8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 30 * u, base - 240 * u); ctx.lineTo(cx + (26 + i * 5) * u, base - 205 * u); ctx.stroke(); } break;
    default: break;
  }
}

/** A huge face/shape filling the view for the rare strong scare (disabled by "reduzir sustos"). */
export function paintCloseFigure(): HTMLCanvasElement {
  const [c, ctx] = canvas(1100, 1300);
  const g = ctx.createRadialGradient(550, 700, 100, 550, 700, 650);
  g.addColorStop(0, '#0d0c0e'); g.addColorStop(1, 'rgba(5,5,6,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1100, 1300);
  ellipse(ctx, 550, 560, 300, 380, '#0a090b');
  ellipse(ctx, 450, 520, 36, 16, 'rgba(220,210,190,0.55)');
  ellipse(ctx, 650, 520, 36, 16, 'rgba(220,210,190,0.55)');
  ellipse(ctx, 450, 520, 8, 8, '#000');
  ellipse(ctx, 650, 520, 8, 8, '#000');
  return c;
}
