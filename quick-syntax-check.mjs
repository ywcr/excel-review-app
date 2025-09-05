// 快速语法检查
import fs from "fs";

console.log("检查 templateParser.ts 语法...");

try {
  const content = fs.readFileSync("src/lib/templateParser.ts", "utf8");

  // 简单的语法检查 - 查找未闭合的数组或对象
  const openBrackets = (content.match(/\[/g) || []).length;
  const closeBrackets = (content.match(/\]/g) || []).length;
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;

  console.log(`方括号: ${openBrackets} 开, ${closeBrackets} 闭`);
  console.log(`花括号: ${openBraces} 开, ${closeBraces} 闭`);
  console.log(`圆括号: ${openParens} 开, ${closeParens} 闭`);

  if (
    openBrackets === closeBrackets &&
    openBraces === closeBraces &&
    openParens === closeParens
  ) {
    console.log("✅ 基本语法检查通过");
  } else {
    console.log("❌ 可能存在语法错误");
  }
} catch (error) {
  console.error("检查失败:", error.message);
}
