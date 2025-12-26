const XLSX = require("xlsx");
const workbook = XLSX.readFile("/Users/yao/Downloads/李燕拜访3.xlsx");
const sheet = workbook.Sheets["Sheet1"];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// 提取零售渠道列（第5列，索引4）
const retailChannels = [];
for (let i = 3; i < data.length; i++) {
  if (data[i] && data[i][4]) {
    retailChannels.push({ row: i + 1, value: data[i][4] });
  }
}

// 检查重复
const valueMap = new Map();
retailChannels.forEach((item) => {
  const key = String(item.value).trim().toLowerCase();
  if (!valueMap.has(key)) valueMap.set(key, []);
  valueMap.get(key).push(item.row);
});

let uniqueErrors = 0;
valueMap.forEach((rows, value) => {
  if (rows.length > 1) {
    uniqueErrors += rows.length - 1;
  }
});

console.log("零售渠道记录数:", retailChannels.length);
console.log("不同零售渠道:", valueMap.size);
console.log("PC版 unique 规则应检测到的错误:", uniqueErrors);
