/** Refresh the catalogues after changing authored or generated content. */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildHouse } from '../src/world/HouseGenerator';
import { HouseGraph, validateHouse } from '../src/world/HouseGraph';
import { CHARACTERS } from '../src/data/characters';
import { PUZZLES } from '../src/data/puzzles';
import { EVENTS } from '../src/data/events';

const house = buildHouse();
const graph = new HouseGraph(house);
const report = validateHouse(house);
if (report.errors.length) throw new Error(report.errors.join('\n'));
const clean = (s: unknown) => String(s ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const list = (xs: unknown[]) => xs.length ? xs.map(clean).join(', ') : '—';
const spawnPlaces = (c: typeof CHARACTERS[number]) => c.spawn.flatMap(s =>
  s.rooms ?? (s.tags ? ['tag:' + s.tags.join('/')] : s.regions ? ['região:' + s.regions.join('/')] : ['dinâmico']));
const write = (name: string, body: string) => writeFileSync(resolve(process.cwd(), name), body.trimEnd() + '\n');

write('ROOMS.md', `# Salas da Casa

Catálogo gerado por \`npm run docs\` a partir de \`src/data/rooms\` e \`HouseGenerator\`. A Sala Zero é o hub; as outras 334 salas compõem a Casa. O número de portas conta saídas próprias, inclusive escondidas. Portas de retorno podem aparecer na parede de trás depois de uma travessia.

| ID | Título | Região | Categoria | Portas | Objetos | Enigma | Criação |
|---|---|---|---|---:|---:|---|---|
${Object.values(house.rooms).sort((a, b) => a.id.localeCompare(b.id)).map(r => `| ${r.id} | ${clean(r.title)} | ${r.region} | ${r.category} | ${(house.outDoors[r.id] ?? []).filter(id => !house.doors[id].meta).length} | ${r.front.props.length + r.back.props.length} | ${r.puzzle ?? '—'} | ${r.authored ? 'autoral' : 'gerada'} |`).join('\n')}
`);

write('CHARACTERS.md', `# Personagens

Catálogo gerado por \`npm run docs\`. Regras de encontro são avaliadas por run; um mesmo personagem pode aparecer em locais diferentes segundo suas condições.

| ID | Nome conhecido | Primeira impressão | Eixo | Lugares/regras | Diálogos |
|---|---|---|---|---|---|
${CHARACTERS.map(c => `| ${c.id} | ${clean(c.name)} | ${clean(c.unknownName)} | ${c.axis ?? '—'} | ${list(spawnPlaces(c))} | ${list(c.talk.map(t => t.dialogue))} |`).join('\n')}
`);

write('PUZZLES.md', `# Enigmas

Catálogo gerado por \`npm run docs\`. Soluções ficam em \`src/data/puzzles.ts\`; este índice registra onde o desafio aparece e onde suas pistas podem ser encontradas, sem expor a solução ao jogador.

| ID | Título | Sala | Tipo | Pistas em | Entre runs |
|---|---|---|---|---|---|
${PUZZLES.map(p => `| ${p.id} | ${clean(p.title)} | ${p.room} | ${p.type} | ${list([...new Set(p.clues.map(c => c.room))])} | ${p.multiRun ? 'sim' : 'não'} |`).join('\n')}
`);

write('EVENTS.md', `# Eventos

Catálogo gerado por \`npm run docs\`. Condições e efeitos completos estão em \`src/data/events.ts\`. Eventos de perspectiva usam o gatilho \`turn\`; \`tick\` permite reações ao tempo observado.

| ID | Gatilho | Salas | Regiões | Frequência | Susto |
|---|---|---|---|---|---|
${EVENTS.map(e => `| ${e.id} | ${e.trigger} | ${list(e.rooms ?? [])} | ${list(e.regions ?? [])} | ${e.once ?? 'repetível'} | ${e.scare ? 'sim' : 'não'} |`).join('\n')}
`);

const path = graph.shortestPath('r001', 'r334', { allowLocked: true, allowHidden: true }) ?? [];
write('HOUSE_GRAPH.md', `# Grafo da Casa

Catálogo gerado por \`npm run docs\`. Uma porta é uma entidade numerada internamente; o vínculo de retorno depende de \`bidirectional\`. Portas instáveis e observadoras têm destinos condicionais adicionais. A Sala Zero não conta entre as 334 salas canônicas, e suas portas de meta progressão não contam entre as 1.000.

## Validação

| Medida | Valor |
|---|---:|
| Salas canônicas | ${report.totals.rooms} |
| Portas numeradas | ${report.totals.doors} |
| Fechaduras | ${report.totals.locks} |
| Chaves | ${report.totals.keys} |
| Salas inacessíveis no grafo completo | ${report.unreachableRooms.length} |
| Portas órfãs | ${report.orphanDoors.length} |
| Salas sem retorno | ${report.noReturn} |
| Entradas na antecâmara | ${report.entrancesToAntechamber} |
| Rotas mínimas até o final | ${report.routesToFinal} |
| Erros | ${report.errors.length} |
| Avisos | ${report.warnings.length} |

Uma rota estrutural mínima, admitindo fechaduras e passagens escondidas: ${path.join(' → ')}. Isso verifica o grafo, não significa que uma run nova já possui todas as chaves e pistas necessárias.

## Regras de edição

1. Preserve os IDs estáveis de salas, portas e itens já salvos.
2. Toda porta real precisa de origem e destino válidos. Portas falsas usam destino nulo deliberadamente.
3. Uma porta importante ou de progressão deve conservar uma rota viável apesar das variações por run.
4. Execute \`npm run validate\` após alterar a topologia, fechaduras ou conteúdo referenciado.
`);

console.log('Catálogos atualizados: ROOMS, CHARACTERS, PUZZLES, EVENTS, HOUSE_GRAPH.');
