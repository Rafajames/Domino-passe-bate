# Passe & Bate — Dominó

Jogo de dominó digital com **regras regionais configuráveis**, feito para celular primeiro (Android), mas que também funciona em tablet e computador.

- **Passe e Bate** — dominó tradicional com as batidas paraibanas (simples, carroça, lá e lô, lá e lô de carroça).
- **All Fives** — o "dominó de pontos" (perfil padrão pesquisado e perfil de Boa Vista-RR).
- **Burrinha** — três pedras cada; quem perde recomeça com uma a mais, até o dorme acabar (Paraíba).
- **Modo solo** contra bots em quatro níveis (Fácil, Normal, Difícil, Mestre), com dica do Mestre.
- **Passar o celular**: várias pessoas no mesmo aparelho, com as mãos escondidas entre as vezes.
- **Online entre amigos** sem servidor próprio: sala por código ou link, chat e reconexão (P2P).
- **Revisão** do último jogo, jogada por jogada.
- **Perfis de regras** personalizáveis, versionados, compartilháveis por código e **congelados** em cada partida.
- **Modo fiel à mesa**: sem destaques nem soma automática. Quem esquece de marcar os pontos, perde.
- PWA instalável, que funciona offline.

## Como rodar

```bash
npm install
npm run dev        # desenvolvimento
npm test           # testes do motor, da IA, do layout e do rating
npm run typecheck
npm run build      # build de produção (dist/)
npm run bench      # benchmark de força entre os níveis da IA (demorado)
```

O app roda **100% offline**. Os recursos online (Etapa 5) usam o Supabase quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão definidos (veja `.env.example`).

## Estrutura

```
src/
  engine/        Motor de regras em TypeScript puro (sem React)
    rules/       Tipos, perfis embutidos, validação, congelamento
    board.ts     Pontas, spinner, soma das extremidades
    match.ts     Distribuição, turnos, jogar/comprar/passar, fim de rodada
    scoring.ts   Batidas paraibanas e pontuação do All Fives
    view.ts      PlayerView: o que cada jogador pode saber (sem mãos alheias)
  ai/            Bots: inferência, heurísticas, Monte Carlo (Mestre), Web Worker
  net/           Online P2P: protocolo e estado redigido enviado aos convidados
  rating/        Glicko-2 (ranking competitivo; ainda não ligado à interface)
  state/         Stores Zustand (partida, perfis, jogador, navegação, preferências)
  services/      localStorage, código de compartilhamento, Supabase, PWA
  ui/            Design system, componentes, mesa (layout em serpentina), telas
supabase/migrations/   Esquema do banco + RLS (ainda não aplicado)
docs/                  Auditoria, design system, regras, arquitetura e roadmap
```

## Documentação

- [Auditoria e pesquisa de referências](docs/auditoria.md)
- [Design system](docs/design-system.md)
- [Arquitetura](docs/arquitetura.md)
- [Regras — Passe e Bate](docs/regras/passe-e-bate.md) · [All Fives](docs/regras/all-fives.md) · [Burrinha](docs/regras/burrinha.md) · [Histórico de versões](docs/regras/CHANGELOG.md)
- [Roadmap e sugestões](docs/roadmap.md)

## Status

| Etapa | Situação |
|---|---|
| 1. Auditoria e design | ✅ Concluída |
| 2. Interface principal | ✅ Início, modalidades, perfis, editor de regras, configuração e perfil local. Criação de sala online: só a interface, marcada como "em breve" |
| 3. Motor de jogo | ✅ Com testes |
| 4. Modo solo | ✅ 4 níveis de bot (Mestre em segundo plano), dica, revisão, histórico local |
| 5. Multiplayer | 🟡 Passar o celular ✅ · Online entre amigos via P2P ✅ (sem servidor). Falta, quando houver servidor: contas, salas públicas, partida rápida |
| 6. Competição | 🟡 Glicko-2 implementado e testado. Falta: ranking, torneios, temporadas e conquistas na interface |
| 7. Finalização | 🟡 PWA, acessibilidade básica e `vercel.json`. Falta: auditoria completa de acessibilidade e publicação |
