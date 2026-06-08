import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// We use the service role key for cron jobs since they run in the background without a user session.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const RSS_FEEDS = [
  "https://www.geeksforgeeks.org/feed/",
  "https://feeds.feedburner.com/GDBonline",
  "https://leetcode.com/discuss/feed/"
];

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log("Starting cron ingestion from RSS...");
  let newItemsCount = 0;

  try {
    for (const feed of RSS_FEEDS) {
      try {
        const res = await fetch(feed, {
          headers: {
            "User-Agent": "HackerCompliment/1.0"
          }
        });
        
        if (!res.ok) {
          console.error(`Failed to fetch ${feed}: ${res.statusText}`);
          continue;
        }

        const xmlText = await res.text();
        
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let match;
        const items = [];
        
        while ((match = itemRegex.exec(xmlText)) !== null) {
          items.push(match[1]);
        }
        
        console.log(`${feed}: fetched ${items.length} items`);

        for (const itemXml of items) {
          const titleMatch = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i.exec(itemXml);
          const descMatch = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i.exec(itemXml);
          const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemXml);

          const title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";
          const description = descMatch ? (descMatch[1] || descMatch[2] || "").trim() : "";
          const link = linkMatch ? (linkMatch[1] || "").trim() : "";

          if (!title && !description) continue;
          if (!link) continue;

          const content = `${title}\n\n${description}`.toLowerCase();
          if (!content.includes("interview") && !content.includes("placement") && !content.includes("hiring")) {
            console.log(`${feed}: skipped - no interview keywords`);
            continue;
          }

          const { data: existing } = await supabase
            .from("raw_experiences")
            .select("id")
            .eq("source_url", link)
            .single();

          if (existing) {
            console.log(`${feed}: skipped - already exists`);
            continue;
          }

          const { error } = await supabase
            .from("raw_experiences")
            .insert({
              source: "rss",
              source_url: link,
              raw_text: `${title}\n\n${description}`,
              processed: false,
            });

          if (error) {
            console.error("Supabase insert error:", error);
          } else {
            console.log(`${feed}: inserted successfully`);
            newItemsCount++;
          }
        }
      } catch (feedErr) {
        console.error(`Error processing feed ${feed}:`, feedErr);
      }
    }

    return NextResponse.json({ success: true, newItemsCount });
  } catch (error: any) {
    console.error("Ingestion error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
