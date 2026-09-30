# A Thousand Doors

Jogo narrativo de exploração para navegador, feito com Phaser, TypeScript e Vite. A Casa possui 334 salas canônicas, 1.000 portas, encontros, enigmas, eventos de perspectiva e progressão entre explorações.

## Rodar localmente

Requer Node.js 20 ou superior.

```bash
npm ci
npm run dev
```

Abra o endereço local exibido pelo Vite. No celular, use a orientação horizontal.

## Verificar

```bash
npm test
npm run validate
npm run build
```

`npm run docs` atualiza os catálogos de salas, personagens, enigmas, eventos e grafo a partir dos dados do jogo.

## Publicar no Cloudflare Workers

O build gera um site estático em `dist/`. A configuração em `wrangler.jsonc` aponta o Wrangler para esse diretório, sem precisar do plugin de Vite da Cloudflare. No Cloudflare Builds, use `npm run build` como comando de build e `npx wrangler deploy` como comando de deploy. Para publicar localmente com uma sessão autenticada, use `npm run deploy`.

## Estrutura

- `src/core`: estado, salvamento e coordenação do jogo.
- `src/world`: geração, validação e navegação da Casa.
- `src/data`: conteúdo narrativo e definições.
- `src/systems`: inventário, NPCs, eventos, enigmas, mapa e progressão.
- `src/render` e `src/scenes`: arte procedural e cena Phaser.
- `src/ui`: interface HTML, diário, mapa mental e menus.
- `scripts` e `tests`: ferramentas de validação e testes.

A direção de jogo está em [GAME_BIBLE.md](GAME_BIBLE.md). Consulte [ARCHITECTURE.md](ARCHITECTURE.md) para o fluxo técnico e [CONTENT_GUIDE.md](CONTENT_GUIDE.md) antes de adicionar salas ou portas.

No modo de desenvolvimento, `?debug=1&room=5` abre uma sala diretamente para inspeção.
