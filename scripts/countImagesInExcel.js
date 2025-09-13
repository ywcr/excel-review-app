#!/usr/bin/env node

/**
 * 精确计算Excel文件中的图片数量
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

/**
 * 分析Excel文件中的图片数量
 */
async function countImagesInExcel(filePath) {
  try {
    console.log(`🔍 分析文件: ${filePath}`);
    
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);
    
    // 统计媒体文件
    const mediaFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('xl/media/') && 
      (name.toLowerCase().endsWith('.jpg') || 
       name.toLowerCase().endsWith('.jpeg') || 
       name.toLowerCase().endsWith('.png'))
    );
    
    console.log(`📸 媒体文件夹图片数量: ${mediaFiles.length}`);
    
    // 分析图片大小
    let totalSize = 0;
    const imageSizes = [];
    
    for (const fileName of mediaFiles.slice(0, 10)) { // 只分析前10张以节省时间
      const file = zip.files[fileName];
      if (file && file._data) {
        const size = file._data.compressedSize || file._data.uncompressedSize || 0;
        imageSizes.push(size);
        totalSize += size;
      }
    }
    
    const avgSize = imageSizes.length > 0 ? totalSize / imageSizes.length : 0;
    console.log(`📊 平均图片大小: ${(avgSize / 1024).toFixed(2)} KB`);
    
    // 检查cellimages.xml（WPS特有）
    const cellimagesXml = zip.files['xl/cellimages.xml'];
    if (cellimagesXml) {
      console.log('📱 检测到WPS格式 (cellimages.xml)');
      
      const xmlContent = await cellimagesXml.async('text');
      const imageMatches = xmlContent.match(/name="[^"]*ID_[^"]*"/g);
      const wpsImageCount = imageMatches ? imageMatches.length : 0;
      
      console.log(`🖼️ WPS cellimages.xml 中的图片: ${wpsImageCount}`);
      
      return {
        mediaFiles: mediaFiles.length,
        wpsImages: wpsImageCount,
        total: Math.max(mediaFiles.length, wpsImageCount),
        format: 'WPS',
        avgImageSize: avgSize
      };
    }
    
    // 检查标准Excel格式的图片引用
    const worksheetFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('xl/worksheets/') && name.endsWith('.xml')
    );
    
    let totalImageRefs = 0;
    for (const sheetFile of worksheetFiles) {
      const sheetXml = await zip.files[sheetFile].async('text');
      const imageRefs = (sheetXml.match(/<pic:pic/g) || []).length;
      totalImageRefs += imageRefs;
    }
    
    console.log(`📋 工作表中的图片引用: ${totalImageRefs}`);
    
    return {
      mediaFiles: mediaFiles.length,
      imageRefs: totalImageRefs,
      total: Math.max(mediaFiles.length, totalImageRefs),
      format: 'Standard Excel',
      avgImageSize: avgSize
    };
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
    return null;
  }
}

/**
 * 分析所有测试文件
 */
async function analyzeAllFiles() {
  const dataDir = path.join(process.cwd(), 'public/data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx'));
  
  console.log('📁 分析所有Excel文件中的图片数量');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const stats = fs.statSync(filePath);
    
    console.log(`\n📄 ${file}`);
    console.log(`📁 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    const result = await countImagesInExcel(filePath);
    if (result) {
      results.push({
        fileName: file,
        fileSize: stats.size,
        ...result
      });
      
      console.log(`🎯 总图片数量: ${result.total}`);
      console.log(`📊 格式: ${result.format}`);
      
      // 内存使用估算
      const estimatedMemory = result.total * 2; // 每张图片约2MB处理内存
      console.log(`💾 预计处理内存: ${estimatedMemory} MB`);
      
      if (estimatedMemory > 1000) {
        console.log('⚠️ 警告: 可能导致内存问题，需要优化处理');
      }
    }
  }
  
  // 生成汇总报告
  console.log('\n📊 汇总报告');
  console.log('=' .repeat(60));
  
  results.sort((a, b) => b.total - a.total);
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.fileName}`);
    console.log(`   图片数量: ${result.total}`);
    console.log(`   文件大小: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   格式: ${result.format}`);
    console.log('');
  });
  
  // 找出最大的文件
  const largestFile = results[0];
  if (largestFile && largestFile.total > 500) {
    console.log('🚨 发现超大文件:');
    console.log(`📄 文件: ${largestFile.fileName}`);
    console.log(`🖼️ 图片数量: ${largestFile.total}`);
    console.log(`💾 预计内存需求: ${largestFile.total * 2} MB`);
    console.log('');
    console.log('💡 建议:');
    console.log('  • 使用串行处理（已实施）');
    console.log('  • 增加处理间隔（已实施）');
    console.log('  • 移除imageData存储（已实施）');
    console.log('  • 强制垃圾回收（已实施）');
  }
  
  return results;
}

/**
 * 主函数
 */
async function main() {
  const results = await analyzeAllFiles();
  
  // 保存结果
  const reportPath = 'IMAGE_COUNT_REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 详细报告已保存: ${reportPath}`);
}

// 运行分析
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { countImagesInExcel, analyzeAllFiles };
