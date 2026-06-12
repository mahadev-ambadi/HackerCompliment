import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Reddit RSS — works from Vercel (JSON API 403s)
const REDDIT_RSS_FEEDS = [
  "https://www.reddit.com/r/leetcode/new.rss?limit=25",
  "https://www.reddit.com/r/cscareerquestions/new.rss?limit=25",
  "https://www.reddit.com/r/compsci/new.rss?limit=25",
];

// Codeforces RSS — public, no auth needed
const OTHER_FEEDS: string[] = [];

const DSA_KEYWORDS = [
  "leetcode", "online assessment", " oa ", "coding round",
  "given an array", "find the", "return the", "two sum",
  "binary search", "dynamic programming", "hackerrank", "hackerearth",
];

function isRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return DSA_KEYWORDS.some((kw) => lower.includes(kw));
}

async function fetchWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HackerCompliment/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
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
      block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "";

    const link =
      block.match(/<link[^>]+href="([^"]+)"/)?.[1] ||
      block.match(/<link>(https?:[^<]+)<\/link>/)?.[1] ||
      block.match(/<id>(https?:[^<]+)<\/id>/)?.[1] || "";

    const description =
      block.match(/<(?:description|summary|content)[^>]*><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ||
      block.match(/<(?:description|summary|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content)>/)?.[1] || "";

    const text = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    if (title && link) {
      items.push({ title: title.trim(), link: link.trim(), content: `${title.trim()}\n\n${text}` });
    }
  }
  return items;
}

async function fetchFeed(url: string, sourceName: string): Promise<{ source: string; source_url: string; raw_text: string }[]> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      console.error(`${sourceName} ${url}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRSS(xml);
    const relevant = items.filter((i) => 
      isRelevant(i.content) && i.content.length > 300
    );
    console.log(`${sourceName} ${url}: ${items.length} items, ${relevant.length} relevant`);
    return relevant.map((i) => ({ source: sourceName, source_url: i.link, raw_text: i.content }));
  } catch (err: any) {
    console.error(`${sourceName} ${url}:`, err.message);
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

  console.log("=== Problems ingest starting ===");

  const [redditResults, otherResults] = await Promise.allSettled([
    Promise.all(REDDIT_RSS_FEEDS.map((url) => fetchFeed(url, "reddit"))).then((r) => r.flat()),
    Promise.all(OTHER_FEEDS.map((url) => fetchFeed(url, "codeforces"))).then((r) => r.flat()),
  ]);

  const all = [
    ...(redditResults.status === "fulfilled" ? redditResults.value : []),
    ...(otherResults.status === "fulfilled" ? otherResults.value : []),
  ];

  // Deduplicate within batch
  const seen = new Set<string>();
  const candidates = all.filter((item) => {
    if (!item.source_url || seen.has(item.source_url)) return false;
    seen.add(item.source_url);
    return true;
  });

  console.log(`Candidates after dedup: ${candidates.length}`);

  if (candidates.length === 0) {
    return NextResponse.json({ success: true, inserted: 0, skipped: 0, message: "No relevant items found" });
  }

  // Batch check against DB
  const urls = candidates.map((c) => c.source_url);
  const { data: existing, error: fetchErr } = await supabase
    .from("raw_problems")
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

    const { error } = await supabase.from("raw_problems").insert(chunk);
    if (error) {
      console.error("Insert error:", error.message);
      errors += chunk.length;
    } else {
      inserted += chunk.length;
    }
  }

  console.log(`=== Problems ingest done: inserted=${inserted}, skipped=${skipped}, errors=${errors} ===`);
  return NextResponse.json({ success: true, inserted, skipped, errors });
}