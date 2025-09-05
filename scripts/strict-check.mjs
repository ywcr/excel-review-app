#!/usr/bin/env node

/**
 * 严格类型检查脚本 - 模拟生产环境的检查
 * 运行: npm run strict-check
 */

import { execSync } from "child_process";
import path from "path";

console.log("🔍 开始严格类型检查（模拟生产环境）...\n");

try {
  // 1. TypeScript 严格检查
  console.log("📝 TypeScript 严格检查...");
  execSync("npx tsc --noEmit --strict", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  console.log("✅ TypeScript 检查通过\n");

  // 2. ESLint 完整检查
  console.log("🔧 ESLint 完整检查...");
  execSync("npx eslint . --ext .ts,.tsx,.js,.jsx", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  console.log("✅ ESLint 检查通过\n");

  // 3. Next.js 构建检查（仅类型检查，不生成文件）
  console.log("⚡ Next.js 构建类型检查...");
  execSync("npx next build --debug", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  console.log("✅ Next.js 构建检查通过\n");

  console.log("🎉 所有严格检查通过！代码已准备好部署。");
} catch (error) {
  console.error("\n❌ 严格检查失败！");
  console.error("这些错误在生产部署时会导致构建失败。");
  console.error("请修复后再次运行检查。\n");
  process.exit(1);
}
