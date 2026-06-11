import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    
    // Regular client to verify the user token
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    if (!isAdmin(user.id)) {
      return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
    }
    
    // Admin client to fetch users
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }
    
    const allUsers = usersData.users || [];
    const totalUsers = allUsers.length;
    
    const { data: listPurchases } = await supabaseAdmin.from('purchases').select('*');
    console.log("=== DEBUG PURCHASES ===", JSON.stringify(listPurchases, null, 2));

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday...
    const diff = currentDay >= 1 ? currentDay - 1 : 6;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    
    let newUsersThisWeek = 0;
    const recentUsers = [];
    
    const sortedUsers = [...allUsers].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    for (const u of sortedUsers) {
      const createdTime = new Date(u.created_at).getTime();
      if (createdTime >= monday.getTime()) {
        newUsersThisWeek++;
      }
    }
    
    for (let i = 0; i < Math.min(10, sortedUsers.length); i++) {
      const u = sortedUsers[i];
      recentUsers.push({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        display_name: u.user_metadata?.full_name || u.user_metadata?.name || "Unknown"
      });
    }
    
    // Fetch Sessions for Companies
    const { data: allSessions } = await supabaseAdmin.from('interview_sessions').select('company, created_at');
    let totalSessions = 0;
    let sessionsThisWeek = 0;
    const companyCounts: Record<string, number> = {};
    
    if (allSessions) {
      allSessions.forEach(s => {
        const c = s.company || 'Unknown';
        companyCounts[c] = (companyCounts[c] || 0) + 1;
      });
    }

    // Accurately get total sessions from session_usage table
    const { data: sessionUsage } = await supabaseAdmin.from('session_usage').select('sessions_used, week_start');
    if (sessionUsage) {
      sessionUsage.forEach(usage => {
        totalSessions += usage.sessions_used || 0;
        const uTime = new Date(usage.week_start).getTime();
        if (uTime >= monday.getTime()) {
          sessionsThisWeek += usage.sessions_used || 0;
        }
      });
    }

    const topCompanies = Object.entries(companyCounts)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
      
    // Code Submissions are the same as Total Sessions in this context
    const totalSubmissions = totalSessions;
      
    // Fetch Purchases
    const { data: purchasesData } = await supabaseAdmin
      .from('purchases')
      .select('amount, plan, created_at, user_id')
      .in('status', ['active', 'completed', 'Completed']);
      
    let totalRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    const planBreakdown: Record<string, number> = {};
    const planDetails: Record<string, { email: string, name: string, date: number }[]> = {};
    
    const nowTime = now.getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    
    if (purchasesData) {
      purchasesData.forEach(p => {
        const amount = (p.amount || 0) / 100;
        totalRevenue += amount;
        
        let createdTime = nowTime;
        if (p.created_at) {
          const num = Number(p.created_at);
          if (!isNaN(num) && p.created_at !== null && String(p.created_at).trim() !== "") {
            createdTime = num < 10000000000 ? num * 1000 : num;
          } else {
            const parsed = new Date(p.created_at).getTime();
            if (!isNaN(parsed)) createdTime = parsed;
          }
        }
        
        if (!isNaN(createdTime)) {
          const diff = Math.abs(nowTime - createdTime);
          if (diff <= oneWeek) weeklyRevenue += amount;
          if (diff <= oneMonth) monthlyRevenue += amount;
          if (diff <= oneYear) yearlyRevenue += amount;
        }
        
        const plan = p.plan || 'Unknown';
        planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;
        
        if (!planDetails[plan]) planDetails[plan] = [];
        const purchaser = allUsers.find(u => u.id === p.user_id);
        planDetails[plan].push({
          email: purchaser?.email || 'Unknown User',
          name: purchaser?.user_metadata?.full_name || purchaser?.user_metadata?.name || 'Unknown',
          date: createdTime
        });
      });
    }
    
    // Sort plan details descending (newest first)
    Object.keys(planDetails).forEach(plan => {
      planDetails[plan].sort((a, b) => (b.date || 0) - (a.date || 0));
    });
    
    return NextResponse.json({
      totalUsers,
      newUsersThisWeek,
      recentUsers,
      totalSessions,
      sessionsThisWeek,
      totalSubmissions: totalSubmissions || 0,
      totalRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      topCompanies,
      planBreakdown,
      planDetails
    });
    
  } catch (error: any) {
    console.error("Analytics API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
