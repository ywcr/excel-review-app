// 解析具体模板工作表的字段结构
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function parseTemplateSheets() {
  const templatePath = path.join(__dirname, '../public/data/模板总汇.xlsx');
  
  if (!fs.existsSync(templatePath)) {
    console.error('❌ 模板文件不存在！');
    return;
  }

  try {
    const buffer = fs.readFileSync(templatePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // 要解析的模板工作表
    const targetSheets = ['药店拜访', '医院拜访', '科室拜访'];
    
    targetSheets.forEach(sheetName => {
      console.log(`\n🔍 解析工作表: "${sheetName}"`);
      console.log('='.repeat(50));
      
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        console.log('❌ 工作表不存在');
        return;
      }
      
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // 查找表头行
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (row && row.length > 3 && 
            row.some(cell => typeof cell === 'string' && cell.length > 0 && !cell.includes('月'))) {
          // 检查是否包含常见字段名
          const hasCommonFields = row.some(cell => 
            typeof cell === 'string' && 
            (cell.includes('姓名') || cell.includes('时间') || cell.includes('机构') || 
             cell.includes('渠道') || cell.includes('实施') || cell.includes('科室'))
          );
          if (hasCommonFields) {
            headerRowIndex = i;
            break;
          }
        }
      }
      
      if (headerRowIndex >= 0) {
        const headers = data[headerRowIndex].filter(cell => cell && typeof cell === 'string');
        console.log(`📑 表头行 (第${headerRowIndex + 1}行):`);
        headers.forEach((header, index) => {
          console.log(`  ${index + 1}. ${header}`);
        });
        
        // 显示示例数据行
        console.log('\n📊 示例数据:');
        for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 4, data.length); i++) {
          const row = data[i];
          if (row && row.some(cell => cell)) {
            console.log(`第${i + 1}行:`, row.slice(0, headers.length));
          }
        }
        
        // 分析字段类型
        console.log('\n🔍 字段分析:');
        headers.forEach((header, index) => {
          let fieldType = '文本';
          if (header.includes('时间') || header.includes('日期')) {
            fieldType = '日期时间';
          } else if (header.includes('持续') || header.includes('时长') || header.includes('分钟')) {
            fieldType = '数值(分钟)';
          } else if (header.includes('类型') || header.includes('级别')) {
            fieldType = '枚举';
          }
          
          console.log(`  ${header}: ${fieldType}`);
        });
        
      } else {
        console.log('❌ 未找到表头行');
        console.log('前10行数据:');
        for (let i = 0; i < Math.min(10, data.length); i++) {
          console.log(`第${i + 1}行:`, data[i]);
        }
      }
    });

  } catch (error) {
    console.error('❌ 解析模板工作表时出错:', error);
  }
}

// 运行解析
console.log('🚀 开始解析模板工作表...');
parseTemplateSheets();
console.log('\n✅ 解析完成！');
