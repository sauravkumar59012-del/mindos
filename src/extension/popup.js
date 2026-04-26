// CONFIG — Apni keys daalo!
const CONFIG = {
  SUPABASE_URL: 'https://kqquhkvyzvtdewojeahf.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcXVoa3Z5enZ0ZGV3b2plYWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTk1MDIsImV4cCI6MjA5MjA5NTUwMn0.J9IRLEh5n2gbXAfP_Vqbgwl8k8B2mWdSXHxPJevPPQo',
  GROQ_KEY:     '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',
  GROQ_MODEL:   'llama-3.3-70b-versatile',
  APP_URL:      'https://mindos-gamma.vercel.app',
}

// ================================
// HELPERS
// ================================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('screen-' + name).classList.add('active')
}

function showMsg(id, type, text) {
  document.getElementById(id).innerHTML =
    `<div class="message msg-${type}">${text}</div>`
}

function clearMsg(id) {
  document.getElementById(id).innerHTML = ''
}

// ================================
// SUPABASE
// ================================
async function supabaseLogin(email, password) {
  const res = await fetch(
    `${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.SUPABASE_KEY,
      },
      body: JSON.stringify({ email, password })
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || 'Login failed')
  return data
}

async function saveNote(token, userId, title, content, subject) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/notes`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer':        'return=representation',
    },
    body: JSON.stringify({
      title,
      content,
      source:  subject || 'Extension',
      user_id: userId,
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error('Note save nahi hua')
  return data[0]
}

async function saveCards(token, userId, noteId, cards) {
  const toSave = cards.map(card => ({
    note_id:    noteId,
    user_id:    userId,
    front:      card.front,
    back:       card.back,
    difficulty: card.difficulty || 'medium',
  }))
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/flashcards`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(toSave)
  })
  if (!res.ok) throw new Error('Cards save nahi hui')
}

// ================================
// GROQ AI
// ================================
async function generateFlashcards(text, subject) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${CONFIG.GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Tu ek expert teacher hai. Hamesha valid JSON return kar.'
        },
        {
          role: 'user',
          content: `
In notes se 5 flashcards banao.
${subject ? 'Subject: ' + subject : ''}
Notes: """${text}"""

Sirf JSON return karo:
{
  "flashcards": [
    {"front":"Question?","back":"Answer","difficulty":"easy/medium/hard","hint":""}
  ]
}
          `
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'AI error')
  const result = JSON.parse(data.choices[0].message.content)
  return result.flashcards
}

// ================================
// STORAGE
// ================================
function saveSession(s) { chrome.storage.local.set({ mindos_session: s }) }
function clearSession()  { chrome.storage.local.remove('mindos_session') }
function getSession() {
  return new Promise(resolve => {
    chrome.storage.local.get('mindos_session', d => resolve(d.mindos_session || null))
  })
}

// ================================
// SELECTED TEXT
// ================================
async function getSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString()?.trim() || ''
    })
    return result[0]?.result || ''
  } catch { return '' }
}

async function refreshText() {
  const text  = await getSelectedText()
  const el    = document.getElementById('selected-text')
  if (text) {
    el.dataset.fullText = text
    el.className        = 'selected-text'
    el.textContent      = text.length > 200 ? text.substring(0, 200) + '...' : text
  } else {
    el.dataset.fullText = ''
    el.className        = 'no-text'
    el.textContent      = 'Webpage pe kuch text select karo!'
  }
}

// ================================
// RENDER CARDS
// ================================
function renderCards(cards) {
  document.getElementById('cards-list').innerHTML = cards.map((c, i) => `
    <div class="card" id="card-${i}" onclick="flipCard(${i})">
      <div class="card-q">Q: ${c.front}</div>
      <div class="card-a">A: ${c.back}</div>
      <span class="badge badge-${c.difficulty}">${c.difficulty}</span>
    </div>
  `).join('')
}

window.flipCard = i =>
  document.getElementById('card-' + i).classList.toggle('flipped')

// ================================
// MAIN
// ================================
document.addEventListener('DOMContentLoaded', async () => {

  const session = await getSession()
  if (session) { showScreen('main'); await refreshText() }
  else           showScreen('login')

  // LOGIN
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email    = document.getElementById('login-email').value.trim()
    const password = document.getElementById('login-password').value
    if (!email || !password) {
      showMsg('login-message', 'warn', '⚠️ Email aur password dono likho!')
      return
    }
    const btn = document.getElementById('btn-login')
    btn.disabled = true
    btn.textContent = '⏳ Login ho raha hai...'
    clearMsg('login-message')
    try {
      const data = await supabaseLogin(email, password)
      saveSession(data)
      showScreen('main')
      await refreshText()
    } catch (err) {
      showMsg('login-message', 'error', '❌ ' + err.message)
    } finally {
      btn.disabled = false
      btn.textContent = '🚀 Login Karo'
    }
  })

  // Enter key login
  document.getElementById('login-password')
    .addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-login').click()
    })

  // LOGOUT
  document.getElementById('btn-logout').addEventListener('click', () => {
    clearSession()
    showScreen('login')
  })

  // REFRESH
  document.getElementById('btn-refresh').addEventListener('click', refreshText)

  // GENERATE
  document.getElementById('btn-generate').addEventListener('click', async () => {
    const session = await getSession()
    if (!session) { showScreen('login'); return }

    const text    = document.getElementById('selected-text').dataset.fullText || ''
    const subject = document.getElementById('subject-select').value

    if (!text) {
      showMsg('main-message', 'warn', '⚠️ Pehle webpage pe text select karo!')
      return
    }
    if (text.length < 50) {
      showMsg('main-message', 'warn', '⚠️ Thoda aur text select karo!')
      return
    }

    const btn = document.getElementById('btn-generate')
    btn.disabled    = true
    btn.textContent = '🤖 AI kaam kar raha hai...'
    clearMsg('main-message')

    try {
      showMsg('main-message', 'info', '🤖 AI flashcards bana raha hai...')
      const cards = await generateFlashcards(text, subject)

      showMsg('main-message', 'info', '💾 Database mein save ho raha hai...')
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const note  = await saveNote(
        session.access_token,
        session.user.id,
        tab.title || 'Extension Note',
        text,
        subject
      )
      await saveCards(session.access_token, session.user.id, note.id, cards)

      renderCards(cards)
      showScreen('cards')
      clearMsg('main-message')

    } catch (err) {
      showMsg('main-message', 'error', '❌ ' + err.message)
    } finally {
      btn.disabled    = false
      btn.textContent = '✨ Flashcards Generate Karo'
    }
  })

  // BACK
  document.getElementById('btn-back').addEventListener('click', () => showScreen('main'))

  // OPEN APP
  document.getElementById('btn-open-app').addEventListener('click', () => {
    chrome.tabs.create({ url: CONFIG.APP_URL + '/dashboard' })
  })
})