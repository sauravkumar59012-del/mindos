import React from 'react'
import { useNavigate } from 'react-router-dom'

function Home() {
    const navigate = useNavigate()
  return (
    
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex flex-col items-center justify-center p-6">

      <div className="text-7xl mb-6">🧠</div>

      <h1 className="text-5xl font-bold text-purple-700 mb-3 text-center">
        MindOS
      </h1>

      <p className="text-xl text-gray-500 mb-2 text-center">
        AI-Powered Second Brain for Students
      </p>

      <p className="text-gray-400 mb-10 text-center max-w-md">
        Notes paste karo → AI flashcards banaye → Kabhi mat bhulo! 🚀
      </p>

      <button
        onClick={() => navigate('/dashboard')}
        className="bg-purple-600 text-white px-12 py-4 rounded-2xl text-lg font-bold hover:bg-purple-700 active:scale-95 transition-all shadow-xl"
      >
        Start →
      </button>


      // Home.jsx mein "Abhi Shuru Karo" button ke neeche ye add karo:

      <p className="mt-4 text-sm text-gray-400">
        Pehle se account hai?{' '}
        <button
          onClick={() => navigate('/login')}
          className="text-purple-600 font-semibold hover:underline"
        >
          Login Karo →
        </button>
      </p>



      <div className="mt-16 grid grid-cols-3 gap-4 max-w-sm text-center">
        {[
          { icon: '📝', label: 'Notes Capture' },
          { icon: '🤖', label: 'AI Flashcards'  },
          { icon: '🎯', label: 'Smart Quiz'      },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
            <div className="text-3xl mb-2">{item.icon}</div>
            <p className="text-xs text-gray-500 font-semibold">{item.label}</p>
          </div>
        ))}
      </div>

    </div>
  )
}

export default Home
