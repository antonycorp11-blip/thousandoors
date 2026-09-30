import type { GameManager } from '../core/GameManager';
import type { ItemDefinition } from '../core/types';
import { ITEMS } from '../data/items';
import { bus } from '../core/EventBus';

/** Limited inventory. Keys live on a separate keyring; memories go to the permanent collection. */
export class InventorySystem {
  constructor(private g: GameManager) {}

  get capacity(): number { return 5 + (this.g.meta.upgrades.includes('bolso_extra') ? 1 : 0); }
  def(id: string): ItemDefinition | undefined { return ITEMS[id]; }

  items(): string[] { return this.g.run?.inventory ?? []; }
  slotItems(): string[] { return this.items().filter(i => !ITEMS[i]?.key); }
  keyItems(): string[] { return this.items().filter(i => ITEMS[i]?.key); }
  collection(): string[] { return this.g.meta.collection; }

  has(id: string): boolean {
    return this.items().includes(id) || this.g.meta.collection.includes(id);
  }
  hasTag(tag: string): boolean {
    return this.items().some(i => ITEMS[i]?.tags?.includes(tag));
  }

  /** Adds an item. Returns false when the player declined because the inventory is full. */
  async add(id: string, silent = false): Promise<boolean> {
    const def = ITEMS[id];
    if (!def) { console.warn('[inv] unknown item', id); return false; }
    const run = this.g.run;
    if (def.permanent || def.category === 'memoria') {
      if (!this.g.meta.collection.includes(id)) {
        this.g.meta.collection.push(id);
        if (!silent) this.g.ui.toast(`Guardado na memória: ${def.name}`);
        bus.emit('inventory');
      }
      return true;
    }
    if (!run) return false;
    if (def.key) {
      if (!run.inventory.includes(id)) run.inventory.push(id);
      await this.g.keys.onPickup(id, silent);
      bus.emit('inventory');
      return true;
    }
    if (this.slotItems().length >= this.capacity) {
      const opts = this.slotItems().map(i => ({ text: `Largar ${ITEMS[i].name}`, value: i }));
      opts.push({ text: `Deixar ${def.name} aqui`, value: '' });
      const pick = await this.g.ui.choice(`Bolsos cheios. ${def.name}...`, opts.map(o => o.text));
      const chosen = opts[pick]?.value;
      if (!chosen) return false;
      this.remove(chosen);
      this.g.ui.toast(`Você largou ${ITEMS[chosen].name}.`);
    }
    run.inventory.push(id);
    if (!silent) this.g.ui.toast(`${def.name}`);
    this.g.audio.play('pickup');
    this.g.journal.add('objetos', `Encontrei ${def.name.toLowerCase()} (${this.g.roomLabel(run.currentRoom)}).`, 'item_' + id);
    this.g.events.fire('pickup', { salt: id });
    bus.emit('inventory');
    return true;
  }

  remove(id: string): boolean {
    const run = this.g.run;
    if (!run) return false;
    const i = run.inventory.indexOf(id);
    if (i < 0) return false;
    run.inventory.splice(i, 1);
    bus.emit('inventory');
    return true;
  }

  async use(id: string): Promise<void> {
    const def = ITEMS[id];
    if (!def) return;
    if (def.read) { await this.g.effects.run([{ type: 'read', lore: def.read }]); }
    if (def.use) {
      await this.g.effects.run(def.use);
      if (def.category === 'consumivel') this.remove(id);
    }
    if (def.key?.combineWith && this.has(def.key.combineWith)) await this.g.keys.combine(id);
  }

  canUse(id: string): boolean {
    const def = ITEMS[id];
    if (!def) return false;
    return !!(def.use || def.read || (def.key?.combineWith && this.has(def.key.combineWith)));
  }

  useLabel(id: string): string {
    const def = ITEMS[id];
    if (def?.key?.combineWith && this.has(def.key.combineWith)) return 'Juntar metades';
    return def?.useLabel ?? (def?.read ? 'Ler' : 'Usar');
  }
}
