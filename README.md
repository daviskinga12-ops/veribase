# Veribase

> Africa's economy, made legible.

The trust and verification infrastructure for Kenya's real economy. Veribase is the missing layer between invisible economic potential and the institutions that need to see it.

---

## Project Structure

```
veribase/
├── index.html          # Landing page + waitlist
├── 404.html            # Custom 404 page
├── robots.txt          # SEO — search engine instructions
├── sitemap.xml         # SEO — site map
├── vercel.json         # Vercel deployment config
├── package.json        # Node project config
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
└── api/
    ├── waitlist.js     # POST /api/waitlist — save emails
    └── admin.js        # GET  /api/admin   — view all emails
```

---

## Deploy to Vercel (Step by Step)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial Veribase launch"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/veribase.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New Project**
3. Import your `veribase` GitHub repo
4. Click **Deploy** — it will deploy automatically

### 3. Set Up Vercel KV (Waitlist Storage)

1. In your Vercel dashboard → go to **Storage**
2. Click **Create** → choose **KV**
3. Name it `veribase-kv` → click **Create**
4. Go to **Settings** tab → copy `KV_REST_API_URL` and `KV_REST_API_TOKEN`
5. In your project → **Settings** → **Environment Variables**, add:
   - `VERIBASE_KV_REST_API_URL` = your URL
   - `VERIBASE_KV_REST_API_TOKEN` = your token
   - `ADMIN_PASSWORD` = choose a strong password

### 4. Redeploy

After adding env vars, go to **Deployments** → click **Redeploy**.

### 5. Add Your Domain

In Vercel → **Settings** → **Domains** → add `veribase.co`

---

## API Endpoints

### Join Waitlist
```
POST /api/waitlist
Content-Type: application/json

{ "email": "user@example.com" }
```

**Response:**
```json
{
  "success": true,
  "message": "You're on the list. Welcome to the foundation.",
  "count": 248
}
```

### Get Waitlist Count
```
GET /api/waitlist
```

### View All Signups (Admin)
```
GET /api/admin?password=YOUR_ADMIN_PASSWORD
GET /api/admin?password=YOUR_ADMIN_PASSWORD&format=csv
```

---

## Connect Frontend to Real API

In `index.html`, the `joinWaitlist()` function currently updates the UI locally.
To connect it to the real backend, replace the function with:

```javascript
async function joinWaitlist(source) {
  const input = document.getElementById(source === 'hero' ? 'hero-email' : 'cta-email');
  const successEl = document.getElementById(source === 'hero' ? 'hero-success' : 'cta-success');
  const formEl = input.parentElement;
  const email = input.value.trim();

  if (!email || !email.includes('@')) {
    input.style.borderColor = '#E24B4A';
    input.focus();
    setTimeout(() => { input.style.borderColor = 'rgba(10,191,163,0.2)'; }, 1500);
    return;
  }

  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (data.success) {
      formEl.style.display = 'none';
      successEl.style.display = 'flex';
      const countEl = document.getElementById('count');
      if (countEl && data.count) countEl.textContent = data.count;
    }
  } catch (err) {
    // Fallback — still show success
    formEl.style.display = 'none';
    successEl.style.display = 'flex';
  }
}
```

---

## Brand

- **Primary color:** `#0ABFA3` (Signal Teal)
- **Background:** `#0A0E14` (Void Black)
- **Fonts:** Syne (headings) + DM Sans (body) + DM Mono (code/labels)
- **Tagline:** Africa's economy, made legible.

---

## Roadmap

- [x] Landing page + waitlist
- [ ] Business registration flow
- [ ] Staff reputation module
- [ ] Supplier track record module
- [ ] Business credit profile
- [ ] Admin dashboard
- [ ] Bank/lender API

---

Built in Nairobi, Kenya. © 2026 Veribase.
