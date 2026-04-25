// src/components/StreakCard.jsx
function StreakCard({ streak }) {

  // Streak ke hisaab se message
  const getMessage = () => {
    if (streak === 0) return { emoji: '😴', text: 'Aaj study karo — streak shuru karo!' }
    if (streak < 3)  return { emoji: '🌱', text: 'Achha shuru! Keep going!' }
    if (streak < 7)  return { emoji: '🔥', text: 'Wah! ' + streak + ' din se study kar raha hai!' }
    if (streak < 14) return { emoji: '⚡', text: 'Zabardast! Ek hafte se zyada!' }
    if (streak < 30) return { emoji: '🏆', text: 'Champion! ' + streak + ' din ki streak!' }
    return { emoji: '👑', text: 'LEGEND! ' + streak + ' din! Incredible!' }
  }

  const msg = getMessage()

  // Streak flames — kitni bhari hain
  const flames = Math.min(streak, 7)

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-amber-200 rounded-2xl p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-amber-700">
            Daily Streak
          </p>
          <p className="text-4xl font-bold text-amber-600 mt-1">
            {streak}
            <span className="text-lg font-normal text-amber-500 ml-1">
              {streak === 1 ? 'din' : 'din'}
            </span>
          </p>
        </div>
        <div className="text-5xl">{msg.emoji}</div>
      </div>

      {/* Flame indicators */}
      <div className="flex gap-1 mb-3">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-all ${
              i < flames
                ? 'bg-amber-400'
                : 'bg-amber-100'
            }`}
          />
        ))}
      </div>

      {/* Message */}
      <p className="text-xs text-amber-600 font-medium">
        {msg.text}
      </p>

    </div>
  )
}

export default StreakCard