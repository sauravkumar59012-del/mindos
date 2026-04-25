// src/pages/Quiz.jsx
import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { supabase }            from '../lib/supabase'
import QuizCard                from '../components/QuizCard'
import { rateCard, getDueCards, shuffleCards, calcStats } from '../lib/spaced'

// ================================
// STATES
// ================================
// loading → fetching cards
// empty   → koi card due nahi
// quiz    → quiz chal raha hai
// result  → quiz khatam

function Quiz() {
  const navigate = useNavigate()

  const [screen,    setScreen]    = useState('loading')
  const [cards,     setCards]     = useState([])
  const [current,   setCurrent]   = useState(0)
  const [results,   setResults]   = useState([])
  const [allCards,  setAllCards]  = useState(0)

  // ================================
  // App kholte hi cards fetch karo
  // ================================
  useEffect(() => {
    fetchDueCards()
  }, [])

  async function fetchDueCards() {
    setScreen('loading')

    try {
      // Supabase se aaj ki due cards lo
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .lte('next_review', today)  // next_review <= aaj
        .order('next_review', { ascending: true })

      if (error) throw error

      // Total cards count
      const { count } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })

      setAllCards(count || 0)

      if (!data || data.length === 0) {
        setScreen('empty')
        return
      }

      // Cards shuffle karo
      const shuffled = shuffleCards(data)
      setCards(shuffled)
      setCurrent(0)
      setResults([])
      setScreen('quiz')

    } catch (err) {
      console.error(err)
      setScreen('empty')
    }
  }

  // ================================
  // Card Rate Karo — SM2 Apply Karo
  // ================================
  async function handleRate(card, rating) {

    // SM2 algorithm se next review calculate karo
    const updated = rateCard(card, rating)

    // Database update karo
    await supabase
      .from('flashcards')
      .update({
        ease_factor:  updated.ease_factor,
        interval:     updated.interval,
        review_count: updated.review_count,
        next_review:  updated.next_review,
      })
      .eq('id', card.id)

    // Review history save karo
    await supabase
      .from('review_history')
      .insert({
        flashcard_id: card.id,
        rating:       rating,
      })

    // Results mein add karo
    const newResults = [...results, rating]
    setResults(newResults)

    // Next card pe jao
    setTimeout(() => {
      if (current + 1 >= cards.length) {
        // Quiz khatam!
        setScreen('result')
      } else {
        setCurrent(prev => prev + 1)
      }
    }, 400)
  }

  // ================================
  // SCREEN: LOADING
  // ================================
  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🧠</div>
          <p className="text-gray-500">Cards are Loading...</p>
        </div>
      </div>
    )
  }

  // ================================
  // SCREEN: EMPTY — Koi Card Nahi
  // ================================
  if (screen === 'empty') {
    return (
      <div className="min-h-screen bg-gray-50">

        {/* Navbar */}
        <nav className="bg-white border-b px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <span className="text-xl font-bold text-purple-700">MindOS</span>
        </nav>

        <div className="flex flex-col items-center justify-center min-h-96 p-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Aaj Ka Kaam Ho Gaya!
          </h2>
          <p className="text-gray-500 text-center mb-2">
            Aaj ke liye koi card due nahi hai.
          </p>
          <p className="text-gray-400 text-sm text-center mb-8">
            Total cards: {allCards} | Come Tommorow! 😊
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
            >
              📝 Add New Note 
            </button>
            <button
              onClick={fetchDueCards}
              className="border border-purple-300 text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ================================
  // SCREEN: RESULT — Quiz Khatam!
  // ================================
  if (screen === 'result') {
    const stats = calcStats(results)

    // Score ke hisaab se message
    const getMessage = () => {
      if (stats.score >= 90) return { emoji: '🏆', text: 'Zabardast! Tu toh genius hai!' }
      if (stats.score >= 70) return { emoji: '🎯', text: 'Bahut badhiya! Keep it up!' }
      if (stats.score >= 50) return { emoji: '💪', text: 'Achha tha! Aur practice karo!' }
      return { emoji: '📚', text: 'Practice karte raho — hoga!' }
    }

    const msg = getMessage()

    return (
      <div className="min-h-screen bg-gray-50">

        {/* Navbar */}
        <nav className="bg-white border-b px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <span className="text-xl font-bold text-purple-700">MindOS</span>
        </nav>

        <div className="max-w-lg mx-auto px-4 py-10">

          {/* Result Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">{msg.emoji}</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Quiz Complete!
            </h2>
            <p className="text-gray-500">{msg.text}</p>
          </div>

          {/* Score Circle */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-full border-8 border-purple-200 flex flex-col items-center justify-center bg-white shadow-sm">
              <span className="text-3xl font-bold text-purple-700">
                {stats.score}%
              </span>
              <span className="text-xs text-gray-400">Score</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">

            <div className="bg-white rounded-2xl border p-4 text-center">
              <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Cards</p>
            </div>

            <div className="bg-white rounded-2xl border p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.correct}</p>
              <p className="text-sm text-gray-500">Sahi Jawab</p>
            </div>

            <div className="bg-green-50 rounded-2xl border border-green-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.easy}</p>
              <p className="text-sm text-green-600">😊 Easy</p>
            </div>

            <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">{stats.medium}</p>
              <p className="text-sm text-yellow-600">🤔 Medium</p>
            </div>

            <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4 text-center">
              <p className="text-2xl font-bold text-orange-700">{stats.hard}</p>
              <p className="text-sm text-orange-600">💪 Hard</p>
            </div>

            <div className="bg-red-50 rounded-2xl border border-red-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{stats.wrong}</p>
              <p className="text-sm text-red-600">❌ Bhool Gaya</p>
            </div>

          </div>

          {/* Next Review Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6 text-center">
            <p className="text-sm text-purple-700 font-medium">
              🔄 {stats.wrong + stats.hard} cards kal dobara aayengi
            </p>
            <p className="text-xs text-purple-500 mt-1">
              {stats.easy + stats.medium} cards kuch dino mein aayengi
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={fetchDueCards}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition active:scale-95"
            >
              🔄 Again Satrt Quiz
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full border border-purple-300 text-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-50 transition"
            >
              📝 Add New Notes 
            </button>
          </div>

        </div>
      </div>
    )
  }

  // ================================
  // SCREEN: QUIZ — Main Quiz!
  // ================================
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <span className="text-xl font-bold text-purple-700">MindOS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            🎯 {cards.length} cards today
          </span>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-400 hover:text-gray-600 ml-3"
          >
            ✕ Exit
          </button>
        </div>
      </nav>

      {/* Quiz Area */}
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* How to use — pehli baar */}
        {current === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-center">
            <p className="text-xs text-blue-700">
              💡 Click On Card→ To show answer → and rate your answer!
            </p>
          </div>
        )}

        {/* Current Card */}
        <QuizCard
          key={cards[current]?.id}
          card={cards[current]}
          onRate={handleRate}
          cardNumber={current + 1}
          totalCards={cards.length}
        />

      </div>
    </div>
  )
}

export default Quiz