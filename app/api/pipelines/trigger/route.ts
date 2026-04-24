import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    await checkRateLimit(req, 2); 

    const { githubUrl } = await req.json();
    if (!githubUrl) return NextResponse.json({ success: false, error: "Missing GitHub URL" }, { status: 400 });

    // 1. Command GCP to execute the pipeline
    // Make sure you replace YOUR_GCP_IP with the actual IP address!
    const server = process.env.NEXT_PUBLIC_SERVER_BASE_URL || "http://localhost:3001";
    const gcpResponse = await fetch(`${server}/run-github-stress-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl }),
    });

    const data = await gcpResponse.json();

    if (!gcpResponse.ok || !data.success) {
      return NextResponse.json({ success: false, error: data.error || "GCP Execution Failed" }, { status: 500 });
    }

    // 2. We DO NOT save to MongoDB here anymore because GCP is still running the test.
    // We just tell the frontend that the process successfully started.
    return NextResponse.json({ success: true, message: "Pipeline started" }, { status: 200 });

  } catch (error: any) {
    if (error.message === "RATE_LIMIT_EXCEEDED") {
      return NextResponse.json({ success: false, error: "Too many tests running. Cool down your server." }, { status: 429 });
    }
    console.error("[VERCEL API FATAL ERROR]:", error);
    return NextResponse.json({ success: false, error: `Vercel API Crash: ${error.message || "Unknown Failure"}` }, { status: 500 });
  }
}