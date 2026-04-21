import { NextRequest, NextResponse } from "next/server";
import { AISummaryResponse } from "@/types";

// AI Summary endpoint — in production this will request analysis from the AI agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Mock AI summary — will be replaced by real AI agent analysis
  const summary: AISummaryResponse = {
    listingId: id,
    summary: `Denna bostad har analyserats av HemAI. Baserat på pris, läge och skick bedöms detta som en bra affär för köparen. Området är välskött med goda kommunikationer och närhet till service.`,
    score: 78,
    tags: ["Bra läge", "Välskött", "God pendling"],
    pros: [
      "Bra kommunikationer till centrum",
      "Närhet till skola och förskola",
      "Välskött område med grön miljö",
    ],
    cons: [
      "Månadsavgiften kan vara hög",
      "Begränsad parkering i området",
    ],
    commuteInfo: "Ca 12 min med spårvagn till Brunnsparken. Bussförbindelse inom 3 minuters gångavstånd.",
    neighborhoodInsight: "Ett område i utveckling med nybyggnation och förbättrad service. Stabil investeringspotential.",
  };

  return NextResponse.json(summary);
}