"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";

const plans = [
  {
    name: "Basic",
    price: "Rs.99",
    planId: "basic",
    features: ["3 extra sessions", "One-time purchase", "Never expires"],
    isPopular: false,
  },
  {
    name: "Standard",
    price: "Rs.199",
    planId: "standard",
    features: ["8 extra sessions", "One-time purchase", "Never expires"],
    isPopular: false,
  },
  {
    name: "Interview Boost",
    price: "Rs.299",
    planId: "boost",
    features: ["7-day unlimited access", "All interview types", "Priority AI"],
    isPopular: true,
  },
  {
    name: "Pro Plan",
    price: "Rs.599/month",
    planId: "pro",
    features: ["Unlimited everything", "All features", "Priority support"],
    isPopular: false,
  },
];

function loadScript(src: string) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [user, setUser] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        router.push('/login?redirect=/pricing');
      }
    }
    loadUser();
  }, [router, supabase]);

  async function handlePayment(plan: string) {
    if (!user) {
      alert("Please log in to purchase.");
      router.push("/login");
      return;
    }

    setLoadingPlan(plan);

    const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!res) {
      alert("Razorpay SDK failed to load. Are you online?");
      setLoadingPlan(null);
      return;
    }

    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId: user.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to create payment order");
        setLoadingPlan(null);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || data.keyId,
        amount: data.amount,
        currency: "INR",
        name: "HackerCompliment",
        description: "Interview Prep Plan",
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
                userId: user.id,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert("Payment successful! Credits added.");
              router.push("/dashboard");
            } else {
              alert(verifyData.error || "Payment verification failed.");
            }
          } catch (err: any) {
            console.error(err);
            alert(err?.message || err?.error || "Payment failed. Please try again.");
          }
        },
        prefill: {
          name: user.user_metadata?.full_name || "",
          email: user.email || "",
        },
        theme: {
          color: "#FF6B2B",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      
      paymentObject.on("payment.failed", function (response: any) {
        alert(response.error?.description || "Payment failed. Please try again.");
      });

      paymentObject.open();
    } catch (err: any) {
      console.error("Payment error:", err);
      alert(err?.message || "Payment failed. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-zinc-400 hover:text-[#FF6B2B] transition-colors"
          >
            <span className="mr-2">←</span> Back to Dashboard
          </Link>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Simple, transparent <span className="text-[#FF6B2B]">pricing</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-zinc-400">
            Choose the perfect plan to boost your interview prep and land your dream job.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.planId}
              className={`relative flex flex-col p-8 rounded-2xl bg-zinc-900/50 border ${
                plan.isPopular ? "border-[#FF6B2B] shadow-[0_0_20px_rgba(0,200,83,0.15)]" : "border-zinc-800"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
                  <span className="inline-flex items-center rounded-full bg-[#FF6B2B] px-4 py-1 text-xs font-semibold uppercase tracking-wider text-black shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <p className="mt-4 text-3xl font-bold text-white">{plan.price}</p>
              </div>
              <ul className="flex-1 space-y-4 mb-8 text-zinc-300">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <svg
                      className="h-5 w-5 text-[#FF6B2B] shrink-0 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePayment(plan.planId)}
                disabled={loadingPlan === plan.planId}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-[#FF6B2B] ${
                  plan.isPopular
                    ? "bg-[#FF6B2B] text-black transition-all duration-200 hover:scale-105 hover:brightness-110"
                    : "bg-zinc-800 text-white hover:bg-zinc-700 hover:text-[#FF6B2B]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingPlan === plan.planId ? "Processing..." : "Choose Plan"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
