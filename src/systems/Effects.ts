// EffectRunner — executes data-driven Effect lists. Async: dialogue, puzzles, reading and choices wait for the UI.
import type { GameManager } from '../core/GameManager';
import type { Effect } from '../core/types';
import { evalCond } from './Conditions';
import { seededFloat, hashStr } from '../core/rng';
import { CHARACTERS } from '../data/characters';

export class EffectRunner {
  constructor(private g: GameManager) {}

  async run(effects: Effect[] | undefined, salt = ''): Promise<void> {
    if (!effects) return;
    for (const e of effects) {
      if (this.g.dead) return;
      await this.one(e, salt);
    }
  }

  private token(v: any): any {
    if (typeof v !== 'string' || !v.startsWith('$')) return v;
    const g = this.g;
    switch (v) {
      case '$now': return g.clockMs();
      case '$room': return g.run?.currentRoom;
      default: return v;
    }
  }

  private text(t: string): string {
    const g = this.g;
    if (t === '$warmth') return g.keys.warmth();
    if (t === '$deadNames') {
      const dead = CHARACTERS.filter(c => g.meta.npcs[c.id] && !g.meta.npcs[c.id].alive).map(c => c.name);
      const base = ['Rui M.', 'Otília B.', 'Visitante nº 3', 'Visitante nº 5', 'Irmão de Joaquim (sem nome)'];
      if (g.meta.flags.sentado_despedida && g.meta.runCount > (g.meta.flags.sentado_despedida_run ?? 0) + 1) base.push('Joaquim R.');
      return `Entre muitos, você lê: ${[...base, ...dead].join(', ')}. E um espaço vazio, já medido, do tamanho de um nome curto.`;
    }
    if (t === '$wrongNumber') {
      const n = parseInt((g.run?.currentRoom ?? 'r001').slice(1), 10);
      return String(n + 1 + (hashStr(String(g.run?.seed)) % 40)).padStart(2, '0') + '.';
    }
    return t;
  }

