import { NextRequest, NextResponse } from "next/server";

// Trigger a scrape for a specific URL
// In production, this would queue a task for the scraper agent via Telegram
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // For now, return a mock response
  // TODO: Wire to actual scraper agent via Telegram group message
  return NextResponse.json({
    taskId: `scrape-${Date.now()}`,
    status: "queued",
    url,
    message: "Scrape request received. In MVP, use the /api/search endpoint with HEMAI_LIVE_SCRAPERS=true for live data.",
  });
}