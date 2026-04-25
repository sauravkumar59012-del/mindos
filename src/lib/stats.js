// src/lib/stats.js
// Dashboard ke liye sab data fetch karta hai

import { supabase } from './supabase'

// ================================
// MAIN FUNCTION — sab stats ek saath
// ================================
export async function fetchDashboardStats() {

  const today = new Date().toISOString().split('T')[0]

  // Aaj se 7 din pehle
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  // ================================
  // Parallel mein sab fetch karo
  // ================================
  const [
    notesRes,
    cardsRes,
    dueRes,
    weekRes,
    historyRes,
  ] = await Promise.all([

    // Total notes
    supabase
      .from('notes')
      .select('*', { count: 'exact', head: true }),

    // Total flashcards
    supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true }),

    // Aaj due cards
    supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .lte('next_review', today),

    // Is hafte ke reviews
    supabase
      .from('review_history')
      .select('reviewed_at, rating')
      .gte('reviewed_at', weekAgoStr),

    // Aaj ke reviews
    supabase
      .from('review_history')
      .select('*', { count: 'exact', head: true })
      .gte('reviewed_at', today),
  ])

  // ================================
  // Weekly data process karo
  // ================================
  const weeklyData = buildWeeklyData(weekRes.data || [], weekAgoStr)

  // ================================
  // Streak calculate karo
  // ================================
  const streak = calcStreak(weekRes.data || [])

  return {
    totalNotes:    notesRes.count   || 0,
    totalCards:    cardsRes.count   || 0,
    dueToday:      dueRes.count     || 0,
    reviewedToday: historyRes.count || 0,
    weeklyData,
    streak,
  }
}

// ================================
// Weekly bar graph data banao
// ================================
function buildWeeklyData(reviews, weekAgoStr) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const result = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekAgoStr)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    // Us din kitne reviews hue
    const count = reviews.filter(r =>
      r.reviewed_at.startsWith(dateStr)
    ).length

    result.push({
      day:   days[date.getDay()],
      date:  dateStr,
      count,
      isToday: dateStr === new Date().toISOString().split('T')[0]
    })
  }

  return result
}

// ================================
// Streak calculate karo
// ================================
function calcStreak(reviews) {
  if (!reviews.length) return 0

  // Unique dates nikalo
  const dates = [...new Set(
    reviews.map(r => r.reviewed_at.split('T')[0])
  )].sort().reverse()

  let streak  = 0
  const today = new Date()

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)
    const expectedStr = expected.toISOString().split('T')[0]

    if (dates[i] === expectedStr) {
      streak++
    } else {
      break
    }
  }

  return streak
}