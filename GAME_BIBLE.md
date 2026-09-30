# A Thousand Doors — direção do jogo

## Promessa

Um roguelike narrativo de exploração por clique ou toque. O jogador acorda na Casa, descobre salas e pessoas, morre ou chega à Porta 1000 e retorna com parte do que aprendeu. O destino pode se repetir; o caminho e a interpretação devem mudar. Cada porta precisa despertar curiosidade, e as primeiras dezenas parecem portas comuns.

## Experiência

- Câmera lateral fixa, sem movimentação por joystick. Frente e trás da sala são superfícies distintas; o botão **VIRAR** altera a perspectiva e pode disparar eventos.
- O ritmo alterna salas vazias, objetos pontuais, conversas curtas e anomalias raras. O terror é sobretudo de expectativa e de memória.
- O mapa mental registra apenas conhecimento do jogador: salas visitadas, portas vistas ou usadas, pistas e marcações. Não revela destinos de portas fechadas.
- O diário registra evidências e rumores sem apresentar uma solução definitiva ao jogador.
- A Sala Zero é o hub entre runs. Fragmentos de Memória compram capacidades discretas, como preservar um item ou entender símbolos.

## Escala atual

A topologia canônica tem 334 salas e 1.000 portas, além da Sala Zero. O conteúdo inclui 18 personagens, 48 enigmas e 97 eventos. Parte das salas é autoral e parte é composta deterministicamente a partir de templates. Os números exatos e as dependências são verificados por `npm run validate` e documentados por `npm run docs`.

## Progressão

1. Salas 1–30: arquitetura doméstica, portas comuns, primeira fotografia impossível.
2. Salas 30–80: pequenas incoerências e relações recorrentes.
3. Salas 80–150: espaço e mapa menos confiáveis.
4. Salas 150–220: falhas de tempo e memória.
5. Salas 220–300: arquitetura impossível, ainda intercalada com salas banais.
6. Salas 300–334: aproximação da antecâmara e da Porta 1000.

Os eixos ocultos de Memória, Casa, Perdidos, Ruptura e Obediência respondem às ações sem anunciar rotas. A conclusão oferece escolhas segundo o conhecimento e as relações construídas.

## Critério de conteúdo

Cada sala nova precisa ter função de ritmo, pista, personagem, escolha, risco ou estranheza. Salas vazias são deliberadas. Portas especiais só funcionam como contraste com as portas banais. Pistas podem contradizer outras pistas; a contradição deve ser intencional e rastreável em `LORE_BIBLE.md`.
