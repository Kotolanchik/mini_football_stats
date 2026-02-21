export type Side = 'yellow' | 'white'

export type MatchMode = '1v1' | '2v2'

export type CompetitionMode = MatchMode | 'mixed'

export type CompetitionType = 'friendly' | 'ladder' | 'bracket'

export interface Player {
  id: string
  name: string
  createdAt: string
}

export interface Entrant {
  id: string
  name: string
  playerIds: string[]
}

export interface BracketMatch {
  id: string
  roundIndex: number
  matchIndex: number
  yellowEntrantId: string | null
  whiteEntrantId: string | null
  winnerEntrantId: string | null
  scoreYellow: number | null
  scoreWhite: number | null
  completed: boolean
  autoAdvanced: boolean
}

export interface BracketRound {
  id: string
  name: string
  matches: BracketMatch[]
}

export interface CompetitionPoints {
  win: number
  loss: number
}

export interface Competition {
  id: string
  name: string
  type: CompetitionType
  mode: CompetitionMode
  createdAt: string
  entrants: Entrant[]
  points: CompetitionPoints
  bracketRounds: BracketRound[]
}

export interface MatchRecord {
  id: string
  competitionId: string
  competitionType: CompetitionType
  mode: MatchMode
  yellowEntrantId: string | null
  whiteEntrantId: string | null
  yellowPlayerIds: string[]
  whitePlayerIds: string[]
  scoreYellow: number
  scoreWhite: number
  winnerSide: Side
  playedAt: string
  bracketMatchId: string | null
}

export interface AppState {
  players: Player[]
  competitions: Competition[]
  matches: MatchRecord[]
}

export interface PlayerStats {
  playerId: string
  name: string
  matches: number
  wins: number
  losses: number
  winRate: number
  yellowWins: number
  yellowLosses: number
  whiteWins: number
  whiteLosses: number
}

export interface LadderStanding {
  entrantId: string
  name: string
  matches: number
  wins: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}
