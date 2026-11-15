/**
 * Modelo de regras configuráveis.
 *
 * Cada perfil carrega um RuleSet completo. Ao iniciar uma partida, o RuleSet é
 * copiado e congelado (FrozenRules) — mudanças posteriores no perfil não afetam
 * partidas em andamento.
 */
export type GameMode = 'passe-bate' | 'all-fives';

/** Origem/confiabilidade de uma regra. Nunca tratar regionais como universais. */
export type RuleStatus =
  | 'confirmed' // confirmada para o perfil
  | 'regional' // variação regional registrada
  | 'researched' // padrão pesquisado em fontes públicas
  | 'pending'; // em revisão — mantida desativada / provisória

export type OpeningRule =
  | 'double-six' // quem tem a carroça de seis abre com ela
  | 'highest-double' // quem tem a maior carroça abre com ela
  | 'any'; // primeiro jogador (sorteado) abre com qualquer pedra

export type NextRoundStarter = 'round-winner' | 'next-seat';

/**
 * Como as mãos são formadas:
 * - 'auto': o jogo embaralha e distribui;
 * - 'pick': as pedras ficam viradas na mesa; cada jogador embaralha e escolhe as suas.
 */
export type DealMode = 'auto' | 'pick';

export interface BatidaPoints {
  simples: number;
  carroca: number;
  laELoSimples: number;
  /** Lá e lô de carroça (quadrada/cruzada). Variação configurável 6 ou 4. */
  laELoCarroca: number;
}

export interface PasseBateRules {
  batidaPoints: BatidaPoints;
  /** Jogo trancado (ninguém consegue jogar). Regra PENDENTE de confirmação regional. */
  blocked: {
    winner: 'lowest-individual' | 'lowest-team' | 'none';
    points: number;
  };
}

export interface AllFivesRules {
  /** 'full': múltiplo de 5 vale o valor integral (15 = 15). 'divided': 15 = 3. */
  scoringMode: 'full' | 'divided';
  /** Arredondamento das pedras restantes no fim da mão. */
  endRounding: 'nearest' | 'down';
  /** Pontuação da mão trancada. */
  blockedScoring: 'others-total' | 'difference';
  /** Encerrar a partida assim que alguém atingir a meta, mesmo no meio da mão. */
  winImmediately: boolean;
  /**
   * Pontuação por passe provocado (relato de Boa Vista-RR).
   * PENDENTE: valor e aplicação em revisão. Não implementada; sempre desativada.
   */
  passBonus: { status: 'pending'; enabled: false; points: null };
}

/** Assistências opcionais. Desligadas = modo fiel à mesa presencial. */
export interface Assists {
  /** Destacar pedras jogáveis e pontas válidas. */
  highlightPlayable: boolean;
  /** Somar pontos automaticamente. Se desligado, o jogador precisa "marcar" (All Fives). */
  autoScore: boolean;
}

export interface RuleSet {
  mode: GameMode;
  players: 2 | 3 | 4;
  teams: boolean;
  handSize: number;
  /**
   * Dorme: pedras restantes disponíveis para compra.
   * Desligado: as restantes vão para o cemitério (fora do jogo, ninguém compra).
   */
  boneyard: boolean;
  /** Pedras que ficam no dorme sem poder ser compradas. */
  boneyardReserve: number;
  opening: OpeningRule;
  /** Distribuição automática ou escolha das pedras viradas na mesa. Ausente em dados antigos = 'auto'. */
  dealMode?: DealMode;
  /** Regra de abertura apenas da primeira rodada; nas seguintes, abre quem `nextRoundStarter` indicar com qualquer pedra. */
  nextRoundStarter: NextRoundStarter;
  spinner: boolean;
  targetScore: number;
  passeBate: PasseBateRules;
  allFives: AllFivesRules;
  assists: Assists;
}

export interface RuleProfileVersion {
  version: number;
  rules: RuleSet;
  savedAt: string;
  note?: string;
}

export interface RuleProfile {
  id: string;
  name: string;
  mode: GameMode;
  version: number;
  builtIn: boolean;
  basedOn?: string;
  description: string;
  rules: RuleSet;
  /** Status por chave de regra (ex.: 'passeBate.blocked'). */
  ruleStatus: Record<string, RuleStatus>;
  /** Versões anteriores preservadas (nunca apagadas). */
  history: RuleProfileVersion[];
  createdAt: string;
  updatedAt: string;
}

/** Cópia imutável das regras usada por uma partida. */
export interface FrozenRules {
  readonly profileId: string;
  readonly profileName: string;
  readonly profileVersion: number;
  readonly frozenAt: string;
  readonly hash: string;
  readonly rules: Readonly<RuleSet>;
}
