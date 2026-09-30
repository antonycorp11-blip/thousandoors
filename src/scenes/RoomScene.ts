// RoomScene — renders a RoomView (fixed 2D lateral camera), handles touch/mouse, turning and door transitions.
import Phaser from 'phaser';
import type { GameManager, ScenePort } from '../core/GameManager';
import type { RoomView, PropView } from '../world/RoomManager';
import type { DoorView } from '../world/DoorManager';
import type { PropDef } from '../core/types';
import { THEMES } from '../data/themes';
import { CHAR } from '../data/characters';
import { shellGeom, floorY, depthScale, DOOR_H, DOOR_W, W, H } from '../render/geometry';
import { paintShell, SHELL_X0, SHELL_Y0, SHELL_SCALE, SHELL_W, SHELL_H } from '../render/paint/shell';
import { paintFrame, paintSlab, paintKnob, FRAME, DOOR_CANVAS_W, DOOR_CANVAS_H } from '../render/paint/doors';
import { paintProp } from '../render/paint/props';
import { paintFigure, paintCloseFigure } from '../render/paint/figures';
import { canvas, hexToRgb } from '../render/paint/util';
import { bus } from '../core/EventBus';

export interface SceneInputHandler {
  propTap(p: PropView, sx: number, sy: number): void;
  propExamine(p: PropView, sx: number, sy: number): void;
  doorTap(v: DoorView, sx: number, sy: number): void;
  doorExamine(v: DoorView, sx: number, sy: number): void;
  npcTap(npc: string, sx: number, sy: number): void;
  npcExamine(npc: string, sx: number, sy: number): void;
  backgroundTap(): void;
}

const LONG_PRESS = 450;
const LIGHT_Y: Record<string, number> = { bulb: 225, lamp_shade: 200, chandelier: 190, glass_roof: 60, water_ceiling: 80 };
const LIGHT_DY: Record<string, number> = { sconce: -80, sconce_candle: -70, lamp_table: -78, lamp_oil: -48, candle: -34, candle_floor: -170, candelabra: -90, candles_five: -40, fireplace: -150, window: -120, lamp_floor: -260, cake: -120, cake_small: -80, reliquary: -150, boiler: -150, wall_crack: -300, number_panel: -55 };

interface DoorDisplay { v: DoorView; root: Phaser.GameObjects.Container; slab?: Phaser.GameObjects.Image; knob?: Phaser.GameObjects.Image; frame: Phaser.GameObjects.Image; scale: number; x: number; y: number }

export class RoomScene extends Phaser.Scene implements ScenePort {
  g!: GameManager;
  input$!: SceneInputHandler;
  private layer!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Container;
  private doorDisplays: DoorDisplay[] = [];
  private lightFx: { glow: Phaser.GameObjects.Image; pool: Phaser.GameObjects.Image; base: number; anim?: string; phase: number }[] = [];
  private secretZones: Phaser.GameObjects.GameObject[] = [];
  private currentKey = '';
  private black!: Phaser.GameObjects.Rectangle;
  private grainSprite!: Phaser.GameObjects.TileSprite;
  private vignette!: Phaser.GameObjects.Image;
  private red!: Phaser.GameObjects.Image;
  private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  private press: { target: any; t: number; x: number; y: number; timer: any; fired: boolean } | null = null;
  private flickerUntil = 0;
  private showHotspots = false;
  private breathing = false;
  private shellKeys: string[] = [];
  private currentLayout: any = 'box';

