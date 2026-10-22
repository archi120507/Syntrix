# CyberShield AI

AI Cyber Threat & Fraud Detection dashboard (React + TypeScript + Vite + Tailwind CSS).

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## Configure Gemini

Copy `.env.example` to `.env`, then add your key after the equals sign:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
```

This is the environment variable currently supported by the app. Leave it empty to
use the offline rule engine. Vite reads it when starting or building the app; restart
the dev server after changing it. You can also enter a key in the app's settings.

**Security note:** This is a browser application, so a `VITE_` variable is included in
the client bundle and can be seen by users. Do not use this method for a production
secret. Use a server-side API proxy for production.

## Build for production

```bash
npm run build
npm run preview
```

## Notes

- Works offline using the built-in rule-based engine.
- Optionally add a Gemini API key from the in-app settings (stored in your browser's localStorage).
- `.env` is local-only and ignored by Git; `.env.example` documents the supported variable.
