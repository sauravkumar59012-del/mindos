// src/pages/Login.jsx
import { useState }     from 'react'
import { useNavigate }  from 'react-router-dom'
import { signIn, signUp, signInWithGoogle, resetPassword } from '../lib/auth'

// ================================
// SCREENS:
// 'login'   → Login form
// 'signup'  → Signup form
// 'forgot'  → Password reset
// 'verify'  → Email verify message
// ================================

function Login() {
  const navigate = useNavigate()

  const [screen,   setScreen]   = useState('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState(null)
  const [showPass, setShowPass] = useState(false)

  // ================================
  // Error messages — simple bhasha
  // ================================
  const errorMap = {
    'Invalid login credentials':
      '❌ Email ya password galat hai!',
    'Email not confirmed':
      '📧 Pehle email verify karo! Inbox check karo.',
    'User already registered':
      '⚠️ Ye email already registered hai — login karo!',
    'Password should be at least 6 characters':
      '⚠️ Password kam se kam 6 characters ka hona chahiye!',
    'Unable to validate email address: invalid format':
      '⚠️ Sahi email address likho!',
    'Email rate limit exceeded':
      '⏳ Bahut zyada tries — 1 minute baad try karo!',
  }

  function getErrorMsg(err) {
    return errorMap[err.message] || '❌ ' + err.message
  }

  // ================================
  // SIGNUP HANDLER
  // ================================
  async function handleSignup() {

    // Validations
    if (!name.trim()) {
      setMessage({ type: 'warn', text: '⚠️ Apna naam likho!' })
      return
    }
    if (!email.trim()) {
      setMessage({ type: 'warn', text: '⚠️ Email likho!' })
      return
    }
    if (password.length < 6) {
      setMessage({ type: 'warn', text: '⚠️ Password kam se kam 6 characters!' })
      return
    }
    if (password !== confirm) {
      setMessage({ type: 'warn', text: '⚠️ Dono passwords match nahi kar rahe!' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      await signUp(email.trim(), password, name.trim())
      setScreen('verify')
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMsg(err) })
    } finally {
      setLoading(false)
    }
  }

  // ================================
  // LOGIN HANDLER
  // ================================
  async function handleLogin() {

    if (!email.trim() || !password) {
      setMessage({ type: 'warn', text: '⚠️ Email aur password dono bharо!' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      await signIn(email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMsg(err) })
    } finally {
      setLoading(false)
    }
  }

  // ================================
  // GOOGLE LOGIN HANDLER
  // ================================
  async function handleGoogle() {
    setLoading(true)
    setMessage(null)
    try {
      await signInWithGoogle()
      // Google redirect karega automatically
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Google login fail hua!' })
      setLoading(false)
    }
  }

  // ================================
  // FORGOT PASSWORD HANDLER
  // ================================
  async function handleForgot() {
    if (!email.trim()) {
      setMessage({ type: 'warn', text: '⚠️ Apna email likho pehle!' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await resetPassword(email.trim())
      setMessage({
        type: 'success',
        text: '✅ Password reset link bhej diya! Email check karo.'
      })
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMsg(err) })
    } finally {
      setLoading(false)
    }
  }

  // ================================
  // Message styles
  // ================================
  const msgStyle = {
    success: 'bg-green-50  border-green-200  text-green-800',
    error:   'bg-red-50    border-red-200    text-red-800',
    warn:    'bg-yellow-50 border-yellow-200 text-yellow-800',
    info:    'bg-blue-50   border-blue-200   text-blue-800',
  }

  // ================================
  // Screen change karo — form clear karo
  // ================================
  function switchScreen(s) {
    setScreen(s)
    setMessage(null)
    setPassword('')
    setConfirm('')
  }

  // ================================
  // RENDER
  // ================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🧠</div>
          <h1 className="text-3xl font-bold text-purple-700">MindOS</h1>
          <p className="text-gray-400 text-sm mt-1">
            AI-Powered Second Brain for Students
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">

          {/* ===== EMAIL VERIFY SCREEN ===== */}
          {screen === 'verify' && (
            <div className="text-center">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Verify Your Email!
              </h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                <strong>{email}</strong> pe ek verification link bheja hai.
                 Open Email  and click On link !
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
                <p className="text-blue-800 text-sm font-medium mb-2">
                  📌 Steps:
                </p>
                <ol className="text-blue-700 text-sm space-y-1">
                  <li>1. Open Email inbox </li>
                  <li>2. Find out Email of MindOS </li>
                  <li>3. click On"Confirm your email" </li>
                  <li>4. Login Agian!</li>
                </ol>
              </div>
              <button
                onClick={() => switchScreen('login')}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition"
              >
                Login  →
              </button>
              <p className="text-xs text-gray-400 mt-3">
                Nothing Email ? check Spam folder!
              </p>
            </div>
          )}

          {/* ===== LOGIN SCREEN ===== */}
          {screen === 'login' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
                Come(Wapas aaye!) 👋
              </h2>

              {/* Google Login */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 mb-4 font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Login With Google!
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200"/>
                <span className="text-xs text-gray-400 font-medium">YA</span>
                <div className="flex-1 h-px bg-gray-200"/>
              </div>

              {/* Email */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Password */}
              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end mb-5">
                <button
                  onClick={() => switchScreen('forgot')}
                  className="text-xs text-purple-600 hover:underline"
                >
                   Forget Password?
                </button>
              </div>

              {/* Message */}
              {message && (
                <div className={`border rounded-xl p-3 mb-4 text-sm text-center font-medium ${msgStyle[message.type]}`}>
                  {message.text}
                </div>
              )}

              {/* Login Button */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-60 transition active:scale-95 mb-4"
              >
                {loading ? '⏳ Login ho raha hai...' : '🚀 Login Karo'}
              </button>

              {/* Switch to Signup */}
              <p className="text-center text-sm text-gray-500">
                No Account Exist?{' '}
                <button
                  onClick={() => switchScreen('signup')}
                  className="text-purple-600 font-semibold hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </>
          )}

          {/* ===== SIGNUP SCREEN ===== */}
          {screen === 'signup' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
                create Account! ✨
              </h2>

              {/* Google Signup */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 mb-4 font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign Up with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200"/>
                <span className="text-xs text-gray-400 font-medium">YA</span>
                <div className="flex-1 h-px bg-gray-200"/>
              </div>

              {/* Name */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Rahul Kumar"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Email */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Password */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="kam se kam 6 characters"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {/* Password strength */}
                {password && (
                  <div className="mt-1.5">
                    <div className="flex gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-1 rounded-full ${
                            password.length > i * 2
                              ? password.length < 6  ? 'bg-red-400'
                              : password.length < 10 ? 'bg-yellow-400'
                              : 'bg-green-400'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs mt-1 ${
                      password.length < 6  ? 'text-red-500'
                      : password.length < 10 ? 'text-yellow-600'
                      : 'text-green-600'
                    }`}>
                      {password.length < 6  ? 'Weak — aur likho!'
                       : password.length < 10 ? 'Medium — theek hai'
                       : 'Strong! 💪'}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Confirm Password 
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                    confirm && password !== confirm
                      ? 'border-red-300 bg-red-50'
                      : confirm && password === confirm
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200'
                  }`}
                />
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500 mt-1">
                    ❌ Passwords does Not Match!
                  </p>
                )}
                {confirm && password === confirm && (
                  <p className="text-xs text-green-600 mt-1">
                    ✅ Password Match!
                  </p>
                )}
              </div>

              {/* Message */}
              {message && (
                <div className={`border rounded-xl p-3 mb-4 text-sm text-center font-medium ${msgStyle[message.type]}`}>
                  {message.text}
                </div>
              )}

              {/* Signup Button */}
              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-60 transition active:scale-95 mb-4"
              >
                {loading ? '⏳ Account ban raha hai...' : '✨ Account Banao'}
              </button>

              {/* Switch to Login */}
              <p className="text-center text-sm text-gray-500">
                Account Already Exist?{' '}
                <button
                  onClick={() => switchScreen('login')}
                  className="text-purple-600 font-semibold hover:underline"
                >
                  Login 
                </button>
              </p>
            </>
          )}

          {/* ===== FORGOT PASSWORD SCREEN ===== */}
          {screen === 'forgot' && (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🔑</div>
                <h2 className="text-xl font-bold text-gray-800">
                  Password Reset
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Email  — reset link bhejenge!
                </p>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  onKeyDown={e => e.key === 'Enter' && handleForgot()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {message && (
                <div className={`border rounded-xl p-3 mb-4 text-sm text-center font-medium ${msgStyle[message.type]}`}>
                  {message.text}
                </div>
              )}

              <button
                onClick={handleForgot}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-60 transition mb-3"
              >
                {loading ? '⏳ Bhej raha hai...' : '📧 Reset Link Bhejo'}
              </button>

              <button
                onClick={() => switchScreen('login')}
                className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition text-sm"
              >
                ← Login Again
              </button>
            </>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          MindOS — Padho, Samjho, Yaad Rakho 🧠
        </p>

      </div>
    </div>
  )
}

export default Login