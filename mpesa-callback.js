// api/mpesa-callback.js
// Receives payment confirmation from Safaricom
// Activates the business subscription in Supabase

const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.VERIBASE_KV_REST_API_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { Body } = req.body;
    const callback = Body?.stkCallback;

    if (!callback) return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback' });

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    if (ResultCode !== 0) {
      // Payment failed - update subscription status
      await sb.from('subscriptions')
        .update({ status: 'failed' })
        .eq('mpesa_transaction_id', CheckoutRequestID);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Payment succeeded - extract transaction details
    const items = CallbackMetadata?.Item || [];
    const getMeta = (name) => items.find(i => i.Name === name)?.Value;

    const mpesaCode = getMeta('MpesaReceiptNumber');
    const amount = getMeta('Amount');
    const phone = getMeta('PhoneNumber');

    // Activate subscription
    const { data: sub } = await sb.from('subscriptions')
      .update({
        status: 'active',
        mpesa_transaction_id: mpesaCode || CheckoutRequestID
      })
      .eq('mpesa_transaction_id', CheckoutRequestID)
      .select()
      .single();

    if (sub) {
      // Activate business subscription
      await sb.from('businesses')
        .update({
          subscription_status: 'active',
          subscription_expires_at: sub.period_end
        })
        .eq('id', sub.business_id);
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('Callback error:', err);
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' }); // Always 200 to Safaricom
  }
};
