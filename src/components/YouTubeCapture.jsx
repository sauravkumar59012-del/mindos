// src/components/YouTubeCapture.jsx
// YouTube URL + Manual transcript paste = Flashcards!

import { useState }           from 'react'
import { supabase }           from '../lib/supabase'
import { generateFlashcards } from '../lib/openai'
import { extractVideoId, getThumbnailUrl, getVideoTitle } from '../lib/youtubeUtils'

function YouTubeCapture({ onSuccess }) {

  const [url,       setUrl]       = useState('')
  const [transcript,setTranscript]= useState('')
  const [subject,   setSubject]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [progress,  setProgress]  = useState('')
  const [message,   setMessage]   = useState(null)
  const [cards,     setCards]     = useState([])
  const [flipped,   setFlipped]   = useState({})
  const [videoInfo, setVideoInfo] = useState(null)
  const [mode,      setMode]      = useState('auto')
  // mode: 'auto' = URL se try, 'manual' = text paste karo

  const subjects = [
    'Computer Science', 'Mathematics', 'Physics',
    'Chemistry', 'Biology', 'History', 'Economics', 'Other'
  ]

  const diffStyle = {
    easy:   { bg: 'bg-green-100',  text: 'text-green-700',  label: '😊 Easy'   },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '🤔 Medium' },
    hard:   { bg: 'bg-red-100',    text: 'text-red-700',    label: '💪 Hard'   },
  }

  const msgStyle = {
    success: 'bg-green-50  border-green-200  text-green-800',
    error:   'bg-red-50    border-red-200    text-red-800',
    warn:    'bg-yellow-50 border-yellow-200 text-yellow-800',
    info:    'bg-blue-50   border-blue-200   text-blue-800',
  }

  // ================================
  // URL Change Handler
  // ================================
  async function handleUrlChange(e) {
    const value = e.target.value
    setUrl(value)
    setMessage(null)
    setVideoInfo(null)
    setCards([])

    const videoId = extractVideoId(value)
    if (videoId) {
      setVideoInfo({ videoId, loading: true })
      const title = await getVideoTitle(videoId)
      setVideoInfo({
        videoId,
        title,
        thumbnail: getThumbnailUrl(videoId)
      })
    }
  }

  // ================================
  // MAIN — Process Karo
  // ================================
  async function handleProcess() {

    const videoId = extractVideoId(url)

    // Validation
    if (!url.trim() && !transcript.trim()) {
      setMessage({ type: 'warn', text: '⚠️ YouTube URL ya transcript paste karo!' })
      return
    }

    // Manual mode mein transcript check karo
    if (mode === 'manual' && transcript.trim().length < 100) {
      setMessage({ type: 'warn', text: '⚠️ Thoda aur transcript paste karo!' })
      return
    }

    setLoading(true)
    setMessage(null)
    setCards([])
    setFlipped({})

    try {

      // User check
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Login karo pehle!')

      let textToUse  = ''
      let title      = 'YouTube Video'

      if (mode === 'manual' || transcript.trim()) {
        // Manual transcript use karo
        textToUse = transcript.trim()
        title     = videoInfo?.title || 'YouTube Video'

      } else {
        // Auto mode — URL se try karo
        setProgress('🎥 Video info fetch ho rahi hai...')
        title = videoInfo?.title || await getVideoTitle(videoId || '')

        setProgress('📝 Transcript fetch ho raha hai...')

        // Rapid API ya proxy se try karo
        try {
          const res = await fetch(
            `https://yt-transcript-api.vercel.app/api/transcript?videoId=${videoId}`
          )
          if (res.ok) {
            const data = await res.json()
            textToUse = data.transcript || ''
          }
        } catch {
          // Silently fail
        }

        // Agar transcript nahi mila
        if (!textToUse || textToUse.length < 100) {
          setLoading(false)
          setMode('manual')
          setMessage({
            type: 'warn',
            text: '⚠️ Auto transcript nahi mila! Neeche manually paste karo.'
          })
          return
        }
      }

      if (textToUse.length < 100) {
        throw new Error('Text bahut chhota hai — aur content paste karo!')
      }

      // Note save karo
      setProgress('💾 Note save ho raha hai...')
      const noteTitle = url
        ? `YT: ${title}`
        : `YouTube Notes: ${subject || 'General'}`

      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({
          title:   noteTitle,
          content: textToUse.substring(0, 5000),
          source:  subject || 'YouTube',
          user_id: user.id,
        })
        .select()
        .single()

      if (noteError) throw new Error('Note save nahi hua: ' + noteError.message)

      // AI flashcards
      setProgress('🤖 AI flashcards bana raha hai...')
      const flashcards = await generateFlashcards(
        textToUse.substring(0, 3000),
        subject
      )

      // Cards save
      setProgress('✨ Cards save ho rahi hain...')
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

      if (cardsError) throw new Error('Cards save nahi hui!')

      // Success
      setCards(flashcards)
      setMessage({
        type: 'success',
        text: `🎉 ${flashcards.length} flashcards ban gayi!`
      })
      setUrl('')
      setTranscript('')
      setVideoInfo(null)
      setProgress('')
      if (onSuccess) onSuccess()

    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: '❌ ' + err.message })
      setProgress('')
    } finally {
      setLoading(false)
    }
  }

  function toggleFlip(i) {
    setFlipped(prev => ({ ...prev, [i]: !prev[i] }))
  }

  // ================================
  // RENDER
  // ================================
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🎥 YouTube → Flashcards
        </h1>
        <p className="text-gray-400 text-sm">
          YouTube URL paste karo ya transcript manually daalo!
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
          <button
            onClick={() => { setMode('auto'); setMessage(null) }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              mode === 'auto'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            🔗 URL Se Auto
          </button>
          <button
            onClick={() => { setMode('manual'); setMessage(null) }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              mode === 'manual'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            📋 Manual Paste
          </button>
        </div>

        {/* URL Input */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🔗 YouTube URL
          </label>
          <input
            type="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        {/* Video Preview */}
        {videoInfo && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex gap-3 items-center">
            {videoInfo.thumbnail && (
              <img
                src={videoInfo.thumbnail}
                alt="thumb"
                className="w-20 h-14 object-cover rounded-lg shrink-0"
                onError={e => e.target.style.display = 'none'}
              />
            )}
            <div>
              <p className="text-sm font-semibold text-red-800 line-clamp-2">
                ✅ {videoInfo.title}
              </p>
            </div>
          </div>
        )}

        {/* Manual Transcript */}
        {mode === 'manual' && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📋 Transcript / Notes Yahan Paste Karo
            </label>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder={`YouTube se transcript kaise copy karein:

1. YouTube video kholo
2. Video ke neeche "..." click karo
3. "Show transcript" click karo
4. Saara text select karo → Copy karo
5. Yahan paste karo!

Ya video ke notes bhi paste kar sakte ho.`}
              rows={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className={`text-xs ${transcript.length < 100 ? 'text-red-400' : 'text-green-500'}`}>
                {transcript.length < 100
                  ? `${100 - transcript.length} aur characters chahiye`
                  : '✅ Ready!'}
              </p>
              <p className="text-xs text-gray-400">
                {transcript.length} chars
              </p>
            </div>
          </div>
        )}

        {/* How to get transcript */}
        {mode === 'manual' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold text-yellow-800 mb-2">
              📌 YouTube Transcript Kaise Lo:
            </p>
            <ol className="text-xs text-yellow-700 space-y-1">
              <li>1. YouTube video kholo browser mein</li>
              <li>2. Video ke neeche <strong>"..."</strong> (3 dots) click karo</li>
              <li>3. <strong>"Show transcript"</strong> click karo</li>
              <li>4. Right side mein transcript aayega</li>
              <li>5. <strong>Ctrl+A</strong> → <strong>Ctrl+C</strong> → Yahan paste karo!</li>
            </ol>
          </div>
        )}

        {/* Subject */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📚 Subject (Optional)
          </label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
          >
            <option value="">-- Select karo --</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Progress */}
        {progress && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700 font-medium text-center">
            <span className="animate-pulse">{progress}</span>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`border rounded-xl p-3 mb-4 text-sm font-medium text-center ${msgStyle[message.type]}`}>
            {message.text}
            {/* Manual mode suggestion */}
            {message.type === 'warn' && mode === 'auto' && (
              <button
                onClick={() => setMode('manual')}
                className="block mx-auto mt-2 text-xs bg-yellow-600 text-white px-4 py-1.5 rounded-lg hover:bg-yellow-700 transition"
              >
                📋 Manual Mode Switch Karo →
              </button>
            )}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleProcess}
          disabled={loading || (!url.trim() && !transcript.trim())}
          className="w-full bg-red-500 text-white py-4 rounded-xl font-bold text-base hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {loading
            ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Processing...
              </span>
            )
            : '🎬 Flashcards Banao'
          }
        </button>

      </div>

      {/* Flashcards */}
      {cards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              🃏 YouTube Se Bani Cards ({cards.length})
            </h2>
            <button
              onClick={() => { setCards([]); setMessage(null) }}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              ✕ Clear
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-4 text-center">
            💡 Card pe click karo — answer dikhega!
          </p>

          <div className="space-y-3">
            {cards.map((card, i) => (
              <div
                key={i}
                onClick={() => toggleFlip(i)}
                className="cursor-pointer select-none"
              >
                {!flipped[i] ? (
                  <div className="bg-white border-2 border-red-200 rounded-2xl p-5 hover:border-red-400 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-semibold text-red-400 uppercase">
                        Card {i + 1} — Question
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${diffStyle[card.difficulty]?.bg} ${diffStyle[card.difficulty]?.text}`}>
                        {diffStyle[card.difficulty]?.label || card.difficulty}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium leading-relaxed">
                      {card.front}
                    </p>
                    <p className="text-xs text-red-300 mt-4 text-right">
                      tap to reveal →
                    </p>
                  </div>
                ) : (
                  <div className="bg-red-500 rounded-2xl p-5">
                    <span className="text-xs font-semibold text-red-200 uppercase">
                      Card {i + 1} — Answer
                    </span>
                    <p className="text-white font-medium leading-relaxed mt-3">
                      {card.back}
                    </p>
                    <p className="text-xs text-red-300 mt-4 text-right">
                      tap to go back ←
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stats */}
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

export default YouTubeCapture