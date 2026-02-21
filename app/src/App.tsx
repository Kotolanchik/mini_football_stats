import { FormEvent, useEffect, useMemo, useState } from 'react'
import './App.css'
import { submitBracketResult, generateSingleEliminationBracket } from './lib/bracket'
import { calculateLadderStandings, calculatePlayerStats } from './lib/stats'
import {
  buildTeamName,
  createCompetition,
  createId,
  loadState,
  saveState,
} from './lib/state'
import type {
  AppState,
  Competition,
  CompetitionMode,
  CompetitionType,
  Entrant,
  MatchMode,
  MatchRecord,
  Side,
} from './types'

type TabId = 'overview' | 'players' | 'matches' | 'competitions'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'players', label: 'Игроки' },
  { id: 'matches', label: 'Матчи' },
  { id: 'competitions', label: 'Турниры' },
]

const competitionTypeLabel: Record<CompetitionType, string> = {
  friendly: 'Дружеские',
  ladder: 'Рейтинговая сетка',
  bracket: 'Плей-офф',
}

const modeLabel: Record<CompetitionMode, string> = {
  mixed: 'Смешанный',
  '1v1': '1 на 1',
  '2v2': '2 на 2',
}

const sideLabel: Record<Side, string> = {
  yellow: 'Желтая',
  white: 'Белая',
}

const normalizeName = (value: string): string => value.trim().replace(/\s+/g, ' ')

