// api/admin.js
// Password-protected endpoint to view all waitlist signups
// Set ADMIN_PASSWORD env var in Vercel dashboard

const KV_URL = process.env.VERIBASE_KV_REST_API_URL;
const KV_TOKEN = process.env.VERIBASE_KV_REST_API_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function getAllEmails() {
  // Get all keys matching waitlist:* pattern
  const res = await fetch(`${KV_URL}/keys/waitlist:1*`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  const keys = data.result || [];

  // Fetch each entry
  const entries = await Promise.all(
    keys
      .filter(k => k.startsWith('waitlist:') && k !== 'waitlist:count')
      .map(async key => {
        const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${KV_TOKEN}` },
        });
        const d = await r.json();
        try {
          return typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
        } catch {
          return null;
        }
      })
  );

  return entries.filter(Boolean).sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );
}

async function getCount() {
  const res = await fetch(`${KV_URL}/get/waitlist:count`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  return parseInt(data.result) || 0;
}

module.exports = async (req, res) => {
  const { password } = req.query;

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [emails, count] = await Promise.all([getAllEmails(), getCount()]);

    // Return as JSON or CSV based on format param
    if (req.query.format === 'csv') {
      const csv = ['email,timestamp,source']
        .concat(emails.map(e => `${e.email},${e.timestamp},${e.source}`))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="veribase-waitlist.csv"');
      return res.status(200).send(csv);
    }

    return res.status(200).json({
      total: count,
      entries: emails,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch waitlist data' });
  }
};
