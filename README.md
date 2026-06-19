# Wishlight

A cute birthday candle web app. Open it on a phone, light the candle, make a wish, and use the microphone to extinguish the flame. If microphone access is denied or unavailable, tapping still makes the wish.

## Features

- Animated birthday candle with flickering flame, glow, smoke, and confetti
- Mobile-first React UI
- Web Audio API blow detection using microphone RMS volume
- Cute settings menu for adjusting microphone sensitivity per device
- Tap fallback for denied or unsupported microphone access
- Accessible labels, reduced-motion support, and touch-friendly controls
- Static frontend only: no backend, database, or accounts

## Tech Stack

- React
- TypeScript
- Vite
- CSS
- Web Audio API

## Requirements

- Node.js 20 or newer
- npm
- HTTPS in production for microphone access

Microphone permissions must be requested from a user gesture, so the app waits until the user taps `Light the candle`.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open:

```txt
http://127.0.0.1:5173/
```

Build the production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## App Flow

1. The candle appears lit.
2. Tap `Light the candle`.
3. The browser asks for microphone permission.
4. The button changes to `Make a wish and blow the candle`.
5. A sustained breath near the mic extinguishes the flame.
6. Smoke, confetti, and `Wish made` appear.
7. Tap `Make another wish` to reset.

If the microphone is denied or unsupported, the app shows a message and lets the user tap the candle or button to complete the wish.

## Sensitivity Settings

Phone microphones and browser audio processing can vary a lot, so Wishlight includes a small sparkle settings button near the top-right of the candle screen.

Open it to adjust `Wish sensitivity` from `1` to `10`:

- Lower values require a stronger, steadier breath.
- Higher values make the candle easier to extinguish.
- The current setting is saved in `localStorage` on the device.
- Sensitivity updates live while the microphone is listening.

## Blow Detection

The reusable hook lives at `src/hooks/useBlowDetector.ts`.

It uses:

- `navigator.mediaDevices.getUserMedia({ audio: true })`
- `AudioContext`
- `AnalyserNode`
- `requestAnimationFrame`
- RMS volume from time-domain audio samples

The app defaults to sensitivity `9`, which maps to roughly:

```txt
threshold = 0.024
minDurationMs = 104
cooldownMs = 1500
```

The microphone stream is stopped when the candle is blown out, the detector is disabled, or the component unmounts.

## Deploying on Vercel

Vercel is the recommended deployment target for this app. Wishlight is a static Vite frontend, so Vercel can build it and serve the generated `dist/` files over HTTPS.

This project includes `vercel.json` with a single-page-app rewrite so any route falls back to `index.html`.

### 1. Push the project to GitHub

Commit the app and push it to a GitHub repository.

### 2. Import the project on Vercel

1. Go to [Vercel](https://vercel.com/).
2. Create a new project.
3. Import the Wishlight GitHub repository.
4. Select the Wishlight repository.

### 3. Confirm build settings

Vercel should detect Vite automatically. If you need to set the values manually, use:

The important settings are:

```txt
Framework preset: Vite
Install command: npm install
Build command: npm run build
Output directory: dist
```

No backend, serverless functions, database, or environment variables are required.

### 4. Deploy

Click `Deploy`. Vercel will install dependencies, run the production build, and publish the static app.

Vercel provides HTTPS deployment URLs automatically. Use the production URL on your phone so microphone permission works.

### 5. Optional custom domain

In the Vercel project settings, open `Domains` and add your custom domain. Vercel will show the DNS records to configure.

### 6. Test on a phone

Open the Vercel HTTPS URL on a mobile browser and test:

- Tap `Light the candle`
- Accept microphone permission
- Make a wish and blow near the mic
- Confirm the flame disappears and `Wish made` appears

Vercel's Vite deployment docs are here: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Static Hosting Alternatives

The production output is generated in `dist/`, so the app can also be deployed to static hosts such as Netlify, Cloudflare Pages, or any CDN-backed static host.

Typical static-host settings:

```txt
Install command: npm install
Build command: npm run build
Output directory: dist
```

## Project Structure

```txt
src/
  App.tsx
  components/
    Candle.tsx
    Flame.tsx
    Smoke.tsx
    Confetti.tsx
    PermissionMessage.tsx
  hooks/
    useBlowDetector.ts
  styles/
    globals.css
```

## Notes

- The app is frontend-only.
- No server is required for app logic.
- For production microphone access, always use HTTPS.
