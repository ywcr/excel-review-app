// 调试真实文件的表头识别问题
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function debugRealFileHeader() {
  const filePath = path.join(__dirname, '../public/test-files/8月盛邦药店拜访记录(11111111).xlsx');
  
  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets['药店拜访'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log('🔍 调试真实文件的表头识别...\n');
    
    // 当前的模板配置
    const pharmacyTemplate = {
      requiredFields: ["实施人", "零售渠道", "拜访开始时间", "拜访时长"]
    };
    
    console.log('📋 当前模板要求的必填字段:');
    pharmacyTemplate.requiredFields.forEach((field, index) => {
      console.log(`  ${index + 1}. "${field}"`);
    });
    
    // 分析第3行（表头行）
    const headerRow = data[2]; // 第3行，索引为2
    console.log('\n📊 第3行表头内容:');
    headerRow.forEach((header, index) => {
      console.log(`  ${index + 1}. "${header}"`);
    });
    
    // 清洗表头
    const cleanHeaders = headerRow.map(h => 
      String(h || "").trim().replace(/\n/g, "").replace(/\s+/g, "")
    );
    
    console.log('\n🧹 清洗后的表头:');
    cleanHeaders.forEach((header, index) => {
      console.log(`  ${index + 1}. "${header}"`);
    });
    
    // 检查每个必填字段的匹配情况
    console.log('\n🎯 必填字段匹配检查:');
    pharmacyTemplate.requiredFields.forEach(required => {
      console.log(`\n检查字段: "${required}"`);
      
      let found = false;
      let matchType = '';
      let matchedHeader = '';
      
      for (const header of cleanHeaders) {
        // 精确匹配
        if (header === required) {
          found = true;
          matchType = '精确匹配';
          matchedHeader = header;
          break;
        }
        // 包含匹配
        if (header.includes(required) || required.includes(header)) {
          found = true;
          matchType = '包含匹配';
          matchedHeader = header;
          break;
        }
        // 相似度匹配
        if (calculateSimilarity(header, required) > 0.8) {
          found = true;
          matchType = '相似度匹配';
          matchedHeader = header;
          break;
        }
      }
      
      if (found) {
        console.log(`  ✅ ${matchType}: "${matchedHeader}"`);
      } else {
        console.log(`  ❌ 未找到匹配`);
        
        // 显示最相似的字段
        let bestMatch = '';
        let bestSimilarity = 0;
        for (const header of cleanHeaders) {
          const similarity = calculateSimilarity(header, required);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = header;
          }
        }
        console.log(`     最相似字段: "${bestMatch}" (相似度: ${bestSimilarity.toFixed(3)})`);
      }
    });
    
    // 计算总匹配分数
    let totalScore = 0;
    let matchedCount = 0;
    
    for (const required of pharmacyTemplate.requiredFields) {
      const found = cleanHeaders.some(header => {
        if (header === required) return true;
        if (header.includes(required) || required.includes(header)) return true;
        return calculateSimilarity(header, required) > 0.8;
      });
      if (found) {
        totalScore += 10;
        matchedCount++;
      }
    }
    
    totalScore += cleanHeaders.filter(h => h.length > 0).length * 0.1; // 基础分
    totalScore += 5; // 典型表头特征分
    
    console.log(`\n📊 匹配结果统计:`);
    console.log(`匹配的必填字段: ${matchedCount}/${pharmacyTemplate.requiredFields.length}`);
    console.log(`总分数: ${totalScore.toFixed(1)}`);
    console.log(`是否通过识别: ${totalScore > 0 && cleanHeaders.filter(h => h.length > 0).length >= 3 ? '是' : '否'}`);
    
    // 建议的解决方案
    console.log('\n💡 建议的解决方案:');
    if (matchedCount < pharmacyTemplate.requiredFields.length) {
      console.log('1. 更新模板配置中的必填字段，使其与真实表头匹配');
      console.log('2. 或者改进字段匹配逻辑，支持更灵活的匹配');
    }
    
    // 显示建议的模板配置
    console.log('\n🔧 建议的模板配置:');
    console.log('requiredFields: [');
    cleanHeaders.slice(0, 8).forEach(header => {
      if (header && header.length > 0) {
        console.log(`  "${header}",`);
      }
    });
    console.log(']');

  } catch (error) {
    console.error('❌ 调试时出错:', error);
  }
}

function calculateSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}

// 运行调试
console.log('🚀 开始调试真实文件的表头识别问题...\n');
debugRealFileHeader();
console.log('\n✅ 调试完成！');
