import type { AppState, Competition, CompetitionMode, CompetitionType, Entrant, Player } from '../types'

export const STORAGE_KEY = 'table-football-stats-v1'
export const DEFAULT_FRIENDLY_ID = 'friendly-default'

export const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2, 11)}`
}

const nowIso = (): string => new Date().toISOString()

export const createCompetition = (
  name: string,
  type: CompetitionType,
  mode: CompetitionMode,
  entrants: Entrant[],
  points: { win: number; loss: number },
): Competition => ({
  id: createId(),
  name,
  type,
  mode,
  createdAt: nowIso(),
  entrants,
  points,
  bracketRounds: [],
})

export const createDefaultFriendlyCompetition = (): Competition => ({
  id: DEFAULT_FRIENDLY_ID,
  name: 'Дружеские матчи',
  type: 'friendly',
  mode: 'mixed',
  createdAt: nowIso(),
  entrants: [],
  points: { win: 0, loss: 0 },
  bracketRounds: [],
})

const isCompetition = (value: unknown): value is Competition => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.type === 'string' &&
    typeof item.mode === 'string' &&
    typeof item.createdAt === 'string' &&
    Array.isArray(item.entrants) &&
    typeof item.points === 'object' &&
    item.points !== null &&
    Array.isArray(item.bracketRounds)
  )
}

const isPlayer = (value: unknown): value is Player => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as Record<string, unknown>
  return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.createdAt === 'string'
}

export const createInitialState = (): AppState => ({
  players: [],
  competitions: [createDefaultFriendlyCompetition()],
  matches: [],
})

export const normalizeState = (raw: unknown): AppState => {
  if (!raw || typeof raw !== 'object') {
    return createInitialState()
  }

  const data = raw as Partial<AppState>
  const players = Array.isArray(data.players) ? data.players.filter(isPlayer) : []
  const competitions = Array.isArray(data.competitions) ? data.competitions.filter(isCompetition) : []
  const matches = Array.isArray(data.matches) ? data.matches : []

  const hasFriendly = competitions.some((competition) => competition.id === DEFAULT_FRIENDLY_ID)
  return {
    players,
    competitions: hasFriendly ? competitions : [createDefaultFriendlyCompetition(), ...competitions],
    matches,
  }
}

export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return createInitialState()
    }
    const parsed = JSON.parse(stored) as unknown
    return normalizeState(parsed)
  } catch {
    return createInitialState()
  }
}

export const saveState = (state: AppState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const buildTeamName = (firstName: string, secondName: string): string => `${firstName} / ${secondName}`
