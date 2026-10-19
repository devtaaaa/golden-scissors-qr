import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'openrouter-api-dev',
        configureServer(server) {
          server.middlewares.use('/api/generate-review', async (req, res, next) => {
            if (req.method !== 'POST') return next()

            let bodyStr = ''
            req.on('data', (chunk: Buffer) => (bodyStr += chunk.toString()))
            req.on('end', async () => {
              try {
                const body = JSON.parse(bodyStr)
                const { service, stars, staffFeedback, likedMost, additionalComments } = body

                // ── Validation ───────────────────────────────────────────
                if (!service || typeof service !== 'string' || service.trim().length < 1) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Service is required.' }))
                  return
                }
                if (!stars || typeof stars !== 'number' || stars < 1 || stars > 5) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Star rating is required.' }))
                  return
                }
                if (!staffFeedback || typeof staffFeedback !== 'string') {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Staff feedback is required.' }))
                  return
                }
                if (!likedMost || typeof likedMost !== 'string') {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Liked most is required.' }))
                  return
                }

                // ── API key check ────────────────────────────────────────
                const apiKey = env.OPENROUTER_API_KEY
                if (!apiKey) {
                  console.warn('[Review API] OPENROUTER_API_KEY not set')
                  res.statusCode = 503
                  res.end(JSON.stringify({
                    error: 'API key not configured. Add OPENROUTER_API_KEY to .env and restart.',
                    setupRequired: true,
                  }))
                  return
                }

                const model = env.OPENROUTER_MODEL || 'openrouter/auto'
                const url   = 'https://openrouter.ai/api/v1/chat/completions'

                const starLabel = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][stars]

                // ── System prompt ────────────────────────────────────────
                const systemPrompt = `You are a review-writing assistant for a hair and beauty salon.

Write a short, natural first-person Google review based ONLY on the customer's answers below.
- Do NOT invent any names, prices, products, events, or services not mentioned.
- Do NOT mention AI.
- Do NOT use hashtags, emojis, or promotional language.
- Match the tone to the star rating — lower stars = more honest/constructive, higher stars = positive.
- Keep it 40–90 words, conversational and genuine.
- Return ONLY the review text. No quotes. No preamble.`

                // ── User prompt ──────────────────────────────────────────
                const userPrompt = `Salon: Golden Scissor Unisex Salon, Haridwar, Uttarakhand

Customer answers:
- Service experienced: ${service.trim()}
- Overall rating: ${stars}/5 stars (${starLabel})
- Staff experience: ${staffFeedback}
- Liked most: ${likedMost}
- Additional comments: ${additionalComments?.trim() || 'None'}`

                // ── Call OpenRouter ──────────────────────────────────────
                console.log(`[Review API] Calling ${model} | ${stars}★ | ${service}`)
                const apiRes = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
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

                if (apiRes.status === 429) {
                  res.statusCode = 429
                  res.end(JSON.stringify({ error: 'Too many requests. Please try again in a moment.' }))
                  return
                }

                if (!apiRes.ok) {
                  const errText = await apiRes.text()
                  console.error('[Review API] OpenRouter error:', errText)
                  res.statusCode = 502
                  res.end(JSON.stringify({ error: 'Could not generate review. Please try again.' }))
                  return
                }

                const data = (await apiRes.json()) as Record<string, unknown>
                const choices = data.choices as Array<{ message: { content: string } }>
                const reviewText = choices?.[0]?.message?.content?.trim() || ''

                if (!reviewText) {
                  res.statusCode = 502
                  res.end(JSON.stringify({ error: 'Empty AI response. Please try again.' }))
                  return
                }

                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ review: reviewText }))

              } catch (e) {
                console.error('[Review API] Error:', e)
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Something went wrong. Please try again.' }))
              }
            })
          })
        },
      },
    ],
  }
})
