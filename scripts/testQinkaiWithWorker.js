#!/usr/bin/env node

/**
 * 使用Web Worker测试秦凯拜访.xlsx的解析
 * 模拟实际的前端验证流程
 */

const { Worker } = require('worker_threads');
const fs = require('fs');
const path = require('path');

// 文件路径
const filePath = path.join(__dirname, '..', 'public', 'data', '秦凯拜访.xlsx');

console.log('🚀 使用Web Worker测试秦凯拜访.xlsx解析\n');

// 检查文件
if (!fs.existsSync(filePath)) {
  console.error('❌ 文件不存在！');
  process.exit(1);
}

// 读取文件
const fileBuffer = fs.readFileSync(filePath);
console.log(`📁 文件大小: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

// 创建测试任务模板（药店拜访）
const taskTemplate = {
  name: "药店拜访",
  description: "药店拜访任务验证",
  requiredFields: ["实施人", "零售渠道", "拜访开始时间", "拜访时长"],
  sheetNames: ["药店拜访", "Sheet1", "工作表1"],
  fieldMappings: {
    "序号": "serialNumber",
    "任务标题": "taskTitle",
    "实施人": "implementer",
    "对接人": "contactPerson",
    "零售渠道": "retailChannel",
    "渠道地址": "channelAddress",
    "拜访开始时间": "visitStartTime",
    "拜访时长": "visitDuration",
    "拜访事项（1）": "visitItem1",
    "信息反馈（1）": "feedback1",
    "拜访事项（2）": "visitItem2",
    "信息反馈（2）": "feedback2",
    "门头": "storefront",
    "内部": "interior"
  },
  validationRules: [
    {
      field: "retailChannel",
      type: "required",
      message: "零售渠道不能为空"
    },
    {
      field: "implementer",
      type: "required",
      message: "实施人不能为空"
    },
    {
      field: "visitStartTime",
      type: "dateFormat",
      params: { allowTimeComponent: false },
      message: "拜访开始时间格式不正确"
    },
    {
      field: "retailChannel",
      type: "unique",
      params: { scope: "day", groupBy: "retailChannel" },
      message: "同一药店1日内不能重复拜访"
    },
    {
      field: "visitDuration",
      type: "duration",
      params: { minMinutes: 60 },
      message: "拜访有效时间不低于60分钟"
    }
  ]
};

// 模拟Worker消息处理
console.log('\n📊 开始解析...\n');

const XLSX = require('xlsx');
const JSZip = require('jszip');

async function simulateWorkerParsing() {
  try {
    // 1. 读取Excel
    console.log('1️⃣ 读取Excel文件...');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    console.log(`   ✓ 工作表: ${workbook.SheetNames.join(', ')}`);
    
    // 2. 选择工作表
    const sheetName = workbook.SheetNames[0];
    console.log(`   ✓ 使用工作表: ${sheetName}`);
    
    // 3. 转换数据
    console.log('\n2️⃣ 转换数据...');
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`   ✓ 数据行数: ${jsonData.length}`);
    
    // 4. 识别表头
    console.log('\n3️⃣ 识别表头...');
    let headerRowIndex = -1;
    let headers = [];
    
    // 查找包含"序号"的行作为表头
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.some(cell => cell && cell.toString().includes('序号'))) {
        headerRowIndex = i;
        headers = row.map(h => h ? h.toString().trim() : '');
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      console.log('   ❌ 未找到表头行！');
      return;
    }
    
    console.log(`   ✓ 表头在第 ${headerRowIndex + 1} 行`);
    console.log(`   ✓ 列数: ${headers.length}`);
    console.log(`   ✓ 表头内容:`);
    headers.forEach((h, i) => {
      if (h) console.log(`     列${i + 1}: ${h}`);
    });
    
    // 5. 字段映射
    console.log('\n4️⃣ 字段映射...');
    const fieldMap = {};
    headers.forEach((header, index) => {
      const cleanHeader = header.replace(/\\s+/g, '').replace(/\\n/g, '');
      Object.entries(taskTemplate.fieldMappings).forEach(([excelField, standardField]) => {
        const cleanExcelField = excelField.replace(/\\s+/g, '');
        if (cleanHeader === cleanExcelField || header === excelField) {
          fieldMap[standardField] = index;
          console.log(`   ✓ ${excelField} -> ${standardField} (列${index + 1})`);
        }
      });
    });
    
    // 6. 验证数据
    console.log('\n5️⃣ 验证数据...');
    const errors = [];
    let validRows = 0;
    
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.every(cell => !cell)) continue;
      
      // 验证必填字段
      taskTemplate.validationRules.forEach(rule => {
        if (rule.type === 'required') {
          const fieldIndex = fieldMap[rule.field];
          if (fieldIndex !== undefined) {
            const value = row[fieldIndex];
            if (!value || value.toString().trim() === '') {
              errors.push({
                row: i + 1,
                field: rule.field,
                message: rule.message,
                value: value
              });
            }
          }
        }
      });
      
      validRows++;
    }
    
    console.log(`   ✓ 验证了 ${validRows} 行数据`);
    console.log(`   ${errors.length > 0 ? '❌' : '✓'} 发现 ${errors.length} 个错误`);
    
    if (errors.length > 0) {
      console.log('\n   错误示例（前5个）:');
      errors.slice(0, 5).forEach(err => {
        console.log(`     行${err.row}: ${err.message}`);
      });
    }
    
    // 7. 图片解析
    console.log('\n6️⃣ 图片解析...');
    const zip = await JSZip.loadAsync(fileBuffer);
    
    // 检查是否有cellimages.xml（WPS格式）
    const cellImagesPath = Object.keys(zip.files).find(f => f.includes('cellimages.xml') && !f.includes('.rels'));
    
    if (cellImagesPath) {
      console.log(`   ⚠️ 检测到WPS格式文件: ${cellImagesPath}`);
      
      // 解析cellimages.xml
      const cellImagesContent = await zip.file(cellImagesPath).async('string');
      const picMatches = cellImagesContent.match(/<pic:pic[^>]*>/g) || [];
      console.log(`   ✓ cellimages.xml中有 ${picMatches.length} 张图片`);
      
      // 解析DISPIMG函数
      const dispImgMatches = cellImagesContent.match(/DISPIMG\([^)]+\)/g) || [];
      console.log(`   ✓ 发现 ${dispImgMatches.length} 个DISPIMG函数`);
      
      // 分析图片分布
      if (dispImgMatches.length > 0) {
        console.log('\n   图片位置示例（前5个）:');
        dispImgMatches.slice(0, 5).forEach((match, i) => {
          console.log(`     ${i + 1}. ${match}`);
        });
      }
    } else {
      console.log('   ℹ️ 未检测到WPS格式的cellimages.xml');
      
      // 检查标准Excel图片
      const drawingRels = Object.keys(zip.files).filter(f => f.includes('drawing') && f.endsWith('.xml.rels'));
      console.log(`   ✓ 发现 ${drawingRels.length} 个drawing关系文件`);
    }
    
    // 统计图片文件
    const imageFiles = Object.keys(zip.files).filter(f => /\.(png|jpg|jpeg|gif|bmp)$/i.test(f));
    console.log(`   ✓ 总图片文件数: ${imageFiles.length}`);
    
    console.log('\n✅ 解析完成！');
    
    // 返回结果摘要
    return {
      success: true,
      summary: {
        totalRows: validRows,
        validRows: validRows - errors.length,
        errorCount: errors.length,
        imageCount: imageFiles.length,
        sheetName: sheetName,
        isWPSFormat: !!cellImagesPath
      }
    };
    
  } catch (error) {
    console.error('\n❌ 解析失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 执行测试
simulateWorkerParsing().then(result => {
  console.log('\n📋 解析结果摘要:');
  console.log(JSON.stringify(result, null, 2));
});