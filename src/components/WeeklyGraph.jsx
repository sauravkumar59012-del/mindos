// src/components/WeeklyGraph.jsx
// Pure CSS bar graph — koi library nahi!

function WeeklyGraph({ data }) {

  // Max value dhundho — graph scale ke liye
  const maxCount = Math.max(...data.map(d => d.count), 1)

  // Total cards is hafte
  const totalWeek = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-gray-800">
            📈 Weekly Progress
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
          This week {totalWeek} cards review 
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-purple-700">{totalWeek}</p>
          <p className="text-xs text-gray-400">this week</p>
        </div>
      </div>

      {/* Bar Graph */}
      <div className="flex items-end justify-between gap-2 h-32">
        {data.map((day, i) => {

          // Bar ki height calculate karo
          const heightPercent = maxCount > 0
            ? Math.max((day.count / maxCount) * 100, 4)
            : 4

          return (
            <div
              key={i}
              className="flex flex-col items-center flex-1 h-full justify-end gap-1"
            >
              {/* Count label */}
              {day.count > 0 && (
                <span className="text-xs font-semibold text-gray-600">
                  {day.count}
                </span>
              )}

              {/* Bar */}
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${
                  day.isToday
                    ? 'bg-purple-600'
                    : day.count > 0
                    ? 'bg-purple-300'
                    : 'bg-gray-100'
                }`}
                style={{ height: `${heightPercent}%` }}
              />

              {/* Day label */}
              <span className={`text-xs font-medium ${
                day.isToday ? 'text-purple-700' : 'text-gray-400'
              }`}>
                {day.isToday ? 'Aaj' : day.day}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-600"/>
          <span className="text-xs text-gray-500">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-300"/>
          <span className="text-xs text-gray-500">Yesterday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-200"/>
          <span className="text-xs text-gray-500">No Study</span>
        </div>
      </div>

    </div>
  )
}

export default WeeklyGraph