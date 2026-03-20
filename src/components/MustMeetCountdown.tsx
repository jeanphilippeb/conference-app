import { useMemo } from 'react'

type UrgencyState = 'green' | 'orange' | 'red' | 'red-pulse'

function getUrgencyState(
  conferenceStart: Date,
  conferenceEnd: Date,
  mustMeetTotal: number,
  mustMeetDone: number
): UrgencyState {
  if (mustMeetTotal === 0) return 'green'

  const now = new Date()
  const totalDuration = conferenceEnd.getTime() - conferenceStart.getTime()
  const elapsed = now.getTime() - conferenceStart.getTime()
  const timeElapsedPct = Math.min(Math.max(elapsed / totalDuration, 0), 1)
  const donePct = mustMeetDone / mustMeetTotal

  const isLastDay = now.toDateString() === conferenceEnd.toDateString()
  const remaining = mustMeetTotal - mustMeetDone

  if (isLastDay && remaining > 3) return 'red-pulse'
  if (donePct >= timeElapsedPct + 0.1) return 'green'
  if (donePct >= timeElapsedPct - 0.15) return 'orange'
  return 'red'
}

function getDayProgress(start: Date, end: Date): string {
  const now = new Date()
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const currentDay = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const day = Math.max(1, Math.min(currentDay, totalDays))
  return `Day ${day}/${totalDays}`
}

interface MustMeetCountdownProps {
  conferenceStart: string
  conferenceEnd: string
  mustMeetTotal: number
  mustMeetDone: number
}

const URGENCY_STYLES: Record<UrgencyState, { bg: string; text: string; dot: string }> = {
  green:     { bg: 'bg-green-500/10 border-green-500/20',  text: 'text-green-400',  dot: '🟢' },
  orange:    { bg: 'bg-orange-400/10 border-orange-400/20', text: 'text-orange-300', dot: '🟠' },
  red:       { bg: 'bg-red-500/10 border-red-500/20',      text: 'text-red-400',    dot: '🔴' },
  'red-pulse': { bg: 'bg-red-500/10 border-red-500/20',    text: 'text-red-400',    dot: '🔴' },
}

const URGENCY_MESSAGES: Record<UrgencyState, (x: number) => string> = {
  green:     (x) => `🟢 ${x} Must-Meet left — great pace!`,
  orange:    (x) => `🟠 ${x} Must-Meet — time is ticking`,
  red:       (x) => `🔴 ${x} Must-Meet left — last day!`,
  'red-pulse': (x) => `🔴 ${x} Must-Meet left — NOW or never!`,
}

export function MustMeetCountdown({ conferenceStart, conferenceEnd, mustMeetTotal, mustMeetDone }: MustMeetCountdownProps) {
  const remaining = mustMeetTotal - mustMeetDone

  const { urgency, dayLabel } = useMemo(() => {
    const start = new Date(conferenceStart)
    const end = new Date(conferenceEnd)
    return {
      urgency: getUrgencyState(start, end, mustMeetTotal, mustMeetDone),
      dayLabel: getDayProgress(start, end),
    }
  }, [conferenceStart, conferenceEnd, mustMeetTotal, mustMeetDone])

  if (mustMeetTotal === 0 || remaining === 0) return null

  const style = URGENCY_STYLES[urgency]
  const message = URGENCY_MESSAGES[urgency](remaining)

  return (
    <div className={`mx-4 mb-2 px-3 py-2 border rounded-xl flex items-center justify-between ${style.bg} ${
      urgency === 'red-pulse' ? 'animate-pulse' : ''
    }`}>
      <span className={`text-xs font-medium ${style.text}`}>{message}</span>
      <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">{dayLabel}</span>
    </div>
  )
}
