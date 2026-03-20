import { useTheme } from '@/context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span className="text-base">{theme === 'light' ? '🌙' : '☀️'}</span>
    </button>
  )
}
