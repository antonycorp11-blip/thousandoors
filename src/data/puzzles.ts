import type { PuzzleDefinition, Effect } from '../core/types';

const frag = (n: number): Effect => ({ type: 'fragments', n, reason: 'enigma' });
const txt = (text: string): Effect => ({ type: 'text', text });

// Symbols used across the House (painted on walls, doors, drawings)
export const SYMBOLS: Record<string, { name: string; glyph: string; desc: string }> = {
  circulo: { name: 'Círculo', glyph: '○', desc: 'Sem começo nem fim.' },
  triangulo: { name: 'Triângulo', glyph: '△', desc: 'Três pontas.' },
  quadrado: { name: 'Quadrado', glyph: '□', desc: 'Quatro cantos. Fechado.' },
  lua: { name: 'Lua', glyph: '☾', desc: 'Crescente, desenhada com dois arcos.' },
  estrela: { name: 'Estrela', glyph: '✶', desc: 'Seis pontas desiguais.' },
  losango: { name: 'Losango', glyph: '◇', desc: 'Um quadrado que desistiu de ficar em pé.' },
  sol: { name: 'Sol', glyph: '☼', desc: 'Um círculo com raios desiguais, como num desenho infantil.' },
  olho: { name: 'Olho', glyph: '◉', desc: 'Um olho aberto. Às vezes fechado.' },
  porta: { name: 'Porta', glyph: '▯', desc: 'Um retângulo com um ponto: uma porta.' },
  espiral: { name: 'Espiral', glyph: '@', desc: 'Uma espiral que vai para dentro.' },
};

