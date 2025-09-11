const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');

async function compareExcelFiles() {
  const file1Path = path.resolve(__dirname, '../public/data/8月盛邦药店拜访记录(2).xlsx');
  const file2Path = path.resolve(__dirname, '../public/data/8月盛邦药店拜访记录(11111111).xlsx');
  
  console.log('📊 对比两个Excel文件的结构差异\n');
  
  const files = [
    { path: file1Path, name: '8月盛邦药店拜访记录(2).xlsx' },
    { path: file2Path, name: '8月盛邦药店拜访记录(11111111).xlsx' }
  ];
  
  const fileAnalysis = [];
  
  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.error(`❌ 文件不存在: ${file.path}`);
      continue;
    }
    
    console.log(`\n🔍 分析文件: ${file.name}`);
    console.log('='.repeat(50));
    
    try {
      const buffer = fs.readFileSync(file.path);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(buffer);
      
      const analysis = {
        fileName: file.name,
        structure: {},
        workbooks: [],
        worksheets: [],
        media: [],
        cellimages: null,
        dispimgFormulas: [],
        relationships: {}
      };
      
      // 1. 分析文件结构
      console.log('\n📁 文件结构:');
      const allFiles = Object.keys(zipContent.files).filter(name => !zipContent.files[name].dir);
      allFiles.forEach(fileName => {
        console.log(`  ${fileName}`);
        if (fileName.includes('cellimages')) analysis.structure.hasCellImages = true;
        if (fileName.includes('drawing')) analysis.structure.hasDrawings = true;
        if (fileName.includes('media/')) analysis.media.push(fileName);
      });
      
      // 2. 分析工作表信息
      console.log('\n📊 工作表信息:');
      const workbookXml = await zipContent.file('xl/workbook.xml')?.async('text');
      if (workbookXml) {
        const sheetMatches = workbookXml.match(/<sheet[^>]*name="([^"]*)"[^>]*sheetId="([^"]*)"[^>]*r:id="([^"]*)"/g);
        if (sheetMatches) {
          sheetMatches.forEach(match => {
            const nameMatch = match.match(/name="([^"]*)"/);
            const idMatch = match.match(/sheetId="([^"]*)"/);
            const ridMatch = match.match(/r:id="([^"]*)"/);
            const sheetInfo = {
              name: nameMatch?.[1],
              sheetId: idMatch?.[1],
              rId: ridMatch?.[1]
            };
            analysis.workbooks.push(sheetInfo);
            console.log(`  工作表: ${sheetInfo.name} (sheetId: ${sheetInfo.sheetId}, rId: ${sheetInfo.rId})`);
          });
        }
      }
      
      // 3. 分析媒体文件
      console.log(`\n🖼️ 媒体文件 (${analysis.media.length}个):`);
      analysis.media.forEach((fileName, index) => {
        if (index < 5) { // 只显示前5个
          const file = zipContent.files[fileName];
          console.log(`  ${fileName} (${file._data?.compressedSize || 'unknown'} bytes)`);
        }
      });
      if (analysis.media.length > 5) {
        console.log(`  ... 还有 ${analysis.media.length - 5} 个文件`);
      }
      
      // 4. 分析cellimages.xml（WPS特有）
      console.log('\n📱 WPS cellimages.xml 分析:');
      const cellimagesXml = await zipContent.file('xl/cellimages.xml')?.async('text');
      if (cellimagesXml) {
        console.log('  ✅ 找到 cellimages.xml');
        
        // 统计图片ID数量
        const imageIdMatches = cellimagesXml.match(/name="([^"]*ID_[^"]*)"/g);
        analysis.cellimages = {
          exists: true,
          imageCount: imageIdMatches ? imageIdMatches.length : 0,
          imageIds: imageIdMatches ? imageIdMatches.slice(0, 3).map(m => m.match(/name="([^"]*)"/)?.[1]) : []
        };
        
        console.log(`  📋 图片ID数量: ${analysis.cellimages.imageCount}`);
        console.log('  📋 前3个图片ID:');
        analysis.cellimages.imageIds.forEach(id => {
          console.log(`    ${id}`);
        });
        
        // 分析关系文件
        const cellimagesRels = await zipContent.file('xl/_rels/cellimages.xml.rels')?.async('text');
        if (cellimagesRels) {
          const relMatches = cellimagesRels.match(/<Relationship[^>]*Id="([^"]*)"[^>]*Target="([^"]*)"/g);
          analysis.relationships.cellimages = relMatches ? relMatches.length : 0;
          console.log(`  📎 关系映射数量: ${analysis.relationships.cellimages}`);
        }
      } else {
        console.log('  ❌ 未找到 cellimages.xml');
        analysis.cellimages = { exists: false };
      }
      
      // 5. 分析DISPIMG公式
      console.log('\n🔍 DISPIMG公式分析:');
      const worksheetFiles = Object.keys(zipContent.files).filter(name => 
        name.startsWith('xl/worksheets/') && name.endsWith('.xml')
      );
      
      let totalDispimgCount = 0;
      for (const worksheetFile of worksheetFiles) {
        const worksheetXml = await zipContent.file(worksheetFile)?.async('text');
        if (!worksheetXml) continue;
        
        const dispimgMatches = worksheetXml.match(/<f[^>]*>.*?DISPIMG.*?<\/f>/g);
        if (dispimgMatches && dispimgMatches.length > 0) {
          totalDispimgCount += dispimgMatches.length;
          console.log(`  📄 ${worksheetFile}: ${dispimgMatches.length} 个DISPIMG公式`);
          
          // 分析前3个公式的位置
          dispimgMatches.slice(0, 3).forEach((formula, index) => {
            const idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/);
            if (idMatch) {
              // 查找包含此公式的单元格
              const cellRegex = new RegExp(`<c[^>]*r="([^"]*)"[^>]*>[\\s\\S]*?${formula.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?</c>`, 'g');
              const cellMatch = cellRegex.exec(worksheetXml);
              const position = cellMatch ? cellMatch[1] : '未知位置';
              console.log(`    ${index + 1}. ID: ${idMatch[1]} -> 位置: ${position}`);
            }
          });
        }
      }
      
      analysis.dispimgFormulas = { total: totalDispimgCount };
      console.log(`  📊 总DISPIMG公式数量: ${totalDispimgCount}`);
      
      // 6. 分析workbook关系文件
      console.log('\n🔗 工作表关系映射:');
      const workbookRels = await zipContent.file('xl/_rels/workbook.xml.rels')?.async('text');
      if (workbookRels) {
        analysis.workbooks.forEach(sheet => {
          const relRegex = new RegExp(`<Relationship[^>]*Id="${sheet.rId}"[^>]*Target="([^"]*)"`, 'g');
          const relMatch = relRegex.exec(workbookRels);
          if (relMatch) {
            const actualFile = relMatch[1];
            console.log(`  ${sheet.name} (${sheet.rId}) -> ${actualFile}`);
            sheet.actualFile = actualFile;
          }
        });
      }
      
      fileAnalysis.push(analysis);
      
    } catch (error) {
      console.error(`❌ 分析文件失败: ${file.name}`, error.message);
    }
  }
  
  // 7. 对比分析
  console.log('\n\n🔄 对比分析');
  console.log('='.repeat(60));
  
  if (fileAnalysis.length === 2) {
    const [file1, file2] = fileAnalysis;
    
    console.log('\n📊 基本信息对比:');
    console.log(`文件1 (${file1.fileName}):`);
    console.log(`  媒体文件: ${file1.media.length}个`);
    console.log(`  cellimages.xml: ${file1.cellimages?.exists ? '✅存在' : '❌不存在'}`);
    console.log(`  DISPIMG公式: ${file1.dispimgFormulas?.total || 0}个`);
    
    console.log(`\n文件2 (${file2.fileName}):`);
    console.log(`  媒体文件: ${file2.media.length}个`);
    console.log(`  cellimages.xml: ${file2.cellimages?.exists ? '✅存在' : '❌不存在'}`);
    console.log(`  DISPIMG公式: ${file2.dispimgFormulas?.total || 0}个`);
    
    console.log('\n🎯 关键差异:');
    
    // cellimages.xml差异
    if (file1.cellimages?.exists !== file2.cellimages?.exists) {
      console.log(`❗ cellimages.xml存在性不同:`);
      console.log(`  ${file1.fileName}: ${file1.cellimages?.exists ? '存在' : '不存在'}`);
      console.log(`  ${file2.fileName}: ${file2.cellimages?.exists ? '存在' : '不存在'}`);
    }
    
    // 图片数量差异
    const img1Count = file1.cellimages?.imageCount || 0;
    const img2Count = file2.cellimages?.imageCount || 0;
    if (img1Count !== img2Count) {
      console.log(`❗ 图片ID数量不同:`);
      console.log(`  ${file1.fileName}: ${img1Count}个`);
      console.log(`  ${file2.fileName}: ${img2Count}个`);
    }
    
    // DISPIMG公式数量差异
    const formula1Count = file1.dispimgFormulas?.total || 0;
    const formula2Count = file2.dispimgFormulas?.total || 0;
    if (formula1Count !== formula2Count) {
      console.log(`❗ DISPIMG公式数量不同:`);
      console.log(`  ${file1.fileName}: ${formula1Count}个`);
      console.log(`  ${file2.fileName}: ${formula2Count}个`);
    }
    
    console.log('\n💡 位置映射失败可能原因:');
    if (!file1.cellimages?.exists && file2.cellimages?.exists) {
      console.log(`❌ ${file1.fileName} 缺少 cellimages.xml 文件`);
      console.log('   这是WPS Excel的特有文件，用于图片位置映射');
    }
    
    if (formula1Count === 0 && formula2Count > 0) {
      console.log(`❌ ${file1.fileName} 缺少 DISPIMG 公式`);
      console.log('   DISPIMG公式是图片位置映射的关键');
    }
    
    if (file1.media.length !== file2.media.length) {
      console.log(`❗ 媒体文件数量不同，可能影响图片提取`);
    }
  }
  
  console.log('\n✅ 分析完成！');
}

compareExcelFiles().catch(console.error);
