// Authored rooms 0–40: Sala Zero, the reference sequence (1–10) and the early Residential Wing.
import { room, P, F, WL, ON, look, act, say, give, loreE, frag, hideProp, jr, route, clue, puzzle, pickup, reader, type AuthoredRoom } from './builders';

export const AUTHORED_1: AuthoredRoom[] = [
  // ───────────────────── SALA ZERO ─────────────────────
  room({
    number: 0, name: 'sala_zero', title: 'Sala Zero', subtitle: 'Entre uma tentativa e outra.', category: 'hub', theme: 'zero', region: 'zero',
    hideNumber: true, fixedExits: true, ambience: 'zero', tags: ['hub', 'safe'],
    front: [
      P('bulb', 960, { y: 0, light: { r: 620, i: 0.9 }, anim: 'flicker' }),
      F('chair', 1560, 0.22, { label: 'Cadeira', examine: 'A mesma cadeira da Sala 1. Você tem certeza.' }),
      WL('mural', 1450, 560, { id: 'mural', label: 'Mural', cond: { any: [{ loreCount: { gte: 2 } }, { runs: { gte: 1 } }] }, examine: 'Fios vermelhos, papéis, salas. Seu mapa mental, pregado na parede.', interact: [act('Estudar o mapa', [{ type: 'ui', panel: 'map' }])] }),
      F('desk', 420, 0.18, { id: 'desk', cond: { deaths: { gte: 1 } }, examine: 'Uma escrivaninha. Seu diário está aberto sobre ela, na última página.', interact: [act('Ler o diário', [{ type: 'ui', panel: 'journal' }]), act('Histórico de explorações', [{ type: 'ui', panel: 'runs' }])] }),
      ON('desk', 420, 0.18, 'book', -40, { id: 'diary', cond: { deaths: { gte: 1 } } }),
      ON('desk', 420, 0.18, 'lamp_table', 70, { id: 'desk_lamp', cond: { deaths: { gte: 1 } }, light: { r: 260, i: 0.8 }, anim: 'flicker' }),
      WL('photo_frames', 700, 470, { id: 'photos', cond: { lore: 'foto_casa' }, examine: 'A fotografia antiga, pregada na parede. Sete pessoas. Uma delas é você.', interact: [act('Olhar de perto', [{ type: 'read', lore: 'foto_casa' }])] }),
    ],
    back: [
      P('bulb', 960, { y: 0, light: { r: 520, i: 0.7 } }),
      F('reliquary', 520, 0.12, { id: 'reliquary', cond: { any: [{ fragmentsTotal: { gte: 3 } }, { deaths: { gte: 1 } }] }, label: 'Relicário', examine: 'Um pequeno armário de vidro. Dentro, luz que parece lembrança.', interact: [act('Abrir o relicário', [{ type: 'ui', panel: 'upgrades' }])], light: { r: 200, i: 0.5, color: '#b9a58a' } }),
      F('shelf_collection', 1400, 0.1, { id: 'collection', cond: { collectionCount: { gte: 1 } }, label: 'Estante', examine: 'Coisas que você trouxe de volta. Elas ficam, mesmo quando você não fica.', interact: [act('Ver coleção', [{ type: 'ui', panel: 'inventory' }]), act('Ver chaveiro', [{ type: 'ui', panel: 'keyring' }])] }),
      F('standing_faceless', 1720, 0.05, { id: 'zero_faceless', cond: { runs: { gte: 4 } }, examine: 'Ele está sempre ali agora. No canto. Não faz nada. Espera.' }),
    ],
    frontDesc: 'Uma porta. Uma lâmpada. É daqui que você sempre recomeça.',
    backDesc: 'A parede de trás. Nela, com o tempo, apareceram coisas.',
  }),

  // ───────────────────── 01 — SALA INICIAL ─────────────────────
  room({
    number: 1, name: 'sala_inicial', title: 'Sala Inicial', subtitle: 'Três portas simples. Tudo parece normal.', category: 'normal', theme: 'plain', fixedExits: true,
    front: [
      P('bulb', 960, { y: 0, light: { r: 700, i: 1 }, anim: 'flicker' }),
      F('dresser_small', 300, 0.12, { id: 'dresser', label: 'Cômoda', examine: 'Uma cômoda baixa. As gavetas estão vazias. Uma delas tem cheiro de lavanda.', interact: [act('Abrir gavetas', [say('Vazias. Lavanda. Alguém guardava roupas limpas aqui.')])] }),
      ON('dresser_small', 300, 0.12, 'vase', -30, { id: 'vase', examine: 'Um vaso azul, vazio, limpo. Alguém o limpa.' }),
      F('chair', 1640, 0.16, { id: 'chair', label: 'Cadeira', examine: 'Uma cadeira de madeira simples.', interact: [act('Sentar', [say('Você se senta. O assento está morno, como se alguém tivesse acabado de levantar.')])] }),
    ],
    back: [
      P('bulb', 960, { y: 0, light: { r: 560, i: 0.8 } }),
      WL('coat_hook', 1250, 470, { examine: 'Um cabide de parede. Vazio. Há um fio de lã preso nele — da cor do seu casaco.' }),
      WL('note_pinned', 960, 600, { id: 'bilhete', label: 'Bilhete', anim: 'sway', examine: 'Um papel dobrado, preso com um alfinete. A letra parece a sua.', interact: [act('Ler o bilhete', [{ type: 'read', lore: 'bilhete_t0' }, { type: 'setFlag', flag: 'bilhete_lido' }, { type: 'journal', cat: 'memorias', text: 'Sala 1: um bilhete na minha letra diz que fui eu que tranquei a porta da direita. A chave está "com quem vende o que não é dele". Primeiro, encontrar "o homem que espera".', id: 'j_bilhete' }])] }),
      WL('painting', 640, 520, { id: 'painting', variant: 'landscape', examine: 'Uma paisagem escura: uma casa sem janelas num campo. Você não gosta de olhar muito.' }),
      P('clue_hint', 960, { invisible: true, hotspot: { w: 220, h: 140, secret: true }, y: 790, d: 0, examine: 'Riscos no rodapé, bem pequenos: "1".', interact: [act('Olhar os riscos', [say('Alguém contou até 1 aqui. Parou.'), clue('clue_sala1')])] }),
    ],
    exits: [
      { to: 2, ref: 'r001_a', x: 560, m: 'wood_dark', important: true },
      { to: 4, ref: 'r001_b', x: 960, m: 'white', important: true },
      { to: 37, ref: 'r001_c', x: 1360, m: 'wood_dark', lock: 'L_r001_c', v: { lock: 'brass' }, listen: 'Do outro lado, algo que parece chuva num telhado de vidro.' },
    ],
    frontDesc: 'Três portas. Uma lâmpada. Uma cadeira.', backDesc: 'Parede. Um cabide vazio.',
  }),

  // ───────────────────── 02 — CORREDOR ─────────────────────
  room({
    number: 2, name: 'corredor', title: 'Corredor', subtitle: 'Um corredor estreito com portas em posições diferentes.', category: 'normal', theme: 'corridor', layout: 'corridor', fixedExits: true,
    front: [
      WL('sconce', 470, 470, { light: { r: 300, i: 0.9 }, anim: 'flicker' }),
      F('side_table', 560, 0.25, { id: 'side_table', examine: 'Uma mesinha com uma planta que não precisa de sol, porque morreu faz tempo.' }),
      ON('side_table', 560, 0.25, 'plant_small', 0),
      WL('painting', 820, 600, { variant: 'small_dark', scale: 0.6 }),
      WL('painting', 1100, 590, { variant: 'portrait', scale: 0.55, id: 'painting2' }),
      F('runner_rug', 960, 0.45, { z: -1 }),
      F('side_table', 1400, 0.3, { id: 'side_table2' }),
      ON('side_table', 1400, 0.3, 'lamp_table', 0, { light: { r: 320, i: 0.9 }, anim: 'flicker' }),
    ],
    back: [P('bulb', 960, { y: 0, light: { r: 400, i: 0.6 } })],
    exits: [
      { to: 5, x: 330, wall: 'left', d: 0.55, m: 'oxblood', important: true },
      { to: 6, x: 960, m: 'blue', important: true },
      { to: 3, x: 1580, wall: 'right', d: 0.45, m: 'white', important: true },
    ],
  }),

  // ───────────────────── 03 — QUARTO ─────────────────────
  room({
    number: 3, name: 'quarto', title: 'Quarto', subtitle: 'Parece um quarto comum... ou não.', category: 'object', theme: 'bedroom', fixedExits: true, tags: ['has_painting'],
    front: [
      P('bulb', 960, { y: 0, light: { r: 520, i: 0.7 }, anim: 'flicker' }),
      F('bed', 280, 0.28, { examine: 'Uma cama desfeita. O travesseiro tem a marca de uma cabeça. A marca ainda está morna.', interact: [act('Deitar', [say('Você não consegue. Não é a sua cama. É?')])] }),
      F('nightstand', 520, 0.14, { id: 'nightstand', label: 'Criado-mudo', examine: 'Um criado-mudo com uma gaveta pequena.', interact: [act('Abrir a gaveta', [give('relogio_bolso'), clue('clue_relogio_quarto'), say('Um relógio de bolso, parado às 3:17. O vidro está rachado.'), jr('objetos', 'Sala 3: relógio de bolso parado às 3:17, na gaveta do criado-mudo.')], { cond: { noItem: 'relogio_bolso' }, once: 'run' })] }),
      ON('nightstand', 520, 0.14, 'lamp_table', 0, { light: { r: 280, i: 0.9 }, anim: 'flicker' }),
      WL('painting', 190, 520, { id: 'painting', variant: 'landscape', scale: 0.7 }),
      F('dresser', 1500, 0.12, { examine: 'Uma cômoda com espelho. No espelho, a sala parece um pouco mais escura.' }),
      WL('mirror', 1500, 470, { id: 'mirror', scale: 0.8 }),
      F('bookshelf', 1720, 0.08, { examine: 'Livros sem título na lombada.' }),
      F('boxes', 1570, 0.34, { examine: 'Caixas de mudança, fechadas com fita. Uma diz: "cozinha — frágil".' }),
      F('rug', 960, 0.5, { z: -1 }),
    ],
    back: [P('bulb', 960, { y: 0, light: { r: 420, i: 0.6 } }), WL('window', 960, 560, { variant: 'rain', examine: 'Uma janela. Do outro lado, uma parede de tijolos a um palmo do vidro. Chove entre o vidro e os tijolos.' })],
    exits: [
      { to: 7, x: 770, m: 'wood_dark', important: true },
      { to: 9, x: 1030, m: 'green' },
      { to: 11, x: 1290, m: 'white' },
    ],
  }),

  // ───────────────────── 04 — SALA VAZIA ─────────────────────
  room({
    number: 4, name: 'sala_vazia', title: 'Sala Vazia', subtitle: 'Apenas portas e silêncio.', category: 'normal', theme: 'empty', fixedExits: true, ambience: 'silence', tags: ['empty'],
    front: [P('lamp_shade', 960, { y: 0, light: { r: 620, i: 0.9 } })],
    back: [P('lamp_shade', 960, { y: 0, light: { r: 500, i: 0.6 } })],
    exits: [
      { to: 8, ref: 'r004_a', x: 640, m: 'grey', type: 'observer', alt: 11 },
      { to: 5, x: 960, m: 'oxblood', important: true },
      { to: 6, x: 1280, m: 'wood_dark', important: true },
    ],
    frontDesc: 'Nada. Portas. Silêncio.',
  }),

  // ───────────────────── 05 — SALA COM PERSONAGEM ─────────────────────
  room({
    number: 5, name: 'sala_personagem', title: 'O Homem Sentado', subtitle: 'Um homem sentado observa cada porta que você abre.', category: 'character', theme: 'plain', fixedExits: true,
    front: [
      F('coat_rack', 200, 0.1, { examine: 'Um cabide de pé com um casaco cinza. Nos bolsos: nada. Mas o casaco é do seu tamanho.' }),
      F('side_table', 380, 0.16, { id: 't5' }),
      ON('side_table', 380, 0.16, 'lamp_table', 0, { light: { r: 330, i: 1 }, anim: 'flicker' }),
      F('boxes', 690, 0.24, { examine: 'Caixas de papelão. Uma tem o nome "Joaquim" escrito à mão.' }),
      WL('painting', 870, 560, { variant: 'dark_square', scale: 0.7, examine: 'Um quadro tão escuro que parece um buraco na parede.' }),
      F('rug', 700, 0.5, { z: -1 }),
    ],
    back: [WL('sconce', 700, 470, { light: { r: 260, i: 0.6 } }), F('chair', 1300, 0.1, { id: 'chair_empty', examine: 'Outra cadeira. Vazia. Virada para a cadeira do homem.' })],
    exits: [
      { to: 7, x: 1000, m: 'oxblood', important: true },
      { to: 12, x: 1480, m: 'wood_dark' },
    ],
  }),

  // ───────────────────── 06 — SALA DE EVENTO ─────────────────────
  room({
    number: 6, name: 'sala_evento', title: 'A Cadeira Caída', subtitle: 'Os papéis no chão foram espalhados às pressas.', category: 'event', theme: 'plain', fixedExits: true, tags: ['has_chair'],
    front: [
      P('bulb', 960, { y: 0, light: { r: 540, i: 0.8 }, anim: 'flicker' }),
      F('chair_fallen', 540, 0.24, { id: 'chair', examine: 'Uma cadeira caída. Uma das pernas está quebrada.', interact: [act('Levantar a cadeira', [say('Você a coloca de pé. Ela cai de novo sozinha, devagar, como se alguém a empurrasse.')], { once: 'visit' })] }),
      F('blood', 900, 0.35, { z: -1, examine: 'Manchas escuras. Secas. Não muito antigas.' }),
      F('papers', 1120, 0.4, { z: -1, id: 'papers', label: 'Papéis', examine: 'Papéis espalhados.', interact: [act('Ler os papéis', [say('Numa folha, com letra apressada: "Não confie na porta branca."'), { type: 'rumor', id: 'rumor_branca' }, jr('rumores', 'Sala 6: bilhete dizendo "Não confie na porta branca".')])] }),
      F('dresser_small', 1560, 0.12, { id: 'd6' }),
      ON('dresser_small', 1560, 0.12, 'candle', 0, { light: { r: 200, i: 0.9 }, anim: 'flame' }),
      WL('curtain', 1740, 780, {}),
    ],
    back: [WL('painting', 960, 540, { variant: 'portrait', examine: 'O retrato de uma mulher. Alguém arranhou os olhos com uma unha.' })],
    exits: [
      { to: 8, x: 740, m: 'wood_dark', important: true },
      { to: 10, x: 960, m: 'white', v: { stain: true } },
      { to: 13, x: 1300, m: 'blue' },
    ],
  }),

  // ───────────────────── 07 — SALA COM OBJETO ─────────────────────
  room({
    number: 7, name: 'sala_objeto', title: 'A Mesa da Fotografia', subtitle: 'Uma fotografia virada para baixo espera sobre a mesa.', category: 'object', theme: 'green', fixedExits: true,
    front: [
      F('bookshelf', 620, 0.06, { examine: 'Livros. Muitos com o mesmo título: "Portas". Volumes diferentes.' }),
      F('table', 960, 0.2, { id: 'table', examine: 'Uma mesa de madeira escura, arranhada.' }),
      ON('table', 960, 0.2, 'photo', -40, { id: 'photo', cond: { noItem: 'fotografia_casa' }, label: 'Fotografia', examine: 'Uma fotografia virada para baixo.', interact: [act('Virar a fotografia', [give('fotografia_casa'), hideProp('photo', 'meta'), { type: 'read', lore: 'foto_casa' }, { type: 'achievement', id: 'ach_ja_estive' }, jr('memorias', 'Sala 7: uma fotografia antiga mostra alguém idêntico a mim diante da Casa. No verso: "Se você encontrou isto novamente, eu falhei."'), route('memoria', 2)])] }),
      ON('table', 960, 0.2, 'lamp_oil', 80, { light: { r: 300, i: 1 }, anim: 'flame' }),
      F('chair', 1140, 0.26, { id: 'chair' }),
      F('stool', 1580, 0.24, {}),
      WL('painting', 860, 560, { variant: 'small_dark', scale: 0.5 }),
      WL('photo_frames', 1080, 540, { scale: 0.6 }),
      F('rug', 960, 0.55, { z: -1 }),
    ],
    back: [WL('sconce', 960, 470, { light: { r: 300, i: 0.7 } }), F('crate', 400, 0.2, {})],
    exits: [
      { to: 10, x: 330, m: 'wood_light', important: true },
      { to: 14, x: 1330, m: 'blue' },
    ],
  }),

  // ───────────────────── 08 — SALA ESCONDIDA ─────────────────────
  room({
    number: 8, name: 'sala_escondida', title: 'A Parede Costurada', subtitle: 'O papel de parede tem uma linha reta demais.', category: 'secret', theme: 'parlor', fixedExits: true,
    front: [
      P('chandelier', 960, { y: 0, light: { r: 520, i: 0.7 } }),
      F('sheet_table', 300, 0.12, { id: 'st' }),
      ON('sheet_table', 300, 0.12, 'bust', 0, { id: 'bust', examine: 'Um busto de gesso. O nariz foi quebrado e colado de volta, torto.' }),
      F('frame_floor', 440, 0.3, { examine: 'Uma moldura vazia, apoiada no chão.' }),
      WL('door_outline', 960, 800, { id: 'crack', hotspot: { w: 200, h: 390, secret: true }, examine: 'Uma rachadura fina no papel de parede. Reta demais para ser rachadura.', interact: [act('Empurrar a parede', [{ type: 'revealDoor', door: '@r008_hidden' }, hideProp('crack', 'meta'), { type: 'achievement', id: 'ach_segredo' }, frag(2), say('A parede cede. Não era parede.')], { once: 'forever' })] }),
      F('sheet_furniture', 1520, 0.18, { examine: 'Um móvel coberto por um lençol. A forma embaixo parece uma pessoa sentada. É uma poltrona. É?' }),
      F('easel', 1680, 0.1, {}),
    ],
    back: [WL('painting', 960, 540, { variant: 'landscape' })],
    exits: [
      { to: 9, x: 690, m: 'wood_dark', important: true },
      { to: 11, x: 1280, m: 'blue' },
      { to: 16, ref: 'r008_hidden', x: 960, m: 'painted', hidden: true, revealHint: 'Rachadura reta no papel de parede.' },
    ],
  }),

  // ───────────────────── 09 — SALA DIFERENTE ─────────────────────
  room({
    number: 9, name: 'sala_diferente', title: 'O Piso Inclinado', subtitle: 'A luz e o chão discordam sobre o que é reto.', category: 'anomaly', theme: 'blue', tilt: -3.5, fixedExits: true, tags: ['has_clock'],
    front: [
      P('lamp_shade', 820, { y: 0, light: { r: 480, i: 0.8 }, rot: -8 }),
      WL('painting', 280, 520, { rot: -14, variant: 'small_dark' }),
      WL('painting', 700, 430, { rot: 9, id: 'p2', variant: 'portrait', scale: 0.6 }),
      WL('clock_wall', 1150, 380, { examine: 'Um relógio de parede. Os ponteiros giram ao contrário, muito devagar.' }),
      F('stool', 520, 0.22, { rot: -6 }),
      F('chest', 220, 0.3, { rot: 4, examine: 'Um baú. Trancado por dentro. Por dentro?' }),
      F('door_leaning', 1400, 0.1, { rot: 16, examine: 'Uma porta solta, apoiada na parede. Sem batente. Atrás dela, só parede.', interact: [act('Abrir', [say('Você abre. Parede. Você fecha. Por um segundo, jura ter visto luz pela fresta.')])] }),
      WL('painting', 1720, 470, { rot: 22, id: 'p3', variant: 'landscape', scale: 0.55 }),
    ],
    back: [WL('frames_tilted', 960, 520, {})],
    exits: [
      { to: 10, x: 400, m: 'oxblood', important: true },
      { to: 12, x: 840, m: 'wood_dark' },
    ],
  }),

  // ───────────────────── 10 — SALA COM ENIGMA ─────────────────────
  room({
    number: 10, name: 'sala_enigma', title: 'As Três Marcas', subtitle: 'Cada porta carrega um símbolo diferente.', category: 'puzzle', theme: 'parlor', fixedExits: true, puzzle: 'p_sala10',
    front: [
      WL('symbol', 560, 400, { variant: 'circulo', examine: 'Um círculo pintado acima da porta.' }),
      WL('symbol', 960, 400, { variant: 'triangulo', id: 's2', examine: 'Um triângulo pintado acima da porta.' }),
      WL('symbol', 1360, 400, { variant: 'quadrado', id: 's3', examine: 'Um quadrado pintado acima da porta.' }),
      WL('sconce_candle', 330, 560, { light: { r: 240, i: 0.9 }, anim: 'flame' }),
      F('side_table', 230, 0.2, { id: 'tt' }),
      ON('side_table', 230, 0.2, 'lamp_oil', 0, { light: { r: 260, i: 0.9 }, anim: 'flame' }),
      F('cabinet', 1640, 0.12, { id: 'cab' }),
      ON('cabinet', 1640, 0.12, 'candle', 0, { light: { r: 220, i: 0.9 }, anim: 'flame' }),
      F('floor_circle', 960, 0.55, { z: -1, examine: 'Um círculo desenhado no assoalho, com símbolos que parecem um relógio sem números.' }),
    ],
    back: [
      WL('inscription', 960, 560, { examine: 'Palavras riscadas na parede.', interact: [act('Ler', [say('"O que não tem começo nem fim guarda a saída. O que tem três pontas mente. O que tem quatro cantos prende."'), clue('clue_sala10'), jr('simbolos', 'Sala 10: "O que não tem começo nem fim guarda a saída. O que tem três pontas mente. O que tem quatro cantos prende."')])] }),
      WL('sconce_candle', 600, 560, { light: { r: 240, i: 0.8 }, anim: 'flame' }),
      WL('sconce_candle', 1320, 560, { light: { r: 240, i: 0.8 }, anim: 'flame', id: 'sc2' }),
    ],
    exits: [
      { to: 17, ref: 'r010_circle', x: 560, m: 'oxblood', v: { symbol: 'circulo' }, important: true, onOpen: [{ type: 'solvePuzzle', id: 'p_sala10' }] },
      { to: 1, ref: 'r010_triangle', x: 960, m: 'white', type: 'cyclic', v: { symbol: 'triangulo' }, onOpen: [say('O triângulo mente.', 'whisper')] },
      { to: 33, ref: 'r010_square', x: 1360, m: 'teal', type: 'oneway', oneway: true, v: { symbol: 'quadrado' } },
    ],
  }),

  // ───────────────────── 11 — ESCADARIA ─────────────────────
  room({
    number: 11, name: 'escadaria', title: 'Escadaria', subtitle: 'Degraus que sobem e descem ao mesmo tempo.', category: 'transition', theme: 'corridor',
    front: [F('stairs', 960, 0.05, { examine: 'Uma escada sobe para o escuro. Você sobe três degraus e percebe que está descendo.', interact: [act('Subir', [say('Você sobe. E sobe. E está no mesmo lugar, um pouco mais cansado.')])] }), WL('sconce', 600, 470, { light: { r: 280, i: 0.8 }, anim: 'flicker' })],
    back: [WL('sconce', 960, 470, { light: { r: 260, i: 0.6 } })],
    exits: [{ to: 15, x: 400, m: 'wood_light' }, { to: 19, x: 1520, m: 'wood_dark' }],
  }),

  // ───────────────────── 12 — SALA DE JANTAR ─────────────────────
  room({
    number: 12, name: 'jantar', title: 'Sala de Jantar', subtitle: 'Sete lugares postos.', category: 'lore', theme: 'parlor', puzzle: 'p_mesa_jantar', tags: ['important', 'has_painting'],
    front: [
      P('chandelier', 960, { y: 0, light: { r: 600, i: 0.8 } }),
      F('table_long', 960, 0.24, { id: 'table', examine: 'Uma mesa comprida posta para sete. Os cartões de lugar estão fora de ordem.', interact: [act('Arrumar os cartões', [puzzle('p_mesa_jantar')], { cond: { puzzleUnsolved: 'p_mesa_jantar' } })] }),
      ON('table_long', 960, 0.24, 'plates', 0, { id: 'plates', examine: 'Sete pratos. Um está quente.', interact: [act('Levantar o prato quente', [give('chave_17'), clue('clue_17'), say('Debaixo do prato quente: uma chave com uma etiqueta. "17".'), jr('chaves', 'Sala 12: uma chave com o número 17, debaixo de um prato. Nenhuma porta com fechadura numerada à vista.'), hideProp('plates', 'run')], { cond: { noItem: 'chave_17', notFlag: 'porta17_aberta' }, once: 'run' }), pickup('card', 'cartao_lugar', 'Pegar o cartão "T."')] }),
      ON('table_long', 960, 0.24, 'candelabra', -260, { light: { r: 260, i: 0.9 }, anim: 'flame', id: 'cand1' }),
      ON('table_long', 960, 0.24, 'candelabra', 260, { light: { r: 260, i: 0.9 }, anim: 'flame', id: 'cand2' }),
      WL('painting', 380, 520, { id: 'painting', variant: 'portrait' }),
    ],
    back: [F('cabinet', 1400, 0.1, { examine: 'Um guarda-louça. Sete xícaras. Uma tem uma rachadura em forma de porta.' })],
    exits: [{ to: 46, ref: 'r012_back', side: 'back', x: 700, m: 'wood_dark', lock: 'L_r012_back', v: { lock: 'iron', panels: 2 } }],
  }),

  // ───────────────────── 13 — BANHEIRO ─────────────────────
  room({
    number: 13, name: 'banheiro', title: 'Banheiro', subtitle: 'Uma torneira pinga no ritmo de alguém contando.', category: 'event', theme: 'bathroom', ambience: 'drip',
    front: [
      P('bulb', 960, { y: 0, light: { r: 500, i: 0.8 }, anim: 'flicker' }),
      F('bathtub', 480, 0.2, { examine: 'Uma banheira com água até a metade. Fria. Parada. Nada no fundo. Você olha de novo. Nada.' }),
      F('sink', 1300, 0.08, { examine: 'A torneira pinga. Uma. Duas. Três. Dezessete. Para.' }),
      WL('mirror', 1300, 470, { id: 'mirror', variant: 'plain', examine: 'Seu reflexo. Cansado. Mais velho do que você lembrava.' }),
    ],
    back: [WL('towel', 960, 560, { examine: 'Uma toalha com iniciais bordadas: H.A.' })],
  }),

  // ───────────────────── 14 — SALA DOS RETRATOS ─────────────────────
  room({
    number: 14, name: 'retratos', title: 'Sala dos Retratos', subtitle: 'Rostos que olham para a porta.', category: 'lore', theme: 'gallery', tags: ['important', 'has_painting'],
    front: [
      WL('photo_frames', 500, 540, { id: 'fr1', examine: 'Fotografias de pessoas diante de portas. Todas sorriem do mesmo jeito cansado.' }),
      WL('photo_wall_gap', 960, 520, { examine: 'Uma marca clara no papel de parede onde havia um retrato grande. O prego ainda está lá.', interact: [act('Olhar a marca', [clue('clue_retrato_faltando'), say('Alguém tirou um retrato daqui. Recentemente.')])] }),
      WL('photo_frames', 1420, 540, { id: 'fr2', variant: 'b', examine: 'Um retrato de grupo, com legenda datilografada.', interact: [act('Ler a legenda', [say('"Da esquerda para a direita: Marta, Orlando, Teodoro, Helena, Benedito, Clara, Aurélio."'), clue('clue_ordem_sete'), jr('pessoas', 'Sala 14: legenda de retrato — Marta, Orlando, Teodoro, Helena, Benedito, Clara, Aurélio.')])] }),
      WL('sconce', 960, 380, { light: { r: 320, i: 0.8 } }),
      F('bench', 960, 0.4, {}),
    ],
    back: [WL('painting', 960, 540, { id: 'painting', variant: 'portrait' })],
  }),

  // ───────────────────── 15 — COZINHA ─────────────────────
  room({
    number: 15, name: 'cozinha', title: 'Cozinha', subtitle: 'Cheiro de chá. Ninguém cozinha aqui. Alguém cozinha aqui.', category: 'character', theme: 'kitchen', region: 'servico',
    front: [
      P('lamp_shade', 960, { y: 0, light: { r: 560, i: 0.9 } }),
      F('stove', 420, 0.08, { examine: 'Um fogão a lenha. A chaleira está quase fervendo. Sempre quase.' }),
      F('tea_table', 1100, 0.22, { id: 'tt' }),
      ON('tea_table', 1100, 0.22, 'teacups', 0, { examine: 'Duas xícaras. Uma cheia e fria. Uma vazia, com marca de batom.' }),
      WL('keys_hook', 700, 520, { id: 'key_hook', cond: { noItem: 'chave_servico' }, examine: 'Um gancho com uma chave comprida. A etiqueta foi lavada até sumir.', interact: [pickup('key_hook', 'chave_servico', 'Pegar a chave', [jr('chaves', 'Cozinha (15): uma chave comprida com etiqueta apagada. Só se lê um "S".')])] }),
      F('bucket', 1600, 0.3, {}),
    ],
    back: [F('cabinet', 700, 0.08, { examine: 'Armário de mantimentos. Pão duro. Muito pão duro.', interact: [pickup('cabinet', 'pao', 'Pegar pão')] }), WL('calendar', 1300, 560, { examine: 'Um calendário. Todos os dias riscados. Todos os meses. Todos os anos.' })],
  }),

  // ───────────────────── 16 — QUARTO SECRETO ─────────────────────
  room({
    number: 16, name: 'quarto_secreto', title: 'Quarto Secreto', subtitle: 'Alguém escrevia aqui escondido.', category: 'secret', theme: 'bedroom', tags: ['important'],
    front: [
      F('desk', 960, 0.16, { id: 'desk' }),
      ON('desk', 960, 0.16, 'candle', -80, { light: { r: 260, i: 1 }, anim: 'flame' }),
      ON('desk', 960, 0.16, 'letter', 40, { id: 'page', cond: { noItem: 'diario_pagina_1' }, label: 'Página', interact: [pickup('page', 'diario_pagina_1', 'Ler e guardar', [{ type: 'read', lore: 'diario_t1' }, route('memoria'), jr('memorias', 'Sala 16: uma página de diário na minha letra. "Eu desenhei a primeira porta."')], true)] }),
      F('chair', 1080, 0.24, { id: 'chair' }),
      F('bed_small', 350, 0.25, { examine: 'Uma cama estreita. Dormiram pouco aqui.' }),
    ],
    back: [WL('drawing', 960, 540, { examine: 'Um desenho a carvão de uma porta. Só uma porta. Muito bem feito.' })],
  }),

  // ───────────────────── 17 — SALA DO CÍRCULO ─────────────────────
  room({
    number: 17, name: 'circulo', title: 'Sala do Círculo', subtitle: 'O que não tem começo nem fim.', category: 'sanctuary', theme: 'empty', anchorable: true, tags: ['important', 'sanctuary'],
    front: [F('floor_circle', 960, 0.45, { z: -1 }), F('candle_floor', 960, 0.3, { light: { r: 300, i: 1 }, anim: 'flame', examine: 'Uma vela acesa no centro do círculo. Quem acende?' })],
    back: [WL('inscription', 960, 540, { examine: 'Riscado: "Você acertou. Da outra vez também."' })],
  }),

  // ───────────────────── 18 — QUARTO DA MENINA ─────────────────────
  room({
    number: 18, name: 'quarto_menina', title: 'Quarto da Menina', subtitle: 'Desenhos em todas as paredes.', category: 'character', theme: 'nursery', region: 'residencial', tags: ['important'],
    front: [
      WL('drawings_wall', 500, 560, { examine: 'Desenhos de salas. Alguns você reconhece. Outros, não. Ainda.' }),
      WL('drawings_wall', 1500, 560, { id: 'dw2', variant: 'b', examine: 'Um desenho de três símbolos com setinhas. E um sol torto.' }),
      F('bed_child', 1500, 0.22, {}),
      F('toy_box', 420, 0.26, { id: 'toys', examine: 'Uma caixa de brinquedos.', interact: [pickup('toys', 'caixa_musica', 'Pegar a caixa de música', [clue('clue_melodia'), say('Quatro notas: baixa, alta, média, alta.'), { type: 'sound', id: 'musicbox' }])] }),
      WL('window', 960, 520, { variant: 'night', examine: 'Uma janela pintada na parede. Com estrelas de giz.' }),
    ],
    back: [WL('height_marks', 960, 560, { examine: 'Marcas de altura no batente. Só uma marca, bem baixa: "L."' })],
  }),

  // ───────────────────── 19 — DEPÓSITO ─────────────────────
  room({
    number: 19, name: 'deposito', title: 'Depósito', subtitle: 'Coisas guardadas para depois. Depois nunca veio.', category: 'object', theme: 'storage',
    front: [
      P('bulb', 960, { y: 0, light: { r: 420, i: 0.7 }, anim: 'flicker' }),
      F('crate', 420, 0.12, { id: 'crate', examine: 'Um caixote. Tem um pé-de-cabra encostado.', interact: [pickup('crate', 'pe_de_cabra', 'Pegar o pé-de-cabra', [jr('objetos', 'Depósito (19): um pé-de-cabra. Serve para forçar portas.')])] }),
      F('boxes', 700, 0.2, {}), F('shelves_jars', 1450, 0.06, { examine: 'Potes com rótulos: "botões", "dentes de leite", "chaves que não servem".' }),
      F('sheet_furniture', 1200, 0.2, {}),
    ],
    back: [F('boxes', 960, 0.1, { id: 'b2' })],
  }),

  // ───────────────────── 20 — SALA SEM NÚMERO ─────────────────────
  room({
    number: 20, name: 'sem_numero', title: '??', subtitle: 'Onde estaria o número, marcas de unha.', category: 'secret', theme: 'ruin', hideNumber: true, tags: ['important'],
    front: [
      WL('scratches', 960, 300, { examine: 'Marcas de unha ao redor de uma placa arrancada.' }),
      F('papers', 700, 0.35, { z: -1, id: 'plan', interact: [pickup('plan', 'planta_baixa', 'Pegar a planta rasgada', [{ type: 'read', lore: 'casa_planta' }, route('casa')])] }),
      WL('seam', 1500, 780, { hotspot: { w: 90, h: 600, secret: true }, examine: 'Uma linha fina no canto, como costura.', interact: [act('Puxar a costura', [{ type: 'sound', id: 'scream_house' }, { type: 'shake', intensity: 0.01, ms: 600 }, { type: 'lore', id: 'casa_costuras' }, route('ruptura', 2), { type: 'damage', n: 1, cause: 'a costura da Casa' }], { once: 'forever' })] }),
    ],
    back: [],
  }),

  // ───────────────────── 21 — LOJA DO MERCADOR ─────────────────────
  room({
    number: 21, name: 'mercador', title: 'Sala do Balcão', subtitle: 'Um balcão onde ninguém deveria vender nada.', category: 'character', theme: 'storage',
    front: [
      P('lamp_shade', 960, { y: 0, light: { r: 540, i: 0.9 } }),
      F('counter', 900, 0.14, { id: 'counter', examine: 'Um balcão de madeira gasto. Coisas penduradas por toda parte.' }),
      ON('counter', 900, 0.14, 'key_small', -120, { id: 'brass_key', cond: { noItem: 'chave_latao', doorLocked: '@r001_c' }, label: 'Chave pequena', examine: 'Uma chave pequena de latão. Há pequenas marcas na extremidade.', interact: [pickup('brass_key', 'chave_latao', 'Pegar', [say('"Essa não está à venda", diz uma voz. "Pode levar. E se quiser voltar ao começo, é só me pedir."')])] }),
      ON('counter', 900, 0.14, 'scale_balance', 120, {}),
      F('shelves_jars', 1580, 0.06, {}),
    ],
    back: [F('crate', 700, 0.12, {}), F('boxes', 1300, 0.16, {})],
  }),

  // ───────────────────── 22 — BIBLIOTECA PEQUENA ─────────────────────
  room({
    number: 22, name: 'biblioteca_pequena', title: 'Biblioteca Pequena', subtitle: 'Livros que ninguém escreveu duas vezes igual.', category: 'puzzle', theme: 'library', puzzle: 'p_livros_22', tags: ['has_clock'],
    front: [
      F('bookshelf', 600, 0.05, { id: 'shelf', examine: 'Quatro volumes do "Manual de Portas", fora de ordem.', interact: [act('Arrumar os volumes', [puzzle('p_livros_22')], { cond: { puzzleUnsolved: 'p_livros_22' } }), act('Pegar a chave do livro oco', [give('chave_ferro')], { cond: { puzzleSolved: 'p_livros_22', noItem: 'chave_ferro', doorLocked: '@r012_back' } })] }),
      F('bookshelf', 1320, 0.05, { id: 'shelf2' }),
      F('armchair', 960, 0.25, {}), P('lamp_floor', 1100, { d: 0.2, y: 852, light: { r: 320, i: 0.9 }, anim: 'flicker' }),
      WL('clock_wall', 960, 360, {}),
    ],
    back: [F('desk', 960, 0.14, { examine: 'Um bilhete: "Ninguém lê o último volume."' })],
  }),

  // ───────────────────── 23 — SALA DE MÚSICA ─────────────────────
  room({
    number: 23, name: 'musica', title: 'Sala de Música', subtitle: 'Alguém toca sem som.', category: 'puzzle', theme: 'parlor', puzzle: 'p_piano',
    front: [F('piano', 700, 0.14, { examine: 'Um piano de armário. Cinco teclas ainda funcionam.', interact: [act('Tocar', [puzzle('p_piano')], { cond: { puzzleUnsolved: 'p_piano' } })] }), WL('sconce_candle', 400, 560, { light: { r: 240, i: 0.9 }, anim: 'flame' }), F('gramophone', 1500, 0.18, {})],
    back: [WL('painting', 960, 540, { variant: 'landscape' })],
  }),

  // ───────────────────── 24 — ROUPARIA ─────────────────────
  room({
    number: 24, name: 'rouparia', title: 'Rouparia', subtitle: 'Lençóis secando que nunca secam.', category: 'event', theme: 'storage', region: 'servico',
    front: [WL('laundry_line', 960, 520, { examine: 'Lençóis brancos pendurados. Úmidos. Frios.' }), F('basket', 500, 0.3, { id: 'basket', examine: 'Um cesto de roupa.', interact: [pickup('basket', 'meia_chave_a', 'Revirar o cesto', [say('No fundo do cesto, metade de uma chave. Só a cabeça.')])] })],
    back: [P('bulb', 960, { y: 0, light: { r: 400, i: 0.7 }, anim: 'flicker' })],
  }),

  // ───────────────────── 25 — SALA VERMELHA ─────────────────────
  room({
    number: 25, name: 'sala_vermelha', title: 'Sala da Porta Vermelha', subtitle: 'Só uma porta.', category: 'event', theme: 'empty', fixedExits: true,
    front: [P('lamp_shade', 960, { y: 0, light: { r: 520, i: 0.9 } })],
    back: [],
    exits: [{ to: 40, x: 960, m: 'red', important: true, listen: 'Silêncio. Um silêncio que sabe que você está ouvindo.' }],
  }),

  // ───────────────────── 26 — OFICINA DO CARTÓGRAFO ─────────────────────
  room({
    number: 26, name: 'cartografo', title: 'Oficina do Cartógrafo', subtitle: 'Mapas de lugares que ainda não existem.', category: 'character', theme: 'library', tags: ['important'],
    front: [F('desk', 800, 0.16, { id: 'desk' }), ON('desk', 800, 0.16, 'maps_pile', 0, { examine: 'Mapas, mapas, mapas. Um mostra a Sala 1 no centro de tudo.', interact: [act('Estudar', [clue('clue_funda'), say('Numa margem: "Não é que a Casa seja grande. É que ela é funda."')])] }), ON('desk', 800, 0.16, 'lamp_oil', 110, { light: { r: 300, i: 1 }, anim: 'flame' }), WL('map_wall', 1400, 600, {})],
    back: [F('globe', 960, 0.2, { examine: 'Um globo. Só tem um continente: uma casa.' })],
  }),

  // ───────────────────── 27 — SALA DE ESPERA ─────────────────────
  room({
    number: 27, name: 'espera', title: 'Sala de Espera', subtitle: 'Aguarde ser chamado.', category: 'puzzle', theme: 'infirmary', puzzle: 'p_espera_27',
    front: [F('chairs_row', 700, 0.18, { examine: 'Cadeiras em fila. Viradas para um painel.' }), WL('number_panel', 1250, 450, { examine: 'Um painel luminoso: "6".', interact: [act('Esperar ser chamado', [puzzle('p_espera_27')], { cond: { puzzleUnsolved: 'p_espera_27' } })] }), WL('ticket_dispenser', 1560, 600, { id: 'disp', interact: [pickup('disp', 'ticket_espera', 'Tirar senha', [clue('clue_senha')])] })],
    back: [WL('sign', 960, 520, { examine: '"Aguarde ser chamado."' })],
    exits: [{ to: 133, ref: 'r027_gold', side: 'back', x: 1300, m: 'white', lock: 'L_r027_gold', v: { lock: 'gold' } }],
  }),

  // ───────────────────── 28 — ENFERMARIA ─────────────────────
  room({
    number: 28, name: 'enfermaria', title: 'Enfermaria', subtitle: 'Camas arrumadas demais.', category: 'sanctuary', theme: 'infirmary', anchorable: true, tags: ['important', 'sanctuary'],
    front: [F('hospital_bed', 500, 0.2, {}), F('hospital_bed', 850, 0.2, { id: 'hb2' }), P('lamp_shade', 960, { y: 0, light: { r: 540, i: 0.9 } }), F('cabinet', 1650, 0.08, { id: 'med', examine: 'Armário de remédios.', interact: [pickup('med', 'curativo', 'Pegar curativo')] })],
    back: [WL('clipboard', 960, 540, { interact: [reader('enfermaria_registros')] })],
  }),

  // ───────────────────── 29 — CORREDOR LONGO ─────────────────────
  room({
    number: 29, name: 'corredor_longo', title: 'Corredor Longo', subtitle: 'Longo demais para caber aqui.', category: 'event', theme: 'corridor', layout: 'corridor',
    front: [WL('sconce', 760, 420, { light: { r: 220, i: 0.8 }, anim: 'flicker' }), WL('sconce', 1160, 420, { id: 's2', light: { r: 220, i: 0.7 }, anim: 'flicker' }), F('runner_rug', 960, 0.45, { z: -1 }), F('key_floor', 1250, 0.6, { id: 'rusty', cond: { noItem: 'chave_enferrujada' }, label: 'Algo no chão', interact: [pickup('rusty', 'chave_enferrujada', 'Pegar', [say('Uma chave enferrujada. Talvez aguente uma volta.')])] })],
    back: [WL('sconce', 960, 420, { light: { r: 200, i: 0.6 } })],
  }),

  // ───────────────────── 30 — SALA DO TELEFONE ─────────────────────
  room({
    number: 30, name: 'telefone', title: 'Sala do Telefone', subtitle: 'Ele só toca quando você entra.', category: 'puzzle', theme: 'green', puzzle: 'p_telefone_30',
    front: [F('side_table', 960, 0.16, { id: 'tt' }), ON('side_table', 960, 0.16, 'phone', 0, { examine: 'Um telefone de disco. Um papel colado: "ligue para a hora em que ela parou".', interact: [act('Discar', [puzzle('p_telefone_30')], { cond: { puzzleUnsolved: 'p_telefone_30' } }), act('Ouvir o fone', [say('Chiado. E, muito longe, alguém respirando como quem espera.')])] }), F('chair', 1150, 0.22, { id: 'chair' })],
    back: [WL('sconce', 960, 470, { light: { r: 260, i: 0.7 } })],
  }),

  // ───────────────────── 31 — SALA DA JANELA ─────────────────────
  room({
    number: 31, name: 'janela', title: 'Sala da Janela', subtitle: 'A única janela da Casa.', category: 'sanctuary', theme: 'blue', anchorable: true, ambience: 'rain', tags: ['important', 'sanctuary'],
    front: [WL('window', 960, 620, { variant: 'rain_big', light: { r: 380, i: 0.5, color: '#9fb2c0' }, examine: 'Chuva. Do outro lado, a mesma sala, vista de fora. Alguém dentro dela olha para você.' }), F('armchair', 600, 0.25, { interact: [act('Descansar', [{ type: 'heal', n: 1 }, say('Você fecha os olhos por um instante. A chuva conta alguma coisa.')], { once: 'run' })] })],
    back: [],
  }),

  // ───────────────────── 32 — SALA DAS CADEIRAS ─────────────────────
  room({
    number: 32, name: 'cadeiras', title: 'Sala das Cadeiras', subtitle: 'Todas olham para a parede.', category: 'puzzle', theme: 'plain', puzzle: 'p_cadeiras_32',
    front: [F('chairs_many', 960, 0.25, { id: 'chairs', examine: 'Dezenas de cadeiras viradas para a parede.', interact: [act('Responder à voz', [puzzle('p_cadeiras_32')], { cond: { puzzleUnsolved: 'p_cadeiras_32', any: [{ turnsHere: { gte: 2 } }] } })] }), P('bulb', 960, { y: 0, light: { r: 560, i: 0.8 } })],
    back: [],
  }),

  // ───────────────────── 33 — A SALA QUE PRENDE ─────────────────────
  room({
    number: 33, name: 'sala_que_prende', title: 'A Sala Que Prende', subtitle: 'Quatro cantos.', category: 'danger', theme: 'empty', puzzle: 'p_sala33', fixedExits: true,
    front: [WL('baseboard_lights', 960, 790, { examine: 'Seis lâmpadas pequenas no rodapé.', interact: [act('Mexer nas lâmpadas', [puzzle('p_sala33')], { cond: { puzzleUnsolved: 'p_sala33' } })] }), P('bulb', 960, { y: 0, light: { r: 440, i: 0.5 }, anim: 'flicker' })],
    back: [WL('scratches', 960, 520, { examine: 'Arranhões. Muitos. Alguém ficou muito tempo aqui.' })],
    exits: [{ to: 41, ref: 'r033_hidden', x: 960, m: 'grey', hidden: true, important: true }],
  }),

  // ───────────────────── 34 — SALA DO RELÓGIO ─────────────────────
  room({
    number: 34, name: 'relogio', title: 'Sala do Relógio', subtitle: 'Tique. Nenhum taque.', category: 'character', theme: 'library', puzzle: 'p_relogio_34', ambience: 'clock', tags: ['has_clock'],
    front: [F('grandfather_clock', 560, 0.08, { examine: 'Um relógio de pé, parado.', interact: [act('Acertar os ponteiros', [puzzle('p_relogio_34')], { cond: { puzzleUnsolved: 'p_relogio_34' } })] }), F('workbench', 1250, 0.14, {}), WL('clocks_wall', 960, 520, {})],
    back: [WL('clocks_wall', 960, 520, { id: 'cw2' })],
  }),

  // ───────────────────── 36 — SALA DO RÁDIO ─────────────────────
  room({
    number: 36, name: 'radio', title: 'Sala do Rádio', subtitle: 'Uma estação que só transmite para você.', category: 'puzzle', theme: 'green', puzzle: 'p_radio_36',
    front: [F('side_table', 960, 0.16, { id: 'tt' }), ON('side_table', 960, 0.16, 'radio', 0, { examine: 'Um rádio valvulado, morno.', interact: [act('Sintonizar', [puzzle('p_radio_36')], { cond: { puzzleUnsolved: 'p_radio_36' } })] }), F('armchair', 600, 0.24, {})],
    back: [WL('inscription', 960, 560, { examine: '"Sintonize na última porta."', interact: [act('Ler', [clue('clue_radio')])] })],
  }),

  // ───────────────────── 37 — JARDIM DE INVERNO (behind the brass lock of Room 1) ─────────────────────
  room({
    number: 37, name: 'jardim_inverno', title: 'Jardim de Inverno', subtitle: 'Chuva num telhado de vidro que não existe.', category: 'sanctuary', theme: 'greenhouse', region: 'servico', anchorable: true, ambience: 'rain', tags: ['important', 'sanctuary'],
    onFirstEnter: [{ type: 'text', text: 'Você nunca imaginou que a Casa tivesse um lugar assim.' }, { type: 'fragments', n: 3 }],
    front: [
      F('plants_big', 400, 0.12, {}), F('plants_big', 1520, 0.12, { id: 'pl2' }),
      F('bench', 960, 0.3, { examine: 'Um banco de ferro. Alguém deixou uma carta sobre ele.' }),
      F('letter_floor', 1000, 0.36, { id: 'letter', cond: { noItem: 'carta_helena_1' }, interact: [pickup('letter', 'carta_helena_1', 'Ler a carta', [{ type: 'read', lore: 'helena_1' }, route('memoria')], true)] }),
      P('glass_roof', 960, { y: 0, light: { r: 700, i: 0.5, color: '#b8c6c0' } }),
    ],
    back: [F('plants_big', 960, 0.1, { id: 'pl3' })],
  }),

  // ───────────────────── 38 — CAPELA PEQUENA ─────────────────────
  room({
    number: 38, name: 'capela', title: 'Capela Pequena', subtitle: 'Ajoelhe-se, diz uma letra que não é de ninguém.', category: 'puzzle', theme: 'chapel', puzzle: 'p_capela_38', region: 'residencial', tags: ['important'],
    front: [F('altar', 960, 0.1, { id: 'altar', examine: 'Cinco velas apagadas.', interact: [act('Acender as velas', [puzzle('p_capela_38')], { cond: { puzzleUnsolved: 'p_capela_38' } }), act('Ajoelhar', [route('obediencia'), say('Você se ajoelha. Não sabe para quem.')], { once: 'visit' })] }), ON('altar', 960, 0.1, 'candles_five', 0, { light: { r: 220, i: 0.6 }, anim: 'flame' }), F('pews', 500, 0.35, {}), F('pews', 1420, 0.35, { id: 'pw2' })],
    back: [WL('inscription', 960, 560, { examine: '"A do meio, a primeira, a última."', interact: [act('Ler', [clue('clue_hino')])] })],
    exits: [{ to: 233, ref: 'r038_chapel', side: 'back', x: 1450, m: 'wood_dark', lock: 'L_r038_chapel', v: { lock: 'iron', panels: 2 } }],
  }),

  // ───────────────────── 40 — SALA DO VELHO ─────────────────────
  room({
    number: 40, name: 'velho', title: 'Sala da Lareira', subtitle: 'Cheiro de fumaça e de pão.', category: 'character', theme: 'parlor', tags: ['important'],
    front: [
      F('fireplace', 1250, 0.02, { id: 'fire', light: { r: 420, i: 1, color: '#f0a050', dy: -80 }, anim: 'flame', examine: 'Brasas vivas. Entre elas, algo metálico brilha.', interact: [act('Enfiar a mão nas brasas', [give('chave_quente'), { type: 'if', cond: { noItem: 'luvas' }, then: [{ type: 'damage', n: 1, cause: 'as brasas' }] }, say('Uma chave. Está quente — não como metal ao sol. Como uma mão.'), { type: 'npc', npc: 'velho', trust: -1 }, jr('chaves', 'Lareira do Velho (40): uma chave quente, tirada das brasas.')], { cond: { noItem: 'chave_quente', doorLocked: '@r058_warm' }, once: 'run' })] }),
      F('armchair', 620, 0.2, { id: 'armchair' }),
      F('side_table', 820, 0.24, { id: 'st' }), ON('side_table', 820, 0.24, 'pipe', 0, { id: 'pipe', interact: [pickup('pipe', 'cachimbo', 'Pegar o cachimbo')] }),
    ],
    back: [WL('painting', 960, 540, { variant: 'landscape' }), F('bread_basket', 1400, 0.2, { id: 'bread', interact: [pickup('bread', 'pao', 'Pegar pão')] })],
  }),
];
