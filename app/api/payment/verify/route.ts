import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
    const toAdd = plan === 'basic' ? 3 : plan === 'standard' ? 8 : 999
    
    await supabase
      .from('session_usage')
      .update({ bonus_credits: current + toAdd })
      .eq('user_id', userId)

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
