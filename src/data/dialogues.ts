import type { DialogueDefinition, DialogueNode, DialogueChoice, Effect, Condition, Axis, JournalCat } from '../core/types';

// ── tiny builders (keep dialogue data readable) ──
const c = (text: string, next: string | null, effects?: Effect[], cond?: Condition, remember?: string): DialogueChoice =>
  ({ text, next, effects, cond, remember });
const fl = (flag: string, value: any = true): Effect => ({ type: 'setFlag', flag, value });
const tr = (npc: string, n: number): Effect => ({ type: 'npc', npc, trust: n });
const rt = (axis: Axis, n = 1): Effect => ({ type: 'route', axis, n });
const give = (item: string): Effect => ({ type: 'giveItem', item });
const take = (item: string): Effect => ({ type: 'takeItem', item });
const lore = (id: string): Effect => ({ type: 'lore', id });
const rumor = (id: string): Effect => ({ type: 'rumor', id });
const jr = (cat: JournalCat, text: string, id?: string): Effect => ({ type: 'journal', cat, text, id });
const frag = (n: number): Effect => ({ type: 'fragments', n });
const END = null;

function D(id: string, npc: string | undefined, nodes: Record<string, DialogueNode>, start = 'a'): DialogueDefinition {
  return { id, npc, start, nodes };
}

