#!/usr/bin/env node
/*
  Node script: Validate images in an Excel file
  - Extract images and positions (sheet, cell address)
  - Compute sharpness (simple gradient-based metric)
  - Compute dHash for duplicate detection
  - Print blurry images and duplicate groups
*/

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const sharp = require("sharp");
const JSZip = require("jszip");

function columnIndexToLetter(index) {
  let n = Number(index);
  if (Number.isNaN(n) || n < 0) n = 0;
  let result = "";
  n = n + 1; // 1-based
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

async function computeSharpness(buffer) {
  // Simple gradient-based sharpness metric
  // 1) grayscale + resize to manageable size
  const targetWidth = 128;
  const targetHeight = 128;
  const { data, info } = await sharp(buffer)
    .greyscale()
    .resize(targetWidth, targetHeight, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  let gradSum = 0;
  let count = 0;

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = y * width + x;
      const right = data[i + 1];
      const down = data[i + width];
      const center = data[i];
      const gx = right - center;
      const gy = down - center;
      const mag = Math.sqrt(gx * gx + gy * gy);
      gradSum += mag;
      count++;
    }
  }

  const avgGrad = count > 0 ? gradSum / count : 0;
  return avgGrad; // larger means sharper
}

async function computeDHashHex(buffer) {
  // dHash: resize to 9x8 grayscale, compare neighbors horizontally → 64 bits
  const w = 9,
    h = 8;
  const { data } = await sharp(buffer)
    .greyscale()
    .resize(w, h, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bits = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w - 1; x++) {
      const left = data[y * w + x];
      const right = data[y * w + x + 1];
      bits.push(left > right ? 1 : 0);
    }
  }
  // Convert bits to hex string (64 bits → 16 hex chars)
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble =
      (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

function hammingDistanceHex(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    distance += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
  }
  return distance;
}

function normalizePath(basePath, target) {
  // basePath like 'xl/worksheets/sheet1.xml' → baseDir 'xl/worksheets/'
  const baseDir = basePath.substring(0, basePath.lastIndexOf("/") + 1);
  if (target.startsWith("/")) return target.slice(1);
  if (target.startsWith("xl/")) return target;
  // handle '../'
  let cur = baseDir;
  let t = target;
  while (t.startsWith("../")) {
    t = t.slice(3);
    // remove one level from cur
    const parts = cur.replace(/\/$/, "").split("/").filter(Boolean);
    parts.pop();
    cur = parts.length ? parts.join("/") + "/" : "";
  }
  return cur + t;
}

async function extractImagePositionsWithZip(zip) {
  const positions = new Map(); // key: xl/media/imageX.ext

  // 1) iterate sheets → drawing r:id
  const worksheets = zip.folder("xl/worksheets");
  if (!worksheets) return positions;

  const sheetFiles = [];
  worksheets.forEach((relPath, file) => {
    if (!file.dir && relPath.endsWith(".xml") && relPath.startsWith("sheet")) {
      sheetFiles.push(relPath);
    }
  });

  for (const sheet of sheetFiles.sort()) {
    const sheetPath = `xl/worksheets/${sheet}`;
    const sheetText = await zip.file(sheetPath).async("string");
    const drawingIdMatch = sheetText.match(/<drawing[^>]*r:id="([^"]+)"/);
    if (!drawingIdMatch) continue;
    const drawingRelId = drawingIdMatch[1];

    // 2) sheet rels → drawing target
    const relsPath = `xl/worksheets/_rels/${sheet}.rels`;
    const relsFile = zip.file(relsPath);
    if (!relsFile) continue;
    const relsText = await relsFile.async("string");
    const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    let relMatch;
    let drawingTarget = null;
    while ((relMatch = relRegex.exec(relsText))) {
      if (relMatch[1] === drawingRelId) {
        drawingTarget = relMatch[2];
        break;
      }
    }
    if (!drawingTarget) continue;
    const drawingPath = normalizePath(sheetPath, drawingTarget);

    // 3) drawing xml → anchors + r:embed
    const drawingFile = zip.file(drawingPath);
    if (!drawingFile) continue;
    const drawingXml = await drawingFile.async("string");

    // 3.1) drawing rels → rId -> media path
    const drawingFileName = drawingPath.substring(
      drawingPath.lastIndexOf("/") + 1
    );
    const drawingRelsPath = drawingPath.replace(
      `drawings/${drawingFileName}`,
      `drawings/_rels/${drawingFileName}.rels`
    );
    const drawingRelsFile = zip.file(drawingRelsPath);
    const embedMap = new Map();
    if (drawingRelsFile) {
      const dRelsText = await drawingRelsFile.async("string");
      let m;
      const dRelRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
      while ((m = dRelRegex.exec(dRelsText))) {
        const id = m[1];
        let target = m[2];
        target = normalizePath(drawingPath, target);
        embedMap.set(id, target);
      }
    }

    // 3.2) parse twoCellAnchor blocks
    const anchorBlocks =
      drawingXml.match(/<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>/g) ||
      [];
    for (const block of anchorBlocks) {
      const fromMatch = block.match(/<xdr:from>[\s\S]*?<\/xdr:from>/);
      if (!fromMatch) continue;
      const colMatch = fromMatch[0].match(/<xdr:col>(\d+)<\/xdr:col>/);
      const rowMatch = fromMatch[0].match(/<xdr:row>(\d+)<\/xdr:row>/);
      const colIdx = colMatch ? parseInt(colMatch[1], 10) : 0;
      const rowIdx = rowMatch ? parseInt(rowMatch[1], 10) : 0;

      const blipMatch = block.match(/<a:blip[^>]*r:embed="([^"]+)"/);
      if (!blipMatch) continue;
      const embedId = blipMatch[1];
      const mediaPath = embedMap.get(embedId);
      if (!mediaPath) continue;

      const excelRow = rowIdx + 1;
      const excelCol = columnIndexToLetter(colIdx);
      const pos = `${excelCol}${excelRow}`;
      positions.set(mediaPath, {
        position: pos,
        row: excelRow,
        column: excelCol,
      });
    }
  }

  return positions;
}

