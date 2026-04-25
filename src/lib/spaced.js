// src/lib/spaced.js
// SM2 Spaced Repetition Algorithm
// Ye decide karta hai — kab kaunsi card dobara aayegi

// ================================
// MAIN FUNCTION — Card rate karo
// ================================
export function rateCard(card, rating) {

  // Rating ko number mein convert karo
  // wrong=0, hard=1, medium=2, easy=3
  const ratingMap = {
    'wrong':  0,
    'hard':   1,
    'medium': 2,
    'easy':   3
  }

  const q = ratingMap[rating] ?? 1

  // Current values lo — ya defaults use karo
  let easeFactor  = card.ease_factor  || 2.5
  let interval    = card.interval     || 1
  let reviewCount = card.review_count || 0

  // ================================
  // SM2 Formula
  // ================================
  if (q < 2) {
    // Wrong/Hard → aaj dobara aao
    interval    = 1
    reviewCount = 0
  } else {
    // Sahi jawab → interval badhao
    if (reviewCount === 0) {
      interval = 1
    } else if (reviewCount === 1) {
      interval = 3
    } else {
      interval = Math.round(interval * easeFactor)
    }
    reviewCount += 1
  }

  // Ease factor update karo
  easeFactor = easeFactor + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))

  // Minimum 1.3 — bahut easy mat banna
  if (easeFactor < 1.3) easeFactor = 1.3

  // Agla review date calculate karo
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  return {
    ease_factor:  Math.round(easeFactor * 100) / 100,
    interval:     interval,
    review_count: reviewCount,
    next_review:  nextReview.toISOString().split('T')[0]
    // Format: "2024-01-15"
  }
}

// ================================
// Aaj ki due cards filter karo
// ================================
export function getDueCards(cards) {
  const today = new Date().toISOString().split('T')[0]
  return cards.filter(card => card.next_review <= today)
}

// ================================
// Cards shuffle karo — random order
// ================================
export function shuffleCards(cards) {
  const arr = [...cards]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ================================
// Session stats calculate karo
// ================================
export function calcStats(results) {
  const total   = results.length
  const correct = results.filter(r => r !== 'wrong').length
  const score   = total > 0 ? Math.round((correct / total) * 100) : 0

  return {
    total,
    correct,
    wrong:  total - correct,
    score,
    easy:   results.filter(r => r === 'easy').length,
    medium: results.filter(r => r === 'medium').length,
    hard:   results.filter(r => r === 'hard').length,
  }
}