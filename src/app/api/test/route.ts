import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "模板总汇.xlsx");

    console.log("Current working directory:", process.cwd());
    console.log("File path:", filePath);
    console.log("File exists:", fs.existsSync(filePath));

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        error: "File not found",
        cwd: process.cwd(),
        filePath,
        exists: false,
      });
    }

    const stats = fs.statSync(filePath);
    console.log("File size:", stats.size);

    // Try reading the file as buffer first
    const buffer = fs.readFileSync(filePath);
    console.log("Buffer length:", buffer.length);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheets = Object.keys(workbook.Sheets);

    return NextResponse.json({
      success: true,
      cwd: process.cwd(),
      filePath,
      fileSize: stats.size,
      sheets,
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error",
      cwd: process.cwd(),
    });
  }
}
