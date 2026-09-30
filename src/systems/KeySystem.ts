// Keys ↔ locks. Keys are memories of promises; this system decides how a key relates to a door,
// how it wears, and how it hints (without ever saying "this opens door X").
import type { GameManager } from '../core/GameManager';
import type { DoorDefinition, KeyDefinition, KeyRecord, LockDefinition } from '../core/types';
import { ITEMS } from '../data/items';
import { hashStr } from '../core/rng';

export type KeyFit = 'opens' | 'no_turn' | 'no_fit';

export class KeySystem {
  constructor(private g: GameManager) {}

  def(itemId: string): KeyDefinition | undefined { return ITEMS[itemId]?.key; }

  record(itemId: string): KeyRecord {
    const m = this.g.meta;
    return (m.keyring[itemId] ??= { found: false, timesUsed: 0, understood: false, notes: [] });
  }

  /** Name as the player knows it: unknown until understood. */
  displayName(itemId: string): string {
    const k = this.def(itemId);
    if (!k) return ITEMS[itemId]?.name ?? itemId;
    const rec = this.g.meta.keyring[itemId];
    if (k.special === 'impossible') return this.impossibleLook(itemId).name;
    if (rec?.understood) return k.knownNameAfterUse ?? k.name;
    return k.unknownName;
  }

  displayDescription(itemId: string): string {
    const k = this.def(itemId);
    if (!k) return ITEMS[itemId]?.description ?? '';
    if (k.special === 'impossible') return this.impossibleLook(itemId).desc;
    if (k.special === 'warm') return k.description + ' ' + this.warmth();
    return k.description;
  }

  /** The impossible key changes its appearance depending on the room. */
  impossibleLook(_itemId: string): { name: string; desc: string; variant: string } {
    const room = this.g.run?.currentRoom ?? 'r000';
    const looks = [
      { name: 'Chave de ferro (agora)', desc: 'Nesta sala, ela é de ferro e fria.', variant: 'iron' },
      { name: 'Chave de latão (agora)', desc: 'Nesta sala, é de latão, pequena, com marcas na ponta.', variant: 'brass_small' },
      { name: 'Chave de osso (agora)', desc: 'Nesta sala, é branca e leve demais.', variant: 'bone' },
      { name: 'Chave de vidro (agora)', desc: 'Nesta sala, é transparente. Você vê a própria mão através dela.', variant: 'glass' },
      { name: 'Chave dourada (agora)', desc: 'Nesta sala, é dourada. Não confie nisso.', variant: 'gold' },
    ];
    return looks[hashStr(room) % looks.length];
  }

  carried(): string[] { return this.g.inventory.keyItems(); }

  lockOf(door: DoorDefinition): LockDefinition | undefined {
    const id = this.g.house.lockByDoor[door.id];
    return id ? this.g.house.locks[id] : undefined;
  }

  fit(itemId: string, door: DoorDefinition): KeyFit {
    const k = this.def(itemId);
    if (!k) return 'no_fit';
    const lock = this.lockOf(door);
    if (!lock) {
      // "A key that shouldn't exist can open a door that normally has no lock."
      if (k.special === 'unreal' && door.type === 'false') return 'opens';
      return 'no_fit';
    }
    if (!lock.methods.some(m => m.kind === 'key')) return k.special === 'impossible' ? 'no_turn' : 'no_fit';
    const resolvedDoors = (k.opensDoors ?? []).map(r => this.g.house.resolve(r));
    if (resolvedDoors.includes(door.id)) return 'opens';
    if (k.notOpens?.includes(lock.lockType)) return 'no_turn';
    if (k.opensLocks.includes(lock.lockType)) return 'opens';
    if (k.fitsButNoTurn?.includes(lock.lockType)) return 'no_turn';
    if (k.keyType === 'broken' && lock.lockType === 'broken_pair') return 'no_turn';
    return 'no_fit';
  }

  carriedKeyFor(doorId: string): string | undefined {
    const door = this.g.house.doors[doorId];
    if (!door) return undefined;
    return this.carried().find(k => this.fit(k, door) === 'opens');
  }

  /** Pickup: register in the keyring; hint subtly if it matches a lock the player remembers. */
  async onPickup(itemId: string, silent = false): Promise<void> {
    const k = this.def(itemId);
    if (!k) return;
    const rec = this.record(itemId);
    const room = this.g.run?.currentRoom ?? 'r000';
    const firstTime = !rec.found;
    rec.found = true;
    rec.foundIn = rec.foundIn ?? room;
    rec.foundRun = this.g.meta.runCount;
    const name = this.displayName(itemId);
    if (!silent) this.g.ui.toast(name);
    this.g.audio.play('key_pickup');
    this.g.journal.add('chaves', `Encontrei ${lowerFirst(name)} (${this.g.roomLabel(room)}). ${k.description}`, 'key_found_' + itemId);
    // familiarity: a remembered lock (examined earlier) that this key opens
    const familiar = Object.entries(this.g.meta.doors).some(([id, d]) =>
      d.lockExamined && this.g.doors.isLocked(id) && this.g.house.doors[id] && this.fit(itemId, this.g.house.doors[id]) === 'opens');
    if (familiar) {
      this.g.ui.text('Esta chave parece familiar.', { style: 'whisper' });
      if (!rec.notes.includes('familiar')) rec.notes.push('familiar');
    } else if (firstTime && !silent && k.special === 'warm') {
      this.g.ui.text(this.warmth(), { style: 'whisper' });
    }
    const found = Object.values(this.g.meta.keyring).filter(r => r.found).length;
    if (found >= 10) this.g.progress.achievement('ach_chaveiro');
  }

