# Os primeiros 30 minutos

Fonte da verdade para a primeira sessão. Implementado em `src/systems/OnboardingDirector.ts`
(momentos encenados e dicas), `src/systems/InvestigationSystem.ts` (objetivos) e coberto por
`tests/first-30-minutes.test.ts`, que joga o roteiro inteiro sem interface.

## Princípios

1. **Um motivo antes de um tutorial.** Nos primeiros 60 segundos o jogador precisa de uma pergunta, não de instruções.
2. **Um gancho a cada 1–3 minutos.** Revelação, pessoa, susto, recompensa ou promessa: alternados.
3. **A porta trancada é uma promessa que se cumpre na mesma sessão.** O jogador vive o "eu sei onde isso vai" antes de fechar o jogo.
4. **A primeira morte é uma cena, não um fracasso.** E a Sala Zero mostra, na hora, que nada se perdeu.
5. **Dicas só para quem está parado ou perdido,** sempre na voz do jogo, uma única vez.

## Linha do tempo (jogador típico, primeira exploração)

| Tempo | Onde | Momento | Implementação |
|---|---|---|---|
| 0:00 | tela preta | Respiração; "Você não lembra de ter dormido."; **batidas atrás de você** (áudio direcional) | `playIntro` |
| 0:20 | Sala 1 | Três batidas de novo; o botão VIRAR pulsa | `onEnter r001` → `ui.pulse('turn')` |
| 0:30 | Sala 1, atrás | Um bilhete que "não estava ali", **na sua letra**: você mesmo trancou a porta da direita; a chave está "com quem vende o que não é dele"; "encontre o homem que espera" | prop `bilhete`, lore `bilhete_t0`, `onTurn` |
| 1:00 | Sala 1 | A cadeira mudou de lugar | evento `ev_r001_chair` |
| 1:10 | Sala 1 | Tocar na porta trancada examina a fechadura automaticamente → vira memória no diário e no mapa | `UIController.doorTap` |
| 2:30 | Sala 5 | **Joaquim fala primeiro**: "Você demorou desta vez." Se o jogador leu o bilhete: a chave está com o Mercador; antes, a fotografia ao lado | auto-diálogo + nós `h`/`i` de `sentado_1` |
| 4:00 | Sala 7 | **A fotografia**: você está nela. Verso: "Se você encontrou isto novamente, eu falhei." | já existente |
| 5–10 | Salas 10 → 17 | Primeiro enigma (precisa virar para ler a pista); o Homem Sem Rosto atrás de você | já existente |
| 12:00 | Sala 21 | **O Mercador chegou antes** e fala primeiro; a chave de latão no balcão: "Esta chave parece familiar." O mapa pulsa | auto-diálogo, `onTick` |
| 12:30 | Sala 21 | Atalho de volta que respeita a ficção: ele "não usa portas" e leva você à Sala 1 | nó `volta` do Mercador |
| 13:00 | Sala 1 | **A porta prometida** abre; conquista PROMESSA CUMPRIDA; "Você lembrava desta porta." | `DoorManager.unlock` |
| 14:00 | Sala 37 | Jardim de Inverno: chuva, carta de Helena: **"Teo"** — o jogador ganha um nome | já existente |
| 14:30 | Sala 37 | Fita vermelha na maçaneta: a primeira âncora é um presente | `onEnter r037` |
| 15:00 | Sala 37, atrás | Uma mulher do outro lado do vidro diz um nome | `onTurn r037` |
| 16–21 | salas seguintes | **Algo segue você**: passos (1), atravessando portas (2), respiração e luz piscando (3) | `follower()` |
| ~22 | qualquer sala | Tudo apaga. **Uma mão pequena segura a sua.** Segurar (Memória) ou correr (Ruptura): o primeiro esquecimento | `smallHand()` |
| ~23 | Sala Zero | "Você já esteve aqui. Muitas vezes." Tudo continua; o relicário brilha (≥ 4 fragmentos garantidos); **uma porta nova cheira a chuva** | `onZero()` |
| 25–30 | segunda exploração | Começar pelo Jardim ou pela Sala 1; Joaquim lembra de você; a Casa mudou | sistemas existentes |

## Objetivos (HUD)

`batidas` → `homem` → `prova` / `chave_latao` → `porta_latao` → `helena` / `fotografia`.
Cada objetivo só aparece quando faz sentido na ficção (por exemplo, nunca menciona o bilhete antes de ele ser lido).

## Dicas de resgate (uma vez cada, só se o jogador estiver ocioso)

| Situação | Dica |
|---|---|
| 14 s na Sala 1 sem virar | "Você ainda não olhou para trás." + VIRAR pulsa |
| Leu o bilhete e ficou parado | "A porta da esquerda e a do meio não estão trancadas." |
| ~4 min sem achar Joaquim | "Alguém está esperando por você. Não muito longe do começo." |
| ~100 s sem examinar nada | "Segure o dedo sobre um objeto para olhar de perto." |
| Pegou a chave de latão | "Eu sei onde isso vai." + mapa pulsa |
| Com a chave, longe e parado | Lembra o atalho do Mercador |

## Regras de manutenção

- O diretor só atua enquanto `meta.runCount <= 3`.
- Todo momento é guardado em `meta.flags.ob_*` e acontece uma vez só, mesmo após recarregar a página.
- Ao mudar salas 1–37, rode `npm test`: o teste do roteiro quebra se algum elo da cadeia sumir.
