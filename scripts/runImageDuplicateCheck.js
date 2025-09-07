#!/usr/bin/env node

/**
 * 读取Excel并进行图片视觉重复检测（Node端）
 * - 提取嵌入图片
 * - 计算 dHash（候选对）
 * - 二次确认：32x32灰度平均绝对差（MAD）
 */

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const sharp = require("sharp");
const { bmvbhash } = require("blockhash-core");
const JSZip = require("jszip");

async function extractImagesFromExcel(buffer) {
  const images = [];
  let counter = 0;

  try {
    // 尝试使用 JSZip 解析 OOXML 结构
    const zip = await JSZip.loadAsync(buffer);
    const imagePositions = await extractImagePositions(zip);
    console.log(`从XML关系中解析到 ${imagePositions.size} 个图片位置`);

    const mediaFolder = zip.folder("xl/media");
    if (mediaFolder) {
      const imagePromises = [];
      const imageFiles = [];
      mediaFolder.forEach((relativePath, file) => {
        if (!file.dir) {
          imageFiles.push({ relativePath, file });
        }
      });

      imageFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

      imageFiles.forEach(({ relativePath, file }) => {
        imagePromises.push(
          file.async("nodebuffer").then((data) => {
            counter++;
            const posInfo =
              imagePositions.get(relativePath) ||
              imagePositions.get(`xl/media/${relativePath}`);
            images.push({
              id: `img_${counter}`,
              sheetName: posInfo ? "UnknownSheet" : "UnknownSheet",
              position: posInfo ? posInfo.position : "未知位置",
              buffer: data,
              ext: path.extname(relativePath).substring(1),
            });
          })
        );
      });
      await Promise.all(imagePromises);
    }
  } catch (e) {
    console.warn("使用JSZip提取失败，回退到ExcelJS:", e.message);
  }

  // 如果JSZip失败或未找到图片，回退到ExcelJS
  if (images.length === 0) {
    console.log("尝试使用 ExcelJS 提取图片...");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    workbook.worksheets.forEach((ws) => {
      const wsImages = typeof ws.getImages === "function" ? ws.getImages() : [];
      wsImages.forEach((img) => {
        const media = workbook.model.media?.find(
          (m) => m.index === img.imageId
        );
        if (media && media.buffer) {
          counter += 1;
          const pos = getPositionFromImage(img);
          images.push({
            id: `img_${counter}`,
            sheetName: ws.name,
            position: pos,
            buffer: Buffer.from(media.buffer),
            ext: media.extension || "unknown",
          });
        }
      });
    });
  }

  return images;
}

function getPositionFromImage(img) {
  try {
    if (img.range && img.range.tl) {
      const col = columnLetter(img.range.tl.col);
      const row = img.range.tl.row + 1;
      return `${col}${row}`;
    }
  } catch {}
  return "未知位置";
}

function columnLetter(colIndex) {
  let res = "";
  while (colIndex >= 0) {
    res = String.fromCharCode(65 + (colIndex % 26)) + res;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return res;
}

async function computeBlockHashHex(buffer) {
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const hexHash = bmvbhash(
    {
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height,
    },
    8
  );

  return hexHash;
}

function hammingDistanceHex(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
  }
  return dist;
}

async function averageAbsDiff32x32(bufA, bufB) {
  // 二次确认：都缩放到 32x32 灰度，计算平均绝对差（0-255）
  const w = 32,
    h = 32;
  const [{ data: a }, { data: b }] = await Promise.all([
    sharp(bufA)
      .greyscale()
      .resize(w, h, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(bufB)
      .greyscale()
      .resize(w, h, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true }),
  ]);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length; // 平均绝对差
}

// ============== 从 frontendImageValidator.ts 移植的逻辑 ==============
// Helper to read a file as string if exists from JSZip instance
const readTextIfExists = async (zip, path) => {
  const file = zip.file(path);
  if (!file) return null;
  try {
    return await file.async("string");
  } catch {
    return null;
  }
};

