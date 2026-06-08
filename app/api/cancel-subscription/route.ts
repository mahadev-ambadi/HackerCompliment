import { createAdminClient } from "@/lib/supabase/admin";
import { getApiUser } from "@/lib/supabase/api-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);

    if (!user) {
      console.error("POST /api/cancel-subscription: Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { purchaseId } = body;

    if (!purchaseId) {
      return NextResponse.json({ error: "Missing purchase ID" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify ownership and not already cancelled
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select('id, status')
      .eq('id', purchaseId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !purchase) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (purchase.status === 'cancelled') {
      return NextResponse.json({ error: "Subscription already cancelled" }, { status: 400 });
    }

    // Perform cancellation
    const { error: updateError } = await supabase
      .from("purchases")
      .update({ 
        status: "cancelled", 
        active: false, 
        cancelled_at: new Date().toISOString() 
      })
      .eq("id", purchaseId);

    if (updateError) {
      console.error("Failed to cancel subscription:", updateError);
      return NextResponse.json({ error: "Database error during cancellation" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancellation route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
