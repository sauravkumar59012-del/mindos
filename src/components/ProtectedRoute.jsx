// src/components/ProtectedRoute.jsx
// Ye check karta hai — login hai ya nahi
// Login nahi → /login pe bhejo
// Login hai → page dikhao

import { useState, useEffect } from 'react'
import { Navigate }            from 'react-router-dom'
import { supabase }            from '../lib/supabase'

function ProtectedRoute({ children }) {

  const [user,    setUser]    = useState(undefined)
  // undefined = still checking
  // null      = not logged in
  // object    = logged in

  useEffect(() => {
    // Current user check karo
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user || null)
    )

    return () => subscription.unsubscribe()
  }, [])

  // Still checking
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-3">🧠</div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Not logged in → login pe bhejo
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in → page dikhao
  return children
}

export default ProtectedRoute