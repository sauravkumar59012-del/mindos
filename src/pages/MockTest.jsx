// src/pages/MockTest.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate }                  from 'react-router-dom'
import { supabase }                     from '../lib/supabase'

function MockTest() {
  const navigate = useNavigate()

  // ================================
  // SCREENS
  // setup   → Test configure karo
  // loading → AI questions bana raha hai
  // test    → Test chal raha hai
  // result  → Result dikha
  // ================================
  const [screen,    setScreen]    = useState('setup')
  const [notes,     setNotes]     = useState([])
  const [questions, setQuestions] = useState([])
  const [answers,   setAnswers]   = useState({})
  const [current,   setCurrent]   = useState(0)
  const [result,    setResult]    = useState(null)
  const [timeLeft,  setTimeLeft]  = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [message,   setMessage]   = useState(null)

  // Settings
  const [selectedNote, setSelectedNote] = useState('')
  const [questionCount,setQuestionCount]= useState(10)
  const [difficulty,   setDifficulty]   = useState('mixed')
  const [timeLimit,    setTimeLimit]    = useState(15)
  const [customTopic,  setCustomTopic]  = useState('')

  const timerRef = useRef(null)

  // ================================
  // Notes fetch karo
  // ================================
  useEffect(() => {
    fetchNotes()
  }, [])

  // Timer
  useEffect(() => {
    if (screen === 'test' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [screen, timeLeft])

  async function fetchNotes() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data } = await supabase
        .from('notes')
        .select('id, title, content, source')
        .order('created_at', { ascending: false })
        .limit(20)

      setNotes(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  // ================================
  // AI se Questions Generate Karo
  // ================================
  async function generateQuestions() {
    if (!selectedNote && !customTopic.trim()) {
      setMessage({ type: 'warn', text: '⚠️ Note select karo ya topic likho!' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Content decide karo
      let content = ''
      let title   = ''

      if (customTopic.trim()) {
        content = customTopic.trim()
        title   = customTopic.trim()
      } else {
        const note = notes.find(n => n.id === selectedNote)
        if (!note) throw new Error('Note nahi mila!')
        content = note.content
        title   = note.title
      }

      // Difficulty instruction
      const diffText = {
        easy:   'Sirf easy questions — basic definitions aur facts',
        medium: 'Medium difficulty — concept understanding test karo',
        hard:   'Hard questions — analysis aur application based',
        mixed:  'Mix of easy, medium aur hard questions',
      }[difficulty]

      // AI Prompt
      const prompt = `
Tu ek expert teacher hai jo multiple choice questions banata hai.

Topic/Content:
"""
${content.substring(0, 3000)}
"""

TASK: Exactly ${questionCount} MCQ questions banao.

Difficulty: ${diffText}

STRICT RULES:
- Har question ka exactly 4 options hona chahiye (A, B, C, D)
- Sirf ek sahi answer hona chahiye
- Options clearly different hone chahiye
- Questions topic se directly related hone chahiye
- Hindi-English mix allowed hai

Sirf valid JSON return karo:
{
  "title": "${title}",
  "questions": [
    {
      "id": 1,
      "question": "Question text yahan?",
      "options": {
        "A": "Option A",
        "B": "Option B", 
        "C": "Option C",
        "D": "Option D"
      },
      "correct": "A",
      "explanation": "Ye sahi hai kyunki...",
      "difficulty": "easy/medium/hard"
    }
  ]
}
      `

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:           'llama-3.3-70b-versatile',
          messages: [
            {
              role:    'system',
              content: 'Tu ek expert teacher hai. Hamesha valid JSON return kar.'
            },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          max_tokens:      3000,
          temperature:     0.7,
        })
      })

      const data   = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'AI error')

      const parsed = JSON.parse(data.choices[0].message.content)

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Questions generate nahi hue — dobara try karo!')
      }

      setQuestions(parsed.questions)
      setAnswers({})
      setCurrent(0)
      setTimeLeft(timeLimit * 60)
      setScreen('test')

    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: '❌ ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  // ================================
  // Answer Select Karo
  // ================================
  function selectAnswer(questionId, option) {
    setAnswers(prev => ({ ...prev, [questionId]: option }))
  }

  // ================================
  // Next Question
  // ================================
  function nextQuestion() {
    if (current < questions.length - 1) {
      setCurrent(prev => prev + 1)
    }
  }

  function prevQuestion() {
    if (current > 0) {
      setCurrent(prev => prev - 1)
    }
  }

  // ================================
  // Submit Test
  // ================================
  function handleSubmit() {
    clearInterval(timerRef.current)

    let correct   = 0
    let wrong     = 0
    let skipped   = 0
    const details = []

    questions.forEach(q => {
      const userAnswer = answers[q.id]
      if (!userAnswer) {
        skipped++
        details.push({ ...q, userAnswer: null, isCorrect: false })
      } else if (userAnswer === q.correct) {
        correct++
        details.push({ ...q, userAnswer, isCorrect: true })
      } else {
        wrong++
        details.push({ ...q, userAnswer, isCorrect: false })
      }
    })

    const score = Math.round((correct / questions.length) * 100)

    setResult({ correct, wrong, skipped, score, details, total: questions.length })
    setScreen('result')
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
  // Score Message
  // ================================
  function getScoreMessage(score) {
    if (score >= 90) return { emoji: '🏆', text: 'Outstanding! Tu toh genius hai!' }
    if (score >= 75) return { emoji: '🎯', text: 'Bahut badhiya! Keep it up!' }
    if (score >= 60) return { emoji: '💪', text: 'Achha tha! Aur practice karo!' }
    if (score >= 40) return { emoji: '📚', text: 'Mehnat karo — ho jaayega!' }
    return { emoji: '😤', text: 'Review karo aur dobara do!' }
  }

  const msgStyle = {
    success: 'bg-green-50  border-green-200  text-green-800',
    error:   'bg-red-50    border-red-200    text-red-800',
    warn:    'bg-yellow-50 border-yellow-200 text-yellow-800',
  }

  // ================================
  // SCREEN: SETUP
  // ================================
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50">

        {/* Navbar */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
            <span className="text-xl">📝</span>
            <span className="font-bold text-gray-800">Mock Test Generator</span>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4 py-6">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">📝</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              Mock Test Banao
            </h1>
            <p className="text-gray-400 text-sm">
              AI automatically MCQ questions banayega teri notes se!
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">

            {/* Note Select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📚 Notes Se Test Banao
              </label>
              <select
                value={selectedNote}
                onChange={e => {
                  setSelectedNote(e.target.value)
                  setCustomTopic('')
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                <option value="">-- Note select karo --</option>
                {notes.map(note => (
                  <option key={note.id} value={note.id}>
                    {note.title} ({note.source || 'General'})
                  </option>
                ))}
              </select>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200"/>
              <span className="text-xs text-gray-400 font-medium">YA</span>
              <div className="flex-1 h-px bg-gray-200"/>
            </div>

            {/* Custom Topic */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ✏️ Custom Topic Likho
              </label>
              <textarea
                value={customTopic}
                onChange={e => {
                  setCustomTopic(e.target.value)
                  setSelectedNote('')
                }}
                placeholder="e.g. Machine Learning, French Revolution, Photosynthesis..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </div>

            {/* Question Count */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔢 Kitne Questions?
              </label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${
                      questionCount === n
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                💪 Difficulty Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'easy',   label: '😊 Easy',   color: 'green'  },
                  { value: 'medium', label: '🤔 Medium', color: 'yellow' },
                  { value: 'hard',   label: '💪 Hard',   color: 'red'    },
                  { value: 'mixed',  label: '🎲 Mixed',  color: 'purple' },
                ].map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`py-2 rounded-xl text-sm font-semibold border transition ${
                      difficulty === d.value
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-400'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ⏱️ Time Limit
              </label>
              <div className="flex gap-2">
                {[5, 10, 15, 30].map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeLimit(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${
                      timeLimit === t
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-400'
                    }`}
                  >
                    {t} min
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`border rounded-xl p-3 text-sm font-medium text-center ${msgStyle[message.type]}`}>
                {message.text}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={generateQuestions}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-base hover:bg-purple-700 disabled:opacity-60 transition-all active:scale-95"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  AI Questions Bana Raha Hai...
                </span>
              ) : `✨ ${questionCount} Questions Generate Karo`}
            </button>

          </div>
        </div>
      </div>
    )
  }

  // ================================
  // SCREEN: TEST
  // ================================
  if (screen === 'test') {
    const q           = questions[current]
    const answered    = Object.keys(answers).length
    const userAnswer  = answers[q?.id]

    // Timer color
    const timerColor  = timeLeft < 60
      ? 'text-red-600 bg-red-50 border-red-200'
      : timeLeft < 300
      ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
      : 'text-green-600 bg-green-50 border-green-200'

    return (
      <div className="min-h-screen bg-gray-50">

        {/* Test Navbar */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">

            {/* Progress */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-600">
                {current + 1}/{questions.length}
              </span>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${((current + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Timer */}
            <div className={`border px-3 py-1 rounded-xl text-sm font-bold ${timerColor}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              className="bg-purple-600 text-white px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-purple-700 transition"
            >
              Submit
            </button>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4 py-6">

          {/* Question Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">

            {/* Question Meta */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
                Question {current + 1}
              </span>
              {q?.difficulty && (
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  q.difficulty === 'easy'   ? 'bg-green-100 text-green-700'  :
                  q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {q.difficulty === 'easy' ? '😊 Easy' : q.difficulty === 'medium' ? '🤔 Medium' : '💪 Hard'}
                </span>
              )}
            </div>

            {/* Question Text */}
            <p className="text-gray-800 font-semibold text-base leading-relaxed mb-6">
              {q?.question}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {q && Object.entries(q.options).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => selectAnswer(q.id, key)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                    userAnswer === key
                      ? 'border-purple-500 bg-purple-50 text-purple-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold mr-3 ${
                    userAnswer === key
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {key}
                  </span>
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={prevQuestion}
              disabled={current === 0}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:border-purple-400 disabled:opacity-40 transition"
            >
              ← Pehla
            </button>
            <button
              onClick={nextQuestion}
              disabled={current === questions.length - 1}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-40 transition"
            >
              Agla →
            </button>
          </div>

          {/* Question Navigator */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-600 mb-3">
              📊 {answered}/{questions.length} answered
            </p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition ${
                    i === current
                      ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                      : answers[q.id]
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ================================
  // SCREEN: RESULT
  // ================================
  if (screen === 'result' && result) {
    const msg = getScoreMessage(result.score)

    return (
      <div className="min-h-screen bg-gray-50">

        {/* Navbar */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-gray-600"
            >
              ← Dashboard
            </button>
            <span className="font-bold text-gray-800">Test Result</span>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4 py-6">

          {/* Score Header */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl p-8 text-center text-white mb-6 shadow-lg">
            <div className="text-5xl mb-3">{msg.emoji}</div>
            <p className="text-6xl font-bold mb-2">{result.score}%</p>
            <p className="text-purple-200 text-lg">{msg.text}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{result.correct}</p>
              <p className="text-xs text-green-600 mt-1">✅ Sahi</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-red-700">{result.wrong}</p>
              <p className="text-xs text-red-600 mt-1">❌ Galat</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-gray-600">{result.skipped}</p>
              <p className="text-xs text-gray-500 mt-1">⏭️ Skip</p>
            </div>
          </div>

          {/* Detailed Review */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">📋 Detailed Review</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {result.details.map((q, i) => (
                <div key={i} className="p-4">

                  {/* Question */}
                  <div className="flex items-start gap-2 mb-3">
                    <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      q.isCorrect
                        ? 'bg-green-500 text-white'
                        : q.userAnswer
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {q.isCorrect ? '✓' : q.userAnswer ? '✗' : '−'}
                    </span>
                    <p className="text-sm font-medium text-gray-800">
                      {i + 1}. {q.question}
                    </p>
                  </div>

                  {/* Answers */}
                  <div className="ml-8 space-y-1">
                    {q.userAnswer && q.userAnswer !== q.correct && (
                      <p className="text-xs text-red-600">
                        ❌ Tera jawab: {q.userAnswer}) {q.options[q.userAnswer]}
                      </p>
                    )}
                    <p className="text-xs text-green-600 font-medium">
                      ✅ Sahi jawab: {q.correct}) {q.options[q.correct]}
                    </p>
                    {q.explanation && (
                      <p className="text-xs text-gray-500 italic mt-1">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setScreen('setup')
                setQuestions([])
                setAnswers({})
                setCurrent(0)
                setResult(null)
              }}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition active:scale-95"
            >
              🔄 Naya Test Do
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full border border-purple-300 text-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-50 transition"
            >
              📚 Dashboard Pe Jao
            </button>
          </div>

        </div>
      </div>
    )
  }
}

export default MockTest