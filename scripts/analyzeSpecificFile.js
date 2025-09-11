const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');

async function analyzeExcelFile() {
  const filePath = path.resolve(__dirname, '../public/data/8月盛邦药店拜访记录(11111111).xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error('文件不存在:', filePath);
    return;
  }

  console.log('📁 分析文件:', filePath);
  
  try {
    const buffer = fs.readFileSync(filePath);
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(buffer);
    
    console.log('\n📋 Excel文件结构:');
    Object.keys(zipContent.files).forEach(fileName => {
      if (!zipContent.files[fileName].dir) {
        console.log(`  ${fileName}`);
      }
    });
    
    // 1. 分析工作表信息
    console.log('\n📊 工作表信息:');
    const workbookXml = await zipContent.file('xl/workbook.xml')?.async('text');
    if (workbookXml) {
      const sheetMatches = workbookXml.match(/<sheet[^>]*name="([^"]*)"[^>]*sheetId="([^"]*)"[^>]*r:id="([^"]*)"/g);
      if (sheetMatches) {
        sheetMatches.forEach(match => {
          const nameMatch = match.match(/name="([^"]*)"/);
          const idMatch = match.match(/sheetId="([^"]*)"/);
          const ridMatch = match.match(/r:id="([^"]*)"/);
          console.log(`  工作表: ${nameMatch?.[1]} (ID: ${idMatch?.[1]}, rId: ${ridMatch?.[1]})`);
        });
      }
    }
    
    // 2. 分析媒体文件
    console.log('\n🖼️ 媒体文件:');
    const mediaFiles = Object.keys(zipContent.files).filter(name => name.startsWith('xl/media/'));
    mediaFiles.forEach(fileName => {
      const file = zipContent.files[fileName];
      console.log(`  ${fileName} (${file._data?.compressedSize || 'unknown'} bytes)`);
    });
    
    // 3. 分析cellimages.xml（WPS特有）
    console.log('\n📱 WPS cellimages.xml 分析:');
    const cellimagesXml = await zipContent.file('xl/cellimages.xml')?.async('text');
    if (cellimagesXml) {
      console.log('  ✅ 找到 cellimages.xml');
      
      // 提取图片ID
      const imageIdMatches = cellimagesXml.match(/name="([^"]*ID_[^"]*)"/g);
      if (imageIdMatches) {
        console.log('  📋 图片ID列表:');
        imageIdMatches.forEach(match => {
          const id = match.match(/name="([^"]*)"/)?.[1];
          console.log(`    ${id}`);
        });
      }
      
      // 分析关系文件
      const cellimagesRels = await zipContent.file('xl/_rels/cellimages.xml.rels')?.async('text');
      if (cellimagesRels) {
        console.log('  📎 关系映射:');
        const relMatches = cellimagesRels.match(/<Relationship[^>]*Id="([^"]*)"[^>]*Target="([^"]*)"/g);
        if (relMatches) {
          relMatches.forEach(match => {
            const idMatch = match.match(/Id="([^"]*)"/);
            const targetMatch = match.match(/Target="([^"]*)"/);
            console.log(`    ${idMatch?.[1]} -> ${targetMatch?.[1]}`);
          });
        }
      }
    } else {
      console.log('  ❌ 未找到 cellimages.xml');
    }
    
    // 4. 分析目标工作表的DISPIMG公式
    console.log('\n🔍 分析"药店拜访"工作表的DISPIMG公式:');
    
    // 找到对应的工作表文件
    const worksheetFiles = Object.keys(zipContent.files).filter(name => 
      name.startsWith('xl/worksheets/') && name.endsWith('.xml')
    );
    
    for (const worksheetFile of worksheetFiles) {
      const worksheetXml = await zipContent.file(worksheetFile)?.async('text');
      if (!worksheetXml) continue;
      
      console.log(`\n  📄 检查工作表文件: ${worksheetFile}`);
      
      // 查找DISPIMG公式
      const dispimgMatches = worksheetXml.match(/<f[^>]*>.*?DISPIMG.*?<\/f>/g);
      if (dispimgMatches && dispimgMatches.length > 0) {
        console.log(`    ✅ 找到 ${dispimgMatches.length} 个DISPIMG公式:`);
        
        dispimgMatches.forEach((formula, index) => {
          // 提取图片ID
          const idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/);
          if (idMatch) {
            console.log(`      ${index + 1}. ID: ${idMatch[1]}`);
            
            // 查找包含此公式的单元格
            const cellRegex = new RegExp(`<c[^>]*r="([^"]*)"[^>]*>[\\s\\S]*?${formula.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?</c>`, 'g');
            const cellMatch = cellRegex.exec(worksheetXml);
            if (cellMatch) {
              console.log(`         位置: ${cellMatch[1]}`);
            }
          }
        });
      } else {
        console.log(`    ❌ 未找到DISPIMG公式`);
      }
    }
    
    // 5. 检查特定的图片ID
    console.log('\n🎯 检查特定图片ID的位置:');
    const targetIds = [
      'ID_8D9330E6EC914995848A93FBDFEF09E6',
      'ID_C5E0F99FE0854B708B48F6AEC3A06AC9'
    ];
    
    for (const targetId of targetIds) {
      console.log(`\n  🔍 查找图片ID: ${targetId}`);
      let found = false;
      
      for (const worksheetFile of worksheetFiles) {
        const worksheetXml = await zipContent.file(worksheetFile)?.async('text');
        if (!worksheetXml) continue;
        
        // 查找包含目标ID的DISPIMG公式
        const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
        let match;
        
        while ((match = cellRegex.exec(worksheetXml)) !== null) {
          const cellRef = match[1];
          const cellContent = match[2];
          
          const formulaMatch = cellContent.match(/<f[^>]*>(.*?DISPIMG.*?)<\/f>/);
          if (formulaMatch) {
            const formula = formulaMatch[1];
            const idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/);
            
            if (idMatch && idMatch[1] === targetId) {
              console.log(`    ✅ 在 ${worksheetFile} 的 ${cellRef} 位置找到`);
              found = true;
            }
          }
        }
      }
      
      if (!found) {
        console.log(`    ❌ 未找到此图片ID`);
      }
    }
    
  } catch (error) {
    console.error('分析失败:', error);
  }
}

analyzeExcelFile().catch(console.error);
