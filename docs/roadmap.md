# Roadmap

## Próximos passos (em ordem)

1. **Validar as regras pendentes** com jogadores da Paraíba e de Boa Vista: saída, jogo trancado, meta, duplas no Boa Vista e definição exata de lá e lô. Depois, publicar v2 dos perfis.
2. **Etapa 5 — Multiplayer**: Auth, Edge Function `match-action`, Realtime, salas, convites, reconexão e chat.
3. **Etapa 6 — Competição**: tabelas de ranking por modalidade/formato/região/temporada, torneios (eliminatória, grupos, finais), conquistas e medalhas.
4. **IA**: Web Worker para o Mestre; ajuste fino com o `npm run bench`.
5. **Modo fiel completo**: marcação manual da batida, jogadas irregulares contestáveis e muggins (opcional).
6. **Acessibilidade**: auditoria com TalkBack, modo de alto contraste das pedras e opção de pontos numéricos nas pedras.

## Sugestões adicionais (valor real, sem inchar o produto)

| Sugestão | Por quê | Esforço |
|---|---|---|
| **Tutorial interativo** (mãos roteiradas com a seed fixa do motor) | Ensina batidas e All Fives jogando; o motor determinístico já permite isso | Baixo |
| **Replay de partidas** (seed + ações) | Revisar a lá e lô da vitória e tirar dúvidas de regra; quase de graça com o motor atual | Baixo |
| **Dica do Mestre** no modo treino | Mostra a jogada que o Mestre faria e por quê; ótimo para evoluir | Baixo |
| **Placar de mesa física** | Usar o app só para marcar os pontos numa partida presencial, com os mesmos perfis de regras. Atende quem joga no bar | Baixo |
| **Espectadores e salas públicas** | Torneios ficam mais vivos; o RLS já prevê salas públicas | Médio |
| **Desafio diário** (mesma seed para todos) | Retenção sem pay-to-win; comparação justa | Médio |
| **Temas de pedras** (cores, pontos numéricos) | Personalização e acessibilidade | Baixo |
| **Sons sutis** (pedra batendo, embaralhar) com opção de desligar | A sensação de mesa real é a alma do produto | Baixo |

Evitar por enquanto: economia de moedas e loja, apostas e qualquer mecânica de dinheiro real.
