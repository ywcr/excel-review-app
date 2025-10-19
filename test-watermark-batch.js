/**
 * 批量水印检测测试脚本
 * 测试 temp/media 目录中的所有图片
 */

const fs = require('fs');
const path = require('path');

// 已知有水印的图片（用户提供）
const KNOWN_WATERMARKS = [
  'image1990.png',
  'image1991.png',
  'image1992.png',
  'image1993.png',
  'image1994.png',
  'image1995.png',
  'image1996.png',
  'image1997.png'
];

// 读取目录
const mediaDir = path.join(__dirname, 'temp/media');
const files = fs.readdirSync(mediaDir)
  .filter(f => /\.(png|jpeg|jpg)$/i.test(f))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });

console.log(`\n🧪 水印检测批量测试`);
console.log(`📁 目录: ${mediaDir}`);
console.log(`📊 总图片数: ${files.length}`);
console.log(`✅ 已知有水印: ${KNOWN_WATERMARKS.length} 张`);
console.log(`\n${'='.repeat(80)}\n`);

// 模拟检测结果（实际应该调用 advanced-watermark-detection.js）
// 由于是 Node.js 环境，我们创建一个简化的检测报告

const results = {
  total: files.length,
  detected: 0,
  truePositive: 0,  // 正确检测到水印
  falsePositive: 0, // 误报
  trueNegative: 0,  // 正确判断无水印
  falseNegative: 0, // 漏报
  details: []
};

console.log('📋 测试说明：');
console.log('由于 Node.js 环境限制，此脚本生成测试框架');
console.log('请在浏览器中使用 validation-worker.js 进行实际检测\n');

console.log('🎯 已知有水印的图片：');
KNOWN_WATERMARKS.forEach((file, i) => {
  console.log(`  ${i + 1}. ${file}`);
});

console.log('\n📝 推荐测试步骤：\n');
console.log('1️⃣  启动应用: npm run dev');
console.log('2️⃣  创建测试 Excel 文件，包含这些图片');
console.log('3️⃣  上传并验证');
console.log('4️⃣  查看控制台日志，关注：');
console.log('   - [水印检测] 初步结果');
console.log('   - [过滤器] 触发情况');
console.log('   - 最终检测级别');

console.log('\n💡 或者使用以下测试命令：\n');

