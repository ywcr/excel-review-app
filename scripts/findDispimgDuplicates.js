#!/usr/bin/env node
/**
 * 扫描 Excel (xlsx) 中的 DISPIMG 公式，定位图片在单元格的位置，
 * 并输出同一图片ID被放置在多个单元格（疑似重复）的情况。
 *
 * 使用方法：
 *   node scripts/findDispimgDuplicates.js "public/data/不盈科技2025-9-19.xlsx"
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

function parseCellRef(cellRef) {
  // e.g. "F7" -> { column: 'F', row: 7 }
  const m = /^([A-Z]+)(\d+)$/.exec(cellRef || '');
  if (!m) return { column: null, row: null };
  return { column: m[1], row: Number(m[2]) };
}

async function findDispimgPositions(zip) {
  const results = []; // { sheetFile, cellRef, id, column, row }

  // 遍历所有工作表 xml
  const worksheetFiles = Object.keys(zip.files).filter(
    (name) => name.startsWith('xl/worksheets/') && name.endsWith('.xml')
  );

  for (const worksheetFile of worksheetFiles) {
    const file = zip.file(worksheetFile);
    if (!file) continue;
    const xml = await file.async('text');

    // 粗略解析每个 <c r="..."> ... </c> 块，寻找包含 DISPIMG 的公式
    const cellRegex = /<c[^>]*r="([^"]+)"[^>]*>([\s\S]*?)<\/c>/g;
    let m;
    while ((m = cellRegex.exec(xml)) !== null) {
      const cellRef = m[1];
      const cellInner = m[2] || '';

      // 既支持直接双引号，也支持 &quot; 形式
      const fMatch = cellInner.match(/<f[^>]*>([\s\S]*?)<\/f>/);
      if (!fMatch) continue;
      const formula = fMatch[1];
      if (!/DISPIMG/i.test(formula)) continue;

      let id = null;
      let idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/i);
      if (!idMatch) {
        idMatch = formula.match(/DISPIMG\("([^"]*?)",/i);
      }
      if (idMatch) id = idMatch[1];
      if (!id) continue;

      const { column, row } = parseCellRef(cellRef);
      results.push({ sheetFile: worksheetFile, cellRef, id, column, row });
    }
  }

  return results;
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

  const positions = await findDispimgPositions(zip);
  if (positions.length === 0) {
    console.log('⚠️ 未在工作表中发现 DISPIMG 公式。此文件可能使用的是 drawings 锚点或 WPS cellimages 结构。');
  } else {
    console.log(`🔎 发现含 DISPIMG 的单元格: ${positions.length} 个`);
  }

  // 聚合：按图片ID分组，找出被放置多次的ID
  const byId = new Map();
  for (const p of positions) {
    if (!byId.has(p.id)) byId.set(p.id, []);
    byId.get(p.id).push(p);
  }

  let dupCount = 0;
  for (const [id, list] of byId.entries()) {
    if (list.length > 1) {
      dupCount++;
      console.log(`\n🚨 图片ID重复: ${id}`);
      list
        .sort((a, b) => (a.row - b.row) || (a.column || '').localeCompare(b.column || ''))
        .forEach((p, idx) => {
          console.log(`  ${idx + 1}. 位置=${p.cellRef} (列=${p.column}, 行=${p.row}) in ${p.sheetFile}`);
        });
    }
  }

  if (dupCount === 0) {
    console.log('\n✅ 未发现同一图片ID在多个单元格的情况。');
  } else {
    console.log(`\n📊 共发现 ${dupCount} 组图片ID重复。`);
  }
}

main().catch((err) => {
  console.error('执行失败:', err);
  process.exit(1);
});
