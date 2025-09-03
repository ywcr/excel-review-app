import { NextResponse } from "next/server";
import { getTemplateParser } from "@/lib/templateParser";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const templateParser = await getTemplateParser();
    const availableTasks = templateParser.getAvailableServices();
    
    return NextResponse.json({
      success: true,
      tasks: availableTasks
    });
  } catch (error) {
    console.error("Error getting tasks:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
