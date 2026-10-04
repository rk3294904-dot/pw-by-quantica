# Quantica Digital

A React learning platform with batch browsing and lecture playback.

## Saved learning library

Use the star on a batch card to save or remove a favorite. The Favorites tab filters the catalog to saved batches and works with search.

Lecture progress is saved automatically while watching, on pause, when leaving playback, and when the page is hidden or closed. The Your learning section lists saved lectures and resumes unfinished lectures at their saved position. Finished videos are marked completed automatically, and the player also supports marking or unmarking completion manually. Completed lectures restart from the beginning when replayed.

Favorites and progress are stored in Netlify Database, not browser storage. An anonymous, HTTP-only browser cookie identifies the saved library. Libraries are specific to the browser profile; they do not sync across devices, and clearing cookies disconnects that browser from its previous library. No account signup is required. Database failures display a retry message without blocking course browsing or playback.

Batch cards without thumbnail URLs continue to render automatic Quantica Digital covers. Existing thumbnails are preserved, and no missing-thumbnail notice is displayed.

## Development

Install dependencies with `npm install`. Run `netlify dev --port 8889` to serve the frontend together with the library function. Running Vite alone does not serve `/api/library`.

Run `npm run typecheck` to check both frontend and server code, and `npm run lint` for linting.

The database schema is defined in `db/schema.ts`. Generate migrations with `npx drizzle-kit generate --name describe_schema_change`. Netlify applies the migrations in `netlify/database/migrations` automatically during deployment; do not manually apply them.
