# Autonomous Agency v4

Paikallinen MVP AI-markkinointitoimistolle. Yksi dashboard hallitsee:

- agency owner/admin/member -roolit
- useita asiakkaita SQLite-tietokannassa
- client-kohtaisia promptteja sisallongenerointiin
- landing page + SEO + 3 blogia per asiakas
- idempotentimpaa publish-syncia WordPressiin ja Webflowhun
- SMTP-pohjaista agency-raportointia
- taustalla pyörivää job queuea generoinnille, publishille ja reporteille
- public client -sivuja CTA- ja lead-trackingilla
- Stripe checkoutin kuukausilaskutusta varten
- EasyOnlinePresence-agentin ja ontologiapohjaisen intake + strategy -flow'n

## Stack

- Node.js + Express
- OpenAI Responses API
- Stripe Checkout
- SQLite (`node:sqlite`)
- Nodemailer SMTP-raportteihin
- Vanilla HTML/CSS/JS frontend

## Kaynnistys

1. Asenna riippuvuudet:

```bash
npm install
```

2. Luo `.env`:

```bash
cp .env.example .env
```

3. Tayta ainakin:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5-mini
PORT=3000
HOST=127.0.0.1
APP_URL=http://127.0.0.1:3000
SQLITE_PATH=./data/autonomous-agency.sqlite
SCHEDULER_INTERVAL_MS=60000
SESSION_TTL_DAYS=30
QUEUE_INTERVAL_MS=3000
QUEUE_CONCURRENCY=2
```

4. Jos haluat oikean billingin, lisaa myos:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_SCALE=price_...
```

5. Kaynnista:

```bash
npm run dev
```

6. Avaa:

```text
http://127.0.0.1:3000
```

## V4-ominaisuudet

- Manual generate/publish/report -toiminnot menevat nyt job queueen.
- Worker ajaa queued jobit taustalla.
- Scheduler ei generoikaan suoraan, vaan jonottaa generate-jobit.
- Publish yrittää paivittaa olemassa olevia ulkoisia itemeita publish mappingien avulla.
- Jokaiselle clientille syntyy public URL:

```text
http://127.0.0.1:3000/client/<clientId>
```

- Public sivu trackaa:
  - `page_view`
  - `cta_click`
  - `lead_submit`

## Publish target -esimerkit

WordPress:

```json
{
  "baseUrl": "https://example.com",
  "username": "api-user",
  "applicationPassword": "xxxx xxxx xxxx xxxx xxxx xxxx",
  "status": "draft"
}
```

Webflow:

```json
{
  "token": "wf_xxx",
  "collectionId": "collection_id",
  "siteUrl": "https://your-site.webflow.io",
  "titleField": "name",
  "slugField": "slug",
  "contentField": "post-body",
  "excerptField": "summary",
  "keywordField": "keyword"
}
```

## API-rajapinnat

- `GET /api/bootstrap`
- `GET /api/lumix`
- `GET /api/jobs`
- `POST /api/worker/run-now`
- `PUT /api/clients/:id/intake`
- `POST /api/clients/:id/recommendation`
- `POST /api/clients/:id/generate`
- `POST /api/clients/:id/publish`
- `POST /api/reports/send`
- `POST /api/scheduler/run-now`
- `GET /api/public/clients/:id`
- `POST /api/public/clients/:id/track`
- `POST /api/public/clients/:id/lead`

## Huomioita

- Ilman `OPENAI_API_KEY`:ta generointi toimii demo-tilassa.
- EasyOnlinePresence on ontologiapohjainen agentti, joka muuttaa briefin rakenteiseksi profiiliksi, suositukseksi ja generointikontekstiksi.
- Ilman Stripe-avaimia checkout fallbackaa demo-tilaan mutta subscription-rakenne tallentuu silti.
- SMTP-asetukset tallennetaan SQLiteen dashboardin kautta.
- WordPress/Webflow publish on nyt sync-tyylinen vain niin pitkalle kuin ulkoinen item-id on tiedossa; tämä on selvästi parempi kuin aiempi create-always, mutta ei viela taydellinen CMS-synkro kaksisuuntaisille muutoksille.
- `node:sqlite` on Node:ssa edelleen experimental, mutta se piti riippuvuudet minimissa ja teki paikallisesta MVP:sta yksinkertaisemman.
