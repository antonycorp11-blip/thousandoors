// ─────────────────────────────────────────────────────────────
// OnboardingDirector — os primeiros 30 minutos.
// Encena os momentos-chave da primeira sessão (ver FIRST_30_MINUTES.md):
// batidas atrás de você → o bilhete com a sua letra → Joaquim → a fotografia →
// a chave de latão → a porta prometida → o Jardim → algo que te segue →
// a mão pequena → a Sala Zero.
// Cada momento acontece uma única vez (flags persistentes "ob_*").
// As dicas só aparecem se o jogador ficar parado ou perdido, e sempre na voz do jogo.
// ─────────────────────────────────────────────────────────────
import type { GameManager } from '../core/GameManager';
import { bus } from '../core/EventBus';


export class OnboardingDirector {
  private followBusy = false;
  /** Em testes, as pausas dramáticas viram zero. */
  fast = false;
  private later(ms: number) { return new Promise(r => setTimeout(r, this.fast ? 0 : ms)); }
  constructor(private g: GameManager) {}

  private get f() { return this.g.meta.flags; }
  /** Só nas primeiras explorações. Depois disso a Casa fala por conta própria. */
  active(): boolean { return this.g.meta.runCount <= 3; }
  private once(flag: string): boolean {
    if (this.f[flag]) return false;
    this.f[flag] = true;
    return true;
  }
  private still(room: string): boolean {
    return !!this.g.run && this.g.roomState.roomId === room && !this.g.dead;
  }
  private elapsed(): number { return this.g.run ? (Date.now() - this.g.run.startedAt) / 1000 : 0; }
  private met(npc: string) { return (this.g.meta.npcs[npc]?.encounters ?? 0) > 0; }
  private idle(): boolean { return !this.g.busy && !this.g.dead && ((this.g.ui as any).modal ?? 0) === 0 && !(this.g.ui as any).panelOpen?.(); }

  // ── entrar numa sala ─────────────────────────────────────
  async onEnter(room: string, first: boolean): Promise<void> {
    const g = this.g, run = g.run;
    if (!run || !this.active()) return;

    // 0:20 — três batidas atrás de você (ensina a virar sem tutorial)
    if (room === 'r001' && run.run === 1 && !this.f.ob_knock) {
      void (async () => {
        await this.later(4200);
        if (!this.still('r001') || g.roomState.facing !== 'front' || this.f.ob_knock) return;
        this.f.ob_knock = true;
        g.audio.play('knock', { behind: true, volume: 0.9 });
        await g.ui.text('Três batidas. Atrás de você.', { style: 'whisper' });
        g.ui.pulse('turn');
      })();
    }

    // 2:30 — o homem que espera fala primeiro
    if (room === 'r005' && first && !this.met('sentado') && g.npcs.isHere('sentado')) {
      void (async () => {
        await this.later(1400);
        if (this.still('r005') && this.idle() && !this.met('sentado')) await g.talkTo('sentado');
      })();
    }

    // 12:00 — o Mercador chegou antes
    if (room === 'r021' && first && !this.met('mercador') && g.npcs.isHere('mercador')) {
      void (async () => {
        await this.later(1200);
        if (this.still('r021') && this.idle() && !this.met('mercador')) await g.talkTo('mercador');
      })();
    }

    // 14:00 — o Jardim: a promessa cumprida vira um lugar seguro
    if (room === 'r037' && first && this.once('ob_jardim')) {
      run.flags.pos_jardim = 0;
      void (async () => {
        await this.later(2600);
        if (!g.meta.anchors.includes('r037')) {
          g.meta.anchors.push('r037');
          g.journal.add('salas', 'Jardim de Inverno: uma fita vermelha amarrada na maçaneta. Esta sala vai me esperar.', 'ob_anchor_r037');
        }
        await g.ui.text('Na maçaneta, uma fita vermelha amarrada com nó duplo. Você sabe, sem saber como, que esta sala vai esperar por você.', { style: 'whisper' });
        g.save();
      })();
      return;
    }

    // 16:00–22:00 — depois do Jardim, algo começa a seguir você
    if (this.f.ob_jardim && !this.f.ob_forgot && run.run <= 2 && room !== 'r037' && typeof run.flags.pos_jardim === 'number') {
      run.flags.pos_jardim++;
      await this.follower(run.flags.pos_jardim as number);
    }
  }

  private async follower(n: number): Promise<void> {
    const g = this.g;
    if (this.followBusy) return;
    this.followBusy = true;
    try {
      await this.later(1100);
      if (!g.run || g.dead) return;
      if (n === 1) {
        g.audio.play('footsteps', { behind: true, volume: 0.6 });
        await g.ui.text('Passos. Atrás de você. Param quando você para.', { style: 'whisper' });
        g.journal.add('eventos', 'Depois do Jardim, algo começou a me seguir.', 'ob_follow');
      } else if (n === 2) {
        g.audio.play('footsteps', { behind: true, volume: 0.9 });
        await g.ui.text('Os passos atravessaram a porta junto com você.', { style: 'whisper' });
      } else if (n === 3) {
        g.audio.play('heartbeat');
        g.fx('flicker', { ms: 1400 });
        await g.ui.text('Alguém respira no mesmo ritmo que você. Bem perto.', { style: 'whisper' });
      } else if (n >= 4) {
        await this.smallHand();
      }
    } finally { this.followBusy = false; }
  }

