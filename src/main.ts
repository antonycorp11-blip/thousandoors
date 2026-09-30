// A THOUSAND DOORS — entry point.
import Phaser from 'phaser';
import './styles.css';
import { GameManager } from './core/GameManager';
import { RoomScene } from './scenes/RoomScene';
import { UIController } from './ui/UIController';
import { showTitle, playIntro } from './ui/TitleScreen';
import { DebugPanel } from './ui/DebugPanel';
import { EditorView, applyEditorOverrides } from './ui/EditorView';

async function boot() {
  const g = new GameManager();
  await g.load();
  const params = new URLSearchParams(location.search);
  g.debug = params.has('debug') || localStorage.getItem('atd.debug') === '1';
  const ui = new UIController(g, document.getElementById('ui')!);
  g.ui = ui;
  (window as any).__atd = g;

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
