# Arquitetura

## Camadas

```
ui/ (React)  ──▶  state/ (Zustand)  ──▶  engine/ (TS puro)  ◀──  ai/ (só PlayerView)
                       │                      ▲
                       ▼                      │ mesmo código
                 services/ (storage, Supabase, PWA)   supabase/functions (Etapa 5)
```

- **engine/** não importa nada de React, DOM ou rede. Funções puras e imutáveis: `createMatch`, `applyAction`, `legalMoves`, `startNextRound`, `playerView`.
- **Determinismo**: a distribuição deriva de `seed + índice da rodada` (mulberry32). Um replay é `seed + lista de ações`.
- **ai/** recebe só a `PlayerView`, nunca o `MatchState`. A inferência (`buildKnowledge`) usa a mão própria, as pedras na mesa e o histórico público. Valores ausentes são deduzidos de passes e compras.
- **state/gameStore** orquestra a partida solo: aplica as ações, agenda os bots com um ritmo legível (0,5–1,4 s), persiste a partida em andamento (retoma após recarregar) e registra o resultado local.

## IA

| Nível | Estratégia |
|---|---|
| Fácil | Pedra válida aleatória. Esquece de marcar pontos 35 % das vezes no modo fiel |
| Normal | Livra-se de pedras pesadas e carroças; prioriza pontos imediatos (All Fives) |
| Difícil | Normal + controle de naipes, diversidade da mão, bloqueio do próximo adversário (pela probabilidade de ele ter cada valor), ajuda ao parceiro e risco de entregar pontos (All Fives) |
| Mestre | Monte Carlo com determinização: sorteia mundos coerentes com o que é público (quantidade de pedras e valores ausentes) e simula cada jogada até o fim da mão. No All Fives, soma a avaliação do Difícil. Orçamento de 120 ms por jogada |

Benchmark (`npm run bench`, 25 ms por jogada, alternando quem começa):

- Normal vence o Fácil em 18/20 (All Fives) e 11/20 (Passe e Bate).
- Difícil vence o Normal em 12/20 e 15/20.
- Mestre vence o Difícil em 23/40 e 25/40.

Os números mostram ganho real a cada nível. Na Passe e Bate, o acaso da distribuição pesa muito em amostras pequenas.

Próximo passo: mover o Mestre para um Web Worker e aumentar o orçamento sem travar a interface.

## Integridade técnica × modo fiel

São coisas diferentes:

- **Integridade (sempre)**: turno, propriedade das pedras, distribuição, mãos ocultas, estado e resultado. No multiplayer, o servidor é a única fonte de verdade.
- **Fiscalização das regras presenciais (opcional)**: `assists.highlightPlayable` e `assists.autoScore`. No modo fiel, ninguém destaca jogadas nem soma pontos por você.
- **Ainda não implementado**: aceitar jogadas irregulares (pedra que não encaixa, passe falso) para que os outros possam contestar ou deixar passar, como na mesa. O desenho previsto é uma ação `irregular-play`, registrada e visível, com uma janela de contestação para os adversários. Precisa ser validado com os jogadores antes, porque mexe na integridade do placar.

## Online entre amigos (implementado, sem servidor próprio)

O usuário não tinha banco de dados disponível, então o online atual é **P2P**:

- O aparelho de quem cria a sala (**anfitrião**) roda o motor e é a única fonte da verdade (`src/state/onlineStore.ts`).
- Convidados se conectam direto ao anfitrião (WebRTC via PeerJS). O servidor público do PeerJS só apresenta os aparelhos e não guarda nada.
- A cada mudança, o anfitrião envia a cada convidado um **estado redigido** (`src/net/redact.ts`): mãos alheias, dorme e cemitério viram pedras viradas, e as compras dos outros não mostram a pedra. Há teste garantindo isso.
- O convidado envia ações; o anfitrião valida com `applyAction`. Ações inválidas voltam como erro.
- **Reconexão**: o convidado guarda um `clientId`. Ao voltar, o anfitrião devolve o mesmo lugar e o estado atual. Se alguém não volta, o anfitrião pode colocar um bot no lugar.
- **Limites**:
  - o anfitrião precisa manter o app aberto;
  - em tese, ele poderia inspecionar as mãos com ferramentas técnicas;
  - algumas redes móveis bloqueiam WebRTC sem um servidor TURN.
  - Por isso, essas partidas **não contam para ranking**.
- Quando houver servidor, o mesmo protocolo pode trocar o anfitrião P2P por uma função de servidor (ver abaixo).

## Multiplayer com servidor (futuro): desenho

1. **Autenticação**: Supabase Auth (link mágico por e-mail e Google), com perfil em `profiles`.
2. **Salas**: `rooms` com código de 6 caracteres e link de convite. Antes de aceitar, o convidado vê o `RuleSummary` do perfil e da versão escolhidos.
3. **Servidor autoritativo**: uma Edge Function `match-action` recebe `{matchId, action}` do usuário autenticado. Ela carrega `match_secrets.state`, roda `applyAction` (o mesmo motor), grava o novo estado e anexa eventos redigidos em `match_events`.
4. **Sincronização**: Supabase Realtime transmite `match_events`. Cada cliente pede à função a sua `PlayerView` (nunca o estado completo).
5. **Reconexão**: o cliente busca a `PlayerView` atual e os eventos a partir do último `seq`. Bots podem assumir o lugar de quem caiu, após um tempo configurável.
6. **Chat/emojis**: tabela `chat_messages` com Realtime e mensagens rápidas pré-definidas.
7. **Regras congeladas**: `matches.frozen_rules` e `rules_hash` são gravados ao iniciar.

O esquema e o RLS estão em `supabase/migrations/20261115000000_init.sql` (**ainda não aplicado**). `match_secrets` tem RLS sem políticas: só a `service_role` acessa.

## Ranking (Etapa 6)

- **Glicko-2** (`src/rating/glicko2.ts`, validado contra o exemplo do artigo de Glickman). Foi escolhido em vez de Elo porque modela a incerteza (RD), o que é útil para jogadores novos e temporadas.
- Ratings separados por modalidade × formato (individual/duplas) × temporada (ou geral).
- `affectsRating(kind, allHumans)` é a barreira explícita: **bots e partidas casuais nunca alteram o rating**.
- Duplas: cada jogador é avaliado contra o rating médio da dupla adversária (`teamRating`).
