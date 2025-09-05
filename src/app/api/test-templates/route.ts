import { NextResponse } from "next/server";
import { TemplateParser } from "@/lib/templateParser";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET() {
  try {
    console.log("Testing template loading...");

    const parser = new TemplateParser();
    await parser.loadTemplates();

    const templates = parser.getAllTemplates();

    return NextResponse.json({
      success: true,
      message: "Templates loaded successfully",
      templates: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Template loading test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load templates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
