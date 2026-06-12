import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────────────────────────────────────────
// Sources — only Reddit RSS (confirmed working from Vercel IPs)
// Pullpush times out, GFG RSS 404s, HN Algolia returns 0 for these queries
// 429s on some subs = Reddit rate limiting that run; they rotate across cron cycles
// ─────────────────────────────────────────────────────────────────────────────
const REDDIT_RSS_FEEDS = [
  "https://www.reddit.com/r/cscareerquestions/new.rss?limit=25",
  "https://www.reddit.com/r/cscareerquestionsIN/new.rss?limit=25",
  "https://www.reddit.com/r/leetcode/new.rss?limit=25",
  "https://www.reddit.com/r/indianjobs/new.rss?limit=25",
  "https://www.reddit.com/r/developersIndia/new.rss?limit=25",
  "https://www.reddit.com/r/india/search.rss?q=interview+experience&sort=new&limit=25",
];

const INTERVIEW_KEYWORDS = [
  "interview", "placement", "hiring", "offer", " oa ", "onsite",
  "virtual interview", "technical round", "hr round", "coding round",
  "system design", "internship", "campus placement", "job offer",
  "leetcode", "hackerrank", "hackerearth",
];

function isRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return INTERVIEW_KEYWORDS.some((kw) => lower.includes(kw));
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseRSS(xml: string): { title: string; link: string; content: string }[] {
  const items: { title: string; link: string; content: string }[] = [];
  const blocks = [...xml.matchAll(/<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g)];

  for (const match of blocks) {
    const block = match[1];

    const title =
      block.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/s)?.[1] ||
      block.match(/<title[^>]*>(.*?)<\/title>/s)?.[1] || "";

    const link =
      block.match(/<link[^>]+href="([^"]+)"/)?.[1] ||
      block.match(/<link>(https?:[^<]+)<\/link>/)?.[1] ||
      block.match(/<id>(https?:[^<]+)<\/id>/)?.[1] || "";

    const description =
      block.match(/<(?:description|summary|content)[^>]*><!\[CDATA\[([\s\S]*?)\]\]>/s)?.[1] ||
      block.match(/<(?:description|summary|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content)>/s)?.[1] || "";

    const text = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    if (title && link) {
      items.push({ title: title.trim(), link: link.trim(), content: `${title.trim()}\n\n${text}` });
    }
  }
  return items;
}

async function fetchRedditRSS(url: string): Promise<{ source: string; source_url: string; raw_text: string }[]> {
  const sub = url.match(/\/r\/([^/]+)\//)?.[1] || url;
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HackerCompliment/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!res.ok) {
      console.error(`Reddit RSS r/${sub}: HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const items = parseRSS(xml);
    const relevant = items.filter((i) => isRelevant(i.content));
    console.log(`Reddit RSS r/${sub}: ${items.length} items, ${relevant.length} relevant`);

    return relevant.map((i) => ({ source: "reddit", source_url: i.link, raw_text: i.content }));
  } catch (err: any) {
    console.error(`Reddit RSS r/${sub}:`, err.message);
    return [];
  }
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    const cronSecret = request.headers.get("x-cron-secret");
    if (!isVercelCron && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("=== HackerCompliment ingest starting ===");

  // Fetch all RSS feeds in parallel
  const results = await Promise.allSettled(REDDIT_RSS_FEEDS.map(fetchRedditRSS));
  const all = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<any>).value);

  // Deduplicate within this batch
  const seen = new Set<string>();
  const candidates = all.filter((item) => {
    if (!item.source_url || seen.has(item.source_url)) return false;
    seen.add(item.source_url);
    return true;
  });

  console.log(`Total candidates after dedup: ${candidates.length}`);

  if (candidates.length === 0) {
    return NextResponse.json({ success: true, inserted: 0, skipped: 0, message: "No relevant items found" });
  }

  // Batch check against Supabase
  const urls = candidates.map((c) => c.source_url);
  const { data: existing, error: fetchErr } = await supabase
    .from("raw_experiences")
    .select("source_url")
    .in("source_url", urls);

  if (fetchErr) {
    return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
  }

  const existingUrls = new Set((existing || []).map((r: any) => r.source_url));
  const newItems = candidates.filter((c) => !existingUrls.has(c.source_url));
  const skipped = candidates.length - newItems.length;

  console.log(`New: ${newItems.length}, already in DB: ${skipped}`);

  if (newItems.length === 0) {
    return NextResponse.json({ success: true, inserted: 0, skipped, message: "All already in DB" });
  }

  // Batch insert in chunks of 50
  let inserted = 0;
  let errors = 0;
  const CHUNK = 50;

  for (let i = 0; i < newItems.length; i += CHUNK) {
    const chunk = newItems.slice(i, i + CHUNK).map((item) => ({
      source: item.source,
      source_url: item.source_url,
      raw_text: item.raw_text.substring(0, 8000),
      processed: false,
    }));

    const { error } = await supabase.from("raw_experiences").insert(chunk);
    if (error) {
      console.error("Insert error:", error.message);
      errors += chunk.length;
    } else {
      inserted += chunk.length;
    }
  }

  console.log(`=== Ingest done: inserted=${inserted}, skipped=${skipped}, errors=${errors} ===`);
  return NextResponse.json({ success: true, inserted, skipped, errors });
}