async function extractImagesWithPositions(xlsxPath) {
  // Use raw zip parsing to be robust across files created outside ExcelJS
  const data = fs.readFileSync(xlsxPath);
  const zip = await JSZip.loadAsync(data);

  const positions = await extractImagePositionsWithZip(zip);

  const media = zip.folder("xl/media");
  const out = [];
  if (!media) return out;

  const files = [];
  media.forEach((relPath, file) => {
    if (!file.dir) files.push(relPath);
  });

  for (const relPath of files.sort()) {
    const file = media.file(relPath);
    if (!file) continue;
    const fileName = `xl/media/${relPath}`;
    const buf = Buffer.from(await file.async("uint8array"));
    const posInfo = positions.get(fileName);
    const id = posInfo && posInfo.position ? posInfo.position : fileName;
    out.push({
      id,
      sheetName: "",
      position: posInfo ? posInfo.position : undefined,
      row: posInfo ? posInfo.row : undefined,
      column: posInfo ? posInfo.column : undefined,
      buffer: buf,
      extension: path.extname(fileName).slice(1),
      size: buf.length,
    });
  }

  return out;
}

async function validateImages(xlsxPath) {
  console.log(`读取文件: ${xlsxPath}`);
  if (!fs.existsSync(xlsxPath)) {
    console.error("文件不存在");
    process.exit(1);
  }

  const images = await extractImagesWithPositions(xlsxPath);
  console.log(`找到图片: ${images.length} 张`);
  if (images.length === 0)
    return { totalImages: 0, results: [], blurryImages: 0, duplicateGroups: 0 };

  const results = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    try {
      const sharpness = await computeSharpness(img.buffer);
      const hash = await computeDHashHex(img.buffer);
      results.push({
        id: img.id,
        sheetName: img.sheetName,
        position: img.position,
        row: img.row,
        column: img.column,
        size: img.size,
        sharpness,
        hash,
        isBlurry: false, // 先占位，稍后根据阈值赋值
        duplicates: [],
      });
    } catch (e) {
      console.warn(`分析图片失败 ${img.id}:`, e.message);
      results.push({
        id: img.id,
        sheetName: img.sheetName,
        position: img.position,
        row: img.row,
        column: img.column,
        size: img.size,
        sharpness: 0,
        hash: "",
        isBlurry: true,
        duplicates: [],
      });
    }
  }

  // 模糊阈值：基于经验的梯度均值阈值（可按需要调整）
  const blurThreshold = 8; // 越小越模糊
  results.forEach((r) => {
    r.isBlurry = r.sharpness < blurThreshold;
  });

  // 重复检测：dHash 汉明距离阈值（0-64），3~8 较常见
  const dupThreshold = 6;
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i];
      const b = results[j];
      if (!a.hash || !b.hash || a.hash.length !== b.hash.length) continue;
      const dist = hammingDistanceHex(a.hash, b.hash);
      if (dist <= dupThreshold) {
        a.duplicates.push({ id: b.id, position: b.position, row: b.row });
        b.duplicates.push({ id: a.id, position: a.position, row: a.row });
      }
    }
  }

  const blurryImages = results.filter((r) => r.isBlurry).length;
  const duplicateCount = results.filter((r) => r.duplicates.length > 0).length;

  // 输出报告
  console.log("\n—— 图片验证结果 ——");
  console.log(`总图片数: ${results.length}`);
  console.log(`模糊图片: ${blurryImages} (阈值=${blurThreshold})`);
  console.log(`包含重复的图片: ${duplicateCount} (dHash阈值=${dupThreshold})`);

  if (blurryImages > 0) {
    console.log("\n模糊图片列表:");
    results
      .filter((r) => r.isBlurry)
      .slice(0, 50)
      .forEach((r) => {
        console.log(
          `- ${r.id} | ${r.position} | sharpness=${r.sharpness.toFixed(2)}`
        );
      });
  }

  const hasDup = results.some((r) => r.duplicates.length > 0);
  if (hasDup) {
    console.log("\n重复图片明细:");
    results.forEach((r) => {
      if (r.duplicates.length > 0) {
        const list = r.duplicates
          .map((d) => `${d.id}${d.row ? ` (第${d.row}行)` : ""}`)
          .join(", ");
        console.log(`- ${r.id} -> ${list}`);
      }
    });
  }

  return {
    totalImages: results.length,
    results,
    blurryImages,
    duplicateGroups: 0,
  };
}

async function main() {
  const rel = process.argv[2] || "public/data/8月盛邦药店拜访记录.xlsx";
  const excelPath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  try {
    await validateImages(excelPath);
  } catch (e) {
    console.error("执行失败:", e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
