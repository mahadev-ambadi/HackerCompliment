"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admin";

export default function AdminReviewPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndLoadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      if (!user || !isAdmin(user.id)) {
        setError("You do not have permission to view this page.");
        setLoading(false);
        return;
      }

      setIsUserAdmin(true);
      await fetchQueue();
    }

    checkAuthAndLoadData();
  }, [router, supabase.auth]);

  async function fetchQueue() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("review_queue")
      .select(`
        id,
        created_at,
        extracted_questions (
          id,
          company,
          role,
          round,
          question,
          occurrence_count
        )
      `)
      .eq("reviewed", false)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error(fetchError);
      setError("Failed to load review queue.");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  async function handleApprove(item: any) {
    console.log("Approving item:", JSON.stringify(item, null, 2));
    try {
      // Call the RPC function defined in ingestion_schema.sql
      const { error: rpcError } = await supabase.rpc("approve_review_queue_item", {
        p_company: item.extracted_questions?.company,
        p_role: item.extracted_questions?.role,
        p_round: item.extracted_questions?.round,
        p_question: item.extracted_questions?.question,
        p_queue_id: item.id
      });

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        throw new Error(rpcError.message || JSON.stringify(rpcError));
      }

      // Remove from local state
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      console.error(err);
      alert(`Error approving: ${err.message}`);
    }
  }

  async function handleReject(id: string) {
    try {
      const { error: deleteError } = await supabase
        .from("review_queue")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(`Error rejecting: ${err.message}`);
    }
  }

  async function runIngest() {
    setIsIngesting(true);
    try {
      await fetch("/api/cron/ingest");
      await fetchQueue();
    } catch (err) {
      console.error(err);
      alert("Failed to run ingest");
    } finally {
      setIsIngesting(false);
    }
  }

  async function runExtract() {
    setIsExtracting(true);
    try {
      await fetch("/api/cron/extract");
      await fetchQueue();
    } catch (err) {
      console.error(err);
      alert("Failed to run extract");
    } finally {
      setIsExtracting(false);
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
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-[#FF6B2B]/30 font-sans">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-0.5 text-xl font-bold tracking-tight hover:opacity-80 transition-opacity" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <img src="/logo-colored.png" alt="Logo" className="h-7 w-auto sm:h-8 -mr-1" />
              <div className="flex">
                <span className="text-white">Hacker</span>
                <span className="text-[#FF6B2B]">Compliment</span>
              </div>
            </Link>
            <Link href="/admin/problems" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Problems Queue
            </Link>
            <span className="hidden sm:inline-block rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
              Admin Area
            </span>
          </div>
        </div>
      </header>

      <main className="py-8 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-6">
          <button
            onClick={() => router.back()}
            className="inline-block rounded-xl bg-zinc-800 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-zinc-700"
          >
            &larr; Back
          </button>
        </div>
        
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">Review Queue</h1>
              <p className="text-zinc-400">
                Pending questions extracted from Reddit, RSS, and user submissions.
              </p>
            </div>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2">
              <span className="text-2xl font-bold text-[#FF6B2B]">{items.length}</span>
              <span className="text-sm text-zinc-500 ml-2">pending</span>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-16 text-center">
              <span className="text-6xl mb-4 block">✅</span>
              <h2 className="text-2xl font-bold text-white mb-2">Queue is Empty</h2>
              <p className="text-zinc-400">All caught up! No pending questions to review.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <button 
                  onClick={fetchQueue}
                  className="rounded-lg bg-zinc-800 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
                >
                  Refresh Queue
                </button>
                <button 
                  onClick={runIngest}
                  disabled={isIngesting}
                  className="rounded-lg bg-zinc-800 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                >
                  {isIngesting ? "Running..." : "Run Ingest"}
                </button>
                <button 
                  onClick={runExtract}
                  disabled={isExtracting}
                  className="rounded-lg bg-zinc-800 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                >
                  {isExtracting ? "Running..." : "Run Extract"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition-all hover:border-zinc-700">
                  <div>
                    <div className="mb-4 flex flex-wrap gap-2">
                      <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
                        {item.extracted_questions?.company}
                      </span>
                      <span className="rounded-md bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-400 border border-purple-500/20">
                        {item.extracted_questions?.role}
                      </span>
                      <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300">
                        {item.extracted_questions?.round}
                      </span>
                    </div>
                    <p className="text-base text-zinc-200 mb-6 line-clamp-4">
                      "{item.extracted_questions?.question}"
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-auto">
                    <button
                      onClick={() => handleReject(item.id)}
                      className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/20"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(item)}
                      className="flex-1 rounded-xl bg-[#FF6B2B] py-2.5 text-sm font-bold text-black transition-all hover:scale-105 hover:brightness-110"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
