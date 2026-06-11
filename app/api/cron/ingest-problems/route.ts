import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const headers = {
  'User-Agent': 'HackerCompliment/1.0',
};

// Helper to safely parse XML
function extractXmlTags(xml: string, tag: string) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const matches = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function extractCdataOrText(xmlField: string) {
  const cdataMatch = xmlField.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) return cdataMatch[1];
  return xmlField.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export async function GET(request: Request) {
  try {
    // 1. Verify CRON_SECRET header (skip check in development)
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 2. Initialize Supabase Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    let totalInserted = 0;
    
    const insertProblem = async (sourceName: string, sourceUrl: string, rawText: string) => {
      try {
        // Check if URL already exists
        const { data } = await supabase
          .from('raw_problems')
          .select('id')
          .eq('source_url', sourceUrl)
          .single();
          
        if (!data) {
          // Insert new problem
          await supabase.from('raw_problems').insert({
            source_name: sourceName,
            source_url: sourceUrl,
            raw_text: rawText,
            processed: false,
          });
          totalInserted++;
        }
      } catch (e) {
        // Silently skip on DB error (e.g. race conditions or uniqueness violations)
      }
    };

    // SOURCE 1 - Reddit r/leetcode
    try {
      const sub = 'r/leetcode';
      const res = await fetch('https://www.reddit.com/r/leetcode/new.json?limit=25', { headers });
      console.log(`${sub}: HTTP status ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        const posts = data?.data?.children || [];
        console.log(`${sub}: post count ${posts.length}`);
        for (const child of posts) {
          const post = child.data;
          const selftext = post.selftext || '';
          const text = selftext.toLowerCase();
          const title = (post.title || '').toLowerCase();
          
          const keywords = ['problem', 'solution', 'approach', 'explain', 'how to'];
          const hasKeyword = keywords.some(k => title.includes(k) || text.includes(k));
          
          if (!hasKeyword) {
            console.log(`Filtered out: ${post.title.substring(0, 50)}`);
            continue;
          }

          if (text.length < 150) {
            console.log(`Too short (${selftext.length} chars): ${post.title.substring(0, 50)}`);
            continue;
          }
          
          await insertProblem(
            'Reddit (r/leetcode)',
            `https://www.reddit.com${post.permalink}`,
            `Title: ${post.title}\n\n${post.selftext}`
          );
        }
      }
    } catch (e) { /* skip silently */ }

    await delay(1000);

    // SOURCE 2 - Reddit r/cscareerquestions
    try {
      const sub = 'r/cscareerquestions';
      const res = await fetch('https://www.reddit.com/r/cscareerquestions/new.json?limit=25', { headers });
      console.log(`${sub}: HTTP status ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        const posts = data?.data?.children || [];
        console.log(`${sub}: post count ${posts.length}`);
        for (const child of posts) {
          const post = child.data;
          const selftext = post.selftext || '';
          const text = selftext.toLowerCase();
          const title = (post.title || '').toLowerCase();
          
          const keywords = ['leetcode', 'dsa', 'coding round', 'oa', 'online assessment'];
          const hasKeyword = keywords.some(k => title.includes(k) || text.includes(k));
          
          if (!hasKeyword) {
            console.log(`Filtered out: ${post.title.substring(0, 50)}`);
            continue;
          }

          if (text.length < 150) {
            console.log(`Too short (${selftext.length} chars): ${post.title.substring(0, 50)}`);
            continue;
          }
          
          await insertProblem(
            'Reddit (r/cscareerquestions)',
            `https://www.reddit.com${post.permalink}`,
            `Title: ${post.title}\n\n${post.selftext}`
          );
        }
      }
    } catch (e) { /* skip silently */ }

    await delay(1000);

    // SOURCE 3 - GeeksForGeeks RSS
    try {
      const res = await fetch('https://www.geeksforgeeks.org/feed/', { headers });
      if (res.ok) {
        const xml = await res.text();
        const items = extractXmlTags(xml, 'item');
        
        for (const item of items) {
          const rawTitle = extractXmlTags(item, 'title')[0] || '';
          const title = extractCdataOrText(rawTitle).toLowerCase();
          
          const keywords = ['given', 'find', 'count', 'maximum', 'minimum', 'return', 'array', 'string', 'tree', 'graph', 'linked list'];
          const hasKeyword = keywords.some(k => title.includes(k));
          
          if (hasKeyword) {
            const rawLink = extractXmlTags(item, 'link')[0] || '';
            const link = extractCdataOrText(rawLink);
            
            const rawDesc = extractXmlTags(item, 'description')[0] || '';
            const description = extractCdataOrText(rawDesc);
            
            await insertProblem(
              'GeeksForGeeks',
              link,
              `Title: ${extractCdataOrText(rawTitle)}\n\n${description}`
            );
          }
        }
      }
    } catch (e) { /* skip silently */ }

    await delay(1000);

    // SOURCE 4 - Codeforces RSS
    try {
      const res = await fetch('https://codeforces.com/blog/index.xml', { headers });
      if (res.ok) {
        const xml = await res.text();
        // Codeforces usually uses <entry> (Atom) or <item> (RSS)
        let items = extractXmlTags(xml, 'item');
        if (items.length === 0) {
          items = extractXmlTags(xml, 'entry');
        }
        
        for (const item of items) {
          const rawTitle = extractXmlTags(item, 'title')[0] || '';
          const title = extractCdataOrText(rawTitle).toLowerCase();
          
          const keywords = ['problem', 'solution', 'algorithm'];
          const hasKeyword = keywords.some(k => title.includes(k));
          
          if (hasKeyword) {
            // Check for RSS link vs Atom link
            let rawLink = extractXmlTags(item, 'link')[0] || '';
            let link = extractCdataOrText(rawLink);
            
            // If Atom format, link tag has href attribute: <link href="..."/>
            if (!link || link.includes('href=')) {
              const hrefMatch = rawLink.match(/href="([^"]+)"/);
              if (hrefMatch) link = hrefMatch[1];
            }
            
            const rawContent = extractXmlTags(item, 'content:encoded')[0] || extractXmlTags(item, 'description')[0] || extractXmlTags(item, 'content')[0] || '';
            const content = extractCdataOrText(rawContent);
            
            await insertProblem(
              'Codeforces',
              link,
              `Title: ${extractCdataOrText(rawTitle)}\n\n${content}`
            );
          }
        }
      }
    } catch (e) { /* skip silently */ }

    return NextResponse.json({ success: true, inserted: totalInserted });
    
  } catch (error) {
    console.error('Cron ingest error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
