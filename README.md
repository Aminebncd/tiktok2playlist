# Soundsift: TikTok Saved Sounds → Spotify

Soundsift is a small Next.js utility that reads a TikTok data archive **inside the browser**, extracts Favorite Sounds, finds likely Spotify tracks, lets the user review them, and creates a private playlist.

## Architecture

- **Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4** for the web application.
- **JSZip in the client bundle** for local archive parsing. The ZIP itself never enters a request or server route.
- A small, testable parser in `lib/tiktok/parseArchive.ts` supports TikTok JSON and text exports and gives user-friendly failures when the format is absent or has changed.
- Next.js route handlers perform the only server work: Spotify Authorization Code OAuth, catalogue search, token refresh, and playlist creation.
- Spotify access and refresh tokens live in secure, HTTP-only, same-site cookies. There is no database, account system, analytics, or import history.
- Imported sound URLs/names are kept in React state and `sessionStorage` only so the OAuth redirect can resume the import. Only these extracted values—not the archive—are sent to the Spotify search route.

## Local setup

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://127.0.0.1:3000>. Available checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Spotify developer configuration

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add `http://127.0.0.1:3000/api/spotify/callback` as a redirect URI. Spotify requires an exact match, including hostname.
3. Copy `.env.example` to `.env.local` and set:
   - `SPOTIFY_CLIENT_ID`: the app client ID.
   - `SPOTIFY_CLIENT_SECRET`: the app client secret (server-only; never prefix it with `NEXT_PUBLIC_`).
   - `SPOTIFY_REDIRECT_URI`: the exact registered callback URI.
4. If the Spotify app is in development mode, add the Spotify account you will test with under the app’s user management settings.
5. Restart `npm run dev` after changing environment variables.

The app requests only `playlist-modify-private`. Catalogue search does not require a scope, `/me` is available with an application user token, and the created playlist is private.

## Manual end-to-end test

1. In TikTok, request a data download in JSON or text format and download the resulting ZIP without extracting it.
2. Start the app with valid Spotify settings and open `http://127.0.0.1:3000`.
3. Drop the ZIP on the import area. Confirm that the Favorite Sounds count/list appears and that browser network tools show no ZIP upload.
4. Select **Connect Spotify**, approve the one requested permission, and wait for catalogue matching.
5. Review matched and unmatched rows; uncheck an unwanted result.
6. Enter a playlist name and create it. Double clicks are blocked while the request is active.
7. Follow the success link and confirm the private playlist and track count in Spotify.

Live OAuth and playlist creation require real Spotify credentials and therefore are not exercised by automated tests. Spotify client behavior is tested with mocked `fetch` responses; no test calls Spotify.

## Privacy and limitations

Archive parsing happens entirely on the user’s device. Soundsift does not upload, log, or persist archive contents. It sends only the extracted sound URL/name/date needed for matching after the user connects Spotify. OAuth cookies last only for the session functionality (the refresh cookie expires after 30 days) and can be removed by clearing site data.

TikTok occasionally changes its archive shape. The parser intentionally fails clearly instead of guessing. Matching is deliberately simple: it searches Spotify using an explicit sound name or a conservative TikTok URL slug and returns the first candidate for human review. It does not use AI, fingerprinting, or claim that every result is exact.
