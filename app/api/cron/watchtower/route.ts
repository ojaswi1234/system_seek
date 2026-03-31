import { NextResponse } from "next/server";
import dbConnect from "@/lib/db_connect";
import WebServer from "@/lib/models/WebServer";
import redis from "@/lib/redis";
// Assuming you moved your nodemailer setup to a helper file like this:
import { sendTelegramAlert } from "@/lib/mailer";

// 1. The Ping Logic (Optimized for headless execution)
async function checkTarget(url: string) {
  const start = performance.now();
  let status: "up" | "down" = "down";
  let reason = "";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) status = "up";
    else reason = `HTTP ${res.status}`;
  } catch (error: any) {
    clearTimeout(timeoutId);
    reason = error.name === "AbortError" ? "Timeout" : "Network Failure";
  }
  return { latency: Math.round(performance.now() - start), status, reason };
}

// 2. The Cron Handler
export async function GET(req: Request) {
  // SECURITY GATE: Reject requests without your secret password
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const servers = await WebServer.find({});

    // Loop through every server in your database
    for (const server of servers) {
      const { latency, status, reason } = await checkTarget(server.url);

      // Update the "Speed Layer" (Redis) so the UI dashboard is fast
      const statsKey = `monitor:stats:${server._id}`;
      await redis.hset(statsKey, {
        status,
        latency,
        reason,
        lastChecked: new Date().toISOString(),
      });

      // THE ALERT FATIGUE LOGIC
      const alertKey = `alert_sent:${server._id}`;

      if (status === "down") {
        const alreadyAlerted = await redis.get(alertKey);

        if (!alreadyAlerted) {
          console.log(
            `[ALERT] ${server.url} is down. Emailing ${server.ownerEmail}`,
          );

          await sendTelegramAlert({
            url: server.url,
            reason: reason,
            ownerEmail: server.ownerEmail,
          });

          // Set a 2-hour (7200s) cooldown so we don't spam the user
          await redis.set(alertKey, "true", "EX", 7200);
        }
      } else {
        // If the server is UP, delete the cooldown key.
        // This ensures that if it crashes again later, a new email will be sent.
        await redis.del(alertKey);
      }
    }

    return NextResponse.json({ success: true, targetsChecked: servers.length });
  } catch (error: any) {
    console.error("Watchtower Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
