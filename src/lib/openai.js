import OpenAI from 'openai'

const groq = new OpenAI({
  apiKey: "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",
  baseURL: "https://api.groq.com/openai/v1",
  dangerouslyAllowBrowser: true
})

export async function generateFlashcards(notes, subject = '') {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "Tu ek expert teacher hai. Hamesha valid JSON return kar."
      },
      {
        role: "user",
        content: `
Tu ek expert teacher hai jo student ke notes se
high-quality flashcards banata hai.

${subject ? `Subject: ${subject}` : ''}

Student ke Notes:
"""
${notes}
"""

In notes se exactly 5 flashcards banao.

Sirf valid JSON return karo:
{
  "flashcards": [
    {
      "front": "Question?",
      "back": "Answer",
      "difficulty": "easy",
      "hint": ""
    }
  ]
}
        `
      }
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
    temperature: 0.7
  })

  const result = JSON.parse(response.choices[0].message.content)

  if (!result.flashcards || !Array.isArray(result.flashcards)) {
    throw new Error("AI ne galat format diya — dobara try karo")
  }

  return result.flashcards
}

export async function generateMoreCards(existingCards, notes) {
  const existingQuestions = existingCards
    .map(c => c.front)
    .join('\n')

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{
      role: "user",
      content: `
In notes se 3 AUR flashcards banao.
Ye questions mat repeat karna:
${existingQuestions}

Notes: "${notes}"

Sirf JSON return karo:
{
  "flashcards": [
    {
      "front": "Question?",
      "back": "Answer",
      "difficulty": "easy/medium/hard",
      "hint": ""
    }
  ]
}
      `
    }],
    response_format: { type: "json_object" },
    max_tokens: 800
  })

  const result = JSON.parse(response.choices[0].message.content)
  return result.flashcards
}