  private async one(e: Effect, salt: string): Promise<void> {
    const g = this.g;
    const run = g.run;
    switch (e.type) {
      case 'text': await g.ui.text(this.text(e.text), { style: e.style, speaker: e.speaker }); break;
      case 'wait': await sleep(g.settings.reduceMotion ? Math.min(e.ms, 400) : e.ms); break;
      case 'setFlag': {
        const v = this.token(e.value ?? true);
        if (e.scope === 'run') { if (run) run.flags[e.flag] = v; }
        else if (e.scope === 'room') g.roomState.flags[e.flag] = v;
        else { g.meta.flags[e.flag] = v; if (e.flag === 'sentado_despedida') g.meta.flags.sentado_despedida_run = g.meta.runCount; }
        break;
      }
      case 'clearFlag':
        if (e.scope === 'run') { if (run) delete run.flags[e.flag]; }
        else if (e.scope === 'room') delete g.roomState.flags[e.flag];
        else delete g.meta.flags[e.flag];
        break;
      case 'giveItem': await g.inventory.add(e.item, e.silent); break;
      case 'takeItem': g.inventory.remove(e.item); if (!e.silent) g.ui.toast('−'); break;
      case 'damage': await g.damage(e.n, e.cause); break;
      case 'heal': g.heal(e.n); break;
      case 'fragments': g.memory.addFragments(e.n, e.reason); break;
      case 'lore': g.memory.addLore(e.id); if (e.read) await g.ui.read(e.id); break;
      case 'read': g.memory.addLore(e.lore); await g.ui.read(e.lore); break;
      case 'journal': g.journal.add(e.cat, e.text, e.id); break;
      case 'rumor': g.memory.addRumor(e.id); break;
      case 'clue': g.memory.addClue(e.id); break;
      case 'symbol': g.memory.addSymbol(e.id); break;
      case 'revealDoor': {
        const id = g.house.resolve(e.door);
        const r = g.doors.rec(id);
        r.revealed = true;
        if (r.state === 'unknown') r.state = 'seen';
        if (run) run.secrets++;
        g.memory.addFragments(1, 'porta escondida');
        g.fx('reveal', { door: id });
        g.refreshView();
        break;
      }
      case 'hideDoor': {
        let id = e.door;
        if (id === '$observer') {
          const vs = g.doors.visible(run!.currentRoom, 'front').filter(v => !v.door.important && !v.reverse && !v.locked);
          if (vs.length < 2) break;
          id = vs[hashStr(run!.seed + run!.currentRoom) % vs.length].door.id;
        } else id = g.house.resolve(id);
        if (e.scope === 'run' && run) run.doorOverrides[id] = { ...(run.doorOverrides[id] ?? {}), hidden: true };
        else g.roomState.hiddenDoors.add(id);
        g.refreshView();
        break;
      }
      case 'setDoorDest': {
        const id = g.house.resolve(e.door);
        if (e.scope === 'meta') g.meta.doorDestOverrides[id] = e.to;
        else if (run) run.doorOverrides[id] = { ...(run.doorOverrides[id] ?? {}), to: e.to };
        break;
      }
      case 'setDoorState': g.doors.rec(g.house.resolve(e.door)).state = e.state; break;
      case 'unlockDoor': {
        const id = g.house.resolve(e.door);
        const d = g.house.doors[id];
        if (d && g.doors.isLocked(id)) await g.doors.unlock({ door: d, reverse: false, latch: false, entry: false, x: d.x ?? 960, wall: 'back', locked: true, chalk: false, pos: 'center' }, 'event');
        break;
      }
      case 'prop': {
        const room = e.room ?? run?.currentRoom ?? 'r000';
        const ov = { ...(e.hidden !== undefined ? { hidden: e.hidden } : {}), ...(e.x !== undefined ? { x: e.x } : {}), ...(e.side ? { side: e.side } : {}), ...(e.variant ? { variant: e.variant } : {}), ...(e.flip !== undefined ? { flip: e.flip } : {}) };
        const target = e.scope === 'meta' ? g.meta.propOverrides : e.scope === 'visit' ? g.roomState.propOverrides : run?.propOverrides;
        if (target) {
          if (e.scope === 'visit') (g.roomState.propOverrides[e.prop] = { ...(g.roomState.propOverrides[e.prop] ?? {}), ...ov });
          else { const t = target as any; t[room] ??= {}; t[room][e.prop] = { ...(t[room][e.prop] ?? {}), ...ov }; }
        }
        g.refreshView();
        break;
      }
      case 'sound': g.audio.play(e.id, { pan: e.pan, behind: e.behind, volume: e.volume }); break;
      case 'ambience': g.audio.ambience(e.id); break;
      case 'dialogue': await g.ui.dialogue(e.id, e.npc); break;
      case 'puzzle': await g.openPuzzle(e.id); break;
      case 'spawnNpc': g.npcs.spawn(e.npc, e.room ?? run?.currentRoom ?? 'r000', e.side ?? 'front', e.x ?? 1300); g.refreshView(); break;
      case 'removeNpc': g.npcs.despawn(e.npc); g.refreshView(); break;
      case 'npc': g.npcs.apply(e); g.refreshView(); break;
      case 'route': g.memory.route(e.axis, e.n); break;
      case 'flicker': g.fx('flicker', { ms: e.ms ?? 600 }); break;
      case 'shake': g.fx('shake', { intensity: e.intensity ?? 0.004, ms: e.ms ?? 300 }); break;
      case 'darkness': g.fx('darkness', { ms: e.ms }); await sleep(Math.min(e.ms, 2500)); break;
      case 'jumpscare':
        if (g.settings.softScares) { if (e.soft) await g.ui.text(e.soft, { style: 'whisper' }); }
        else { g.fx('jumpscare', { kind: e.kind }); g.audio.play('sting'); await sleep(900); if (e.soft) await g.ui.text(e.soft, { style: 'whisper' }); }
        break;
      case 'apparition': g.fx('apparition', { kind: e.kind, side: e.side ?? g.roomState.facing, x: e.x, ms: e.ms ?? 2500 }); break;
      case 'doorAnim': g.fx('doorAnim', { anim: e.anim }); break;
      case 'teleport': await g.enterRoom(e.room, null, { side: e.side }); break;
      case 'achievement': g.progress.achievement(e.id); break;
      case 'mapNote': (g.meta.map.notes[e.room] ??= []).push(e.text); break;
      case 'revealMap': g.map.reveal(e); break;
      case 'phantomNode': {
        const pick = e.room === '$randomUnvisited' ? g.map.randomUnvisited() : e.room;
        if (pick) g.meta.seenRooms[pick] = 'phantom';
        break;
      }
      case 'uiGlitch': g.ui.glitch(e.text, e.ms ?? 2000); break;
      case 'roomTitle': g.ui.roomTitleOverride(this.text(e.text), e.ms ?? 1500); break;
      case 'choice': {
        const opts = e.options.filter(o => evalCond(o.cond, g));
        const i = await g.ui.choice(e.text ?? '', opts.map(o => o.text), e.speaker);
        await this.run(opts[i]?.effects, salt);
        break;
      }
      case 'kill': await g.die(e.cause); break;
      case 'theoryEvidence': break;
      case 'anchor': g.progress.createAnchor(e.room ?? run?.currentRoom ?? ''); break;
      case 'combineKeys': break;
      case 'stealKey': g.npcs.stealKey(e.npc); break;
      case 'returnKeys': await g.npcs.returnKeys(e.npc); break;
      case 'ending': await g.ending(e.id); break;
      case 'if': await this.run(evalCond(e.cond, g, { salt: salt + ':if' }) ? e.then : e.else, salt); break;
      case 'random': {
        const f = seededFloat(run?.seed ?? 1, (e.salt ?? salt) + (run?.currentRoom ?? '') + (run?.visited[run.currentRoom] ?? 0));
        await this.run(e.options[Math.floor(f * e.options.length)], salt);
        break;
      }
      case 'openDoor': break;
      case 'tilt': g.fx('tilt', { deg: e.deg }); break;
      case 'light': g.fx('light', { level: e.level, ms: e.ms }); break;
      case 'solvePuzzle': await g.puzzles.solve(e.id); break;
      case 'ui': g.ui.panel(e.panel); break;
      case 'startRun': await g.startRun(e.anchor); break;
      case 'pickupKeyChoice': {
        const i = await g.ui.choice(e.text, ['Pegar', 'Deixar']);
        if (i === 0) await g.inventory.add(e.item);
        break;
      }
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
