import type { RuleProfile, RuleSet, RuleStatus } from './types';

/**
 * Perfis embutidos. Toda alteração de valor aqui deve incrementar `version`
 * e registrar a versão anterior em `history` (ver docs/regras/CHANGELOG.md).
 */
const CREATED = '2026-11-15T00:00:00.000Z';

const defaultAssists = { highlightPlayable: true, autoScore: true } as const;

const pendingPassBonus = { status: 'pending', enabled: false, points: null } as const;

const baseAllFives = {
  scoringMode: 'full',
  endRounding: 'nearest',
  blockedScoring: 'others-total',
  winImmediately: true,
  passBonus: pendingPassBonus,
} as const;

const basePasseBate = {
  batidaPoints: { simples: 1, carroca: 2, laELoSimples: 3, laELoCarroca: 6 },
  blocked: { winner: 'lowest-individual', points: 1 },
} as const;

export const PASSE_BATE_PB: RuleSet = {
  mode: 'passe-bate',
  players: 4,
  teams: true,
  handSize: 7,
  boneyard: false,
  boneyardReserve: 0,
  opening: 'double-six',
  openWithDouble: false,
  dealMode: 'auto',
  nextRoundStarter: 'round-winner',
  spinner: false,
  targetScore: 6,
  passeBate: { ...basePasseBate, batidaPoints: { ...basePasseBate.batidaPoints }, blocked: { ...basePasseBate.blocked } },
  allFives: { ...baseAllFives },
  assists: { ...defaultAssists },
};

export const ALL_FIVES_STANDARD: RuleSet = {
  mode: 'all-fives',
  players: 2,
  teams: false,
  handSize: 7,
  boneyard: true,
  boneyardReserve: 0,
  opening: 'any',
  openWithDouble: false,
  dealMode: 'auto',
  nextRoundStarter: 'round-winner',
  spinner: true,
  targetScore: 150,
  passeBate: { ...basePasseBate, batidaPoints: { ...basePasseBate.batidaPoints }, blocked: { ...basePasseBate.blocked } },
  allFives: { ...baseAllFives },
  assists: { ...defaultAssists },
};

export const ALL_FIVES_BOA_VISTA: RuleSet = {
  ...ALL_FIVES_STANDARD,
  players: 4,
  teams: true,
  handSize: 7,
  boneyard: false,
  opening: 'double-six',
  allFives: { ...baseAllFives },
  assists: { ...defaultAssists },
};

/** Burrinha (Paraíba), conforme descrição do usuário em 18/11/2026. */
export const BURRINHA_PB: RuleSet = {
  mode: 'burrinha',
  players: 4,
  teams: false,
  handSize: 3,
  boneyard: true,
  boneyardReserve: 0,
  opening: 'any',
  openWithDouble: false,
  dealMode: 'auto',
  nextRoundStarter: 'round-winner',
  spinner: false,
  targetScore: 999,
  passeBate: { ...basePasseBate, batidaPoints: { ...basePasseBate.batidaPoints }, blocked: { ...basePasseBate.blocked } },
  allFives: { ...baseAllFives },
  burrinha: { startTiles: 3, penalty: 1, loser: 'last-remaining' },
  assists: { ...defaultAssists },
};

const passeBateStatus: Record<string, RuleStatus> = {
  players: 'regional',
  teams: 'regional',
  handSize: 'regional',
  boneyard: 'regional',
  opening: 'confirmed',
  openWithDouble: 'confirmed',
  nextRoundStarter: 'confirmed',
  spinner: 'regional',
  targetScore: 'confirmed',
  'passeBate.batidaPoints': 'regional',
  'passeBate.blocked': 'confirmed',
};

