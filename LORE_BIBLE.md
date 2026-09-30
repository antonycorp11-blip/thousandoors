# Bíblia narrativa — spoilers de desenvolvimento

Este arquivo descreve a intenção autoral. O jogo deve apresentar documentos, cenas e testemunhas, nunca este resumo.

## Núcleo emocional

Teodoro voltou repetidas vezes à Casa para guardar lembranças de Lia. Helena conhece versões dele que ele próprio esqueceu. A Sala Zero e a Porta 1000 representam modos opostos de lidar com a perda: recomeçar e atravessar. O texto de `src/data/lore.ts` deliberadamente não prova se a Casa é só uma construção, um mecanismo de memória ou algo que já existia antes de seus supostos criadores.

## Contradições que devem permanecer

| Evidência | Contraponto | Intenção |
|---|---|---|
| A escritura de 1911 afirma que sete sócios encomendaram a Casa. | O bilhete de Orlando diz que a encontraram pronta. | O jogador deve duvidar da cronologia e da autoria. |
| O diário de Teodoro diz que desenhou a primeira porta. | Plantas antigas parecem anteceder seus desenhos. | A memória pode registrar uma descoberta como criação. |
| Fotos e cartas dizem que o protagonista já esteve ali. | Ele acorda sem lembrança coerente de ter entrado. | O ciclo de runs tem consequência narrativa. |
| Algumas testemunhas conhecem versões diferentes das mesmas pessoas. | Envelhecimento e posição dos NPCs variam. | A Casa não preserva todos no mesmo tempo. |

## Eixos de investigação

- **Memória:** identidade, Helena, Lia, fotografias e cenas de infância.
- **Casa:** mapas, arquitetura, planta, regras e origem contraditória.
- **Perdidos:** destino dos habitantes e obrigações para com eles.
- **Ruptura:** costuras, máquinas, portas falsas e possibilidade de quebrar o ciclo.
- **Obediência:** instruções da Casa e o papel de guardião.

As cinco leituras podem ser simultaneamente plausíveis. Os epílogos em `GameManager.epilogue` são resoluções emocionais condicionadas ao caminho, sem transformar todos os documentos anteriores em uma explicação única.

## Gancho inicial

A fotografia antiga (`foto_casa`) mostra o protagonista entre sete pessoas. Seu verso diz: “Se você encontrou isto novamente, eu falhei.” Ela precisa aparecer cedo em uma exploração normal. A pista muda a pergunta do jogador de “onde estou?” para “por que já estive aqui?”.
