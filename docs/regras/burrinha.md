# Burrinha — regras

> Fonte: descrição do usuário em 18/11/2026 (Paraíba). A pesquisa não encontrou fonte publicada que descreva este jogo; em outros lugares "burrinho" aparece com outro sentido (pedra que não encaixa em nenhuma ponta) ou como jogo de cartas. Por isso, o que a descrição não define está marcado como **pendente** e é configurável.

> Vocabulário: na Paraíba, "dorme" também designa as pedras fora do jogo. No app, **dorme** = pedras para compra; **cemitério** = pedras fora do jogo.

## Descrição do usuário

> "Dois ou mais jogadores podem participar e cada um começa com três peças; o último a perder, na próxima rodada, recomeça com mais uma pedra, e assim até acabar o dorme."

## Perfil "Burrinha — Paraíba" (`burrinha-pb`, v1)

| Regra | Valor | Status |
|---|---|---|
| Jogadores | 2 a 4 (escolha na nova partida) | Confirmada |
| Pedras iniciais | 3 cada | Confirmada |
| Castigo | Quem perde a rodada recomeça a próxima com **+1 pedra** (acumula) | Confirmada |
| Quem perde a rodada | Quem bate sai; o jogo continua; **perde o último que ficar com pedras** | **Pendente** (interpretação de "o último") |
| Jogo trancado | Perde quem tiver mais pontos na mão; empate: todos os empatados | **Pendente** |
| Compra | Sem jogada, compra do dorme | **Pendente** |
| Saída | 1ª rodada sorteada; depois, quem bateu primeiro | **Pendente** |
| Fim da partida | Quando, depois do castigo, as mãos somadas não deixariam pedras no dorme. Quem levou mais castigos é **a burrinha** | **Pendente** |

Alternativa configurável no editor: **"Mais pontos na mão"**: a rodada acaba na primeira batida e perde quem tiver mais pontos.

## Implementação

- `src/engine/burrinha.ts` e `src/engine/match.ts`: mãos de tamanhos diferentes por jogador, a vez pula quem já bateu, o perdedor é definido no fim da rodada e o fim da partida acontece quando o dorme acabaria.
- Testes: `src/engine/__tests__/burrinha.test.ts`.
