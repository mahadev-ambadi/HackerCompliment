import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const PLANS: Record<string, { amount: number; credits: number }> = {
  basic: { amount: 9900, credits: 3 },
  standard: { amount: 19900, credits: 8 },
  boost: { amount: 29900, credits: 999 },
  pro: { amount: 59900, credits: 999 },
};

export async function POST(request: Request) {
  try {
    const { plan, userId } = await request.json();

    console.log("Create order called with:", { plan, userId });
    console.log("Razorpay Key ID exists:", !!process.env.RAZORPAY_KEY_ID);
    console.log("Razorpay Secret exists:", !!process.env.RAZORPAY_KEY_SECRET);
    console.log("Key ID value:", process.env.RAZORPAY_KEY_ID?.substring(0, 15) + "...");

    if (!plan || !userId || !PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan or user ID" }, { status: 400 });
    }

    const { amount, credits } = PLANS[plan];

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    const receipt = `hc_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    const { error: dbError } = await supabase.from("purchases").insert({
      user_id: userId,
      razorpay_order_id: order.id,
      plan,
      amount,
      credits,
      status: "pending",
    });

    if (dbError) {
      console.error("Failed to insert purchase record:", dbError);
      return NextResponse.json(
        { error: "Failed to initialize payment tracking" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId: order.id,
      amount,
      currency: "INR",
      plan,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
