// Authored rooms 42–334: narrative landmarks, lock rewards, memories, the ending.
import { room, P, F, WL, ON, act, say, give, frag, hideProp, jr, route, clue, puzzle, pickup, reader, type AuthoredRoom } from './builders';

export const AUTHORED_2: AuthoredRoom[] = [
  room({ number: 42, name: 'cartas', title: 'Sala das Cartas', subtitle: 'Cartas presas por alfinetes, como borboletas.', category: 'lore', theme: 'parlor', tags: ['important'],
    front: [WL('letters_wall', 960, 600, { examine: 'Cartas pregadas na parede. Quase todas começam com "Teo".', interact: [act('Procurar uma carta legível', [give('carta_helena_2'), { type: 'read', lore: 'helena_2' }, route('memoria')], { cond: { noItem: 'carta_helena_2' }, once: 'forever' })] }), F('desk', 500, 0.18, {}), ON('desk', 500, 0.18, 'candle', 0, { light: { r: 240, i: 1 }, anim: 'flame' })],
    back: [WL('postcard_wall', 960, 540, { examine: 'Cartões postais de lugares aonde ninguém foi.' })] }),

  room({ number: 44, name: 'sala44', title: 'Sala 44', subtitle: 'Um escritório. Ninguém entra aqui.', category: 'lore', theme: 'archive', tags: ['important'],
    front: [F('desk', 960, 0.16, { id: 'desk' }), ON('desk', 960, 0.16, 'photo', 0, { id: 'frame', examine: 'Um porta-retratos virado para baixo.', interact: [act('Virar', [say('A moldura está vazia. Só a marca de onde havia uma foto.')])] }), ON('desk', 960, 0.16, 'folder', 120, { id: 'folder', examine: 'Uma pasta com as iniciais B.S.', interact: [act('Abrir', [{ type: 'setFlag', flag: 'pasta_bs' }, say('Fichas datilografadas. Na primeira, um carimbo: "VISITADO POR B.S." Com data. Muitas datas.'), jr('pessoas', 'Sala 44: uma pasta com as iniciais B.S., e muitas datas de visita.')], { once: 'forever' })] }), F('filing_cabinet', 1500, 0.06, {})],
    back: [WL('plate_number', 960, 400, { variant: '44', examine: 'Uma placa: 44.' })] }),

  room({ number: 46, name: 'adega', title: 'A Adega', subtitle: 'Garrafas com datas, não safras.', category: 'lore', theme: 'basement', region: 'servico', tags: ['important'],
    onFirstEnter: [{ type: 'fragments', n: 3 }, { type: 'text', text: 'Atrás da porta de ferro, frio e cheiro de terra.' }],
    front: [F('wine_rack', 600, 0.05, { examine: 'Garrafas com rótulos escritos à mão: datas. Uma diz o dia de hoje.' }), F('wine_rack', 1320, 0.05, { id: 'wr2' }), F('barrel', 960, 0.3, { id: 'barrel', interact: [pickup('barrel', 'foto_sete', 'Olhar atrás do barril', [{ type: 'read', lore: 'foto_sete' }], true)] }), P('bulb', 960, { y: 0, light: { r: 400, i: 0.6 }, anim: 'flicker' })],
    back: [WL('inscription', 960, 560, { examine: 'Sete nomes riscados na pedra. Seis legíveis.', interact: [act('Ler', [say('Helena. Orlando. Benedito. Marta. Clara. Aurélio. E um nome raspado.'), route('casa')])] })] }),

  room({ number: 47, name: 'espelho_grande', title: 'Sala do Espelho Grande', subtitle: 'O reflexo chega meio segundo atrasado.', category: 'puzzle', theme: 'gallery', puzzle: 'p_espelho_47',
    front: [WL('mirror_big', 960, 760, { examine: 'Um espelho do chão ao teto. Nele, a sala atrás de você.', interact: [act('Falar com o reflexo', [puzzle('p_espelho_47')], { cond: { puzzleUnsolved: 'p_espelho_47' } })] }), WL('sconce', 560, 470, { light: { r: 260, i: 0.8 } }), WL('sconce', 1360, 470, { id: 's2', light: { r: 260, i: 0.8 } })],
    back: [WL('sconce', 960, 470, { light: { r: 260, i: 0.7 } })],
    exits: [{ to: null, side: 'back', x: 600, m: 'painted', type: 'false', secretTo: 20 }, { to: null, side: 'back', x: 1320, m: 'painted', type: 'false', secretTo: 150 }] }),

  room({ number: 50, name: 'sala_branca', title: 'Sala Branca', subtitle: 'Branco.', category: 'anomaly', theme: 'white', ambience: 'whitehum', noCeilingLamp: true,
    front: [], back: [] }),

  room({ number: 53, name: 'arquivo_morto', title: 'Arquivo Morto', subtitle: 'Papéis sobre pessoas que ainda estão aqui.', category: 'character', theme: 'archive', region: 'residencial', tags: ['important'],
    front: [F('filing_cabinet', 500, 0.05, { id: 'fc1', examine: 'Gavetas etiquetadas por número de porta.', interact: [act('Procurar a escritura', [{ type: 'lore', id: 'casa_1911', read: true }, clue('clue_1911')], { once: 'forever' })] }), F('filing_cabinet', 700, 0.05, { id: 'fc2', examine: 'Uma gaveta entreaberta.', interact: [act('Olhar a gaveta', [{ type: 'lore', id: 'arquivo_sem_filhos', read: true }], { cond: { flag: 'gaveta_ficha_aberta' }, once: 'forever' })] }), P('lamp_shade', 960, { y: 0, light: { r: 500, i: 0.8 } })],
    back: [F('papers', 960, 0.4, { z: -1 })],
    exits: [{ to: 210, ref: 'r053_bone', x: 1500, m: 'grey', lock: 'L_r053_bone', v: { lock: 'bone' } }] }),

  room({ number: 55, name: 'salao_baile', title: 'Salão de Baile', subtitle: 'Poeira dançando sob lustres apagados.', category: 'event', theme: 'gallery', layout: 'wide',
    front: [P('chandelier', 600, { y: 0, light: { r: 400, i: 0.5 } }), P('chandelier', 1320, { y: 0, id: 'ch2', light: { r: 400, i: 0.5 } }), F('gramophone', 1500, 0.2, { interact: [act('Dar corda', [{ type: 'sound', id: 'gramophone' }, say('Uma valsa arranhada. Por um instante, você lembra de dançar mal com alguém que ria.'), route('memoria')])] }), F('glint', 800, 0.5, { id: 'halfb', cond: { noItem: 'meia_chave_b' }, label: 'Um brilho no chão', interact: [pickup('halfb', 'meia_chave_b', 'Pegar', [say('Metade de uma chave — só os dentes.')])] })],
    back: [WL('curtain', 960, 780, {})] }),

  room({ number: 57, name: 'vestibulo_dourado', title: 'Vestíbulo', subtitle: 'Uma fechadura nova numa porta velha.', category: 'normal', theme: 'parlor',
    front: [WL('sconce', 700, 470, { light: { r: 280, i: 0.8 } }), F('coat_rack', 1600, 0.1, {})], back: [],
    exits: [{ to: 84, ref: 'r057_gold', x: 1250, m: 'wood_dark', lock: 'L_r057_gold', v: { lock: 'gold' } }] }),

  room({ number: 58, name: 'quarto_infantil', title: 'Quarto Infantil', subtitle: 'O berço balança sozinho.', category: 'event', theme: 'nursery', region: 'infantil',
    front: [F('cradle', 700, 0.2, { anim: 'rock', examine: 'O berço balança devagar. Ninguém está nele. Ninguém está balançando.' }), WL('mobile_toy', 700, 330, {}), F('toy_box', 1500, 0.22, {})],
    back: [WL('height_marks', 600, 560, {})],
    exits: [{ to: 147, ref: 'r058_warm', side: 'back', x: 1300, m: 'white', lock: 'L_r058_warm', v: { lock: 'brass', lightUnder: '#ffd28a' }, listen: 'Uma colher batendo numa xícara. Alguém cantarola.' }] }),

  room({ number: 61, name: 'mil_chaves', title: 'Sala das Mil Chaves', subtitle: 'Chaves penduradas até o teto.', category: 'puzzle', theme: 'storage', puzzle: 'p_mil_chaves', tags: ['important'],
    front: [WL('keys_wall', 600, 700, { examine: 'Centenas de chaves em pregos. Nenhuma tem etiqueta.', interact: [act('Procurar a chave certa', [{ type: 'random', salt: 'milchaves', options: [[give('chave_mil'), say('Você passa a mão pelas chaves. Uma delas está morna de alguém ter segurado. Você a pega.')], [say('Você tenta dezenas. Nenhuma parece certa.'), { type: 'damage', n: 1, cause: 'um prego enferrujado' }]] }], { cond: { noItem: 'chave_mil', doorLocked: '@r061_multi' }, once: 'run' })] }), WL('keys_wall', 1500, 700, { id: 'kw2' })],
    back: [WL('inscription', 960, 560, { examine: '"O ano em que a Casa foi escrita."' })],
    exits: [{ to: 119, ref: 'r061_multi', x: 1050, m: 'metal', lock: 'L_r061_multi', v: { lock: 'padlock', chain: true } }] }),

  room({ number: 62, name: 'escritorio_construtor', title: 'Escritório do Construtor', subtitle: 'Plantas desenroladas, pesos de papel, uma régua.', category: 'character', theme: 'library', tags: ['important'],
    front: [F('drafting_table', 800, 0.16, { examine: 'Uma prancheta com uma planta que muda quando você pisca.' }), WL('blueprints_wall', 1450, 600, {})],
    back: [F('crate', 960, 0.14, {})] }),

  room({ number: 64, name: 'alagada', title: 'Sala Alagada', subtitle: 'Água parada até os tornozelos.', category: 'danger', theme: 'flooded', ambience: 'water',
    front: [F('chair', 700, 0.3, { id: 'chair', examine: 'Uma cadeira meio submersa.' }), P('bulb', 960, { y: 0, light: { r: 400, i: 0.6 }, anim: 'flicker' })], back: [] }),

  room({ number: 67, name: 'tres_simbolos', title: 'Sala dos Três Símbolos', subtitle: 'Placas que giram.', category: 'puzzle', theme: 'parlor', puzzle: 'p_tres_simbolos', tags: ['important'],
    front: [WL('symbol_dials', 960, 480, { examine: 'Três placas com símbolos: lua, estrela, losango, sol, olho.', interact: [act('Girar as placas', [puzzle('p_tres_simbolos')], { cond: { puzzleUnsolved: 'p_tres_simbolos' } })] })],
    back: [WL('sconce_candle', 960, 560, { light: { r: 240, i: 0.8 }, anim: 'flame' })],
    exits: [{ to: 160, ref: 'r067_sun', x: 1500, m: 'wood_light', lock: 'L_r067_sun', v: { lock: 'symbol', symbol: 'sol' } }] }),

  room({ number: 70, name: 'estufa', title: 'Estufa', subtitle: 'Plantas mortas em vasos bem cuidados.', category: 'sanctuary', theme: 'greenhouse', puzzle: 'p_estufa_70', anchorable: true, ambience: 'rain', region: 'servico', tags: ['sanctuary', 'important'],
    front: [F('plants_big', 500, 0.1, {}), WL('grow_lamps', 960, 360, { examine: 'Quatro lâmpadas de cultivo.', interact: [act('Mexer nas lâmpadas', [puzzle('p_estufa_70')], { cond: { puzzleUnsolved: 'p_estufa_70' } })] }), F('plants_big', 1420, 0.1, { id: 'p2' })],
    back: [],
    exits: [{ to: 105, ref: 'r070_glass', side: 'back', x: 960, m: 'glass', lock: 'L_r070_glass', v: { lock: 'glass', window: true } }] }),

  room({ number: 73, name: 'sala_mulher', title: 'Sala do Medalhão', subtitle: 'Alguém espera por você. Você não sabe quem.', category: 'character', theme: 'bedroom', tags: ['important'],
    front: [F('armchair', 600, 0.2, {}), F('dresser', 1500, 0.08, { id: 'dr' }), ON('dresser', 1500, 0.08, 'vase_flowers', 0, { examine: 'Flores secas. Alguém as troca por outras flores secas.' }), P('lamp_shade', 960, { y: 0, light: { r: 500, i: 0.8 } })],
    back: [WL('inscription', 960, 540, { examine: 'A lápis, bem pequeno: "999".', interact: [act('Olhar', [clue('clue_999')])] })] }),

  room({ number: 77, name: 'galeria_retratos', title: 'Galeria dos Retratos', subtitle: 'Os olhos seguem. Não é figura de linguagem.', category: 'puzzle', theme: 'gallery', puzzle: 'p_quadros_77', tags: ['has_painting'],
    front: [WL('portraits_four', 960, 560, { examine: 'Quatro retratos do mesmo homem, fora de ordem.', interact: [act('Reordenar', [puzzle('p_quadros_77')], { cond: { puzzleUnsolved: 'p_quadros_77' } })] }), WL('plaque', 960, 640, { examine: '"Do começo ao fim."', interact: [act('Ler', [clue('clue_retratos')])] })],
    back: [WL('painting', 600, 540, { id: 'painting', variant: 'portrait' })],
    exits: [{ to: 180, ref: 'r077_pair', side: 'back', x: 1300, m: 'wood_dark', lock: 'L_r077_pair', v: { lock: 'iron' } }] }),

  room({ number: 80, name: 'poco', title: 'Sala do Poço', subtitle: 'Um poço no meio do assoalho.', category: 'puzzle', theme: 'basement', puzzle: 'p_poco_80',
    front: [F('well', 960, 0.3, { examine: 'Um poço de pedra. Muito fundo. Algo lá embaixo espera.', interact: [act('Jogar algo', [puzzle('p_poco_80')], { cond: { puzzleUnsolved: 'p_poco_80' } })] })],
    back: [],
    exits: [{ to: 200, ref: 'r080_hidden', x: 1500, m: 'old', hidden: true }] }),

  room({ number: 82, name: 'costura', title: 'Sala de Costura', subtitle: 'Uma máquina de costura ainda quente.', category: 'normal', theme: 'bedroom',
    front: [F('sewing_machine', 600, 0.16, { examine: 'Linha vermelha na agulha.' }), F('mannequin', 1400, 0.12, { examine: 'Um manequim com um vestido escuro pela metade. As medidas são de alguém que você conhece.' })],
    back: [F('basket', 960, 0.26, { id: 'bk', interact: [pickup('bk', 'fio_linha', 'Pegar um carretel de linha vermelha')] })],
    exits: [{ to: 95, ref: 'r082_gold', x: 1000, m: 'green', lock: 'L_r082_gold', v: { lock: 'gold' } }] }),

  room({ number: 84, name: 'teatro', title: 'Teatro de Bonecos', subtitle: 'Um palco pequeno, cortinas vermelhas.', category: 'puzzle', theme: 'nursery', puzzle: 'p_bonecos_84', tags: ['important'],
    front: [F('puppet_theater', 960, 0.12, { examine: 'Um teatrinho de bonecos. Os bonecos têm rostos que você quase reconhece.', interact: [act('Montar o espetáculo', [puzzle('p_bonecos_84')], { cond: { puzzleUnsolved: 'p_bonecos_84' } })] })],
    back: [F('chairs_row', 960, 0.3, { examine: 'Uma plateia de cadeiras pequenas. De criança.' })] }),

  room({ number: 88, name: 'corredor_numeros', title: 'Corredor dos Números', subtitle: 'Todas as placas dizem 88. Menos uma.', category: 'anomaly', theme: 'corridor', layout: 'corridor',
    front: [WL('plate_number', 780, 360, { variant: '88' }), WL('plate_number', 1140, 360, { id: 'pn2', variant: '88' }), WL('sconce', 960, 420, { light: { r: 260, i: 0.8 }, anim: 'flicker' })],
    back: [WL('plate_number', 960, 360, { id: 'pn3', variant: '88' })],
    exits: [{ to: 171, ref: 'r088_17', x: 1580, wall: 'right', d: 0.45, m: 'wood_light', lock: 'L_r088_17', v: { lock: 'number', numberPlate: '17' } }, { to: 88, x: 340, wall: 'left', d: 0.45, m: 'wood_dark', type: 'cyclic', onOpen: [say('Oitenta e oito. De novo.', 'whisper')] }] }),

  room({ number: 91, name: 'sala_foto', title: 'Sala da Fotografia', subtitle: 'Uma câmara escura com fotos penduradas para secar.', category: 'lore', theme: 'archive', tags: ['important'],
    front: [WL('drying_photos', 960, 560, { id: 'photos', examine: 'Fotos penduradas num varal.', interact: [pickup('photos', 'foto_44', 'Pegar uma foto', [{ type: 'read', lore: 'foto_44' }, jr('pessoas', 'Sala 91: uma fotografia parece mostrar Benedito diante da Sala 44.')], true)] }), P('bulb', 960, { y: 0, variant: 'red', light: { r: 600, i: 0.7, color: '#c04030' } })],
    back: [F('tripod', 960, 0.2, {})] }),

  room({ number: 95, name: 'maquinas', title: 'Sala de Máquinas', subtitle: 'Engrenagens que movem as salas.', category: 'puzzle', theme: 'basement', puzzle: 'p_luzes_95', ambience: 'machines', tags: ['important'],
    front: [F('machine', 960, 0.06, { examine: 'Engrenagens enormes, rangendo. Você entende, sem entender, que elas movem as salas.' }), WL('switch_panel', 400, 560, { examine: 'Nove interruptores.', interact: [act('Mexer nos interruptores', [puzzle('p_luzes_95')], { cond: { puzzleUnsolved: 'p_luzes_95' } })] })],
    back: [WL('clipboard', 960, 540, { examine: '"Cada chave acende a si e às vizinhas em cruz."', interact: [act('Ler', [clue('clue_luzes')])] })],
    exits: [{ to: 150, ref: 'r095_hidden', x: 1500, m: 'metal', hidden: true }] }),

  room({ number: 100, name: 'sala_cem', title: 'Sala Cem', subtitle: 'Alguém acendeu cem velas.', category: 'sanctuary', theme: 'warm', anchorable: true, tags: ['sanctuary', 'important'],
    front: [F('table', 960, 0.2, { id: 't' }), ON('table', 960, 0.2, 'cake', 0, { light: { r: 360, i: 1 }, anim: 'flame', examine: 'Um bolo com cem velas acesas. Nenhuma derreteu.', interact: [act('Soprar', [say('Você sopra. As velas continuam acesas. Você ri, sem querer.'), frag(2)], { once: 'forever' })] }), F('gift', 1300, 0.3, { id: 'gift', interact: [pickup('gift', 'chave_dourada', 'Abrir o embrulho', [say('Uma chave dourada. Um cartão: "Uma porta só."')])] })],
    back: [] }),

  room({ number: 105, name: 'eco_sala1', title: 'Sala Inicial', subtitle: 'Três portas simples. Tudo parece normal.', category: 'echo', theme: 'plain', echoOf: 'r001', puzzle: 'p_eco_105',
    front: [P('bulb', 960, { y: 0, light: { r: 700, i: 1 } }), F('dresser_small', 300, 0.12, { id: 'dresser' }), ON('dresser_small', 300, 0.12, 'vase', -30, { flip: true }), F('chair', 1640, 0.16, { id: 'chair', flip: true, examine: 'A cadeira. Igual. Igual demais.', interact: [act('Pensar no que mudou', [puzzle('p_eco_105')], { cond: { puzzleUnsolved: 'p_eco_105' } })] })],
    back: [WL('coat_hook', 1250, 470, { examine: 'O cabide tem um casaco agora. O seu.' })] }),

  room({ number: 111, name: 'portas_pintadas', title: 'Sala das Portas Pintadas', subtitle: 'Portas pintadas na parede. Muito bem pintadas.', category: 'anomaly', theme: 'gallery',
    front: [F('easel', 1650, 0.15, { id: 'easel', examine: 'Um cavalete. Na tela, uma chave pintada. Ela não está pintada. Ela está na tela.', interact: [pickup('easel', 'chave_irreal', 'Pegar a chave da pintura', [{ type: 'read', lore: 'nota_sem_fechadura' }, jr('chaves', 'Sala 111: uma chave tirada de dentro de uma pintura. Não deveria existir.')])] })],
    back: [],
    exits: [{ to: null, x: 400, m: 'painted', type: 'false', secretTo: 125 }, { to: null, x: 780, m: 'painted', type: 'false', secretTo: 166 }, { to: null, x: 1160, m: 'painted', type: 'false', secretTo: 20 }] }),

  room({ number: 119, name: 'mapa_impossivel', title: 'Sala do Mapa Impossível', subtitle: 'O mapa na mesa é desta sala. E de todas.', category: 'lore', theme: 'library', puzzle: 'p_mapa_119', tags: ['important'],
    onFirstEnter: [{ type: 'fragments', n: 3 }],
    front: [F('table', 960, 0.2, { id: 't', examine: 'Um mapa desenhado a nanquim cobre a mesa inteira.', interact: [act('Estudar o mapa', [puzzle('p_mapa_119')], { cond: { puzzleUnsolved: 'p_mapa_119' } })] }), ON('table', 960, 0.2, 'maps_pile', 0, {}), ON('table', 960, 0.2, 'lamp_oil', 140, { light: { r: 300, i: 1 }, anim: 'flame' })],
    back: [WL('map_wall', 960, 600, {})] }),

  room({ number: 120, name: 'brinquedos', title: 'Quarto de Brinquedos', subtitle: 'Brinquedos arrumados por alguém muito cuidadoso.', category: 'character', theme: 'nursery', region: 'infantil',
    front: [F('rocking_horse', 1300, 0.22, { id: 'horse', examine: 'Um cavalinho de balanço, pintado à mão.' }), F('toy_box', 500, 0.24, { id: 'tb', interact: [pickup('tb', 'chave_sol', 'Revirar os brinquedos', [say('No fundo, entre blocos de madeira, uma chave com um sol riscado.')])] }), F('doll', 800, 0.4, { id: 'doll', interact: [pickup('doll', 'boneca', 'Pegar a boneca')] })],
    back: [WL('drawings_wall', 960, 560, {})] }),

  room({ number: 125, name: 'escadas_impossiveis', title: 'Escadas Impossíveis', subtitle: 'Escadas que sobem para baixo.', category: 'impossible', theme: 'corridor', tilt: 2,
    front: [F('stairs', 600, 0.05, { examine: 'Degraus que sobem até o teto e continuam.' }), F('stairs', 1320, 0.05, { id: 'st2', flip: true, flipY: true, examine: 'A mesma escada, de cabeça para baixo.' }), F('glint', 960, 0.45, { id: 'impkey', label: 'Algo no degrau', interact: [pickup('impkey', 'chave_impossivel', 'Pegar', [say('Uma chave. Não — duas. Não — uma, de outro formato.')])] })],
    back: [] }),

  room({ number: 133, name: 'juizo', title: 'Sala do Juízo', subtitle: 'Uma cadeira de espaldar alto. Vazia. Para você.', category: 'character', theme: 'chapel', tags: ['important'],
    front: [F('throne_chair', 960, 0.1, { examine: 'Uma cadeira alta. No assento, alguém bordou: "hóspede".' })], back: [] }),

  room({ number: 140, name: 'relogios_parados', title: 'Sala dos Relógios Parados', subtitle: 'Todos marcam 3:17.', category: 'puzzle', theme: 'library', ambience: 'silence', tags: ['has_clock'],
    front: [WL('clocks_wall', 700, 520, { examine: 'Todos parados às 3:17.', interact: [act('Olhar', [clue('clue_317')])] }), F('grandfather_clock', 1600, 0.06, {})],
    back: [],
    exits: [{ to: 270, ref: 'r140_clock', x: 1200, m: 'wood_dark', lock: 'L_r140_clock', v: { lock: 'symbol' } }] }),

  room({ number: 147, name: 'memoria_cozinha', title: 'A Cozinha de Casa', subtitle: 'Luz de manhã.', category: 'memory', theme: 'warm', hideNumber: true, tags: ['important', 'memory'],
    front: [WL('window', 960, 620, { variant: 'sun', light: { r: 700, i: 1, color: '#ffe0a0' }, examine: 'Uma janela com o vidro embaçado. Alguém desenhou portas nele com o dedo.', interact: [act('Lembrar', [{ type: 'lore', id: 'memoria_cozinha', read: true }, clue('clue_memorias_ordem'), route('memoria', 3)], { once: 'forever' })] }), F('table', 700, 0.22, { id: 't' }), ON('table', 700, 0.22, 'teacups', 0, {}), F('chair', 480, 0.25, { id: 'chair' }), F('child_chair', 900, 0.3, {})],
    back: [F('stove', 960, 0.06, {})] }),

  room({ number: 150, name: 'fenda', title: 'Sala da Fenda', subtitle: 'A parede se abriu. Atrás, não há Casa.', category: 'anomaly', theme: 'ruin', tags: ['important'],
    front: [WL('wall_crack', 800, 780, { light: { r: 300, i: 0.5, color: '#8090c0' }, examine: 'Através da fenda, um céu desenhado com estrelas.', interact: [act('Olhar pela fenda', [{ type: 'lore', id: 'fenda', read: true }, route('ruptura', 2)], { once: 'forever' })] })],
    back: [],
    exits: [{ to: 280, ref: 'r150_slot', x: 1400, m: 'grey', lock: 'L_r150_slot', v: { lock: 'toothless', handle: 'none' } }] }),

  room({ number: 160, name: 'arquivo_central', title: 'Arquivo Central', subtitle: 'Tudo que atravessa uma porta deixa um papel.', category: 'lore', theme: 'archive', tags: ['important'],
    front: [F('filing_cabinet', 400, 0.05, {}), F('filing_cabinet', 1500, 0.05, { id: 'fc2', examine: 'Uma gaveta com etiqueta: "MESTRA".', interact: [pickup('fc2', 'chave_mestra', 'Abrir a gaveta', [{ type: 'read', lore: 'doc_chave_mestra' }])] }), F('desk', 960, 0.16, { id: 'd' }), ON('desk', 960, 0.16, 'folder', 0, { id: 'ficha', interact: [pickup('ficha', 'registro_visitante', 'Ler a ficha nº 7', [{ type: 'read', lore: 'ficha_7' }], true)] })],
    back: [] }),

  room({ number: 163, name: 'memoria_aniversario', title: 'O Aniversário', subtitle: 'Duas velas.', category: 'memory', theme: 'warm', hideNumber: true, tags: ['important', 'memory'],
    front: [F('table', 960, 0.2, { id: 't' }), ON('table', 960, 0.2, 'cake_small', 0, { light: { r: 320, i: 1 }, anim: 'flame', interact: [act('Lembrar', [{ type: 'lore', id: 'memoria_aniversario', read: true }, route('memoria', 3)], { once: 'forever' })] }), WL('bunting', 960, 300, {})],
    back: [] }),

  room({ number: 166, name: 'invertida', title: 'Sala Invertida', subtitle: 'O chão está no teto.', category: 'impossible', theme: 'bedroom', mirror: false,
    front: [F('bed', 500, 0.1, { flipY: true, y: 260, examine: 'Uma cama presa ao teto.' }), F('chair', 1200, 0.1, { flipY: true, y: 240, id: 'chair' }), P('lamp_shade', 960, { y: 800, flipY: true, light: { r: 500, i: 0.8 } })],
    back: [],
    exits: [{ to: 250, ref: 'r166_imp', x: 1500, m: 'grey', lock: 'L_r166_imp', v: { lock: 'symbol', yOffset: -380, scale: 0.9 } }] }),

  room({ number: 171, name: 'quarto_t', title: 'O Quarto de T.', subtitle: 'O corpo conhece antes de você.', category: 'lore', theme: 'bedroom', puzzle: 'p_quarto_171', tags: ['important'],
    onFirstEnter: [{ type: 'fragments', n: 4 }],
    front: [F('bed', 400, 0.24, {}), F('desk', 1200, 0.16, { id: 'd' }), ON('desk', 1200, 0.16, 'box_locked', 0, { examine: 'Uma caixa com um T gravado. Cadeado de quatro dígitos.', interact: [act('Abrir a caixa', [puzzle('p_quarto_171')], { cond: { puzzleUnsolved: 'p_quarto_171' } })] }), ON('desk', 1200, 0.16, 'lamp_table', -120, { light: { r: 300, i: 1 } }), WL('photo_frames', 700, 540, { interact: [pickup('photo_frames', 'cracha', 'Olhar a moldura', [{ type: 'read', lore: 'cracha' }], true)] })],
    back: [WL('coat_hook', 960, 470, { examine: 'Um casaco igual ao seu. Falta um botão.' })] }),

  room({ number: 172, name: 'enfermaria_antiga', title: 'Enfermaria Antiga', subtitle: 'Registros de sessões.', category: 'lore', theme: 'infirmary',
    front: [F('hospital_bed', 700, 0.2, {}), WL('clipboard', 1300, 560, { interact: [reader('enfermaria_registros')] })], back: [] }),

  room({ number: 180, name: 'retrato_vazio', title: 'Sala do Retrato Vazio', subtitle: 'Uma moldura dourada, vazia.', category: 'puzzle', theme: 'gallery', puzzle: 'p_retrato_180', tags: ['important'],
    onFirstEnter: [{ type: 'fragments', n: 3 }],
    front: [WL('frame_empty', 960, 700, { examine: 'Uma moldura enorme. Plaqueta: "Família".', interact: [act('Responder', [puzzle('p_retrato_180')], { cond: { puzzleUnsolved: 'p_retrato_180' } })] })], back: [] }),

  room({ number: 188, name: 'espera_eco', title: 'Sala de Espera', subtitle: 'Aguarde ser chamado.', category: 'echo', theme: 'infirmary', echoOf: 'r027',
    front: [F('chairs_row_filled', 700, 0.18, { examine: 'As cadeiras estão ocupadas por silhuetas que não se mexem. Uma cadeira vazia no meio. A sua.' }), WL('number_panel', 1250, 450, { variant: '41', examine: 'O painel mostra "41".' })], back: [] }),

  room({ number: 195, name: 'caldeira', title: 'Caldeira', subtitle: 'O coração quente da Casa.', category: 'danger', theme: 'basement', ambience: 'boiler',
    front: [F('boiler', 960, 0.04, { light: { r: 480, i: 1, color: '#e07030' }, anim: 'flame', examine: 'Uma caldeira enorme. Respira.' }), F('glint', 1500, 0.4, { id: 'gloves', interact: [pickup('gloves', 'luvas', 'Pegar luvas de couro')] })], back: [] }),

  room({ number: 200, name: 'sala_duzentos', title: 'Sala Duzentos', subtitle: 'Um lugar para respirar.', category: 'sanctuary', theme: 'green', anchorable: true, tags: ['sanctuary', 'important'],
    front: [F('armchair', 800, 0.22, { interact: [act('Descansar', [{ type: 'heal', n: 2 }, say('Você dorme. Sonha com uma cozinha.')], { once: 'run' })] }), P('lamp_floor', 1000, { d: 0.18, y: 847, light: { r: 360, i: 1 } })], back: [] }),

  room({ number: 210, name: 'cemiterio', title: 'Parede dos Nomes', subtitle: 'Os que não voltaram.', category: 'lore', theme: 'chapel', tags: ['important'],
    onFirstEnter: [{ type: 'fragments', n: 4 }],
    front: [WL('names_wall', 960, 700, { examine: 'Nomes gravados com pregos.', interact: [act('Ler os nomes', [{ type: 'text', text: '$deadNames' }, { type: 'lore', id: 'cemiterio', read: true }, { type: 'lore', id: 'lista_perdidos' }])] }), F('candle_floor', 700, 0.3, { light: { r: 240, i: 0.9 }, anim: 'flame' }), F('candle_floor', 1220, 0.3, { id: 'c2', light: { r: 240, i: 0.9 }, anim: 'flame' })], back: [] }),

  room({ number: 215, name: 'memoria_construcao', title: 'A Construção', subtitle: 'Andaimes, cal, sete pessoas cansadas.', category: 'memory', theme: 'warm', hideNumber: true, tags: ['important', 'memory'],
    front: [F('drafting_table', 800, 0.16, { interact: [pickup('drafting_table', 'planta_original', 'Olhar a planta', [{ type: 'read', lore: 'planta_original' }, clue('clue_assinatura')], true)] }), F('scaffold', 1400, 0.05, {})], back: [] }),

  room({ number: 222, name: 'repetida', title: 'Sala Repetida', subtitle: 'Você já esteve aqui. Agora mesmo.', category: 'anomaly', theme: 'plain',
    front: [F('chair', 600, 0.2, { id: 'chair' }), F('chair', 1320, 0.2, { id: 'chair2' })], back: [],
    exits: [{ to: 300, ref: 'r222_imp', x: 1500, m: 'wood_dark', lock: 'L_r222_imp', v: { lock: 'symbol' } }] }),

  room({ number: 233, name: 'capela_antiga', title: 'Capela Antiga', subtitle: 'Mais velha que a Casa.', category: 'lore', theme: 'chapel', tags: ['important'],
    onFirstEnter: [{ type: 'fragments', n: 4 }],
    front: [F('altar', 960, 0.08, { id: 'altar' }), ON('altar', 960, 0.08, 'candles_five', 0, { light: { r: 300, i: 1 }, anim: 'flame', interact: [act('Rezar', [{ type: 'lore', id: 'mordomo_regimento', read: true }, route('obediencia', 2)], { once: 'forever' })] })], back: [] }),

  room({ number: 240, name: 'sala_nome', title: 'Sala do Nome', subtitle: 'Um nome, riscado mil vezes.', category: 'puzzle', theme: 'white', puzzle: 'p_nome_240', tags: ['important'],
    front: [WL('names_scribbles', 960, 760, { examine: 'O mesmo nome, repetido até ficar ilegível.', interact: [act('Dizer o nome', [puzzle('p_nome_240')], { cond: { puzzleUnsolved: 'p_nome_240' } })] })], back: [] }),

  room({ number: 250, name: 'outro', title: 'O Outro', subtitle: 'Alguém que você conhece de espelho.', category: 'character', theme: 'blue', tags: ['important'],
    front: [P('lamp_shade', 960, { y: 0, light: { r: 500, i: 0.8 } })], back: [] }),

  room({ number: 260, name: 'afogada', title: 'Sala Afogada', subtitle: 'O teto é de água. Ninguém se afoga.', category: 'danger', theme: 'flooded', ambience: 'water',
    front: [P('water_ceiling', 960, { y: 0, light: { r: 700, i: 0.4, color: '#8fb0c0' } }), F('chair', 900, 0.3, { id: 'chair' })], back: [] }),

  room({ number: 270, name: 'tempo_quebrado', title: 'Sala do Tempo Quebrado', subtitle: 'Você chega antes de sair.', category: 'impossible', theme: 'library', tags: ['has_clock'],
    front: [WL('clock_wall', 960, 360, { variant: 'backwards' })], back: [] }),

  room({ number: 275, name: 'memoria_despedida', title: 'A Despedida', subtitle: 'Verde claro.', category: 'memory', theme: 'infirmary', hideNumber: true, tags: ['important', 'memory'],
    front: [F('hospital_bed_small', 960, 0.2, { interact: [act('Lembrar', [{ type: 'lore', id: 'memoria_despedida', read: true }, route('memoria', 4), { type: 'setFlag', flag: 'lembrou_despedida' }], { once: 'forever' })] })], back: [] }),

  room({ number: 280, name: 'sem_paredes', title: 'Sala Sem Paredes', subtitle: 'Só portas, de pé, no escuro.', category: 'impossible', theme: 'void', layout: 'void', noCeilingLamp: true, front: [], back: [] }),

  room({ number: 290, name: 'quarto_menina_eco', title: 'Quarto da Menina', subtitle: 'Os desenhos cresceram.', category: 'echo', theme: 'nursery', echoOf: 'r018', region: 'abandonado',
    front: [WL('drawings_wall', 960, 560, { variant: 'grown', examine: 'Desenhos de alguém mais velho. Uma porta com o número 1000, e uma menina de mãos dadas com um homem.', interact: [act('Olhar', [{ type: 'route', axis: 'memoria', n: 2 }, say('Você entende que ela desenhou isto esperando você.')], { once: 'forever' })] })], back: [] }),

  room({ number: 300, name: 'sala_trezentos', title: 'Sala Trezentos', subtitle: 'Quase lá. Ou quase no começo.', category: 'sanctuary', theme: 'warm', anchorable: true, tags: ['sanctuary', 'important'],
    front: [F('armchair', 960, 0.24, { interact: [act('Descansar', [{ type: 'heal', n: 3 }], { once: 'run' })] })], back: [] }),

  room({ number: 310, name: 'branca_final', title: 'Sala Branca', subtitle: 'Mais branca.', category: 'anomaly', theme: 'white', noCeilingLamp: true, front: [], back: [] }),

  room({ number: 320, name: 'salao_portas', title: 'Salão das Portas', subtitle: 'Muitos caminhos terminam aqui.', category: 'transition', theme: 'parlor', layout: 'wide', minExits: 4,
    front: [P('chandelier', 960, { y: 0, light: { r: 700, i: 0.7 } })], back: [] }),

  room({ number: 325, name: 'fim_velho', title: 'A Última Lareira', subtitle: 'Alguém guardou uma poltrona para você.', category: 'character', theme: 'parlor', tags: ['important'],
    front: [F('fireplace', 1250, 0.02, { light: { r: 380, i: 0.8, color: '#e08040', dy: -80 }, anim: 'flame' }), F('armchair', 620, 0.2, { id: 'armchair' })], back: [] }),

  room({ number: 330, name: 'quase', title: 'Quase', subtitle: '', category: 'transition', theme: 'empty', front: [P('bulb', 960, { y: 0, light: { r: 500, i: 0.8 } })], back: [] }),

  room({ number: 333, name: 'antecamara', title: 'Antecâmara', subtitle: 'A última sala antes da última porta.', category: 'sanctuary', theme: 'plain', fixedExits: true, tags: ['important'],
    front: [P('bulb', 960, { y: 0, light: { r: 700, i: 1 }, anim: 'flicker' }), F('chair', 1640, 0.16, { id: 'chair' }), F('dresser_small', 300, 0.12, {})],
    back: [WL('mirror', 960, 560, { variant: 'plain', examine: 'Um espelho. Você.', interact: [act('Dizer seu nome em voz alta', [{ type: 'setFlag', flag: 'knows_name' }, { type: 'if', cond: { lore: 'planta_original' }, then: [say('"Teodoro." Soa como seu.')], else: [say('Você diz um nome. Não tem certeza se é o seu. A placa da porta, atrás de você, faz um som de metal esfriando.')] }])] })],
    exits: [{ to: 334, ref: 'door1000', x: 960, m: 'wood_dark', lock: 'L_door1000', v: { lock: 'memory', numberPlate: '1000' }, important: true, listen: 'Cheiro de pão. E silêncio de manhã.' }] }),

  room({ number: 334, name: 'final', title: 'A Porta 1000', subtitle: '', category: 'final', theme: 'plain', fixedExits: true, hideNumber: false,
    front: [P('bulb', 960, { y: 0, light: { r: 700, i: 1 } }), F('chair', 960, 0.3, { id: 'chair', examine: 'Uma cadeira. Uma lâmpada. Uma sala simples.', interact: [act('Sentar', [{ type: 'ending', id: 'auto' }])] })],
    back: [] }),
];
