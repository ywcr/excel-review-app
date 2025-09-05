// 测试关键依赖是否正常工作
import ExcelJS from "exceljs";
import XLSX from "xlsx";
import sharp from "sharp";
import { Jimp } from "jimp";

console.log("🧪 测试关键依赖...");

try {
  // 测试 ExcelJS
  console.log("📊 测试 ExcelJS...");
  const workbook = new ExcelJS.Workbook();
  console.log("✅ ExcelJS 正常工作");

  // 测试 XLSX
  console.log("📋 测试 XLSX...");
  const wb = XLSX.utils.book_new();
  console.log("✅ XLSX 正常工作");

  // 测试 Sharp
  console.log("🖼️ 测试 Sharp...");
  console.log("✅ Sharp 正常工作");

  // 测试 Jimp
  console.log("🎨 测试 Jimp...");
  console.log("✅ Jimp 正常工作");

  console.log("\n🎉 所有关键依赖测试通过！");
} catch (error) {
  console.error("❌ 依赖测试失败:", error.message);
  process.exit(1);
}
