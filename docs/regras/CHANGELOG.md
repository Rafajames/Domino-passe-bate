# Histórico de versões dos perfis de regras

Regras: versões publicadas **nunca são editadas nem apagadas**. Qualquer mudança de valor num perfil embutido exige um novo `version`, o registro aqui e a versão anterior em `history`. Partidas guardam a cópia congelada (`FrozenRules`, com `profileVersion` e `hash`), então continuam reproduzíveis.

Perfis personalizados guardam o próprio histórico (`RuleProfile.history`) a cada "Salvar nova versão".

## 2026-11-23 — v5: rodada das quatro carroças vale o dobro

- `pb-paraiba` e `pb-paraiba-quadrada-4` → v5.
- Depois de embaralhar por **quatro carroças**, a rodada redistribuída **vale o dobro** (batida e jogo trancado).
  É a versão mais registrada (Wikipédia em português e regulamentos de torneio, ex. Fenafisco). O costume de **+1 ponto** fica como opção no editor.
- Nomes dos perfis embutidos deixam de citar lugares: "Passe e Bate — Clássico", "De 5 em 5 — Com dorme", "De 5 em 5 — Em duplas", "Burrinha — Clássica". Os ids continuam os mesmos para não quebrar perfis e partidas salvos.
- "All Fives" passa a aparecer como **De 5 em 5** no jogo.

## 2026-11-20 — v4: regra das carroças

- `pb-paraiba` e `pb-paraiba-quadrada-4` → v4.
- **Quatro carroças** na mão ao distribuir: embaralha e distribui de novo.
- **Cinco ou mais carroças**: o jogador ganha a partida na hora (em duplas, a dupla).
- Regra informada pelo usuário; confirmada. As duas partes podem ser ligadas e desligadas no editor (padrão desligado nas outras modalidades).

## 2026-11-18 — regras confirmadas pelo usuário (sem mudança de valores)

- `pb-paraiba` e `pb-paraiba-quadrada-4` → v3; `af-boa-vista` → v2.
- O usuário mandou **manter como está** as regras que estavam pendentes. Elas passam a **confirmadas**:
  - Passe e Bate: saída, saída das rodadas seguintes, jogo trancado, meta e "sair só de carroça" (sem carroça, sai o próximo da roda que tiver).
  - Boa Vista: duplas, saída, spinner, meta, arredondamento, mão trancada e vencer ao atingir a meta.
- **Continua pendente e desativada**: a pontuação por passe provocado (Boa Vista).

## 2026-11-15 — v2: definição de lá e lô corrigida

- `pb-paraiba` e `pb-paraiba-quadrada-4` passam para a v2. Valores de pontos inalterados.
- **Lá e lô** passa a exigir que cada ponta corresponda a um lado diferente da pedra (pontas 4 e 2 com a 4|2).
- Na v1, pontas iguais com pedra simples (3 e 3 com a 3|5) contavam como lá e lô. Isso estava errado; agora é batida simples. Correção confirmada pelo usuário.
- A lá e lô de carroça não muda.

## 2026-11-15 — v1 (criação)

- `pb-paraiba` v1: batidas 1/2/3/6; trancado pela menor mão individual vale 1 (pendente); meta 6 (pendente).
- `pb-paraiba-quadrada-4` v1: lá e lô de carroça vale 4.
- `af-padrao` v1: 2 jogadores × 7, dorme, spinner, pontuação integral, meta 150.
- `af-boa-vista` v1: 4 × 7, sem dorme; pontuação por passe pendente e desativada.