// Simplified XML parser for Node.js (string matching, no DOM)
const parseXmlSimple = (xmlText) => {
  return {
    getElementsByTagName: (tagName) => {
      const elements = [];
      const regex = new RegExp(
        `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
        "g"
      );
      const selfClosingRegex = new RegExp(`<${tagName}[^>]*\\/>`, "g");
      let match;
      while ((match = selfClosingRegex.exec(xmlText)) !== null) {
        elements.push(createSimpleElement(match[0], tagName));
      }
      while ((match = regex.exec(xmlText)) !== null) {
        elements.push(createSimpleElement(match[0], tagName, match[1]));
      }
      return elements;
    },
  };
};

const createSimpleElement = (fullMatch, tagName, content = "") => ({
  tagName,
  textContent: content.replace(/<[^>]*>/g, "").trim(),
  getAttribute: (attrName) => {
    const attrRegex = new RegExp(`${attrName}="([^"]*)"`);
    const match = fullMatch.match(attrRegex);
    return match ? match[1] : null;
  },
  getElementsByTagName: (childTagName) =>
    parseXmlSimple(content).getElementsByTagName(childTagName),
});

const columnIndexToLetterSimple = (index) => {
  let n = Number(index);
  if (isNaN(n) || n < 0) n = 0;
  let result = "";
  n = n + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
};

