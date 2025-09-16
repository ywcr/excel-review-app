const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function analyzeExcelFile(filePath) {
    console.log(`\n=== 分析文件: ${filePath} ===`);
    
    try {
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            console.error(`文件不存在: ${filePath}`);
            return;
        }
        
        // 获取文件大小
        const stats = fs.statSync(filePath);
        console.log(`文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // 读取文件
        const fileBuffer = fs.readFileSync(filePath);
        console.log(`读取到 ${fileBuffer.length} 字节`);
        
        // 测试1: 最简单的解析
        console.log('\n--- 测试1: 最简单解析 ---');
        try {
            const simpleWorkbook = XLSX.read(fileBuffer, {
                type: "buffer"
            });
            console.log('✅ 简单解析成功');
            console.log('工作表名称:', simpleWorkbook.SheetNames);
            console.log('Sheets对象存在:', !!simpleWorkbook.Sheets);
            console.log('可用工作表:', Object.keys(simpleWorkbook.Sheets || {}));
            
            // 检查第一个工作表
            if (simpleWorkbook.SheetNames.length > 0) {
                const firstSheetName = simpleWorkbook.SheetNames[0];
                const firstSheet = simpleWorkbook.Sheets[firstSheetName];
                console.log(`第一个工作表 "${firstSheetName}":`, !!firstSheet);
                if (firstSheet) {
                    console.log('工作表范围:', firstSheet['!ref'] || '无范围');
                    
                    // 尝试转换为JSON
                    try {
                        const data = XLSX.utils.sheet_to_json(firstSheet, {
                            header: 1,
                            defval: "",
                            raw: false
                        });
                        console.log(`数据行数: ${data.length}`);
                        if (data.length > 0) {
                            console.log('第一行数据:', data[0]?.slice(0, 5) || []);
                        }
                    } catch (jsonError) {
                        console.error('转换JSON失败:', jsonError.message);
                    }
                }
            }
        } catch (simpleError) {
            console.error('❌ 简单解析失败:', simpleError.message);
        }
        
        // 测试2: Worker中使用的解析选项
        console.log('\n--- 测试2: Worker解析选项 ---');
        try {
            const workerWorkbook = XLSX.read(fileBuffer, {
                type: "buffer",
                cellDates: true,
                cellNF: false,
                cellText: false,
                dense: false,
                sheetStubs: false,
                bookVBA: false,
                bookSheets: false,
                bookProps: false,
                bookFiles: false,
                bookDeps: false,
                raw: false
            });
            console.log('✅ Worker选项解析成功');
            console.log('工作表名称:', workerWorkbook.SheetNames);
            console.log('Sheets对象存在:', !!workerWorkbook.Sheets);
            console.log('可用工作表:', Object.keys(workerWorkbook.Sheets || {}));
            
            // 检查第一个工作表
            if (workerWorkbook.SheetNames.length > 0) {
                const firstSheetName = workerWorkbook.SheetNames[0];
                const firstSheet = workerWorkbook.Sheets[firstSheetName];
                console.log(`第一个工作表 "${firstSheetName}":`, !!firstSheet);
                if (firstSheet) {
                    console.log('工作表范围:', firstSheet['!ref'] || '无范围');
                }
            }
        } catch (workerError) {
            console.error('❌ Worker选项解析失败:', workerError.message);
        }
        
        // 测试3: 只解析工作表名称
        console.log('\n--- 测试3: 只解析工作表名称 ---');
        try {
            const sheetOnlyWorkbook = XLSX.read(fileBuffer, {
                type: "buffer",
                bookSheets: true,
                bookVBA: false,
                bookProps: false,
                bookFiles: false,
                bookDeps: false
            });
            console.log('✅ 工作表名称解析成功');
            console.log('工作表名称:', sheetOnlyWorkbook.SheetNames);
            console.log('Sheets对象存在:', !!sheetOnlyWorkbook.Sheets);
            console.log('可用工作表:', Object.keys(sheetOnlyWorkbook.Sheets || {}));
        } catch (sheetError) {
            console.error('❌ 工作表名称解析失败:', sheetError.message);
        }
        
        // 测试4: 检查文件格式
        console.log('\n--- 测试4: 文件格式检查 ---');
        const header = fileBuffer.slice(0, 8);
        console.log('文件头:', Array.from(header).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        
        // 检查是否是ZIP格式（.xlsx）
        const isZip = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04;
        console.log('是否为ZIP格式(.xlsx):', isZip);
        
        // 检查是否是OLE格式（.xls）
        const isOLE = header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0;
        console.log('是否为OLE格式(.xls):', isOLE);
        
    } catch (error) {
        console.error('分析文件时出错:', error.message);
    }
}

// 分析两个文件
const file1 = path.join(__dirname, 'public/data/秦凯拜访.xlsx');
const file2 = path.join(__dirname, 'public/data/8月盛邦药店拜访记录(11111111).xlsx');

analyzeExcelFile(file1);
analyzeExcelFile(file2);

console.log('\n=== 分析完成 ===');
