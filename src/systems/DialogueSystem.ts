import type { GameManager } from '../core/GameManager';
import type { DialogueChoice, DialogueDefinition, DialogueNode, TradeOffer } from '../core/types';
import { DIALOGUE } from '../data/dialogues';
import { CHAR } from '../data/characters';
import { evalCond } from './Conditions';
import { ITEMS } from '../data/items';

/** Dialogue state machine. The UI renders nodes; consequences stay diegetic (no numbers). */
export class DialogueSystem {
  constructor(private g: GameManager) {}

  get(id: string): DialogueDefinition | undefined { return DIALOGUE[id]; }

  nodeText(n: DialogueNode): string {
    for (const a of n.alt ?? []) if (evalCond(a.cond, this.g)) return a.text;
    return n.text;
  }

  speakerName(n: DialogueNode, dlg: DialogueDefinition): string {
    const sp = n.speaker ?? dlg.npc;
    if (!sp || sp === 'self') return '';
    return this.g.npcs.displayName(sp) || CHAR[sp]?.unknownName || '';
  }

  choices(n: DialogueNode): DialogueChoice[] {
    return (n.choices ?? []).filter(c => evalCond(c.cond, this.g));
  }

  trades(n: DialogueNode): (TradeOffer & { affordable: boolean; label: string })[] {
    return (n.trade ?? []).filter(t => evalCond(t.cond, this.g) && !(ITEMS[t.get]?.permanent && this.g.inventory.has(t.get))).map(t => {
      const frag = t.give.startsWith('fragments:') ? parseInt(t.give.split(':')[1], 10) : 0;
      const affordable = frag ? this.g.meta.fragments >= frag : this.g.inventory.has(t.give);
      const giveLabel = frag ? `${frag} fragmento${frag > 1 ? 's' : ''} de memória` : ITEMS[t.give]?.name ?? t.give;
      const getName = ITEMS[t.get]?.key ? this.g.keys.displayName(t.get) : ITEMS[t.get]?.name ?? t.get;
      return { ...t, affordable, label: `${getName} ← ${giveLabel}` };
    });
  }

  async enterNode(n: DialogueNode, dlg: DialogueDefinition): Promise<void> {
    await this.g.effects.run(n.effects, dlg.id);
  }

  async choose(c: DialogueChoice, dlg: DialogueDefinition): Promise<void> {
    if (c.remember && dlg.npc) this.g.npcs.apply({ type: 'npc', npc: dlg.npc, memory: c.remember });
    await this.g.effects.run(c.effects, dlg.id);
  }

  async trade(t: TradeOffer): Promise<boolean> {
    const g = this.g;
    if (t.give.startsWith('fragments:')) {
      const n = parseInt(t.give.split(':')[1], 10);
      if (g.meta.fragments < n) return false;
      g.meta.fragments -= n;
    } else {
      if (!g.inventory.has(t.give)) return false;
      g.inventory.remove(t.give);
    }
    await g.inventory.add(t.get);
    if (t.line) await g.ui.text(t.line, { speaker: 'O Mercador' });
    return true;
  }
}
