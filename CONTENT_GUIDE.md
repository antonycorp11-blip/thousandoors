# Guia de conteúdo

## Inserção de sala

Para um momento narrativo específico, adicione uma sala autoral em `src/data/rooms/authored1.ts` ou `authored2.ts`. Use um ID canônico `rNNN`, título curto, categoria, região, tema, frente e trás. Dê aos objetos posição visível e texto de observação específico. Um objeto clicável precisa de efeito real; uma pista pode registrar `lore`, `clue`, `journal` ou `mapNote`.

Salas geradas usam os templates de `src/data/rooms/templates.ts`. Ajuste pesos com cuidado: o vazio faz parte do ritmo. Alterações de topologia pertencem a `HouseGenerator.ts`; depois execute `npm run validate` e confira os caminhos até `r333` e `r334`.

## Portas e chaves

As portas têm origem, lado, destino, comportamento, aparência e, opcionalmente, fechadura. A numeração interna é única. Uma porta falsa tem destino nulo. Uma porta escondida precisa de indício e de um caminho de revelação. Uma fechadura deve aceitar ao menos um método alcançável: chave, puzzle, NPC, ferramenta, força, flag ou abertura pelo outro lado. Não exponha o destino de uma porta trancada no mapa mental.

Nas primeiras regiões, prefira madeira, tinta gasta, metal simples e maçanetas discretas. Material raro, escala anormal e luz sob a porta devem anunciar um acontecimento relevante. A mesma chave pode abrir mais de uma fechadura, mas sua descrição deve sustentar a regra.

## Eventos e enigmas

Eventos ficam em `src/data/events.ts`. Combine gatilho, condições, frequência e efeitos. Use `once: 'visit'`, `'run'` ou `'forever'` conforme a consequência. Eventos de susto precisam de espaço entre si. Para eventos de giro, use `trigger: 'turn'` e condições de `facing`, `turnsHere`, itens, NPCs ou flags.

Enigmas ficam em `src/data/puzzles.ts`. Toda solução deve ter pistas alcançáveis registradas no diário ou na sala; um enigma entre runs precisa ter sua dependência indicada em `clues`. O resultado deve alterar algo no mundo ou no entendimento do jogador. Evite respostas que dependam somente de tentativa e erro.

## Narrativa e verificação

Diálogos devem ser curtos, com escolhas que alterem relação ou estado sem exibir números. Rumores permanecem rotulados como rumores. Registre contradições deliberadas no lore e não resolva o mistério no texto do diário. Após criar conteúdo, rode `npm run docs`, `npm run validate`, `npm test` e inspecione a sala pelo atalho de debug.
