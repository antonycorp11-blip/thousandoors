# Arquitetura

## Fluxo de execução

`src/main.ts` carrega o save, inicializa Phaser e a interface HTML. `GameManager` coordena o estado e os sistemas. `RoomScene` desenha a sala em câmera fixa; `UIController` apresenta menus, diálogo, mapa, diário, inventário e enigmas. Ambos implementam portas de interface do `GameManager`, permitindo simulação sem navegador por `HEADLESS_UI`.

Uma travessia passa por `DoorManager` (visibilidade, fechadura, destino), `GameManager.openDoor` (efeitos e animação), `GameManager.enterRoom` (visita, NPCs, eventos, diário e save), `RoomManager.view` (composição de cada lado) e `RoomScene.showRoom` (renderização). `EventSystem` escuta gatilhos `runStart`, `enter`, `firstEnter`, `exit`, `turn`, `tick`, `doorOpen`, `death`, `pickup`, `unlock`, `listen`, `knock`, `peek` e `lockedTry`.

## Fonte dos dados

- `src/core/types.ts`: contratos de sala, porta, item, condição, efeito, personagem, puzzle, evento e save.
- `src/data/rooms/authored*.ts`: salas narrativas escritas à mão.
- `src/data/rooms/templates.ts` e `src/world/HouseGenerator.ts`: preenchimento determinístico da Casa.
- `src/data/{keys,items,characters,dialogues,puzzles,events,lore}.ts`: conteúdo e regras.
- `src/world/HouseGraph.ts`: consultas de grafo e validação de referências, alcance e contagens.
- `src/render/paint/*`: desenho modular de portas, objetos, figuras e ambientes.

## Estado e persistência

`MetaState` guarda o conhecimento entre runs: mapa, diário, salas vistas, portas, NPCs, fragmentos, melhorias e finais. `RunState` guarda HP, inventário, caminho, flags temporárias e mudanças de porta ou objeto. `RoomVisitState` guarda o lado observado, giros, tempo, eventos de uma visita e alterações locais. Um retrato serializável da visita ativa é salvo em `run.roomVisit` para restaurar a sala após recarga.

`SaveManager` usa IndexedDB e localStorage como cópia de reserva, com migração de esquema. Ao criar campos novos, acrescente defaults em `src/core/state.ts`, trate saves antigos em `SaveManager.migrate` e teste uma recarga. IDs já publicados devem permanecer estáveis.

## Ferramentas

`npm run dev` abre o jogo localmente. `npm run build` verifica tipos e gera produção. `npm test` executa testes de fluxo. `npm run validate` confere o grafo e referências. `npm run docs` atualiza os catálogos de conteúdo. `?debug=1&room=5` abre uma sala diretamente para inspeção; o painel de debug permite deslocamento, flags, itens, NPCs, enigmas e edição local.
