import type { RegionId } from '../core/types';

export type WallPattern = 'plain' | 'stripes' | 'damask' | 'panels' | 'tiles' | 'stone' | 'brick' | 'plaster' | 'boards' | 'none';
export type FloorKind = 'planks' | 'tiles' | 'checker' | 'stone' | 'carpet' | 'concrete' | 'water' | 'void';

export interface Theme {
  id: string;
  wall: string;         // base wall tone
  wall2: string;        // secondary (pattern / wainscot)
  pattern: WallPattern;
  wainscot?: boolean;   // lower wall panelling
  floor: FloorKind;
  floorColor: string;
  ceiling: string;
  stains: number;       // 0..1 grime
  ambient: number;      // 0..1 base light
  lightColor: string;
  ambience: string;
}

// Palette anchored on the art direction: #111113 bg, #242124 wall, #49372D brown, #654635 wood,
// #B9A58A aged beige, #E6B469 light, #6E292D wine, #3E5145 old green, #445463 slate blue.
export const THEMES: Record<string, Theme> = {
  plain:      { id: 'plain', wall: '#3a3433', wall2: '#2f2a2a', pattern: 'plaster', floor: 'planks', floorColor: '#4a3528', ceiling: '#1a1718', stains: 0.5, ambient: 0.3, lightColor: '#e6b469', ambience: 'room' },
  bedroom:    { id: 'bedroom', wall: '#35302f', wall2: '#2c2727', pattern: 'stripes', floor: 'planks', floorColor: '#503a2b', ceiling: '#191617', stains: 0.4, ambient: 0.3, lightColor: '#e6b469', ambience: 'room' },
  corridor:   { id: 'corridor', wall: '#3b3532', wall2: '#2a2524', pattern: 'panels', wainscot: true, floor: 'planks', floorColor: '#4d3627', ceiling: '#171415', stains: 0.5, ambient: 0.28, lightColor: '#e6b469', ambience: 'corridor' },
  parlor:     { id: 'parlor', wall: '#3a2e2e', wall2: '#4a3434', pattern: 'damask', wainscot: true, floor: 'planks', floorColor: '#4a3226', ceiling: '#1a1516', stains: 0.35, ambient: 0.3, lightColor: '#e8b86c', ambience: 'room' },
  empty:      { id: 'empty', wall: '#34302f', wall2: '#2b2828', pattern: 'plaster', floor: 'planks', floorColor: '#3f3029', ceiling: '#161415', stains: 0.6, ambient: 0.25, lightColor: '#e2b36a', ambience: 'silence' },
  green:      { id: 'green', wall: '#2f3530', wall2: '#263029', pattern: 'stripes', wainscot: true, floor: 'planks', floorColor: '#473426', ceiling: '#151716', stains: 0.5, ambient: 0.27, lightColor: '#e2b469', ambience: 'room' },
  blue:       { id: 'blue', wall: '#2c3238', wall2: '#252b31', pattern: 'plaster', floor: 'planks', floorColor: '#3e3129', ceiling: '#141619', stains: 0.5, ambient: 0.26, lightColor: '#dcb574', ambience: 'room' },
  kitchen:    { id: 'kitchen', wall: '#3c3934', wall2: '#5a554a', pattern: 'tiles', floor: 'checker', floorColor: '#3a3632', ceiling: '#1a1817', stains: 0.6, ambient: 0.3, lightColor: '#e6c07a', ambience: 'drip' },
  bathroom:   { id: 'bathroom', wall: '#3d3f3c', wall2: '#5f625c', pattern: 'tiles', floor: 'tiles', floorColor: '#45463f', ceiling: '#1b1c1b', stains: 0.7, ambient: 0.28, lightColor: '#d8c89a', ambience: 'drip' },
  storage:    { id: 'storage', wall: '#35302b', wall2: '#2a2520', pattern: 'boards', floor: 'planks', floorColor: '#3c2d22', ceiling: '#141210', stains: 0.7, ambient: 0.22, lightColor: '#e0aa5c', ambience: 'wind' },
  library:    { id: 'library', wall: '#33291f', wall2: '#40301f', pattern: 'panels', wainscot: true, floor: 'planks', floorColor: '#4b3325', ceiling: '#161210', stains: 0.3, ambient: 0.28, lightColor: '#e9b765', ambience: 'clock' },
  gallery:    { id: 'gallery', wall: '#3a2b2d', wall2: '#2d2224', pattern: 'damask', wainscot: true, floor: 'planks', floorColor: '#43302a', ceiling: '#171213', stains: 0.3, ambient: 0.27, lightColor: '#e6b469', ambience: 'room' },
  nursery:    { id: 'nursery', wall: '#3a3533', wall2: '#46403a', pattern: 'stripes', floor: 'planks', floorColor: '#553d2c', ceiling: '#1b1818', stains: 0.4, ambient: 0.3, lightColor: '#e8bd78', ambience: 'musicbox' },
  archive:    { id: 'archive', wall: '#34332d', wall2: '#2b2a25', pattern: 'panels', floor: 'concrete', floorColor: '#393731', ceiling: '#151513', stains: 0.5, ambient: 0.26, lightColor: '#d9c690', ambience: 'hum' },
  infirmary:  { id: 'infirmary', wall: '#3f403c', wall2: '#50524c', pattern: 'tiles', wainscot: true, floor: 'tiles', floorColor: '#43443f', ceiling: '#1b1c1b', stains: 0.6, ambient: 0.3, lightColor: '#d6d0a8', ambience: 'hum' },
  basement:   { id: 'basement', wall: '#302c29', wall2: '#3a332d', pattern: 'brick', floor: 'concrete', floorColor: '#2f2c29', ceiling: '#121110', stains: 0.8, ambient: 0.2, lightColor: '#e0a456', ambience: 'boiler' },
  chapel:     { id: 'chapel', wall: '#35302b', wall2: '#2b2622', pattern: 'stone', floor: 'stone', floorColor: '#3a3530', ceiling: '#131110', stains: 0.5, ambient: 0.22, lightColor: '#eab35a', ambience: 'wind' },
  ruin:       { id: 'ruin', wall: '#2f2d29', wall2: '#3a3a30', pattern: 'plaster', floor: 'planks', floorColor: '#342a22', ceiling: '#101010', stains: 0.95, ambient: 0.2, lightColor: '#cfae78', ambience: 'rain' },
  greenhouse: { id: 'greenhouse', wall: '#2c342f', wall2: '#243029', pattern: 'panels', floor: 'stone', floorColor: '#34332c', ceiling: '#101412', stains: 0.5, ambient: 0.26, lightColor: '#c9c79a', ambience: 'rain' },
  white:      { id: 'white', wall: '#bdb8ad', wall2: '#aaa598', pattern: 'plain', floor: 'concrete', floorColor: '#a8a397', ceiling: '#cfcac0', stains: 0.1, ambient: 0.85, lightColor: '#fffaf0', ambience: 'whitehum' },
  void:       { id: 'void', wall: '#0e0e10', wall2: '#0b0b0d', pattern: 'none', floor: 'void', floorColor: '#0d0d0f', ceiling: '#060607', stains: 0, ambient: 0.12, lightColor: '#e6b469', ambience: 'drone' },
  warm:       { id: 'warm', wall: '#5a4634', wall2: '#6a543d', pattern: 'stripes', wainscot: true, floor: 'planks', floorColor: '#6a4a33', ceiling: '#2b221b', stains: 0.1, ambient: 0.55, lightColor: '#ffd28a', ambience: 'memory' },
  flooded:    { id: 'flooded', wall: '#2a302f', wall2: '#222827', pattern: 'plaster', floor: 'water', floorColor: '#1c2426', ceiling: '#0f1212', stains: 0.9, ambient: 0.2, lightColor: '#bcd0c8', ambience: 'water' },
  zero:       { id: 'zero', wall: '#2c2829', wall2: '#242122', pattern: 'plaster', floor: 'planks', floorColor: '#3a2c24', ceiling: '#121011', stains: 0.4, ambient: 0.22, lightColor: '#e6b469', ambience: 'zero' },
};

export interface RegionDef {
  id: RegionId;
  name: string;
  range: [number, number];
  themes: string[];
  description: string;
}

export const REGIONS: RegionDef[] = [
  { id: 'zero', name: 'Sala Zero', range: [0, 0], themes: ['zero'], description: 'Entre uma tentativa e outra.' },
  { id: 'residencial', name: 'Ala Residencial', range: [1, 48], themes: ['plain', 'bedroom', 'corridor', 'parlor', 'empty', 'green', 'blue'], description: 'Quartos, corredores, salas de estar. Quase normal.' },
  { id: 'servico', name: 'Ala de Serviço', range: [30, 95], themes: ['kitchen', 'bathroom', 'storage', 'corridor', 'plain'], description: 'Onde alguém cozinhava, lavava e guardava coisas.' },
  { id: 'biblioteca', name: 'Biblioteca', range: [60, 135], themes: ['library', 'parlor', 'corridor'], description: 'Livros que ninguém escreveu duas vezes igual.' },
  { id: 'galeria', name: 'Galeria', range: [100, 175], themes: ['gallery', 'parlor', 'empty'], description: 'Retratos. Alguns ainda não pintados.' },
  { id: 'infantil', name: 'Ala Infantil', range: [120, 195], themes: ['nursery', 'bedroom', 'green'], description: 'Brinquedos arrumados por alguém muito cuidadoso.' },
  { id: 'arquivos', name: 'Arquivos', range: [155, 235], themes: ['archive', 'infirmary', 'corridor'], description: 'Registros sobre visitantes. Muitos visitantes.' },
  { id: 'subsolo', name: 'Subsolo', range: [190, 262], themes: ['basement', 'storage', 'flooded'], description: 'Canos, caldeiras, algo respirando nas paredes.' },
  { id: 'antiga', name: 'Ala Antiga', range: [228, 292], themes: ['chapel', 'parlor', 'ruin', 'library'], description: 'Mais velha que o resto da Casa. Ou mais nova.' },
  { id: 'abandonado', name: 'Setor Abandonado', range: [258, 318], themes: ['ruin', 'flooded', 'greenhouse', 'empty'], description: 'Onde a Casa desistiu de fingir.' },
  { id: 'semnome', name: 'Área Sem Nome', range: [300, 334], themes: ['white', 'void', 'empty', 'plain'], description: '—' },
];

export function regionName(id: RegionId): string {
  return REGIONS.find(r => r.id === id)?.name ?? id;
}