export const DIALOGUES: DialogueDefinition[] = [
  // ─────────── O HOMEM SENTADO ───────────
  D('sentado_1', 'sentado', {
    a: { speaker: 'sentado', text: 'Você demorou desta vez.', effects: [fl('sentado_demorou'), jr('pessoas', 'Um homem sentado na Sala 5 disse que eu "demorei desta vez".', 'j_sentado_1')],
      choices: [
        c('Eu te conheço?', 'b'),
        c('Demorei para quê?', 'c'),
        c('[Ficar em silêncio]', 'd', [tr('sentado', 1)]),
      ] },
    b: { speaker: 'sentado', text: 'Não. Mas você sempre pergunta isso.', next: 'e' },
    c: { speaker: 'sentado', text: 'Para voltar. Você sempre volta. Às vezes pela porta verde, às vezes pela vermelha.', next: 'e' },
    d: { speaker: 'sentado', text: 'Ele assente devagar, como quem aprova. — Isso. Da última vez você falou demais.', next: 'e' },
    e: { speaker: 'sentado', text: 'Da última vez, você morreu duas salas depois daqui.',
      choices: [
        c('Achei um bilhete na minha letra. Fala de uma chave.', 'h', [], { lore: 'bilhete_t0', notFlag: 'joaquim_chave' }),
        c('Como eu morri?', 'f'),
        c('Quem é você?', 'g'),
        c('Adeus.', END),
      ] },
    f: { speaker: 'sentado', text: 'Olhando para trás. Se ouvir batidas atrás de você, conte até três antes de virar.', effects: [rumor('rumor_virar')], next: END },
    h: { speaker: 'sentado', text: 'A porta de latão. Você sempre tranca e depois esquece por quê. A chave fica com o Mercador. Ele chega antes de todo mundo — não me pergunte como.', effects: [fl('joaquim_chave'), jr('pessoas', 'Joaquim: a chave da porta de latão está com "o Mercador", que "chega antes de todo mundo".', 'j_joaquim_chave')], next: 'i' },
    i: { speaker: 'sentado', text: 'Mas antes, vá à sala da mesa, aqui do lado. Tem uma fotografia sua lá. Você sempre fica um tempo olhando para ela.', effects: [fl('joaquim_foto')], choices: [c('Quem é você?', 'g'), c('Obrigado.', END)] },
    g: { speaker: 'sentado', text: 'Joaquim. Estou esperando meu irmão. Ele entrou antes de você. Muito antes.', effects: [{ type: 'npc', npc: 'sentado', known: true, memory: 'disse_nome' }, jr('pessoas', 'Joaquim espera pelo irmão, que "entrou antes de mim".')], next: END },
  }),
  D('sentado_2', 'sentado', {
    a: { speaker: 'sentado', text: 'Você de novo.', alt: [{ cond: { runs: { gte: 3 } }, text: 'Quantas vezes já? Eu parei de contar na trigésima.' }],
      choices: [
        c('Seu irmão ainda não voltou?', 'b'),
        c('O que você sabe sobre esta Casa?', 'c'),
        c('Vem comigo. Vamos procurar juntos.', 'd', [rt('perdidos')]),
        c('Adeus.', END),
      ] },
    b: { speaker: 'sentado', text: 'Ele disse que ia só ver o que tinha atrás da porta vermelha. Faz tanto tempo que eu esqueci a cor dos olhos dele.', effects: [tr('sentado', 1)], next: END },
    c: { speaker: 'sentado', text: 'Que ela gosta de você. Ela arruma as salas quando você não está olhando. Ninguém mais tem esse privilégio.', next: END },
    d: { speaker: 'sentado', text: 'Se eu levantar, perco o lugar. E se ele voltar e eu não estiver? Não. Vai você.', effects: [tr('sentado', 1), { type: 'npc', npc: 'sentado', memory: 'convidado' }], next: END },
  }),
  D('sentado_despedida', 'sentado', {
    a: { speaker: 'sentado', text: 'Você voltou. Encontrou alguma coisa sobre quem está perdido aqui?', choices: [
      c('E?', 'b'),
    ] },
    b: { speaker: 'sentado', text: 'Acho que ele não vai voltar. Então eu vou até ele. Fique com isto. Era dele.', effects: [give('botao'), fl('sentado_despedida'), fl('botao_achado'), { type: 'npc', npc: 'sentado', location: null }, jr('pessoas', 'Joaquim levantou da cadeira pela primeira vez e foi procurar o irmão.'), rt('perdidos', 2)], next: END },
  }),
  D('sentado_3', 'sentado', {
    a: { speaker: 'sentado', text: '...', next: END },
  }),

  // ─────────── O CARTÓGRAFO ───────────
  D('cartografo_1', 'cartografo', {
    a: { speaker: 'cartografo', text: 'Não pise aí! — Ah. Você. Não é tinta, é um corredor. Diga-me: você conhece alguma sala que eu não conheço?',
      effects: [{ type: 'npc', npc: 'cartografo', known: true }],
      choices: [
        c('Contar das salas que visitei.', 'b', [], { runRooms: { gte: 4 } }),
        c('Eu acabei de chegar.', 'c'),
        c('Por que mapear este lugar?', 'd'),
      ] },
    b: { speaker: 'cartografo', text: 'Sim... sim! Isso bate com o meu esboço. Em troca, informação por informação. Tome isto — não perca, eu não faço cópias.', effects: [give('mapa_parcial'), tr('cartografo', 1), rt('casa')], next: 'e' },
    c: { speaker: 'cartografo', text: 'Ninguém acabou de chegar. Mas tudo bem. Volte quando tiver algo para trocar.', next: 'e' },
    d: { speaker: 'cartografo', text: 'Porque um lugar que ninguém mapeia fica maior. Eu já vi acontecer.', next: 'e' },
    e: { speaker: 'cartografo', text: 'Um conselho de graça: toda fechadura que você não abriu ainda está esperando. A Casa não esquece fechaduras. Você também não devia.', effects: [rumor('rumor_fechaduras')], next: END },
  }),
  D('cartografo_2', 'cartografo', {
    a: { speaker: 'cartografo', text: 'Mostre-me o que carrega. Chaves contam histórias.', choices: [
      c('Mostrar a chave pequena de latão.', 'latao', [], { item: 'chave_latao' }),
      c('Mostrar a chave de ferro.', 'ferro', [], { item: 'chave_ferro' }),
      c('Mostrar a chave com o número 17.', 'dezessete', [], { item: 'chave_17' }),
      c('Mostrar a chave morna.', 'quente', [], { item: 'chave_quente' }),
      c('Mostrar a chave lisa.', 'lisa', [], { item: 'chave_sem_dentes' }),
      c('Mostrar a chave dourada.', 'dourada', [], { item: 'chave_dourada' }),
      c('O Mercador... como ele chega antes?', 'merc'),
      c('Trocar o que eu vi pelo que você viu.', 'troca', [], { runRooms: { gte: 8 } }),
      c('Nada. Até mais.', END),
    ] },
    latao: { speaker: 'cartografo', text: 'Latão pequeno, marcas na ponta... isso é da Ala Residencial. Do começo de tudo, eu diria. Muito do começo.', effects: [tr('cartografo', 1)], next: END },
    ferro: { speaker: 'cartografo', text: 'Ferro velho gosta de lugares onde se come. Salas de jantar são desconfiadas.', next: END },
    dezessete: { speaker: 'cartografo', text: 'Dezessete? Há um corredor onde os números se repetem até cansar. Um deles é diferente. Não é na sala 17, isso eu garanto.', next: END },
    quente: { speaker: 'cartografo', text: 'Não chegue perto de mim com isso. Isso aí é de um quarto de criança. Deixe-a te guiar: quanto mais quente, mais perto.', effects: [rumor('rumor_quente')], next: END },
    lisa: { speaker: 'cartografo', text: 'Uma chave sem dentes. Já mapeei uma fenda assim, muito longe, numa sala onde a parede se abriu. Achei que era um erro de desenho.', next: END },
    dourada: { speaker: 'cartografo', text: 'Ouro. Três portas no meu mapa têm fechadura dourada: uma sala de espera, um vestíbulo, uma sala de costura. Uma só vai abrir. Pense bem.', next: END },
    merc: { speaker: 'cartografo', text: 'Porque ele não usa portas. Não me pergunte como sei. Eu mapeei os caminhos dele e eles não passam por lugar nenhum.', effects: [rumor('rumor_mercador')], next: END },
    troca: { speaker: 'cartografo', text: 'Excelente. Aqui: três salas que eu conheço e você não. Lembre-se delas.', effects: [{ type: 'revealMap', around: 3, count: 5 }, tr('cartografo', 1)], next: END },
  }),

  // ─────────── A MENINA ───────────
  D('menina_1', 'menina', {
    a: { speaker: 'menina', text: 'Shh. Estou desenhando a sala que vem depois.', effects: [{ type: 'npc', npc: 'menina', known: true }],
      choices: [
        c('Posso ver?', 'b'),
        c('Quem é você?', 'c'),
        c('Onde estão seus pais?', 'd'),
      ] },
    b: { speaker: 'menina', text: 'Pode ficar. Você ainda não foi lá. Mas vai.', effects: [give('desenho_sala67'), tr('menina', 1), jr('pessoas', 'A Menina me deu um desenho de uma sala que eu ainda não vi.')], next: END },
    c: { speaker: 'menina', text: 'Eu sou a que desenha. Alguém tem que desenhar, senão as salas ficam sem nada dentro.', next: END },
    d: { speaker: 'menina', text: 'Meu pai está perdido. Ele sempre se perde. Mas ele sempre volta pela porta errada, então tudo bem.', effects: [tr('menina', 1), rt('memoria')], next: END },
  }),
  D('menina_2', 'menina', {
    a: { speaker: 'menina', text: 'Você achou a sala do desenho?', alt: [{ cond: { visited: 'r067' }, text: 'Você achou. Eu disse.' }],
      choices: [
        c('Você tem outro desenho?', 'b', [], { noItem: 'desenho_voce' }),
        c('Você tem uma chave?', 'k', [], { noItem: 'chave_sem_dentes', npcTrust: { npc: 'menina', gte: 1 } }),
        c('A porta vermelha...', 'v', [], { lore: 'desenho_vermelha' }),
        c('Tchau.', END),
      ] },
    b: { speaker: 'menina', text: 'Esse aqui é você. Dormindo. Você dorme muito.', effects: [give('desenho_voce'), tr('menina', 1)], next: END },
    k: { speaker: 'menina', text: 'Tenho uma que não tem dentes. Ela não precisa de dentes porque a porta não morde. Toma. Não conta pra Casa.', effects: [give('chave_sem_dentes'), give('chave_de_papel'), rt('ruptura'), jr('chaves', 'A Menina me deu uma chave lisa, sem dentes.')], next: END },
    v: { speaker: 'menina', text: 'A porta vermelha sempre sabe o seu nome. Mas ela fala baixinho.', effects: [rumor('rumor_vermelha')], next: END },
  }),
  D('menina_3', 'menina', {
    a: { speaker: 'menina', text: 'Você está olhando pra mim diferente hoje.', choices: [
      c('Lia?', 'lia', [], { any: [{ lore: 'grav_fita' }, { lore: 'lenco_lia' }] }),
      c('Desenha a Casa pra mim?', 'casa', [], { noItem: 'desenho_casa' }),
      c('Desenha a porta vermelha?', 'verm', [], { noItem: 'desenho_porta_vermelha' }),
      c('Nada. Continua desenhando.', END),
    ] },
    lia: { speaker: 'menina', text: '...Não fala esse nome aqui. A Casa escuta. Ela fica com ciúme.', effects: [fl('disse_lia'), rt('memoria', 2), frag(2), jr('memorias', 'Chamei a Menina de "Lia". Ela pediu para eu não dizer esse nome aqui.')], next: 'lia2' },
    lia2: { speaker: 'menina', text: 'Se você lembrar de verdade, lembra na última porta. Não antes. Antes dói.', next: END },
    casa: { speaker: 'menina', text: 'Pronto. Ela respira quando a gente dorme.', effects: [give('desenho_casa')], next: END },
    verm: { speaker: 'menina', text: 'Ele sempre para aqui. Você sempre para aqui.', effects: [give('desenho_porta_vermelha')], next: END },
  }),

  // ─────────── O MERCADOR ───────────
  D('mercador_1', 'mercador', {
    a: { speaker: 'mercador', text: 'Ah. Chegou. Eu sempre chego antes, você sempre chega depois. É uma boa parceria.', effects: [{ type: 'npc', npc: 'mercador', known: true }],
      choices: [
        c('Como você chega antes?', 'b'),
        c('O que você vende?', 'shop'),
        c('Preciso voltar à primeira sala.', 'volta', [], { item: 'chave_latao', doorLocked: '@r001_c' }),
      ] },
    b: { speaker: 'mercador', text: 'Com os pés. Próxima pergunta.', next: 'shop' },
    volta: { speaker: 'mercador', text: 'Ao começo? Claro. Eu não uso portas, então não me importo de emprestar uma.', effects: [{ type: 'text', text: 'Ele abre uma porta que você não tinha visto. Do outro lado, a Sala Inicial. Quando você olha para trás, ele não está mais lá.', style: 'whisper' }, { type: 'removeNpc', npc: 'mercador' }, { type: 'teleport', room: 'r001' }], next: END },
    shop: { speaker: 'mercador', text: 'Troco coisas por coisas. Fragmentos também servem — memórias pagam bem.', trade: [
      { give: 'moeda_antiga', get: 'chave_dourada', line: 'Você não precisa saber o que ela abre.' },
      { give: 'moeda_furada', get: 'chave_mutante', line: 'Abre qualquer coisa. Qualquer uma! (Ele não olha nos seus olhos.)' },
      { give: 'fragments:3', get: 'curativo' },
      { give: 'fragments:4', get: 'chave_efemera', line: 'Use rápido. Ela não gosta de existir.' },
      { give: 'fragments:6', get: 'chave_dourada', line: 'Uma porta só. Escolha bem, porque a Casa escolhe o resto.' },
      { give: 'boneca', get: 'lanterna' },
      { give: 'cachimbo', get: 'mapa_parcial' },
      { give: 'fragments:2', get: 'fosforos' },
      { give: 'fragments:5', get: 'estetoscopio' },
      { give: 'disco', get: 'fita_vermelha' },
    ], next: END },
  }),
  D('mercador_2', 'mercador', {
    a: { speaker: 'mercador', text: 'Você de novo! Que coincidência. Eu estava aqui primeiro.', alt: [{ cond: { runFlag: 'mercador_visto_2' }, text: 'Três vezes na mesma caminhada? Estamos ficando íntimos.' }],
      effects: [{ type: 'if', cond: { runFlag: 'mercador_visto_1' }, then: [fl('mercador_visto_2')], else: [] }],
      choices: [
        c('Vamos negociar.', 'shop'),
        c('Preciso voltar à primeira sala.', 'volta', [], { item: 'chave_latao', doorLocked: '@r001_c' }),
        c('Aquela chave que muda... ela abre tudo mesmo?', 'mut', [], { item: 'chave_mutante' }),
        c('Até.', END),
      ] },
    volta: { speaker: 'mercador', text: 'Ao começo? Claro. Eu não uso portas, então não me importo de emprestar uma.', effects: [{ type: 'text', text: 'Ele abre uma porta que você não tinha visto. Do outro lado, a Sala Inicial. Quando você olha para trás, ele não está mais lá.', style: 'whisper' }, { type: 'removeNpc', npc: 'mercador' }, { type: 'teleport', room: 'r001' }], next: END },
    mut: { speaker: 'mercador', text: 'Tudo que é comum. O incomum... bom, ninguém lê as letras miúdas.', effects: [rumor('rumor_chaves')], next: 'shop' },
    shop: { speaker: 'mercador', text: 'O de sempre.', trade: [
      { give: 'moeda_antiga', get: 'chave_dourada', line: 'Você não precisa saber o que ela abre.' },
      { give: 'moeda_furada', get: 'chave_mutante' },
      { give: 'fragments:3', get: 'curativo' },
      { give: 'fragments:4', get: 'chave_efemera' },
      { give: 'fragments:6', get: 'chave_dourada' },
      { give: 'fragments:2', get: 'fosforos' },
      { give: 'fragments:5', get: 'estetoscopio' },
      { give: 'fragments:3', get: 'giz' },
      { give: 'pregos', get: 'arame' },
      { give: 'disco', get: 'fita_vermelha' },
    ], next: END },
  }),

  // ─────────── O VELHO ───────────
  D('velho_1', 'velho', {
    a: { speaker: 'velho', text: 'Sente. Sente, que eu conto. Eu cheguei na novecentos e noventa e nove.', effects: [{ type: 'npc', npc: 'velho', known: true }],
      choices: [
        c('E a milésima?', 'b'),
        c('Ninguém chega tão longe.', 'c'),
        c('Por que voltou?', 'd'),
      ] },
    b: { speaker: 'velho', text: 'Tinha cheiro de pão. E uma placa em branco do tamanho de um nome. A Porta 1000 só abre para quem sabe o próprio nome.', effects: [rumor('rumor_1000'), jr('rumores', 'O Velho diz que a Porta 1000 tem uma placa "do tamanho de um nome".')], next: 'e' },
    c: { speaker: 'velho', text: 'Chegam. Chegam sim. Eu vi uma sala onde o teto era de água e ninguém se afogava. Vi um homem com o seu casaco. Vi uma porta que se abria para dentro de si mesma.', effects: [tr('velho', 1)], next: 'e' },
    d: { speaker: 'velho', text: 'Medo. Medo de ser a Casa. Quem abre a milésima... bom. Alguém tem que ficar.', effects: [rt('obediencia')], next: 'e' },
    e: { speaker: 'velho', text: 'E não mexa na lareira. Nunca. Nunca, está ouvindo?', effects: [fl('velho_avisou_lareira')], next: END },
  }),
  D('velho_2', 'velho', {
    a: { speaker: 'velho', text: 'Hm. Você.', alt: [{ cond: { item: 'chave_quente' }, text: 'Você pegou a chave das brasas. Tudo bem. Ela esquentava por você, não por mim.' }],
      choices: [
        c('Conte outra história.', 'b'),
        c('Portas azuis...?', 'az'),
        c('A chave quente — o que ela abre?', 'q', [], { item: 'chave_quente' }),
        c('Me conta sobre a 999.', 'fim', [], { runs: { gte: 3 } }),
        c('Até mais.', END),
      ] },
    b: { speaker: 'velho', text: 'Uma vez segui uma linha vermelha por trinta salas. Ela acabava amarrada no meu próprio pulso. Eu tinha amarrado. Não lembrava.', effects: [tr('velho', 1)], next: END },
    az: { speaker: 'velho', text: 'Nunca abra duas portas azuis seguidas. A Casa acha que você está com saudade do céu.', effects: [rumor('rumor_azuis')], next: END },
    q: { speaker: 'velho', text: 'Um quarto de criança. Ela esquenta quando chega perto de casa. Mas qual casa, eu nunca soube.', effects: [rumor('rumor_quente')], next: END },
    fim: { speaker: 'velho', text: 'Quer saber mesmo? Então vá até o fim. Eu vou estar lá, sentado, esperando para contar a última. Não demore.', effects: [fl('velho_partiu'), fl('velho_ultima'), { type: 'npc', npc: 'velho', location: 'r325' }, jr('pessoas', 'O Velho disse que vai me esperar "no fim".')], next: END },
  }),
  D('velho_fim', 'velho', {
    a: { speaker: 'velho', text: 'Eu disse que cheguei perto. Você não acreditou.', choices: [c('Agora acredito.', 'b'), c('Ainda não.', 'b')] },
    b: { speaker: 'velho', text: 'A milésima não é uma saída. É uma pergunta. Responda com a verdade, e ela te deixa ir. Responda com o que você queria que fosse verdade, e ela te deixa ficar. As duas coisas são gentis. Eu... vou descansar agora.', effects: [lore('velho_guardiao'), { type: 'npc', npc: 'velho', alive: false }, fl('velho_morto'), jr('pessoas', 'O Velho morreu na Sala 325, em paz. Disse que a Porta 1000 é uma pergunta.'), frag(3)], next: END },
  }),

  // ─────────── O HOMEM SEM ROSTO ───────────
  D('semrosto', 'semrosto', {
    a: { speaker: 'semrosto', text: '[Ele não responde. Mas a cabeça dele se inclina, devagar, em direção a uma das portas.]', effects: [{ type: 'npc', npc: 'semrosto', known: true }, fl('semrosto_visto'), rt('casa')], next: END },
  }),

  // ─────────── HELENA ───────────
  D('helena_1', 'helena', {
    a: { speaker: 'helena', text: 'Teo.', effects: [fl('helena_chamou_teo'), { type: 'npc', npc: 'helena', known: true }, jr('pessoas', 'Uma mulher com um medalhão me chamou de "Teo". Não sei quem ela é.')],
      choices: [
        c('Quem é você?', 'b'),
        c('Esse é o meu nome?', 'c'),
        c('[Não responder]', 'd'),
      ] },
    b: { speaker: 'helena', text: 'Você sempre pergunta como se doesse menos quando é você que pergunta.', next: 'e' },
    c: { speaker: 'helena', text: 'É o nome que eu uso. Você tinha outros. Escolhemos juntos um nome uma vez... não. Isso foi outra coisa. Outra pessoa.', effects: [rt('memoria')], next: 'e' },
    d: { speaker: 'helena', text: 'Tudo bem. Da última vez você chorou. Silêncio é melhor.', effects: [tr('helena', 1)], next: 'e' },
    e: { speaker: 'helena', text: 'Eu deixei uma carta para você. Sempre deixo. Você nunca acha na primeira vez.', effects: [give('carta_helena_1')], next: END },
  }),
  D('helena_2', 'helena', {
    a: { speaker: 'helena', text: 'Você voltou mais rápido desta vez.', choices: [
      c('O medalhão...', 'm', [], { noItem: 'medalhao', npcTrust: { npc: 'helena', gte: 1 } }),
      c('Por que você está aqui?', 'b'),
      c('A menina que desenha. Quem é ela?', 'c', [], { npcKnown: 'menina' }),
      c('Preciso ir.', END),
    ] },
    m: { speaker: 'helena', text: 'Fique com ele. Não abra perto da porta vermelha. Ou abra. Eu nunca soube o que era melhor para você.', effects: [give('medalhao'), rt('memoria', 2), tr('helena', 1)], next: END },
    b: { speaker: 'helena', text: 'Porque alguém tem que estar aqui quando você esquece. Eu fiquei.', effects: [give('carta_helena_3'), tr('helena', 1)], next: END },
    c: { speaker: 'helena', text: '[Ela demora muito para responder.] Ela é o que você lembra. E você lembra errado. Mas lembra com amor, então... ela é gentil.', effects: [give('carta_helena_2'), rt('memoria')], next: END },
  }),
  D('helena_3', 'helena', {
    a: { speaker: 'helena', text: 'Você esteve na cozinha. Eu sei. Você está com cheiro de café.', choices: [
      c('Eu lembrei de você.', 'b'),
      c('Eu não lembro de nada. Só da luz.', 'c'),
    ] },
    b: { speaker: 'helena', text: 'Lembrou de mim ou da ideia de mim? [Ela sorri.] Não importa. Obrigada.', effects: [fl('helena_lembrada'), rt('memoria', 2), frag(3)], next: END },
    c: { speaker: 'helena', text: 'A luz era o mais importante. Você sempre disse isso.', effects: [fl('helena_lembrada'), rt('memoria', 1)], next: END },
  }),

  // ─────────── IRMÃ CLARA ───────────
  D('enfermeira_1', 'enfermeira', {
    a: { speaker: 'enfermeira', text: 'Sente aqui. Vou olhar isso. Não — não pergunte. Você sempre chega com alguma coisa quebrada.', effects: [{ type: 'npc', npc: 'enfermeira', known: true }, { type: 'heal', n: 3 }],
      choices: [
        c('Obrigado.', 'b', [tr('enfermeira', 1)]),
        c('Você me conhece?', 'c'),
      ] },
    b: { speaker: 'enfermeira', text: 'Não agradeça. Me traga uma chave que ninguém quis. Enferrujada, velha, quase morta. Eu preciso trancar uma porta.', next: END },
    c: { speaker: 'enfermeira', text: 'Conheço seus machucados. É quase a mesma coisa. Espelhos mostram a sala como era antes de você entrar — lembre disso.', effects: [rumor('rumor_espelho')], next: 'b' },
  }),
  D('enfermeira_2', 'enfermeira', {
    a: { speaker: 'enfermeira', text: 'De volta. Deixe-me ver.', effects: [{ type: 'if', cond: { notRunFlag: 'clara_curou' }, then: [{ type: 'heal', n: 2 }, fl('clara_curou')] }],
      choices: [
        c('Trouxe uma chave enferrujada.', 'k', [], { item: 'chave_enferrujada' }),
        c('Essa chave branca no seu cinto...', 'o', [], { noItem: 'chave_osso' }),
        c('Que porta você quer trancar?', 'p'),
        c('Até logo.', END),
      ] },
    k: { speaker: 'enfermeira', text: 'Perfeita. Ninguém vai abrir de novo o que eu trancar com ela. Tome — troca justa.', effects: [take('chave_enferrujada'), give('chave_osso'), tr('enfermeira', 2), jr('chaves', 'Irmã Clara trocou minha chave enferrujada por uma chave branca e leve.')], next: END },
    o: { speaker: 'enfermeira', text: 'Não é para você. Ainda.', alt: [{ cond: { npcTrust: { npc: 'enfermeira', gte: 3 } }, text: 'Leve. Ela abre onde os que não voltaram descansam. Seja gentil lá.' }],
      effects: [{ type: 'if', cond: { npcTrust: { npc: 'enfermeira', gte: 3 } }, then: [give('chave_osso')] }], next: END },
    p: { speaker: 'enfermeira', text: 'A da sala onde fazíamos os registros. Não quero que você leia o que escrevemos sobre você.', effects: [tr('enfermeira', 1), rt('perdidos')], next: END },
  }),

  // ─────────── O RELOJOEIRO ───────────
  D('relojoeiro_1', 'relojoeiro', {
    a: { speaker: 'relojoeiro', text: 'Três e dezessete. Sempre três e dezessete. Você tem horas aí?', effects: [{ type: 'npc', npc: 'relojoeiro', known: true }],
      choices: [
        c('Mostrar o relógio de bolso.', 'r', [], { item: 'relogio_bolso' }),
        c('Por que três e dezessete?', 'b'),
        c('Não.', END),
      ] },
    r: { speaker: 'relojoeiro', text: 'Ah, este. Eu fiz este. Para você. Tome em troca — ela abre o que o tempo trancou.', effects: [give('chave_relogio'), tr('relojoeiro', 2), jr('chaves', 'O Relojoeiro me deu uma chave de dar corda: "abre o que o tempo trancou".')], next: END },
    b: { speaker: 'relojoeiro', text: 'Foi a hora em que alguém parou de contar. Os relógios param em solidariedade.', effects: [{ type: 'clue', id: 'clue_317' }], next: END },
  }),
  D('relojoeiro_2', 'relojoeiro', {
    a: { speaker: 'relojoeiro', text: 'Você está mais velho. Eu estou mais novo. Um de nós está andando para o lado errado.', choices: [
      c('Você parece mesmo mais jovem.', 'b', [], { runs: { gte: 2 } }),
      c('Preciso de uma chave de relógio.', 'k', [], { noItem: 'chave_relogio' }),
      c('Até.', END),
    ] },
    b: { speaker: 'relojoeiro', text: 'A cada vez que você volta, eu fico um pouco mais novo. Um dia vou ser criança de novo. Depois, nada.', effects: [lore('relojoeiro_nota'), rt('perdidos')], next: END },
    k: { speaker: 'relojoeiro', text: 'Traga o relógio que eu fiz para você. Está parado às três e dezessete, num quarto com cama.', effects: [{ type: 'clue', id: 'clue_relogio_quarto' }], next: END },
  }),

  // ─────────── BENEDITO ───────────
  D('arquivista_1', 'arquivista', {
    a: { speaker: 'arquivista', text: 'Registro de visitante... nome? Não precisa. Eu sei. Eu sempre sei.', effects: [{ type: 'npc', npc: 'arquivista', known: true }],
      choices: [
        c('Você já esteve na Sala 44?', 'b'),
        c('O que você arquiva?', 'c'),
        c('Tchau.', END),
      ] },
    b: { speaker: 'arquivista', text: 'Nunca. Nenhum de nós entra na 44. Nunca estive lá.', effects: [fl('benedito_nega_44'), jr('pessoas', 'Benedito afirmou que nunca esteve na Sala 44.', 'j_benedito_44')], next: END },
    c: { speaker: 'arquivista', text: 'Tudo que atravessa uma porta deixa um papel. Você deixou muitos. Quarenta e um, para ser exato.', effects: [rt('casa')], next: END },
  }),
  D('arquivista_2', 'arquivista', {
    a: { speaker: 'arquivista', text: 'Não tire nada do lugar. Tudo aqui está em ordem.', choices: [
      c('A porta de osso.', 'o'),
      c('Quero ver a minha ficha.', 'f'),
      c('Até.', END),
    ] },
    o: { speaker: 'arquivista', text: 'Ali ficam os que não voltaram. Só se abre com osso. Ou com a ajuda de quem sabe. Eu sei. Mas não confio em você. Ainda.', effects: [tr('arquivista', 1)], next: END },
    f: { speaker: 'arquivista', text: 'Não posso. [Ele empurra, sem querer, uma gaveta com o pé. Ela fica entreaberta.]', effects: [tr('arquivista', 1), fl('gaveta_ficha_aberta', true)], next: END },
  }),
  D('arquivista_44', 'arquivista', {
    a: { speaker: 'arquivista', text: '[Você mostra a fotografia. Ele fica muito tempo em silêncio.]', choices: [
      c('Você disse que nunca esteve lá.', 'b'),
    ] },
    b: { speaker: 'arquivista', text: 'Aquele... foi outro dia. Outro eu. Aqui a gente não é o mesmo duas vezes. Nem você.', effects: [fl('benedito_confrontado'), tr('arquivista', 2), jr('pessoas', 'Confrontado com a foto, Benedito disse que foi "outro eu".'), rt('perdidos')], next: END },
  }),
  D('arquivista_3', 'arquivista', {
    a: { speaker: 'arquivista', text: 'O arquivo central. Você não devia estar aqui. Ninguém devia.', choices: [
      c('A chave mestra.', 'm', [], { noItem: 'chave_mestra' }),
      c('Eu tenho uma ficha aqui?', 'f'),
      c('Até.', END),
    ] },
    m: { speaker: 'arquivista', text: 'A mestra abre tudo. Tudo mesmo. [Ele mente muito mal.] Está naquela gaveta. Não, não está. Está.', effects: [tr('arquivista', 1)], next: END },
    f: { speaker: 'arquivista', text: 'Visitante número sete. Retornos: quarenta e um. Quarenta e dois, agora.', effects: [lore('ficha_7')], next: END },
  }),

  // ─────────── DAVI ───────────
  D('davi_1', 'davi', {
    a: { speaker: 'davi', text: 'Quer brincar de esconde-esconde? Eu escondo, você acha!', effects: [{ type: 'npc', npc: 'davi', known: true }],
      choices: [
        c('Pode ser.', 'b'),
        c('Estou ocupado.', 'c'),
        c('Você pegou uma coisa minha.', 'dev', [], { flag: 'davi_roubou' }),
        c('Quem cuida de você aqui?', 'd'),
      ] },
    b: { speaker: 'davi', text: 'Então eu escondo... isso aqui! [Ele pega algo do seu bolso e sai correndo.]', effects: [{ type: 'stealKey', npc: 'davi' }, tr('davi', 1)], next: END },
    c: { speaker: 'davi', text: 'Todo mundo tá sempre ocupado. Menos eu.', next: END },
    dev: { speaker: 'davi', text: 'Achei você! Quer dizer... você me achou. Toma de volta.', effects: [{ type: 'returnKeys', npc: 'davi' }], next: END },
    d: { speaker: 'davi', text: 'A Casa. Ela me dá pão. Se você esconder uma chave, ela não acha. Mas eu acho.', effects: [rumor('rumor_davi')], next: END },
  }),
  D('davi_2', 'davi', {
    a: { speaker: 'davi', text: 'Eu cresci? Ninguém cresce aqui. Só eu.',
      choices: [
        c('Você pegou uma coisa minha.', 'b', [], { flag: 'davi_roubou' }),
        c('Quantos anos você tem?', 'c'),
        c('Até.', END),
      ] },
    b: { speaker: 'davi', text: 'Achado não é roubado. Mas tá bom. Toma. Eu escondi bem, né?', effects: [{ type: 'returnKeys', npc: 'davi' }, tr('davi', 1)], next: END },
    c: { speaker: 'davi', text: 'Nove. Sempre nove. Mas olha minhas calças.', effects: [lore('davi_altura')], next: END },
  }),
  D('davi_3', 'davi', {
    a: { speaker: 'davi', text: 'Você ainda não achou? Eu achei tudo. Todas as chaves. Menos a saída.', choices: [
      c('Me ajuda?', 'b'),
      c('Você está... velho.', 'c'),
    ] },
    b: { speaker: 'davi', text: 'Uma dica de quem escondeu tudo: as portas que você deixou trancadas lá no começo são as mais importantes. Ninguém volta. Volta.', effects: [tr('davi', 1), rt('perdidos')], next: END },
    c: { speaker: 'davi', text: 'Eu sei. Eu brinquei tempo demais.', effects: [rt('perdidos', 2)], next: END },
  }),

  // ─────────── ESTER ───────────
  D('ester_1', 'ester', {
    a: { speaker: 'ester', text: 'Chá? Tem duas xícaras. Uma é do Rui. Ele vai voltar.', effects: [{ type: 'npc', npc: 'ester', known: true }],
      choices: [
        c('Para onde ele foi?', 'b'),
        c('Posso tomar a dele?', 'c'),
      ] },
    b: { speaker: 'ester', text: 'Pela porta azul. Disse que voltava antes do chá esfriar. Se uma sala está em silêncio demais, alguém está prendendo a respiração nela.', effects: [rumor('rumor_silencio')], next: END },
    c: { speaker: 'ester', text: '...Pode. Ele não vai se importar. Ele não vai voltar, né?', choices: [
      c('Talvez volte.', 'd', [tr('ester', 1), give('cha')]),
      c('Não vai.', 'e', [rt('perdidos', 2)]),
    ] },
    d: { speaker: 'ester', text: 'Talvez. É o que eu digo toda manhã.', next: END },
    e: { speaker: 'ester', text: '[Ela sorri, muito devagar.] Obrigada. Ninguém nunca me disse. Então eu posso parar de fazer chá.', effects: [fl('ester_partiu'), { type: 'npc', npc: 'ester', location: null }, jr('pessoas', 'Disse a Ester que Rui não vai voltar. Ela agradeceu.'), lore('diario_ester')], next: END },
  }),
  D('ester_2', 'ester', {
    a: { speaker: 'ester', text: 'A água está quase fervendo. Quer esperar comigo?', choices: [
      c('Esperar um pouco.', 'b', [tr('ester', 1), { type: 'heal', n: 1 }]),
      c('Não posso.', END),
    ] },
    b: { speaker: 'ester', text: 'Você é gentil. Rui também era. Isso não salvou ele.', next: END },
  }),

  // ─────────── ORLANDO ───────────
  D('construtor_1', 'construtor', {
    a: { speaker: 'construtor', text: 'Cuidado com a régua. Tudo aqui foi medido, e mesmo assim não fecha.', effects: [{ type: 'npc', npc: 'construtor', known: true }],
      choices: [
        c('Você construiu a Casa?', 'b'),
        c('Quem são os sete?', 'c', [], { lore: 'foto_casa' }),
      ] },
    b: { speaker: 'construtor', text: 'Construímos? Não. Encontramos. A planta já existia. A gente só... assinou.', effects: [lore('casa_nunca'), rt('casa')], next: END },
    c: { speaker: 'construtor', text: 'Helena, Benedito, Marta, Clara, Aurélio, eu... e o sétimo. Não lembro do sétimo. Não é engraçado? Justo o que teve a ideia.', effects: [rt('memoria'), jr('pessoas', 'Orlando lista seis nomes dos sete. Não lembra do sétimo — "o que teve a ideia".')], next: END },
  }),
  D('construtor_2', 'construtor', {
    a: { speaker: 'construtor', text: 'Medi de novo. Tem uma porta a mais do que ontem.', choices: [
      c('Mil portas. Por que mil?', 'b'),
      c('A planta original. Onde está?', 'c', [], { noLore: 'planta_original' }),
      c('Até.', END),
    ] },
    b: { speaker: 'construtor', text: 'Não fui eu que escolhi. O sétimo disse que mil era o número de dias que... não. Esqueci. Esqueço sempre nessa parte.', effects: [rt('memoria')], next: END },
    c: { speaker: 'construtor', text: 'Numa memória. A gente guardou numa memória, para ninguém mexer. Uma sala onde a gente construía.', effects: [{ type: 'clue', id: 'clue_planta' }], next: END },
  }),

  // ─────────── O PIANISTA ───────────
  D('pianista', 'pianista', {
    a: { speaker: 'pianista', text: 'Você lembra a melodia? Ela lembra de você.', choices: [
      c('Tentar tocar.', END, [{ type: 'puzzle', id: 'p_piano' }], { puzzleUnsolved: 'p_piano' }),
      c('Quem é você?', 'b'),
      c('Deixar ele tocar.', END),
    ] },
    b: { speaker: 'pianista', text: 'Alguém que tocava em aniversários. Duas velas. Parabéns desafinado de propósito.', effects: [rt('memoria')], next: END },
  }),

  // ─────────── A VOZ ───────────
  D('voz', 'voz', {
    a: { speaker: 'voz', text: 'Não abre. Por favor. Ainda não.', choices: [
      c('Quem é?', 'b'),
      c('Por que não?', 'c'),
      c('Eu vou abrir.', 'd', [rt('ruptura')]),
    ] },
    b: { speaker: 'voz', text: 'Sou eu. Você. Depois.', effects: [rt('ruptura')], next: END },
    c: { speaker: 'voz', text: 'Porque do lado de cá você ainda lembra do caminho de volta.', next: END },
    d: { speaker: 'voz', text: 'Então abre. Eu vou estar do outro lado. Eu sempre estou.', next: END },
  }),

  // ─────────── O MORDOMO ───────────
  D('mordomo_1', 'mordomo', {
    a: { speaker: 'mordomo', text: 'A Casa pede que o senhor vire à direita na próxima sala. A porta mais à direita.', effects: [{ type: 'npc', npc: 'mordomo', known: true }],
      choices: [
        c('Obedecer.', 'b', [rt('obediencia'), fl('ordem_direita', true), { type: 'setFlag', flag: 'ordem_direita', value: true, scope: 'run' }]),
        c('Por quê?', 'c'),
        c('Não.', 'd', [rt('ruptura')]),
      ] },
    b: { speaker: 'mordomo', text: 'A Casa agradece.', next: END },
    c: { speaker: 'mordomo', text: 'A Casa não explica. A Casa hospeda.', next: 'a' },
    d: { speaker: 'mordomo', text: 'Como quiser. A Casa também anota recusas.', next: END },
  }),
  D('mordomo_2', 'mordomo', {
    a: { speaker: 'mordomo', text: 'Senhor.', alt: [{ cond: { route: { axis: 'obediencia', gte: 3 } }, text: 'O senhor tem sido um bom hóspede.' }],
      choices: [
        c('O que a Casa quer?', 'b'),
        c('Me dê uma ordem.', 'o'),
        c('Até.', END),
      ] },
    b: { speaker: 'mordomo', text: 'Ser habitada. Ser lembrada. Quem lembra, cuida. Quem cuida, fica.', effects: [lore('mordomo_regimento'), rt('obediencia')], next: END },
    o: { speaker: 'mordomo', text: 'Não olhe para trás na próxima sala.', effects: [{ type: 'setFlag', flag: 'ordem_nao_virar', value: true, scope: 'run' }, rt('obediencia')], next: END },
  }),
  D('mordomo_juizo', 'mordomo', {
    a: { speaker: 'mordomo', text: 'O senhor chegou à sala do juízo. A Casa deseja agradecer a sua obediência.', choices: [
      c('Aceitar.', 'b'),
      c('Eu não obedeci. Eu só escolhi as mesmas coisas.', 'c', [rt('ruptura')]),
    ] },
    b: { speaker: 'mordomo', text: 'Esta chave abre a capela. Lá atrás há outra capela, mais velha. A Casa gostaria que o senhor a visse.', effects: [give('chave_capela'), rt('obediencia', 2), { type: 'achievement', id: 'ach_nao_olhe' }], next: END },
    c: { speaker: 'mordomo', text: 'É a mesma coisa, senhor. Sempre foi. Mesmo assim — tome.', effects: [give('chave_capela')], next: END },
  }),

  // ─────────── O OUTRO ───────────
  D('outro', 'outro', {
    a: { speaker: 'outro', text: 'Não se assuste. Eu já fui você. Ou vou ser.', effects: [{ type: 'npc', npc: 'outro', known: true }, lore('outro_eu'), { type: 'achievement', id: 'ach_outro' }],
      choices: [
        c('Você chegou à Porta 1000?', 'b'),
        c('Falta um botão no seu casaco.', 'c'),
        c('Saia do meu caminho.', 'd', [rt('ruptura', 2)]),
      ] },
    b: { speaker: 'outro', text: 'Cheguei. E escolhi voltar, para te avisar. [Pausa.] Engraçado. Você me disse a mesma coisa, da outra vez.', next: END },
    c: { speaker: 'outro', text: 'Falta no seu também. Joaquim guardou. Ele guarda tudo.', effects: [fl('botao_achado')], next: END },
    d: { speaker: 'outro', text: 'Eu não estou no seu caminho. Eu sou o seu caminho, visto de trás.', next: END },
  }),

  // ─────────── MARTA ───────────
  D('fotografa_1', 'fotografa', {
    a: { speaker: 'fotografa', text: 'Fique parado. — Não, não é para você. É para quem está atrás.', effects: [{ type: 'npc', npc: 'fotografa', known: true }, { type: 'sound', id: 'flash' }, { type: 'flicker', ms: 200 }],
      choices: [
        c('Quem está atrás de mim?', 'b'),
        c('Você tirou a foto da frente da Casa?', 'c', [], { lore: 'foto_casa' }),
      ] },
    b: { speaker: 'fotografa', text: 'Agora? Ninguém. Na foto, vai ter alguém. Sempre tem. Fique com esta, é antiga.', effects: [give('foto_sete')], next: END },
    c: { speaker: 'fotografa', text: 'Tirei. Você estava sorrindo. Por que parou?', effects: [rt('memoria'), tr('fotografa', 1)], next: END },
  }),
  D('fotografa_2', 'fotografa', {
    a: { speaker: 'fotografa', text: 'Revelei uma que você vai querer ver.', choices: [
      c('Mostre.', 'b', [], { noLore: 'foto_44' }),
      c('Uma foto do aniversário?', 'c', [], { noItem: 'foto_aniversario', visited: 'r163' }),
      c('Depois.', END),
    ] },
    b: { speaker: 'fotografa', text: 'Benedito, diante da quarenta e quatro. Ele jura que nunca entrou. Fotografias não juram nada.', effects: [give('foto_44')], next: END },
    c: { speaker: 'fotografa', text: 'Essa eu nunca revelo. Mas para você... [As velas na foto ainda estão acesas.]', effects: [give('foto_aniversario')], next: END },
  }),
];

export const DIALOGUE: Record<string, DialogueDefinition> = Object.fromEntries(DIALOGUES.map(d => [d.id, d]));
