# All Fives — regras

Também chamado de *Muggins* ou *Five Up* (variante com todas as carroças como spinner). Em Boa Vista-RR, é conhecido como **dominó de pontos**.

## Mecânica comum (implementada)

- Conjunto duplo-seis (28 pedras).
- Depois de cada jogada, somam-se as **extremidades abertas**. Se a soma for múltiplo de 5, quem jogou marca:
  - **integral** (padrão): 15 vale 15;
  - **dividido** (opção): 15 vale 3.
- A **carroça exposta numa ponta conta as duas metades**.
- A **pedra inicial sozinha** conta inteira (a 5|5 de abertura vale 10).
- **Spinner**: a primeira carroça jogada abre para os quatro lados. Os lados de cima e de baixo só abrem depois que os dois lados principais forem jogados. Lados do spinner ainda vazios não contam na soma.
- **Fim da mão por batida**: quem bate marca a soma das pedras dos adversários (em duplas, a mão do parceiro não conta), arredondada ao múltiplo de 5.
- **Mão trancada**: o lado com a menor soma marca o total dos outros (ou a diferença, como opção). Empate: ninguém marca.
- **Modo fiel**: sem soma automática, o jogador precisa marcar o valor exato antes do próximo jogar. Errou ou esqueceu, perdeu os pontos. A regra de muggins (o adversário tomar os pontos esquecidos) **não** foi implementada; está pendente.

## Perfil "All Fives — Padrão pesquisado" (`af-padrao`, v1)

| Regra | Valor | Status |
|---|---|---|
| Jogadores | 2, individuais (aceita 3–4) | Pesquisada |
| Distribuição | 7 pedras com 2 jogadores; 5 com 3–4 (ajustado ao mudar o número de jogadores) | Pesquisada |
| Dorme | Sim: sem jogada, compra até conseguir jogar. Reserva 0 | Pesquisada |
| Saída | Jogador sorteado sai com qualquer pedra. Depois, quem venceu a mão | Pesquisada |
| Spinner | Primeira carroça | Pesquisada |
| Pontas | Valor integral | Confirmada (pedido) |
| Arredondamento | Ao 5 mais próximo | Pesquisada |
| Meta | 150 (as fontes variam entre 150 e 250), configurável | Pesquisada |
| Vence ao atingir a meta | Sim, mesmo no meio da mão | Pesquisada |

## Perfil "All Fives — Boa Vista" (`af-boa-vista`, v2)

| Regra | Valor | Status |
|---|---|---|
| Jogadores | 4 | Regional |
| Distribuição | 7 cada, sem dorme. As 28 pedras são distribuídas | Regional |
| Duplas | Sim | Confirmada |
| Saída | Carroça de seis | Confirmada |
| Spinner, meta, arredondamento, mão trancada | Iguais ao padrão | Confirmada |
| **Pontuação por passe provocado** | **Desativada e bloqueada** | **Pendente** |

### Regra relatada e pendente: pontuação por passe

> Quando um jogador faz uma jogada e o próximo não consegue jogar, quem provocou o passe recebe pontos.

O valor e a aplicação exata estão **em revisão**. Situação no código:

- Está modelada em `RuleSet.allFives.passBonus` com o tipo literal `{ status: 'pending', enabled: false, points: null }`. O tipo não permite ativá-la.
- `validateRules` rejeita qualquer perfil que tente ativá-la.
- Códigos de compartilhamento importados são saneados e a desativam à força.
- No editor, aparece com cadeado e o selo "Pendente".
- O motor tem um comentário marcando onde ela entraria (`match.ts`, ação `pass`), sem nenhuma lógica.
