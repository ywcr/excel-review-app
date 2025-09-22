#!/usr/bin/env node
/**
 * 解析 WPS cellimages 结构：
 * - 从 xl/cellimages.xml + xl/_rels/cellimages.xml.rels 获取 图片ID -> 媒体文件 映射
 * - 扫描所有工作表，查找 DISPIMG("ID_xxx") 的单元格位置
 * - 输出同一媒体文件在多个位置（例如 F 与 O 列）被使用的情况
 *
 * 用法：
 *   node scripts/mapWpsMediaPositions.js "public/data/不盈科技2025-9-19.xlsx"
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

function parseCellRef(cellRef) {
  const m = /^([A-Z]+)(\d+)$/.exec(cellRef || '');
  if (!m) return { column: null, row: null };
  return { column: m[1], row: Number(m[2]) };
}

async function buildWpsIdToMediaMap(zip) {
  const relsPath = 'xl/_rels/cellimages.xml.rels';
  const relsFile = zip.file(relsPath);
  if (!relsFile) return null;
  const relsXml = await relsFile.async('text');

  const ridToTarget = new Map();
  const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  let m;
  while ((m = relRegex.exec(relsXml)) !== null) {
    const id = m[1];
    let target = m[2]; // e.g. media/image1.jpeg
    target = target.replace(/^.*\//, ''); // basename
    ridToTarget.set(id, target);
  }

  const cellimagesFile = zip.file('xl/cellimages.xml');
  if (!cellimagesFile) return null;
  const xml = await cellimagesFile.async('text');

  // 提取每个 etc:cellImage 的 name (ID_xxx) 与 r:embed 值
  const entries = [];
  const cellImageRegex = /<etc:cellImage[^>]*name="([^"]+)"[\s\S]*?<a:blip[^>]*r:embed="([^"]+)"[\s\S]*?<\/etc:cellImage>/g;
  while ((m = cellImageRegex.exec(xml)) !== null) {
    const dispId = m[1];
    const rEmbed = m[2];
    entries.push({ dispId, rEmbed });
  }

  const idToMedia = new Map(); // dispId -> media basename
  for (const e of entries) {
    const media = ridToTarget.get(e.rEmbed);
    if (media) idToMedia.set(e.dispId, media);
  }

  return idToMedia;
}

async function scanDispimgPositions(zip) {
  const positionsById = new Map(); // dispId -> [ {sheetFile, cellRef, column, row} ]
  const worksheetFiles = Object.keys(zip.files).filter(
    (name) => name.startsWith('xl/worksheets/') && name.endsWith('.xml')
  );

  for (const worksheetFile of worksheetFiles) {
    const xml = await zip.file(worksheetFile).async('text');

    const cellRegex = /<c[^>]*r="([^"]+)"[^>]*>([\s\S]*?)<\/c>/g;
    let m;
    while ((m = cellRegex.exec(xml)) !== null) {
      const cellRef = m[1];
      const inner = m[2] || '';
      const fMatch = inner.match(/<f[^>]*>([\s\S]*?)<\/f>/);
      if (!fMatch) continue;
      const formula = fMatch[1];
      if (!/DISPIMG/i.test(formula)) continue;

      // 兼容 &quot; 与 直接双引号
      let idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/i);
      if (!idMatch) idMatch = formula.match(/DISPIMG\("([^"]*?)",/i);
      if (!idMatch) continue;
      const dispId = idMatch[1];

      const { column, row } = parseCellRef(cellRef);
      if (!positionsById.has(dispId)) positionsById.set(dispId, []);
      positionsById.get(dispId).push({ sheetFile: worksheetFile, cellRef, column, row });
    }
  }

  return positionsById;
}

async function main() {
  const rel = process.argv[2] || 'public/data/不盈科技2025-9-19.xlsx';
  const excelPath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);

  if (!fs.existsSync(excelPath)) {
    console.error('❌ 文件不存在:', excelPath);
    process.exit(1);
  }

  console.log('📄 文件:', excelPath);
  const buf = fs.readFileSync(excelPath);
  const zip = await JSZip.loadAsync(buf);

  const idToMedia = await buildWpsIdToMediaMap(zip);
  if (!idToMedia) {
    console.log('⚠️ 未检测到 WPS cellimages 结构，或关系文件缺失。');
    process.exit(0);
  }

  const positionsById = await scanDispimgPositions(zip);

  // 汇总：按媒体文件分组，列出其出现的所有表格位置
  const mediaToPositions = new Map(); // media -> [ {id, cellRef, column, row} ]
  for (const [dispId, media] of idToMedia.entries()) {
    const posList = positionsById.get(dispId) || [];
    if (!mediaToPositions.has(media)) mediaToPositions.set(media, []);
    for (const p of posList) {
      mediaToPositions.get(media).push({ id: dispId, ...p });
    }
  }

  let dupMedia = 0;
  for (const [media, list] of mediaToPositions.entries()) {
    if ((list?.length || 0) > 1) {
      dupMedia++;
      console.log(`\n🔁 同一媒体文件被多处使用: ${media}`);
      list
        .sort((a, b) => (a.row - b.row) || (a.column || '').localeCompare(b.column || ''))
        .forEach((p, idx) => {
          console.log(`  ${idx + 1}. 位置=${p.cellRef} (列=${p.column}, 行=${p.row}) | ID=${p.id}`);
        });

      const cols = Array.from(new Set(list.map((p) => p.column).filter(Boolean)));
      if (cols.length > 1) {
        console.log(`  👉 涉及列: ${cols.join(', ')} (可能存在跨列复用，如 F 与 O)`);
      }
    }
  }

  if (dupMedia === 0) {
    console.log('\n✅ 未发现同一媒体文件在多个单元格被复用的情况。');
  } else {
    console.log(`\n📊 共发现 ${dupMedia} 个媒体文件在多处被复用。`);
  }
}

main().catch((err) => {
  console.error('执行失败:', err);
  process.exit(1);
});
