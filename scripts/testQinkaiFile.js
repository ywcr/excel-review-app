#!/usr/bin/env node

/**
 * 测试秦凯拜访.xlsx文件的解析
 * 验证当前系统是否能正确处理这个特定的Excel文件
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 文件路径
const filePath = path.join(__dirname, '..', 'public', 'data', '秦凯拜访.xlsx');

console.log('🔍 测试秦凯拜访.xlsx文件解析\n');
console.log(`📁 文件路径: ${filePath}`);

// 检查文件是否存在
if (!fs.existsSync(filePath)) {
  console.error('❌ 文件不存在！');
  process.exit(1);
}

// 获取文件信息
const stats = fs.statSync(filePath);
console.log(`📊 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`📅 修改时间: ${stats.mtime}\n`);

try {
  // 读取Excel文件
  console.log('📖 开始读取Excel文件...');
  const workbook = XLSX.readFile(filePath);
  
  // 分析工作表
  console.log('📋 工作表信息:');
  const sheetNames = workbook.SheetNames;
  console.log(`- 工作表数量: ${sheetNames.length}`);
  console.log(`- 工作表名称: ${sheetNames.join(', ')}\n`);
  
  // 分析每个工作表
  sheetNames.forEach((sheetName, index) => {
    console.log(`\n🔍 分析工作表 ${index + 1}: "${sheetName}"`);
    console.log('='.repeat(50));
    
    const worksheet = workbook.Sheets[sheetName];
    
    // 获取范围
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const rowCount = range.e.r - range.s.r + 1;
    const colCount = range.e.c - range.s.c + 1;
    
    console.log(`- 数据范围: ${worksheet['!ref']}`);
    console.log(`- 行数: ${rowCount}`);
    console.log(`- 列数: ${colCount}`);
    
    // 转换为JSON查看数据结构
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 分析表头
    if (jsonData.length > 0) {
      console.log('\n📊 表头分析:');
      const headers = jsonData[0] || [];
      headers.forEach((header, idx) => {
        if (header) {
          console.log(`  列${idx + 1}: ${header}`);
        }
      });
      
      // 统计数据行
      let dataRows = 0;
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
          dataRows++;
        }
      }
      console.log(`\n- 数据行数: ${dataRows}`);
    }
    
    // 检查图片
    console.log('\n🖼️ 图片检测:');
    
    // 检查内嵌图片
    if (worksheet['!images']) {
      console.log(`- 内嵌图片数量: ${worksheet['!images'].length}`);
    }
    
    // 检查Drawing关系
    if (worksheet['!rels']) {
      const imageRels = Object.values(worksheet['!rels']).filter(rel => 
        rel.Type && rel.Type.includes('image')
      );
      console.log(`- Drawing图片关系: ${imageRels.length}`);
    }
    
    // 检查是否有合并单元格
    if (worksheet['!merges']) {
      console.log(`- 合并单元格: ${worksheet['!merges'].length} 个`);
    }
    
    // 显示前几行数据示例
    if (jsonData.length > 1) {
      console.log('\n📝 数据示例（前3行）:');
      for (let i = 1; i <= Math.min(3, jsonData.length - 1); i++) {
        const row = jsonData[i];
        if (row && row.some(cell => cell)) {
          console.log(`  行${i}: ${JSON.stringify(row.slice(0, 5))}...`);
        }
      }
    }
  });
  
  // 尝试解析压缩包结构（检查图片）
  console.log('\n\n📦 检查Excel压缩包结构...');
  const JSZip = require('jszip');
  const fileBuffer = fs.readFileSync(filePath);
  
  JSZip.loadAsync(fileBuffer).then(async (zip) => {
    console.log('- 压缩包文件列表:');
    
    const files = Object.keys(zip.files).sort();
    const imageFiles = files.filter(f => /\.(png|jpg|jpeg|gif|bmp)$/i.test(f));
    const xmlFiles = files.filter(f => f.endsWith('.xml'));
    
    console.log(`  - 总文件数: ${files.length}`);
    console.log(`  - 图片文件: ${imageFiles.length} 个`);
    console.log(`  - XML文件: ${xmlFiles.length} 个`);
    
    // 列出图片文件
    if (imageFiles.length > 0) {
      console.log('\n🖼️ 找到的图片文件:');
      imageFiles.forEach(img => {
        console.log(`  - ${img}`);
      });
    }
    
    // 检查特殊的WPS文件
    const cellImagesXml = files.find(f => f.includes('cellimages.xml'));
    if (cellImagesXml) {
      console.log(`\n⚠️ 发现WPS特有文件: ${cellImagesXml}`);
      
      // 读取并分析cellimages.xml
      const content = await zip.file(cellImagesXml).async('string');
      const imageMatches = content.match(/<pic:pic>/g);
      if (imageMatches) {
        console.log(`  - cellimages.xml中包含 ${imageMatches.length} 张图片定义`);
      }
    }
    
    // 检查drawings文件
    const drawingFiles = files.filter(f => f.includes('drawing') && f.endsWith('.xml'));
    if (drawingFiles.length > 0) {
      console.log('\n📐 Drawing文件:');
      drawingFiles.forEach(f => {
        console.log(`  - ${f}`);
      });
    }
    
    console.log('\n✅ 文件分析完成！');
    
  }).catch(err => {
    console.error('❌ 解析压缩包结构失败:', err.message);
  });
  
} catch (error) {
  console.error('\n❌ 解析文件时出错:');
  console.error(error);
  process.exit(1);
}