"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

export default function DebugAuthPage() {
  const [supabase] = useState(() => createClient());
  const [logs, setLogs] = useState<string[]>([]);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const addLog = (msg: string, data?: any) => {
    const text = `[${new Date().toISOString()}] ${msg} ${data ? JSON.stringify(data) : ""}`;
    console.log(msg, data);
    setLogs((prev) => [...prev, text]);
  };

  useEffect(() => {
    async function checkAuth() {
      addLog("Checking initial session...");
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        addLog("Error getting session:", error.message);
      } else {
        setSession(data.session);
        addLog("Session found:", !!data.session);
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        addLog("Error getting user:", userError.message);
      } else {
        setUser(userData.user);
        addLog("User found:", !!userData.user);
      }
    }
    checkAuth();
  }, [supabase]);

  const testSignup = async () => {
    addLog("--- TEST SIGNUP ---");
    const dummyEmail = `test_${Date.now()}@example.com`;
    addLog(`Attempting signup with: ${dummyEmail}`);
    const { data, error } = await supabase.auth.signUp({
      email: dummyEmail,
      password: "TestPassword123!",
      options: {
        data: {
          full_name: "Test User",
        },
      },
    });
    
    if (error) {
      addLog("Signup Error:", error.message);
    } else {
      addLog("Signup Data (User):", !!data.user);
      addLog("Signup Data (Session):", !!data.session);
    }
  };

  const testLogin = async () => {
    addLog("--- TEST LOGIN ---");
    // Change this email to whatever you used for testSignup
    const emailToTest = prompt("Enter email to test login (use the one generated from signup):");
    if (!emailToTest) return;

    addLog(`Attempting login with: ${emailToTest}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToTest,
      password: "TestPassword123!",
    });
    
    if (error) {
      addLog("Login Error:", error.message);
    } else {
      addLog("Login Data (User):", !!data.user);
      addLog("Login Data (Session):", !!data.session);
      setSession(data.session);
      setUser(data.user);
    }
  };

  const getSession = async () => {
    addLog("--- GET SESSION ---");
    const { data, error } = await supabase.auth.getSession();
    if (error) addLog("Session Error:", error.message);
    else addLog("Session:", data.session);
  };

  const maskUrl = (url: string | undefined) => {
    if (!url) return "NOT SET";
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      return "INVALID URL FORMAT";
    }
  };

  return (
    <div className="p-8 bg-zinc-950 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-[#FF6B2B]">Auth Diagnostics</h1>
      
      <div className="mb-8 p-4 bg-zinc-900 border border-zinc-800 rounded">
        <h2 className="text-xl font-semibold mb-2">Environment Variables</h2>
        <p><strong>SUPABASE_URL:</strong> {maskUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)}</p>
        <p><strong>ANON_KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "[SET - OK]" : "[MISSING]"}</p>
      </div>

      <div className="mb-8 p-4 bg-zinc-900 border border-zinc-800 rounded">
        <h2 className="text-xl font-semibold mb-2">Current State</h2>
        <p><strong>Session Active:</strong> {session ? "YES" : "NO"}</p>
        <p><strong>Authenticated User:</strong> {user ? user.email : "NONE"}</p>
      </div>

      <div className="flex gap-4 mb-8">
        <button onClick={testSignup} className="px-4 py-2 bg-blue-600 rounded font-semibold hover:bg-blue-500">Test Signup</button>
        <button onClick={testLogin} className="px-4 py-2 bg-green-600 rounded font-semibold hover:bg-green-500">Test Login</button>
        <button onClick={getSession} className="px-4 py-2 bg-purple-600 rounded font-semibold hover:bg-purple-500">Refresh Session</button>
      </div>

      <div className="p-4 bg-black border border-zinc-800 rounded font-mono text-sm h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="mb-1">{log}</div>
        ))}
      </div>
    </div>
  );
}