  onReady?: () => void;
  constructor() { super('room'); }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0b');
    this.cameras.main.centerOn(W / 2, H / 2);
    this.layer = this.add.container(0, 0);
    this.overlay = this.add.container(0, 0).setDepth(2000);
    this.makeSharedTextures();
    this.vignette = this.add.image(W / 2, H / 2, 'vignette').setDepth(1900).setScrollFactor(0);
    this.red = this.add.image(W / 2, H / 2, 'vignette_red').setDepth(1901).setScrollFactor(0).setAlpha(0);
    this.grainSprite = this.add.tileSprite(W / 2, H / 2, 2800, 1600, 'noise').setDepth(1950).setScrollFactor(0).setAlpha(0.06).setBlendMode(Phaser.BlendModes.OVERLAY);
    this.black = this.add.rectangle(W / 2, H / 2, 4000, 3000, 0x000000).setDepth(3000).setScrollFactor(0).setAlpha(1);
    this.scale.on('resize', () => this.layout());
    this.layout();
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: any[]) => { if (!over.length && !this.press) this.input$?.backgroundTap(); void p; });
    this.input.mouse?.disableContextMenu();
    bus.on('debug:hotspots', (on: boolean) => { this.showHotspots = on; this.refresh(true); });
    this.onReady?.();
  }

  private layout() {
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    cam.centerOn(W / 2, H / 2);
    const sx = this.scale.width / W, sy = this.scale.height / H;
    this.vignette.setDisplaySize(W * Math.max(1, sx / sy) + 40, H * Math.max(1, sy / sx) + 40);
    this.red.setDisplaySize(this.vignette.displayWidth, this.vignette.displayHeight);
  }

  private makeSharedTextures() {
    const t = this.textures;
    if (!t.exists('glow')) {
      const [c, ctx] = canvas(256, 256);
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
      t.addCanvas('glow', c);
    }
    if (!t.exists('noise')) {
      const [c, ctx] = canvas(256, 256);
      const img = ctx.createImageData(256, 256);
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      ctx.putImageData(img, 0, 0);
      t.addCanvas('noise', c);
    }
    const vig = (key: string, color: string, inner: number) => {
      if (t.exists(key)) return;
      const [c, ctx] = canvas(960, 540);
      const g = ctx.createRadialGradient(480, 270, 540 * inner, 480, 270, 620);
      const [r, gg, b] = hexToRgb(color);
      g.addColorStop(0, `rgba(${r},${gg},${b},0)`); g.addColorStop(1, `rgba(${r},${gg},${b},0.92)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
      t.addCanvas(key, c);
    };
    vig('vignette', '#000000', 0.42);
    vig('vignette_red', '#5a0808', 0.2);
    if (!t.exists('dust')) { const [c, ctx] = canvas(8, 8); ctx.fillStyle = 'rgba(255,240,210,0.9)'; ctx.beginPath(); ctx.arc(4, 4, 2, 0, 7); ctx.fill(); t.addCanvas('dust', c); }
    if (!t.exists('raindrop')) { const [c, ctx] = canvas(4, 40); ctx.fillStyle = 'rgba(190,210,220,0.5)'; ctx.fillRect(1, 0, 2, 40); t.addCanvas('raindrop', c); }
    if (!t.exists('close_figure')) t.addCanvas('close_figure', paintCloseFigure());
    if (!t.exists('chalk')) { const [c, ctx] = canvas(40, 40); ctx.strokeStyle = 'rgba(235,230,215,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(6, 8); ctx.lineTo(34, 32); ctx.moveTo(32, 6); ctx.lineTo(8, 34); ctx.stroke(); t.addCanvas('chalk', c); }
    if (!t.exists('bricks')) { const [c, ctx] = canvas(DOOR_W, DOOR_H); for (let y = 0; y < DOOR_H; y += 22) for (let x = -(y / 22 % 2) * 22; x < DOOR_W; x += 44) { ctx.fillStyle = `rgb(${70 + Math.random() * 20},${40 + Math.random() * 10},${30})`; ctx.fillRect(x + 1, y + 1, 42, 20); } t.addCanvas('bricks', c); }
  }

  private tex(key: string, make: () => HTMLCanvasElement): string {
    if (!this.textures.exists(key)) this.textures.addCanvas(key, make());
    return key;
  }

  // ───────────────────────────── building a view ─────────────────────────────
  private build(view: RoomView) {
    this.layer.removeAll(true);
    this.overlay.removeAll(true);
    this.lightFx = [];
    this.doorDisplays = [];
    this.secretZones = [];
    this.dust?.destroy(); this.dust = undefined;
    this.rain?.destroy(); this.rain = undefined;
    const room = view.room;
    const theme = THEMES[room.theme] ?? THEMES.plain;
    const layout = room.layout ?? 'box';
    this.currentLayout = layout;
    const geom = shellGeom(layout);
    const mods = room.modifiers ?? [];
    // shell
    const shellKey = `shell:${room.id}:${view.side}`;
    this.tex(shellKey, () => paintShell({ theme, layout, seed: room.id + view.side, stains: theme.stains, back: view.side === 'back', fog: mods.includes('fog') }));
    this.shellKeys = this.shellKeys.filter(k => k !== shellKey); this.shellKeys.push(shellKey);
    while (this.shellKeys.length > 14) { const old = this.shellKeys.shift()!; if (this.textures.exists(old)) this.textures.remove(old); }
    const shell = this.add.image(SHELL_X0, SHELL_Y0, shellKey).setOrigin(0, 0).setScale(1 / SHELL_SCALE);
    this.layer.add(shell);

    // props (wall first, then floor by depth), NPCs, doors
    const items: { depth: number; add: () => void }[] = [];
    for (const p of view.props) {
      if (p.invisible || p.kind === 'clue_hint') { items.push({ depth: 5, add: () => this.addHotspot(p) }); continue; }
      const isCeil = ['bulb', 'lamp_shade', 'chandelier', 'glass_roof', 'water_ceiling', 'mobile_toy'].includes(p.kind);
      const floorProp = p.d !== undefined && !isCeil;
      const depth = p.z === -1 ? 8 : floorProp ? 40 + (p.d ?? 0) * 100 + (p.z ?? 0) : isCeil ? 30 : 12 + (p.z ?? 0);
      items.push({ depth, add: () => this.addProp(p, isCeil) });
    }
    for (const v of view.doors) items.push({ depth: 20, add: () => this.addDoor(v, geom) });
    for (const n of view.npcs) {
      const d = 0.28;
      items.push({ depth: 40 + d * 100 + 1, add: () => this.addNpc(n.npc, n.x, d) });
    }
    items.sort((a, b) => a.depth - b.depth).forEach(i => i.add());

    // lighting: multiply overlay + additive glows
    const ambient = room.ambient ?? theme.ambient;
    const lightKey = `light:${room.id}:${view.side}:${view.props.filter(p => p.light).map(p => p.id + p.x).join(',')}:${view.doors.map(d => d.door.visual.lightUnder ? d.x : '').join('')}`;
    this.tex(lightKey, () => this.paintLightmap(view, ambient, theme.lightColor, geom));
    const lm = this.add.image(SHELL_X0, SHELL_Y0, lightKey).setOrigin(0, 0).setScale(4).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.layer.add(lm);
    for (const p of view.props) if (p.light) this.addLight(p, theme.lightColor);
    for (const d of view.doors) if (d.door.visual.lightUnder) {
      const glow = this.add.image(d.x, geom.floor - 2, 'glow').setScale(1.4, 0.12).setTint(Phaser.Display.Color.HexStringToColor(d.door.visual.lightUnder).color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
      this.layer.add(glow);
    }
    // ambience particles
    if (!['white', 'void'].includes(room.theme) && !this.g.settings.reduceMotion) {
      this.dust = this.add.particles(0, 0, 'dust', {
        x: { min: 200, max: 1720 }, y: { min: 100, max: 900 }, lifespan: 9000, speedX: { min: -6, max: 6 }, speedY: { min: -4, max: 5 },
        scale: { min: 0.4, max: 1.2 }, alpha: { start: 0, end: 0, ease: (t: number) => Math.sin(t * Math.PI) * 0.35 } as any, frequency: 420, blendMode: 'ADD',
      });
      this.dust.setDepth(1200);
    }
    if ((mods.includes('rain') || room.theme === 'flooded') && !this.g.settings.reduceMotion) {
      this.rain = this.add.particles(0, 0, 'raindrop', { x: { min: -200, max: 2120 }, y: -100, lifespan: 1400, speedY: { min: 900, max: 1200 }, speedX: -60, alpha: { min: 0.15, max: 0.35 }, quantity: 3, frequency: 30 });
      this.rain.setDepth(1210);
    }
    // camera: tilt & mirror
    const cam = this.cameras.main;
    cam.setRotation(((room.tilt ?? 0) * Math.PI) / 180);
    this.layer.setScale(room.mirror ? -1 : 1, 1);
    this.layer.x = room.mirror ? W : 0;
    this.currentKey = view.key;
  }

  private paintLightmap(view: RoomView, ambient: number, lightColor: string, geom: ReturnType<typeof shellGeom>): HTMLCanvasElement {
    const S = 0.25;
    const [c, ctx] = canvas(SHELL_W * S, SHELL_H * S);
    ctx.scale(S, S);
    ctx.translate(-SHELL_X0, -SHELL_Y0);
    const a = Math.min(1, ambient * 1.25 + 0.1);
    ctx.fillStyle = `rgb(${Math.round(255 * a * 0.95)},${Math.round(255 * a * 0.9)},${Math.round(255 * a * 0.92)})`;
    ctx.fillRect(SHELL_X0, SHELL_Y0, SHELL_W, SHELL_H);
    ctx.globalCompositeOperation = 'lighter';
    const add = (x: number, y: number, r: number, col: string, i: number, sy = 1) => {
      const [cr, cg, cb] = hexToRgb(col);
      ctx.save(); ctx.translate(x, y); ctx.scale(1, sy);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${Math.min(1, 1.05 * i)})`);
      g.addColorStop(0.35, `rgba(${cr},${cg},${cb},${0.62 * i})`);
      g.addColorStop(0.7, `rgba(${cr},${cg},${cb},${0.22 * i})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
    };
    for (const p of view.props) {
      if (!p.light) continue;
      const { x, y } = this.lightPos(p);
      const col = p.light.color ?? lightColor;
      const i = p.light.i ?? 0.8;
      add(x, y, p.light.r * 1.25, col, i);
      // pool of light on the floor below ceiling lamps and wall lights
      if (y < geom.floor - 100) add(x, geom.floor + 90, p.light.r * 0.9, col, i * 0.55, 0.28);
    }
    for (const d of view.doors) if (d.door.visual.lightUnder) add(d.x, geom.floor, 160, d.door.visual.lightUnder, 0.8, 0.3);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }

  private lightPos(p: PropDef): { x: number; y: number } {
    const isCeil = LIGHT_Y[p.kind] !== undefined;
    const y = isCeil ? (p.y ?? 0) + LIGHT_Y[p.kind] : (p.y ?? floorY(p.d ?? 0)) + (p.light?.dy ?? LIGHT_DY[p.kind] ?? -60) * depthScale(p.d ?? 0);
    return { x: p.x, y };
  }

  private addLight(p: PropDef, lightColor: string) {
    const { x, y } = this.lightPos(p);
    const col = Phaser.Display.Color.HexStringToColor(p.light!.color ?? lightColor).color;
    const i = p.light!.i ?? 0.8;
    const glow = this.add.image(x, y, 'glow').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setScale(p.light!.r / 700).setAlpha(0.55 * i);
    const pool = this.add.image(x, y, 'glow').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setScale(p.light!.r / 110).setAlpha(0.06 * i);
    this.layer.add([pool, glow]);
    this.lightFx.push({ glow, pool, base: i, anim: p.anim, phase: Math.random() * 10 });
  }

  private hitArea(img: Phaser.GameObjects.Image, minW = 90, minH = 90) {
    const w = Math.max(img.width, minW / Math.abs(img.scaleX || 1)), h = Math.max(img.height, minH / Math.abs(img.scaleY || 1));
    img.setInteractive(new Phaser.Geom.Rectangle((img.width - w) / 2, (img.height - h) / 2, w, h), Phaser.Geom.Rectangle.Contains);
    if (img.input) img.input.cursor = 'pointer';
  }

  private addProp(p: PropView, isCeil: boolean) {
    const art = paintProp(p.kind, p.variant ?? '', '');
    const key = this.tex(`prop:${p.kind}:${p.variant ?? ''}`, () => art.canvas);
    const d = p.d ?? 0;
    const geom = shellGeom(this.currentLayout);
    const wallScale = (geom.floor - geom.top) / 710;
    const onWall = p.d === undefined && !isCeil;
    let s = (p.scale ?? 1) * (p.d !== undefined && !isCeil ? depthScale(d) : onWall ? wallScale : 1);
    let y = p.y ?? (isCeil ? 0 : floorY(d));
    if (onWall && wallScale !== 1 && p.y !== undefined) y = geom.floor - (800 - p.y) * wallScale;
    if (isCeil && geom.top > 120) { y = geom.top - 90; s *= 0.8; }
    const img = this.add.image(p.x, y, key).setOrigin(art.ax, art.ay).setScale(p.flip ? -s : s, p.flipY ? -s : s);
    if (p.rot) img.setRotation((p.rot * Math.PI) / 180);
    this.layer.add(img);
    if (p.anim === 'rock' && !this.g.settings.reduceMotion) this.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (p.anim === 'sway' && !this.g.settings.reduceMotion) this.tweens.add({ targets: img, angle: { from: -1.5, to: 1.5 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const interactive = !!(p.interact?.length || p.examine || p.label || p.hotspot) && !['bulb', 'lamp_shade', 'chandelier', 'rug', 'runner_rug', 'glass_roof', 'water_ceiling'].includes(p.kind) || !!p.interact?.length;
    if (interactive) {
      if (p.hotspot) this.addHotspot(p);
      else { this.hitArea(img); this.bindPress(img, { prop: p }); }
    }
    if (this.showHotspots && interactive) this.debugRect(img.getBounds(), 0x44ff88, p.id);
  }

  private addHotspot(p: PropDef) {
    const w = p.hotspot?.w ?? 160, h = p.hotspot?.h ?? 160;
    const y = p.y ?? floorY(p.d ?? 0);
    const z = this.add.zone(p.x, y - h / 2, w, h).setInteractive({ cursor: 'pointer' });
    this.layer.add(z);
    this.bindPress(z, { prop: p as PropView });
    if (p.hotspot?.secret) this.secretZones.push(z);
    if (this.showHotspots) this.debugRect(new Phaser.Geom.Rectangle(p.x - w / 2, y - h, w, h), 0xff44aa, p.id);
  }

  private debugRect(r: Phaser.Geom.Rectangle, color: number, label: string) {
    const g = this.add.graphics().lineStyle(2, color, 0.9).strokeRectShape(r);
    const t = this.add.text(r.x + 4, r.y + 2, label, { fontSize: '14px', color: '#fff', backgroundColor: '#000a' });
    this.overlay.add([g, t]);
  }

  private addNpc(npc: string, x: number, d: number) {
    const c = CHAR[npc];
    if (!c) return;
    const st = this.g.npcs.state(npc);
    const stage = c.youngs ? Math.max(0, 2 - st.timelineState) : st.timelineState;
    const art = paintFigure(c.figure, c.ages || c.youngs ? stage : 0, npc);
    const key = this.tex(`fig:${npc}:${stage}`, () => art.canvas);
    const s = depthScale(d) * 0.92;
    const img = this.add.image(x, floorY(d), key).setOrigin(art.ax, art.ay).setScale(s);
    this.layer.add(img);
    if (!this.g.settings.reduceMotion) this.tweens.add({ targets: img, scaleY: s * 1.008, duration: 2200 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.hitArea(img, 140, 300);
    this.bindPress(img, { npc });
    if (this.showHotspots) this.debugRect(img.getBounds(), 0x66aaff, npc);
  }

  private addDoor(v: DoorView, geom: ReturnType<typeof shellGeom>) {
    const d = v.door;
    const vis = d.visual;
    const wallScale = (geom.floor - geom.top) / 710;
    const frameKey = this.tex(`dframe:${d.id}`, () => paintFrame(vis, d.id));
    const slabKey = this.tex(`dslab:${d.id}`, () => paintSlab(vis, d.id));
    const knobKey = this.tex(`dknob:${vis.material}:${vis.handle ?? ''}`, () => paintKnob(vis));
    if (v.wall === 'left' || v.wall === 'right') return this.addSideDoor(v, geom, frameKey, slabKey);
    const s = wallScale * (vis.scale ?? 1);
    const x = v.x;
    const y = geom.floor + (vis.yOffset ?? 0);
    const root = this.add.container(x, y);
    const frame = this.add.image(0, 0, frameKey).setOrigin(0.5, DOOR_CANVAS_H / (DOOR_CANVAS_H + 8)).setScale(s);
    const hingeLeft = !v.reverse;
    const slabX = (hingeLeft ? -DOOR_W / 2 : DOOR_W / 2) * s;
    const slab = this.add.image(slabX, 0, slabKey).setOrigin(hingeLeft ? 0 : 1, 1).setScale(hingeLeft ? s : -s, s);
    const knob = this.add.image((hingeLeft ? DOOR_W / 2 - 28 : -DOOR_W / 2 + 28) * s, -DOOR_H * 0.48 * s, knobKey).setScale(s);
    root.add([frame, slab, knob]);
    if (v.chalk) root.add(this.add.image(-DOOR_W * 0.25 * s, -DOOR_H * 0.75 * s, 'chalk').setScale(s).setAlpha(0.85));
    if (vis.material === 'painted' && d.hidden) { frame.setAlpha(0); }
    this.layer.add(root);
    const hit = this.add.zone(x, y - (DOOR_H * s) / 2, (DOOR_W + FRAME) * s, DOOR_H * s).setInteractive({ cursor: 'pointer' });
    this.layer.add(hit);
    this.bindPress(hit, { door: v });
    const dd: DoorDisplay = { v, root, slab, knob, frame, scale: s, x, y };
    this.doorDisplays.push(dd);
    if (this.breathing) this.breathe(dd);
    if (this.showHotspots) this.debugRect(new Phaser.Geom.Rectangle(x - (DOOR_W * s) / 2, y - DOOR_H * s, DOOR_W * s, DOOR_H * s), v.locked ? 0xff4444 : 0xffcc44, `${d.id}${v.reverse ? '↩' : ''}→${this.g.doors.resolveTo(d, v.reverse)}`);
  }

  private addSideDoor(v: DoorView, geom: ReturnType<typeof shellGeom>, frameKey: string, slabKey: string) {
    const left = v.wall === 'left';
    const VPy = (geom.top + geom.floor) / 2 + 40;
    const cornerX = left ? geom.left : geom.right;
    const dist = Math.abs(v.x - cornerX);
    const persp = 1 + dist / Math.abs(cornerX - 960);
    const hDoor = DOOR_H * ((geom.floor - geom.top) / 710) * persp * 0.9;
    const wDoor = DOOR_W * ((geom.floor - geom.top) / 710) * persp * 0.42;
    const slope = (geom.floor - VPy) / Math.abs(cornerX - 960);
    const yBottom = geom.floor + dist * slope;
    const key = `dside:${v.door.id}`;
    this.tex(key, () => {
      const fc = this.textures.get(frameKey).getSourceImage() as HTMLCanvasElement;
      const sc = this.textures.get(slabKey).getSourceImage() as HTMLCanvasElement;
      const cw = Math.ceil(wDoor * 1.25), ch = Math.ceil(hDoor + wDoor * slope + 20);
      const [c, ctx] = canvas(cw, ch);
      const shear = (left ? 1 : -1) * slope * (wDoor / (DOOR_CANVAS_W));
      const baseY = left ? ch - wDoor * slope - 4 : ch - 4;
      ctx.setTransform(wDoor * 1.2 / DOOR_CANVAS_W, shear * DOOR_CANVAS_W / DOOR_CANVAS_W, 0, hDoor / DOOR_CANVAS_H, 0, baseY - hDoor);
      ctx.drawImage(fc, 0, 0);
      ctx.drawImage(sc, FRAME, FRAME);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, cw, ch);
      return c;
    });
    const img = this.add.image(v.x, yBottom + 4, key).setOrigin(0.5, 1);
    this.layer.add(img);
    this.hitArea(img, 120, 260);
    this.bindPress(img, { door: v });
    this.doorDisplays.push({ v, root: this.add.container(0, 0), frame: img, scale: 1, x: v.x, y: yBottom });
  }

  // ───────────────────────────── input ─────────────────────────────
  private bindPress(obj: Phaser.GameObjects.GameObject, target: { prop?: PropView; door?: DoorView; npc?: string }) {
    obj.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.g.busy) return;
      this.g.audio.unlock();
      if (p.rightButtonDown()) { this.fire(target, true, p); return; }
      const press = { target, t: p.downTime, x: p.x, y: p.y, fired: false, timer: 0 as any };
      press.timer = setTimeout(() => { press.fired = true; this.fire(target, true, p); bus.emit('ui:pressring', null); }, LONG_PRESS);
      this.press = press;
      bus.emit('ui:pressring', { x: p.event && 'clientX' in p.event ? (p.event as any).clientX : 0, y: p.event && 'clientY' in p.event ? (p.event as any).clientY : 0 });
    });
    obj.on('pointerup', (p: Phaser.Input.Pointer) => {
      const pr = this.press;
      if (!pr || pr.target !== target) return;
      clearTimeout(pr.timer);
      bus.emit('ui:pressring', null);
      this.press = null;
      if (!pr.fired && Math.hypot(p.x - pr.x, p.y - pr.y) < 30) this.fire(target, false, p);
    });
    obj.on('pointerout', () => { if (this.press?.target === target) { clearTimeout(this.press.timer); this.press = null; bus.emit('ui:pressring', null); } });
  }

  private fire(t: { prop?: PropView; door?: DoorView; npc?: string }, examine: boolean, p: Phaser.Input.Pointer) {
    const ev = p.event as MouseEvent | TouchEvent | undefined;
    let sx = 0, sy = 0;
    if (ev && 'changedTouches' in ev && ev.changedTouches.length) { sx = ev.changedTouches[0].clientX; sy = ev.changedTouches[0].clientY; }
    else if (ev && 'clientX' in ev) { sx = ev.clientX; sy = ev.clientY; }
    if (t.prop) examine ? this.input$.propExamine(t.prop, sx, sy) : this.input$.propTap(t.prop, sx, sy);
    else if (t.door) examine ? this.input$.doorExamine(t.door, sx, sy) : this.input$.doorTap(t.door, sx, sy);
    else if (t.npc) examine ? this.input$.npcExamine(t.npc, sx, sy) : this.input$.npcTap(t.npc, sx, sy);
  }

  // ───────────────────────────── ScenePort ─────────────────────────────
  async showRoom(view: RoomView, entering: boolean): Promise<void> {
    this.breathing = false;
    this.build(view);
    const cam = this.cameras.main;
    cam.setZoom(1);
    if (entering) {
      if (!this.g.settings.reduceMotion) { cam.setZoom(1.04); this.tweens.add({ targets: cam, zoom: 1, duration: 900, ease: 'Sine.out' }); }
      await this.fade(0, 650);
    } else this.black.setAlpha(0);
  }

  async turn(view: RoomView): Promise<void> {
    const cam = this.cameras.main;
    const rm = this.g.settings.reduceMotion;
    if (!rm) this.tweens.add({ targets: cam, scrollX: cam.scrollX + 260, duration: 220, ease: 'Sine.in' });
    await this.fade(1, rm ? 150 : 230);
    this.build(view);
    cam.centerOn(W / 2 - (rm ? 0 : 260), H / 2);
    if (!rm) this.tweens.add({ targets: cam, scrollX: cam.scrollX + 260, duration: 320, ease: 'Sine.out' });
    await this.fade(0, rm ? 150 : 320);
    cam.centerOn(W / 2, H / 2);
  }

  async openDoor(v: DoorView): Promise<void> {
    const dd = this.doorDisplays.find(d => d.v.door.id === v.door.id && d.v.reverse === v.reverse);
    const cam = this.cameras.main;
    const rm = this.g.settings.reduceMotion;
    if (dd?.knob && dd.slab) {
      // 1. handle, 2. the door swings, 3. darkness behind, 4. camera leans in, 5. fade
      await this.tweenP({ targets: dd.knob, angle: 70, duration: 180, ease: 'Sine.inOut' });
      const fromS = dd.slab.scaleX;
      this.tweens.add({ targets: dd.slab, scaleX: fromS * 0.12, duration: rm ? 300 : 700, ease: 'Sine.inOut' });
      this.tweens.add({ targets: dd.knob, alpha: 0, duration: 250 });
      if (!rm) {
        this.tweens.add({ targets: cam, zoom: 1.35, duration: 900, ease: 'Sine.in' });
        const wp = this.worldToCamCenter(dd.x, dd.y - (DOOR_H * dd.scale) / 2);
        this.tweens.add({ targets: cam, scrollX: wp.x, scrollY: wp.y, duration: 900, ease: 'Sine.in' });
      }
      await delay(rm ? 250 : 520);
    }
    await this.fade(1, rm ? 200 : 420);
    cam.setZoom(1);
    cam.centerOn(W / 2, H / 2);
  }

  private worldToCamCenter(x: number, y: number) {
    const cam = this.cameras.main;
    return { x: x - cam.width / 2 + (W / 2 - x) * 0.4, y: y - cam.height / 2 + (H / 2 - y) * 0.4 };
  }

  refresh(force = false): void {
    if (!this.g) return;
    const view = this.g.currentView();
    if (!force && view.key === this.currentKey) return;
    this.build(view);
  }

  fx(name: string, data: any): void {
    const rm = this.g.settings.reduceMotion;
    const rf = this.g.settings.reduceFlashes;
    switch (name) {
      case 'flicker': this.flickerUntil = this.time.now + (data.ms ?? 600); break;
      case 'shake': if (!rm) this.cameras.main.shake(data.ms ?? 300, data.intensity ?? 0.004); break;
      case 'darkness': this.black.setAlpha(0.96); this.tweens.add({ targets: this.black, alpha: 0, delay: data.ms ?? 1500, duration: 400 }); break;
      case 'damage': this.red.setAlpha(rf ? 0.35 : 0.8); this.tweens.add({ targets: this.red, alpha: 0, duration: 900 }); if (!rm) this.cameras.main.shake(180, 0.006); break;
      case 'jumpscare': {
        const img = this.add.image(W / 2 + 120, H / 2 + 80, 'close_figure').setDepth(1800).setScrollFactor(0).setAlpha(0).setScale(1.2);
        this.tweens.add({ targets: img, alpha: 1, scale: 1.35, duration: rf ? 400 : 90, yoyo: true, hold: 500, onComplete: () => img.destroy() });
        break;
      }
      case 'apparition': {
        if (data.side && data.side !== this.g.roomState.facing) break;
        const kind = data.kind === 'faceless' ? 'apparition_faceless' : data.kind === 'child' ? 'apparition_child' : 'apparition_figure';
        const art = paintProp(kind);
        const key = this.tex(`prop:${kind}:`, () => art.canvas);
        const x = data.x ?? [620, 1300, 1560][Math.floor(Math.random() * 3)];
        const img = this.add.image(x, floorY(0.15), key).setOrigin(0.5, 1).setAlpha(0).setScale(depthScale(0.15));
        this.layer.add(img);
        this.tweens.add({ targets: img, alpha: 0.95, duration: 300, hold: data.ms ?? 2500, yoyo: true, onComplete: () => img.destroy() });
        break;
      }
      case 'doorAnim': this.breathing = true; this.doorDisplays.forEach(d => this.breathe(d)); break;
      case 'doorRattle': {
        const dd = this.doorDisplays.find(d => d.v.door.id === data.door);
        if (dd?.knob && !rm) this.tweens.add({ targets: dd.knob, angle: { from: -18, to: 18 }, duration: 60, yoyo: true, repeat: 3, onComplete: () => dd.knob?.setAngle(0) });
        if (dd?.slab && !rm) this.tweens.add({ targets: dd.slab, x: dd.slab.x + 2, duration: 40, yoyo: true, repeat: 3 });
        break;
      }
      case 'falseDoor': {
        const dd = this.doorDisplays.find(d => d.v.door.id === data.door);
        if (dd) { const b = this.add.image(0, 0, 'bricks').setOrigin(0.5, 1).setScale(dd.scale); dd.root.addAt(b, 1); this.black.setAlpha(0); }
        break;
      }
      case 'reveal': this.refresh(true); break;
      case 'shimmer': for (const z of this.secretZones) { const b = (z as Phaser.GameObjects.Zone).getBounds(); const gl = this.add.image(b.centerX, b.centerY, 'glow').setScale(b.width / 300, b.height / 300).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setTint(0xe6b469); this.layer.add(gl); this.tweens.add({ targets: gl, alpha: 0.12, duration: 1800, yoyo: true, repeat: 2, onComplete: () => gl.destroy() }); } break;
      case 'tilt': this.cameras.main.setRotation((data.deg * Math.PI) / 180); break;
      case 'light': break;
    }
  }

  private breathe(d: DoorDisplay) {
    if (!d.slab || this.g.settings.reduceMotion) return;
    this.tweens.add({ targets: d.root, scaleY: 1.012, scaleX: 0.994, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private fade(to: number, ms: number): Promise<void> {
    return this.tweenP({ targets: this.black, alpha: to, duration: ms, ease: 'Sine.inOut' });
  }
  private tweenP(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise(res => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }

  update(time: number, delta: number) {
    if (!this.g) return;
    this.g.tick(delta / 1000);
    // grain
    this.grainSprite.tilePositionX = Math.random() * 256;
    this.grainSprite.tilePositionY = Math.random() * 256;
    // light animation
    const flick = time < this.flickerUntil;
    for (const l of this.lightFx) {
      let f = 1;
      if (l.anim === 'flicker') f = 0.92 + Math.sin(time / 90 + l.phase) * 0.03 + (Math.random() < 0.01 ? -0.4 : 0);
      if (l.anim === 'flame') f = 0.85 + Math.sin(time / 70 + l.phase) * 0.06 + Math.sin(time / 23 + l.phase * 3) * 0.05;
      if (flick) f *= Math.random() < 0.5 ? 0.2 : 1;
      if (this.g.settings.reduceFlashes) f = Math.max(f, 0.75);
      l.glow.setAlpha(0.55 * l.base * f);
      l.pool.setAlpha(0.06 * l.base * f);
    }
  }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