// 生成测试用的 HTML 文件
const testHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>水印检测批量测试</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .summary-item {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      text-align: center;
    }
    .summary-item .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    .summary-item .value {
      font-size: 28px;
      font-weight: bold;
      color: #333;
      margin: 5px 0;
    }
    .controls {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      margin-right: 10px;
    }
    button:hover {
      background: #45a049;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .progress {
      margin: 20px 0;
      height: 30px;
      background: #e0e0e0;
      border-radius: 15px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
    .results {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .result-item {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .result-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .result-item img {
      width: 100%;
      height: 150px;
      object-fit: cover;
    }
    .result-info {
      padding: 12px;
    }
    .result-filename {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .result-status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
      margin: 2px;
    }
    .status-certain { background: #DC2626; color: white; }
    .status-very_likely { background: #EA580C; color: white; }
    .status-likely { background: #F59E0B; color: white; }
    .status-suspicious { background: #EAB308; color: white; }
    .status-none { background: #10B981; color: white; }
    .confidence {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .filter-tag {
      background: #9333EA;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      display: inline-block;
      margin-top: 5px;
    }
    .known-watermark {
      border: 3px solid #DC2626;
    }
    .log {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 15px;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      max-height: 400px;
      overflow-y: auto;
      margin-top: 20px;
    }
    .log-entry {
      margin: 2px 0;
      line-height: 1.5;
    }
    .log-info { color: #4EC9B0; }
    .log-warn { color: #CE9178; }
    .log-error { color: #F48771; }
    .log-success { color: #B5CEA8; }
  </style>
</head>
<body>
  <h1>🔍 水印检测批量测试</h1>
  
  <div class="summary">
    <h2>📊 测试统计</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">总图片数</div>
        <div class="value" id="totalCount">0</div>
      </div>
      <div class="summary-item">
        <div class="label">已测试</div>
        <div class="value" id="testedCount">0</div>
      </div>
      <div class="summary-item">
        <div class="label">检测到水印</div>
        <div class="value" id="detectedCount">0</div>
      </div>
      <div class="summary-item">
        <div class="label">正确检测 (TP)</div>
        <div class="value" id="tpCount" style="color: #10B981;">0</div>
      </div>
      <div class="summary-item">
        <div class="label">误报 (FP)</div>
        <div class="value" id="fpCount" style="color: #DC2626;">0</div>
      </div>
      <div class="summary-item">
        <div class="label">准确率</div>
        <div class="value" id="accuracy">-%</div>
      </div>
    </div>
  </div>

  <div class="controls">
    <button id="startBtn" onclick="startTest()">🚀 开始测试</button>
    <button id="stopBtn" onclick="stopTest()" disabled>⏸️ 停止测试</button>
    <button onclick="exportResults()">📥 导出结果</button>
    <button onclick="clearResults()">🗑️ 清空结果</button>
    
    <div class="progress">
      <div class="progress-bar" id="progressBar" style="width: 0%">0%</div>
    </div>
  </div>

  <div class="results" id="results"></div>

  <div class="log" id="log"></div>

  <script src="advanced-watermark-detection.js"></script>
  <script>
    const KNOWN_WATERMARKS = ${JSON.stringify(KNOWN_WATERMARKS)};
    const IMAGE_DIR = 'temp/media/';
    
    let testResults = [];
    let testing = false;
    let currentIndex = 0;
    
    function log(message, type = 'info') {
      const logEl = document.getElementById('log');
      const entry = document.createElement('div');
      entry.className = \`log-entry log-\${type}\`;
      entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
      logEl.appendChild(entry);
      logEl.scrollTop = logEl.scrollHeight;
    }
    
    async function startTest() {
      testing = true;
      currentIndex = 0;
      testResults = [];
      
      document.getElementById('startBtn').disabled = true;
      document.getElementById('stopBtn').disabled = false;
      
      log('🚀 开始批量测试...', 'success');
      log(\`📁 目录: \${IMAGE_DIR}\`, 'info');
      log(\`✅ 已知有水印: \${KNOWN_WATERMARKS.length} 张\`, 'info');
      
      // 获取所有图片文件
      const files = ${JSON.stringify(files)};
      document.getElementById('totalCount').textContent = files.length;
      
      for (let i = 0; i < files.length && testing; i++) {
        currentIndex = i;
        const file = files[i];
        await testImage(file, i);
        updateProgress(i + 1, files.length);
      }
      
      finishTest();
    }
    
    function stopTest() {
      testing = false;
      document.getElementById('startBtn').disabled = false;
      document.getElementById('stopBtn').disabled = true;
      log('⏸️ 测试已停止', 'warn');
    }
    
    async function testImage(filename, index) {
      try {
        log(\`🔍 检测: \${filename}\`, 'info');
        
        // 加载图片
        const response = await fetch(\`\${IMAGE_DIR}\${filename}\`);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const imageData = new Uint8Array(arrayBuffer);
        
        // 调用水印检测
        const result = await detectWatermarkAdvanced(imageData);
        
        const isKnownWatermark = KNOWN_WATERMARKS.includes(filename);
        
        // 判断检测结果
        let classification = '';
        if (result.hasWatermark && isKnownWatermark) {
          classification = 'TP'; // 真阳性
          log(\`  ✅ 正确检测: \${filename} (置信度: \${result.watermarkConfidence.toFixed(2)})\`, 'success');
        } else if (result.hasWatermark && !isKnownWatermark) {
          classification = 'FP'; // 假阳性（误报）
          log(\`  ❌ 误报: \${filename} (置信度: \${result.watermarkConfidence.toFixed(2)}, 原因: \${result.filterReason || 'N/A'})\`, 'error');
        } else if (!result.hasWatermark && isKnownWatermark) {
          classification = 'FN'; // 假阴性（漏报）
          log(\`  ⚠️  漏报: \${filename}\`, 'warn');
        } else {
          classification = 'TN'; // 真阴性
        }
        
        testResults.push({
          filename,
          index,
          result,
          isKnownWatermark,
          classification
        });
        
        displayResult(filename, result, isKnownWatermark, classification);
        updateStatistics();
        
      } catch (error) {
        log(\`  ❌ 错误: \${filename} - \${error.message}\`, 'error');
      }
    }
    
    function displayResult(filename, result, isKnownWatermark, classification) {
      const resultsDiv = document.getElementById('results');
      const item = document.createElement('div');
      item.className = \`result-item \${isKnownWatermark ? 'known-watermark' : ''}\`;
      
      const levelText = {
        'certain': '确定有水印',
        'very_likely': '很可能有',
        'likely': '可能有',
        'suspicious': '轻微可疑',
        'none': '无水印'
      }[result.watermarkLevel] || '未知';
      
      item.innerHTML = \`
        <img src="\${IMAGE_DIR}\${filename}" alt="\${filename}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'150\\'%3E%3Crect fill=\\'%23ddd\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\'%3E无法加载%3C/text%3E%3C/svg%3E'">
        <div class="result-info">
          <div class="result-filename" title="\${filename}">\${filename}</div>
          <span class="result-status status-\${result.watermarkLevel}">\${levelText}</span>
          \${classification === 'TP' ? '<span class="result-status" style="background: #10B981;">✓ 正确</span>' : ''}
          \${classification === 'FP' ? '<span class="result-status" style="background: #DC2626;">✗ 误报</span>' : ''}
          \${classification === 'FN' ? '<span class="result-status" style="background: #F59E0B;">! 漏报</span>' : ''}
          \${isKnownWatermark ? '<span class="result-status" style="background: #9333EA;">已知水印</span>' : ''}
          <div class="confidence">置信度: \${result.watermarkConfidence.toFixed(2)}</div>
          \${result.filterApplied ? \`<div class="filter-tag">过滤: \${result.filterReason}</div>\` : ''}
        </div>
      \`;
      
      resultsDiv.appendChild(item);
    }
    
    function updateProgress(current, total) {
      const percent = (current / total * 100).toFixed(1);
      const progressBar = document.getElementById('progressBar');
      progressBar.style.width = percent + '%';
      progressBar.textContent = \`\${current}/\${total} (\${percent}%)\`;
    }
    
    function updateStatistics() {
      const tested = testResults.length;
      const detected = testResults.filter(r => r.result.hasWatermark).length;
      const tp = testResults.filter(r => r.classification === 'TP').length;
      const fp = testResults.filter(r => r.classification === 'FP').length;
      const tn = testResults.filter(r => r.classification === 'TN').length;
      const fn = testResults.filter(r => r.classification === 'FN').length;
      
      const accuracy = tested > 0 ? ((tp + tn) / tested * 100).toFixed(1) : 0;
      
      document.getElementById('testedCount').textContent = tested;
      document.getElementById('detectedCount').textContent = detected;
      document.getElementById('tpCount').textContent = tp;
      document.getElementById('fpCount').textContent = fp;
      document.getElementById('accuracy').textContent = accuracy + '%';
    }
    
    function finishTest() {
      document.getElementById('startBtn').disabled = false;
      document.getElementById('stopBtn').disabled = true;
      
      log('\\n' + '='.repeat(50), 'info');
      log('✅ 测试完成！', 'success');
      log(\`📊 总测试: \${testResults.length} 张\`, 'info');
      
      const tp = testResults.filter(r => r.classification === 'TP').length;
      const fp = testResults.filter(r => r.classification === 'FP').length;
      const tn = testResults.filter(r => r.classification === 'TN').length;
      const fn = testResults.filter(r => r.classification === 'FN').length;
      
      const accuracy = ((tp + tn) / testResults.length * 100).toFixed(1);
      const precision = tp > 0 ? (tp / (tp + fp) * 100).toFixed(1) : 0;
      const recall = tp > 0 ? (tp / (tp + fn) * 100).toFixed(1) : 0;
      
      log(\`准确率: \${accuracy}%\`, 'success');
      log(\`精确率: \${precision}%\`, 'success');
      log(\`召回率: \${recall}%\`, 'success');
      log(\`误报数: \${fp}\`, fp > 0 ? 'warn' : 'success');
      log(\`漏报数: \${fn}\`, fn > 0 ? 'warn' : 'success');
    }
    
    function exportResults() {
      const data = {
        testTime: new Date().toISOString(),
        summary: {
          total: testResults.length,
          detected: testResults.filter(r => r.result.hasWatermark).length,
          tp: testResults.filter(r => r.classification === 'TP').length,
          fp: testResults.filter(r => r.classification === 'FP').length,
          tn: testResults.filter(r => r.classification === 'TN').length,
          fn: testResults.filter(r => r.classification === 'FN').length
        },
        results: testResults
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`watermark-test-results-\${Date.now()}.json\`;
      a.click();
      URL.revokeObjectURL(url);
      
      log('📥 结果已导出', 'success');
    }
    
    function clearResults() {
      if (confirm('确定要清空所有结果吗？')) {
        testResults = [];
        document.getElementById('results').innerHTML = '';
        document.getElementById('log').innerHTML = '';
        updateStatistics();
        updateProgress(0, 1);
        log('🗑️ 结果已清空', 'info');
      }
    }
    
    // 页面加载时初始化
    log('✅ 页面已加载，准备就绪', 'success');
    log('💡 点击"开始测试"按钮开始批量检测', 'info');
    log(\`📋 已知有水印的图片: \${KNOWN_WATERMARKS.join(', ')}\`, 'info');
  </script>
</body>
</html>`;

// 保存 HTML 测试文件
const testHtmlPath = path.join(__dirname, 'test-watermark-batch.html');
fs.writeFileSync(testHtmlPath, testHtml);

console.log(`\n✅ 测试 HTML 文件已生成: test-watermark-batch.html`);
console.log(`\n使用方法：`);
console.log(`1. npm run dev`);
console.log(`2. 在浏览器打开: http://localhost:3000/test-watermark-batch.html`);
console.log(`3. 点击"开始测试"按钮\n`);

console.log(`${'='.repeat(80)}\n`);
console.log(`📝 测试重点：\n`);
console.log(`✅ 应该检测到的 (image1990-1997):`);
KNOWN_WATERMARKS.forEach((file, i) => {
  console.log(`   ${i + 1}. ${file} - 期望: 检测到水印`);
});

console.log(`\n❌ 不应该误报的 (其他 200 张图片):`);
console.log(`   期望: 大部分标记为无水印或低置信度`);

console.log(`\n🎯 评估标准：`);
console.log(`   - 召回率 (检测到 image1990-1997): 目标 100%`);
console.log(`   - 误报率 (其他图片误报): 目标 < 5%`);
console.log(`   - 准确率: 目标 > 95%\n`);



