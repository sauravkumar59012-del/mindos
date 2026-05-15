// src/pages/AITutor.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate }                  from 'react-router-dom'
import { supabase }                     from '../lib/supabase'

function AITutor() {
  const navigate    = useNavigate()
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)

  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [notes,     setNotes]     = useState([])
  const [notesLoaded, setNotesLoaded] = useState(false)

  // ================================
  // User ke notes fetch karo
  // ================================
  useEffect(() => {
    fetchNotes()
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchNotes() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data, error } = await supabase
        .from('notes')
        .select('title, content, source')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setNotes(data || [])
      setNotesLoaded(true)

      // Welcome message
      setMessages([{
        role:    'assistant',
        content: data?.length > 0
          ? `Namaste! 🙏 Maine teri **${data.length} notes** padh li hain!\n\nAb tu mujhse kuch bhi poochh sakta hai — main sirf teri apni notes se jawab dunga!\n\n**Kuch examples:**\n• "Machine Learning kya hota hai?"\n• "CSS ke baare mein samjhao"\n• "Mujhe quiz do"\n• "Important topics kya hain?"`
          : `Namaste! 🙏 Abhi teri koi notes nahi hain.\n\nPehle **Notes ya PDF** tab mein jaake notes add karo — fir main unse jawab de sakta hun!`,
      }])

    } catch (err) {
      console.error(err)
      setNotesLoaded(true)
    }
  }

  // ================================
  // Notes ka context banao
  // ================================
  function buildContext() {
    if (!notes.length) return ''

    return notes
      .map((note, i) =>
        `--- Note ${i + 1}: ${note.title} (${note.source || 'General'}) ---\n${note.content}`
      )
      .join('\n\n')
      .substring(0, 8000) // Max 8000 chars
  }

  // ================================
  // Message bhejo
  // ================================
  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')

    // User message add karo
    const newMessages = [
      ...messages,
      { role: 'user', content: userMsg }
    ]
    setMessages(newMessages)
    setLoading(true)

    try {
      const context = buildContext()

      // System prompt
      const systemPrompt = notes.length > 0
        ? `Tu ek helpful AI tutor hai jo SIRF student ki apni notes se jawab deta hai.

Student ki notes:
${context}

RULES:
- Sirf inhi notes ki information use karo
- Agar notes mein jawab nahi hai toh honestly bolo
- Simple Hindi-English (Hinglish) mein jawab do
- Short aur clear jawab do
- Examples de jahan zaruri ho
- Agar quiz maange toh 3-5 MCQ questions banao notes se`
        : `Tu ek helpful AI tutor hai. Student ki abhi koi notes nahi hain. Unhe notes add karne ke liye encourage karo.`

      // Conversation history
      const conversationHistory = newMessages.map(m => ({
        role:    m.role,
        content: m.content
      }))

      // API call
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:    'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory
          ],
          max_tokens:  1000,
          temperature: 0.7,
        })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error?.message || 'AI error')

      const reply = data.choices[0].message.content

      // AI reply add karo
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: reply }
      ])

    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role:    'assistant',
          content: '❌ Kuch error aaya: ' + err.message
        }
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  // Enter key se send karo
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Quick question buttons
  const quickQuestions = [
    '📚 Important topics kya hain?',
    '🧪 Mujhe quiz do',
    '📝 Summary banao',
    '❓ Explain karo simply',
  ]

  // ================================
  // Format message — markdown basic
  // ================================
  function formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
      .replace(/•/g, '&bull;')
  }

  // ================================
  // RENDER
  // ================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ===== NAVBAR ===== */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="font-bold text-gray-800 text-sm">AI Tutor</p>
                <p className="text-xs text-gray-400">
                  {notesLoaded
                    ? `${notes.length} notes loaded`
                    : 'Loading notes...'}
                </p>
              </div>
            </div>
          </div>

          {/* Clear Chat */}
          <button
            onClick={() => {
              setMessages([{
                role:    'assistant',
                content: 'Chat clear ho gaya! Kuch poochho 😊'
              }])
            }}
            className="text-xs text-gray-400 hover:text-red-500 transition px-3 py-1 rounded-lg hover:bg-red-50"
          >
            🗑️ Clear
          </button>
        </div>
      </nav>

      {/* ===== CHAT AREA ===== */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 overflow-y-auto"
           style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>

        {/* Messages */}
        <div className="space-y-4 pb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                  <span className="text-sm">🤖</span>
                </div>
              )}

              {/* Message Bubble */}
              <div className={`
                max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }
              `}>
                <div
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center ml-2 mt-1 shrink-0">
                  <span className="text-sm text-white">👤</span>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2 shrink-0">
                <span className="text-sm">🤖</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ===== INPUT AREA ===== */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-3">

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(q)
                    inputRef.current?.focus()
                  }}
                  className="shrink-0 text-xs bg-purple-50 text-purple-700 px-3 py-2 rounded-xl hover:bg-purple-100 transition border border-purple-200"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Apni notes ke baare mein kuch poochho..."
              rows={1}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95 shrink-0"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-2 text-center">
            Enter = Send • Shift+Enter = New line
          </p>

        </div>
      </div>

    </div>
  )
}

export default AITutor