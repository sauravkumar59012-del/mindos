// src/components/StatsCard.jsx
function StatsCard({ icon, label, value, sub, color }) {

  const colors = {
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    blue:   'bg-blue-50   border-blue-200   text-blue-700',
    green:  'bg-green-50  border-green-200  text-green-700',
    amber:  'bg-amber-50  border-amber-200  text-amber-700',
    red:    'bg-red-50    border-red-200    text-red-700',
  }

  const textColors = {
    purple: 'text-purple-700',
    blue:   'text-blue-700',
    green:  'text-green-700',
    amber:  'text-amber-700',
    red:    'text-red-700',
  }

  return (
    <div className={`rounded-2xl border p-4 ${colors[color] || colors.purple}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${textColors[color] || textColors.purple}`}>
        {value}
      </p>
      <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
      {sub && (
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      )}
    </div>
  )
}

export default StatsCard