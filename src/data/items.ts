import type { ItemDefinition, ItemCategory, Effect } from '../core/types';
import { KEYS } from './keys';

type Row = [id: string, name: string, cat: ItemCategory, desc: string, icon: string, extra?: Partial<ItemDefinition>];

const heal = (n: number, text: string): Partial<ItemDefinition> => ({
  useLabel: 'Usar', use: [{ type: 'heal', n }, { type: 'text', text }],
});
const readIt = (lore: string): Partial<ItemDefinition> => ({ read: lore, useLabel: 'Ler' });

const ROWS: Row[] = [
  // ── Ferramentas ──
  ['pe_de_cabra', 'Pé-de-cabra', 'ferramenta', 'Ferro frio. Serve para abrir o que não quer ser aberto — e para fazer barulho.', 'crowbar', { tags: ['force'] }],
  ['fosforos', 'Caixa de Fósforos', 'ferramenta', 'Sete fósforos. Seis. Você nunca tem certeza.', 'matches', { tags: ['light'] }],
  ['vela', 'Toco de Vela', 'ferramenta', 'Ilumina pouco. O suficiente para ver o que não queria ver.', 'candle', { tags: ['light'] }],
  ['lanterna', 'Lanterna de Mão', 'ferramenta', 'A pilha pisca quando você está com medo. Coincidência.', 'lantern', { tags: ['light'] }],
  ['giz', 'Giz Branco', 'ferramenta', 'Para marcar portas. A Casa às vezes apaga as marcas.', 'chalk', { tags: ['mark'] }],
  ['espelho_bolso', 'Espelho de Bolso', 'ferramenta', 'Permite ver o que está atrás sem virar. Às vezes mostra coisas diferentes.', 'mirror', { useLabel: 'Olhar atrás', use: [{ type: 'if', cond: { chance: 0.15 }, then: [{ type: 'text', text: 'No espelho, alguém está atrás de você. Você não se vira.', style: 'whisper' }], else: [{ type: 'text', text: 'No espelho: a parede de trás. Nada além.' }] }] }],
  ['fio_linha', 'Carretel de Linha Vermelha', 'ferramenta', 'Amarre na maçaneta e siga o fio de volta. Se a Casa deixar.', 'thread', { tags: ['thread'] }],
  ['estetoscopio', 'Estetoscópio', 'ferramenta', 'Encoste numa porta e ouça o que existe do outro lado.', 'stetho', { tags: ['listen'] }],
  ['relogio_bolso', 'Relógio de Bolso', 'ferramenta', 'Parado às 3:17. Se você der corda, ele anda para trás.', 'pocketwatch', { tags: ['time'] }],
  ['lupa', 'Lupa', 'ferramenta', 'Detalhes pequenos ficam grandes. Alguns preferiam continuar pequenos.', 'magnifier', { tags: ['detail'] }],
  ['caderno', 'Caderno em Branco', 'ferramenta', 'Suas anotações. Algumas não são da sua letra.', 'notebook'],
  ['martelo', 'Martelo', 'ferramenta', 'Cabo de madeira gasto. Serve para pregar ou para quebrar.', 'hammer', { tags: ['force'] }],
  ['alicate', 'Alicate', 'ferramenta', 'Corta arame. Corta corrente fina.', 'pliers', { tags: ['cut'] }],
  ['arame', 'Pedaço de Arame', 'ferramenta', 'Com paciência, arame vira quase qualquer coisa.', 'wire'],
  ['bussola', 'Bússola', 'ferramenta', 'A agulha aponta sempre para a porta mais próxima que você não abriu.', 'compass', { useLabel: 'Consultar', use: [{ type: 'text', text: 'A agulha treme e aponta para uma porta.' }] }],
  ['luvas', 'Luvas de Couro', 'ferramenta', 'Protegem do calor. E do frio que não é frio.', 'gloves', { tags: ['protect'] }],
  // ── Consumíveis ──
  ['pao', 'Pão Duro', 'consumivel', 'Ninguém sabe quem assa pão aqui.', 'bread', heal(1, 'Você come. Tem gosto de domingo.')],
  ['agua', 'Garrafa de Água', 'consumivel', 'Água limpa. Rara aqui.', 'bottle', heal(1, 'Você bebe devagar.')],
  ['curativo', 'Curativo', 'consumivel', 'Gaze limpa e esparadrapo amarelado.', 'bandage', heal(1, 'Você cuida do que dá para cuidar.')],
  ['cha', 'Chá Frio', 'consumivel', 'Numa xícara que não tem asa. Ainda cheira a camomila.', 'tea', heal(1, 'O chá acalma. Por um momento, você lembra de uma cozinha.')],
  ['laudano', 'Frasco de Láudano', 'consumivel', 'O rótulo diz "para dormir sem sonhar".', 'vial', { useLabel: 'Beber', use: [{ type: 'heal', n: 2 }, { type: 'text', text: 'Tudo fica macio e distante. Você perdeu alguma coisa, mas não sabe o quê.' }, { type: 'route', axis: 'obediencia', n: 1 }] }],
  ['maca', 'Maçã', 'consumivel', 'Vermelha demais para estar aqui.', 'apple', heal(1, 'Doce. Doce demais.')],
  ['chocolate', 'Barra de Chocolate', 'consumivel', 'Embrulhada em papel de uma marca que você quase lembra.', 'chocolate', heal(1, 'Você lembra de alguém dividindo isso com você.')],
  ['sal', 'Punhado de Sal', 'consumivel', 'Num saquinho de pano. O Velho jura que afasta coisas.', 'salt', { useLabel: 'Espalhar', use: [{ type: 'setFlag', flag: 'salt_circle', scope: 'room' }, { type: 'text', text: 'Você faz um círculo de sal no chão. Sente-se ridículo. E mais seguro.' }] }],
  ['fita_vermelha', 'Fita Vermelha', 'consumivel', 'Amarrada numa maçaneta, faz a Casa lembrar de uma sala.', 'ribbon', { tags: ['anchor'] }],
  ['pregos', 'Punhado de Pregos', 'consumivel', 'Tortos, mas ainda pregos.', 'nails'],
  // ── Objetos ──
  ['caixa_musica', 'Caixa de Música', 'objeto', 'Toca quatro notas e para. Sempre as mesmas quatro.', 'musicbox', { useLabel: 'Abrir', use: [{ type: 'sound', id: 'musicbox' }, { type: 'clue', id: 'clue_melodia' }, { type: 'text', text: 'Quatro notas: baixa, alta, média, alta.' }] }],
  ['boneca', 'Boneca de Pano', 'objeto', 'Um olho de botão, um olho bordado. Ela parece mais velha a cada run.', 'doll'],
  ['vaso_pequeno', 'Vaso Pequeno', 'objeto', 'Vazio. Frio. Alguém o limpa.', 'vase'],
  ['moeda_antiga', 'Moeda Antiga', 'objeto', 'Com o perfil de alguém que nunca existiu.', 'coin', { tags: ['trade'] }],
  ['moeda_furada', 'Moeda Furada', 'objeto', 'O Mercador aceita qualquer moeda. Principalmente as furadas.', 'coin', { tags: ['trade'] }],
  ['botao', 'Botão de Casaco', 'objeto', 'Igual aos botões do casaco que você está usando. Falta um no seu.', 'button'],
  ['carretel', 'Carretel Vazio', 'objeto', 'Alguém usou toda a linha. Para onde leva?', 'spool'],
  ['sino', 'Sininho de Latão', 'objeto', 'Tocar faz a Casa prestar atenção.', 'bell', { useLabel: 'Tocar', use: [{ type: 'sound', id: 'bell' }, { type: 'text', text: 'O som demora demais para morrer.' }, { type: 'route', axis: 'obediencia', n: 1 }] }],
  ['fita_cassete', 'Fita Cassete', 'objeto', 'Etiqueta: "NÃO GRAVAR POR CIMA".', 'tape', { read: 'grav_fita', useLabel: 'Ouvir' }],
  ['disco', 'Disco de Vinil', 'objeto', 'Um disco sem rótulo. Riscado no mesmo lugar.', 'record'],
  ['oculos', 'Óculos Rachados', 'objeto', 'A lente esquerda rachada. Seu grau, exatamente.', 'glasses'],
  ['anel', 'Aliança', 'objeto', 'Gravação interna: "H. & T. — para sempre, ou até a porta".', 'ring', { read: 'alianca' , useLabel: 'Ler gravação'}],
  ['pena', 'Pena de Escrever', 'objeto', 'A ponta ainda tem tinta fresca.', 'quill'],
  ['cartao_lugar', 'Cartão de Lugar', 'objeto', 'Um cartão de mesa de jantar com a letra "T." escrita à mão.', 'card', { read: 'cartao_t', useLabel: 'Ler' }],
  ['bilhete_trem', 'Bilhete de Trem', 'objeto', 'Ida. Sem volta. Data rasgada.', 'ticket', readIt('bilhete_trem')],
  ['lampada', 'Lâmpada Queimada', 'objeto', 'O filamento está inteiro. Ela só se recusa a acender.', 'bulb'],
  ['dado', 'Dado de Osso', 'objeto', 'Seis faces. Todas com um ponto só.', 'die'],
  ['pedra_lisa', 'Pedra Lisa', 'objeto', 'De rio. Não há rio aqui.', 'stone'],
  ['colher', 'Colher de Prata', 'objeto', 'Com uma inicial gravada: H.', 'spoon'],
  ['pente', 'Pente de Tartaruga', 'objeto', 'Um fio de cabelo longo ainda preso nele.', 'comb'],
  ['cachimbo', 'Cachimbo Apagado', 'objeto', 'Do Velho. Ele vai querer de volta.', 'pipe'],
  ['mapa_parcial', 'Mapa Parcial', 'objeto', 'Um pedaço do mapa do Cartógrafo. Algumas salas não existem mais. Outras ainda não.', 'map', { useLabel: 'Estudar', use: [{ type: 'revealMap', around: 2, count: 6 }, { type: 'text', text: 'Você memoriza o que consegue.' }, { type: 'takeItem', item: 'mapa_parcial', silent: true }] }],
  ['planta_baixa', 'Planta Baixa Rasgada', 'objeto', 'Uma planta da Casa com mil portas e uma só parede externa.', 'blueprint', readIt('casa_planta')],
  ['estatueta', 'Estatueta de Porta', 'objeto', 'Uma porta em miniatura, esculpida em madeira. Abre. Atrás, madeira.', 'figurine'],
  ['vidro_azul', 'Caco de Vidro Azul', 'objeto', 'Olhando por ele, as portas azuis ficam invisíveis.', 'glass'],
  ['cordao', 'Cordão de Prata', 'objeto', 'Sem pingente. Alguém o arrancou.', 'necklace'],
  ['ticket_espera', 'Senha de Espera', 'objeto', 'Número 7. O painel mostra 6 há anos.', 'ticket'],
  ['frasco_vazio', 'Frasco Vazio', 'objeto', 'Rótulo: "memórias — não agitar".', 'vial'],
  ['livro_pequeno', 'Livro Pequeno', 'objeto', '"Manual de Portas", sem autor. A última página está em branco.', 'book', readIt('livro_manual')],
  ['luva_crianca', 'Luva de Criança', 'objeto', 'Tricotada. A outra está em algum lugar.', 'mitten'],
  ['apito', 'Apito', 'objeto', 'O som faz os passos pararem. Por um tempo.', 'whistle', { useLabel: 'Apitar', use: [{ type: 'sound', id: 'whistle' }, { type: 'setFlag', flag: 'whistled', scope: 'run' }, { type: 'text', text: 'Silêncio. Até os passos param.' }] }],
  ['tesoura', 'Tesoura de Costura', 'objeto', 'Afiada. Com linha vermelha presa.', 'scissors', { tags: ['cut'] }],
  ['carta_selada', 'Carta Selada', 'objeto', 'Endereçada a você. Com a sua letra.', 'letter', readIt('carta_selada')],
  ['chave_de_papel', 'Desenho de uma Chave', 'objeto', 'A Menina desenhou uma chave. Você quase consegue segurá-la.', 'drawing', readIt('desenho_fechadura_lisa')],
  // ── Memórias (permanentes, não ocupam espaço) ──
  ['fotografia_casa', 'Fotografia Antiga', 'memoria', 'Várias pessoas em frente à Casa. Uma delas é você.', 'photo', { permanent: true, read: 'foto_casa' }],
  ['medalhao', 'Medalhão', 'memoria', 'Dentro: a foto de uma menina. E um espaço vazio onde estaria outra.', 'locket', { permanent: true, read: 'medalhao' }],
  ['desenho_sala67', 'Desenho: Três Símbolos', 'memoria', 'Uma sala com três símbolos. A Menina desenhou com cuidado a ordem.', 'drawing', { permanent: true, read: 'desenho_simbolos' }],
  ['desenho_porta_vermelha', 'Desenho: Porta Vermelha', 'memoria', 'Uma porta vermelha, e alguém de costas diante dela. É você.', 'drawing', { permanent: true, read: 'desenho_vermelha' }],
  ['desenho_voce', 'Desenho: Você', 'memoria', 'Um homem dormindo numa cadeira. Atrás dele, mil portas.', 'drawing', { permanent: true, read: 'desenho_voce' }],
  ['desenho_casa', 'Desenho: A Casa', 'memoria', 'A Casa vista de fora. Não tem janelas. Tem uma chaminé fumando.', 'drawing', { permanent: true, read: 'desenho_casa' }],
  ['diario_pagina_1', 'Página de Diário I', 'memoria', 'Sua letra. Você não lembra de ter escrito.', 'page', { permanent: true, read: 'diario_t1' }],
  ['diario_pagina_2', 'Página de Diário II', 'memoria', 'Sua letra, mais trêmula.', 'page', { permanent: true, read: 'diario_t2' }],
  ['diario_pagina_3', 'Página de Diário III', 'memoria', 'Manchada de algo escuro.', 'page', { permanent: true, read: 'diario_t3' }],
  ['diario_pagina_4', 'Página de Diário IV', 'memoria', 'Quase ilegível.', 'page', { permanent: true, read: 'diario_t4' }],
  ['diario_pagina_5', 'Página de Diário V', 'memoria', 'Escrita com muita calma.', 'page', { permanent: true, read: 'diario_t5' }],
  ['carta_helena_1', 'Carta de Helena I', 'memoria', '"Teo, se estiver lendo..."', 'letter', { permanent: true, read: 'helena_1' }],
  ['carta_helena_2', 'Carta de Helena II', 'memoria', 'Escrita às pressas.', 'letter', { permanent: true, read: 'helena_2' }],
  ['carta_helena_3', 'Carta de Helena III', 'memoria', 'Sem data. Sem assinatura. É dela.', 'letter', { permanent: true, read: 'helena_3' }],
  ['foto_44', 'Fotografia da Sala 44', 'memoria', 'Um homem diante de uma porta com o número 44. É Benedito.', 'photo', { permanent: true, read: 'foto_44' }],
  ['foto_aniversario', 'Foto de Aniversário', 'memoria', 'Um bolo com velas. As velas estão acesas na foto. Ainda.', 'photo', { permanent: true, read: 'foto_aniversario' }],
  ['foto_sete', 'Foto dos Sete', 'memoria', 'Sete pessoas com ferramentas de construção. Um rosto foi raspado.', 'photo', { permanent: true, read: 'foto_sete' }],
  ['registro_visitante', 'Ficha de Visitante nº 7', 'memoria', 'Uma ficha de arquivo com seu rosto grampeado.', 'card', { permanent: true, read: 'ficha_7' }],
  ['planta_original', 'Planta Original', 'memoria', 'A planta da Casa. Assinada por sete pessoas. Uma assinatura é a sua.', 'blueprint', { permanent: true, read: 'planta_original' }],
  ['gravacao_1', 'Gravação: Primeira Sessão', 'memoria', 'Uma voz que parece a sua lendo números.', 'tape', { permanent: true, read: 'grav_1' }],
  ['gravacao_2', 'Gravação: Sessão 41', 'memoria', 'Ruído, e então a voz de Helena.', 'tape', { permanent: true, read: 'grav_2' }],
  ['nome_bordado', 'Lenço Bordado', 'memoria', 'Bordado com um nome: "Lia".', 'cloth', { permanent: true, read: 'lenco_lia' }],
  ['cracha', 'Crachá Apagado', 'memoria', '"Equipe de Construção — acesso a todas as portas". A foto foi arrancada.', 'badge', { permanent: true, read: 'cracha' }],
  ['bilhete_casa', 'Bilhete da Casa', 'memoria', 'Letra que não é de ninguém: "Obrigada por voltar."', 'note', { permanent: true, read: 'bilhete_casa_1' }],
  ['lista_perdidos', 'Lista dos Perdidos', 'memoria', 'Nomes, datas e uma coluna: "ainda aqui?"', 'list', { permanent: true, read: 'lista_perdidos' }],
  ['cartao_postal', 'Cartão Postal', 'memoria', 'Uma praia. No verso: "Nunca chegamos a ir."', 'postcard', { permanent: true, read: 'postal' }],
];

const KEY_ICONS: Record<string, string> = {};

function keyItems(): ItemDefinition[] {
  return KEYS.map(k => ({
    id: k.id, name: k.name, category: 'chave' as ItemCategory, description: k.description,
    icon: 'key_' + k.visualVariant, persistent: k.persistentAcrossRuns, key: k, tags: ['key'],
  }));
}

export const ITEMS: Record<string, ItemDefinition> = {};
for (const r of ROWS) {
  const [id, name, category, description, icon, extra] = r;
  ITEMS[id] = { id, name, category, description, icon, ...(extra ?? {}) };
}
for (const k of keyItems()) ITEMS[k.id] = k;

export function registerItem(def: ItemDefinition) { ITEMS[def.id] = def; }
export function item(id: string): ItemDefinition | undefined { return ITEMS[id]; }
export function useEffects(id: string): Effect[] | undefined { return ITEMS[id]?.use; }
void KEY_ICONS;
