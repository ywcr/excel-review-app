const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');

async function debugDISPIMGParsing() {
  const filePath = path.resolve(__dirname, '../public/data/8月盛邦药店拜访记录(2).xlsx');
  
  console.log('🔍 调试DISPIMG公式解析问题\n');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    return;
  }
  
  try {
    const buffer = fs.readFileSync(filePath);
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(buffer);
    
    const worksheetXml = await zipContent.file('xl/worksheets/sheet1.xml')?.async('text');
    if (!worksheetXml) {
      console.log('❌ 无法读取工作表文件');
      return;
    }
    
    console.log('📄 工作表XML文件大小:', worksheetXml.length, '字符');
    console.log('📄 前500个字符:');
    console.log(worksheetXml.substring(0, 500));
    console.log('...\n');
    
    // 方法1: 直接搜索DISPIMG
    console.log('🔍 方法1: 直接搜索DISPIMG字符串');
    const directMatches = worksheetXml.match(/DISPIMG/g);
    console.log(`找到 ${directMatches ? directMatches.length : 0} 个DISPIMG字符串`);
    
    // 方法2: 搜索公式标签
    console.log('\n🔍 方法2: 搜索公式标签 <f>');
    const formulaMatches = worksheetXml.match(/<f[^>]*>.*?<\/f>/g);
    console.log(`找到 ${formulaMatches ? formulaMatches.length : 0} 个公式标签`);
    
    if (formulaMatches) {
      console.log('前5个公式:');
      formulaMatches.slice(0, 5).forEach((formula, index) => {
        console.log(`  ${index + 1}. ${formula}`);
      });
    }
    
    // 方法3: 搜索包含DISPIMG的公式
    console.log('\n🔍 方法3: 搜索包含DISPIMG的公式');
    const dispimgFormulas = formulaMatches ? formulaMatches.filter(f => f.includes('DISPIMG')) : [];
    console.log(`找到 ${dispimgFormulas.length} 个DISPIMG公式`);
    
    if (dispimgFormulas.length > 0) {
      console.log('前5个DISPIMG公式:');
      dispimgFormulas.slice(0, 5).forEach((formula, index) => {
        console.log(`  ${index + 1}. ${formula}`);
      });
    }
    
    // 方法4: 使用原始的正则表达式（来自分析脚本）
    console.log('\n🔍 方法4: 使用原始正则表达式');
    const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
    let match;
    let cellCount = 0;
    let dispimgCellCount = 0;
    
    while ((match = cellRegex.exec(worksheetXml)) !== null) {
      cellCount++;
      const cellRef = match[1];
      const cellContent = match[2];
      
      // 在单元格内容中查找DISPIMG公式
      const formulaMatch = cellContent.match(/<f[^>]*>(.*?DISPIMG.*?)<\/f>/);
      if (formulaMatch) {
        dispimgCellCount++;
        if (dispimgCellCount <= 5) {
          const formula = formulaMatch[1];
          const idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/);
          console.log(`  ${dispimgCellCount}. 位置: ${cellRef}, ID: ${idMatch?.[1] || '未找到'}`);
          console.log(`     公式: ${formula.substring(0, 80)}...`);
        }
      }
    }
    
    console.log(`\n📊 统计结果:`);
    console.log(`  总单元格数: ${cellCount}`);
    console.log(`  包含DISPIMG的单元格: ${dispimgCellCount}`);
    
    // 方法5: 检查是否有编码问题
    console.log('\n🔍 方法5: 检查编码问题');
    const hasQuot = worksheetXml.includes('&quot;');
    const hasAmp = worksheetXml.includes('&amp;');
    const hasLt = worksheetXml.includes('&lt;');
    const hasGt = worksheetXml.includes('&gt;');
    
    console.log(`  包含 &quot;: ${hasQuot}`);
    console.log(`  包含 &amp;: ${hasAmp}`);
    console.log(`  包含 &lt;: ${hasLt}`);
    console.log(`  包含 &gt;: ${hasGt}`);
    
    // 方法6: 检查特定的图片ID
    console.log('\n🔍 方法6: 检查特定图片ID');
    const targetIds = [
      'ID_8D9330E6EC914995848A93FBDFEF09E6',
      'ID_C5E0F99FE0854B708B48F6AEC3A06AC9'
    ];
    
    targetIds.forEach(id => {
      const found = worksheetXml.includes(id);
      console.log(`  ${id}: ${found ? '✅ 存在' : '❌ 不存在'}`);
      
      if (found) {
        // 查找包含此ID的上下文
        const idIndex = worksheetXml.indexOf(id);
        const context = worksheetXml.substring(Math.max(0, idIndex - 100), idIndex + 200);
        console.log(`    上下文: ...${context}...`);
      }
    });
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

debugDISPIMGParsing().catch(console.error);
