/**
 * Excel图片提取和水印检测分析脚本
 * 用于诊断Excel压缩对水印检测的影响
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

// Excel文件路径
const excelPath = 'C:\\Users\\123mi\\Downloads\\不盈科技2025-9-19.xlsx';
const outputDir = 'D:\\yaowei\\excel-review-app\\temp\\extracted-images';

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function analyzeExcelImages() {
  try {
    console.log('🔍 开始分析 Excel 文件...');
    console.log(`📂 文件路径: ${excelPath}`);
    console.log('');

    // 读取Excel文件
    const fileBuffer = fs.readFileSync(excelPath);
    console.log(`✅ 文件大小: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // 解压Excel (xlsx实际上是zip文件)
    const zip = await JSZip.loadAsync(fileBuffer);
    console.log('✅ Excel文件解压成功');
    console.log('');

    // 查找所有图片文件
    const mediaFolder = zip.folder('xl/media');
    
    if (!mediaFolder) {
      console.log('❌ 未找到 xl/media 文件夹，Excel中可能没有图片');
      return;
    }

    const imageFiles = [];
    mediaFolder.forEach((relativePath, file) => {
      if (!file.dir) {
        const ext = path.extname(file.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(ext)) {
          imageFiles.push({ relativePath, file });
        }
      }
    });

    console.log(`📸 发现 ${imageFiles.length} 张图片`);
    console.log('');

    // 提取并分析每张图片
    const results = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const { relativePath, file } = imageFiles[i];
      const imageData = await file.async('nodebuffer');
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📷 图片 ${i + 1}/${imageFiles.length}: ${relativePath}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      // 保存图片到磁盘
      const outputPath = path.join(outputDir, relativePath);
      fs.writeFileSync(outputPath, imageData);
      console.log(`💾 已保存到: ${outputPath}`);
      
      // 获取图片信息
      const sizeKB = (imageData.length / 1024).toFixed(2);
      console.log(`📊 文件大小: ${sizeKB} KB`);
      
      // 检测图片类型和尺寸
      const imageInfo = await getImageInfo(imageData);
      if (imageInfo) {
        console.log(`📐 尺寸: ${imageInfo.width} × ${imageInfo.height} px`);
        console.log(`🎨 格式: ${imageInfo.format}`);
        console.log(`📏 像素: ${(imageInfo.width * imageInfo.height / 1000000).toFixed(2)} MP`);
        
        // 计算压缩率估算
        const expectedSize = imageInfo.width * imageInfo.height * 3; // RGB未压缩
        const compressionRatio = ((1 - imageData.length / expectedSize) * 100).toFixed(1);
        console.log(`🗜️  压缩率: ~${compressionRatio}%`);
      }
      
      results.push({
        name: relativePath,
        size: imageData.length,
        sizeKB,
        ...imageInfo
      });
      
      console.log('');
    }

    // 生成汇总报告
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 汇总报告');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    console.log(`总图片数: ${results.length}`);
    console.log(`总大小: ${(results.reduce((sum, r) => sum + r.size, 0) / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
    
    // 按格式分组
    const byFormat = {};
    results.forEach(r => {
      if (!byFormat[r.format]) byFormat[r.format] = [];
      byFormat[r.format].push(r);
    });
    
    console.log('图片格式分布:');
    Object.keys(byFormat).forEach(format => {
      console.log(`  ${format}: ${byFormat[format].length} 张`);
    });
    console.log('');
    
    // 查找可能的 image198.png
    const image198 = results.find(r => r.name.includes('image198'));
    if (image198) {
      console.log('🎯 找到 image198:');
      console.log(`   名称: ${image198.name}`);
      console.log(`   尺寸: ${image198.width} × ${image198.height}`);
      console.log(`   大小: ${image198.sizeKB} KB`);
      console.log(`   格式: ${image198.format}`);
    }
    
    // 保存详细报告到JSON
    const reportPath = path.join(outputDir, 'analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log('');
    console.log(`📄 详细报告已保存到: ${reportPath}`);
    console.log('');
    console.log('✅ 分析完成！');
    console.log('');
    console.log('💡 提示: 提取的图片已保存到:');
    console.log(`   ${outputDir}`);
    console.log('');
    console.log('🔬 下一步: 你可以使用独立水印检测工具测试这些图片');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  }
}

// 获取图片信息（尺寸、格式等）
async function getImageInfo(imageData) {
  try {
    // PNG 格式检测
    if (imageData[0] === 0x89 && imageData[1] === 0x50 && imageData[2] === 0x4E && imageData[3] === 0x47) {
      // PNG 签名: 89 50 4E 47
      // IHDR chunk 在偏移 16
      const width = imageData.readUInt32BE(16);
      const height = imageData.readUInt32BE(20);
      return { format: 'PNG', width, height };
    }
    
    // JPEG 格式检测
    if (imageData[0] === 0xFF && imageData[1] === 0xD8 && imageData[2] === 0xFF) {
      // JPEG 签名: FF D8 FF
      let offset = 2;
      while (offset < imageData.length) {
        if (imageData[offset] !== 0xFF) break;
        
        const marker = imageData[offset + 1];
        
        // SOF0-SOF15 markers (除了SOF4, SOF8, SOF12)
        if ((marker >= 0xC0 && marker <= 0xCF) && 
            marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
          const height = imageData.readUInt16BE(offset + 5);
          const width = imageData.readUInt16BE(offset + 7);
          return { format: 'JPEG', width, height };
        }
        
        // 跳过这个segment
        const segmentLength = imageData.readUInt16BE(offset + 2);
        offset += segmentLength + 2;
      }
    }
    
    // GIF 格式检测
    if (imageData[0] === 0x47 && imageData[1] === 0x49 && imageData[2] === 0x46) {
      const width = imageData.readUInt16LE(6);
      const height = imageData.readUInt16LE(8);
      return { format: 'GIF', width, height };
    }
    
    // BMP 格式检测
    if (imageData[0] === 0x42 && imageData[1] === 0x4D) {
      const width = imageData.readInt32LE(18);
      const height = Math.abs(imageData.readInt32LE(22));
      return { format: 'BMP', width, height };
    }
    
    // WebP 格式检测
    if (imageData[0] === 0x52 && imageData[1] === 0x49 && imageData[2] === 0x46 && imageData[3] === 0x46 &&
        imageData[8] === 0x57 && imageData[9] === 0x45 && imageData[10] === 0x42 && imageData[11] === 0x50) {
      // WebP 格式较复杂，这里简化处理
      return { format: 'WebP', width: '?', height: '?' };
    }
    
    return { format: 'Unknown', width: '?', height: '?' };
    
  } catch (error) {
    console.warn('  ⚠️  无法解析图片信息:', error.message);
    return { format: 'Unknown', width: '?', height: '?' };
  }
}

// 运行分析
analyzeExcelImages();
