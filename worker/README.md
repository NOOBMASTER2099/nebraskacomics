# Nebraska Comics — plaque mockup + page views Worker

Free Cloudflare Worker that generates AI mockups for custom Collector's Den name plaques, and counts privacy-friendly page views (no IPs stored).

## Endpoints

- `POST /mockup` — JSON `{ name, color?, style?, notes? }` → `{ id, url, remaining }`
- `GET /mockup/:id` — serves the stored mockup image
- Cap: 3 mockups per client IP per day (KV)
- `POST /hit` — JSON `{ path }` → increments day/month counters per path (CORS: nebraskacomics.com only; no IPs stored)
- `GET /stats?key=<STATS_KEY>` — JSON daily/monthly totals by path (America/Chicago)

CORS allowed for nebraskacomics.com (and www). Secrets: `XAI_API_KEY`, `STATS_KEY`
