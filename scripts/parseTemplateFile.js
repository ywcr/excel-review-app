// 解析模板总汇.xlsx文件的脚本
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function parseTemplateFile() {
  const templatePath = path.join(__dirname, '../public/data/模板总汇.xlsx');
  
  console.log('📁 模板文件路径:', templatePath);
  console.log('📄 文件是否存在:', fs.existsSync(templatePath));
  
  if (!fs.existsSync(templatePath)) {
    console.error('❌ 模板文件不存在！');
    return;
  }

  try {
    // 读取Excel文件
    const buffer = fs.readFileSync(templatePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    console.log('\n📊 工作表列表:');
    workbook.SheetNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });

    // 查找任务说明工作表
    const taskSheetName = workbook.SheetNames.find(name => 
      name.includes('任务说明') || name.includes('任务') || name.includes('说明')
    ) || workbook.SheetNames[0];
    
    console.log(`\n🎯 使用工作表: "${taskSheetName}"`);
    
    const taskSheet = workbook.Sheets[taskSheetName];
    if (!taskSheet) {
      console.error('❌ 找不到任务说明工作表');
      return;
    }

    // 转换为JSON数组
    const data = XLSX.utils.sheet_to_json(taskSheet, { header: 1 });
    
    console.log('\n📋 工作表内容预览:');
    console.log('总行数:', data.length);
    
    // 显示前几行数据
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (row && row.length > 0) {
        console.log(`第${i + 1}行:`, row.slice(0, 5).map(cell => 
          typeof cell === 'string' ? cell.substring(0, 20) : cell
        ));
      }
    }

    // 查找表头行
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (row && row.some(cell => 
        typeof cell === 'string' && 
        (cell.includes('服务') || cell.includes('项目') || cell.includes('类别'))
      )) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex >= 0) {
      console.log(`\n📑 表头行 (第${headerRowIndex + 1}行):`, data[headerRowIndex]);
      
      // 解析任务数据
      console.log('\n🔍 解析的任务列表:');
      const tasks = [];
      
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const task = {
          rowIndex: i + 1,
          serviceCategory: row[0] || '',
          serviceItem: row[1] || '',
          feeStandard: row[2] || '',
          unit: row[3] || '',
          requirements: row[4] || '',
          template: row[5] || '',
          ratio: row[7] || '',
          notes: row[8] || '',
          sampleLink: row[9] || '',
          complianceNotes: row[10] || ''
        };
        
        if (task.serviceItem) {
          tasks.push(task);
          console.log(`  ${tasks.length}. ${task.serviceItem}`);
          if (task.requirements) {
            console.log(`     要求: ${task.requirements.substring(0, 100)}...`);
          }
        }
      }

      console.log(`\n✅ 共找到 ${tasks.length} 个任务`);

      // 查找特定任务的详细信息
      const targetTasks = ['药店拜访', '等级医院拜访', '基层医疗机构拜访', '科室拜访'];
      
      console.log('\n🎯 目标任务详细信息:');
      targetTasks.forEach(taskName => {
        const task = tasks.find(t => 
          t.serviceItem.includes(taskName) || 
          t.serviceItem === taskName
        );
        
        if (task) {
          console.log(`\n📌 ${taskName}:`);
          console.log(`   服务类别: ${task.serviceCategory}`);
          console.log(`   费用标准: ${task.feeStandard}`);
          console.log(`   计量单位: ${task.unit}`);
          console.log(`   要求: ${task.requirements}`);
          console.log(`   模板: ${task.template}`);
          console.log(`   备注: ${task.notes}`);
        } else {
          console.log(`\n❌ 未找到: ${taskName}`);
        }
      });

      // 检查是否有其他工作表包含模板信息
      console.log('\n🔍 检查其他工作表:');
      workbook.SheetNames.forEach(sheetName => {
        if (sheetName !== taskSheetName) {
          const sheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          console.log(`\n📄 工作表 "${sheetName}":`, sheetData.length, '行');
          if (sheetData.length > 0 && sheetData[0]) {
            console.log('   第一行:', sheetData[0].slice(0, 5));
          }
          
          // 检查是否包含字段定义
          const hasFieldDefinitions = sheetData.some(row => 
            row && row.some(cell => 
              typeof cell === 'string' && 
              (cell.includes('字段') || cell.includes('列名') || cell.includes('必填'))
            )
          );
          
          if (hasFieldDefinitions) {
            console.log('   ⭐ 可能包含字段定义');
          }
        }
      });

    } else {
      console.log('\n❌ 未找到表头行');
    }

  } catch (error) {
    console.error('❌ 解析模板文件时出错:', error);
  }
}

// 运行解析
console.log('🚀 开始解析模板文件...\n');
parseTemplateFile();
console.log('\n✅ 解析完成！');
