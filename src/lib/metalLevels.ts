export interface MetalLevel {
  level: number
  creatureName: string
  title: string
  icon: string
  emoji: string
  tagline: string
  cumulativePoints: number
}

export const METAL_LEVELS: MetalLevel[] = [
  { level: 1,  creatureName: 'Nugby',    title: 'Tin Rookie',       icon: '/assets/characters/metal-01-nugby-tin.png',         emoji: '🪨', tagline: 'Fresh out of the mine',    cumulativePoints: 0 },
  { level: 2,  creatureName: 'Coprix',   title: 'Copper Scout',     icon: '/assets/characters/metal-02-coprix-copper.png',     emoji: '🟤', tagline: 'Getting warmed up',        cumulativePoints: 50 },
  { level: 3,  creatureName: 'Bronzle',  title: 'Bronze Networker', icon: '/assets/characters/metal-03-bronzle-bronze.png',    emoji: '🥉', tagline: 'Finding your groove',      cumulativePoints: 150 },
  { level: 4,  creatureName: 'Ferrox',   title: 'Iron Hunter',      icon: '/assets/characters/metal-04-ferrox-iron.png',       emoji: '⚙️', tagline: 'Reliable and relentless',  cumulativePoints: 350 },
  { level: 5,  creatureName: 'Steelyx',  title: 'Steel Closer',     icon: '/assets/characters/metal-05-steelyx-steel.png',     emoji: '🔩', tagline: 'Nothing gets past you',    cumulativePoints: 700 },
  { level: 6,  creatureName: 'Titanos',  title: 'Titanium Shark',   icon: '/assets/characters/metal-06-titanos-titanium.png',  emoji: '🦈', tagline: 'Built different',          cumulativePoints: 1200 },
  { level: 7,  creatureName: 'Platinor', title: 'Platinum Dealer',  icon: '/assets/characters/metal-07-platinor-platinum.png', emoji: '💎', tagline: 'Elite status',             cumulativePoints: 2000 },
  { level: 8,  creatureName: 'Aurik',    title: 'Gold Legend',      icon: '/assets/characters/metal-08-aurik-gold.png',        emoji: '🥇', tagline: 'Walking Rolodex',          cumulativePoints: 3500 },
  { level: 9,  creatureName: 'Palladis', title: 'Palladium Master', icon: '/assets/characters/metal-09-palladis-palladium.png',emoji: '👁️', tagline: 'They come to YOU',        cumulativePoints: 5500 },
  { level: 10, creatureName: 'Rhodeon',  title: 'Rhodium God',      icon: '/assets/characters/metal-10-rhodeon-rhodium.png',   emoji: '🔱', tagline: 'Rarest of them all',       cumulativePoints: 8000 },
]

export function getCurrentLevel(lifetimeScore: number): MetalLevel {
  return [...METAL_LEVELS].reverse().find(l => lifetimeScore >= l.cumulativePoints) || METAL_LEVELS[0]
}

export function getNextLevel(lifetimeScore: number): MetalLevel | null {
  const current = getCurrentLevel(lifetimeScore)
  return METAL_LEVELS.find(l => l.level === current.level + 1) || null
}

export function getProgressToNext(lifetimeScore: number): { current: number; needed: number; pct: number } {
  const level = getCurrentLevel(lifetimeScore)
  const next = getNextLevel(lifetimeScore)
  if (!next) return { current: lifetimeScore - level.cumulativePoints, needed: 0, pct: 100 }
  const earned = lifetimeScore - level.cumulativePoints
  const needed = next.cumulativePoints - level.cumulativePoints
  return { current: earned, needed, pct: Math.min(100, Math.round((earned / needed) * 100)) }
}
