# Passe e Bate — regras

> Fonte: texto do pedido do produto (15/11/2026). A documentação regional paraibana citada no pedido não estava no repositório (ver `../auditoria.md`). **Estes valores são regionais, não universais.**

## Legenda de status

- **Confirmada**: definida para o perfil.
- **Regional**: variação regional registrada.
- **Pesquisada**: padrão encontrado em fontes públicas.
- **Pendente**: em revisão. Ou tem valor provisório configurável, ou fica desativada.

## Perfil "Passe e Bate — Paraíba" (`pb-paraiba`, v1)

| Regra | Valor | Status |
|---|---|---|
| Jogadores | 4, em duplas (parceiros frente a frente) | Regional |
| Distribuição | 7 pedras cada, sem dorme (as 28 pedras são distribuídas) | Regional |
| Sem jogada | Passa a vez | Regional |
| Saída da 1ª rodada | Quem tem a carroça de seis sai com ela | **Pendente** |
| Saída das seguintes | Quem venceu a rodada, com qualquer pedra | **Pendente** |
| Batida simples | 1 | Regional (referência registrada) |
| Batida de carroça | 2 | Regional |
| Lá e lô com pedra simples | 3 | Regional |
| Lá e lô de carroça (quadrada/cruzada) | 6 | Regional |
| Jogo trancado | Menor mão individual vence e leva 1 ponto. Empate entre duplas: ninguém pontua | **Pendente** |
| Meta da partida | 6 pontos | **Pendente (valor provisório)** |

### Variação "Quadrada vale 4" (`pb-paraiba-quadrada-4`, v1)

É igual ao perfil acima, mas a lá e lô de carroça vale **4**.

## Definições implementadas (premissas a confirmar)

- **Lá e lô**: a última pedra *serve nas duas pontas abertas*, ou seja, poderia ser jogada de qualquer lado. Exemplo: pontas 4 e 2 com a pedra 4|2, ou pontas 3 e 3 com a pedra 3|5.
- **Lá e lô de carroça**: lá e lô feita com uma carroça. Só acontece com as duas pontas iguais ao valor da carroça.
- **Prioridade**: lá e lô de carroça > lá e lô > carroça > simples.
- **Jogo trancado**: detectado quando todos os jogadores passam em sequência.

Se alguma dessas definições divergir do uso paraibano, ajuste em `src/engine/scoring.ts` (`classifyBatida`), crie uma nova versão do perfil e registre em `CHANGELOG.md`.

## Ainda não implementado

- Marcação manual da batida (no modo fiel, a batida ainda é registrada automaticamente).
- Aceitar jogadas irregulares que passaram despercebidas (passe falso, pedra que não encaixa). O motor ainda recusa essas jogadas. Ver `../arquitetura.md` (modo fiel).
- Vocabulário regional adicional (galo, buchuda etc.), que depende da documentação original.
