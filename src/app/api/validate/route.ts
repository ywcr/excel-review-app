import { NextRequest, NextResponse } from "next/server";
import formidable from "formidable";
import { promises as fs } from "fs";
import { getTemplateParser } from "@/lib/templateParser";
import { ExcelValidator } from "@/lib/validator";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const taskName = formData.get("taskName") as string;
    const selectedSheet = formData.get("selectedSheet") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!taskName) {
      return NextResponse.json(
        { error: "Task name is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Only Excel files (.xlsx, .xls) are supported" },
        { status: 400 }
      );
    }

    // Get template parser and find the template
    const templateParser = new (
      await import("@/lib/templateParser")
    ).TemplateParser();
    await templateParser.loadTemplates();
    const template = templateParser.getTemplate(taskName);

    if (!template) {
      return NextResponse.json(
        { error: `Template not found for task: ${taskName}` },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create validator and validate the Excel file
    const validator = new ExcelValidator(template);
    const result = await validator.validateExcel(buffer, selectedSheet);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      taskName,
      validation: result,
    });
  } catch (error) {
    console.error("Validation error:", error);

    // Handle sheet not found error specially
    if (
      error instanceof Error &&
      (error as any).errorType === "SHEET_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          error: "SHEET_NOT_FOUND",
          message: error.message,
          availableSheets: (error as any).availableSheets,
          taskName: (error as any).taskName,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Get available tasks/templates
export async function GET() {
  try {
    // Create a new instance instead of using singleton
    const templateParser = new (
      await import("@/lib/templateParser")
    ).TemplateParser();
    await templateParser.loadTemplates();
    const services = templateParser.getAvailableServices();
    const templates = templateParser.getAllTemplates();

    return NextResponse.json({
      success: true,
      services,
      templates: templates.map((t) => ({
        name: t.name,
        serviceCategory: t.serviceCategory,
        serviceItem: t.serviceItem,
        requirements: t.requirements,
        validationRules: t.validationRules.map((r) => ({
          field: r.field,
          type: r.type,
          message: r.message,
        })),
      })),
    });
  } catch (error) {
    console.error("Error getting templates:", error);
    return NextResponse.json(
      {
        error: "Failed to load templates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
