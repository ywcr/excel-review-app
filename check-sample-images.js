// 简单检查几张假阳性图片
const fs = require('fs');

console.log('检查extracted-images目录下的图片...\n');

const sampleImages = [
  'image102.jpeg',
  'image103.jpeg', 
  'image105.jpeg',
  'image106.jpeg',
  'image196.jpeg',  // 真水印
  'image197.jpeg',  // 真水印
  'image198.png'    // 真水印
];

const dir = 'D:/yaowei/excel-review-app/temp/extracted-images';

sampleImages.forEach(img => {
  const path = `${dir}/${img}`;
  if (fs.existsSync(path)) {
    const stats = fs.statSync(path);
    console.log(`${img}: ${(stats.size/1024).toFixed(1)} KB`);
  } else {
    console.log(`${img}: 不存在`);
  }
});

console.log('\n这些图片是从Excel文件中提取的嵌入图片。');
console.log('假阳性可能的原因：');
console.log('1. 图片本身包含文字、图表、示意图等有边缘和纹理的内容');
console.log('2. 图片可能有复杂的几何图案或网格状结构');
console.log('3. 图片可能有规则排列的元素（如图标、按钮等）');
console.log('4. 压缩和保存导致的伪影');
console.log('\n建议：手动查看几张假阳性图片，了解它们的实际内容。');
