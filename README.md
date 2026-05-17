# synergy-frontend

> Next.js 14 frontend for Synergy Social — a full-stack social media platform with real-time messaging, analytics, and notifications.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + CSS Variables
- **State:** Zustand
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Realtime:** Socket.io client
- **Deploy:** Vercel

---

## Local Setup

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/synergy-frontend.git
cd synergy-frontend
npm install
```

### 2. Environment variables
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

> Make sure the backend is running locally first. See [synergy-backend](https://github.com/YOUR_USERNAME/synergy-backend).

### 3. Run
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Features

- 🔐 **Auth** — Register / Login with JWT (stored in localStorage)
- 📰 **Feed** — Real posts from backend with like, comment, share
- 🔔 **Notifications** — Live from database, mark-read support
- 📊 **Analytics** — Real user stats + charts (falls back to demo data gracefully)
- ✏️ **Profile Edit** — Actually saves to backend (name, bio, location, website)
- 💬 **Messages** — Real-time chat via Socket.io
- 🌗 **Dark / Light** theme toggle

---

## Deploy on Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Add New Project
3. Import your GitHub repo
4. Framework: **Next.js** (auto-detected)
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL    = https://your-backend.onrender.com/api/v1
   NEXT_PUBLIC_SOCKET_URL = https://your-backend.onrender.com
   ```
6. Deploy ✅

---

## Related

- **Backend:** [synergy-backend](https://github.com/YOUR_USERNAME/synergy-backend)
