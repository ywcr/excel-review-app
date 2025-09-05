// 简单的语法检查脚本
import { execSync } from "child_process";
import fs from "fs";

console.log("检查 TypeScript 语法...");

try {
  // 检查主要文件的语法
  const files = [
    "src/lib/imageValidator.ts",
    "src/lib/validator.ts",
    "src/lib/templateParser.ts",
    "src/app/api/validate/route.ts",
  ];

  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log(`检查 ${file}...`);
      try {
        execSync(`npx tsc --noEmit --skipLibCheck ${file}`, { stdio: "pipe" });
        console.log(`✓ ${file} 语法正确`);
      } catch (error) {
        console.log(`✗ ${file} 有语法错误:`);
        console.log(error.stdout?.toString() || error.message);
      }
    }
  }

  console.log("\n语法检查完成");
} catch (error) {
  console.error("检查过程中出错:", error.message);
}
