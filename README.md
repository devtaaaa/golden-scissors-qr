# Golden Scissor — AI Google Review Assistant

A premium, mobile-first AI-powered Google review assistant for **Golden Scissor Unisex Salon**, Haridwar, Uttarakhand.

Customers scan a QR code, answer 4 quick questions about their experience, generate a natural AI-written review, copy it, and continue to Google to post it themselves.

---

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. (Optional) Add your OpenRouter API key to .env
#    Without it, the app works fully — but AI generation will show a setup message.

# 4. Start dev server
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Adding the OpenRouter API Key

1. Get your free API key from https://openrouter.ai/keys
2. Open `.env` and set:
   ```
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   OPENROUTER_MODEL=openrouter/auto
   ```
   - Leave `OPENROUTER_MODEL` blank to use the default (`openrouter/auto`).
   - For a free model, try: `meta-llama/llama-3.1-8b-instruct:free`
3. Restart the dev server: `npm run dev`

The app will now generate real AI reviews using your answers.

> ⚠️ Never commit your `.env` file. It is listed in `.gitignore`.

---

## Google Review URL

The "Continue to Google Reviews" button uses this exact URL (verified):

```
https://search.google.com/local/writereview?placeid=ChIJP5xQ0l9HCTkR3iqH05m7-y4
```

This is hardcoded in `src/App.tsx` and does not need configuration.

---

## Project Structure

```
golden scissors qr project/
├── src/
│   ├── App.tsx          # Full React app (wizard + result screen)
│   ├── main.tsx         # React entry point
│   └── index.css        # Design system & component styles
├── worker/
│   └── index.ts         # Cloudflare Worker — API backend (keeps key secret)
├── public/
│   └── scissors.svg     # Favicon
├── index.html           # HTML entry point
├── vite.config.ts       # Vite config + dev-mode API proxy
├── wrangler.json        # Cloudflare Workers deployment config
├── .env.example         # Environment variable template
└── package.json
```

---

## Deployment (Cloudflare Workers / Pages)

### Step 1 — Build & Deploy

```bash
npm run deploy
```

This runs `tsc && vite build` then deploys via Wrangler.

### Step 2 — Set the API key in production

```bash
npx wrangler secret put OPENROUTER_API_KEY
# Enter your key when prompted
```

Optionally set the model:
```bash
npx wrangler secret put OPENROUTER_MODEL
# Enter: openrouter/auto  (or any model slug)
```

### Step 3 — Get your production URL

After deploy, Wrangler will print your URL e.g.:
```
https://golden-scissor-review.your-subdomain.workers.dev
```

---

## Generating the Production QR Code

Once your app is deployed, generate the final QR code:

**Option A — Using the in-app QR screen:**
- Open your live URL
- Click the QR icon in the header (or visit `/?qr`)
- Screenshot or print the QR — it will point to your live URL

**Option B — Online generator:**
- Go to https://qr.io or https://www.qrcode-monkey.com
- Enter your live URL
- Download as high-resolution PNG or SVG for printing
- Print at 300+ DPI for reliable scanning

> ⚠️ Never use the localhost QR for printing. Only use QRs generated after deployment.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Build production bundle |
| `npm run lint` | Run oxlint |
| `npm run preview` | Preview production build locally |
| `npm run deploy` | Build and deploy to Cloudflare Workers |

---

## Privacy

- No customer names, emails, or phone numbers are collected.
- Questionnaire answers are processed in memory and not stored permanently.
- Reviews are only posted when the customer submits them on Google themselves.
- No analytics or tracking code is included.

---

## Tech Stack

- React 19 + TypeScript
- Vite 8 with TailwindCSS v4
- Cloudflare Workers (production API backend)
- OpenRouter API (AI review generation)
- Hono (Worker HTTP framework)
- qrcode.react (QR code generation)
- lucide-react (icons)
