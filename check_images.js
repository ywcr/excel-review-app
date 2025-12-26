const XLSX = require("xlsx");
const workbook = XLSX.readFile("/Users/yao/Downloads/李燕拜访3.xlsx");
const sheet = workbook.Sheets["Sheet1"];

// 检查是否有图片相关内容
console.log(
  "Sheet keys:",
  Object.keys(sheet).filter((k) => k.startsWith("!") || k.includes("img"))
);
console.log("!drawing:", sheet["!drawings"]);
console.log("!images:", sheet["!images"]);

// 检查是否有 DISPIMG 公式
let dispimgCount = 0;
for (const key of Object.keys(sheet)) {
  if (key.startsWith("!")) continue;
  const cell = sheet[key];
  if (cell && cell.f && cell.f.includes("DISPIMG")) {
    dispimgCount++;
    if (dispimgCount <= 3)
      console.log("DISPIMG cell:", key, cell.f.substring(0, 50));
  }
}
console.log("Total DISPIMG cells:", dispimgCount);