  // ~22:00 — o primeiro esquecimento. Não é um fracasso do jogador: é uma cena.
  private async smallHand(): Promise<void> {
    const g = this.g;
    if (!this.once('ob_forgot')) return;
    g.audio.play('bulb_pop');
    g.fx('darkness', { ms: 2600 });
    await this.later(900);
    g.audio.play('breath', { behind: true, volume: 1 });
    const i = await g.ui.choice('A luz apaga. No escuro, uma mão pequena segura a sua. Fria. Muito pequena.', ['Segurar a mão', 'Puxar a mão e correr']);
    if (i === 0) {
      g.memory.route('memoria', 2);
      g.meta.flags.segurou_a_mao = true;
      await g.ui.text('Ela puxa você, com cuidado, para algum lugar onde não há portas.', { style: 'whisper' });
      await this.later(1800);
      await g.die('uma mão pequena', 'Alguém trouxe você de volta.');
    } else {
      g.memory.route('ruptura', 2);
      await g.ui.text('Você corre. Bate numa parede que não estava ali.', { style: 'loud' });
      await this.later(1200);
      await g.die('uma parede que não estava ali', 'Você esqueceu alguma coisa.');
    }
  }

  // ── virar ────────────────────────────────────────────────
  async onTurn(facing: 'front' | 'back'): Promise<void> {
    const g = this.g;
    const room = g.roomState.roomId;
    if (!g.run || !this.active()) return;
    if (room === 'r001' && facing === 'back' && !g.meta.lore.includes('bilhete_t0') && this.once('ob_note_seen')) {
      g.fx('flicker', { ms: 300 });
      await g.ui.text('Um papel preso na parede. Não estava aí quando você acordou.', { style: 'whisper' });
    }
    if (room === 'r037' && facing === 'back' && this.once('ob_glass')) {
      g.fx('apparition', { kind: 'figure', side: 'back', x: 1250, ms: 3200 });
      g.audio.play('whisper', { pan: 0.4 });
      await g.ui.text('Do outro lado do vidro embaçado, uma mulher. Ela diz uma palavra só. Parece um nome. Parece o seu.', { style: 'whisper' });
      g.journal.add('pessoas', 'No Jardim de Inverno vi uma mulher através do vidro. Ela disse um nome.', 'ob_glass');
    }
  }

  // ── a cada segundo: dicas só para quem está parado ou perdido ─
  onTick(): void {
    const g = this.g, run = g.run;
    if (!run || !this.active() || !this.idle()) return;
    const room = g.roomState.roomId, t = g.roomState.time, el = this.elapsed();
    const say = (flag: string, text: string, pulse?: 'turn' | 'map' | 'journal') => {
      if (!this.once(flag)) return;
      void g.ui.text(text, { style: 'whisper' });
      if (pulse) g.ui.pulse(pulse);
    };
    // nunca virou na primeira sala
    if (room === 'r001' && t > 14 && g.roomState.turns === 0 && run.run === 1) say('ob_hint_turn', 'Você ainda não olhou para trás.', 'turn');
    // leu o bilhete e ficou parado
    if (room === 'r001' && g.meta.lore.includes('bilhete_t0') && t > 22) say('ob_hint_doors', 'A porta da esquerda e a do meio não estão trancadas.');
    // ainda não encontrou o homem que espera
    if (!this.met('sentado') && el > 220) say('ob_hint_joaquim', 'Alguém está esperando por você. Não muito longe do começo.');
    // nunca examinou nada
    if (!this.f.ob_examined && el > 100) say('ob_hint_examine', 'Segure o dedo sobre um objeto para olhar de perto. A Casa esconde coisas nos detalhes.');
    // pegou a chave: o mapa lembra o caminho
    if (g.inventory.has('chave_latao') && g.doors.isLocked(g.house.resolve('@r001_c')) && !this.f.ob_key_map) {
      if (this.once('ob_key_map')) {
        g.ui.pulse('map');
        void g.ui.text('A porta de latão, na primeira sala. Eu sei onde isso vai. O mapa mental lembra o caminho de volta.', { speaker: 'Você', style: 'whisper' });
      }
    }
    // com a chave há muito tempo e longe da porta
    if (g.inventory.has('chave_latao') && room !== 'r001' && g.doors.isLocked(g.house.resolve('@r001_c')) && t > 40) say('ob_hint_merchant_back', 'O Mercador disse que leva você de volta ao começo. Basta pedir.');
  }

  // ── a primeira vez na Sala Zero ──────────────────────────
  async onZero(): Promise<void> {
    const g = this.g;
    if (!this.once('ob_zero')) return;
    await this.later(1500);
    await g.ui.text('Sala Zero.', { style: 'loud' });
    await this.later(2200);
    await g.ui.text('Você já esteve aqui. Muitas vezes. A parede lembra.', { style: 'whisper' });
    await this.later(2600);
    await g.ui.text('Tudo o que você descobriu continua com você: o mapa, o diário, as pessoas, as portas abertas.');
    g.ui.pulse('map');
    await this.later(3200);
    if (g.meta.fragments < 4) g.memory.addFragments(4 - g.meta.fragments, 'lembranças acumuladas');
    await g.ui.text('Atrás de você, o relicário brilha. Fragmentos de memória podem virar vantagens.', { style: 'whisper' });
    g.ui.pulse('turn');
    if (g.meta.anchors.includes('r037')) {
      await this.later(3000);
      await g.ui.text('E há uma porta nova lá atrás, com uma fita vermelha. Cheira a chuva.', { style: 'whisper' });
    }
    bus.emit('hud');
    g.save();
  }
}
