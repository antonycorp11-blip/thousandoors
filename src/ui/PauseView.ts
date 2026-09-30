// Pause menu, accessibility settings and the Reliquary (meta upgrades bought with Memory Fragments).
import type { GameManager } from '../core/GameManager';
import type { UIController } from './UIController';
import type { Settings } from '../core/types';
import { h } from './dom';
import { bus } from '../core/EventBus';

export class PauseView {
  el: HTMLElement;
  private body: HTMLElement;
  private head: HTMLElement;
  constructor(private g: GameManager, private ui: UIController, private close: () => void, private mode: 'pause' | 'settings' | 'upgrades') {
    this.body = h('div', { class: 'panel-body' });
    this.head = h('h2');
    this.el = h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, this.head, h('button', { class: 'close', onclick: close, 'aria-label': 'Fechar' }, '×')), this.body);
    this.render();
  }

  private render() {
    this.body.innerHTML = '';
    if (this.mode === 'pause') this.pause();
    else if (this.mode === 'settings') this.settings();
    else this.upgrades();
  }

  private pause() {
    const g = this.g;
    this.head.textContent = 'A Thousand Doors';
    const item = (label: string, fn: () => void) => h('button', { class: 'btn', style: { display: 'block', width: '100%', textAlign: 'left', marginBottom: '8px', fontFamily: 'var(--font-head)', fontSize: '22px' }, onclick: fn }, label);
    this.body.append(...[
      h('div', { class: 'slots' }, g.run ? `Exploração ${g.run.run} · ${Object.keys(g.run.visited).length} salas nesta exploração · ${Object.keys(g.meta.rooms).length} salas lembradas · ${g.meta.fragments} fragmentos` : `Sala Zero · ${Object.keys(g.meta.rooms).length} salas lembradas · ${g.meta.fragments} fragmentos`),
      item('Continuar', this.close),
      item('Diário', () => this.ui.panel('journal')),
      item('Mapa mental', () => this.ui.panel('map')),
      item('Chaveiro', () => this.ui.panel('keyring')),
      item('Relicário (lembranças)', () => this.ui.panel('upgrades')),
      item('Opções', () => this.ui.panel('settings')),
      g.run ? item('Deixar a Casa te esquecer (encerrar exploração)', async () => { const i = await g.ui.choice('Encerrar esta exploração e voltar à Sala Zero? O que não for lembrança será perdido.', ['Sim', 'Não']); if (i === 0) { this.close(); await g.die('você desistiu'); } }) : null,
      g.debug ? item('Painel de debug (F2)', () => { this.close(); bus.emit('debug:toggle'); }) : null,
      g.debug ? item('Editor de salas (F3)', () => { this.close(); bus.emit('editor:toggle'); }) : null,
      item('Voltar ao título', () => { this.close(); g.save(); location.reload(); }),
    ].filter(Boolean) as HTMLElement[]);
  }

  private settings() {
    const g = this.g;
    this.head.textContent = 'Opções';
    const s = g.settings;
    const range = (label: string, key: keyof Settings) => h('div', { class: 'setting' }, h('span', {}, label), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s[key] as number, oninput: (e: Event) => g.setSetting(key, parseFloat((e.target as HTMLInputElement).value) as any) }));
    const check = (label: string, key: keyof Settings, hint?: string) => h('div', { class: 'setting' }, h('span', {}, label, hint ? h('div', { class: 'meta', style: { fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text2)' } }, hint) : null), h('input', { type: 'checkbox', checked: s[key] ? true : undefined, onchange: (e: Event) => g.setSetting(key, (e.target as HTMLInputElement).checked as any) }));
    const sel = h('select', { onchange: (e: Event) => g.setSetting('textSize', (e.target as HTMLSelectElement).value as any) },
      ...(['small', 'normal', 'large'] as const).map(v => h('option', { value: v, selected: s.textSize === v ? true : undefined }, { small: 'Pequeno', normal: 'Normal', large: 'Grande' }[v])));
    this.body.append(
      range('Volume geral', 'master'), range('Efeitos', 'sfx'), range('Música', 'music'), range('Ambiente', 'ambience'),
      h('div', { class: 'setting' }, h('span', {}, 'Tamanho do texto'), sel),
      check('Reduzir movimento', 'reduceMotion', 'Sem zoom, balanço ou deslizes de câmera.'),
      check('Reduzir flashes', 'reduceFlashes', 'Luzes piscam menos; sem clarões.'),
      check('Alto contraste', 'highContrast'),
      check('Reduzir sustos fortes', 'softScares', 'Os sustos viram descrições. O mistério continua.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', onclick: () => { g.audio.unlock(); g.audio.play('knock', { behind: true }); } }, 'Testar som atrás de você'),
        h('button', { class: 'btn warn', onclick: async () => { const i = await g.ui.choice('Apagar TODA a memória da Casa? Isto não pode ser desfeito.', ['Apagar tudo', 'Cancelar']); if (i === 0) { await g.resetAll(); location.reload(); } } }, 'Apagar save')),
      h('div', { class: 'slots', style: { marginTop: '16px' } }, `Salvamento automático · ${g.saves?.backend ?? 'memória'} · versão do save ${g.meta.version}`),
    );
  }

  private upgrades() {
    const g = this.g;
    this.head.textContent = 'Relicário';
    const inZero = !g.run;
    this.body.append(h('div', { class: 'slots' }, `◆ ${g.meta.fragments} fragmentos de memória. ${inZero ? 'Toque para lembrar.' : 'Só é possível lembrar na Sala Zero.'}`));
    for (const u of g.progress.upgrades()) {
      if (!u.available && !u.owned) continue;
      this.body.appendChild(h('div', { class: 'upg' },
        h('div', { class: 't' }, h('b', {}, u.name), h('div', {}, u.description)),
        u.owned ? h('span', { class: 'cost' }, 'lembrado') : h('span', { class: 'cost' }, `◆ ${u.cost}`),
        !u.owned ? h('button', { class: 'btn', disabled: !u.affordable || !inZero ? true : undefined, style: { opacity: u.affordable && inZero ? '1' : '.4' }, onclick: () => { if (g.progress.buy(u.id)) { this.ui.updateHud(); this.render(); } } }, 'Lembrar') : null));
    }
    if (g.meta.anchors.length) this.body.appendChild(h('div', { class: 'entry' }, `Âncoras fixadas: ${g.meta.anchors.map(a => g.roomLabel(a)).join(', ')}. As portas delas esperam na Sala Zero, atrás de você.`));
  }
}
