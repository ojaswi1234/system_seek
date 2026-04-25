import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    await checkRateLimit(req, 2); 

    const { githubUrl } = await req.json();
    if (!githubUrl) return NextResponse.json({ success: false, error: "Missing GitHub URL" }, { status: 400 });

    // 1. SECURITY: Use a hidden server variable. DO NOT use NEXT_PUBLIC.
    // Replace the fallback string with your actual DuckDNS domain just in case the env variable fails.
    let serverBase = process.env.GCP_BACKEND_URL || "https://driftseek.duckdns.org";
    
    // 2. SANITIZE: Strip any accidental trailing slashes from the base URL
    serverBase = serverBase.replace(/\/$/, "");

    // 3. Construct the exact, clean route (No double slashes)
    const targetUrl = `${serverBase}/run-github-stress-test`;

    const gcpResponse = await fetch(targetUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true" 
      },
      body: JSON.stringify({ githubUrl }),
    });

    const responseText = await gcpResponse.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[GCP FETCH ERROR] Target URL: ${targetUrl} | Status: ${gcpResponse.status} | Raw:`, responseText.substring(0, 200));
      throw new Error(`Backend returned HTML. This usually means Nginx redirected the request. (Status ${gcpResponse.status})`);
    }

    if (!gcpResponse.ok || !data.success) {
      return NextResponse.json({ success: false, error: data.error || "server error" }, { status: gcpResponse.status });
    }

    return NextResponse.json({ success: true, message: "Pipeline started" }, { status: 200 });

  } catch (error: any) {
    if (error.message === "RATE_LIMIT_EXCEEDED") {
      return NextResponse.json({ success: false, error: "Too many tests running. Cool down your server." }, { status: 429 });
    }
    console.error("[VERCEL API FATAL ERROR]:", error);
    return NextResponse.json({ success: false, error: `Vercel API Crash: ${error.message || "Unknown Failure"}` }, { status: 500 });
  }
}