import { coveragePercent } from '@/lib/helpers'

interface CoverageBarProps {
  met: number
  total: number
  showLabel?: boolean
  className?: string
}

export function CoverageBar({ met, total, showLabel = true, className = '' }: CoverageBarProps) {
  const pct = coveragePercent(met, total)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {met} met
        </span>
      )}
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap">
        {pct}%
      </span>
    </div>
  )
}
