import { useState, useEffect }  from 'react'
import { useNavigate }           from 'react-router-dom'
import { fetchDashboardStats }   from '../lib/stats'
import StatsCard                 from '../components/StatsCard'
import StreakCard                 from '../components/StreakCard'
import WeeklyGraph               from '../components/WeeklyGraph'
import NoteCapture               from '../components/NoteCapture'
import PDFUpload                 from '../components/PDFUpload'  // ← NEW
import { signOut }               from '../lib/auth'

function Dashboard() {
  const navigate = useNavigate()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('home')

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    try {
      const data = await fetchDashboardStats()
      setStats(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return { text: 'Good Morning', emoji: '🌅' }
    if (hour < 17) return { text: 'Good Afternoon', emoji: '☀️' }
    if (hour < 21) return { text: 'Good Evening', emoji: '🌆' }
    return { text: 'Good Night', emoji: '🌙' }
  }

  const greeting = getGreeting()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-xl font-bold text-purple-700">MindOS</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/quiz')}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition active:scale-95"
            >
              🎯 Quiz
              {stats?.dueToday > 0 && (
                <span className="bg-white text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {stats.dueToday}
                </span>
              )}
            </button>
            <button
              onClick={async () => { await signOut(); navigate('/login') }}
              className="text-sm text-gray-400 px-3 py-2 rounded-xl hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs — PDF TAB ADD KIYA! */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2">
          {[
            { id: 'home',  label: '🏠 Home'       },
            { id: 'notes', label: '📝 Notes'      },
            { id: 'pdf',   label: '📄 PDF Upload' }, // ← NEW TAB
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* HOME TAB */}
        {tab === 'home' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white">
              <p className="text-purple-200 text-sm mb-1">
                {greeting.emoji} {greeting.text}!
              </p>
              <h1 className="text-2xl font-bold mb-3">MindOS Dashboard</h1>
              {!loading && stats?.dueToday > 0 ? (
                <div
                  onClick={() => navigate('/quiz')}
                  className="bg-white/20 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/30 transition"
                >
                  <div>
                    <p className="font-semibold text-sm">🎯 {stats.dueToday} cards ready hain!</p>
                    <p className="text-purple-200 text-xs mt-0.5">Quiz shuru karo →</p>
                  </div>
                  <span className="text-2xl font-bold">{stats.dueToday}</span>
                </div>
              ) : (
                <div className="bg-white/20 rounded-xl p-3">
                  <p className="font-semibold text-sm">✅ Aaj ka kaam ho gaya!</p>
                  <p className="text-purple-200 text-xs mt-0.5">Naye notes ya PDF add karo</p>
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-100 rounded-2xl h-24 animate-pulse"/>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatsCard icon="📝" label="Total Notes"  value={stats?.totalNotes || 0}    color="blue"   />
                  <StatsCard icon="🃏" label="Total Cards"  value={stats?.totalCards || 0}    color="purple" />
                  <StatsCard icon="🎯" label="Due Today"    value={stats?.dueToday || 0}      color={stats?.dueToday > 0 ? 'amber' : 'green'} />
                  <StatsCard icon="✅" label="Aaj Kiye"     value={stats?.reviewedToday || 0} color="green"  />
                </div>
                <StreakCard streak={stats?.streak || 0} />
                <WeeklyGraph data={stats?.weeklyData || []} />

                {/* Quick Actions */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <h3 className="font-bold text-gray-800 mb-3">⚡ Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTab('notes')}
                      className="flex items-center gap-2 p-3 rounded-xl bg-purple-50 text-purple-700 font-medium text-sm hover:bg-purple-100 transition"
                    >
                      <span className="text-xl">📝</span> Notes Add
                    </button>
                    <button
                      onClick={() => setTab('pdf')}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 font-medium text-sm hover:bg-red-100 transition"
                    >
                      <span className="text-xl">📄</span> PDF Upload
                    </button>
                    <button
                      onClick={() => navigate('/quiz')}
                      className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-700 font-medium text-sm hover:bg-green-100 transition"
                    >
                      <span className="text-xl">🎯</span> Quiz Karo
                    </button>
                    <button
                      onClick={loadStats}
                      className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 font-medium text-sm hover:bg-blue-100 transition"
                    >
                      <span className="text-xl">🔄</span> Refresh
                    </button>
                  </div>
                </div>

                <MotivationalQuote />
              </>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {tab === 'notes' && <NoteCapture onSuccess={loadStats} />}

        {/* PDF TAB — NEW! */}
        {tab === 'pdf' && <PDFUpload onSuccess={loadStats} />}

      </div>
    </div>
  )
}

function MotivationalQuote() {
  const quotes = [
    { text: "Padhai aaj ki mehnat — kal ki kamiyabi!" },
    { text: "Ek ek card — ek ek step aage!" },
    { text: "Consistency beats talent — roz thoda thoda!" },
    { text: "Jo aaj sikh liya — wo zindagi bhar kaam aayega!" },
    { text: "Brain gym karo — har roz thodi practice!" },
  ]
  const quote = quotes[new Date().getDate() % quotes.length]

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
      <p className="text-indigo-800 font-medium text-sm leading-relaxed">
        💭 "{quote.text}"
      </p>
      <p className="text-indigo-400 text-xs mt-2">— MindOS</p>
    </div>
  )
}

export default Dashboard