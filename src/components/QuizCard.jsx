// src/components/QuizCard.jsx
import { useState } from 'react'

function QuizCard({ card, onRate, cardNumber, totalCards }) {

  const [flipped, setFlipped] = useState(false)
  const [rated,   setRated]   = useState(false)

  // Card flip karo
  function handleFlip() {
    if (!rated) setFlipped(true)
  }

  // Rating dene ke baad next card pe jao
  async function handleRate(rating) {
    if (rated) return
    setRated(true)
    await onRate(card, rating)
  }

  // Rating buttons ka style
  const ratingButtons = [
    {
      rating: 'wrong',
      label:  '❌ Bhool Gaya',
      style:  'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
    },
    {
      rating: 'hard',
      label:  '💪 Mushkil Tha',
      style:  'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
    },
    {
      rating: 'medium',
      label:  '🤔 Theek Tha',
      style:  'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
    },
    {
      rating: 'easy',
      label:  '😊 Aasaan Tha',
      style:  'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
    },
  ]

  return (
    <div className="w-full max-w-lg mx-auto">

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Card {cardNumber} / {totalCards}</span>
          <span>{Math.round((cardNumber / totalCards) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(cardNumber / totalCards) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        onClick={handleFlip}
        className={`
          w-full min-h-48 rounded-2xl border-2 p-6 mb-4 cursor-pointer
          transition-all duration-200 select-none
          ${flipped
            ? 'bg-purple-600 border-purple-600'
            : 'bg-white border-purple-200 hover:border-purple-400 hover:shadow-md'
          }
        `}
      >
        {/* Card Front */}
        {!flipped ? (
          <div className="flex flex-col h-full min-h-36">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-3">
              Question
            </span>
            <p className="text-gray-800 font-medium text-lg leading-relaxed flex-1">
              {card.front}
            </p>
            <p className="text-xs text-purple-300 text-right mt-4">
              tap to reveal answer →
            </p>
          </div>
        ) : (
          /* Card Back */
          <div className="flex flex-col h-full min-h-36">
            <span className="text-xs font-semibold text-purple-200 uppercase tracking-wide mb-3">
              Answer
            </span>
            <p className="text-white font-medium text-lg leading-relaxed flex-1">
              {card.back}
            </p>
          </div>
        )}
      </div>

      {/* Rating Buttons — sirf answer dekhne ke baad dikhein */}
      {flipped && !rated && (
        <div>
          <p className="text-center text-sm text-gray-500 mb-3">
            Apna jawab kaisa tha?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ratingButtons.map(btn => (
              <button
                key={btn.rating}
                onClick={() => handleRate(btn.rating)}
                className={`
                  py-3 px-4 rounded-xl border font-semibold text-sm
                  transition-all active:scale-95 ${btn.style}
                `}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rated — next card loading */}
      {rated && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">⏳ Next card are Loading...</p>
        </div>
      )}

      {/* Hint — agar hai toh */}
      {card.hint && !flipped && (
        <p className="text-center text-xs text-gray-400 mt-3 italic">
          💡 Hint: {card.hint}
        </p>
      )}

    </div>
  )
}

export default QuizCard