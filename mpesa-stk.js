// api/mpesa-stk.js
// M-Pesa Daraja STK Push for Veribase subscriptions
// Env vars needed: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
//                  MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const SHORTCODE = process.env.MPESA_SHORTCODE || '174379'; // Sandbox default
const PASSKEY = process.env.MPESA_PASSKEY;
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://veribase.co/api/mpesa-callback';
const ENV = process.env.MPESA_ENV || 'sandbox'; // 'sandbox' or 'production'

const BASE_URL = ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

async function getAccessToken() {
  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` }
  });
  const data = await res.json();
  return data.access_token;
}

function generatePassword() {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const str = SHORTCODE + PASSKEY + timestamp;
  return { password: Buffer.from(str).toString('base64'), timestamp };
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { phone, amount, plan, businessId } = req.body || {};

  if (!phone || !amount || !plan || !businessId) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // Format phone: ensure starts with 254
  let formattedPhone = phone.toString().replace(/^0/, '254').replace(/^\+/, '');
  if (!formattedPhone.startsWith('254')) {
    return res.status(400).json({ success: false, message: 'Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX' });
  }

  try {
    const token = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: CALLBACK_URL,
        AccountReference: `VERIBASE-${businessId.slice(0, 8).toUpperCase()}`,
        TransactionDesc: `Veribase ${plan} plan - 1 month`
      })
    });

    const stkData = await stkRes.json();

    if (stkData.ResponseCode === '0') {
      return res.status(200).json({
        success: true,
        message: 'STK push sent. Check your phone.',
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID
      });
    } else {
      return res.status(400).json({
        success: false,
        message: stkData.errorMessage || stkData.ResponseDescription || 'STK push failed'
      });
    }
  } catch (err) {
    console.error('M-Pesa STK error:', err);
    return res.status(500).json({ success: false, message: 'Payment service unavailable. Try again.' });
  }
};
