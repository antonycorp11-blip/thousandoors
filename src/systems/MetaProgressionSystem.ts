// Meta progression: upgrades bought with Memory Fragments, anchors, diegetic achievements, run history.
import type { GameManager } from '../core/GameManager';
import { ACHIEVEMENTS, UPGRADES } from '../data/lore';
import { evalCond } from './Conditions';
import { bus } from '../core/EventBus';

export class MetaProgressionSystem {
  constructor(private g: GameManager) {}

  achievement(id: string): void {
    const m = this.g.meta;
    if (m.achievements.includes(id)) return;
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a) return;
    m.achievements.push(id);
    this.g.ui.achievement(a.title, a.description);
    this.g.audio.play('achievement');
  }

  upgrades() {
    const m = this.g.meta;
    return UPGRADES.map(u => ({
      ...u,
      owned: m.upgrades.includes(u.id),
      available: (u.requires ?? []).every(r => m.upgrades.includes(r)) && evalCond(u.cond, this.g),
      affordable: m.fragments >= u.cost,
    }));
  }

  buy(id: string): boolean {
    const m = this.g.meta;
    const u = UPGRADES.find(x => x.id === id);
    if (!u || m.upgrades.includes(id) || m.fragments < u.cost) return false;
    if ((u.requires ?? []).some(r => !m.upgrades.includes(r))) return false;
    m.fragments -= u.cost;
    m.upgrades.push(id);
    this.g.journal.add('memorias', `Lembrei de algo útil: ${u.name}.`, 'upg_' + id);
    this.g.audio.play('upgrade');
    bus.emit('hud');
    this.g.save();
    return true;
  }

  canAnchor(room: string): boolean {
    const r = this.g.house.rooms[room];
    return !!r?.anchorable && this.g.meta.upgrades.includes('ancoras') && !this.g.meta.anchors.includes(room) && this.g.meta.anchors.length < 3;
  }

  createAnchor(room: string): boolean {
    if (!this.canAnchor(room)) return false;
    const m = this.g.meta;
    if (!this.g.inventory.has('fita_vermelha') && m.fragments < 5) { this.g.ui.text('Você precisa de algo para amarrar a lembrança: uma fita vermelha, ou cinco fragmentos de memória.'); return false; }
    if (this.g.inventory.has('fita_vermelha')) this.g.inventory.remove('fita_vermelha'); else m.fragments -= 5;
    m.anchors.push(room);
    this.g.ui.text('Você amarra a lembrança desta sala em você. Na Sala Zero, uma porta nova vai estar esperando.');
    this.g.journal.add('salas', `Fixei uma âncora de memória na ${this.g.roomLabel(room)}.`, 'anchor_' + room);
    this.achievement('ach_ancora');
    this.g.save();
    return true;
  }

  /** Room Zero evolves with progress (see authored r000 props conditions). */
  roomZeroStage(): number {
    const m = this.g.meta;
    return [m.deaths >= 1, m.lore.length >= 2, m.fragmentsTotal >= 3, m.collection.length >= 1, m.anchors.length >= 1, m.runCount >= 4].filter(Boolean).length;
  }
}
