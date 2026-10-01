import type { GameManager } from '../core/GameManager';
import { bus } from '../core/EventBus';

export interface Lead {
  id: string;
  title: string;
  goal: string;
  target?: string;
  thought?: string;
  important?: boolean;
  unlocked: (g: GameManager) => boolean;
  done: (g: GameManager) => boolean;
}

const met = (g: GameManager, npc: string) => (g.meta.npcs[npc]?.encounters ?? 0) > 0;
const lore = (g: GameManager, id: string) => g.meta.lore.includes(id);
const clue = (g: GameManager, id: string) => g.meta.clues.includes(id);
const solved = (g: GameManager, id: string) => g.meta.puzzlesSolved.includes(id);
const FOLLOW_UP: Record<string, string[]> = {
  batidas: ['homem'], homem: ['prova', 'chave_latao'], prova: ['chave_latao', 'fotografia'], chave_latao: ['porta_latao'], porta_latao: ['helena', 'fotografia'], fotografia: ['mesa', 'arquivos'],
  mesa: ['arquivos', 'relogio'], arquivos: ['helena', 'maquinas'],
  helena: ['memoria', 'lia'], memoria: ['ultima'], maquinas: ['ultima'],
  relogio: ['arquivos', 'maquinas'], irmao: ['voltar_joaquim'], voltar_joaquim: ['arquivos'],
  visitante: ['helena', 'memoria'], lia: ['memoria', 'ultima'],
};

/** Concrete questions the player can pursue. Targets are revealed only after visiting them. */
export const LEADS: Lead[] = [
  { id: 'batidas', title: 'Batidas', goal: 'Alguém bateu atrás de você. Vire-se e veja o que é.', target: 'r001',
    unlocked: g => g.meta.runCount <= 1 && !lore(g, 'bilhete_t0') && !met(g, 'sentado'), done: g => lore(g, 'bilhete_t0') || met(g, 'sentado') },
  { id: 'homem', title: 'O homem que espera', goal: 'O bilhete diz: encontre o homem que espera. Ele lembra mais do que você.', target: 'r005',
    unlocked: g => lore(g, 'bilhete_t0') || met(g, 'sentado') || g.meta.runCount > 1 || !!g.meta.rooms.r005, done: g => met(g, 'sentado') },
  { id: 'prova', title: 'Uma prova de que você já esteve aqui', goal: 'Procure algo que confirme o que o homem disse sobre suas outras visitas.', target: 'r007',
    unlocked: g => met(g, 'sentado') || !!g.meta.rooms.r007, done: g => lore(g, 'foto_casa') },
  { id: 'chave_latao', title: 'A chave de latão', goal: 'Encontre o Mercador, "quem vende o que não é dele": ele tem a chave da porta que você trancou.', target: 'r021', important: true,
    thought: 'Fui eu que tranquei aquela porta. Preciso saber o que deixei do outro lado.',
    unlocked: g => !!g.meta.flags.joaquim_chave || (lore(g, 'bilhete_t0') && met(g, 'sentado')),
    done: g => g.inventory.has('chave_latao') || !g.doors.isLocked(g.house.resolve('@r001_c')) },
  { id: 'porta_latao', title: 'A porta prometida', goal: 'Volte à Sala 1 e abra a porta de latão. O mapa mental lembra o caminho.', target: 'r001', important: true,
    thought: 'A porta de latão, na primeira sala. Eu sei onde isso vai.',
    unlocked: g => g.inventory.has('chave_latao') || !g.doors.isLocked(g.house.resolve('@r001_c')),
    done: g => !g.doors.isLocked(g.house.resolve('@r001_c')) },
  { id: 'irmao', title: 'O irmão de Joaquim', goal: 'Procure nos registros da Casa o que aconteceu com o irmão de Joaquim.', target: 'r210',
    unlocked: g => g.meta.npcs.sentado?.memories?.includes('disse_nome') ?? false, done: g => lore(g, 'lista_perdidos') },
  { id: 'fotografia', title: 'As pessoas da fotografia', goal: 'Descubra os nomes das sete pessoas retratadas com você.', target: 'r014', important: true,
    thought: 'Estou nessa fotografia. Se descobrir quem são os outros, talvez entenda por que voltei.',
    unlocked: g => lore(g, 'foto_casa'), done: g => clue(g, 'clue_ordem_sete') },
  { id: 'mesa', title: 'Sete lugares', goal: 'Use a ordem dos nomes para arrumar os lugares à mesa.', target: 'r012', important: true,
    thought: 'Sete nomes. Sete lugares. Preciso voltar àquela mesa.',
    unlocked: g => clue(g, 'clue_ordem_sete'), done: g => solved(g, 'p_mesa_jantar') },
  { id: 'voltar_joaquim', title: 'Voltar a Joaquim', goal: 'Mostre a Joaquim o que você descobriu sobre os perdidos.', target: 'r005', important: true,
    thought: 'Joaquim ficou esperando. Tenho uma resposta para levar a ele.',
    unlocked: g => lore(g, 'lista_perdidos') && met(g, 'sentado'), done: g => !!g.meta.flags.sentado_despedida },
  { id: 'relogio', title: 'A hora em que tudo parou', goal: 'Encontre outro mecanismo ligado à hora 3:17.', target: 'r030', important: true,
    thought: 'Três e dezessete. Não é só um relógio quebrado.',
    unlocked: g => clue(g, 'clue_relogio_quarto'), done: g => solved(g, 'p_telefone_30') || solved(g, 'p_relogio_34') },
  { id: 'arquivos', title: 'O registro dos sete', goal: 'Procure alguém que tenha registros sobre a Casa e as pessoas da foto.', target: 'r053', important: true,
    thought: 'Se a Casa registra quem entra, alguém deve saber quem eu era.',
    unlocked: g => lore(g, 'foto_casa') && (clue(g, 'clue_ordem_sete') || solved(g, 'p_mesa_jantar')),
    done: g => met(g, 'arquivista') || lore(g, 'casa_1911') },
  { id: 'helena', title: 'Helena', goal: 'Encontre Helena e pergunte o que ela sabe sobre a fotografia.', target: 'r073', important: true,
    thought: 'O nome dela aparece de novo. Preciso ouvi-la, não apenas ler sobre ela.',
    unlocked: g => met(g, 'arquivista') || lore(g, 'helena_1'), done: g => met(g, 'helena') },
  { id: 'visitante', title: 'O visitante número sete', goal: 'Compare sua ficha de visitante com os outros registros da Casa.', target: 'r160', important: true,
    thought: 'Quarenta e um retornos. Esta ficha está falando de mim.',
    unlocked: g => lore(g, 'ficha_7'), done: g => lore(g, 'arquivo_sem_filhos') },
  { id: 'lia', title: 'A inicial no medalhão', goal: 'Pergunte a Helena quem é a criança marcada com a letra L.', target: 'r073', important: true,
    thought: 'Quem é L.? Por que essa fotografia dói antes mesmo de eu lembrar?',
    unlocked: g => lore(g, 'medalhao') || lore(g, 'lenco_lia'), done: g => lore(g, 'memoria_despedida') },
  { id: 'maquinas', title: 'O que move as salas', goal: 'Investigue as máquinas que mudam a Casa quando você não olha.', target: 'r095', important: true,
    unlocked: g => met(g, 'arquivista') || !!g.meta.rooms.r095, done: g => solved(g, 'p_luzes_95') || lore(g, 'maquinas') },
  { id: 'memoria', title: 'A lembrança que falta', goal: 'Siga os rastros de Helena até a memória que você evita.', target: 'r147', important: true,
    unlocked: g => met(g, 'helena') || lore(g, 'helena_1'), done: g => lore(g, 'memoria_despedida') },
  { id: 'ultima', title: 'A milésima porta', goal: 'Descubra a última porta e decida o que fazer com o que lembrou.', target: 'r333', important: true,
    unlocked: g => lore(g, 'maquinas') || lore(g, 'memoria_despedida') || !!g.meta.rooms.r333, done: g => g.meta.endings.length > 0 },
];

