# Design system — "Mesa de bar, acabamento de estúdio"

## Identidade

A ideia é a sensação de uma mesa de dominó de verdade (feltro, borda de madeira, pedras de marfim) com o acabamento de um jogo digital moderno: base escura e quente, um único acento metálico (latão) e tipografia com personalidade.

- **Nome**: Passe & Bate. O "&" em itálico, na cor latão, é a assinatura visual.
- **Tom**: adulto, caloroso e regional, sem ser infantil. Os nomes dos bots ("Zé da Praça", "Dona Céu", "Biu") reforçam a mesa de praça.

## Tokens (`src/ui/styles/tokens.css`)

| Grupo | Tokens principais |
|---|---|
| Superfícies | `--bg #0c1412`, `--surface`, `--surface-2/3`, `--line` |
| Texto | `--text #f3efe6`, `--text-2`, `--text-muted` (contraste ≥ 4.5:1 sobre `--bg`) |
| Mesa | `--felt`, `--felt-deep`, `--felt-light`, `--rail` (madeira) |
| Pedras | `--ivory`, `--ivory-shade`, `--pip`, `--pin` (latão) |
| Acento | `--brass #e2b45c` (vez, ação primária, seleção) |
| Lados | `--team-a` terracota, `--team-b` azul. Jogo individual: `--team-c`, `--team-d` |
| Status de regra | confirmada (verde), regional (azul), pesquisada (lilás), pendente (âmbar) |
| Tipografia | Fraunces (títulos e números do placar), Manrope (interface). Ambas auto-hospedadas, para funcionar offline |
| Espaço | escala de 4 px (`--sp-1`…`--sp-10`); alvos de toque ≥ 44 px (`--touch`) |
| Movimento | `--dur-fast/med/slow` e `--ease-spring`. Viram ~0 com `prefers-reduced-motion` ou com a preferência do app |

Os temas de mesa (`[data-table='madeira'|'noite']`) mudam só os tokens da mesa.

## Componentes

- **Tile** (`TileShape`/`TileSvg`/`TileBack`): SVG em "unidades" (1 = lado menor). Tem borda inferior que simula espessura, gradiente de marfim, divisória e pino. Os pontos giram junto com a pedra.
- **BoardView**: layout em serpentina (`ui/board/layout.ts`, puro e testado). Carroças ficam atravessadas e os braços do spinner são verticais. Em caso de colisão, os limites se expandem e a mesa encolhe ou ganha rolagem. A escala se ajusta à tela entre 15 e 44 px por unidade, com zoom manual.
- **HandRack**: pedras em pé, com tamanho calculado pela largura (e pela altura no celular deitado). Estados: jogável (borda de latão), selecionada (levantada e brilhando) e sem encaixe (esmaecida, só com assistência ligada).
- **Seat**: chip com avatar, anel na cor da dupla, contagem de pedras, nível do bot e balão de passe/compra. Assentos laterais ficam compactos (verticais) no celular.
- **Scoreboard**: pílulas por lado mais a meta e a rodada.
- **Sheet**: painel modal que sobe de baixo (lateral no desktop para o histórico), com foco gerenciado e Esc para fechar.
- Controles de formulário: `Segmented`, `Switch`, `Stepper`, `RuleRow`, `StatusBadge`, `RuleSummary`.

## Layouts

**Celular, retrato (prioritário)**

```
┌ menu · placar · histórico ┐
│ ┌──── parceiro/adv. ────┐ │
│ │adv│    MESA     │adv  │ │   assentos laterais compactos (64 px)
│ └───────────────────────┘ │
│ status da vez · Comprar/Passar
│ [marcação manual — modo fiel]
│  ▯ ▯ ▯ ▯ ▯ ▯ ▯  (mão)      │
└───────────────────────────┘
```

**Celular, paisagem**: a mão diminui (≤ 7,5 % da altura) e os versos das pedras do adversário somem, para a mesa ganhar altura.
**Tablet/desktop (≥ 760 px)**: assentos laterais horizontais de 170 px. Mão e barra de status ficam limitadas a 900 px de largura, e o histórico abre na lateral.

## O que evitamos (pedido do produto)

Cara de dashboard, excesso de cards (só dois na escolha de modalidade), botões gigantes sem motivo, gradientes chamativos, visual infantil, enfeites sobre a mesa e texto pequeno demais (mínimo de 11 px em metadados e 14 px no corpo).

## Acessibilidade

- Todos os controles têm rótulo. As pedras anunciam "Pedra 6 e 4, jogável".
- As vagas da mesa são focáveis pelo teclado (Enter/Espaço).
- Uma região `aria-live` anuncia cada jogada ("Biu jogou a carroça de 6 na ponta direita").
- Foco visível em latão, alvos de toque ≥ 44 px e opção de reduzir animações.
- Pendente: auditoria WCAG completa com leitor de tela real (TalkBack).
