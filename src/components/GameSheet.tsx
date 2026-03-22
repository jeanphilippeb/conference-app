import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { useGameSheet } from '@/context/GameSheetContext'
import { useTargets } from '@/hooks/useTargets'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { SwipeableSheet } from './SwipeableSheet'
import { MetalLevelDetailContent } from './MetalLevelDetail'
import { LeaderboardContent } from './Leaderboard'

export function GameSheet() {
  const { isOpen, close, conferenceId, conferenceName } = useGameSheet()
  const { currentLevel, lifetimeScore } = useGame()
  const [tab, setTab] = useState<'profile' | 'leaderboard'>('profile')

  // Pre-load both data sources regardless of active tab
  const { targets, refetch: refetchTargets } = useTargets(conferenceId)
  const { entries, loading: leaderboardLoading, refetch: refetchLeaderboard } = useLeaderboard(conferenceId)

  const [refreshingLeaderboard, setRefreshingLeaderboard] = useState(false)
  const [refreshingTargets, setRefreshingTargets] = useState(false)

  const handleRefreshLeaderboard = async () => {
    setRefreshingLeaderboard(true)
    await refetchLeaderboard()
    setRefreshingLeaderboard(false)
  }

  const handleRefreshTargets = async () => {
    setRefreshingTargets(true)
    await refetchTargets()
    setRefreshingTargets(false)
  }

  return (
    <SwipeableSheet open={isOpen} onClose={close}>
      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 pb-4 pt-1 flex-shrink-0">
        <button
          onClick={() => setTab('profile')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'profile'
              ? 'bg-[var(--bg-deep)] text-[var(--text)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 rounded-full overflow-hidden inline-block">
              <img src={currentLevel.icon} alt="" className="w-full h-full object-cover" />
            </div>
            My Profile
          </span>
        </button>
        <button
          onClick={() => setTab('leaderboard')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'leaderboard'
              ? 'bg-[var(--bg-deep)] text-[var(--text)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          🏆 Leaderboard
        </button>

        {/* Refresh button — context-aware */}
        <button
          onClick={tab === 'leaderboard' ? handleRefreshLeaderboard : handleRefreshTargets}
          disabled={tab === 'leaderboard' ? refreshingLeaderboard : refreshingTargets}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-deep)] transition-colors flex-shrink-0 disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[var(--text-muted)] ${(tab === 'leaderboard' ? refreshingLeaderboard : refreshingTargets) ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {tab === 'profile' ? (
        <MetalLevelDetailContent targets={targets} lifetimeScore={lifetimeScore} currentLevel={currentLevel} />
      ) : (
        <LeaderboardContent
          conferenceId={conferenceId}
          conferenceName={conferenceName}
          targets={targets}
          entries={entries}
          loading={leaderboardLoading}
        />
      )}
    </SwipeableSheet>
  )
}
