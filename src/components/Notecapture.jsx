// src/components/NoteCapture.jsx
import { useState }           from 'react'
import { supabase }           from '../lib/supabase'
import { generateFlashcards } from '../lib/openai'

function NoteCapture({ onSuccess }) {

  const [title,    setTitle]    = useState('')
  const [subject,  setSubject]  = useState('')
  const [content,  setContent]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState(null)
  const [cards,    setCards]    = useState([])
  const [flipped,  setFlipped]  = useState({})

  const subjects = [
    'Computer Science', 'Mathematics', 'Physics',
    'Chemistry', 'Biology', 'History', 'Economics', 'Other'
  ]

  const diffStyle = {
    easy:   { bg: 'bg-green-100',  text: 'text-green-700',  label: '😊 Easy'   },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '🤔 Medium' },
    hard:   { bg: 'bg-red-100',    text: 'text-red-700',    label: '💪 Hard'   },
  }

  // ================================
  // MAIN FUNCTION — handleGenerate
  // ================================
  async function handleGenerate() {

    // Validation
    if (!title.trim()) {
      setMessage({ type: 'warn', text: '⚠️ Title likho!' })
      return
    }
    if (content.trim().length < 80) {
      setMessage({ type: 'warn', text: `⚠️ Aur notes likho! (${80 - content.trim().length} chars aur chahiye)` })
      return
    }

    setLoading(true)
    setMessage({ type: 'info', text: '💾 Note save ho raha hai...' })
    setCards([])
    setFlipped({})

    try {

      // ✅ USER ID LO — RLS ke liye zaruri!
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Login karo pehle!')

      // ✅ NOTE SAVE — user_id ke saath
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({
          title:   title.trim(),
          content: content.trim(),
          source:  subject || 'General',
          user_id: user.id,
        })
        .select()
        .single()

      if (noteError) throw new Error('Note save nahi hua: ' + noteError.message)

      // ✅ AI FLASHCARDS
      setMessage({ type: 'info', text: '🤖 AI flashcards bana raha hai...' })
      const flashcards = await generateFlashcards(content, subject)

      // ✅ CARDS SAVE — user_id ke saath
      setMessage({ type: 'info', text: '✨ Cards save ho rahi hain...' })

      const cardsToSave = flashcards.map(card => ({
        note_id:    note.id,
        user_id:    user.id,
        front:      card.front,
        back:       card.back,
        difficulty: card.difficulty || 'medium',
      }))

      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(cardsToSave)

      if (cardsError) throw new Error('Cards save nahi hui: ' + cardsError.message)

      // ✅ SUCCESS
      setCards(flashcards)
      setMessage({ type: 'success', text: `🎉 ${flashcards.length} flashcards ban gayi!` })
      setTitle('')
      setContent('')
      setSubject('')
      if (onSuccess) onSuccess()

    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: '❌ ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  function toggleFlip(i) {
    setFlipped(prev => ({ ...prev, [i]: !prev[i] }))
  }

  const msgStyle = {
    success: 'bg-green-50  border-green-200  text-green-800',
    error:   'bg-red-50    border-red-200    text-red-800',
    warn:    'bg-yellow-50 border-yellow-200 text-yellow-800',
    info:    'bg-blue-50   border-blue-200   text-blue-800',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          📝 Notes → Flashcards
        </h1>
        <p className="text-gray-400">
          Notes paste karo — AI flashcards bana dega!
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📌 Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. OS — Process Scheduling"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Subject */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📚 Subject
          </label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
          >
            <option value="">-- Select karo --</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📋 Notes *
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Yahan lecture notes, book summary paste karo..."
            rows={8}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
          <div className="flex justify-between mt-1">
            <p className={`text-xs ${content.length < 80 ? 'text-red-400' : 'text-green-500'}`}>
              {content.length < 80
                ? `${80 - content.length} aur characters chahiye`
                : '✅ Ready!'}
            </p>
            <p className="text-xs text-gray-400">{content.length} chars</p>
          </div>
        </div>

        {/* Button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-base hover:bg-purple-700 disabled:opacity-60 transition-all active:scale-95"
        >
          {loading
            ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                AI is on Working...
              </span>
            )
            : '✨ AI Flashcards Generate Karo'
          }
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`border rounded-xl p-4 mb-6 text-sm font-medium text-center ${msgStyle[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Flashcards */}
      {cards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              🃏 Your  Flashcards ({cards.length})
            </h2>
            <button
              onClick={() => { setCards([]); setMessage(null) }}
              className="text-sm text-gray-400 hover:text-red-500 transition"
            >
              ✕ Clear
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-4 text-center">
            💡  click on Card — To show answer !
          </p>

          <div className="space-y-3">
            {cards.map((card, i) => (
              <div
                key={i}
                onClick={() => toggleFlip(i)}
                className="cursor-pointer select-none"
              >
                {!flipped[i] ? (
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 hover:border-purple-400 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-semibold text-purple-400 uppercase">
                        Card {i + 1} — Question
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${diffStyle[card.difficulty]?.bg} ${diffStyle[card.difficulty]?.text}`}>
                        {diffStyle[card.difficulty]?.label || card.difficulty}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium leading-relaxed">
                      {card.front}
                    </p>
                    <p className="text-xs text-purple-300 mt-4 text-right">
                      tap to reveal →
                    </p>
                  </div>
                ) : (
                  <div className="bg-purple-600 border-2 border-purple-600 rounded-2xl p-5">
                    <span className="text-xs font-semibold text-purple-200 uppercase">
                      Card {i + 1} — Answer
                    </span>
                    <p className="text-white font-medium leading-relaxed mt-3">
                      {card.back}
                    </p>
                    <p className="text-xs text-purple-300 mt-4 text-right">
                      tap to go back ←
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {['easy', 'medium', 'hard'].map(diff => {
              const count = cards.filter(c => c.difficulty === diff).length
              return (
                <div key={diff} className={`rounded-xl p-3 text-center ${diffStyle[diff].bg}`}>
                  <p className={`text-2xl font-bold ${diffStyle[diff].text}`}>{count}</p>
                  <p className={`text-xs ${diffStyle[diff].text}`}>{diffStyle[diff].label}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default NoteCapture