export const PUZZLES: PuzzleDefinition[] = [
  {
    id: 'p_sala10', type: 'doors', title: 'Três Símbolos, Três Portas', room: 'r010',
    prompt: 'Três portas, três símbolos. Uma frase riscada na parede de trás.',
    config: { doors: ['@r010_circle', '@r010_triangle', '@r010_square'] }, solution: '@r010_circle',
    clues: [{ room: 'r010', clueId: 'clue_sala10', text: '"O que não tem começo nem fim guarda a saída. O que tem três pontas mente. O que tem quatro cantos prende."' }],
    onSolve: [frag(2), { type: 'achievement', id: 'ach_primeira' }],
  },
  {
    id: 'p_tres_simbolos', type: 'symbols', title: 'Os Três Símbolos', room: 'r067', multiRun: true,
    prompt: 'Três placas giratórias na parede, cada uma com símbolos gravados. Uma fechadura de sol ao lado.',
    config: { symbols: ['lua', 'estrela', 'losango', 'sol', 'olho'], length: 3 }, solution: ['estrela', 'lua', 'losango'],
    clues: [{ room: 'r018', clueId: 'clue_desenho67', text: 'O desenho da Menina: primeiro a estrela, depois a lua, depois o losango.' }],
    onSolve: [frag(3), txt('As placas travam com um estalo. O sol ao redor da fechadura gira sozinho.'), { type: 'achievement', id: 'ach_menina' }],
    onFail: [txt('As placas voltam à posição inicial com um rangido.')],
  },
  {
    id: 'p_piano', type: 'sequence', title: 'A Melodia', room: 'r023',
    prompt: 'Cinco teclas ainda funcionam. O pianista espera.',
    config: { buttons: ['Dó', 'Ré', 'Mi', 'Sol', 'Lá'], notes: [261.6, 293.7, 329.6, 392, 440], length: 4 },
    solution: [0, 4, 2, 4],
    clues: [{ room: 'r018', clueId: 'clue_melodia', text: 'A caixa de música: quatro notas — baixa, alta, média, alta.' }],
    onSolve: [frag(3), txt('O pianista para. Pela primeira vez, ele vira um pouco a cabeça.'), { type: 'lore', id: 'memoria_aniversario' }, { type: 'route', axis: 'memoria', n: 1 }],
    onFail: [txt('Desafinado. O pianista suspira.')],
  },
  {
    id: 'p_relogio_34', type: 'clock', title: 'O Relógio Grande', room: 'r034',
    prompt: 'O relógio de pé está parado. O Relojoeiro diz que ele só anda na hora certa.',
    config: {}, solution: { h: 3, m: 17 },
    clues: [{ room: 'r003', clueId: 'clue_relogio_quarto', text: 'Um relógio de bolso parado às 3:17 na gaveta do quarto.' }, { room: 'r034', clueId: 'clue_317', text: '"Três e dezessete. Sempre três e dezessete."' }],
    onSolve: [frag(2), txt('Tique. Taque. Todos os relógios da sala andam um segundo — e param de novo, satisfeitos.'), { type: 'lore', id: 'bilhete_trem' }],
  },
  {
    id: 'p_relogio_porta', type: 'clock', title: 'O Mostrador na Porta', room: 'r140',
    prompt: 'Um mostrador sem ponteiros no lugar da fechadura. Dá para desenhar os ponteiros com o dedo.',
    config: {}, solution: { h: 3, m: 17 },
    clues: [{ room: 'r034', clueId: 'clue_317', text: 'Os relógios param às 3:17 "em solidariedade".' }],
    onSolve: [frag(2), txt('O mostrador faz clique. Algo destranca por dentro.')],
  },
  {
    id: 'p_mil_chaves', type: 'code', title: 'O Cadeado de Segredo', room: 'r061', multiRun: true,
    prompt: 'Um cadeado com quatro rodas numéricas. Riscado na porta: "o ano em que a Casa foi escrita".',
    config: { digits: 4, charset: '0123456789' }, solution: '1911',
    clues: [{ room: 'r053', clueId: 'clue_1911', text: 'A escritura da Casa foi lavrada em 1911.' }],
    onSolve: [frag(3), txt('As rodas param em 1-9-1-1. O cadeado se abre como quem suspira.')],
  },
  {
    id: 'p_mesa_jantar', type: 'order', title: 'Os Lugares à Mesa', room: 'r012',
    prompt: 'Sete cartões de lugar, fora de ordem. Um espaço na toalha indica onde cada um deveria estar.',
    config: { items: ['H.', 'T.', 'B.', 'O.', 'A.', 'M.', 'C.'] }, solution: ['M.', 'O.', 'T.', 'H.', 'B.', 'C.', 'A.'],
    clues: [{ room: 'r014', clueId: 'clue_ordem_sete', text: 'Legenda de um retrato: "Da esquerda para a direita: Marta, Orlando, Teodoro, Helena, Benedito, Clara, Aurélio".' }],
    onSolve: [frag(3), txt('Quando o último cartão encontra seu lugar, uma das cadeiras se afasta sozinha da mesa. Um convite.'), { type: 'giveItem', item: 'foto_sete' }],
  },
  {
    id: 'p_luzes_95', type: 'lights', title: 'Os Interruptores', room: 'r095',
    prompt: 'Nove interruptores. Cada um mexe com os vizinhos. As máquinas só param com todas as luzes acesas.',
    config: { w: 3, h: 3, initial: '010111010' }, solution: '111111111',
    clues: [{ room: 'r095', clueId: 'clue_luzes', text: 'Uma nota: "cada chave acende a si e às vizinhas em cruz".' }],
    onSolve: [frag(4), { type: 'lore', id: 'maquinas' }, { type: 'route', axis: 'ruptura', n: 2 }, { type: 'revealDoor', door: '@r095_hidden' }, txt('As máquinas param. No silêncio, uma porta aparece onde havia engrenagens.')],
  },
  {
    id: 'p_espelho_47', type: 'choice', title: 'O Espelho Grande', room: 'r047',
    prompt: 'Uma voz no espelho pergunta: "Quantas portas estão atrás de você agora?"',
    config: { options: ['Nenhuma', 'Uma', 'Duas', 'Três'] }, solution: 2,
    clues: [{ room: 'r047', clueId: 'clue_espelho', text: 'Rumor: espelhos mostram a sala como era antes de você entrar.' }],
    onSolve: [frag(2), { type: 'giveItem', item: 'chave_vidro' }, txt('O espelho sorri com a sua boca. Uma chave de vidro está no parapeito.')],
    onFail: [{ type: 'damage', n: 1, cause: 'o espelho' }, txt('O reflexo balança a cabeça. Você sente um corte que não existe.')],
  },
  {
    id: 'p_cadeiras_32', type: 'choice', title: 'As Cadeiras', room: 'r032',
    prompt: 'Uma voz baixa: "Qual delas estava olhando para você?"',
    config: { options: ['A primeira', 'A do meio', 'A última', 'Todas'] }, solution: 3,
    clues: [{ room: 'r032', clueId: 'clue_cadeiras', text: 'Quando você virou, todas as cadeiras estavam de frente para você.' }],
    onSolve: [frag(2), txt('As cadeiras voltam a olhar para a parede. Parecem envergonhadas.'), { type: 'route', axis: 'casa', n: 1 }],
    onFail: [txt('Uma cadeira cai. Só uma.')],
  },
  {
    id: 'p_telefone_30', type: 'code', title: 'O Telefone', room: 'r030',
    prompt: 'Um telefone de disco. Um papel colado: "ligue para a hora em que ela parou".',
    config: { digits: 3, charset: '0123456789' }, solution: '317',
    clues: [{ room: 'r003', clueId: 'clue_relogio_quarto', text: 'Relógio de bolso parado às 3:17.' }],
    onSolve: [frag(3), { type: 'sound', id: 'phone_voice' }, { type: 'lore', id: 'grav_2' }, { type: 'route', axis: 'memoria', n: 2 }],
    onFail: [txt('Tom de ocupado. Ou alguém respirando.')],
  },
  {
    id: 'p_radio_36', type: 'code', title: 'O Rádio', room: 'r036',
    prompt: 'Um rádio valvulado. O dial vai de 0000 a 9999. Riscado na madeira: "sintonize na última porta".',
    config: { digits: 4, charset: '0123456789' }, solution: '1000',
    clues: [{ room: 'r036', clueId: 'clue_radio', text: '"Sintonize na última porta."' }],
    onSolve: [frag(2), { type: 'giveItem', item: 'gravacao_1' }, { type: 'route', axis: 'casa', n: 1 }],
  },
  {
    id: 'p_quadros_77', type: 'order', title: 'Os Quatro Retratos', room: 'r077',
    prompt: 'Quatro retratos do mesmo homem em idades diferentes. Estão fora de ordem.',
    config: { items: ['Homem de barba grisalha', 'Menino de franja', 'Rapaz de chapéu', 'Homem de óculos rachados'] },
    solution: ['Menino de franja', 'Rapaz de chapéu', 'Homem de óculos rachados', 'Homem de barba grisalha'],
    clues: [{ room: 'r077', clueId: 'clue_retratos', text: 'Uma plaqueta: "Do começo ao fim".' }],
    onSolve: [frag(3), txt('O último retrato — o velho — agora tem os seus olhos.'), { type: 'lore', id: 'foto_sete' }, { type: 'route', axis: 'memoria', n: 1 }],
  },
  {
    id: 'p_livros_22', type: 'order', title: 'Os Volumes', room: 'r022',
    prompt: 'Quatro volumes do "Manual de Portas" fora de ordem na estante.',
    config: { items: ['Volume III', 'Volume I', 'Volume IV', 'Volume II'] }, solution: ['Volume I', 'Volume II', 'Volume III', 'Volume IV'],
    clues: [{ room: 'r022', clueId: 'clue_volumes', text: 'Números romanos nas lombadas.' }],
    onSolve: [frag(1), txt('Quando o Volume IV encosta no III, ele faz um som oco. Ele é oco.'), { type: 'giveItem', item: 'chave_ferro' }, { type: 'lore', id: 'livro_manual' }],
  },
  {
    id: 'p_bonecos_84', type: 'order', title: 'O Teatro de Bonecos', room: 'r084',
    prompt: 'Quatro cenários de papel. O espetáculo só começa na ordem certa.',
    config: { items: ['Um quarto de hospital verde', 'Uma cozinha com sol', 'Uma porta vermelha', 'Um bolo com duas velas'] },
    solution: ['Uma cozinha com sol', 'Um bolo com duas velas', 'Um quarto de hospital verde', 'Uma porta vermelha'],
    clues: [{ room: 'r147', clueId: 'clue_memorias_ordem', text: 'As memórias têm uma ordem: a cozinha vem primeiro.' }],
    onSolve: [frag(4), { type: 'giveItem', item: 'nome_bordado' }, { type: 'route', axis: 'memoria', n: 2 }, txt('Os bonecos encenam a sua vida em quatro atos. No último, o boneco que é você fica parado diante de uma porta vermelha. A cortina cai antes que ele abra.')],
  },
  {
    id: 'p_poco_80', type: 'choice', title: 'O Poço', room: 'r080',
    prompt: 'Uma voz sobe do poço: "Me dá algo que não é daqui."',
    config: { options: ['Uma moeda', 'Uma pedra lisa', 'Um pedaço de pão', 'Nada'] }, solution: 1,
    clues: [{ room: 'r080', clueId: 'clue_poco', text: '"De rio. Não há rio aqui."' }],
    onSolve: [frag(2), txt('Muito tempo depois, um som de água corrente. Um rio, lá embaixo. Uma porta range em algum lugar.'), { type: 'revealDoor', door: '@r080_hidden' }],
    onFail: [txt('Silêncio. Então, uma risada lá embaixo.')],
  },
  {
    id: 'p_capela_38', type: 'sequence', title: 'As Velas', room: 'r038',
    prompt: 'Cinco velas apagadas no altar. Um hino riscado atrás: "a do meio, a primeira, a última".',
    config: { buttons: ['1ª vela', '2ª vela', '3ª vela', '4ª vela', '5ª vela'], length: 3 }, solution: [2, 0, 4],
    clues: [{ room: 'r038', clueId: 'clue_hino', text: '"A do meio, a primeira, a última."' }],
    onSolve: [frag(2), { type: 'lore', id: 'bilhete_casa_4' }, { type: 'route', axis: 'obediencia', n: 2 }],
  },
  {
    id: 'p_nome_240', type: 'choice', title: 'O Nome', room: 'r240',
    prompt: 'As paredes estão cobertas de um nome riscado mil vezes, mas ilegível. Uma voz: "Diga."',
    config: { options: ['Teo', 'Teodoro', 'T.', 'Não sei'] }, solution: 1,
    clues: [{ room: 'r215', clueId: 'clue_assinatura', text: 'Na planta original, uma assinatura: "Teodoro A."' }],
    onSolve: [frag(5), { type: 'setFlag', flag: 'knows_name' }, txt('Teodoro. O nome cabe na sua boca como uma chave numa fechadura.'), { type: 'route', axis: 'memoria', n: 3 }],
    onFail: [txt('A voz repete o que você disse, e soa como o nome de outra pessoa.')],
  },
  {
    id: 'p_sala33', type: 'lights', title: 'A Sala Que Prende', room: 'r033',
    prompt: 'Seis lâmpadas pequenas no rodapé. Quando todas acenderem, talvez a sala solte você.',
    config: { w: 3, h: 2, initial: '010010' }, solution: '111111',
    clues: [{ room: 'r033', clueId: 'clue_luzes', text: 'Cada lâmpada mexe com as vizinhas em cruz.' }],
    onSolve: [frag(1), { type: 'revealDoor', door: '@r033_hidden' }, txt('As lâmpadas acendem juntas. Um contorno de porta aparece na parede.')],
    onFail: [{ type: 'damage', n: 1, cause: 'a sala que prende' }],
  },
  {
    id: 'p_mapa_119', type: 'choice', title: 'O Mapa Impossível', room: 'r119',
    prompt: 'O mapa na mesa pergunta, em nanquim: "Onde fica a Sala 1?"',
    config: { options: ['No canto de baixo', 'No centro', 'Em todos os cantos e no centro', 'Em lugar nenhum'] }, solution: 2,
    clues: [{ room: 'r026', clueId: 'clue_funda', text: 'O Cartógrafo: "Não é que a Casa seja grande. É que ela é funda."' }],
    onSolve: [frag(4), { type: 'revealMap', count: 20, around: 4 }, { type: 'lore', id: 'mapa_impossivel' }],
  },
  {
    id: 'p_espera_27', type: 'choice', title: 'A Senha', room: 'r027',
    prompt: 'O painel mostra "6". Uma campainha toca. Uma voz metálica: "Próximo. Qual é o seu número?"',
    config: { options: ['1', '6', '7', '41'] }, solution: 2,
    clues: [{ room: 'r027', clueId: 'clue_senha', text: 'Uma senha de espera com o número 7.' }],
    onSolve: [frag(2), txt('"Número sete. Seja bem-vindo de volta." O painel apaga.'), { type: 'route', axis: 'perdidos', n: 1 }],
  },
  {
    id: 'p_quarto_171', type: 'code', title: 'A Caixa de T.', room: 'r171',
    prompt: 'Uma caixa de madeira com cadeado de quatro dígitos, com um T gravado.',
    config: { digits: 4, charset: '0123456789' }, solution: '0999',
    clues: [{ room: 'r073', clueId: 'clue_999', text: 'Gravado no medalhão: "L. — 999 dias".' }],
    onSolve: [frag(4), { type: 'giveItem', item: 'diario_pagina_5' }, { type: 'giveItem', item: 'cartao_postal' }],
  },
  {
    id: 'p_eco_105', type: 'choice', title: 'O Que Mudou', room: 'r105',
    prompt: 'Esta é a Sala 1. Não é. Alguma coisa está diferente. O quê?',
    config: { options: ['As portas', 'A cadeira', 'A lâmpada', 'Você'] }, solution: 3,
    clues: [{ room: 'r001', clueId: 'clue_sala1', text: 'Você se lembra da Sala 1: três portas, uma lâmpada, uma cadeira.' }],
    onSolve: [frag(3), txt('Você. Você é o que mudou. A sala continua igual.'), { type: 'achievement', id: 'ach_eco' }],
  },
  {
    id: 'p_retrato_180', type: 'choice', title: 'O Retrato Vazio', room: 'r180',
    prompt: 'Uma moldura dourada, vazia. Na plaqueta: "Família". Quem falta?',
    config: { options: ['Helena', 'A menina', 'Você', 'Ninguém'] }, solution: 2,
    clues: [{ room: 'r014', clueId: 'clue_retrato_faltando', text: 'Numa parede de fotos, uma marca clara onde havia um retrato.' }],
    onSolve: [frag(4), txt('Quando você responde, a moldura não fica mais vazia: agora há o seu reflexo, sorrindo como na fotografia antiga.'), { type: 'route', axis: 'memoria', n: 2 }],
  },
  {
    id: 'p_estufa_70', type: 'lights', title: 'As Lâmpadas da Estufa', room: 'r070',
    prompt: 'Quatro lâmpadas de cultivo apagadas. Elas mexem umas com as outras.',
    config: { w: 2, h: 2, initial: '1000' }, solution: '1111',
    clues: [{ room: 'r070', clueId: 'clue_luzes', text: 'Cada lâmpada mexe com as vizinhas.' }],
    onSolve: [frag(2), txt('As plantas mortas parecem um pouco menos mortas.'), { type: 'giveItem', item: 'maca' }],
  },
];

export const PUZZLE: Record<string, PuzzleDefinition> = Object.fromEntries(PUZZLES.map(p => [p.id, p]));
export function registerPuzzle(p: PuzzleDefinition) { PUZZLE[p.id] = p; if (!PUZZLES.includes(p)) PUZZLES.push(p); }

/** Lights-out solvability via BFS over bit states (small grids only). */
export function lightsSolvable(w: number, h: number, initial: string, target: string): boolean {
  const n = w * h;
  if (n > 16) return true;
  const toBits = (s: string) => parseInt(s.split('').reverse().join(''), 2);
  const start = toBits(initial), goal = toBits(target);
  const masks: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) m |= 1 << (ny * w + nx);
    }
    masks.push(m);
  }
  const seen = new Set<number>([start]);
  const q = [start];
  while (q.length) {
    const s = q.shift()!;
    if (s === goal) return true;
    for (const m of masks) { const t = s ^ m; if (!seen.has(t)) { seen.add(t); q.push(t); } }
  }
  return false;
}
