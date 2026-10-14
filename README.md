# Tiny Fighter Arena

**Pollinations QUEST #17250** — A browser game where players describe a fighter in one line, AI brings it to life, and they battle with commentary.

## Features
- 🎨 **AI Fighter Generation** — Describe any fighter, get name, style, abilities, personality
- 🖼️ **AI Art** — Fighter portraits via FLUX.1 Schnell
- 🎙️ **Voice Commentary** — Turn-by-turn battle narration via OpenAI TTS
- ⚔️ **Turn-based Battles** — Strategic combat with randomized outcomes
- 🔐 **BYOP (Bring Your Own Pollen)** — Players pay with their own Pollinations balance
- 📤 **Shareable Battles** — Copy link to share your epic fights

## Tech Stack
- Vanilla HTML/CSS/JS — no build step, deploys anywhere
- Pollinations API for text, image, audio generation
- Pollinations OAuth for BYOP authentication

## Deployment
Deploy to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages):
1. Push to GitHub
2. Enable GitHub Pages from `main` branch
3. Visit your `username.github.io/tiny-fighter-arena`

## Pollinations QUEST #17250
This project was built for the [Pollinations QUEST #17250](https://github.com/pollinations/pollinations/issues/17250):
> Players describe a fighter in one line, and the AI brings it to life and sends it into a short, commentated battle against a challenger.

Reward: **10 Pollen** upon app submission approval.

## Development
```bash
# Just open index.html in a browser
# Or serve locally:
npx serve .
# or
python3 -m http.server 8000
```

## Configuration
To enable BYOP payments, create a Pollinations App Key at https://enter.pollinations.ai/keys and update the `clientId` in `app.js`.

## License
MIT — Built for Pollinations QUEST #17250
