import { Priority } from './types'
import { format, parseISO } from 'date-fns'

export function getInitials(firstName: string, lastName: string): string {
  const f = (firstName || '').trim()
  const l = (lastName || '').trim()
  if (!f && !l) return '?'
  return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase()
}

const INITIALS_COLORS = [
  'bg-violet-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-pink-600',
  'bg-orange-600',
]

export function getInitialsColorClass(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % INITIALS_COLORS.length
  return INITIALS_COLORS[index]
}

export function getPriorityBorderClass(priority: Priority): string {
  switch (priority) {
    case 'must_meet':
      return 'border-l-4 border-l-red-500'
    case 'should_meet':
      return 'border-l-4 border-l-orange-500'
    case 'nice_to_have':
      return ''
    default:
      return ''
  }
}

export function getPriorityDotClass(priority: Priority): string {
  switch (priority) {
    case 'must_meet':
      return 'bg-red-500'
    case 'should_meet':
      return 'bg-orange-500'
    case 'nice_to_have':
      return 'bg-slate-500'
    default:
      return 'bg-slate-500'
  }
}

export function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'must_meet':
      return 'Must Meet'
    case 'should_meet':
      return 'Should Meet'
    case 'nice_to_have':
      return 'Nice to Have'
    default:
      return 'Unknown'
  }
}

export function getPriorityBadgeClasses(priority: Priority): { bg: string; text: string } {
  switch (priority) {
    case 'must_meet':
      return { bg: 'bg-red-500/20', text: 'text-red-400' }
    case 'should_meet':
      return { bg: 'bg-orange-500/20', text: 'text-orange-400' }
    case 'nice_to_have':
      return { bg: 'bg-slate-700', text: 'text-slate-400' }
    default:
      return { bg: 'bg-slate-700', text: 'text-slate-400' }
  }
}

export function formatDateRange(start: string, end: string): string {
  try {
    const startDate = parseISO(start)
    const endDate = parseISO(end)
    const startMonth = format(startDate, 'MMM d')
    const endPart = format(startDate, 'MMM') === format(endDate, 'MMM')
      ? format(endDate, 'd')
      : format(endDate, 'MMM d')
    return `${startMonth}–${endPart}, ${format(endDate, 'yyyy')}`
  } catch {
    return `${start} – ${end}`
  }
}

export function coveragePercent(met: number, total: number): number {
  if (total === 0) return 0
  return Math.round((met / total) * 100)
}
