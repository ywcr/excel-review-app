const fs = require('fs');

const jsonPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const data = json.results;

// 查找image200
const image200 = data.find(r => r.filename.includes('200'));

if (image200) {
  console.log('=== image200.jpg 检测结果 ===\n');
  console.log('文件名:', image200.filename);
  console.log('检测结果:', image200.hasWatermark ? '✅ 有水印' : '❌ 无水印');
  console.log('置信度:', image200.confidence);
  
  const s = image200.single || {};
  console.log('\n特征详情:');
  console.log('  TL =', s.textlikeness?.toFixed(1));
  console.log('  OC =', s.overlayConsistency?.toFixed(2));
  console.log('  AL =', s.alphaLike?.toFixed(1));
  console.log('  WE =', s.whiteEdgeRatio?.toFixed(1));
  console.log('  PW =', s.positionWeight);
  console.log('  Conc =', image200.concentration?.ratio);
  console.log('  Grid =', image200.gridness?.score);
  console.log('  isGrid =', image200.gridness?.isGrid);
  
  console.log('\n硬拒绝:', image200.hardReject || false);
  console.log('拒绝原因:', image200.hardRejectReason || 'N/A');
} else {
  console.log('❌ 未找到image200.jpg');
  console.log('\n文件列表中包含200的:');
  data.filter(r => r.filename.includes('200')).forEach(r => {
    console.log('  -', r.filename);
  });
}

// 显示总图片数
console.log('\n总图片数:', data.length);
