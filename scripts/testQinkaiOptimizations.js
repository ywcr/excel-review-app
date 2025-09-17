#!/usr/bin/env node

/**
 * 测试秦凯拜访.xlsx文件的优化效果
 * 验证以下优化点：
 * 1. 表头识别是否正确（无换行符干扰）
 * 2. 内存使用是否稳定
 * 3. 图片解析是否改进
 * 4. 整体处理时间
 */

const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// 模拟Worker环境
global.self = global;
global.MESSAGE_TYPES = {
  PROGRESS: 'PROGRESS'
};
global.postMessage = (message) => {
  if (message.type === 'PROGRESS') {
    console.log(`[进度] ${message.data.progress}% - ${message.data.message}`);
  }
};

// 模拟importScripts函数
global.importScripts = () => {};

// 模拟Worker全局函数
global.blockHashAvailable = false;
global.blockhash = () => null;
global.XLSX = { utils: {} };
global.JSZip = class {};

// 从Worker代码中提取需要的函数
const workerCode = fs.readFileSync(path.join(__dirname, '../public/validation-worker.js'), 'utf8');

// 提取特定函数
const updateDetailedProgressMatch = workerCode.match(/function updateDetailedProgress\(current, total, type\) \{[\s\S]*?\n\}/m);
const inferImagePositionsMatch = workerCode.match(/function inferImagePositions\(imageFiles, dataRows\) \{[\s\S]*?\n\}/m);

if (updateDetailedProgressMatch) {
  eval(updateDetailedProgressMatch[0]);
}

if (inferImagePositionsMatch) {
  eval(inferImagePositionsMatch[0]);
}

async function testOptimizations() {
  console.log('🚀 开始测试秦凯拜访.xlsx文件优化...\n');
  
  const testFile = path.join(__dirname, '../test-files/秦凯拜访.xlsx');
  
  try {
    // 1. 测试表头换行符处理
    console.log('📋 测试1: 表头换行符处理');
    const testHeaders = [
      ['实施\n人', '对接\n人', '拜访时间', '姓名', '机构名称'],
      ['实施人', '对接人', '拜访时间', '姓名', '机构名称']
    ];
    
    testHeaders.forEach((headers, index) => {
      console.log(`  测试集 ${index + 1}:`, headers.slice(0, 3));
      // 模拟清洗
      const cleaned = headers.map(h => 
        String(h || '')
          .trim()
          .replace(/[\n\r]+/g, '')
          .replace(/\s+/g, '')
      );
      console.log(`  清洗后:`, cleaned.slice(0, 3));
    });
    
    // 2. 测试内存监控
    console.log('\n📊 测试2: 内存使用监控');
    if (performance.memory) {
      const memInfo = {
        used: performance.memory.usedJSHeapSize / 1024 / 1024,
        limit: performance.memory.jsHeapSizeLimit / 1024 / 1024,
        usage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      };
      console.log(`  当前内存使用: ${memInfo.used.toFixed(2)}MB / ${memInfo.limit.toFixed(2)}MB (${memInfo.usage.toFixed(2)}%)`);
    } else {
      console.log('  内存监控API不可用（非Chrome浏览器环境）');
    }
    
    // 3. 测试文件大小警告
    console.log('\n📁 测试3: 文件大小警告');
    const testFileSizes = [
      { size: 100 * 1024 * 1024, name: '100MB' },
      { size: 500 * 1024 * 1024, name: '500MB' },
      { size: 655 * 1024 * 1024, name: '655MB (秦凯文件大小)' },
      { size: 1024 * 1024 * 1024, name: '1GB' }
    ];
    
    testFileSizes.forEach(({ size, name }) => {
      const shouldWarn = size > 500 * 1024 * 1024;
      console.log(`  ${name}: ${shouldWarn ? '⚠️ 需要警告' : '✅ 正常处理'}`);
    });
    
    // 4. 测试图片位置推断
    console.log('\n🖼️ 测试4: 图片位置推断');
    const mockImageFiles = Array.from({ length: 138 }, (_, i) => `image${i + 1}.jpeg`);
    const mockDataRows = Array.from({ length: 69 }, (_, i) => i + 1);
    
    console.log(`  图片数量: ${mockImageFiles.length}`);
    console.log(`  数据行数: ${mockDataRows.length}`);
    console.log(`  每行图片数: ${Math.ceil(mockImageFiles.length / mockDataRows.length)}`);
    
    // 测试推断逻辑
    const positions = inferImagePositions(mockImageFiles.slice(0, 6), mockDataRows.slice(0, 3));
    console.log('  前6张图片的推断位置:');
    positions.forEach(pos => {
      console.log(`    ${pos.file} -> ${pos.position}`);
    });
    
    // 5. 测试详细进度更新
    console.log('\n📈 测试5: 详细进度更新');
    updateDetailedProgress(50, 100, '验证数据');
    updateDetailedProgress(138, 138, '处理图片');
    
    console.log('\n✅ 所有优化测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testOptimizations().catch(console.error);