export class InvestigationSystem {
  constructor(private g: GameManager) {}

  all(): { lead: Lead; done: boolean }[] {
    return LEADS.filter(l => l.unlocked(this.g)).map(lead => ({ lead, done: lead.done(this.g) }));
  }

  active(): Lead | null {
    const open = this.all().filter(x => !x.done).map(x => x.lead);
    const pinned = this.g.meta.flags.activeLead as string | undefined;
    return open.find(l => l.id === pinned) ?? open[0] ?? null;
  }

  select(id: string): void {
    if (!this.all().some(x => x.lead.id === id && !x.done)) return;
    this.g.meta.flags.activeLead = id;
    bus.emit('hud');
    this.g.save();
  }

  refresh(announce = false): void {
    const g = this.g;
    const oldActive = g.meta.flags.activeLead;
    const available = this.all();
    const previous = available.find(x => x.lead.id === g.meta.flags.activeLead);
    const seen: string[] = (g.meta.flags.leadsSeen ??= []);
    const oldSeen = seen.length;
    const fresh = available.filter(x => !seen.includes(x.lead.id));
    for (const x of fresh) seen.push(x.lead.id);
    const open = available.filter(x => !x.done).map(x => x.lead);
    const current = open.find(l => l.id === g.meta.flags.activeLead);
    const promoted = fresh.find(x => !x.done && x.lead.important)?.lead;
    const followUp = previous?.done ? FOLLOW_UP[previous.lead.id]?.map(id => open.find(l => l.id === id)).find(Boolean) : null;
    const next = promoted ?? current ?? followUp ?? open[0] ?? null;
    if (next) g.meta.flags.activeLead = next.id;
    else delete g.meta.flags.activeLead;
    if (announce && promoted && g.run) {
      if (['fotografia', 'mesa', 'relogio'].includes(promoted.id)) g.meta.flags['lead_pending_' + promoted.id] = true;
      g.audio.play('memory_chime', { volume: 0.6 });
      g.ui.toast(`NOVA INVESTIGAÇÃO · ${promoted.title}`);
      if (promoted.thought) void g.ui.text(promoted.thought, { speaker: 'Você', style: 'whisper' });
      g.ui.journalPing();
    } else if (announce && previous?.done && next && g.run) {
      g.ui.toast(`PRÓXIMO PASSO · ${next.title}`);
    }
    if (oldActive !== g.meta.flags.activeLead || oldSeen !== seen.length) {
      bus.emit('hud');
      g.save();
    }
  }
}
