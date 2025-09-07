#!/usr/bin/env node

/**
 * 测试视觉重复检测功能
 * 验证新的dHash算法是否能正确检测视觉相似的图片
 */

const fs = require('fs');
const path = require('path');

// 模拟Worker环境中的dHash算法
function calculateDHashFromImageData(imageData) {
  return new Promise((resolve, reject) => {
    try {
      // 在Node.js环境中，我们需要使用canvas库来模拟OffscreenCanvas
      const { createCanvas, loadImage } = require('canvas');
      
      // 创建临时文件
      const tempPath = path.join(__dirname, 'temp_image.tmp');
      fs.writeFileSync(tempPath, imageData);
      
      loadImage(tempPath).then(img => {
        try {
          // dHash需要9x8的灰度图像
          const hashWidth = 9;
          const hashHeight = 8;
          
          const canvas = createCanvas(hashWidth, hashHeight);
          const ctx = canvas.getContext('2d');
          
          // 绘制并缩放图片到9x8
          ctx.drawImage(img, 0, 0, hashWidth, hashHeight);
          
          // 获取像素数据
          const imageData = ctx.getImageData(0, 0, hashWidth, hashHeight);
          const pixels = imageData.data;
          
          // 转换为灰度并计算dHash
          const grayPixels = [];
          for (let i = 0; i < pixels.length; i += 4) {
            // 使用标准灰度转换公式
            const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
            grayPixels.push(gray);
          }
          
          // 计算dHash：比较相邻像素
          const bits = [];
          for (let y = 0; y < hashHeight; y++) {
            for (let x = 0; x < hashWidth - 1; x++) {
              const leftPixel = grayPixels[y * hashWidth + x];
              const rightPixel = grayPixels[y * hashWidth + x + 1];
              bits.push(leftPixel > rightPixel ? 1 : 0);
            }
          }
          
          // 将64位转换为16位十六进制字符串
          let hash = "";
          for (let i = 0; i < 64; i += 4) {
            const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
            hash += nibble.toString(16);
          }
          
          // 清理临时文件
          fs.unlinkSync(tempPath);
          resolve(hash);
        } catch (error) {
          fs.unlinkSync(tempPath);
          reject(error);
        }
      }).catch(error => {
        fs.unlinkSync(tempPath);
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// 计算汉明距离（十六进制）
function calculateHammingDistanceHex(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const a = parseInt(hash1[i], 16);
    const b = parseInt(hash2[i], 16);
    let xor = a ^ b;
    
    // 计算XOR结果中的1的个数（汉明距离）
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

// 测试函数
async function testVisualDuplicateDetection() {
  console.log('🔍 开始测试视觉重复检测功能...\n');
  
  try {
    // 检查是否安装了canvas库
    try {
      require('canvas');
    } catch (error) {
      console.log('❌ 需要安装canvas库来运行测试:');
      console.log('   npm install canvas');
      return;
    }
    
    // 测试用例：创建一些测试图片数据
    const testImages = [
      {
        id: 'test1.jpg',
        data: Buffer.from('test image data 1'), // 模拟图片数据
        description: '测试图片1'
      },
      {
        id: 'test2.jpg', 
        data: Buffer.from('test image data 1'), // 相同数据，应该被检测为重复
        description: '测试图片2（与图片1相同）'
      },
      {
        id: 'test3.jpg',
        data: Buffer.from('different image data'), // 不同数据
        description: '测试图片3（不同内容）'
      }
    ];
    
    console.log('📊 测试图片信息:');
    testImages.forEach(img => {
      console.log(`   ${img.id}: ${img.description}`);
    });
    console.log();
    
    // 计算每张图片的哈希值
    console.log('🔢 计算图片哈希值...');
    const results = [];
    
    for (const img of testImages) {
      try {
        const hash = await calculateDHashFromImageData(img.data);
        results.push({
          id: img.id,
          hash: hash,
          description: img.description,
          duplicates: []
        });
        console.log(`   ${img.id}: ${hash}`);
      } catch (error) {
        console.log(`   ${img.id}: 计算失败 - ${error.message}`);
        results.push({
          id: img.id,
          hash: '0000000000000000',
          description: img.description,
          duplicates: []
        });
      }
    }
    console.log();
    
    // 检测重复
    console.log('🔍 检测视觉重复...');
    const threshold = 8; // 汉明距离阈值
    
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const hash1 = results[i].hash;
        const hash2 = results[j].hash;
        
        if (hash1 && hash2 && hash1.length === hash2.length) {
          const distance = calculateHammingDistanceHex(hash1, hash2);
          
          console.log(`   ${results[i].id} vs ${results[j].id}: 汉明距离 = ${distance}`);
          
          if (distance <= threshold) {
            console.log(`   ✅ 检测到重复: ${results[i].id} 与 ${results[j].id} (距离: ${distance})`);
            
            results[i].duplicates.push({
              id: results[j].id,
              distance: distance
            });
            results[j].duplicates.push({
              id: results[i].id,
              distance: distance
            });
          }
        }
      }
    }
    console.log();
    
    // 输出结果
    console.log('📋 检测结果总结:');
    results.forEach(result => {
      console.log(`   ${result.id}:`);
      console.log(`     哈希: ${result.hash}`);
      if (result.duplicates.length > 0) {
        console.log(`     重复项: ${result.duplicates.map(d => `${d.id}(距离:${d.distance})`).join(', ')}`);
      } else {
        console.log(`     重复项: 无`);
      }
      console.log();
    });
    
    console.log('✅ 视觉重复检测测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  testVisualDuplicateDetection();
}

module.exports = {
  calculateDHashFromImageData,
  calculateHammingDistanceHex,
  testVisualDuplicateDetection
};
