# Histórico de versões dos perfis de regras

Regras: versões publicadas **nunca são editadas nem apagadas**. Qualquer mudança de valor num perfil embutido exige um novo `version`, o registro aqui e a versão anterior em `history`. Partidas guardam a cópia congelada (`FrozenRules`, com `profileVersion` e `hash`), então continuam reproduzíveis.

Perfis personalizados guardam o próprio histórico (`RuleProfile.history`) a cada "Salvar nova versão".

## 2026-11-15 — v1 (criação)

- `pb-paraiba` v1: batidas 1/2/3/6; trancado pela menor mão individual vale 1 (pendente); meta 6 (pendente).
- `pb-paraiba-quadrada-4` v1: lá e lô de carroça vale 4.
- `af-padrao` v1: 2 jogadores × 7, dorme, spinner, pontuação integral, meta 150.
- `af-boa-vista` v1: 4 × 7, sem dorme; pontuação por passe pendente e desativada.
