# Histórico de versões dos perfis de regras

Regras: versões publicadas **nunca são editadas nem apagadas**. Qualquer mudança de valor num perfil embutido exige um novo `version`, o registro aqui e a versão anterior em `history`. Partidas guardam a cópia congelada (`FrozenRules`, com `profileVersion` e `hash`), então continuam reproduzíveis.

Perfis personalizados guardam o próprio histórico (`RuleProfile.history`) a cada "Salvar nova versão".

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
