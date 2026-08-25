# Deploying FBStats Live (Vercel)

The app is a **static, client-only PWA** (all data lives in the browser's
IndexedDB — there is no backend). `next build` produces a static `out/` folder
that any host can serve. These steps put it on a permanent public HTTPS URL and
make it installable on the iPad.

> Node lives at `~/.local/node` (off PATH). Prefix commands with
> `export PATH="$HOME/.local/node/bin:$PATH"` first, or use the absolute paths.

## One-time deploy

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd ~/fbstats-live
npx vercel            # first run: log in (browser), accept the defaults, link the project
npx vercel --prod     # promote to the production URL
```

Vercel auto-detects Next.js, runs the build, serves the static export, and gives
you a URL like `https://fbstats-live.vercel.app`. That URL works from anywhere —
home, the field, cellular — no Mac required.

## Install on the iPad (standalone app)

1. Open the Vercel URL in **Safari**.
2. **Share → Add to Home Screen.**
3. Launch it from the home-screen icon — full-screen, its own icon, and it
   **works fully offline** after the first load (the app shell is cached by the
   service worker; games are in IndexedDB).

## Redeploying after changes

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd ~/fbstats-live
npx vercel --prod
```

The service worker is network-first for the page, so a reload picks up the new
version; installed copies update on next launch.

## Notes

- **Data is per-device.** Each browser/device keeps its own games — there is no
  cross-device sync (that would need a backend). Exports (CSV/PDF) move data off
  a device.
- Any static host works too (Netlify, Cloudflare Pages, GitHub Pages). For a
  root domain no config is needed; GitHub Pages under a subpath needs `basePath`.
- Local development is unchanged: `npm run dev` → http://localhost:3100.
