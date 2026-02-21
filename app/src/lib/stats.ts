import type { Competition, LadderStanding, MatchRecord, Player, PlayerStats } from '../types'

export const calculatePlayerStats = (players: Player[], matches: MatchRecord[]): PlayerStats[] => {
  const statsByPlayer = new Map<string, PlayerStats>()

  players.forEach((player) => {
    statsByPlayer.set(player.id, {
      playerId: player.id,
      name: player.name,
      matches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      yellowWins: 0,
      yellowLosses: 0,
      whiteWins: 0,
      whiteLosses: 0,
    })
  })

  matches.forEach((match) => {
    match.yellowPlayerIds.forEach((playerId) => {
      const current = statsByPlayer.get(playerId)
      if (!current) {
        return
      }
      current.matches += 1
      if (match.winnerSide === 'yellow') {
        current.wins += 1
        current.yellowWins += 1
      } else {
        current.losses += 1
        current.yellowLosses += 1
      }
    })

    match.whitePlayerIds.forEach((playerId) => {
      const current = statsByPlayer.get(playerId)
      if (!current) {
        return
      }
      current.matches += 1
      if (match.winnerSide === 'white') {
        current.wins += 1
        current.whiteWins += 1
      } else {
        current.losses += 1
        current.whiteLosses += 1
      }
    })
  })

  return Array.from(statsByPlayer.values())
    .map((item) => ({
      ...item,
      winRate: item.matches > 0 ? Number(((item.wins / item.matches) * 100).toFixed(1)) : 0,
    }))
    .sort((left, right) => {
      if (right.winRate !== left.winRate) {
        return right.winRate - left.winRate
      }
      if (right.wins !== left.wins) {
        return right.wins - left.wins
      }
      return left.name.localeCompare(right.name, 'ru')
    })
}

export const calculateLadderStandings = (
  competition: Competition,
  matches: MatchRecord[],
): LadderStanding[] => {
  const table = new Map<string, LadderStanding>()

  competition.entrants.forEach((entrant) => {
    table.set(entrant.id, {
      entrantId: entrant.id,
      name: entrant.name,
      matches: 0,
      wins: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    })
  })

  matches
    .filter((match) => match.competitionId === competition.id)
    .forEach((match) => {
      if (!match.yellowEntrantId || !match.whiteEntrantId) {
        return
      }
      const yellow = table.get(match.yellowEntrantId)
      const white = table.get(match.whiteEntrantId)
      if (!yellow || !white) {
        return
      }

      yellow.matches += 1
      white.matches += 1
      yellow.goalsFor += match.scoreYellow
      yellow.goalsAgainst += match.scoreWhite
      white.goalsFor += match.scoreWhite
      white.goalsAgainst += match.scoreYellow

      if (match.winnerSide === 'yellow') {
        yellow.wins += 1
        white.losses += 1
        yellow.points += competition.points.win
        white.points += competition.points.loss
      } else {
        white.wins += 1
        yellow.losses += 1
        white.points += competition.points.win
        yellow.points += competition.points.loss
      }
    })

  return Array.from(table.values())
    .map((entry) => ({
      ...entry,
      goalDiff: entry.goalsFor - entry.goalsAgainst,
    }))
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points
      }
      if (right.wins !== left.wins) {
        return right.wins - left.wins
      }
      if (right.goalDiff !== left.goalDiff) {
        return right.goalDiff - left.goalDiff
      }
      if (right.goalsFor !== left.goalsFor) {
        return right.goalsFor - left.goalsFor
      }
      return left.name.localeCompare(right.name, 'ru')
    })
}
