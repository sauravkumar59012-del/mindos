// src/pages/Pomodoro.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate }                  from 'react-router-dom'
import { supabase }                     from '../lib/supabase'

// ================================
// TIMER MODES
// ================================
const MODES = {
  focus:       { label: '🎯 Focus',        minutes: 25, color: 'purple' },
  short_break: { label: '☕ Short Break',   minutes: 5,  color: 'green'  },
  long_break:  { label: '🌴 Long Break',   minutes: 15, color: 'blue'   },
}

function Pomodoro() {
  const navigate = useNavigate()

  // Timer state
  const [mode,        setMode]        = useState('focus')
  const [timeLeft,    setTimeLeft]    = useState(MODES.focus.minutes * 60)
  const [isRunning,   setIsRunning]   = useState(false)
  const [sessions,    setSessions]    = useState(0)
  const [totalFocus,  setTotalFocus]  = useState(0)
  const [showDone,    setShowDone]    = useState(false)

  // Settings
  const [focusMin,    setFocusMin]    = useState(25)
  const [shortMin,    setShortMin]    = useState(5)
  const [longMin,     setLongMin]     = useState(15)
  const [showSettings,setShowSettings]= useState(false)

  // Task
  const [task,        setTask]        = useState('')
  const [taskInput,   setTaskInput]   = useState('')

  const intervalRef = useRef(null)
  const audioRef    = useRef(null)

  // ================================
  // Timer Logic
  // ================================
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer khatam!
            clearInterval(intervalRef.current)
            setIsRunning(false)
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }

    return () => clearInterval(intervalRef.current)
  }, [isRunning, mode])

  // ================================
  // Timer Complete
  // ================================
  function handleTimerComplete() {
    // Sound play karo
    playSound()

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('MindOS 🧠', {
        body: mode === 'focus'
          ? '🎉 Focus session complete! Break lo!'
          : '💪 Break khatam! Study shuru karo!',
        icon: '/favicon.ico'
      })
    }

    if (mode === 'focus') {
      const newSessions = sessions + 1
      setSessions(newSessions)
      setTotalFocus(prev => prev + focusMin)
      setShowDone(true)

      // Save to Supabase
      saveSession(focusMin)

      // Auto switch to break
      setTimeout(() => {
        setShowDone(false)
        if (newSessions % 4 === 0) {
          switchMode('long_break')
        } else {
          switchMode('short_break')
        }
      }, 3000)
    } else {
      switchMode('focus')
    }
  }

  // ================================
  // Mode Switch
  // ================================
  function switchMode(newMode) {
    setMode(newMode)
    setIsRunning(false)
    const minutes = newMode === 'focus'
      ? focusMin
      : newMode === 'short_break'
      ? shortMin
      : longMin
    setTimeLeft(minutes * 60)
  }

  // ================================
  // Save Session to Supabase
  // ================================
  async function saveSession(minutes) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // daily_stats update karo
      const today = new Date().toISOString().split('T')[0]

      const { data: existing } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      if (existing) {
        await supabase
          .from('daily_stats')
          .update({
            study_minutes: (existing.study_minutes || 0) + minutes
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('daily_stats')
          .insert({
            user_id:       user.id,
            date:          today,
            study_minutes: minutes,
          })
      }
    } catch (err) {
      console.error('Save session error:', err)
    }
  }

  // ================================
  // Sound
  // ================================
  function playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2)

      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) {
      console.log('Sound error:', e)
    }
  }

  // ================================
  // Notification Permission
  // ================================
  function requestNotification() {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  // ================================
  // Format Time
  // ================================
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ================================
  // Progress Percentage
  // ================================
  function getProgress() {
    const total = mode === 'focus'
      ? focusMin * 60
      : mode === 'short_break'
      ? shortMin * 60
      : longMin * 60
    return ((total - timeLeft) / total) * 100
  }

  // Color scheme
  const colors = {
    purple: {
      bg:     'from-purple-600 to-indigo-600',
      light:  'bg-purple-100',
      text:   'text-purple-700',
      btn:    'bg-purple-600 hover:bg-purple-700',
      ring:   'stroke-purple-500',
    },
    green: {
      bg:     'from-green-500 to-teal-500',
      light:  'bg-green-100',
      text:   'text-green-700',
      btn:    'bg-green-500 hover:bg-green-600',
      ring:   'stroke-green-500',
    },
    blue: {
      bg:     'from-blue-500 to-cyan-500',
      light:  'bg-blue-100',
      text:   'text-blue-700',
      btn:    'bg-blue-500 hover:bg-blue-600',
      ring:   'stroke-blue-500',
    },
  }

  const currentColor = colors[MODES[mode].color]
  const progress     = getProgress()

  // Circle calculations
  const radius      = 90
  const circumference = 2 * Math.PI * radius
  const strokeDash  = circumference - (progress / 100) * circumference

  // ================================
  // RENDER
  // ================================
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">⏱️</span>
              <span className="font-bold text-gray-800">Pomodoro Timer</span>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ⚙️
          </button>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">⚙️ Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: '🎯 Focus', value: focusMin, setter: setFocusMin, min: 1, max: 60 },
                { label: '☕ Short', value: shortMin, setter: setShortMin, min: 1, max: 30 },
                { label: '🌴 Long',  value: longMin,  setter: setLongMin,  min: 1, max: 60 },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    {item.label}
                  </label>
                  <input
                    type="number"
                    value={item.value}
                    min={item.min}
                    max={item.max}
                    onChange={e => {
                      item.setter(Number(e.target.value))
                      if (!isRunning) switchMode(mode)
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <span className="text-xs text-gray-400">min</span>
                </div>
              ))}
            </div>
            <button
              onClick={requestNotification}
              className="mt-4 w-full text-sm bg-yellow-50 text-yellow-700 border border-yellow-200 py-2 rounded-xl hover:bg-yellow-100 transition"
            >
              🔔 Notifications Enable Karo
            </button>
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex bg-white border border-gray-200 rounded-2xl p-1 mb-5 shadow-sm">
          {Object.entries(MODES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                mode === key
                  ? `${currentColor.light} ${currentColor.text}`
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {val.label}
            </button>
          ))}
        </div>

        {/* Task Input */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 shadow-sm">
          {task ? (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                📌 {task}
              </p>
              <button
                onClick={() => setTask('')}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && taskInput.trim()) {
                    setTask(taskInput.trim())
                    setTaskInput('')
                  }
                }}
                placeholder="Aaj kya padhna hai? (Enter dabao)"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={() => {
                  if (taskInput.trim()) {
                    setTask(taskInput.trim())
                    setTaskInput('')
                  }
                }}
                className="bg-purple-600 text-white px-4 rounded-xl text-sm hover:bg-purple-700"
              >
                Set
              </button>
            </div>
          )}
        </div>

        {/* Timer Circle */}
        <div className={`bg-gradient-to-br ${currentColor.bg} rounded-3xl p-8 mb-5 shadow-lg`}>

          {/* Done Animation */}
          {showDone && (
            <div className="text-center mb-4 animate-bounce">
              <p className="text-white text-2xl font-bold">
                🎉 Session Complete!
              </p>
            </div>
          )}

          {/* SVG Circle Timer */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <svg width="220" height="220" className="-rotate-90">

                {/* Background circle */}
                <circle
                  cx="110" cy="110" r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="12"
                />

                {/* Progress circle */}
                <circle
                  cx="110" cy="110" r={radius}
                  fill="none"
                  stroke="white"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDash}
                  className="transition-all duration-1000"
                />
              </svg>

              {/* Time Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-5xl font-bold text-white tracking-wider">
                  {formatTime(timeLeft)}
                </p>
                <p className="text-white/70 text-sm mt-1">
                  {MODES[mode].label}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">

            {/* Reset */}
            <button
              onClick={() => {
                setIsRunning(false)
                switchMode(mode)
              }}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition text-lg"
            >
              ↺
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition active:scale-95"
            >
              <span className={`text-3xl ${currentColor.text}`}>
                {isRunning ? '⏸' : '▶️'}
              </span>
            </button>

            {/* Skip */}
            <button
              onClick={() => {
                setIsRunning(false)
                const modes = ['focus', 'short_break', 'long_break']
                const next  = modes[(modes.indexOf(mode) + 1) % modes.length]
                switchMode(next)
              }}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition text-lg"
            >
              ⏭
            </button>
          </div>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-700">{sessions}</p>
            <p className="text-xs text-gray-500 mt-1">Sessions</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{totalFocus}</p>
            <p className="text-xs text-gray-500 mt-1">Minutes</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">
              {Math.floor(sessions / 4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Cycles</p>
          </div>
        </div>

        {/* Session Progress Dots */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-600 mb-3">
            📊 Session Progress (4 sessions = 1 cycle)
          </p>
          <div className="flex gap-2 flex-wrap">
            {[...Array(Math.max(8, sessions + 1))].map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < sessions
                    ? 'bg-purple-600 text-white'
                    : i === sessions && mode === 'focus' && isRunning
                    ? 'bg-purple-200 text-purple-700 animate-pulse'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i < sessions ? '✓' : i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-indigo-700 mb-2">
            💡 Pomodoro Tips:
          </p>
          <ul className="text-xs text-indigo-600 space-y-1">
            <li>• 25 min focus + 5 min break = 1 Pomodoro</li>
            <li>• 4 Pomodoros ke baad 15 min long break lo</li>
            <li>• Phone door rakho focus session mein</li>
            <li>• Ek kaam pe focus karo — multitask mat karo</li>
          </ul>
        </div>

      </div>
    </div>
  )
}

export default Pomodoro