async function extractImagePositions(zip) {
  const imagePositions = new Map();

  // 检查 cellimages.xml (WPS)
  const cellImagesXmlText = await readTextIfExists(zip, "xl/cellimages.xml");
  const cellImagesRelsText = await readTextIfExists(
    zip,
    "xl/_rels/cellimages.xml.rels"
  );

  if (cellImagesXmlText && cellImagesRelsText) {
    console.log("检测到 WPS cellimages.xml, 开始解析...");
    const relsXml = parseXmlSimple(cellImagesRelsText);
    const rels = relsXml.getElementsByTagName("Relationship");
    const embedRelMap = new Map();
    rels.forEach((rel) => {
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) {
        const basename = target.replace(/^.*\//, "");
        embedRelMap.set(id, basename);
      }
    });

    const cellImagesXml = parseXmlSimple(cellImagesXmlText);
    const cellImages = cellImagesXml.getElementsByTagName("etc:cellImage");
    const tableStructure = await analyzeTableStructure(zip);

    cellImages.forEach((cellImage, i) => {
      const blip = cellImage.getElementsByTagName("a:blip")[0];
      if (blip) {
        const embedId = blip.getAttribute("r:embed");
        const mediaKey = embedRelMap.get(embedId);
        if (mediaKey) {
          const posInfo = calculateImagePosition(i, tableStructure);
          imagePositions.set(mediaKey, posInfo);
        }
      }
    });
    if (imagePositions.size > 0) return imagePositions;
  }

  // 标准 OOXML 解析路径
  const sheetFiles = [];
  zip.folder("xl/worksheets").forEach((relativePath, file) => {
    if (
      !file.dir &&
      relativePath.endsWith(".xml") &&
      !relativePath.includes("_rels")
    ) {
      sheetFiles.push(relativePath);
    }
  });

  for (const sheetFile of sheetFiles.sort()) {
    const sheetRelsPath = `xl/worksheets/_rels/${sheetFile}.rels`;
    const sheetRelsText = await readTextIfExists(zip, sheetRelsPath);
    if (!sheetRelsText) continue;

    const sheetRelsXml = parseXmlSimple(sheetRelsText);
    const drawingRel = sheetRelsXml
      .getElementsByTagName("Relationship")
      .find((r) => r.getAttribute("Type").includes("drawing"));
    if (!drawingRel) continue;

    let drawingPath = drawingRel.getAttribute("Target");
    if (drawingPath.startsWith("../")) {
      drawingPath = "xl/" + drawingPath.substring(3);
    }

    const drawingRelsPath = `xl/drawings/_rels/${path.basename(
      drawingPath
    )}.rels`;
    const drawingRelsText = await readTextIfExists(zip, drawingRelsPath);
    if (!drawingRelsText) continue;

    const drawingRelsXml = parseXmlSimple(drawingRelsText);
    const embedRelMap = new Map();
    drawingRelsXml.getElementsByTagName("Relationship").forEach((r) => {
      const id = r.getAttribute("Id");
      const target = r.getAttribute("Target");
      if (id && target) {
        embedRelMap.set(id, target.replace(/^.*\//, ""));
      }
    });

    const drawingXmlText = await readTextIfExists(zip, drawingPath);
    if (!drawingXmlText) continue;

    const drawingXml = parseXmlSimple(drawingXmlText);
    const anchors = drawingXml.getElementsByTagName("xdr:twoCellAnchor");

    for (const anchor of anchors) {
      const from = anchor.getElementsByTagName("xdr:from")[0];
      const blip = anchor.getElementsByTagName("a:blip")[0];
      if (from && blip) {
        const col = from.getElementsByTagName("xdr:col")[0]?.textContent;
        const row = from.getElementsByTagName("xdr:row")[0]?.textContent;
        const embedId = blip.getAttribute("r:embed");
        const mediaKey = embedRelMap.get(embedId);
        if (col != null && row != null && mediaKey) {
          const excelRow = parseInt(row, 10) + 1;
          const excelCol = columnIndexToLetterSimple(parseInt(col, 10));
          imagePositions.set(mediaKey, {
            position: `${excelCol}${excelRow}`,
            row: excelRow,
            column: excelCol,
          });
        }
      }
    }
  }

  return imagePositions;
}

async function analyzeTableStructure(zip) {
  const sharedStringsText = await readTextIfExists(zip, "xl/sharedStrings.xml");
  const structurePatterns = {
    药店拜访: { imageColumns: ["M", "N"], imagesPerRecord: 2, dataStartRow: 4 },
    医院拜访类: {
      imageColumns: ["O", "P"],
      imagesPerRecord: 2,
      dataStartRow: 4,
    },
    科室拜访: { imageColumns: ["N", "O"], imagesPerRecord: 2, dataStartRow: 4 },
  };

  if (!sharedStringsText) {
    return structurePatterns["药店拜访"];
  }
  const sharedStringsXml = parseXmlSimple(sharedStringsText);
  const strings = sharedStringsXml
    .getElementsByTagName("t")
    .map((t) => t.textContent)
    .join(" ")
    .toLowerCase();

  if (strings.includes("医院门头照") && strings.includes("科室照片"))
    return structurePatterns["医院拜访类"];
  if (strings.includes("科室") && strings.includes("内部照片"))
    return structurePatterns["科室拜访"];
  if (strings.includes("门头") && strings.includes("内部"))
    return structurePatterns["药店拜访"];

  return structurePatterns["药店拜访"];
}

function calculateImagePosition(imageIndex, tableStructure) {
  const { imageColumns, imagesPerRecord, dataStartRow } = tableStructure;
  const recordIndex = Math.floor(imageIndex / imagesPerRecord);
  const imageInRecord = imageIndex % imagesPerRecord;
  const row = dataStartRow + recordIndex;
  const column = imageColumns[imageInRecord] || imageColumns[0];
  return {
    position: `${column}${row}`,
    row,
    column,
    type: `图片${imageInRecord + 1}`,
  };
}
// ============== 移植逻辑结束 ==============

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

  console.log("提取图片...");
  const images = await extractImagesFromExcel(buffer);
  console.log(`找到图片 ${images.length} 张`);
  if (images.length === 0) return;

  console.log("计算哈希...");
  for (const img of images) {
    try {
      img.hash = await computeBlockHashHex(img.buffer);
    } catch (e) {
      console.warn(`计算哈希失败 ${img.id}@${img.position}:`, e.message);
      img.hash = "";
    }
  }

  // 阈值设置
  const dHashThreshold = 6; // 候选对
  const madThreshold = 12; // 平均绝对差确认（0-255，越小越近似）

  const duplicates = [];
  const visited = new Set();

  console.log("查找候选重复对并二次确认...");
  for (let i = 0; i < images.length; i++) {
    for (let j = i + 1; j < images.length; j++) {
      const A = images[i],
        B = images[j];
      if (!A.hash || !B.hash) continue;

      // 长宽比过滤（可选：若可获取尺寸，可加入）
      const dist = hammingDistanceHex(A.hash, B.hash);
      if (dist <= dHashThreshold) {
        // 二次确认
        let mad = Infinity;
        try {
          mad = await averageAbsDiff32x32(A.buffer, B.buffer);
        } catch {}
        if (mad <= madThreshold) {
          const key = `${i}-${j}`;
          visited.add(key);
          duplicates.push({
            pair: [A.id, B.id],
            pos: [A.position, B.position],
            sheet: [A.sheetName, B.sheetName],
            dHashDist: dist,
            mad,
          });
        }
      }
    }
  }

  if (duplicates.length === 0) {
    console.log("没有发现视觉重复图片对");
    return;
  }

  console.log(`发现视觉重复图片对 ${duplicates.length} 组:`);
  for (const d of duplicates) {
    console.log(
      `- ${d.pair[0]} @ ${d.pos[0]}  ⇄  ${d.pair[1]} @ ${d.pos[1]}  | dH=${
        d.dHashDist
      }  MAD=${d.mad.toFixed(1)}`
    );
  }
}

main().catch((e) => {
  console.error("执行失败:", e);
  process.exit(1);
});
