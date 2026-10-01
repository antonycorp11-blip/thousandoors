// Dialogue: elegant overlay near the bottom, short lines, choices, trades. No numbers, ever.
import type { GameManager } from '../core/GameManager';
import type { UIController } from './UIController';
import type { DialogueDefinition, DialogueNode } from '../core/types';
import { h } from './dom';

export class DialogueView {
  constructor(private g: GameManager, private ui: UIController) {}

  open(id: string, npc?: string): Promise<void> {
    const dlg = this.g.dialogue.get(id);
    if (!dlg) return Promise.resolve();
    return new Promise(async res => {
      this.ui.modal++;
      const who = h('div', { class: 'who' });
      const line = h('div', { class: 'line' });
      const choices = h('div', { class: 'choices' });
      const cont = h('div', { class: 'cont' });
      const box = h('div', { class: 'dialogue interactive' }, who, line, choices, cont);
      // a caixa fica do lado oposto de quem fala, para o personagem continuar visível
      const who0 = npc ?? dlg.npc;
      const here = who0 ? this.g.npcs.presentIn(this.g.roomState.roomId).find(p => p.npc === who0) : undefined;
      if (here) box.classList.add(here.x < 960 ? 'side-right' : 'side-left');
      this.ui.root.appendChild(box);
      this.ui.root.classList.add('in-dialogue');
      const end = () => { box.remove(); this.ui.modal--; this.ui.root.classList.remove('in-dialogue'); res(); };
      let nodeId: string | null = dlg.start;
      while (nodeId) {
        const node: DialogueNode | undefined = dlg.nodes[nodeId];
        if (!node) break;
        nodeId = await this.show(dlg, node, who, line, choices, cont, npc);
        if (this.g.dead) break;
      }
      end();
    });
  }

  private show(dlg: DialogueDefinition, node: DialogueNode, who: HTMLElement, line: HTMLElement, choices: HTMLElement, cont: HTMLElement, _npc?: string): Promise<string | null> {
    return new Promise(async res => {
      const g = this.g;
      who.textContent = g.dialogue.speakerName(node, dlg);
      const text = g.dialogue.nodeText(node);
      choices.innerHTML = '';
      cont.textContent = '';
      await this.type(line, text);
      await g.dialogue.enterNode(node, dlg);
      const opts = g.dialogue.choices(node);
      const trades = g.dialogue.trades(node);
      if (trades.length) {
        for (const t of trades) {
          const b = h('button', { disabled: !t.affordable, onclick: async (e: Event) => { e.stopPropagation(); if (await g.dialogue.trade(t)) { b.setAttribute('disabled', 'true'); b.textContent = '✓ ' + t.label; } } }, t.label);
          choices.appendChild(b);
        }
        choices.appendChild(h('button', { onclick: (e: Event) => { e.stopPropagation(); res(node.next ?? null); } }, 'Nada, obrigado.'));
        return;
      }
      if (opts.length) {
        choices.classList.toggle('many', opts.length >= 3);
        for (const c of opts) choices.appendChild(h('button', { onclick: async (e: Event) => { e.stopPropagation(); choices.innerHTML = ''; await g.dialogue.choose(c, dlg); res(c.next ?? null); } }, c.text));
        return;
      }
      cont.textContent = node.next ? 'toque ▸' : 'toque';
      const box = line.parentElement!;
      const once = (e: Event) => { e.stopPropagation(); box.removeEventListener('click', once); res(node.next ?? null); };
      setTimeout(() => box.addEventListener('click', once), 150);
    });
  }

  private type(el: HTMLElement, text: string): Promise<void> {
    return new Promise(res => {
      if (this.g.settings.reduceMotion) { el.textContent = text; res(); return; }
      el.textContent = '';
      let i = 0;
      const box = el.parentElement!;
      const skip = (e: Event) => { e.stopPropagation(); i = text.length; };
      box.addEventListener('click', skip);
      const step = () => {
        i = Math.min(text.length, i + 2);
        el.textContent = text.slice(0, i);
        if (i < text.length) setTimeout(step, 22);
        else { box.removeEventListener('click', skip); res(); }
      };
      step();
    });
  }
}
