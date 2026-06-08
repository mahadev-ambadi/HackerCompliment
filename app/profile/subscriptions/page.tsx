"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function SubscriptionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [activePurchase, setActivePurchase] = useState<any>(null);
  const [plan, setPlan] = useState("Free");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: purchaseData } = await supabase
        .from("purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Find the most recent active or completed purchase that isn't cancelled
      const currentPlan = purchaseData?.find(p => p.status?.toLowerCase() === "completed" || p.status?.toLowerCase() === "active");

      if (currentPlan) {
        setActivePurchase(currentPlan);
        const planName = currentPlan.plan ? currentPlan.plan.charAt(0).toUpperCase() + currentPlan.plan.slice(1) : "Pro";
        setPlan(planName);
      }

      setLoading(false);
    }

    loadData();
  }, [router, supabase]);

  const handleCancelPlan = async () => {
    if (!activePurchase) return;
    setCancelling(true);

    try {
      const res = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: activePurchase.id })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel");
      }

      setPlan("Free");
      setActivePurchase(null);
      setShowCancelModal(false);
      alert("Subscription cancelled successfully.");
      router.refresh();
    } catch (error) {
      console.error("Cancellation error:", error);
      alert("Failed to cancel subscription. Please contact support.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-[#FF6B2B]"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12 md:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div>
            <Link href="/profile" className="mb-4 inline-flex items-center text-sm font-medium text-zinc-500 hover:text-white">
              ← Back to Profile
            </Link>
            <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
            <p className="mt-2 text-sm text-zinc-400">Manage your billing and plan details</p>
          </div>
        </div>

        {/* Current Plan Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 relative overflow-hidden">
          {plan !== "Free" && (
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FF6B2B] opacity-10 blur-3xl"></div>
          )}
          
          <h2 className="text-xl font-bold text-white mb-2">Current Plan</h2>
          <div className="flex items-end gap-4 mb-6">
            <span className={`text-4xl font-extrabold ${plan === "Free" ? "text-zinc-300" : "text-[#FF6B2B] capitalize"}`}>
              {plan}
            </span>
            {activePurchase && (
              <span className="text-sm font-medium text-zinc-500 pb-1">
                Rs.{activePurchase.amount / 100} / billed once
              </span>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">Features Included</h3>
            <ul className="space-y-3">
              {plan === "Free" ? (
                <>
                  <li className="flex items-center gap-3 text-sm text-zinc-400"><span className="text-[#FF6B2B]">✓</span> Basic Resume Analysis</li>
                  <li className="flex items-center gap-3 text-sm text-zinc-400"><span className="text-[#FF6B2B]">✓</span> 2 Mock Interviews per week</li>
                  <li className="flex items-center gap-3 text-sm text-zinc-400 opacity-50">✗ No detailed ATS breakdown</li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-3 text-sm text-white"><span className="text-[#FF6B2B]">✓</span> Advanced Resume Reconstruction</li>
                  <li className="flex items-center gap-3 text-sm text-white"><span className="text-[#FF6B2B]">✓</span> Unlimited Mock Interviews</li>
                  <li className="flex items-center gap-3 text-sm text-white"><span className="text-[#FF6B2B]">✓</span> Priority Support</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 border-t border-zinc-800 pt-6 mt-6">
            <Link
              href="/pricing"
              className="rounded-xl bg-[#FF6B2B] px-8 py-3 text-center text-sm font-bold text-black transition-all hover:scale-105 hover:brightness-110"
            >
              {plan === "Free" ? "Upgrade Plan" : "Change / Upgrade Plan"}
            </Link>
            
            {plan !== "Free" && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="rounded-xl border border-red-500/30 px-8 py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/10 hover:border-red-500"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Cancel Subscription?</h2>
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
              Are you sure you want to cancel your <span className="font-bold text-white capitalize">{plan}</span> plan? You will lose access to premium features immediately, and your account will be reset to the Free tier.
            </p>
            
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancelPlan}
                disabled={cancelling}
                className="rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
