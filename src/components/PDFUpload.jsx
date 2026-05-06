// src/components/PDFUpload.jsx
import { useState, useRef }    from 'react'
import { supabase }            from '../lib/supabase'
import { generateFlashcards }  from '../lib/openai'
import { extractTextFromPDF, chunkText } from '../lib/pdfUtils'

function PDFUpload({ onSuccess }) {

  const [file,       setFile]       = useState(null)
  const [subject,    setSubject]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [progress,   setProgress]   = useState('')
  const [message,    setMessage]    = useState(null)
  const [cards,      setCards]      = useState([])
  const [flipped,    setFlipped]    = useState({})
  const [pdfInfo,    setPdfInfo]    = useState(null)
  const fileInputRef = useRef(null)

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
  // FILE SELECT HANDLER
  // ================================
  function handleFileSelect(e) {
    const selected = e.target.files[0]
    if (!selected) return

    // Sirf PDF allow karo
    if (selected.type !== 'application/pdf') {
      setMessage({ type: 'warn', text: '⚠️ Sirf PDF files allowed hain!' })
      return
    }

    // 10MB limit
    if (selected.size > 10 * 1024 * 1024) {
      setMessage({ type: 'warn', text: '⚠️ File 10MB se chhoti honi chahiye!' })
      return
    }

    setFile(selected)
    setMessage(null)
    setCards([])
    setPdfInfo(null)
  }

  // ================================
  // DRAG AND DROP
  // ================================
  function handleDrop(e) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      const fakeEvent = { target: { files: [dropped] } }
      handleFileSelect(fakeEvent)
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  // ================================
  // MAIN — PDF Process Karo
  // ================================
  async function handleProcess() {
    if (!file) {
      setMessage({ type: 'warn', text: '⚠️ Pehle PDF select karo!' })
      return
    }

    setLoading(true)
    setMessage(null)
    setCards([])
    setFlipped({})

    try {
      // STEP 1 — PDF se text extract karo
      setProgress('📄 PDF read ho raha hai...')
      const { text, totalPages, wordCount } = await extractTextFromPDF(file)

      if (!text || text.length < 50) {
        throw new Error('PDF mein koi readable text nahi mila! Scanned PDF ho sakta hai.')
      }

      setPdfInfo({ totalPages, wordCount, chars: text.length })

      // STEP 2 — Text ko chunks mein toddo
      setProgress('✂️ Text process ho raha hai...')
      const chunks   = chunkText(text, 3000)
      const useChunk = chunks[0] // Pehla chunk use karo

      // STEP 3 — User check karo
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Login karo pehle!')

      // STEP 4 — Note save karo
      setProgress('💾 Note save ho raha hai...')
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({
          title:   file.name.replace('.pdf', ''),
          content: useChunk,
          source:  subject || 'PDF Upload',
          user_id: user.id,
        })
        .select()
        .single()

      if (noteError) throw new Error('Note save nahi hua: ' + noteError.message)

      // STEP 5 — AI se flashcards banao
      setProgress('🤖 AI flashcards bana raha hai...')
      const flashcards = await generateFlashcards(useChunk, subject)

      // STEP 6 — Cards save karo
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
        text: `🎉 ${flashcards.length} flashcards ban gayi PDF se!`
      })
      setFile(null)
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
          📄 PDF → Flashcards
        </h1>
        <p className="text-gray-400">
          PDF upload karo — AI automatically flashcards bana dega!
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">

        {/* Drag & Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all mb-4
            ${file
              ? 'border-purple-400 bg-purple-50'
              : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            // File selected
            <div>
              <div className="text-4xl mb-2">📄</div>
              <p className="font-semibold text-purple-700">
                {file.name}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                onClick={e => {
                  e.stopPropagation()
                  setFile(null)
                  setPdfInfo(null)
                  setCards([])
                  setMessage(null)
                }}
                className="text-xs text-red-400 mt-2 hover:text-red-600"
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            // No file
            <div>
              <div className="text-4xl mb-3">📁</div>
              <p className="font-semibold text-gray-700">
                PDF yahan drop karo
              </p>
              <p className="text-sm text-gray-400 mt-1">
                ya click karke select karo
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Max 10MB • Sirf PDF
              </p>
            </div>
          )}
        </div>

        {/* PDF Info */}
        {pdfInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-blue-700 font-medium">
              📊 PDF Info: {pdfInfo.totalPages} pages •
              {pdfInfo.wordCount.toLocaleString()} words •
              {pdfInfo.chars.toLocaleString()} characters
            </p>
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
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
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

        {/* Generate Button */}
        <button
          onClick={handleProcess}
          disabled={loading || !file}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-base hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
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
            : '✨ PDF Se Flashcards Banao'
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
              🃏 PDF Se Bani Flashcards ({cards.length})
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

export default PDFUpload