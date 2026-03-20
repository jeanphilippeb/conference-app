import { useState, useEffect } from 'react'
import { useGame } from '@/context/GameContext'
import { MetalLevelDetail } from './MetalLevelDetail'
import { useParams } from 'react-router'
import { Leaderboard } from './Leaderboard'
import { supabase } from '@/lib/supabase'

export function MetalLevelBadge() {
  const { currentLevel, lifetimeScore } = useGame()
  const { conferenceId } = useParams<{ conferenceId: string }>()
  const [showDetail, setShowDetail] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [conferenceName, setConferenceName] = useState<string>()

  useEffect(() => {
    if (!conferenceId) return
    supabase
      .from('conference_conferences')
      .select('name')
      .eq('id', conferenceId)
      .single()
      .then(({ data }) => { if (data) setConferenceName(data.name) })
  }, [conferenceId])

  return (
    <>
      <div className="flex items-center gap-1.5 bg-slate-800 rounded-full pl-1 pr-2.5 py-1">
        {/* Creature — tap opens level detail */}
        <button
          onClick={() => setShowDetail(true)}
          className="w-7 h-7 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center flex-shrink-0 hover:ring-2 hover:ring-yellow-400/40 transition-all"
        >
          <img
            src={currentLevel.icon}
            alt={currentLevel.creatureName}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </button>

        {/* Name + score — tap opens leaderboard */}
        <button
          onClick={() => setShowLeaderboard(true)}
          className="flex flex-col items-start leading-none"
        >
          <span className="text-white text-[11px] font-bold">{currentLevel.creatureName}</span>
          <span className="text-yellow-400 text-[9px] font-semibold">⚡ {lifetimeScore}</span>
        </button>
      </div>

      {showDetail && (
        <MetalLevelDetail onClose={() => setShowDetail(false)} />
      )}

      {showLeaderboard && conferenceId && (
        <Leaderboard
          conferenceId={conferenceId}
          conferenceName={conferenceName}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </>
  )
}
