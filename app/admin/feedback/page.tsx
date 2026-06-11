"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admin";

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndLoadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      if (!isAdmin(user.id)) {
        setError("You do not have permission to view this page.");
        setLoading(false);
        return;
      }

      setIsUserAdmin(true);
      await fetchFeedbacks();
    }

    checkAuthAndLoadData();
  }, [router, supabase.auth]);

  async function fetchFeedbacks() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/feedbacks');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFeedbacks(data.feedbacks || []);
    } catch (fetchError) {
      console.error("Fetch Error:", fetchError);
      setError("Failed to fetch feedbacks.");
    }
    setLoading(false);
  }

  async function handleApprove(id: string, currentRating: number) {
    try {
      const newRating = -Math.abs(currentRating); // Negative means approved
      const res = await fetch('/api/admin/feedbacks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, rating: newRating }),
      });
      if (!res.ok) throw new Error('Failed to update');

      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, rating: newRating } : f))
      );
    } catch (err: any) {
      console.error(err);
      alert(`Error approving feedback: ${err.message}`);
    }
  }

  async function handleReject(id: string) {
    if (!confirm("Are you sure you want to reject and delete this feedback?")) return;
    try {
      const res = await fetch(`/api/admin/feedbacks?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');

      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(`Error rejecting feedback: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#FF6B2B]/30 border-t-[#FF6B2B]"></span>
      </div>
    );
  }

  if (!isUserAdmin || error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#09090b] text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] p-8 text-white font-sans">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Feedback Management</h1>
          </div>
        </div>

        {feedbacks.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <p className="text-zinc-400">No feedbacks have been submitted yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {feedbacks.map((f) => {
              const isApproved = f.rating < 0;
              const displayRating = Math.abs(f.rating);
              
              return (
                <div key={f.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col relative">
                  <div className="mb-4 flex items-center justify-between pr-8">
                    <h3 className="font-bold text-white">{f.name || "Anonymous"}</h3>
                    <div className="flex text-[#FF6B2B]">
                      {"★".repeat(displayRating)}{"☆".repeat(5 - displayRating)}
                    </div>
                  </div>
                  <p className="mb-4 flex-1 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    "{f.message}"
                  </p>
                  <div className="mt-4 border-t border-zinc-800 pt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">{new Date(f.created_at).toLocaleString()}</span>
                      <span className={`text-xs font-bold uppercase ${isApproved ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    
                    {!isApproved && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(f.id, f.rating)}
                          className="flex-1 rounded-lg bg-emerald-500/10 py-2 text-xs font-bold text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(f.id)}
                          className="flex-1 rounded-lg bg-red-500/10 py-2 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    
                    {isApproved && (
                      <button
                        onClick={() => handleReject(f.id)}
                        className="w-full rounded-lg bg-red-500/10 py-2 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-colors"
                      >
                        Remove & Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
