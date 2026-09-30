// Title and the first seconds: black screen, breathing, a bulb lights up. Three simple doors.
import type { GameManager } from '../core/GameManager';
import type { UIController } from './UIController';
import { h } from './dom';

export function logo(): HTMLElement {
  // A small door lives inside the "O" of DOORS.
  return h('h1', { class: 'logo' }, 'A THOUSAND D', h('span', { class: 'door', 'aria-hidden': 'true' }), 'ORS');
}

export function showTitle(g: GameManager, ui: UIController): Promise<'continue' | 'new'> {
  return new Promise(res => {
    ui.setHudVisible(false);
    const hasProgress = g.meta.introDone || !!g.run;
    const el = h('div', { class: 'cine interactive' });
    const go = (r: 'continue' | 'new') => { g.audio.unlock(); el.style.transition = 'opacity 1.2s'; el.style.opacity = '0'; setTimeout(() => { el.remove(); res(r); }, 1200); };
    const menu = h('div', { class: 'cine-menu' },
      hasProgress ? h('button', { onclick: () => go('continue') }, 'Continuar') : null,
      h('button', { onclick: async () => {
        if (hasProgress) {
          const i = await ui.choice('Começar de novo apaga tudo que a Casa lembra de você.', ['Começar de novo', 'Voltar']);
          if (i !== 0) return;
          await g.resetAll();
        }
        go('new');
      } }, hasProgress ? 'Esquecer tudo' : 'Entrar'),
      h('button', { onclick: () => ui.panel('settings') }, 'Opções'),
    );
    el.append(logo(), h('div', { class: 'tagline' }, 'O destino pode ser o mesmo. O caminho nunca será.'), menu,
      h('div', { class: 'small', style: { position: 'absolute', bottom: '18px' } }, 'toque para interagir · segure para examinar · fones recomendados'));
    ui.root.appendChild(el);
  });
}

/** The intro: fast, almost wordless. */
export async function playIntro(g: GameManager, ui: UIController): Promise<void> {
  const black = h('div', { class: 'cine', style: { background: '#000' } });
  ui.root.appendChild(black);
  g.audio.unlock();
  g.audio.play('breath', { volume: 0.8 });
  await wait(2200);
  black.appendChild(h('div', { class: 'phrase', style: { fontSize: '22px', color: 'var(--text2)', fontStyle: 'italic' } }, 'Você não lembra de ter dormido.'));
  await wait(2400);
  g.audio.play('bulb_pop', { volume: 0.4 });
  black.style.transition = 'opacity 1.6s'; black.style.opacity = '0';
  g.meta.introDone = true;
  const start = g.startRun();
  await wait(1700);
  black.remove();
  ui.setHudVisible(true);
  await start;
  await wait(900);
  ui.text('Três portas.', { style: 'whisper' });
  await wait(2600);
  ui.text('Toque numa porta para abrir. Segure para observar. Você pode se virar.', { style: 'system' });
}

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }
