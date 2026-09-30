# Grafo da Casa

Catálogo gerado por `npm run docs`. Uma porta é uma entidade numerada internamente; o vínculo de retorno depende de `bidirectional`. Portas instáveis e observadoras têm destinos condicionais adicionais. A Sala Zero não conta entre as 334 salas canônicas, e suas portas de meta progressão não contam entre as 1.000.

## Validação

| Medida | Valor |
|---|---:|
| Salas canônicas | 334 |
| Portas numeradas | 1000 |
| Fechaduras | 46 |
| Chaves | 46 |
| Salas inacessíveis no grafo completo | 0 |
| Portas órfãs | 0 |
| Salas sem retorno | 0 |
| Entradas na antecâmara | 11 |
| Rotas mínimas até o final | 6 |
| Erros | 0 |
| Avisos | 0 |

Uma rota estrutural mínima, admitindo fechaduras e passagens escondidas: r001 → r037 → r092 → r121 → r110 → r150 → r280 → r312 → r319 → r333 → r334. Isso verifica o grafo, não significa que uma run nova já possui todas as chaves e pistas necessárias.

## Regras de edição

1. Preserve os IDs estáveis de salas, portas e itens já salvos.
2. Toda porta real precisa de origem e destino válidos. Portas falsas usam destino nulo deliberadamente.
3. Uma porta importante ou de progressão deve conservar uma rota viável apesar das variações por run.
4. Execute `npm run validate` após alterar a topologia, fechaduras ou conteúdo referenciado.
