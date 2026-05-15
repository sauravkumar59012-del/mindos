// src/App.jsx
import { useState, useEffect }  from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase }             from './lib/supabase'
import Home                     from './pages/Home'
import Login                    from './pages/Login'
import Dashboard                from './pages/Dashboard'
import Quiz                     from './pages/Quiz'
import AITutor                  from './pages/AITutor'  // ← NEW
import ProtectedRoute           from './components/ProtectedRoute'

function App() {
  const [user,    setUser]    = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Current session check karo
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Auth change pe update karo
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // App loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🧠</div>
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"/>
          <p className="text-gray-400 text-sm mt-3">MindOS load ho raha hai...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes */}
        <Route path="/" element={<Home />} />

        {/* Login — already logged in toh dashboard pe bhejo */}
        <Route
          path="/login"
          element={
            user
              ? <Navigate to="/dashboard" replace />
              : <Login />
          }
        />

        {/* Protected routes — login zaruri */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route 
            path="/tutor"     
            element={
            <ProtectedRoute>
              <AITutor />
            </ProtectedRoute>
          } 
       />  {/* ← NEW */}


        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          }
        />

      



        {/* 404 — home pe bhejo */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App