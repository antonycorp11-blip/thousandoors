// Development panel (only with ?debug=1). Essential for producing hundreds of rooms.
import type { GameManager } from '../core/GameManager';
import { h } from './dom';
import { bus } from '../core/EventBus';
import { validateHouse, type ValidationReport } from '../world/HouseGraph';
import { simulate } from '../world/Simulator';
import { CHARACTERS } from '../data/characters';
import { ITEMS } from '../data/items';
import { PUZZLES } from '../data/puzzles';
import { rid } from '../world/HouseGenerator';

export class DebugPanel {
  el: HTMLElement;
  private out: HTMLElement;
  private report: ValidationReport | null = null;
  private hotspots = false;

  constructor(private g: GameManager, root: HTMLElement) {
    this.out = h('pre');
    const inp = (ph: string, w = 90) => h('input', { placeholder: ph, style: { width: w + 'px' } }) as HTMLInputElement;
    const roomIn = inp('sala nº', 70), doorIn = inp('d0001', 70), flagIn = inp('flag=valor', 150);
    const npcSel = h('select', {}, ...CHARACTERS.map(c => h('option', { value: c.id }, c.id)));
    const itemSel = h('select', {}, ...Object.keys(ITEMS).sort().map(i => h('option', { value: i }, i)));
    const pzSel = h('select', {}, ...PUZZLES.map(p => h('option', { value: p.id }, `${p.id} (${p.room})`)));
    const b = (label: string, fn: () => any) => h('button', { onclick: async () => { try { await fn(); } catch (e: any) { this.print('ERRO: ' + e.message); } } }, label);
    this.el = h('div', { class: 'debug interactive hidden' },
      h('div', { class: 'row' }, h('b', {}, 'DEBUG'), b('fechar', () => this.toggle())),
      h('h4', {}, 'Navegação'),
      h('div', { class: 'row' }, roomIn, b('ir para sala', () => this.goto(parseInt(roomIn.value, 10))), doorIn, b('atravessar porta', () => this.through(doorIn.value.trim()))),
      h('div', { class: 'row' }, b('virar', () => g.turn()), b('Sala Zero', () => g.enterZero()), b('nova run', () => g.startRun()), b('simular runs', () => this.sim())),
      h('h4', {}, 'Estado'),
      h('div', { class: 'row' }, flagIn, b('set flag', () => { const [k, v] = flagIn.value.split('='); g.meta.flags[k] = v === undefined ? true : v === 'false' ? false : isNaN(+v) ? v : +v; this.print(`flag ${k}=${g.meta.flags[k]}`); }), b('clear', () => { delete g.meta.flags[flagIn.value.split('=')[0]]; })),
      h('div', { class: 'row' }, npcSel, b('spawn NPC aqui', () => { g.npcs.spawn((npcSel as HTMLSelectElement).value, g.roomState.roomId, g.roomState.facing, 1300); g.refreshView(); })),
      h('div', { class: 'row' }, itemSel, b('dar item', () => g.inventory.add((itemSel as HTMLSelectElement).value))),
      h('div', { class: 'row' }, b('+10 fragmentos', () => g.memory.addFragments(10, 'debug')), b('curar', () => g.heal(9)), b('dano', () => g.damage(1, 'debug')), b('morrer', () => g.die('debug'))),
      h('div', { class: 'row' }, b('destrancar portas da sala', () => this.unlockHere()), b('revelar portas ocultas', () => this.revealHere())),
      h('div', { class: 'row' }, pzSel, b('testar puzzle', () => g.ui.puzzle((pzSel as HTMLSelectElement).value))),
      h('h4', {}, 'Visualização'),
      h('div', { class: 'row' }, b('hotspots / IDs', () => { this.hotspots = !this.hotspots; bus.emit('debug:hotspots', this.hotspots); }), b('grafo: revelar tudo no mapa', () => { for (const r of g.house.roomIds) if (!g.meta.rooms[r]) g.meta.seenRooms[r] = 'mapped'; g.ui.panel('map'); }), b('sala atual', () => this.here())),
      h('h4', {}, 'Validação'),
      h('div', { class: 'row' }, b('validar casa', () => this.validate()), b('chaves & fechaduras', () => this.locks()), b('exportar save', () => this.exportSave()), b('resetar save', async () => { await g.resetAll(); location.reload(); })),
      this.out);
    root.appendChild(this.el);
    bus.on('debug:toggle', () => this.toggle());
    window.addEventListener('keydown', e => { if (e.key === 'F2') { e.preventDefault(); this.toggle(); } });
  }

  toggle() { this.el.classList.toggle('hidden'); }
  print(s: string) { this.out.textContent = s; }

  private async goto(n: number) {
    const g = this.g;
    if (isNaN(n)) return;
    if (!g.run) await g.startRun();
    await g.enterRoom(rid(n), null);
  }

