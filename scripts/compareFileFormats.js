const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');

async function compareFileFormats() {
  const file1Path = path.resolve(__dirname, '../public/data/8月盛邦药店拜访记录(2).xlsx');
  const file2Path = path.resolve(__dirname, '../public/data/8月盛邦药店拜访记录(11111111).xlsx');
  
  console.log('🔍 对比Excel文件格式差异\n');
  
  const files = [
    { path: file1Path, name: '原始文件(2)', shortName: 'original' },
    { path: file2Path, name: 'WPS保存文件(11111111)', shortName: 'wps' }
  ];
  
  const fileData = {};
  
  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.error(`❌ 文件不存在: ${file.path}`);
      continue;
    }
    
    console.log(`\n📄 分析文件: ${file.name}`);
    console.log('='.repeat(60));
    
    try {
      const buffer = fs.readFileSync(file.path);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(buffer);
      
      const worksheetXml = await zipContent.file('xl/worksheets/sheet1.xml')?.async('text');
      if (!worksheetXml) {
        console.log('❌ 无法读取工作表文件');
        continue;
      }
      
      // 分析XML结构
      const analysis = {
        xmlSize: worksheetXml.length,
        rootElement: null,
        namespaces: [],
        cellCount: 0,
        formulaCells: 0,
        dispimgCells: 0,
        sampleCells: [],
        xmlHeader: worksheetXml.substring(0, 500),
        dispimgSamples: []
      };
      
      // 提取根元素和命名空间
      const rootMatch = worksheetXml.match(/<worksheet[^>]*>/);
      if (rootMatch) {
        analysis.rootElement = rootMatch[0];
        
        // 提取命名空间
        const nsMatches = analysis.rootElement.match(/xmlns[^=]*="[^"]*"/g);
        if (nsMatches) {
          analysis.namespaces = nsMatches;
        }
      }
      
      // 分析单元格结构
      const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
      let match;
      
      while ((match = cellRegex.exec(worksheetXml)) !== null) {
        analysis.cellCount++;
        const cellRef = match[1];
        const cellContent = match[2];
        
        // 检查是否包含公式
        if (cellContent.includes('<f>')) {
          analysis.formulaCells++;
          
          // 检查是否是DISPIMG公式
          if (cellContent.includes('DISPIMG')) {
            analysis.dispimgCells++;
            
            // 保存前几个DISPIMG单元格的详细信息
            if (analysis.dispimgSamples.length < 3) {
              analysis.dispimgSamples.push({
                cellRef: cellRef,
                cellContent: cellContent.substring(0, 200) + '...'
              });
            }
          }
        }
        
        // 保存前几个单元格的样本
        if (analysis.sampleCells.length < 5) {
          analysis.sampleCells.push({
            cellRef: cellRef,
            hasFormula: cellContent.includes('<f>'),
            hasDispimg: cellContent.includes('DISPIMG'),
            content: cellContent.substring(0, 100) + '...'
          });
        }
      }
      
      fileData[file.shortName] = analysis;
      
      // 输出分析结果
      console.log(`📊 XML大小: ${analysis.xmlSize} 字符`);
      console.log(`📊 单元格总数: ${analysis.cellCount}`);
      console.log(`📊 公式单元格: ${analysis.formulaCells}`);
      console.log(`📊 DISPIMG单元格: ${analysis.dispimgCells}`);
      
      console.log('\n🏷️ 命名空间:');
      analysis.namespaces.forEach((ns, index) => {
        console.log(`  ${index + 1}. ${ns}`);
      });
      
      console.log('\n📋 前3个DISPIMG单元格:');
      analysis.dispimgSamples.forEach((sample, index) => {
        console.log(`  ${index + 1}. ${sample.cellRef}:`);
        console.log(`     ${sample.cellContent}`);
      });
      
    } catch (error) {
      console.error(`❌ 分析失败: ${file.name}`, error.message);
    }
  }
  
  // 对比分析
  if (fileData.original && fileData.wps) {
    console.log('\n\n🔄 格式差异对比');
    console.log('='.repeat(60));
    
    const orig = fileData.original;
    const wps = fileData.wps;
    
    console.log('\n📊 基本统计对比:');
    console.log(`XML大小: 原始=${orig.xmlSize}, WPS=${wps.xmlSize}, 差异=${wps.xmlSize - orig.xmlSize}`);
    console.log(`单元格数: 原始=${orig.cellCount}, WPS=${wps.cellCount}, 差异=${wps.cellCount - orig.cellCount}`);
    console.log(`公式单元格: 原始=${orig.formulaCells}, WPS=${wps.formulaCells}, 差异=${wps.formulaCells - orig.formulaCells}`);
    console.log(`DISPIMG单元格: 原始=${orig.dispimgCells}, WPS=${wps.dispimgCells}, 差异=${wps.dispimgCells - orig.dispimgCells}`);
    
    console.log('\n🏷️ 命名空间差异:');
    const origNs = new Set(orig.namespaces);
    const wpsNs = new Set(wps.namespaces);
    
    console.log('原始文件独有的命名空间:');
    orig.namespaces.forEach(ns => {
      if (!wpsNs.has(ns)) {
        console.log(`  - ${ns}`);
      }
    });
    
    console.log('WPS文件独有的命名空间:');
    wps.namespaces.forEach(ns => {
      if (!origNs.has(ns)) {
        console.log(`  + ${ns}`);
      }
    });
    
    console.log('\n📋 根元素对比:');
    console.log('原始文件根元素:');
    console.log(`  ${orig.rootElement}`);
    console.log('WPS文件根元素:');
    console.log(`  ${wps.rootElement}`);
    
    console.log('\n🔍 DISPIMG格式对比:');
    if (orig.dispimgSamples.length > 0 && wps.dispimgSamples.length > 0) {
      console.log('原始文件DISPIMG格式:');
      console.log(`  ${orig.dispimgSamples[0].cellContent}`);
      console.log('WPS文件DISPIMG格式:');
      console.log(`  ${wps.dispimgSamples[0].cellContent}`);
    } else {
      console.log('⚠️ 其中一个文件没有DISPIMG公式样本');
    }
    
    console.log('\n🎯 关键发现:');
    if (orig.dispimgCells === 0 && wps.dispimgCells > 0) {
      console.log('❌ 原始文件没有DISPIMG公式，WPS文件有DISPIMG公式');
      console.log('   这说明原始文件可能使用了不同的图片存储格式');
    } else if (orig.dispimgCells > 0 && wps.dispimgCells === 0) {
      console.log('❌ WPS文件没有DISPIMG公式，原始文件有DISPIMG公式');
      console.log('   这说明WPS保存时可能改变了图片存储格式');
    } else if (orig.dispimgCells === wps.dispimgCells && orig.dispimgCells > 0) {
      console.log('✅ 两个文件都有相同数量的DISPIMG公式');
      console.log('   问题可能在于格式细节差异');
    } else {
      console.log('⚠️ 两个文件的DISPIMG公式数量不同');
      console.log('   需要进一步分析格式差异');
    }
  }
  
  console.log('\n✅ 格式对比完成！');
}

compareFileFormats().catch(console.error);
