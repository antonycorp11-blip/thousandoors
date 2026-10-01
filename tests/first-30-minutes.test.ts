// Joga a primeira sessão inteira, sem interface, seguindo o roteiro de FIRST_30_MINUTES.md.
import { describe, expect, it } from 'vitest';
import { GameManager, HEADLESS_UI } from '../src/core/GameManager';

const flush = () => new Promise(r => setTimeout(r, 30));

/** Percorre um diálogo escolhendo a primeira opção cujo texto contenha um dos termos. */
function dialogueWalker(g: GameManager, picks: string[]) {
  return async (id: string) => {
    const dlg = g.dialogue.get(id)!;
    let nodeId: string | null = dlg.start;
    let guard = 0;
    while (nodeId && guard++ < 20) {
      const node: any = dlg.nodes[nodeId];
      await g.dialogue.enterNode(node, dlg);
      const choices = g.dialogue.choices(node);
      if (node.trade?.length) { nodeId = node.next ?? null; continue; }
      if (!choices.length) { nodeId = node.next ?? null; continue; }
      const c = choices.find(ch => picks.some(p => ch.text.includes(p))) ?? choices[0];
      await g.dialogue.choose(c, dlg);
      nodeId = c.next ?? null;
    }
  };
}

async function walkTo(g: GameManager, target: string) {
  for (const side of ['front', 'back'] as const) {
    const v = g.rooms.view(g.roomState.roomId, side).doors.find(d => !d.locked && g.doors.resolveTo(d.door, d.reverse) === target);
    if (v) { g.roomState.facing = side; await g.openDoor(v); await flush(); return; }
  }
  throw new Error(`sem porta de ${g.roomState.roomId} para ${target}`);
}

describe('os primeiros 30 minutos', () => {
  it('leva do bilhete à mão pequena e à Sala Zero', async () => {
    const g = new GameManager({ headless: true });
    g.director.fast = true;
    const picks: string[] = [];
    g.ui = { ...HEADLESS_UI, dialogue: async (id: string) => dialogueWalker(g, picks)(id) };

    // 0:00 — Sala 1: batidas atrás de você
    await g.startRun();
    await flush();
    expect(g.meta.flags.ob_knock).toBe(true);
    expect(g.investigation.active()?.id).toBe('batidas');

    // 0:30 — o bilhete com a sua letra
    await g.turn(); await flush();
    expect(g.meta.flags.ob_note_seen).toBe(true);
    const note = g.currentView().props.find(p => p.id === 'bilhete');
    expect(note).toBeDefined();
    await g.propAct('bilhete', 0);
    expect(g.meta.lore).toContain('bilhete_t0');
    g.investigation.refresh();
    expect(g.investigation.active()?.id).toBe('homem');

    // a porta trancada vira memória
    await g.turn(); await flush();
    const locked = g.currentView().doors.find(v => v.locked)!;
    g.doors.examineLock(locked);
    expect(g.meta.journal.some(e => e.text.includes('fechadura de latão'))).toBe(true);

    // 2:30 — Joaquim fala primeiro e conta da chave
    picks.splice(0, picks.length, 'Eu te conheço', 'bilhete', 'Obrigado');
    await walkTo(g, 'r002');
    await walkTo(g, 'r005');
    await flush(); await flush();
    expect((g.meta.npcs.sentado?.encounters ?? 0) > 0).toBe(true);
    expect(g.meta.flags.joaquim_chave).toBe(true);

    // 4:00 — a fotografia
    await walkTo(g, 'r007');
    const photoIdx = g.propActions('photo')[0].idx;
    await g.propAct('photo', photoIdx);
    expect(g.meta.lore).toContain('foto_casa');

    // 5–12 — enigma, círculo, depósito, Mercador
    await walkTo(g, 'r010');
    await walkTo(g, 'r017');
    await walkTo(g, 'r019');
    picks.splice(0, picks.length, 'O que você vende');
    await walkTo(g, 'r021');
    await flush(); await flush();
    expect((g.meta.npcs.mercador?.encounters ?? 0) > 0).toBe(true);
    const keyAct = g.propActions('brass_key')[0];
    await g.propAct('brass_key', keyAct.idx);
    expect(g.inventory.has('chave_latao')).toBe(true);
    expect(g.meta.keyring.chave_latao.notes).toContain('familiar');
    g.investigation.refresh();
    expect(g.investigation.active()?.id).toBe('porta_latao');

    // o atalho: o Mercador não usa portas
    picks.splice(0, picks.length, 'Preciso voltar à primeira sala');
    await g.talkTo('mercador');
    await flush();
    expect(g.run?.currentRoom).toBe('r001');

    // 13:00 — a porta prometida
    const door = g.rooms.view('r001', 'front').doors.find(v => v.locked)!;
    expect(await g.doors.tryKey(door, 'chave_latao')).toBe(true);
    expect(g.meta.achievements).toContain('ach_promessa');
    await walkTo(g, 'r037');
    await flush();
    expect(g.meta.anchors).toContain('r037');
    const letter = g.propActions('letter')[0];
    await g.propAct('letter', letter.idx);
    expect(g.meta.lore).toContain('helena_1');

    // 16–22 — algo segue você; depois, a mão pequena
    for (let i = 0; i < 6 && g.run; i++) {
      const next = g.currentView().doors.find(v => !v.locked && !v.reverse && g.doors.resolveTo(v.door, false));
      if (!next) { await g.turn(); continue; }
      await g.openDoor(next);
      await flush(); await flush();
    }
    expect(g.meta.flags.ob_forgot).toBe(true);
    expect(g.run).toBeNull();
    expect(g.meta.deaths).toBe(1);

    // ~23 — Sala Zero: tudo continua, e há o que fazer com o que se lembrou
    await flush(); await flush();
    expect(g.meta.flags.ob_zero).toBe(true);
    expect(g.meta.fragments).toBeGreaterThanOrEqual(4);
    expect(g.progress.upgrades().some(u => u.affordable && !u.owned)).toBe(true);
    const anchorDoor = g.rooms.view('r000', 'back').doors.find(v => v.door.to === 'r037');
    expect(anchorDoor).toBeDefined();
  }, 20000);
});