  private async through(id: string) {
    const g = this.g;
    const d = g.house.doors[id];
    if (!d) return this.print('porta inexistente');
    if (!g.run) await g.startRun();
    if (g.roomState.roomId !== d.origin) await g.enterRoom(d.origin, null);
    const v = g.doors.visible(d.origin, d.side).find(x => x.door.id === id) ?? { door: d, reverse: false, latch: false, entry: false, x: d.x ?? 960, wall: 'back' as const, locked: g.doors.isLocked(id), chalk: false, pos: 'center' as const };
    if (v.locked) { g.doors.rec(id).unlocked = true; v.locked = false; }
    await g.openDoor(v);
  }

  private unlockHere() {
    const g = this.g;
    for (const id of g.house.outDoors[g.roomState.roomId] ?? []) if (g.doors.isLocked(id)) { const r = g.doors.rec(id); r.unlocked = true; r.state = 'unlocked'; }
    g.refreshView();
  }
  private revealHere() {
    const g = this.g;
    for (const id of g.house.outDoors[g.roomState.roomId] ?? []) if (g.house.doors[id].hidden) g.doors.rec(id).revealed = true;
    g.refreshView();
  }

  private here() {
    const g = this.g;
    const r = g.currentRoomDef()!;
    const doors = (g.house.outDoors[r.id] ?? []).map(id => g.house.doors[id]).map(d => `${d.id} #${d.displayNumber} ${d.side} ${d.type} → ${d.to}${d.lock ? ' 🔒' + d.lock : ''}${d.hidden ? ' (oculta)' : ''} [${g.doors.state(d.id)}]`);
    const inc = (g.house.inDoors[r.id] ?? []).map(id => `${id} de ${g.house.doors[id].origin}`);
    this.print(`${r.id} "${r.title}" ${r.category} ${r.region} ${r.theme} depth=${r.depth.toFixed(2)} tags=${r.tags.join(',')}\n\nSAÍDAS:\n${doors.join('\n')}\n\nENTRADAS:\n${inc.join('\n')}\n\nNPCs aqui: ${g.npcs.presentIn(r.id).map(n => n.npc).join(', ') || '—'}`);
  }

  private validate() {
    this.report = validateHouse(this.g.house);
    const r = this.report;
    this.print([
      `Salas: ${r.totals.rooms} · Portas: ${r.totals.doors} · Fechaduras: ${r.totals.locks} · Chaves: ${r.totals.keys}`,
      `Puzzles: ${r.totals.puzzles} · Eventos: ${r.totals.events} · Personagens: ${r.totals.characters} · Diálogos: ${r.totals.dialogues} · Lore: ${r.totals.lore} · Itens: ${r.totals.items}`,
      `Portas órfãs: ${r.orphanDoors.length} · Salas inacessíveis: ${r.unreachableRooms.length} · Salas sem saída: ${r.deadEnds.length}`,
      `Conexões sem retorno: ${r.noReturn} · Só com chaves/segredos: ${r.unreachableWithoutLocks.length}`,
      `Final alcançável: ${r.finalReachable} · menor caminho: ${r.shortestToFinal} salas · rotas mínimas: ${r.routesToFinal} · entradas na antecâmara: ${r.entrancesToAntechamber}`,
      `Chaves sem porta: ${r.keysWithoutDoor.join(', ') || '—'} · Fechaduras impossíveis: ${r.impossibleLocks.join(', ') || '—'}`,
      `Chaves inacessíveis: ${r.inaccessibleKeys.join(', ') || '—'} · Portas essenciais bloqueadas: ${r.essentialBlocked.join(', ') || '—'}`,
      '', `ERROS (${r.errors.length}):`, ...r.errors.map(e => ' ✗ ' + e), `AVISOS (${r.warnings.length}):`, ...r.warnings.map(w => ' ! ' + w),
    ].join('\n'));
  }

  private locks() {
    const g = this.g;
    const lines = Object.values(g.house.locks).map(L => {
      const d = g.house.doors[L.door];
      return `${L.id}: ${d?.origin}→${d?.to} [${L.lockType}] ${L.methods.map(m => m.kind).join('/')} ${g.doors.isLocked(L.door) ? 'TRANCADA' : 'aberta'}${L.relock === 'eachRun' ? ' (retranca)' : ''}`;
    });
    const keys = Object.values(ITEMS).filter(i => i.key).map(i => `${i.id}: ${(g.house.keySources[i.id] ?? []).join(',') || 'npc/evento'} ${g.meta.keyring[i.id]?.found ? '✓' : ''}`);
    this.print('FECHADURAS\n' + lines.join('\n') + '\n\nCHAVES (onde aparecem)\n' + keys.join('\n'));
  }

  private async sim() {
    this.print('simulando 8 explorações...');
    const r = await simulate(8, 400, Date.now() % 1000);
    this.print(JSON.stringify(r, null, 2));
  }

  private exportSave() {
    const s = JSON.stringify(this.g.snapshot(), null, 1);
    navigator.clipboard?.writeText(s).then(() => this.print('save copiado (' + s.length + ' bytes)'), () => this.print(s.slice(0, 4000)));
  }
}
