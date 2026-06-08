import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getWeekStart } from '@/lib/sessions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, userId } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Step 1 - Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }



    // Step 2 - Update purchases table
    const { error: purchaseError } = await supabase
      .from("purchases")
      .update({
        status: 'completed',
        razorpay_payment_id,
      })
      .eq("razorpay_order_id", razorpay_order_id);

    if (purchaseError) {
      console.error("Failed to update purchase record:", purchaseError);
      return NextResponse.json({ error: "Failed to update purchase" }, { status: 500 });
    }

    // Step 3 - Credit user based on plan
    const { data } = await supabase
      .from('session_usage')
      .select('bonus_credits')
      .eq('user_id', userId)
      .single()

    const current = data?.bonus_credits ?? 0
    let toAdd = 0;
    if (plan === 'basic') toAdd = 3;
    if (plan === 'standard') toAdd = 8;
    if (plan === 'boost' || plan === 'pro') toAdd = 999;

    if (toAdd > 0) {
      const weekStart = getWeekStart();

      // Update session_usage
      const { data: suData } = await supabase
        .from('session_usage')
        .select('bonus_credits, sessions_used')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .maybeSingle();

      const newSuCredits = (suData?.bonus_credits ?? 0) + toAdd;

      if (suData) {
        await supabase
          .from('session_usage')
          .update({ bonus_credits: newSuCredits })
          .eq('user_id', userId)
          .eq('week_start', weekStart);
      } else {
        await supabase
          .from('session_usage')
          .insert({
            user_id: userId,
            week_start: weekStart,
            bonus_credits: newSuCredits,
            sessions_used: 0
          });
      }

      // Update coding_sessions
      const { data: codingData } = await supabase
        .from('coding_sessions')
        .select('bonus_credits, sessions_used')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .maybeSingle();

      const newCodingCredits = (codingData?.bonus_credits ?? 0) + toAdd;

      if (codingData) {
        await supabase
          .from('coding_sessions')
          .update({ bonus_credits: newCodingCredits })
          .eq('user_id', userId)
          .eq('week_start', weekStart);
      } else {
        await supabase
          .from('coding_sessions')
          .insert({
            user_id: userId,
            week_start: weekStart,
            bonus_credits: newCodingCredits,
            sessions_used: 0
          });
      }
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
