import { createId } from './state'
import type { BracketRound, Competition, MatchMode, Side } from '../types'

interface BracketResult {
  updatedCompetition: Competition
  yellowEntrantId: string
  whiteEntrantId: string
  yellowPlayerIds: string[]
  whitePlayerIds: string[]
  winnerSide: Side
  bracketMatchId: string
}

const ROUND_NAMES = ['Финал', 'Полуфинал', 'Четвертьфинал', '1/8 финала', '1/16 финала']

const nextPowerOfTwo = (value: number): number => {
  if (value <= 2) {
    return 2
  }
  return 2 ** Math.ceil(Math.log2(value))
}

const getRoundName = (roundIndex: number, totalRounds: number): string => {
  const reverseIndex = totalRounds - 1 - roundIndex
  if (reverseIndex < ROUND_NAMES.length) {
    return ROUND_NAMES[reverseIndex]
  }
  return `Раунд ${roundIndex + 1}`
}

const cloneRounds = (rounds: BracketRound[]): BracketRound[] =>
  rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => ({ ...match })),
  }))

const placeWinnerIntoNextRound = (
  rounds: BracketRound[],
  roundIndex: number,
  matchIndex: number,
  winnerEntrantId: string,
): void => {
  const nextRound = rounds[roundIndex + 1]
  if (!nextRound) {
    return
  }
  const nextMatch = nextRound.matches[Math.floor(matchIndex / 2)]
  if (!nextMatch) {
    return
  }
  if (matchIndex % 2 === 0) {
    nextMatch.yellowEntrantId = winnerEntrantId
  } else {
    nextMatch.whiteEntrantId = winnerEntrantId
  }
}

const autoAdvanceByes = (sourceRounds: BracketRound[]): BracketRound[] => {
  const rounds = cloneRounds(sourceRounds)

  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
    const round = rounds[roundIndex]
    const isLastRound = roundIndex === rounds.length - 1

    round.matches.forEach((match, matchIndex) => {
      if (match.completed && match.winnerEntrantId && !isLastRound) {
        placeWinnerIntoNextRound(rounds, roundIndex, matchIndex, match.winnerEntrantId)
        return
      }

      if (match.completed) {
        return
      }

      const hasYellow = Boolean(match.yellowEntrantId)
      const hasWhite = Boolean(match.whiteEntrantId)
      if (hasYellow === hasWhite) {
        return
      }

      const winnerEntrantId = match.yellowEntrantId ?? match.whiteEntrantId
      if (!winnerEntrantId) {
        return
      }

      match.completed = true
      match.autoAdvanced = true
      match.winnerEntrantId = winnerEntrantId
      match.scoreYellow = null
      match.scoreWhite = null
      if (!isLastRound) {
        placeWinnerIntoNextRound(rounds, roundIndex, matchIndex, winnerEntrantId)
      }
    })
  }

  return rounds
}

export const generateSingleEliminationBracket = (entrantIds: string[]): BracketRound[] => {
  if (entrantIds.length < 2) {
    return []
  }

  const bracketSize = nextPowerOfTwo(entrantIds.length)
  const roundCount = Math.log2(bracketSize)
  const paddedEntrants: Array<string | null> = [...entrantIds]
  while (paddedEntrants.length < bracketSize) {
    paddedEntrants.push(null)
  }

  const rounds: BracketRound[] = []
  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const matchesInRound = bracketSize / 2 ** (roundIndex + 1)
    rounds.push({
      id: createId(),
      name: getRoundName(roundIndex, roundCount),
      matches: Array.from({ length: matchesInRound }, (_, matchIndex) => ({
        id: createId(),
        roundIndex,
        matchIndex,
        yellowEntrantId: null,
        whiteEntrantId: null,
        winnerEntrantId: null,
        scoreYellow: null,
        scoreWhite: null,
        completed: false,
        autoAdvanced: false,
      })),
    })
  }

  rounds[0]?.matches.forEach((match, matchIndex) => {
    match.yellowEntrantId = paddedEntrants[matchIndex * 2] ?? null
    match.whiteEntrantId = paddedEntrants[matchIndex * 2 + 1] ?? null
  })

  return autoAdvanceByes(rounds)
}

const getEntrantPlayerIds = (competition: Competition, entrantId: string): string[] => {
  const entrant = competition.entrants.find((item) => item.id === entrantId)
  return entrant ? entrant.playerIds : []
}

export const submitBracketResult = (
  competition: Competition,
  roundIndex: number,
  matchIndex: number,
  scoreYellow: number,
  scoreWhite: number,
  mode: MatchMode,
): BracketResult => {
  if (competition.type !== 'bracket') {
    throw new Error('Результаты по сетке можно вносить только для турниров типа "Плей-офф".')
  }

  if (scoreYellow === scoreWhite) {
    throw new Error('В плей-офф ничья недопустима. Укажите победителя.')
  }

  const rounds = cloneRounds(competition.bracketRounds)
  const round = rounds[roundIndex]
  const bracketMatch = round?.matches[matchIndex]

  if (!round || !bracketMatch) {
    throw new Error('Матч в сетке не найден.')
  }

  if (bracketMatch.completed) {
    throw new Error('Результат этого матча уже зафиксирован.')
  }

  if (!bracketMatch.yellowEntrantId || !bracketMatch.whiteEntrantId) {
    throw new Error('Матч еще не готов: не хватает участников.')
  }

  const winnerSide: Side = scoreYellow > scoreWhite ? 'yellow' : 'white'
  const winnerEntrantId = winnerSide === 'yellow' ? bracketMatch.yellowEntrantId : bracketMatch.whiteEntrantId

  bracketMatch.scoreYellow = scoreYellow
  bracketMatch.scoreWhite = scoreWhite
  bracketMatch.completed = true
  bracketMatch.autoAdvanced = false
  bracketMatch.winnerEntrantId = winnerEntrantId

  placeWinnerIntoNextRound(rounds, roundIndex, matchIndex, winnerEntrantId)
  const updatedRounds = autoAdvanceByes(rounds)

  const updatedCompetition: Competition = {
    ...competition,
    mode,
    bracketRounds: updatedRounds,
  }

  return {
    updatedCompetition,
    yellowEntrantId: bracketMatch.yellowEntrantId,
    whiteEntrantId: bracketMatch.whiteEntrantId,
    yellowPlayerIds: getEntrantPlayerIds(updatedCompetition, bracketMatch.yellowEntrantId),
    whitePlayerIds: getEntrantPlayerIds(updatedCompetition, bracketMatch.whiteEntrantId),
    winnerSide,
    bracketMatchId: bracketMatch.id,
  }
}
