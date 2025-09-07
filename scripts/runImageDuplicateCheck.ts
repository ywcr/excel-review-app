import fs from "fs";
import path from "path";
import { ImageValidator } from "../src/lib/imageValidator";

async function main() {
  const excelPath =
    process.argv[2] ||
    path.resolve(__dirname, "../public/data/8月盛邦药店拜访记录.xlsx");
  if (!fs.existsSync(excelPath)) {
    console.error(`找不到文件: ${excelPath}`);
    process.exit(1);
  }

  console.log(`读取 Excel: ${excelPath}`);

  const buffer = fs.readFileSync(excelPath);
  const validator = new ImageValidator();

  console.log("提取图片...");
  const images = await validator.extractImagesFromExcel(buffer.buffer);
  console.log(`找到图片 ${images.length} 张`);

  if (images.length === 0) {
    console.log("Excel中未找到嵌入图片");
    process.exit(0);
  }

  console.log("计算感知哈希并检测重复...");
  const duplicates = await validator.validateDuplicates(images);

  if (!duplicates || duplicates.length === 0) {
    console.log("没有发现重复图片组");
    process.exit(0);
  }

  console.log(`发现重复组 ${duplicates.length} 组:`);
  for (const group of duplicates) {
    console.log(
      `- 组 ${group.groupId} 相似度: ${(group.similarity * 100).toFixed(1)}%`
    );
    for (const img of group.images) {
      console.log(
        `   · ${img.imageId} @ ${img.position} hash=${img.hash.slice(0, 8)}...`
      );
    }
  }
}

main().catch((err) => {
  console.error("运行失败:", err);
  process.exit(1);
});
