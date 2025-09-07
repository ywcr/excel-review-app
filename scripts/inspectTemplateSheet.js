// Inspect specific sheets in public/data/模板总汇.xlsx and print their header rows
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function inspectSheets() {
  const templatePath = path.join(__dirname, '../public/data/模板总汇.xlsx');

  console.log('📁 模板文件路径:', templatePath);
  if (!fs.existsSync(templatePath)) {
    console.error('❌ 模板文件不存在！');
    process.exit(1);
  }

  const buffer = fs.readFileSync(templatePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const targets = [
    '消费者问卷数据清单',
    '患者问卷数据清单',
    '店员问卷数据清单',
    '药店问卷数据清单',
  ];

  console.log('\n📊 所有工作表数量:', workbook.SheetNames.length);
  console.log('🔎 目标工作表列表:', targets.join(', '));

  for (const name of targets) {
    console.log(`\n📋 分析工作表: "${name}"`);
    console.log('='.repeat(50));
    const sheet = workbook.Sheets[name];
    if (!sheet) {
      console.log('❌ 工作表不存在');
      continue;
    }

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log('总行数:', data.length);

    if (data.length > 0) {
      const header = data[0] || [];
      console.log('第1行(表头)列数:', header.length);
      console.log('表头前20列（清洗前）:', header.slice(0, 20));
      const cleaned = header.map(h => String(h || '').trim().replace(/\n/g, '').replace(/\s+/g, ''));
      console.log('表头前20列（清洗后）:', cleaned.slice(0, 20));
    }

    // Show a few data lines after header
    for (let i = 1; i < Math.min(6, data.length); i++) {
      const row = data[i];
      if (!row || row.length === 0) {
        console.log(`第${i + 1}行: [空行]`);
      } else {
        console.log(`第${i + 1}行(前10列):`, row.slice(0, 10));
      }
    }
  }

  console.log('\n✅ 检查完成');
}

inspectSheets();

