// Puzzle UIs: code wheels, clock, sequences (with sound), ordering, lights, choices, symbol dials.
import type { GameManager } from '../core/GameManager';
import type { UIController } from './UIController';
import type { PuzzleDefinition } from '../core/types';
import { SYMBOLS } from '../data/puzzles';
import { h } from './dom';

export class PuzzleView {
  constructor(private g: GameManager, private ui: UIController) {}

  open(id: string): Promise<boolean> {
    const p = this.g.puzzles.def(id);
    if (!p) return Promise.resolve(false);
    if (p.type === 'doors') { this.g.ui.text('A resposta está nas próprias portas.'); return Promise.resolve(false); }
    return new Promise(res => {
      this.ui.modal++;
      const body = h('div');
      const box = h('div', { class: 'puzzle-box' }, h('h3', {}, p.title), h('p', {}, p.prompt), body);
      const wrap = h('div', { class: 'puzzle interactive' }, box);
      this.ui.root.appendChild(wrap);
      const finish = (ok: boolean) => { wrap.remove(); this.ui.modal--; res(ok); };
      const submit = async (answer: any) => {
        if (this.g.puzzles.check(p, answer)) { finish(true); await this.g.puzzles.solve(p.id); }
        else { box.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 240 }); await this.g.puzzles.fail(p.id); if (this.g.dead) finish(false); }
      };
      const actions = (getAnswer: () => any) => h('div', { class: 'pz-actions' },
        h('button', { class: 'ghost', onclick: () => finish(false) }, 'Deixar para depois'),
        h('button', { onclick: () => submit(getAnswer()) }, 'Tentar'));
      this.render(p, body, actions, submit);
    });
  }

  private render(p: PuzzleDefinition, body: HTMLElement, actions: (fn: () => any) => HTMLElement, submit: (a: any) => void) {
    const g = this.g;
    switch (p.type) {
      case 'code': {
        const chars: string = p.config.charset;
        const vals = Array(p.config.digits).fill(0);
        const row = h('div', { class: 'pz-row' });
        vals.forEach((_, i) => {
          const v = h('div', { class: 'val' }, chars[0]);
          const set = (d: number) => { vals[i] = (vals[i] + d + chars.length) % chars.length; v.textContent = chars[vals[i]]; g.audio.play('tick', { volume: 0.4 }); };
          row.appendChild(h('div', { class: 'pz-wheel' }, h('button', { onclick: () => set(1), 'aria-label': 'subir' }, '▲'), v, h('button', { onclick: () => set(-1), 'aria-label': 'descer' }, '▼')));
        });
        body.append(row, actions(() => vals.map(i => chars[i]).join('')));
        break;
      }
      case 'symbols': {
        const syms: string[] = p.config.symbols;
        const vals = Array(p.config.length).fill(0);
        const row = h('div', { class: 'pz-row' });
        vals.forEach((_, i) => {
          const v = h('div', { class: 'val' }, SYMBOLS[syms[0]]?.glyph ?? syms[0]);
          const set = (d: number) => { vals[i] = (vals[i] + d + syms.length) % syms.length; v.textContent = SYMBOLS[syms[vals[i]]]?.glyph ?? syms[vals[i]]; g.audio.play('stone_scrape', { volume: 0.3 }); };
          row.appendChild(h('div', { class: 'pz-wheel' }, h('button', { onclick: () => set(1) }, '▲'), v, h('button', { onclick: () => set(-1) }, '▼')));
        });
        body.append(row, actions(() => vals.map(i => syms[i])));
        break;
      }
      case 'clock': {
        let hh = 12, mm = 0;
        const face = h('div', { class: 'clock-face' });
        const hand = (len: number, w: number) => { const el = h('div', { class: 'hand', style: { height: len + 'px', width: w + 'px', marginLeft: -w / 2 + 'px' } }); face.appendChild(el); return el; };
        const hr = hand(58, 6), mn = hand(86, 4);
        const label = h('div', { class: 'pz-seq' });
        const draw = () => { hr.style.transform = `rotate(${(hh % 12) * 30 + mm * 0.5}deg)`; mn.style.transform = `rotate(${mm * 6}deg)`; label.textContent = `${hh}:${String(mm).padStart(2, '0')}`; };
        const adj = (dh: number, dm: number) => { mm += dm; if (mm >= 60) { mm -= 60; hh++; } if (mm < 0) { mm += 60; hh--; } hh += dh; hh = ((hh - 1 + 12) % 12) + 1; g.audio.play('tick', { volume: 0.3 }); draw(); };
        draw();
        body.append(face, label, h('div', { class: 'pz-row' },
          h('button', { class: 'pz-btn', onclick: () => adj(-1, 0) }, '− hora'), h('button', { class: 'pz-btn', onclick: () => adj(1, 0) }, '+ hora'),
          h('button', { class: 'pz-btn', onclick: () => adj(0, -1) }, '− min'), h('button', { class: 'pz-btn', onclick: () => adj(0, 1) }, '+ min'),
          h('button', { class: 'pz-btn', onclick: () => adj(0, 5) }, '+5')), actions(() => ({ h: hh, m: mm })));
        break;
      }
      case 'sequence': {
        const seq: number[] = [];
        const shown = h('div', { class: 'pz-seq' });
        const len = p.config.length;
        const row = h('div', { class: 'pz-row' }, ...p.config.buttons.map((b: string, i: number) => h('button', { class: 'pz-btn', onclick: () => {
          if (p.config.notes) g.audio.note(p.config.notes[i]); else g.audio.play('bell', { volume: 0.4 });
          seq.push(i); shown.textContent = seq.map(s => '•').join(' ');
          if (seq.length >= len) { const a = seq.slice(); seq.length = 0; setTimeout(() => { shown.textContent = ''; submit(a); }, 350); }
        } }, b)));
        body.append(shown, row, actions(() => seq.slice()));
        (body.querySelector('.pz-actions button:last-child') as HTMLElement).style.display = 'none';
        break;
      }
      case 'order': {
        const items: string[] = p.config.items.slice();
        let sel = -1;
        const list = h('div', { class: 'pz-order' });
        const draw = () => { list.innerHTML = ''; items.forEach((it, i) => list.appendChild(h('button', { class: 'pz-btn' + (i === sel ? ' sel' : ''), onclick: () => { if (sel < 0) sel = i; else { [items[sel], items[i]] = [items[i], items[sel]]; sel = -1; g.audio.play('paper', { volume: 0.4 }); } draw(); } }, `${i + 1}. ${it}`))); };
        draw();
        body.append(h('p', {}, 'Toque em dois itens para trocá-los de lugar.'), list, actions(() => items.slice()));
        break;
      }
      case 'lights': {
        const { w, h: hh } = p.config;
        const state = p.config.initial.split('').map((c: string) => c === '1');
        const grid = h('div', { class: 'pz-grid', style: { gridTemplateColumns: `repeat(${w}, 64px)` } });
        const draw = () => { grid.innerHTML = ''; state.forEach((on: boolean, i: number) => grid.appendChild(h('button', { class: 'pz-btn' + (on ? ' lit' : ''), 'aria-label': 'interruptor', onclick: () => press(i) }))); };
        const press = (i: number) => {
          const x = i % w, y = Math.floor(i / w);
          for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < hh) state[ny * w + nx] = !state[ny * w + nx]; }
          g.audio.play('tick', { volume: 0.4 });
          draw();
          const s = state.map((b: boolean) => (b ? '1' : '0')).join('');
          if (s === p.solution) setTimeout(() => submit(s), 400);
        };
        draw();
        body.append(grid, h('div', { class: 'pz-actions' }, h('button', { class: 'ghost', onclick: () => { state.splice(0, state.length, ...p.config.initial.split('').map((c: string) => c === '1')); draw(); } }, 'Recomeçar')), actions(() => state.map((b: boolean) => (b ? '1' : '0')).join('')));
        break;
      }
      case 'choice': {
        body.append(h('div', { class: 'pz-order' }, ...p.config.options.map((o: string, i: number) => h('button', { class: 'pz-btn', onclick: () => submit(i) }, o))), actions(() => -1));
        (body.querySelector('.pz-actions button:last-child') as HTMLElement).style.display = 'none';
        break;
      }
    }
  }
}
