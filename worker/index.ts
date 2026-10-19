import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  ASSETS: Fetcher
  OPENROUTER_API_KEY: string
  OPENROUTER_MODEL?: string
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('*', cors())

app.post('/api/generate-review', async (c) => {
  try {
    const body = await c.req.json<{
      service?: string
      stars?: number
      staffFeedback?: string
      likedMost?: string
      additionalComments?: string
    }>()

    const { service, stars, staffFeedback, likedMost, additionalComments } = body

    if (!service || typeof service !== 'string' || service.trim().length < 1)
      return c.json({ error: 'Service is required.' }, 400)
    if (!stars || typeof stars !== 'number' || stars < 1 || stars > 5)
      return c.json({ error: 'Star rating is required.' }, 400)
    if (!staffFeedback || typeof staffFeedback !== 'string')
      return c.json({ error: 'Staff feedback is required.' }, 400)
    if (!likedMost || typeof likedMost !== 'string')
      return c.json({ error: 'Liked most is required.' }, 400)
    if (additionalComments && additionalComments.length > 500)
      return c.json({ error: 'Additional comments too long.' }, 400)

    const apiKey = c.env.OPENROUTER_API_KEY
    if (!apiKey)
      return c.json({ error: 'Server misconfiguration: API key not set.', setupRequired: true }, 503)

    const model = c.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'
    const starLabel = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][stars]

    const systemPrompt = `You are a review-writing assistant for a hair and beauty salon.

Write a short, natural first-person Google review based ONLY on the customer's answers below.
- Do NOT invent any names, prices, products, events, or services not mentioned.
- Do NOT mention AI.
- Do NOT use hashtags, emojis, or promotional language.
- Match the tone to the star rating — lower stars = more honest/constructive, higher stars = positive.
- Keep it 40–90 words, conversational and genuine.
- Return ONLY the review text. No quotes. No preamble.`

    const userPrompt = `Salon: Golden Scissor Unisex Salon, Haridwar, Uttarakhand

Customer answers:
- Service experienced: ${service.trim()}
- Overall rating: ${stars}/5 stars (${starLabel})
- Staff experience: ${staffFeedback}
- Liked most: ${likedMost}
- Additional comments: ${additionalComments?.trim() || 'None'}`

    const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://golden-scissor.pages.dev',
        'X-Title': 'Golden Scissor Review Assistant',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.72,
        max_tokens: 280,
      }),
    })

    if (apiRes.status === 429)
      return c.json({ error: 'Too many requests. Please try again in a moment.' }, 429)

    if (!apiRes.ok) {
      const errText = await apiRes.text()
      console.error('[Worker] OpenRouter error:', errText)
      return c.json({ error: 'Could not generate review. Please try again.' }, 502)
    }

    const data = (await apiRes.json()) as { choices?: Array<{ message: { content: string } }> }
    const reviewText = data.choices?.[0]?.message?.content?.trim() || ''

    if (!reviewText)
      return c.json({ error: 'Empty AI response. Please try again.' }, 502)

    return c.json({ review: reviewText })

  } catch (err) {
    console.error('[Worker] Error:', err)
    return c.json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})

app.all('*', async (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