function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const players = state.players
  const competitions = state.competitions
  const matches = state.matches

  useEffect(() => {
    saveState(state)
  }, [state])

  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])
  const competitionsById = useMemo(
    () => new Map(competitions.map((competition) => [competition.id, competition])),
    [competitions],
  )
  const playerStats = useMemo(() => calculatePlayerStats(players, matches), [players, matches])
  const ladderTables = useMemo(() => {
    const entries = competitions
      .filter((competition) => competition.type === 'ladder')
      .map((competition) => [competition.id, calculateLadderStandings(competition, matches)])
    return new Map(entries)
  }, [competitions, matches])

  const totalMatches = matches.length
  const totalOneVsOne = matches.filter((match) => match.mode === '1v1').length
  const totalTwoVsTwo = matches.filter((match) => match.mode === '2v2').length
  const totalYellowWins = matches.filter((match) => match.winnerSide === 'yellow').length
  const totalWhiteWins = matches.filter((match) => match.winnerSide === 'white').length

  const recentMatches = useMemo(
    () => [...matches].sort((left, right) => right.playedAt.localeCompare(left.playedAt)).slice(0, 10),
    [matches],
  )

  const playCompetitions = useMemo(
    () => competitions.filter((competition) => competition.type !== 'bracket'),
    [competitions],
  )

  const [playerName, setPlayerName] = useState('')

  const [newCompetitionName, setNewCompetitionName] = useState('')
  const [newCompetitionType, setNewCompetitionType] = useState<CompetitionType>('friendly')
  const [newCompetitionMode, setNewCompetitionMode] = useState<CompetitionMode>('mixed')
  const [newLadderWinPoints, setNewLadderWinPoints] = useState(3)
  const [newLadderLossPoints, setNewLadderLossPoints] = useState(0)
  const [draftSingleEntrants, setDraftSingleEntrants] = useState<string[]>([])
  const [draftTeamEntrants, setDraftTeamEntrants] = useState<Entrant[]>([])
  const [draftTeamFirstPlayerId, setDraftTeamFirstPlayerId] = useState('')
  const [draftTeamSecondPlayerId, setDraftTeamSecondPlayerId] = useState('')
  const [draftTeamCustomName, setDraftTeamCustomName] = useState('')

  const [matchCompetitionId, setMatchCompetitionId] = useState('')
  const [mixedFriendlyMode, setMixedFriendlyMode] = useState<MatchMode>('1v1')
  const [singleYellowPlayerId, setSingleYellowPlayerId] = useState('')
  const [singleWhitePlayerId, setSingleWhitePlayerId] = useState('')
  const [doubleYellowFirstPlayerId, setDoubleYellowFirstPlayerId] = useState('')
  const [doubleYellowSecondPlayerId, setDoubleYellowSecondPlayerId] = useState('')
  const [doubleWhiteFirstPlayerId, setDoubleWhiteFirstPlayerId] = useState('')
  const [doubleWhiteSecondPlayerId, setDoubleWhiteSecondPlayerId] = useState('')
  const [ladderYellowEntrantId, setLadderYellowEntrantId] = useState('')
  const [ladderWhiteEntrantId, setLadderWhiteEntrantId] = useState('')
  const [scoreYellow, setScoreYellow] = useState(10)
  const [scoreWhite, setScoreWhite] = useState(8)

  const [editingBracketMatch, setEditingBracketMatch] = useState<{
    competitionId: string
    roundIndex: number
    matchIndex: number
    scoreYellow: number
    scoreWhite: number
  } | null>(null)

  const selectedPlayCompetition = useMemo(
    () => playCompetitions.find((competition) => competition.id === matchCompetitionId) ?? null,
    [playCompetitions, matchCompetitionId],
  )

  const selectedMatchMode: MatchMode | null = selectedPlayCompetition
    ? selectedPlayCompetition.mode === 'mixed'
      ? mixedFriendlyMode
      : (selectedPlayCompetition.mode as MatchMode)
    : null

  useEffect(() => {
    if (newCompetitionType !== 'friendly' && newCompetitionMode === 'mixed') {
      setNewCompetitionMode('1v1')
    }
  }, [newCompetitionType, newCompetitionMode])

  useEffect(() => {
    if (newCompetitionType === 'friendly') {
      setDraftSingleEntrants([])
      setDraftTeamEntrants([])
    }
  }, [newCompetitionType])

  useEffect(() => {
    if (newCompetitionMode === '1v1') {
      setDraftTeamEntrants([])
    }
    if (newCompetitionMode === '2v2') {
      setDraftSingleEntrants([])
    }
  }, [newCompetitionMode])

  useEffect(() => {
    if (playCompetitions.length === 0) {
      setMatchCompetitionId('')
      return
    }
    const currentExists = playCompetitions.some((competition) => competition.id === matchCompetitionId)
    if (!currentExists) {
      setMatchCompetitionId(playCompetitions[0].id)
    }
  }, [matchCompetitionId, playCompetitions])

  useEffect(() => {
    if (selectedPlayCompetition?.type !== 'ladder') {
      setLadderYellowEntrantId('')
      setLadderWhiteEntrantId('')
    }
  }, [selectedPlayCompetition?.type])

  const playerNameById = (playerId: string): string => playersById.get(playerId)?.name ?? 'Неизвестный'

  const entrantNameById = (competition: Competition, entrantId: string | null): string => {
    if (!entrantId) {
      return 'TBD'
    }
    return competition.entrants.find((entrant) => entrant.id === entrantId)?.name ?? 'TBD'
  }

  const displaySideFromMatch = (match: MatchRecord, side: Side): string => {
    const competition = competitionsById.get(match.competitionId)
    const sideEntrantId = side === 'yellow' ? match.yellowEntrantId : match.whiteEntrantId

    if (competition && sideEntrantId) {
      const entrant = competition.entrants.find((item) => item.id === sideEntrantId)
      if (entrant) {
        return entrant.name
      }
    }

    const playerIds = side === 'yellow' ? match.yellowPlayerIds : match.whitePlayerIds
    if (playerIds.length === 0) {
      return '—'
    }
    return playerIds.map((playerId) => playerNameById(playerId)).join(' / ')
  }

  const clearAlerts = (): void => {
    setError('')
    setNotice('')
  }

  const addPlayer = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    clearAlerts()

    const cleanedName = normalizeName(playerName)
    if (!cleanedName) {
      setError('Введите имя игрока.')
      return
    }

    const duplicate = players.some(
      (player) => player.name.localeCompare(cleanedName, 'ru', { sensitivity: 'base' }) === 0,
    )
    if (duplicate) {
      setError('Игрок с таким именем уже существует.')
      return
    }

    setState((previous) => ({
      ...previous,
      players: [
        ...previous.players,
        {
          id: createId(),
          name: cleanedName,
          createdAt: new Date().toISOString(),
        },
      ],
    }))
    setPlayerName('')
    setNotice(`Игрок "${cleanedName}" добавлен.`)
  }

  const toggleSingleEntrantDraft = (playerId: string): void => {
    setDraftSingleEntrants((previous) =>
      previous.includes(playerId) ? previous.filter((id) => id !== playerId) : [...previous, playerId],
    )
  }

  const addDraftTeam = (): void => {
    clearAlerts()
    if (!draftTeamFirstPlayerId || !draftTeamSecondPlayerId) {
      setError('Выберите двух игроков для команды 2 на 2.')
      return
    }

    if (draftTeamFirstPlayerId === draftTeamSecondPlayerId) {
      setError('Нельзя добавить одного и того же игрока дважды в одну команду.')
      return
    }

    const firstName = playerNameById(draftTeamFirstPlayerId)
    const secondName = playerNameById(draftTeamSecondPlayerId)
    const cleanedCustomName = normalizeName(draftTeamCustomName)
    const teamName = cleanedCustomName || buildTeamName(firstName, secondName)
    const playerSet = new Set([draftTeamFirstPlayerId, draftTeamSecondPlayerId])

    const duplicate = draftTeamEntrants.some(
      (team) => team.playerIds.length === 2 && team.playerIds.every((playerId) => playerSet.has(playerId)),
    )
    if (duplicate) {
      setError('Такая команда уже добавлена в список участников.')
      return
    }

    setDraftTeamEntrants((previous) => [
      ...previous,
      { id: createId(), name: teamName, playerIds: [draftTeamFirstPlayerId, draftTeamSecondPlayerId] },
    ])
    setDraftTeamFirstPlayerId('')
    setDraftTeamSecondPlayerId('')
    setDraftTeamCustomName('')
  }

  const createTournament = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    clearAlerts()

    const cleanedName = normalizeName(newCompetitionName)
    if (!cleanedName) {
      setError('Введите название соревнования.')
      return
    }

    let entrants: Entrant[] = []
    if (newCompetitionType !== 'friendly') {
      if (newCompetitionMode === '1v1') {
        entrants = draftSingleEntrants.map((playerId) => ({
          id: createId(),
          name: playerNameById(playerId),
          playerIds: [playerId],
        }))
      }
      if (newCompetitionMode === '2v2') {
        entrants = draftTeamEntrants
      }
      if (entrants.length < 2) {
        setError('Для турнирной или рейтинговой сетки нужно минимум 2 участника.')
        return
      }
    }

    const modeForCompetition: CompetitionMode =
      newCompetitionType === 'friendly' ? newCompetitionMode : (newCompetitionMode as MatchMode)
    const points = {
      win: newCompetitionType === 'ladder' ? newLadderWinPoints : 0,
      loss: newCompetitionType === 'ladder' ? newLadderLossPoints : 0,
    }

    const baseCompetition = createCompetition(
      cleanedName,
      newCompetitionType,
      modeForCompetition,
      entrants,
      points,
    )

    const competition: Competition =
      newCompetitionType === 'bracket'
        ? {
            ...baseCompetition,
            bracketRounds: generateSingleEliminationBracket(entrants.map((entrant) => entrant.id)),
          }
        : baseCompetition

    setState((previous) => ({
      ...previous,
      competitions: [...previous.competitions, competition],
    }))

    setNewCompetitionName('')
    setNewCompetitionType('friendly')
    setNewCompetitionMode('mixed')
    setDraftSingleEntrants([])
    setDraftTeamEntrants([])
    setNotice(`Соревнование "${competition.name}" создано.`)
  }

  const createMatch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    clearAlerts()

    if (!selectedPlayCompetition || !selectedMatchMode) {
      setError('Выберите соревнование для матча.')
      return
    }

    if (scoreYellow === scoreWhite) {
      setError('Ничья не учитывается в винрейте. Укажите победителя.')
      return
    }

    const winnerSide: Side = scoreYellow > scoreWhite ? 'yellow' : 'white'
    let yellowPlayerIds: string[] = []
    let whitePlayerIds: string[] = []
    let yellowEntrantId: string | null = null
    let whiteEntrantId: string | null = null

    if (selectedPlayCompetition.type === 'ladder') {
      if (!ladderYellowEntrantId || !ladderWhiteEntrantId) {
        setError('Выберите участников рейтингового матча.')
        return
      }
      if (ladderYellowEntrantId === ladderWhiteEntrantId) {
        setError('Участник не может играть сам с собой.')
        return
      }

      const yellowEntrant = selectedPlayCompetition.entrants.find(
        (entrant) => entrant.id === ladderYellowEntrantId,
      )
      const whiteEntrant = selectedPlayCompetition.entrants.find(
        (entrant) => entrant.id === ladderWhiteEntrantId,
      )

      if (!yellowEntrant || !whiteEntrant) {
        setError('Не удалось найти выбранных участников.')
        return
      }

      yellowPlayerIds = yellowEntrant.playerIds
      whitePlayerIds = whiteEntrant.playerIds
      yellowEntrantId = yellowEntrant.id
      whiteEntrantId = whiteEntrant.id
    } else if (selectedMatchMode === '1v1') {
      if (!singleYellowPlayerId || !singleWhitePlayerId) {
        setError('Выберите игроков для желтой и белой стороны.')
        return
      }
      if (singleYellowPlayerId === singleWhitePlayerId) {
        setError('Один и тот же игрок не может быть на обеих сторонах.')
        return
      }
      yellowPlayerIds = [singleYellowPlayerId]
      whitePlayerIds = [singleWhitePlayerId]
    } else {
      const participants = [
        doubleYellowFirstPlayerId,
        doubleYellowSecondPlayerId,
        doubleWhiteFirstPlayerId,
        doubleWhiteSecondPlayerId,
      ]
      if (participants.some((playerId) => !playerId)) {
        setError('Для 2 на 2 выберите по два игрока на каждую сторону.')
        return
      }
      const uniqueParticipants = new Set(participants)
      if (uniqueParticipants.size !== 4) {
        setError('В 2 на 2 игроки должны быть уникальными по обеим сторонам.')
        return
      }
      yellowPlayerIds = [doubleYellowFirstPlayerId, doubleYellowSecondPlayerId]
      whitePlayerIds = [doubleWhiteFirstPlayerId, doubleWhiteSecondPlayerId]
    }

    const match: MatchRecord = {
      id: createId(),
      competitionId: selectedPlayCompetition.id,
      competitionType: selectedPlayCompetition.type,
      mode: selectedMatchMode,
      yellowEntrantId,
      whiteEntrantId,
      yellowPlayerIds,
      whitePlayerIds,
      scoreYellow,
      scoreWhite,
      winnerSide,
      playedAt: new Date().toISOString(),
      bracketMatchId: null,
    }

    setState((previous) => ({
      ...previous,
      matches: [match, ...previous.matches],
    }))
    setScoreYellow(10)
    setScoreWhite(8)
    setNotice('Результат матча добавлен.')
  }

  const openBracketEditor = (competitionId: string, roundIndex: number, matchIndex: number): void => {
    setEditingBracketMatch({
      competitionId,
      roundIndex,
      matchIndex,
      scoreYellow: 10,
      scoreWhite: 8,
    })
    clearAlerts()
  }

  const confirmBracketResult = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (!editingBracketMatch) {
      return
    }

    clearAlerts()
    const competition = competitions.find((item) => item.id === editingBracketMatch.competitionId)
    if (!competition || competition.type !== 'bracket') {
      setError('Сетка турнира не найдена.')
      return
    }

    try {
      const mode: MatchMode = competition.mode === '2v2' ? '2v2' : '1v1'
      const result = submitBracketResult(
        competition,
        editingBracketMatch.roundIndex,
        editingBracketMatch.matchIndex,
        editingBracketMatch.scoreYellow,
        editingBracketMatch.scoreWhite,
        mode,
      )

      const match: MatchRecord = {
        id: createId(),
        competitionId: competition.id,
        competitionType: 'bracket',
        mode,
        yellowEntrantId: result.yellowEntrantId,
        whiteEntrantId: result.whiteEntrantId,
        yellowPlayerIds: result.yellowPlayerIds,
        whitePlayerIds: result.whitePlayerIds,
        scoreYellow: editingBracketMatch.scoreYellow,
        scoreWhite: editingBracketMatch.scoreWhite,
        winnerSide: result.winnerSide,
        playedAt: new Date().toISOString(),
        bracketMatchId: result.bracketMatchId,
      }

      setState((previous) => ({
        ...previous,
        competitions: previous.competitions.map((item) =>
          item.id === competition.id ? result.updatedCompetition : item,
        ),
        matches: [match, ...previous.matches],
      }))
      setEditingBracketMatch(null)
      setNotice('Результат плей-офф зафиксирован.')
    } catch (exception) {
      if (exception instanceof Error) {
        setError(exception.message)
      } else {
        setError('Не удалось сохранить результат матча.')
      }
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="overline">Статистика настольного футбола</p>
          <h1>Kicker Winrate Tracker</h1>
        </div>
        <p className="subtitle">
          Учет матчей 1v1 и 2v2, сторон (желтая/белая), плей-офф сеток и рейтинговых таблиц.
        </p>
      </header>

      <nav className="tabs" aria-label="Основные разделы">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${tab.id === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {notice && (
        <div className="alert success">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')}>
            ✕
          </button>
        </div>
      )}
      {error && (
        <div className="alert error">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>
            ✕
          </button>
        </div>
      )}

      <main className="content">
        {activeTab === 'overview' && (
          <section className="stack">
            <div className="stat-grid">
              <article className="stat-card">
                <p>Матчей всего</p>
                <strong>{totalMatches}</strong>
              </article>
              <article className="stat-card">
                <p>Матчи 1 на 1</p>
                <strong>{totalOneVsOne}</strong>
              </article>
              <article className="stat-card">
                <p>Матчи 2 на 2</p>
                <strong>{totalTwoVsTwo}</strong>
              </article>
              <article className="stat-card side-yellow">
                <p>Победы желтой стороны</p>
                <strong>{totalYellowWins}</strong>
              </article>
              <article className="stat-card side-white">
                <p>Победы белой стороны</p>
                <strong>{totalWhiteWins}</strong>
              </article>
            </div>

            <article className="panel">
              <h2>Личная статистика игроков</h2>
              {playerStats.length === 0 ? (
                <p className="empty">Пока нет данных. Добавьте игроков и сыгранные матчи.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Игрок</th>
                        <th>Матчи</th>
                        <th>Победы</th>
                        <th>Поражения</th>
                        <th>Винрейт</th>
                        <th>Желтая</th>
                        <th>Белая</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerStats.map((row) => (
                        <tr key={row.playerId}>
                          <td>{row.name}</td>
                          <td>{row.matches}</td>
                          <td>{row.wins}</td>
                          <td>{row.losses}</td>
                          <td>{row.winRate}%</td>
                          <td>
                            {row.yellowWins}-{row.yellowLosses}
                          </td>
                          <td>
                            {row.whiteWins}-{row.whiteLosses}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="panel">
              <h2>Последние матчи</h2>
              {recentMatches.length === 0 ? (
                <p className="empty">Результаты еще не добавлены.</p>
              ) : (
                <ul className="recent-list">
                  {recentMatches.map((match) => (
                    <li key={match.id}>
                      <div>
                        <p className="line-main">
                          <span className="side-chip yellow">{displaySideFromMatch(match, 'yellow')}</span>
                          <strong>
                            {match.scoreYellow}:{match.scoreWhite}
                          </strong>
                          <span className="side-chip white">{displaySideFromMatch(match, 'white')}</span>
                        </p>
                        <p className="line-secondary">
                          {competitionTypeLabel[match.competitionType]} • {match.mode} • Победила сторона:{' '}
                          {sideLabel[match.winnerSide]}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}

        {activeTab === 'players' && (
          <section className="stack">
            <article className="panel">
              <h2>Добавить игрока</h2>
              <form className="form-grid" onSubmit={addPlayer}>
                <label>
                  Имя
                  <input
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    placeholder="Например, Алексей"
                  />
                </label>
                <button type="submit">Добавить</button>
              </form>
            </article>

            <article className="panel">
              <h2>Список игроков</h2>
              {players.length === 0 ? (
                <p className="empty">Добавьте минимум двух игроков для начала матчей.</p>
              ) : (
                <ul className="player-list">
                  {players.map((player) => {
                    const stat = playerStats.find((item) => item.playerId === player.id)
                    return (
                      <li key={player.id}>
                        <strong>{player.name}</strong>
                        <span>
                          {stat ? `${stat.wins}W / ${stat.losses}L (${stat.winRate}%)` : 'Пока без матчей'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </article>
          </section>
        )}

        {activeTab === 'matches' && (
          <section className="stack">
            <article className="panel">
              <h2>Добавить результат матча</h2>
              {players.length < 2 ? (
                <p className="empty">Сначала добавьте хотя бы двух игроков на вкладке «Игроки».</p>
              ) : playCompetitions.length === 0 ? (
                <p className="empty">Создайте дружеский или рейтинговый турнир на вкладке «Турниры».</p>
              ) : (
                <form className="form-grid" onSubmit={createMatch}>
                  <label>
                    Соревнование
                    <select
                      value={matchCompetitionId}
                      onChange={(event) => setMatchCompetitionId(event.target.value)}
                    >
                      {playCompetitions.map((competition) => (
                        <option key={competition.id} value={competition.id}>
                          {competition.name} ({competitionTypeLabel[competition.type]})
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedPlayCompetition?.type === 'friendly' && selectedPlayCompetition.mode === 'mixed' && (
                    <label>
                      Формат матча
                      <select
                        value={mixedFriendlyMode}
                        onChange={(event) => setMixedFriendlyMode(event.target.value as MatchMode)}
                      >
                        <option value="1v1">1 на 1</option>
                        <option value="2v2">2 на 2</option>
                      </select>
                    </label>
                  )}

                  {selectedPlayCompetition?.type === 'ladder' ? (
                    <>
                      <label>
                        Желтая сторона (участник)
                        <select
                          value={ladderYellowEntrantId}
                          onChange={(event) => setLadderYellowEntrantId(event.target.value)}
                        >
                          <option value="">Выберите участника</option>
                          {selectedPlayCompetition.entrants.map((entrant) => (
                            <option key={entrant.id} value={entrant.id}>
                              {entrant.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Белая сторона (участник)
                        <select
                          value={ladderWhiteEntrantId}
                          onChange={(event) => setLadderWhiteEntrantId(event.target.value)}
                        >
                          <option value="">Выберите участника</option>
                          {selectedPlayCompetition.entrants.map((entrant) => (
                            <option key={entrant.id} value={entrant.id}>
                              {entrant.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : (
                    <>
                      {selectedMatchMode === '1v1' && (
                        <>
                          <label>
                            Желтая сторона
                            <select
                              value={singleYellowPlayerId}
                              onChange={(event) => setSingleYellowPlayerId(event.target.value)}
                            >
                              <option value="">Выберите игрока</option>
                              {players.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Белая сторона
                            <select
                              value={singleWhitePlayerId}
                              onChange={(event) => setSingleWhitePlayerId(event.target.value)}
                            >
                              <option value="">Выберите игрока</option>
                              {players.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}

                      {selectedMatchMode === '2v2' && (
                        <>
                          <label>
                            Желтая сторона — игрок 1
                            <select
                              value={doubleYellowFirstPlayerId}
                              onChange={(event) => setDoubleYellowFirstPlayerId(event.target.value)}
                            >
                              <option value="">Выберите игрока</option>
                              {players.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Желтая сторона — игрок 2
                            <select
                              value={doubleYellowSecondPlayerId}
                              onChange={(event) => setDoubleYellowSecondPlayerId(event.target.value)}
                            >
                              <option value="">Выберите игрока</option>
                              {players.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Белая сторона — игрок 1
                            <select
                              value={doubleWhiteFirstPlayerId}
                              onChange={(event) => setDoubleWhiteFirstPlayerId(event.target.value)}
                            >
                              <option value="">Выберите игрока</option>
                              {players.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Белая сторона — игрок 2
                            <select
                              value={doubleWhiteSecondPlayerId}
                              onChange={(event) => setDoubleWhiteSecondPlayerId(event.target.value)}
                            >
                              <option value="">Выберите игрока</option>
                              {players.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}
                    </>
                  )}

                  <div className="score-row">
                    <label>
                      Голы желтой
                      <input
                        type="number"
                        min={0}
                        value={scoreYellow}
                        onChange={(event) => setScoreYellow(Number(event.target.value))}
                      />
                    </label>
                    <label>
                      Голы белой
                      <input
                        type="number"
                        min={0}
                        value={scoreWhite}
                        onChange={(event) => setScoreWhite(Number(event.target.value))}
                      />
                    </label>
                  </div>

                  <button type="submit">Сохранить матч</button>
                </form>
              )}
            </article>
          </section>
        )}

        {activeTab === 'competitions' && (
          <section className="stack">
            <article className="panel">
              <h2>Создать соревнование</h2>
              <form className="form-grid" onSubmit={createTournament}>
                <label>
                  Название
                  <input
                    value={newCompetitionName}
                    onChange={(event) => setNewCompetitionName(event.target.value)}
                    placeholder="Например, Friday Cup"
                  />
                </label>

                <label>
                  Тип
                  <select
                    value={newCompetitionType}
                    onChange={(event) => setNewCompetitionType(event.target.value as CompetitionType)}
                  >
                    <option value="friendly">Дружеские матчи</option>
                    <option value="ladder">Рейтинговая сетка (очки)</option>
                    <option value="bracket">Плей-офф сетка</option>
                  </select>
                </label>

                <label>
                  Режим
                  <select
                    value={newCompetitionMode}
                    onChange={(event) => setNewCompetitionMode(event.target.value as CompetitionMode)}
                  >
                    {newCompetitionType === 'friendly' && <option value="mixed">Смешанный (1v1 + 2v2)</option>}
                    <option value="1v1">1 на 1</option>
                    <option value="2v2">2 на 2</option>
                  </select>
                </label>

                {newCompetitionType === 'ladder' && (
                  <div className="score-row">
                    <label>
                      Очков за победу
                      <input
                        type="number"
                        min={0}
                        value={newLadderWinPoints}
                        onChange={(event) => setNewLadderWinPoints(Number(event.target.value))}
                      />
                    </label>
                    <label>
                      Очков за поражение
                      <input
                        type="number"
                        min={0}
                        value={newLadderLossPoints}
                        onChange={(event) => setNewLadderLossPoints(Number(event.target.value))}
                      />
                    </label>
                  </div>
                )}

                {newCompetitionType !== 'friendly' && newCompetitionMode === '1v1' && (
                  <fieldset className="participant-box">
                    <legend>Участники 1 на 1</legend>
                    <div className="checkbox-grid">
                      {players.map((player) => (
                        <label key={player.id} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={draftSingleEntrants.includes(player.id)}
                            onChange={() => toggleSingleEntrantDraft(player.id)}
                          />
                          <span>{player.name}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {newCompetitionType !== 'friendly' && newCompetitionMode === '2v2' && (
                  <fieldset className="participant-box">
                    <legend>Команды 2 на 2</legend>
                    <div className="form-grid">
                      <label>
                        Игрок 1
                        <select
                          value={draftTeamFirstPlayerId}
                          onChange={(event) => setDraftTeamFirstPlayerId(event.target.value)}
                        >
                          <option value="">Выберите игрока</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Игрок 2
                        <select
                          value={draftTeamSecondPlayerId}
                          onChange={(event) => setDraftTeamSecondPlayerId(event.target.value)}
                        >
                          <option value="">Выберите игрока</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Название команды (опционально)
                        <input
                          value={draftTeamCustomName}
                          onChange={(event) => setDraftTeamCustomName(event.target.value)}
                          placeholder="Например, Yellow Kings"
                        />
                      </label>
                      <button className="secondary" type="button" onClick={addDraftTeam}>
                        Добавить команду
                      </button>
                    </div>
                    {draftTeamEntrants.length === 0 ? (
                      <p className="empty small">Пока нет команд.</p>
                    ) : (
                      <ul className="compact-list">
                        {draftTeamEntrants.map((team) => (
                          <li key={team.id}>
                            <span>{team.name}</span>
                            <button
                              className="ghost"
                              type="button"
                              onClick={() =>
                                setDraftTeamEntrants((previous) =>
                                  previous.filter((entry) => entry.id !== team.id),
                                )
                              }
                            >
                              Удалить
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </fieldset>
                )}

                <button type="submit">Создать соревнование</button>
              </form>
            </article>

            <article className="panel">
              <h2>Существующие соревнования</h2>
              {competitions.length === 0 ? (
                <p className="empty">Соревнований пока нет.</p>
              ) : (
                <div className="competition-stack">
                  {competitions.map((competition) => (
                    <section key={competition.id} className="competition-card">
                      <header>
                        <h3>{competition.name}</h3>
                        <p>
                          {competitionTypeLabel[competition.type]} • {modeLabel[competition.mode]}
                        </p>
                      </header>

                      {competition.type === 'friendly' && (
                        <p className="small">
                          Дружеские матчи автоматически учитываются в винрейте и общей статистике.
                        </p>
                      )}

                      {competition.type === 'ladder' && (
                        <>
                          <p className="small">
                            Начисление очков: победа {competition.points.win}, поражение{' '}
                            {competition.points.loss}.
                          </p>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Участник</th>
                                  <th>И</th>
                                  <th>В</th>
                                  <th>П</th>
                                  <th>ГЗ/ГП</th>
                                  <th>РГ</th>
                                  <th>О</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(ladderTables.get(competition.id) ?? []).map((row, index) => (
                                  <tr key={row.entrantId}>
                                    <td>{index + 1}</td>
                                    <td>{row.name}</td>
                                    <td>{row.matches}</td>
                                    <td>{row.wins}</td>
                                    <td>{row.losses}</td>
                                    <td>
                                      {row.goalsFor}/{row.goalsAgainst}
                                    </td>
                                    <td>{row.goalDiff}</td>
                                    <td>{row.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      {competition.type === 'bracket' && (
                        <>
                          <div className="bracket-wrap">
                            {competition.bracketRounds.map((round, roundIndex) => (
                              <div key={round.id} className="bracket-round">
                                <h4>{round.name}</h4>
                                <div className="bracket-matches">
                                  {round.matches.map((match, matchIndex) => {
                                    const isEditing =
                                      editingBracketMatch?.competitionId === competition.id &&
                                      editingBracketMatch.roundIndex === roundIndex &&
                                      editingBracketMatch.matchIndex === matchIndex

                                    return (
                                      <article key={match.id} className="bracket-match">
                                        <p
                                          className={`entry ${
                                            match.winnerEntrantId === match.yellowEntrantId ? 'winner' : ''
                                          }`}
                                        >
                                          <span>{entrantNameById(competition, match.yellowEntrantId)}</span>
                                          <span>{match.scoreYellow ?? '—'}</span>
                                        </p>
                                        <p
                                          className={`entry ${
                                            match.winnerEntrantId === match.whiteEntrantId ? 'winner' : ''
                                          }`}
                                        >
                                          <span>{entrantNameById(competition, match.whiteEntrantId)}</span>
                                          <span>{match.scoreWhite ?? '—'}</span>
                                        </p>
                                        {match.autoAdvanced && (
                                          <p className="small">Автопроход по BYE</p>
                                        )}
                                        {!match.completed &&
                                          match.yellowEntrantId &&
                                          match.whiteEntrantId &&
                                          !isEditing && (
                                            <button
                                              className="secondary"
                                              type="button"
                                              onClick={() =>
                                                openBracketEditor(competition.id, roundIndex, matchIndex)
                                              }
                                            >
                                              Внести результат
                                            </button>
                                          )}
                                        {isEditing && (
                                          <form className="inline-form" onSubmit={confirmBracketResult}>
                                            <div className="score-row">
                                              <label>
                                                Желтая
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={editingBracketMatch.scoreYellow}
                                                  onChange={(event) =>
                                                    setEditingBracketMatch((previous) =>
                                                      previous
                                                        ? {
                                                            ...previous,
                                                            scoreYellow: Number(event.target.value),
                                                          }
                                                        : previous,
                                                    )
                                                  }
                                                />
                                              </label>
                                              <label>
                                                Белая
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={editingBracketMatch.scoreWhite}
                                                  onChange={(event) =>
                                                    setEditingBracketMatch((previous) =>
                                                      previous
                                                        ? {
                                                            ...previous,
                                                            scoreWhite: Number(event.target.value),
                                                          }
                                                        : previous,
                                                    )
                                                  }
                                                />
                                              </label>
                                            </div>
                                            <div className="inline-actions">
                                              <button type="submit">Сохранить</button>
                                              <button
                                                className="ghost"
                                                type="button"
                                                onClick={() => setEditingBracketMatch(null)}
                                              >
                                                Отмена
                                              </button>
                                            </div>
                                          </form>
                                        )}
                                      </article>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                          {competition.bracketRounds.length === 0 && (
                            <p className="empty small">Недостаточно участников для построения сетки.</p>
                          )}
                        </>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
