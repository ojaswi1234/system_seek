import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    await checkRateLimit(req, 2); 

    const { githubUrl } = await req.json();
    if (!githubUrl) return NextResponse.json({ success: false, error: "Missing GitHub URL" }, { status: 400 });

    // Ensure no trailing slashes ruin the URL
    let server = process.env.NEXT_PUBLIC_SERVER_BASE_URL || "http://localhost:3001";
    if (server.endsWith('/')) server = server.slice(0, -1);

    const gcpResponse = await fetch(`${server}/run-github-stress-test`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true" // 1. Bypasses the Ngrok HTML intercept trap
      },
      body: JSON.stringify({ githubUrl }),
    });

    // 2. STOP blindly parsing JSON. Read the raw text first.
    const responseText = await gcpResponse.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // 3. If it is HTML, we catch it here and expose exactly what webpage intercepted the call
      console.error(`[GCP FETCH ERROR] Status: ${gcpResponse.status} | Raw Response:`, responseText.substring(0, 200));
      throw new Error(`Backend returned HTML instead of JSON.  (Status ${gcpResponse.status})`);
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