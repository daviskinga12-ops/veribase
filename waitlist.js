// api/waitlist.js
// Serverless function — saves emails to Vercel KV storage
// Requires: VERIBASE_KV_REST_API_URL and VERIBASE_KV_REST_API_TOKEN env vars

const KV_URL = process.env.VERIBASE_KV_REST_API_URL;
const KV_TOKEN = process.env.VERIBASE_KV_REST_API_TOKEN;

// Simple email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Store email in Vercel KV
async function saveEmail(email) {
  const timestamp = new Date().toISOString();
  const id = `waitlist:${Date.now()}`;

  // Save individual entry
  await fetch(`${KV_URL}/set/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, timestamp, source: 'landing_page' }),
  });

  // Increment counter
  await fetch(`${KV_URL}/incr/waitlist:count`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });

  // Add to email set (for deduplication)
  await fetch(`${KV_URL}/sadd/waitlist:emails/${encodeURIComponent(email)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
}

// Check if email already exists
async function emailExists(email) {
  const res = await fetch(`${KV_URL}/sismember/waitlist:emails/${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  return data.result === 1;
}

// Get current count
async function getCount() {
  const res = await fetch(`${KV_URL}/get/waitlist:count`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  return parseInt(data.result) || 247;
}

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — return current count
  if (req.method === 'GET') {
    try {
      const count = await getCount();
      return res.status(200).json({ success: true, count });
    } catch (err) {
      return res.status(200).json({ success: true, count: 247 });
    }
  }

  // POST — add email to waitlist
  if (req.method === 'POST') {
    const { email } = req.body || {};

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    try {
      const exists = await emailExists(email.toLowerCase());
      if (exists) {
        const count = await getCount();
        return res.status(200).json({
          success: true,
          message: "You're already on the list!",
          count,
          already: true,
        });
      }

      await saveEmail(email.toLowerCase());
      const count = await getCount();

      return res.status(200).json({
        success: true,
        message: "You're on the list. Welcome to the foundation.",
        count,
      });
    } catch (err) {
      console.error('Waitlist error:', err);
      // Still return success to user — log the error server-side
      return res.status(200).json({
        success: true,
        message: "You're on the list. Welcome to the foundation.",
        count: 247,
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};
