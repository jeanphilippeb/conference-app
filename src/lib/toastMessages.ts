export const TOAST_MESSAGES = {
  met_must: [
    '🎯 Big fish, captured. +{pts} pts',
    '🔥 Your boss would be proud. Maybe.',
    '💰 That one\'s worth gold. Literally.',
    '🦈 Shark mode activated. +{pts} pts',
    '📈 The deal starts with a coffee. Well played.',
    '🏹 Headshot. Must-Meet down. +{pts} pts',
    '👊 Andrea owes you a beer.',
    '🎪 Main character energy right there.',
    '⚡ That\'s what we came here for. +{pts} pts',
    '🥊 Knocked it out of the park.',
    '🗡️ Surgical precision. +{pts} pts',
    '🏄 Smooth operator. +{pts} pts',
  ],
  met_should: [
    '✅ Solid. Pipeline is filling up. +{pts} pts',
    '🎣 Nice catch. +{pts} pts',
    '📋 One more down. Keep moving.',
    '🤝 Network expanding. +{pts} pts',
    '💪 Steady work. The grind pays off.',
    '🧲 They didn\'t stand a chance.',
  ],
  met_nice: [
    '👋 Bonus points! Every contact counts. +{pts} pts',
    '🌱 Seed planted. +{pts} pts',
    '📇 +1 in the rolodex.',
    '🎲 You never know where this one leads. +{pts} pts',
    '🌊 Casting a wide net. Smart.',
  ],
  note_added: [
    '🧠 Future you will be grateful. +{pts} pts',
    '📝 Intel saved. CIA vibes.',
    '💡 That note is worth more than you think.',
    '🗂️ Memory augmented. You\'re a machine. +{pts} pts',
    '📖 This is how deals get closed.',
    '🔍 Details matter. Good instinct.',
  ],
  followup_added: [
    '📬 Post-conf game is strong. +{pts} pts',
    '🎯 The real closing starts after the conf.',
    '📅 Future deal in the making. +{pts} pts',
    '🚀 Follow-through is a superpower.',
    '💼 That\'s how pipelines are built.',
  ],
  app_open: [
    '☕ Coffee + ConferenceHQ = deals.',
    '🌅 New day, new contacts. Let\'s go.',
    '👔 You\'re going to crush this day.',
    '🎪 The floor is yours. Go get \'em.',
    '⚡ {creature_name} is ready to hunt.',
    '🏟️ The arena awaits, {creature_name}.',
  ],
  streak: [
    '🔥🔥🔥 ON FIRE. Unstoppable. ×{mult} next!',
    '⚡ Streak ×{streak}! Drinks are on you tonight.',
    '🏎️ Speed networking level: expert.',
    '🎰 Contact jackpot. ×{mult} next!',
    '💨 They can\'t even see you coming.',
    '⛓️ Chain combo! Keep it going!',
  ],
  grand_slam: [
    '👑 GRAND SLAM. Every Must-Meet is down.',
    '🍾 Champagne. You cleaned house.',
    '🐐 GOAT status unlocked.',
    '🎆 Flawless victory. Take a bow.',
  ],
  level_up: [
    '⬆️ {old_name} evolved into {new_name}!',
    '✨ Evolution complete! Say hello to {new_name}.',
    '🆙 {new_name} has entered the chat. {tagline}.',
    '🔥 {old_name} is gone. {new_name} is here. Let\'s go.',
  ],
  achievement: [
    '🏅 Achievement unlocked: {badge_name}!',
    '🎖️ New badge: {badge_name}. You earned it.',
    '⭐ {badge_name} — added to the trophy wall.',
  ],
} as const

export type ToastCategory = keyof typeof TOAST_MESSAGES

const lastToastByCategory: Partial<Record<ToastCategory, string>> = {}

export function getRandomToast(category: ToastCategory, vars?: Record<string, string | number>): string {
  const messages = TOAST_MESSAGES[category] as readonly string[]
  const last = lastToastByCategory[category]
  let msg = messages[Math.floor(Math.random() * messages.length)]
  let attempts = 0
  while (msg === last && messages.length > 1 && attempts < 10) {
    msg = messages[Math.floor(Math.random() * messages.length)]
    attempts++
  }
  lastToastByCategory[category] = msg
  if (vars) {
    Object.entries(vars).forEach(([key, val]) => {
      msg = msg.replaceAll(`{${key}}`, String(val))
    })
  }
  return msg
}

export const TOAST_BORDER_COLORS: Record<ToastCategory, string> = {
  met_must:       '#E53E3E',
  met_should:     '#ED8936',
  met_nice:       '#718096',
  note_added:     '#3B82F6',
  followup_added: '#8B5CF6',
  streak:         '#FBBF24',
  grand_slam:     '#FBBF24',
  level_up:       '#F59E0B',
  app_open:       '#38A169',
  achievement:    '#38A169',
}
