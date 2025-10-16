const fs = require('fs');

const jsonPath = 'D:/yaowei/excel-review-app/temp/extracted-images/results-bplus.json';
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const data = json.results;

const image200 = data.find(r => r.filename.includes('200'));

if (image200) {
  console.log('=== image200.jpg 完整检测详情 ===\n');
  console.log('检测结果:', image200.hasWatermark ? '有水印' : '无水印');
  console.log('置信度:', image200.confidence);
  
  console.log('\n=== Single分支 ===');
  const s = image200.single || {};
  console.log('分数:', s.score);
  console.log('通过:', s.passed);
  console.log('特征:', JSON.stringify({
    TL: parseFloat(s.textlikeness || 0).toFixed(1),
    OC: parseFloat(s.overlayConsistency || 0).toFixed(2),
    AL: parseFloat(s.alphaLike || 0).toFixed(1),
    WE: parseFloat(s.whiteEdgeRatio || 0).toFixed(1),
    PW: s.positionWeight
  }, null, 2));
  
  console.log('\n=== Repeated分支 ===');
  const r = image200.repeated || {};
  console.log('分数:', r.score);
  console.log('通过:', r.passed);
  
  console.log('\n=== Baseline ===');
  console.log('分数:', image200.baseline);
  
  console.log('\n=== Fusion ===');
  const f = image200.fusion || {};
  console.log('scaledSingle:', f.scaledSingle);
  console.log('scaledRepeated:', f.scaledRepeated);
  console.log('scaledBaseline:', f.scaledBaseline);
  console.log('votes:', f.votes);
  console.log('twoFactorPass:', f.twoFactorPass);
  
  console.log('\n=== 场景特征 ===');
  console.log('Gridness:', image200.gridness?.score, '(isGrid:', image200.gridness?.isGrid + ')');
  console.log('Concentration:', image200.concentration?.ratio);
  console.log('ROI Gridness:', image200.roiGridness?.score);
  
  console.log('\n=== 决策信息 ===');
  console.log('Decision:', image200.decision);
  console.log('hardReject:', image200.hardReject);
  console.log('hardRejectReason:', image200.hardRejectReason || 'N/A');
  
  // 与真水印对比
  console.log('\n=== 对比真水印特征 ===');
  const trueWatermarks = ['image196.jpeg', 'image197.jpeg', 'image198.png', 'image199.jpg'];
  console.log('真水印image196: TL=100, OC=1.88, AL=58.1');
  console.log('真水印image197: TL=60.5, OC=4.22, AL=5.7');
  console.log('真水印image198: TL=96.7, OC=0.00, AL=87.2');
  console.log('真水印image199: TL=100, OC=0.00, AL=34.8');
  console.log('image200:       TL=' + s.textlikeness?.toFixed(1) + ', OC=' + s.overlayConsistency?.toFixed(2) + ', AL=' + s.alphaLike?.toFixed(1));
  
  // 规则B测试
  console.log('\n=== 规则B测试 (TL≥95 AND OC<3 AND Grid>60) ===');
  const tl = parseFloat(s.textlikeness || 0);
  const oc = parseFloat(s.overlayConsistency || 0);
  const grid = parseFloat(image200.gridness?.score || 0);
  const wouldBeFilteredByRuleB = tl >= 95 && oc < 3 && grid > 60;
  console.log('TL≥95:', tl >= 95);
  console.log('OC<3:', oc < 3);
  console.log('Grid>60:', grid > 60);
  console.log('会被规则B过滤:', wouldBeFilteredByRuleB);
} else {
  console.log('未找到image200');
}
