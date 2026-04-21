import { NextRequest, NextResponse } from "next/server";

// Trigger scraper agent to analyze a listing URL
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // For now, return a mock task ID
  // In production, this will post to the Telegram group for the scraper agent to pick up
  return NextResponse.json({
    taskId: `scrape-${Date.now()}`,
    status: "queued",
    url,
    message: "Scrape request queued. The scraper agent will process this listing.",
  });
}