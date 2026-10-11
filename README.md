# Aroha — Hyderabad

Aroha is civic accountability for Hyderabad: report any problem from a pin, see the **department, officials, and politicians** who own it, and open a **case** the desk can take to those offices.

This is not a government portal. Contacts are never invented. If a name is not sourced, it is not shown.

## How reporting works

- **Anonymous by default.** No login to file.
- **Details first, location second, one page.** Search or use current location like a food-delivery app, then drag the pin.
- **Who owns the work** is shown from sourced Hyderabad records only.
- **Mobile number is optional.** Leave it for WhatsApp tracking.
- Public tracking URLs look like `/case/500ARO…`. Staff work cases at `/admin`.
- **Posting on X is desk-only.** Crime and encroachment stay off X.

## Staff desk

Seed creates an admin from `.env`:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=aroha-admin
```

Sign in at `/admin/login`. IDs are Salesforce-style:

| ID | Prefix | Meaning | Example |
| --- | --- | --- | --- |
| Resident ID | `003` | Person who left a mobile number | `003ARO000000001YBA` |
| User ID | `005` | Desk staff | `005ARO000000001YBA` |
| Case ID | `500` | Trackable case | `500ARO000000001YBA` |

`ARO` is this org (Aroha). The last three characters are the 18-character checksum.

## Run locally

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Fly.io)

This app stores cases in SQLite and photos on disk, so it needs a **persistent volume**. Do not deploy it as a serverless function.

```bash
brew install flyctl
fly auth login
fly launch --copy-config --no-deploy
fly volumes create aroha_data --size 3 --region bom --yes
fly secrets set AUTH_SECRET="$(openssl rand -hex 32)" AUTH_URL="https://aroha-hyd.fly.dev" ADMIN_PASSWORD="choose-a-strong-password" CRON_SECRET="$(openssl rand -hex 16)"
fly deploy --remote-only
```

Then set `AUTH_URL` to the real hostname Fly prints. Daily jobs: `POST /api/jobs/tick` with `Authorization: Bearer $CRON_SECRET`.

## Stack

Next.js (App Router), SQLite + Prisma, Auth.js, Leaflet, Turf.js.

## Accuracy rules

- The map pin is matched to **ECI 2023 assembly boundaries**.
- Every person on screen has a source URL and a last-verified date.
- There are **no sitting corporators** after the GHMC council term ended in Feb 2026.
