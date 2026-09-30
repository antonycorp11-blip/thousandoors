// Room shell: ceiling, back wall, side walls, floor. Painted once per room/side into a texture.
import type { ShellLayout } from '../../core/types';
import type { Theme } from '../../data/themes';
import { shellGeom, type ShellGeom } from '../geometry';
import { canvas, shade, blotches, strokes, grain, rng, mix, poly, type Ctx } from './util';

export const SHELL_X0 = -420, SHELL_Y0 = -200, SHELL_W = 2760, SHELL_H = 1480;
export const SHELL_SCALE = 0.6;

export interface ShellOpts { theme: Theme; layout: ShellLayout; seed: string; stains: number; mirror?: boolean; back?: boolean; rain?: boolean; fog?: boolean }

export function paintShell(o: ShellOpts): HTMLCanvasElement {
  const S = SHELL_SCALE;
  const [c, ctx] = canvas(SHELL_W * S, SHELL_H * S);
  ctx.scale(S, S);
  ctx.translate(-SHELL_X0, -SHELL_Y0);
  const t = o.theme;
  const g = shellGeom(o.layout);
  const r = rng(o.seed);
  const VP = { x: 960, y: (g.top + g.floor) / 2 + 40 };
  const X0 = SHELL_X0, X1 = SHELL_X0 + SHELL_W, Y0 = SHELL_Y0, Y1 = SHELL_Y0 + SHELL_H;
  const ext = (cx: number, cy: number, tx: number | null, ty: number | null) => {
    const dx = cx - VP.x, dy = cy - VP.y;
    const k = tx !== null ? (tx - VP.x) / dx : (ty! - VP.y) / dy;
    return [VP.x + dx * k, VP.y + dy * k];
  };

  // background (void)
  ctx.fillStyle = '#0b0b0d';
  ctx.fillRect(X0, Y0, SHELL_W, SHELL_H);
  if (t.floor === 'void') {
    const gr = ctx.createRadialGradient(960, 700, 50, 960, 700, 1400);
    gr.addColorStop(0, '#16151a'); gr.addColorStop(1, '#050506');
    ctx.fillStyle = gr; ctx.fillRect(X0, Y0, SHELL_W, SHELL_H);
    blotches(ctx, X0, Y0, SHELL_W, SHELL_H, '#1c1b22', 40, 80, 300, 0.4, o.seed + 'v');
    // a faint floor plane
    const fg = ctx.createLinearGradient(0, 820, 0, 1300);
    fg.addColorStop(0, 'rgba(40,36,40,0)'); fg.addColorStop(1, 'rgba(40,36,40,0.5)');
    ctx.fillStyle = fg; ctx.fillRect(X0, 820, SHELL_W, 600);
    return c;
  }

  const [lcx, lcy] = ext(g.left, g.top, X0, null);
  const [rcx, rcy] = ext(g.right, g.top, X1, null);
  const [lfx, lfy] = ext(g.left, g.floor, X0, null);
  const [rfx, rfy] = ext(g.right, g.floor, X1, null);

  // ── ceiling
  poly(ctx, [g.left, g.top, g.right, g.top, rcx, rcy, rcx, Y0 - 400, lcx, Y0 - 400, lcx, lcy], t.ceiling);
  const cg = ctx.createLinearGradient(0, Y0, 0, g.top);
  cg.addColorStop(0, 'rgba(0,0,0,0.5)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg; ctx.fillRect(X0, Y0, SHELL_W, g.top - Y0);
  blotches(ctx, X0, Y0, SHELL_W, g.top - Y0 + 40, shade(t.ceiling, -0.4).replace('rgba', 'rgba'), 0, 0, 0, 0, 'x');

  // ── side walls
  const sideL = shade(t.wall, -0.28);
  const sideR = shade(t.wall, -0.35);
  poly(ctx, [g.left, g.top, lcx, lcy, lfx, lfy, g.left, g.floor], sideL);
  poly(ctx, [g.right, g.top, rcx, rcy, rfx, rfy, g.right, g.floor], sideR);
  // side-wall shading toward camera
  for (const [pts, dir] of [[[g.left, g.top, lcx, lcy, lfx, lfy, g.left, g.floor], -1], [[g.right, g.top, rcx, rcy, rfx, rfy, g.right, g.floor], 1]] as [number[], number][]) {
    ctx.save(); poly(ctx, pts); ctx.clip();
    const sg = ctx.createLinearGradient(dir < 0 ? g.left : g.right, 0, dir < 0 ? X0 : X1, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0.05)'); sg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = sg; ctx.fillRect(X0, Y0, SHELL_W, SHELL_H);
    paintWallTexture(ctx, t, X0, Y0, SHELL_W, SHELL_H, o.seed + (dir < 0 ? 'L' : 'R'), 0.35);
    ctx.restore();
  }

  // ── back wall
  ctx.save();
  ctx.beginPath(); ctx.rect(g.left, g.top, g.right - g.left, g.floor - g.top); ctx.clip();
  ctx.fillStyle = t.wall; ctx.fillRect(g.left, g.top, g.right - g.left, g.floor - g.top);
  paintWallTexture(ctx, t, g.left, g.top, g.right - g.left, g.floor - g.top, o.seed + 'B', 1);
  if (t.wainscot) {
    const wy = g.floor - (g.floor - g.top) * 0.32;
    ctx.fillStyle = shade(t.wall2, -0.2); ctx.fillRect(g.left, wy, g.right - g.left, g.floor - wy);
    ctx.fillStyle = shade(t.wall2, 0.15, 0.6); ctx.fillRect(g.left, wy - 6, g.right - g.left, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(g.left, wy, g.right - g.left, 3);
    for (let x = g.left + 40; x < g.right - 60; x += 150) {
      ctx.strokeStyle = shade(t.wall2, -0.45, 0.6); ctx.lineWidth = 2; ctx.strokeRect(x, wy + 22, 120, g.floor - wy - 60);
      ctx.strokeStyle = shade(t.wall2, 0.2, 0.25); ctx.lineWidth = 1; ctx.strokeRect(x + 2, wy + 24, 120, g.floor - wy - 60);
    }
  }
  // grime: water stains running down, darker corners, blotches
  const stains = o.stains;
  blotches(ctx, g.left, g.top, g.right - g.left, g.floor - g.top, '#000000', Math.floor(30 * stains), 40, 180, 0.22, o.seed + 'grime');
  blotches(ctx, g.left, g.top, g.right - g.left, (g.floor - g.top) * 0.4, '#1a140f', Math.floor(10 * stains), 30, 120, 0.25, o.seed + 'top');
  for (let i = 0; i < Math.floor(8 * stains); i++) {
    const sx = g.left + r() * (g.right - g.left);
    const len = 60 + r() * 260;
    const sg = ctx.createLinearGradient(0, g.top, 0, g.top + len);
    sg.addColorStop(0, 'rgba(30,22,14,0.35)'); sg.addColorStop(1, 'rgba(30,22,14,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx, g.top, 8 + r() * 22, len);
  }
  // hairline cracks
  ctx.strokeStyle = 'rgba(10,8,6,0.35)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < Math.floor(3 * stains); i++) {
    let cx = g.left + r() * (g.right - g.left), cy = g.top + r() * (g.floor - g.top) * 0.6;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    for (let k = 0; k < 8; k++) { cx += (r() - 0.5) * 30; cy += r() * 26; ctx.lineTo(cx, cy); }
    ctx.stroke();
  }
  // corner occlusion
  const og = ctx.createLinearGradient(g.left, 0, g.left + 160, 0);
  og.addColorStop(0, 'rgba(0,0,0,0.45)'); og.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = og; ctx.fillRect(g.left, g.top, 160, g.floor - g.top);
  const og2 = ctx.createLinearGradient(g.right, 0, g.right - 160, 0);
  og2.addColorStop(0, 'rgba(0,0,0,0.45)'); og2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = og2; ctx.fillRect(g.right - 160, g.top, 160, g.floor - g.top);
  const tg = ctx.createLinearGradient(0, g.top, 0, g.top + 120);
  tg.addColorStop(0, 'rgba(0,0,0,0.5)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tg; ctx.fillRect(g.left, g.top, g.right - g.left, 120);
  ctx.restore();

  // crown molding + baseboard
  ctx.fillStyle = shade(t.wall, -0.5); ctx.fillRect(g.left, g.top, g.right - g.left, 8);
  ctx.fillStyle = shade(t.wall, 0.12, 0.5); ctx.fillRect(g.left, g.top + 8, g.right - g.left, 3);
  if (t.pattern !== 'stone' && t.pattern !== 'brick') {
    ctx.fillStyle = '#23180f'; ctx.fillRect(g.left, g.floor - 26, g.right - g.left, 26);
    ctx.fillStyle = 'rgba(200,160,110,0.18)'; ctx.fillRect(g.left, g.floor - 26, g.right - g.left, 3);
  }
  // corner lines
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(g.left, g.top); ctx.lineTo(g.left, g.floor); ctx.moveTo(g.right, g.top); ctx.lineTo(g.right, g.floor); ctx.stroke();

  // ── floor
  ctx.save();
  poly(ctx, [g.left, g.floor, g.right, g.floor, rfx, rfy, X1 + 400, Y1 + 400, X0 - 400, Y1 + 400, lfx, lfy]);
  ctx.clip();
  paintFloor(ctx, t, g, VP, o.seed);
  // floor shading: darker far, lighter mid, dark near edge
  const fg = ctx.createLinearGradient(0, g.floor, 0, Y1);
  fg.addColorStop(0, 'rgba(0,0,0,0.45)'); fg.addColorStop(0.25, 'rgba(0,0,0,0.1)'); fg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = fg; ctx.fillRect(X0, g.floor, SHELL_W, Y1 - g.floor);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(lfx, lfy); ctx.lineTo(g.left, g.floor); ctx.lineTo(g.right, g.floor); ctx.lineTo(rfx, rfy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lcx, lcy); ctx.lineTo(g.left, g.top); ctx.lineTo(g.right, g.top); ctx.lineTo(rcx, rcy); ctx.stroke();

  if (o.fog) {
    const fo = ctx.createLinearGradient(0, g.floor - 200, 0, g.floor + 200);
    fo.addColorStop(0, 'rgba(160,160,170,0)'); fo.addColorStop(0.5, 'rgba(160,160,170,0.18)'); fo.addColorStop(1, 'rgba(160,160,170,0.05)');
    ctx.fillStyle = fo; ctx.fillRect(X0, g.floor - 200, SHELL_W, 400);
  }
  grain(ctx, c.width, c.height, 0.05, o.seed + 'g');
  return c;
}

function paintWallTexture(ctx: Ctx, t: Theme, x: number, y: number, w: number, h: number, seed: string, strength: number) {
  const r = rng(seed);
  blotches(ctx, x, y, w, h, t.wall2, Math.floor(w * h / 18000), 60, 220, 0.35 * strength, seed + 'b');
  blotches(ctx, x, y, w, h, '#000000', Math.floor(w * h / 40000), 50, 160, 0.18 * strength, seed + 'd');
  switch (t.pattern) {
    case 'stripes':
      for (let sx = x; sx < x + w; sx += 46) {
        ctx.fillStyle = shade(t.wall2, 0.05, 0.28 * strength); ctx.fillRect(sx, y, 18, h);
        ctx.fillStyle = shade(t.wall, -0.3, 0.2 * strength); ctx.fillRect(sx + 18, y, 2, h);
      }
      break;
    case 'damask':
      for (let sy = y + 20; sy < y + h; sy += 90) for (let sx = x + ((sy / 90) % 2 ? 45 : 0); sx < x + w; sx += 90) {
        ctx.fillStyle = shade(t.wall2, 0.12, 0.22 * strength);
        ctx.beginPath(); ctx.ellipse(sx, sy, 12, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(sx, sy, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'panels':
      for (let sx = x + 30; sx < x + w - 40; sx += 180) {
        ctx.strokeStyle = shade(t.wall2, -0.4, 0.5 * strength); ctx.lineWidth = 3; ctx.strokeRect(sx, y + 60, 150, h * 0.5);
        ctx.strokeStyle = shade(t.wall2, 0.2, 0.2 * strength); ctx.lineWidth = 1.5; ctx.strokeRect(sx + 3, y + 63, 150, h * 0.5);
      }
      break;
    case 'tiles':
      ctx.strokeStyle = shade(t.wall2, -0.4, 0.45 * strength); ctx.lineWidth = 2;
      for (let sy = y + h * 0.35; sy < y + h; sy += 40) { ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + w, sy); ctx.stroke(); }
      for (let sx = x; sx < x + w; sx += 40) { ctx.beginPath(); ctx.moveTo(sx, y + h * 0.35); ctx.lineTo(sx, y + h); ctx.stroke(); }
      ctx.fillStyle = shade(t.wall2, 0.1, 0.25 * strength); ctx.fillRect(x, y + h * 0.35, w, h * 0.65);
      break;
    case 'stone':
      for (let sy = y; sy < y + h; sy += 60) for (let sx = x - (sy / 60 % 2) * 60; sx < x + w; sx += 120) {
        ctx.fillStyle = shade(t.wall2, (r() - 0.5) * 0.3, 0.5 * strength); ctx.fillRect(sx + 3, sy + 3, 114, 54);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(sx + 3, sy + 3, 114, 54);
      }
      break;
    case 'brick':
      for (let sy = y; sy < y + h; sy += 32) for (let sx = x - (sy / 32 % 2) * 40; sx < x + w; sx += 80) {
        ctx.fillStyle = mix(t.wall2, '#5a3528', 0.3 + r() * 0.3, 0.55 * strength); ctx.fillRect(sx + 2, sy + 2, 76, 28);
      }
      break;
    case 'boards':
      for (let sx = x; sx < x + w; sx += 70) {
        ctx.fillStyle = shade(t.wall2, (r() - 0.5) * 0.25, 0.5 * strength); ctx.fillRect(sx, y, 68, h);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(sx + 68, y, 2, h);
      }
      break;
    case 'plaster':
      strokes(ctx, x, y, w, h, t.wall2, Math.floor(w * h / 5000), 60, 10, 0.12 * strength, seed + 'p');
      break;
    default: break;
  }
  strokes(ctx, x, y, w, h, t.wall, Math.floor(w * h / 9000), 40, 8, 0.1 * strength, seed + 's', true);
}

function paintFloor(ctx: Ctx, t: Theme, g: ShellGeom, VP: { x: number; y: number }, seed: string) {
  const r = rng(seed + 'floor');
  const X0 = SHELL_X0 - 400, X1 = SHELL_X0 + SHELL_W + 400, Y1 = SHELL_Y0 + SHELL_H;
  ctx.fillStyle = t.floorColor;
  ctx.fillRect(X0, g.floor, X1 - X0, Y1 - g.floor);
  const rows: number[] = [];
  for (let k = 0, yy = g.floor; yy < Y1 + 50; k++) { rows.push(yy); yy += 8 + k * k * 1.6 + k * 6; }
  const convergeX = (bx: number, yy: number) => VP.x + (bx - VP.x) * (yy - VP.y) / (g.floor - VP.y);
  if (t.floor === 'planks' || t.floor === 'carpet') {
    const n = 40;
    for (let i = -n; i <= n; i++) {
      const bx = 960 + i * 34;
      const col = shade(t.floorColor, (r() - 0.5) * 0.3);
      const x0 = convergeX(bx, g.floor), x1 = convergeX(bx + 34, g.floor);
      const xb0 = convergeX(bx, Y1), xb1 = convergeX(bx + 34, Y1);
      poly(ctx, [x0, g.floor, x1, g.floor, xb1, Y1, xb0, Y1], col);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x0, g.floor); ctx.lineTo(xb0, Y1); ctx.stroke();
      // grain & plank ends
      ctx.strokeStyle = shade(t.floorColor, 0.2, 0.08); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, g.floor); ctx.lineTo((xb0 + xb1) / 2, Y1); ctx.stroke();
      for (const yy of rows) if (r() < 0.25) {
        const ax = convergeX(bx, yy), bxx = convergeX(bx + 34, yy);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.moveTo(ax, yy); ctx.lineTo(bxx, yy); ctx.stroke();
      }
    }
    blotches(ctx, X0, g.floor, X1 - X0, Y1 - g.floor, '#000000', 40, 60, 260, 0.2, seed + 'fd');
    // worn path from the doors toward the camera
    const wp = ctx.createRadialGradient(960, g.floor + 140, 20, 960, g.floor + 140, 600);
    wp.addColorStop(0, shade(t.floorColor, 0.15, 0.25)); wp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wp; ctx.fillRect(X0, g.floor, X1 - X0, Y1 - g.floor);
  } else if (t.floor === 'tiles' || t.floor === 'checker' || t.floor === 'stone' || t.floor === 'concrete') {
    const size = t.floor === 'stone' ? 90 : t.floor === 'concrete' ? 200 : 60;
    for (let ri = 0; ri < rows.length - 1; ri++) {
      const y0 = rows[ri], y1 = rows[ri + 1];
      for (let i = -30; i <= 30; i++) {
        const bx = 960 + i * size;
        const a0 = convergeX(bx, y0), a1 = convergeX(bx + size, y0), b0 = convergeX(bx, y1), b1 = convergeX(bx + size, y1);
        const even = (i + ri) % 2 === 0;
        const col = t.floor === 'checker' ? (even ? shade(t.floorColor, 0.35) : shade(t.floorColor, -0.35)) : shade(t.floorColor, (r() - 0.5) * (t.floor === 'concrete' ? 0.08 : 0.2));
        poly(ctx, [a0, y0, a1, y0, b1, y1, b0, y1], col, t.floor === 'concrete' ? undefined : 'rgba(0,0,0,0.35)', 1.5);
      }
    }
    blotches(ctx, X0, g.floor, X1 - X0, Y1 - g.floor, '#000000', 50, 60, 240, 0.22, seed + 'fd');
  } else if (t.floor === 'water') {
    const wg = ctx.createLinearGradient(0, g.floor, 0, Y1);
    wg.addColorStop(0, '#1a2226'); wg.addColorStop(1, '#0a1012');
    ctx.fillStyle = wg; ctx.fillRect(X0, g.floor, X1 - X0, Y1 - g.floor);
    for (const yy of rows) { ctx.strokeStyle = 'rgba(150,180,190,0.08)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0, yy + r() * 6); for (let x = X0; x < X1; x += 60) ctx.lineTo(x, yy + Math.sin(x / 90 + r()) * 4); ctx.stroke(); }
    // reflection of the back wall
    ctx.fillStyle = mix(t.wall, '#0a1012', 0.6, 0.35); ctx.fillRect(g.left, g.floor, g.right - g.left, 160);
  }
}
