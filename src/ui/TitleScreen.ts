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
  // 0:00 — antes de qualquer imagem, algo já está errado.
  const black = h('div', { class: 'cine', style: { background: '#000' } });
  ui.root.appendChild(black);
  g.audio.unlock();
  g.audio.play('breath', { volume: 0.8 });
  await wait(2000);
  const line = (t: string) => { const el = h('div', { class: 'phrase', style: { fontSize: '22px', color: 'var(--text2)', fontStyle: 'italic', transition: 'opacity 1s' } }, t); black.replaceChildren(el); return el; };
  line('Você não lembra de ter dormido.');
  await wait(2300);
  g.audio.play('knock', { behind: true, volume: 0.7 });
  await wait(1500);
  line('Alguém bate. Atrás de você.');
  await wait(2000);
  g.audio.play('bulb_pop', { volume: 0.45 });
  black.style.transition = 'opacity 1.6s'; black.style.opacity = '0';
  g.meta.introDone = true;
  const start = g.startRun();
  await wait(1700);
  black.remove();
  ui.setHudVisible(true);
  await start;
  await wait(800);
  ui.text('Uma lâmpada. Três portas. Nenhuma lembrança de como chegou aqui.', { style: 'whisper' });
}

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }
