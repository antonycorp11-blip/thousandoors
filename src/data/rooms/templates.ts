// Templates for the ~250 generated rooms: controlled variation, never random noise.
import type { RoomCategory } from '../../core/types';

export const NAMES_BY_THEME: Record<string, string[]> = {
  plain: ['Saleta', 'Sala', 'Antessala', 'Passagem', 'Sala de Estar', 'Sala Pequena', 'Sala Comum'],
  bedroom: ['Quarto', 'Quarto de Hóspedes', 'Quarto Estreito', 'Alcova', 'Quarto Fechado'],
  corridor: ['Corredor', 'Corredor Estreito', 'Galeria de Passagem', 'Corredor de Serviço', 'Vão'],
  parlor: ['Salão', 'Sala de Visitas', 'Sala Vermelha Escura', 'Sala de Fumar', 'Sala de Leitura'],
  empty: ['Sala Vazia', 'Sala', 'Cômodo', 'Sala Sem Nada', 'Espaço'],
  green: ['Sala Verde', 'Sala de Música Antiga', 'Saleta Verde', 'Sala de Costura Velha'],
  blue: ['Sala Azul', 'Sala Fria', 'Saleta Azul', 'Sala de Inverno'],
  kitchen: ['Copa', 'Despensa', 'Cozinha Pequena', 'Área de Serviço', 'Lavanderia'],
  bathroom: ['Lavabo', 'Banheiro', 'Sala de Banho', 'Banheiro de Serviço'],
  storage: ['Depósito', 'Quartinho', 'Sótão', 'Almoxarifado', 'Sala de Caixas'],
  library: ['Biblioteca', 'Sala de Leitura', 'Escritório', 'Gabinete', 'Estante'],
  gallery: ['Galeria', 'Sala de Quadros', 'Corredor dos Retratos', 'Sala das Molduras'],
  nursery: ['Quarto de Criança', 'Sala de Brincar', 'Berçário', 'Quarto Pequeno'],
  archive: ['Arquivo', 'Sala de Registros', 'Sala das Fichas', 'Cartório', 'Sala de Pastas'],
  infirmary: ['Enfermaria', 'Sala de Exames', 'Sala de Repouso', 'Consultório'],
  basement: ['Porão', 'Subsolo', 'Sala dos Canos', 'Cisterna', 'Casa de Máquinas'],
  chapel: ['Oratório', 'Capela', 'Nave', 'Sacristia', 'Sala de Velas'],
  ruin: ['Sala Arruinada', 'Cômodo Desabado', 'Sala Úmida', 'Ruína', 'Sala Esquecida'],
  greenhouse: ['Estufa', 'Jardim Interno', 'Viveiro', 'Pátio Coberto'],
  white: ['Sala Branca', 'Sala', '—', 'Sala Clara'],
  void: ['—', 'Escuro', 'Nada', 'Sala'],
  flooded: ['Sala Alagada', 'Cisterna', 'Sala Molhada'],
  warm: ['Sala Quente', 'Sala da Tarde'],
};

export const SUBTITLES: Record<string, string[]> = {
  normal: [
    'Cheira a poeira e cera velha.', 'Uma sala. Só uma sala.', 'Alguém varreu o chão. Recentemente.', 'O papel de parede descasca em tiras longas.',
    'O assoalho range no mesmo lugar duas vezes.', 'Uma sala comum. Comum demais.', 'Parece que alguém acabou de sair.', 'O ar está parado.',
    'A lâmpada zumbe numa nota só.', 'Tudo no lugar. Tudo arrumado para ninguém.', 'Há marcas de móveis que não estão mais aqui.',
    'Você tem a sensação de já ter passado por aqui.', 'Nada estranho. Isso é estranho.', 'Uma mancha de umidade no teto tem forma de porta.',
  ],
  empty: [
    'Apenas portas e silêncio.', 'Nada. Nem poeira.', 'Vazia.', 'Por que esta sala existe?', 'O eco dos seus passos chega atrasado.',
    'Uma sala do tamanho exato de uma sala.', 'Aqui não há nada para ver. Olhe mesmo assim.',
  ],
  transition: ['Uma passagem entre alas.', 'O papel de parede muda no meio da parede.', 'Metade de uma sala, metade de outra.', 'O cheiro muda aqui.'],
  anomaly: [
    'O ambiente está... estranho.', 'As proporções estão erradas por um centímetro.', 'A sombra da porta não corresponde à porta.',
    'O teto está mais perto do que antes.', 'Esta sala é maior por dentro. Ou você é menor.', 'Os móveis estão todos virados para a mesma parede.',
    'Há uma porta onde não cabe uma porta.', 'O relógio marca uma hora que não existe.',
  ],
  danger: ['Algo aqui não gosta de visitas.', 'O chão parece fino.', 'Você não devia demorar.', 'Cheira a ferro.'],
  secret: ['Poucos chegam aqui.', 'Uma sala que não quer ser encontrada.', 'Escondida entre duas outras.'],
  puzzle: ['Algo precisa ser resolvido.', 'Há um mecanismo aqui.', 'A sala espera uma resposta.', 'Algo está fora de ordem.'],
  event: ['Algo aconteceu aqui.', 'Os móveis foram arrastados às pressas.', 'Há sinais de luta. Ou de pressa.'],
  echo: ['Você conhece esta sala. Não assim.', 'Igual. Quase igual.'],
  lore: ['Papéis. Muitos papéis.', 'Alguém deixou coisas para serem lidas.'],
  sanctuary: ['Aqui dá para respirar.', 'Um lugar quieto.'],
  impossible: ['Isso não pode estar aqui.', 'A arquitetura desistiu.', 'Não há como isto caber na Casa.'],
};

/** Category weights by depth band (0..1). Empty rooms are important for tension. */
export function categoryWeights(depth: number): [RoomCategory, number][] {
  return [
    ['normal', 40],
    ['empty' as RoomCategory, 18],
    ['transition', 6],
    ['event', 7],
    ['puzzle', depth > 0.05 ? 12 : 0],
    ['anomaly', depth < 0.09 ? 0 : 6 + depth * 26],
    ['danger', depth < 0.12 ? 0 : 4 + depth * 6],
    ['secret', depth < 0.05 ? 0 : 3],
    ['impossible', depth < 0.62 ? 0 : 8 + depth * 10],
    ['sanctuary', 1.5],
  ];
}

/** Prop pools per theme: [kind, weight, placement]. placement: floor | wall | top | edge */
export type Placement = 'floor' | 'wall' | 'edge';
export const PROP_POOLS: Record<string, [string, number, Placement][]> = {
  plain: [['chair', 5, 'floor'], ['dresser_small', 3, 'edge'], ['side_table_lamp', 4, 'edge'], ['painting', 4, 'wall'], ['coat_rack', 2, 'edge'], ['boxes', 2, 'floor'], ['stool', 2, 'floor'], ['rug', 3, 'floor'], ['sconce', 2, 'wall'], ['clock_wall', 1, 'wall']],
  bedroom: [['bed', 4, 'edge'], ['nightstand_lamp', 4, 'edge'], ['dresser', 3, 'edge'], ['mirror', 2, 'wall'], ['painting', 3, 'wall'], ['chair', 3, 'floor'], ['wardrobe', 2, 'edge'], ['rug', 3, 'floor'], ['trunk', 2, 'floor']],
  corridor: [['sconce', 6, 'wall'], ['painting', 4, 'wall'], ['side_table_lamp', 2, 'edge'], ['runner_rug', 3, 'floor'], ['bench', 1, 'floor'], ['plant_dead', 1, 'edge']],
  parlor: [['armchair', 4, 'floor'], ['painting', 5, 'wall'], ['side_table_lamp', 3, 'edge'], ['cabinet', 2, 'edge'], ['rug', 3, 'floor'], ['sconce', 3, 'wall'], ['clock_wall', 2, 'wall'], ['piano', 1, 'edge'], ['gramophone', 1, 'floor']],
  empty: [['chair', 3, 'floor'], ['stool', 1, 'floor']],
  green: [['armchair', 3, 'floor'], ['painting', 3, 'wall'], ['side_table_lamp', 3, 'edge'], ['bookshelf', 2, 'edge'], ['chair', 3, 'floor'], ['plant_dead', 2, 'edge'], ['rug', 2, 'floor']],
  blue: [['chair', 3, 'floor'], ['painting', 3, 'wall'], ['cabinet', 2, 'edge'], ['window', 1, 'wall'], ['stool', 2, 'floor'], ['clock_wall', 2, 'wall']],
  kitchen: [['stove', 3, 'edge'], ['tea_table', 3, 'floor'], ['cabinet', 3, 'edge'], ['bucket', 2, 'floor'], ['sink', 2, 'edge'], ['shelves_jars', 2, 'edge'], ['chair', 2, 'floor']],
  bathroom: [['bathtub', 3, 'edge'], ['sink', 4, 'edge'], ['mirror', 3, 'wall'], ['towel', 2, 'wall'], ['bucket', 1, 'floor']],
  storage: [['boxes', 5, 'floor'], ['crate', 4, 'floor'], ['shelves_jars', 3, 'edge'], ['sheet_furniture', 3, 'floor'], ['trunk', 2, 'floor'], ['chair', 1, 'floor']],
  library: [['bookshelf', 6, 'edge'], ['armchair', 3, 'floor'], ['desk_lamp', 3, 'floor'], ['lamp_floor', 2, 'floor'], ['globe', 1, 'floor'], ['clock_wall', 2, 'wall'], ['painting', 2, 'wall']],
  gallery: [['painting', 7, 'wall'], ['bust_pedestal', 3, 'floor'], ['bench', 2, 'floor'], ['sconce', 3, 'wall'], ['statue', 1, 'edge'], ['frame_floor', 1, 'floor']],
  nursery: [['bed_child', 3, 'edge'], ['toy_box', 3, 'floor'], ['rocking_horse', 2, 'floor'], ['doll', 2, 'floor'], ['drawings_wall', 3, 'wall'], ['cradle', 1, 'floor'], ['window', 1, 'wall']],
  archive: [['filing_cabinet', 6, 'edge'], ['desk_lamp', 3, 'floor'], ['papers', 3, 'floor'], ['boxes', 2, 'floor'], ['clock_wall', 1, 'wall'], ['chair', 2, 'floor']],
  infirmary: [['hospital_bed', 4, 'floor'], ['cabinet', 3, 'edge'], ['clipboard', 2, 'wall'], ['chair', 2, 'floor'], ['sink', 1, 'edge'], ['screen', 2, 'floor']],
  basement: [['pipes', 5, 'wall'], ['crate', 3, 'floor'], ['barrel', 3, 'floor'], ['boxes', 2, 'floor'], ['bucket', 2, 'floor'], ['boiler_small', 1, 'edge']],
  chapel: [['pews', 3, 'floor'], ['candle_floor', 4, 'floor'], ['altar_small', 2, 'floor'], ['cross', 2, 'wall'], ['statue', 2, 'edge']],
  ruin: [['chair_fallen', 3, 'floor'], ['debris', 5, 'floor'], ['sheet_furniture', 2, 'floor'], ['painting', 2, 'wall'], ['plant_dead', 3, 'edge'], ['crate', 1, 'floor']],
  greenhouse: [['plants_big', 5, 'edge'], ['bench', 2, 'floor'], ['bucket', 2, 'floor'], ['plant_dead', 3, 'floor']],
  white: [['chair', 2, 'floor']],
  void: [],
  flooded: [['chair', 2, 'floor'], ['debris', 2, 'floor']],
  warm: [['armchair', 2, 'floor'], ['side_table_lamp', 2, 'edge'], ['painting', 2, 'wall']],
};

export const GENERATED_EXAMINES: Record<string, string[]> = {
  chair: ['Uma cadeira. Alguém sentou aqui. O assento ainda afunda.', 'Uma cadeira de madeira. Está virada um pouco para a porta.', 'Uma cadeira comum.'],
  painting: ['Um quadro escuro. Uma paisagem sem céu.', 'O retrato de alguém que parece estar prestes a falar.', 'Uma natureza-morta: frutas, uma chave, um relógio.', 'Um quadro de uma porta. Só uma porta.'],
  bed: ['Uma cama arrumada com cuidado militar.', 'Uma cama desfeita. Os lençóis estão mornos.'],
  bookshelf: ['Livros sem título na lombada.', 'Uma estante. Um livro está virado ao contrário.', 'Todos os livros têm a mesma primeira frase.'],
  mirror: ['Seu reflexo. Um pouco atrasado.', 'Um espelho manchado.'],
  boxes: ['Caixas fechadas com fita. Uma diz "não abrir até lembrar".', 'Caixas de mudança. Mudança de onde?'],
  window: ['Uma janela pintada na parede.', 'Uma janela para outra sala igual a esta.'],
  clock_wall: ['Um relógio parado às 3:17.', 'Um relógio sem ponteiros.', 'Um relógio que anda. Isso é o estranho.'],
  hospital_bed: ['Uma cama de ferro. O colchão tem a marca de alguém.', 'Lençóis dobrados com precisão.'],
  filing_cabinet: ['Gavetas etiquetadas com números de porta.', 'Um arquivo de metal. Frio.'],
  pews: ['Bancos de igreja. Um livro de hinos aberto numa página em branco.'],
  debris: ['Pedaços de reboco. Algo caiu do teto. Ou atravessou.'],
  toy_box: ['Brinquedos arrumados por tamanho.'],
  doll: ['Uma boneca de pano. Um olho de botão, um olho bordado.'],
};