  /** Called after a successful key unlock. Handles wear, consumption and special behaviours. */
  async onUsed(itemId: string, door: DoorDefinition): Promise<void> {
    const k = this.def(itemId);
    const run = this.g.run;
    if (!k || !run) return;
    const rec = this.record(itemId);
    rec.timesUsed++;
    const firstUnderstanding = !rec.understood;
    rec.understood = true;
    rec.notes.push(`Abriu uma porta na ${this.g.roomLabel(door.origin)}.`);
    run.keysUsed++;
    run.keyUses[itemId] = (run.keyUses[itemId] ?? 0) + 1;
    if (firstUnderstanding && k.knownNameAfterUse) this.g.journal.add('chaves', `Agora sei: é a ${k.knownNameAfterUse}.`, 'key_known_' + itemId);
    if (k.uses && run.keyUses[itemId] >= k.uses) {
      this.g.inventory.remove(itemId); rec.broken = true;
      this.g.ui.text('A chave se parte dentro da fechadura. Mas a porta abriu.');
      this.g.audio.play('key_break');
      return;
    }
    if (k.special === 'ephemeral') { this.g.inventory.remove(itemId); this.g.ui.text('A chave se desfaz em cinza entre seus dedos.', { style: 'whisper' }); return; }
    if (k.consumable) { this.g.inventory.remove(itemId); if (k.keyType === 'gold') { this.g.ui.text('A chave dourada fica na fechadura. Você sabe que ela não volta.'); this.g.progress.achievement('ach_escolha'); } return; }
    if (k.special === 'mutant') {
      // "always changes something": an unimportant door somewhere forgets where it led
      const cands = Object.values(this.g.house.doors).filter(d => !d.important && !d.meta && d.to && d.type !== 'false' && d.id !== door.id);
      const idx = hashStr(run.seed + ':' + rec.timesUsed) % cands.length;
      const target = cands[idx];
      const rooms = this.g.house.roomIds.filter(r => r !== 'r000' && r !== 'r334' && r !== 'r333');
      run.doorOverrides[target.id] = { ...(run.doorOverrides[target.id] ?? {}), to: rooms[hashStr(target.id + run.seed) % rooms.length] };
      this.g.ui.text('Em algum lugar da Casa, uma porta mudou de ideia.', { style: 'whisper' });
      this.g.journal.add('chaves', 'Cada vez que uso a chave torta, algo muda de lugar na Casa.', 'mutant_rule');
    }
  }

  /** Glass keys break when the player is hurt. */
  onDamage(): void {
    for (const id of this.carried()) {
      if (this.def(id)?.special === 'glass') {
        this.g.inventory.remove(id);
        this.record(id).broken = true;
        this.g.ui.text('Algo se quebra no seu bolso. A chave de vidro.', { style: 'whisper' });
        this.g.audio.play('glass_break');
      }
    }
  }

  async combine(itemId: string): Promise<void> {
    const k = this.def(itemId);
    if (!k?.combineWith || !k.combineInto) return;
    if (!this.g.inventory.has(k.combineWith)) return;
    this.g.inventory.remove(itemId);
    this.g.inventory.remove(k.combineWith);
    await this.g.inventory.add(k.combineInto);
    this.g.ui.text('As duas metades encaixam. Você as prende com arame. Vai ter que aguentar.');
  }

  /** Warm key: gets warmer as the player approaches the right door (graph distance). */
  warmth(): string {
    const warmLock = Object.values(this.g.house.locks).find(l => l.lockType === 'warm');
    const room = this.g.run?.currentRoom;
    if (!warmLock || !room) return '';
    const origin = this.g.house.doors[warmLock.door]?.origin;
    if (!origin) return '';
    if (!this.g.doors.isLocked(warmLock.door)) return 'A chave está fria agora. Cumpriu o que tinha para cumprir.';
    const dist = this.g.graph.distance(room, origin, 4);
    if (dist === 0) return 'A chave queima no seu bolso.';
    if (dist === 1) return 'A chave está muito quente.';
    if (dist === 2) return 'A chave está mais quente.';
    if (dist <= 4) return 'A chave está morna.';
    return 'A chave esfriou um pouco.';
  }

  /** With the "Mão Sensível" upgrade, any carried key reacts in a room with its lock. */
  senseHere(): string | null {
    if (!this.g.meta.upgrades.includes('calor')) return null;
    const room = this.g.run?.currentRoom;
    if (!room) return null;
    for (const dId of this.g.house.outDoors[room] ?? []) {
      const d = this.g.house.doors[dId];
      if (!this.g.doors.isLocked(d.id)) continue;
      if (this.carried().some(k => this.fit(k, d) === 'opens')) return 'Uma das suas chaves parece atenta nesta sala.';
    }
    return null;
  }

  /** Death: which keys survive. */
  survivingKeys(): string[] {
    const keep: string[] = [];
    let special = this.g.meta.upgrades.includes('chaveiro_memoria');
    for (const id of this.carried()) {
      const k = this.def(id)!;
      if (k.persistentAcrossRuns) { keep.push(id); continue; }
      if (special && !['plain', 'iron', 'brass', 'rusty', 'ephemeral'].includes(k.keyType)) { keep.push(id); special = false; }
    }
    return keep;
  }
}

function lowerFirst(s: string) { return s.charAt(0).toLowerCase() + s.slice(1); }
