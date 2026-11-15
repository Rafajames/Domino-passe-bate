# Etapa 1 — Auditoria e pesquisa

## 1. Estado encontrado do repositório

Em 15/11/2026, o repositório `Rafajames/Domino-passe-bate` estava **vazio**: nenhum commit, nenhuma branch, nenhum README e nenhuma documentação (verificado no clone local e pela API do GitHub, que retornou "Git Repository is empty"). Nenhum outro repositório de dominó estava acessível.

Por isso:

- **Não havia código para preservar nem para substituir.** O projeto foi criado do zero com a stack pedida: React, TypeScript, Vite, Zustand, Supabase e Vercel.
- A documentação citada no pedido (vocabulário e batidas regionais paraibanas, perfis de All Fives) **não foi encontrada**. As regras implementadas vêm **do texto do pedido**, que passou a ser a fonte documentada. Tudo o que o pedido não define ficou marcado como **pendente** e configurável. Ver `docs/regras/`.
- Se essa documentação existir em outro lugar, ela deve ser adicionada ao repositório. Os perfis embutidos devem então ser revisados, com um novo número de versão.

## 2. Pesquisa de referências: o que foi efetivamente consultado

O acesso à web desta sessão era limitado. Segue o registro honesto do que foi consultado:

| Referência | O que foi possível acessar | Uso |
|---|---|---|
| Dominoes (Loop Games) | Descrições das lojas e agregadores (appfollow, mwm.ai, marlvel.ai). **Sem acesso às capturas de tela.** | Modos Draw/Block/All Fives; proposta de interface "limpa, sem poluição, estilo madeira" |
| Dominoes Gold (Grey Square Games) | Descrições das capturas reproduzidas pelo mwm.ai. **Imagens não vistas.** | Personalização de pedras, desafios diários, ranking, partidas 1×1 |
| Dominoes Elite, Domino Café, Dominoes L!VE | Apenas listagens nas lojas | Confirmam o padrão de mercado: All Fives, multiplayer e temas |
| Regras de All Fives | Resumos de buscas citando pagat.com, rarepike.com, gamerules.com e mobilityware. **O pagat.com estava bloqueado pela rede da sessão.** | Spinner, múltiplos de 5, dorme, arredondamento e meta (fontes divergem entre 150 e 250 pontos) |
| Dominoes Online, Domino! (mobile) | **Não consultados** (nenhum resultado útil) | — |

**Não foi possível analisar imagens reais das interfaces.** As decisões visuais se baseiam nas descrições acima e em princípios consolidados de interfaces de jogos de mesa digitais. Recomenda-se uma rodada de análise visual com capturas reais, feitas manualmente ou com o `pagat.com`/lojas liberados na rede.

## 3. Soluções que adotamos a partir das referências

- **Mesa em primeiro plano**: o placar fica compacto no topo, sem painéis laterais permanentes no celular, e o histórico abre num painel separado.
- **Pedras realistas e legíveis**: marfim com pontos escuros e pino central de latão. No celular, as pedras da mão ficam em pé e grandes (até 48 px de largura).
- **Vez do jogador**: anel de latão pulsando no avatar e texto de status ("Sua vez — escolha uma pedra").
- **Pontas abertas**: depois de selecionar a pedra, cada ponta válida vira uma "vaga" tracejada com o número da ponta. Basta tocar nela. Com um único destino possível, dois toques na pedra já jogam.
- **Passe e compra**: um balão "Passou"/"Comprou" aparece no assento do jogador.
- **Pontuação**: um "+10" flutua na mesa e o placar pulsa na cor do lado que marcou.
- **Fim de rodada**: painel com o tipo de batida, o placar e as pedras que sobraram em cada mão.
- **Temas de mesa**: feltro, madeira e noite, um item comum nos concorrentes.

## 4. Decisões de arquitetura

1. **Motor puro e determinístico** (`src/engine`): sem React e com RNG por semente. Assim o mesmo código roda no cliente (modo solo), no servidor (Edge Function, no multiplayer) e nos testes, e permite replays.
2. **`PlayerView`** como fronteira de informação: a IA e o futuro cliente online só recebem o que um humano poderia saber.
3. **Regras como dados** (`RuleSet` e `RuleProfile` com status e histórico de versões). As partidas guardam uma cópia congelada (`FrozenRules`) com hash.
4. **Integridade ≠ fiscalização**: o motor sempre garante turnos, propriedade das pedras e encaixe. As assistências (destaque e soma automática) são opcionais. Ver `arquitetura.md`.
