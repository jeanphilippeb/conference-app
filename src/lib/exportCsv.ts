import { Target } from '@/lib/types'

function esc(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildInteractionsCsv(targets: Target[], conferenceName: string): string {
  const columns = [
    'conference',
    'target_first_name',
    'target_last_name',
    'target_company',
    'target_priority',
    'rep_name',
    'status',
    'score',
    'notes',
    'follow_up',
    'met_at',
  ]

  const rows: string[] = [columns.join(',')]

  for (const target of targets) {
    for (const interaction of target.interactions ?? []) {
      rows.push(
        [
          esc(conferenceName),
          esc(target.first_name),
          esc(target.last_name),
          esc(target.company),
          esc(target.priority),
          esc(interaction.profile?.name ?? interaction.user_id),
          esc(interaction.status),
          esc(interaction.score),
          esc(interaction.notes),
          esc(interaction.follow_up),
          esc(interaction.met_at),
        ].join(',')
      )
    }
  }

  return rows.join('\n')
}

export async function shareOrDownloadCsv(csvContent: string, filename: string): Promise<void> {
  const file = new File([csvContent], filename, { type: 'text/csv' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename.replace('.csv', ''),
      })
      return
    } catch (err) {
      // User cancelled share — don't fall through to download
      if (err instanceof Error && err.name === 'AbortError') return
    }
  }

  // Fallback: trigger browser download
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
