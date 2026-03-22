

async function calculateLatency(url: string): Promise<number> {
  const start = performance.now();
  try {
    await fetch(url, { method: 'HEAD',cache: 'no-store' });
  } catch (error) {
    // If the request fails, we can consider it as a timeout or error
    return -1; // Indicating an error
  }
  const end = performance.now();
  return end - start; // Latency in milliseconds
}


export async function GET(url: string) {
  // Simulate a ping check with a random response time and status

  const status = await fetch(url, { method: 'HEAD' })
  const latency = await calculateLatency(url);

  const lastChecked = new Date().toISOString();




 
}