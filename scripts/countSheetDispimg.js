#!/usr/bin/env node
/**
 * 统计指定工作表（by 名称）中通过 WPS DISPIMG 引用到的唯一媒体图片数量。
 * 用法：
 *   node scripts/countSheetDispimg.js "public/data/不盈科技2025-9-19.xlsx" "药店拜访"
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function getSheetFileName(zip, sheetName) {
  const workbookXml = await zip.file('xl/workbook.xml')?.async('text');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('text');
  if (!workbookXml || !relsXml) return null;

  // 找到 sheet 的 r:id
  const sheetRegex = /<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g;
  let m;
  let targetRid = null;
  while ((m = sheetRegex.exec(workbookXml)) !== null) {
    const n = m[1];
    const rid = m[2];
    if (n === sheetName) {
      targetRid = rid;
      break;
    }
  }
  if (!targetRid) return null;

  // 通过 r:id 找到 Target worksheets/sheetX.xml
  const relRegex = new RegExp(`<Relationship[^>]*Id="${targetRid}"[^>]*Target="([^"]+)"`, 'g');
  const relMatch = relRegex.exec(relsXml);
  if (!relMatch) return null;
  const target = relMatch[1];
  const fileName = target.split('/').pop();
  return fileName; // e.g. sheet1.xml
}

async function buildDispIdToMedia(zip) {
  const relsXml = await zip.file('xl/_rels/cellimages.xml.rels')?.async('text');
  const cellimagesXml = await zip.file('xl/cellimages.xml')?.async('text');
  if (!relsXml || !cellimagesXml) return new Map();

  const ridToMedia = new Map();
  const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  let m;
  while ((m = relRegex.exec(relsXml)) !== null) {
    const id = m[1];
    const target = m[2];
    const basename = target.replace(/^.*\//, '');
    ridToMedia.set(id, basename);
  }

  const dispMap = new Map(); // ID_xxx -> imageN.ext
  const cellImageRegex = /<etc:cellImage[^>]*name="([^"]+)"[\s\S]*?<a:blip[^>]*r:embed="([^"]+)"[\s\S]*?<\/etc:cellImage>/g;
  while ((m = cellImageRegex.exec(cellimagesXml)) !== null) {
    const dispId = m[1];
    const rid = m[2];
    const media = ridToMedia.get(rid);
    if (media) dispMap.set(dispId, media);
  }
  return dispMap;
}

async function countSheetDispimg(excelPath, sheetName) {
  const buf = fs.readFileSync(excelPath);
  const zip = await JSZip.loadAsync(buf);

  const sheetFile = await getSheetFileName(zip, sheetName);
  if (!sheetFile) {
    console.error(`❌ 找不到工作表: ${sheetName}`);
    process.exit(1);
  }

  const sheetXml = await zip.file(`xl/worksheets/${sheetFile}`)?.async('text');
  if (!sheetXml) {
    console.error(`❌ 找不到工作表XML: xl/worksheets/${sheetFile}`);
    process.exit(1);
  }

  // 抓取该 sheet 内的 DISPIMG 图片ID
  const ids = new Set();
  const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
  let m;
  while ((m = cellRegex.exec(sheetXml)) !== null) {
    const inner = m[2] || '';
    const fMatch = inner.match(/<f[^>]*>([\s\S]*?)<\/f>/);
    if (!fMatch) continue;
    const formula = fMatch[1];
    if (!/DISPIMG/i.test(formula)) continue;

    let idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/i);
    if (!idMatch) idMatch = formula.match(/DISPIMG\("([^"]*?)",/i);
    if (idMatch) ids.add(idMatch[1]);
  }

  // 映射 ID_xxx -> 媒体文件，并统计唯一媒体
  const idToMedia = await buildDispIdToMedia(zip);
  const medias = new Set();
  for (const id of ids) {
    const media = idToMedia.get(id);
    if (media) medias.add(media);
  }

  return { count: medias.size, ids: Array.from(ids), medias: Array.from(medias) };
}

async function main() {
  const rel = process.argv[2] || 'public/data/不盈科技2025-9-19.xlsx';
  const sheetName = process.argv[3] || '药店拜访';
  const excelPath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);

  if (!fs.existsSync(excelPath)) {
    console.error('❌ 文件不存在:', excelPath);
    process.exit(1);
  }

  const res = await countSheetDispimg(excelPath, sheetName);
  console.log(`📄 文件: ${excelPath}`);
  console.log(`📑 工作表: ${sheetName}`);
  console.log(`🖼️ 该表中通过 DISPIMG 引用到的唯一媒体图片数: ${res.count}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  });
}
