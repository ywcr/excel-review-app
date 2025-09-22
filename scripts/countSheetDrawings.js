#!/usr/bin/env node
/**
 * 统计指定工作表（by 名称）中通过 drawings 锚点引用的唯一媒体图片数量。
 * 用法：
 *   node scripts/countSheetDrawings.js "public/data/不盈科技2025-9-19.xlsx" "药店拜访"
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

function normalizePath(basePath, target) {
  const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
  if (target.startsWith('/')) return target.slice(1);
  if (target.startsWith('xl/')) return target;
  let cur = baseDir;
  let t = target;
  while (t.startsWith('../')) {
    t = t.slice(3);
    const parts = cur.replace(/\/$/, '').split('/').filter(Boolean);
    parts.pop();
    cur = parts.length ? parts.join('/') + '/' : '';
  }
  return cur + t;
}

async function countSheetDrawings(excelPath, sheetName) {
  const buf = fs.readFileSync(excelPath);
  const zip = await JSZip.loadAsync(buf);

  const sheetFile = await getSheetFileName(zip, sheetName);
  if (!sheetFile) {
    console.error(`❌ 找不到工作表: ${sheetName}`);
    process.exit(1);
  }
  const sheetPath = `xl/worksheets/${sheetFile}`;
  const sheetXml = await zip.file(sheetPath)?.async('text');
  if (!sheetXml) {
    console.error(`❌ 找不到工作表XML: ${sheetPath}`);
    process.exit(1);
  }

  // 找到 drawing r:id
  const drawingIdMatch = sheetXml.match(/<drawing[^>]*r:id="([^"]+)"/);
  if (!drawingIdMatch) {
    return { count: 0, medias: [] };
  }
  const drawingRelId = drawingIdMatch[1];

  // sheet rels → drawing target
  const relsPath = `xl/worksheets/_rels/${sheetFile}.rels`;
  const relsText = await zip.file(relsPath)?.async('text');
  if (!relsText) return { count: 0, medias: [] };
  const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  let r;
  let drawingTarget = null;
  while ((r = relRegex.exec(relsText)) !== null) {
    if (r[1] === drawingRelId) {
      drawingTarget = r[2];
      break;
    }
  }
  if (!drawingTarget) return { count: 0, medias: [] };
  const drawingPath = normalizePath(sheetPath, drawingTarget);
  const drawingXml = await zip.file(drawingPath)?.async('text');
  if (!drawingXml) return { count: 0, medias: [] };

  // drawing rels → rId -> media path
  const drawingFileName = drawingPath.substring(drawingPath.lastIndexOf('/') + 1);
  const drawingRelsPath = drawingPath.replace(`drawings/${drawingFileName}`, `drawings/_rels/${drawingFileName}.rels`);
  const drawingRelsText = await zip.file(drawingRelsPath)?.async('text');
  const embedMap = new Map();
  if (drawingRelsText) {
    let m2;
    const dRelRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    while ((m2 = dRelRegex.exec(drawingRelsText)) !== null) {
      const id = m2[1];
      let target = m2[2];
      target = normalizePath(drawingPath, target);
      const basename = target.replace(/^.*\//, '');
      embedMap.set(id, basename);
    }
  }

  // anchors → collect r:embed
  const anchors = drawingXml.match(/<xdr:(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g) || [];
  const medias = new Set();
  anchors.forEach(block => {
    const blipMatch = block.match(/<a:blip[^>]*r:embed="([^"]+)"/);
    if (!blipMatch) return;
    const embedId = blipMatch[1];
    const media = embedMap.get(embedId);
    if (media) medias.add(media);
  });

  return { count: medias.size, medias: Array.from(medias) };
}

async function main() {
  const rel = process.argv[2] || 'public/data/不盈科技2025-9-19.xlsx';
  const sheetName = process.argv[3] || '药店拜访';
  const excelPath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);

  if (!fs.existsSync(excelPath)) {
    console.error('❌ 文件不存在:', excelPath);
    process.exit(1);
  }

  const res = await countSheetDrawings(excelPath, sheetName);
  console.log(`📄 文件: ${excelPath}`);
  console.log(`📑 工作表: ${sheetName}`);
  console.log(`🖼️ 该表中通过 drawings 锚点引用的唯一媒体图片数: ${res.count}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  });
}
