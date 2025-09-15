
importScripts('/vendor/xlsx.full.min.js');

self.onmessage = async function(e) {
    if (e.data.type === 'TEST_FILE') {
        const log = (msg) => {
            self.postMessage({ type: 'log', message: msg });
        };
        
        try {
            const arrayBuffer = e.data.arrayBuffer;
            log(`Worker收到文件: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
            
            // 测试不同的读取选项
            const tests = [
                {
                    name: '只读工作表名',
                    options: { type: 'array', bookSheets: true }
                },
                {
                    name: '完整读取',
                    options: { type: 'array' }
                },
                {
                    name: '优化读取',
                    options: { 
                        type: 'array',
                        cellStyles: false,
                        cellNF: false,
                        cellText: false,
                        dense: false,
                        sheetStubs: false
                    }
                },
                {
                    name: '指定Sheet1',
                    options: {
                        type: 'array',
                        sheets: ['Sheet1'],
                        cellStyles: false
                    }
                }
            ];
            
            const results = [];
            
            for (const test of tests) {
                log(`\n测试: ${test.name}`);
                try {
                    const start = Date.now();
                    const workbook = XLSX.read(arrayBuffer, test.options);
                    const elapsed = Date.now() - start;
                    
                    log(`✅ 成功 (耗时: ${elapsed}ms)`);
                    log(`工作表: ${workbook.SheetNames.join(', ')}`);
                    
                    // 尝试访问Sheet1
                    if (workbook.Sheets && workbook.Sheets['Sheet1']) {
                        const sheet = workbook.Sheets['Sheet1'];
                        const ref = sheet['!ref'];
                        if (ref) {
                            log(`Sheet1数据范围: ${ref}`);
                        }
                        
                        // 尝试转换数据
                        try {
                            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                            log(`数据行数: ${data.length}`);
                        } catch (err) {
                            log(`转换数据失败: ${err.message}`);
                        }
                    }
                    
                    results.push({
                        test: test.name,
                        success: true,
                        elapsed: elapsed
                    });
                } catch (error) {
                    log(`❌ 失败: ${error.message}`);
                    results.push({
                        test: test.name,
                        success: false,
                        error: error.message
                    });
                }
                
                // 检查内存
                if (performance && performance.memory) {
                    const used = performance.memory.usedJSHeapSize / 1024 / 1024;
                    const limit = performance.memory.jsHeapSizeLimit / 1024 / 1024;
                    log(`内存使用: ${used.toFixed(2)}MB / ${limit.toFixed(2)}MB`);
                }
            }
            
            self.postMessage({ type: 'result', result: results });
            
        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
};
