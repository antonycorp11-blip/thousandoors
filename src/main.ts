// A THOUSAND DOORS — entry point.
import Phaser from 'phaser';
import './styles.css';
import { GameManager } from './core/GameManager';
import { RoomScene } from './scenes/RoomScene';
import { UIController } from './ui/UIController';
import { showTitle, playIntro } from './ui/TitleScreen';
import { DebugPanel } from './ui/DebugPanel';
import { EditorView, applyEditorOverrides } from './ui/EditorView';

// ── Orientação ─────────────────────────────────────────────
// O jogo é horizontal. Em retrato, o modo EXPAND do Phaser criaria um canvas de 1920×4000+ px,
// o que derruba o WebGL em celulares (o jogo "trava"). Por isso o Phaser só nasce deitado,
// e pausa enquanto o aparelho estiver em pé.
const isPortrait = () => window.innerHeight > window.innerWidth && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900);
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

function syncPortraitClass(): boolean {
  const p = isPortrait();
  document.body.classList.toggle('portrait', p);
  return p;
}

function onOrientation(fn: () => void) {
  window.addEventListener('resize', fn);
  window.addEventListener('orientationchange', fn);
  (screen.orientation as any)?.addEventListener?.('change', fn);
  window.visualViewport?.addEventListener('resize', fn);
}

async function waitForLandscape(): Promise<void> {
  if (!syncPortraitClass()) return;
  await new Promise<void>(res => {
    const check = () => { if (!syncPortraitClass()) res(); };
    onOrientation(check);
    const t = setInterval(() => { if (!syncPortraitClass()) { clearInterval(t); res(); } }, 500);
  });
  await wait(350); // iOS entrega o tamanho novo com atraso
}

async function boot() {
  syncPortraitClass();
  const g = new GameManager();
  await g.load();
  const params = new URLSearchParams(location.search);
  g.debug = params.has('debug') || localStorage.getItem('atd.debug') === '1';
  const ui = new UIController(g, document.getElementById('ui')!);
  g.ui = ui;
  (window as any).__atd = g;

  await waitForLandscape();
  const scene = new RoomScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1920,
    height: 1080,
    backgroundColor: '#0a0a0b',
    scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 3 },
    scene: [scene],
    banner: false,
  });
  await new Promise<void>(res => { scene.onReady = res; });
  scene.g = g;
  scene.input$ = ui;
  g.scene = scene;

  if (g.debug) { new DebugPanel(g, ui.root); new EditorView(g, ui.root); applyEditorOverrides(g); }

  // Girou para retrato no meio do jogo: pausa a cena; ao deitar de novo, reajusta a escala (várias vezes, por causa do iOS).
  let sleeping = false;
  onOrientation(() => {
    const p = syncPortraitClass();
    if (p && !sleeping) { sleeping = true; game.loop.sleep(); return; }
    if (!p) {
      if (sleeping) { sleeping = false; game.loop.wake(); }
      for (const ms of [60, 300, 900]) setTimeout(() => { if (!isPortrait()) game.scale.refresh(); }, ms);
    }
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) g.saves?.save(g.snapshot()); });
  window.addEventListener('pagehide', () => g.saves?.save(g.snapshot()));

  // debug shortcut: ?debug=1&room=N jumps straight into a room
  const jump = g.debug ? params.get('room') : null;
  if (jump !== null) {
    g.meta.introDone = true;
    ui.setHudVisible(true);
    if (!g.run) await g.startRun();
    if (params.has('face')) g.roomState.facing = 'back';
    await g.enterRoom('r' + String(parseInt(jump, 10)).padStart(3, '0'), null, { side: params.has('back') ? 'back' : undefined });
    return;
  }
  const choice = await showTitle(g, ui);
  if (choice === 'new' || !g.meta.introDone) { await playIntro(g, ui); return; }
  ui.setHudVisible(true);
  if (g.run) await g.resume();
  else await g.enterZero();
  void game;
}

boot().catch(e => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="color:#e99;position:fixed;inset:10px;z-index:99999;white-space:pre-wrap">${String(e?.stack ?? e)}</pre>`); });
