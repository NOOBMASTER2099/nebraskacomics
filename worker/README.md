# Nebraska Comics — plaque mockup Worker

Free Cloudflare Worker that generates AI mockups for custom Collector's Den name plaques.

## Endpoints

- `POST /mockup` — JSON `{ name, color?, style?, notes? }` → `{ id, url, remaining }`
- `GET /mockup/:id` — serves the stored mockup image
- Cap: 3 mockups per client IP per day (KV)

CORS allowed for nebraskacomics.com (and www). Secret: XAI_API_KEY
