// src/components/YouTubeCapture.jsx
import { useState }             from 'react'
import { supabase }             from '../lib/supabase'
import { generateFlashcards }   from '../lib/openai'
import {
  extractVideoId,
  getThumbnailUrl,
  getVideoTitle,
  fetchTranscript,
  chunkTranscript
} from '../lib/youtubeUtils'

function YouTubeCapture({ onSuccess }) {

  const [url,      setUrl]      = useState('')
  const [subject,  setSubject]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState('')
  const [message,  setMessage]  = useState(null)
  const [cards,    setCards]    = useState([])
  const [flipped,  setFlipped]  = useState({})
  const [videoInfo,setVideoInfo]= useState(null)

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
  // URL validate karo
  // ================================
  function handleUrlChange(e) {
    const value = e.target.value
    setUrl(value)
    setMessage(null)
    setVideoInfo(null)
    setCards([])

    // Video ID extract karo
    const videoId = extractVideoId(value)
    if (videoId) {
      setVideoInfo({ videoId, loading: true })
      // Title fetch karo
      getVideoTitle(videoId).then(title => {
        setVideoInfo({ videoId, title, thumbnail: getThumbnailUrl(videoId) })
      })
    }
  }

  // ================================
  // MAIN — Process Karo
  // ================================
  async function handleProcess() {

    const videoId = extractVideoId(url)

    if (!url.trim()) {
      setMessage({ type: 'warn', text: '⚠️ YouTube URL paste karo!' })
      return
    }

    if (!videoId) {
      setMessage({ type: 'warn', text: '⚠️ Valid YouTube URL nahi hai!' })
      return
    }

    setLoading(true)
    setMessage(null)
    setCards([])
    setFlipped({})

    try {

      // STEP 1 — User check
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Login karo pehle!')

      // STEP 2 — Video title lo
      setProgress('🎥 Video info fetch ho rahi hai...')
      const title = videoInfo?.title || await getVideoTitle(videoId)

      // STEP 3 — Transcript fetch karo
      setProgress('📝 Transcript fetch ho raha hai...')
      const result = await fetchTranscript(videoId)

      if (!result || !result.text) {
        throw new Error(
          'Is video ka transcript available nahi hai! ' +
          'Try karo:\n• English captions wala video\n• Auto-generated captions wala video'
        )
      }

      const { text } = result

      if (text.length < 100) {
        throw new Error('Transcript bahut chhota hai — dusra video try karo!')
      }

      // STEP 4 — Chunk karo
      setProgress('✂️ Text process ho raha hai...')
      const chunks   = chunkTranscript(text, 3000)
      const useChunk = chunks[0]

      // STEP 5 — Note save karo
      setProgress('💾 Note save ho raha hai...')
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({
          title:   `YT: ${title}`,
          content: useChunk,
          source:  subject || 'YouTube',
          user_id: user.id,
        })
        .select()
        .single()

      if (noteError) throw new Error('Note save nahi hua: ' + noteError.message)

      // STEP 6 — AI flashcards
      setProgress('🤖 AI flashcards bana raha hai...')
      const flashcards = await generateFlashcards(useChunk, subject)

      // STEP 7 — Cards save
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

      if (cardsError) throw new Error('Cards save nahi hui: ' + cardsError.message)

      // SUCCESS
      setCards(flashcards)
      setMessage({
        type: 'success',
        text: `🎉 ${flashcards.length} flashcards ban gayi YouTube video se!`
      })
      setUrl('')
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
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🎥 YouTube → Flashcards
        </h1>
        <p className="text-gray-400">
          YouTube URL paste karo — AI transcript se flashcards banayega!
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">

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
        {videoInfo && !videoInfo.loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex gap-3 items-center">
            {videoInfo.thumbnail && (
              <img
                src={videoInfo.thumbnail}
                alt="thumbnail"
                className="w-20 h-14 object-cover rounded-lg shrink-0"
                onError={e => e.target.style.display = 'none'}
              />
            )}
            <div>
              <p className="text-sm font-semibold text-red-800 line-clamp-2">
                ✅ {videoInfo.title}
              </p>
              <p className="text-xs text-red-500 mt-1">
                ID: {videoInfo.videoId}
              </p>
            </div>
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

        {/* Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-yellow-800 font-semibold mb-1">
            💡 Best Results Ke Liye:
          </p>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Educational videos use karo (lectures, tutorials)</li>
            <li>• English captions wale videos prefer karo</li>
            <li>• 5-20 minute ke videos best hain</li>
            <li>• Shorts pe transcript nahi hota</li>
          </ul>
        </div>

        {/* Progress */}
        {progress && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700 font-medium text-center">
            <span className="animate-pulse">{progress}</span>
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleProcess}
          disabled={loading || !url.trim()}
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
            : '🎬 YouTube Se Flashcards Banao'
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
                  <div className="bg-red-500 border-2 border-red-500 rounded-2xl p-5">
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