export const BUILTIN_PROFILES: readonly RuleProfile[] = [
  {
    id: 'pb-paraiba',
    name: 'Passe e Bate — Paraíba',
    mode: 'passe-bate',
    version: 3,
    builtIn: true,
    description:
      'Dominó tradicional em duplas, sem dorme. Batidas regionais paraibanas: simples 1, carroça 2, lá e lô 3, lá e lô de carroça 6.',
    rules: PASSE_BATE_PB,
    ruleStatus: passeBateStatus,
    history: [],
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: 'pb-paraiba-quadrada-4',
    name: 'Passe e Bate — Quadrada vale 4',
    mode: 'passe-bate',
    version: 3,
    builtIn: true,
    basedOn: 'pb-paraiba',
    description: 'Variação registrada em que a batida quadrada (lá e lô de carroça) vale 4 pontos.',
    rules: {
      ...PASSE_BATE_PB,
      passeBate: { ...PASSE_BATE_PB.passeBate, batidaPoints: { ...PASSE_BATE_PB.passeBate.batidaPoints, laELoCarroca: 4 } },
    },
    ruleStatus: passeBateStatus,
    history: [],
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: 'af-padrao',
    name: 'All Fives — Padrão pesquisado',
    mode: 'all-fives',
    version: 1,
    builtIn: true,
    description:
      'Duplo-seis com dorme. Primeira carroça é o spinner. Pontas somando múltiplo de 5 pontuam o valor integral.',
    rules: ALL_FIVES_STANDARD,
    ruleStatus: {
      players: 'researched',
      teams: 'researched',
      handSize: 'researched',
      boneyard: 'researched',
      boneyardReserve: 'researched',
      opening: 'researched',
      nextRoundStarter: 'researched',
      spinner: 'researched',
      targetScore: 'researched',
      'allFives.scoringMode': 'confirmed',
      'allFives.endRounding': 'researched',
      'allFives.blockedScoring': 'researched',
      'allFives.winImmediately': 'researched',
      'allFives.passBonus': 'pending',
    },
    history: [],
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: 'af-boa-vista',
    name: 'All Fives — Boa Vista',
    mode: 'all-fives',
    version: 2,
    builtIn: true,
    description:
      'Dominó de pontos de Boa Vista-RR: quatro jogadores, sete pedras cada, sem dorme — as 28 pedras são distribuídas.',
    rules: ALL_FIVES_BOA_VISTA,
    ruleStatus: {
      players: 'regional',
      handSize: 'regional',
      boneyard: 'regional',
      teams: 'confirmed',
      opening: 'confirmed',
      nextRoundStarter: 'confirmed',
      spinner: 'confirmed',
      targetScore: 'confirmed',
      'allFives.scoringMode': 'confirmed',
      'allFives.endRounding': 'confirmed',
      'allFives.blockedScoring': 'confirmed',
      'allFives.winImmediately': 'confirmed',
      'allFives.passBonus': 'pending',
    },
    history: [],
    createdAt: CREATED,
    updatedAt: CREATED,
  },
];

export const BURRINHA_PROFILE: RuleProfile = {
  id: 'burrinha-pb',
  name: 'Burrinha — Paraíba',
  mode: 'burrinha',
  version: 1,
  builtIn: true,
  description:
    'Dois ou mais jogadores, três pedras cada. Quem perde a rodada recomeça a próxima com uma pedra a mais, até o dorme acabar.',
  rules: BURRINHA_PB,
  ruleStatus: {
    players: 'confirmed',
    handSize: 'confirmed',
    'burrinha.penalty': 'confirmed',
    'burrinha.loser': 'pending',
    'burrinha.end': 'pending',
    boneyard: 'pending',
    opening: 'pending',
    nextRoundStarter: 'pending',
  },
  history: [],
  createdAt: '2026-11-18T00:00:00.000Z',
  updatedAt: '2026-11-18T00:00:00.000Z',
};

export function findBuiltin(id: string): RuleProfile | undefined {
  return BUILTIN_PROFILES.find((p) => p.id === id);
}

(BUILTIN_PROFILES as RuleProfile[]).push(BURRINHA_PROFILE);

/** Distribuição recomendada pelo padrão pesquisado para All Fives com dorme. */
export function researchedHandSize(players: number): number {
  return players === 2 ? 7 : 5;
}
