#!/usr/bin/env node

/**
 * 测试Worker环境中处理大文件的内存限制
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 测试Worker环境内存限制...\n');

// 创建一个HTML文件来测试Worker
const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Worker Memory Test</title>
</head>
<body>
    <h1>Worker内存测试 - 秦凯拜访.xlsx</h1>
    <button id="testBtn">开始测试</button>
    <pre id="output"></pre>
    
    <script>
        const output = document.getElementById('output');
        const log = (msg) => {
            output.textContent += msg + '\\n';
            console.log(msg);
        };
        
        document.getElementById('testBtn').addEventListener('click', async () => {
            log('开始测试...');
            
            try {
                // 获取文件
                const response = await fetch('/data/秦凯拜访.xlsx');
                const arrayBuffer = await response.arrayBuffer();
                log(\`文件大小: \${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB\`);
                
                // 创建Worker
                const worker = new Worker('/test-worker.js');
                
                worker.onmessage = (e) => {
                    if (e.data.type === 'log') {
                        log(e.data.message);
                    } else if (e.data.type === 'result') {
                        log('\\n结果: ' + JSON.stringify(e.data.result, null, 2));
                    } else if (e.data.type === 'error') {
                        log('❌ 错误: ' + e.data.error);
                    }
                };
                
                worker.onerror = (error) => {
                    log('❌ Worker错误: ' + error.message);
                };
                
                // 发送文件到Worker
                worker.postMessage({
                    type: 'TEST_FILE',
                    arrayBuffer: arrayBuffer
                }, [arrayBuffer]);
                
            } catch (error) {
                log('❌ 主线程错误: ' + error.message);
            }
        });
    </script>
</body>
</html>`;

// 创建测试Worker
const workerContent = `
importScripts('/vendor/xlsx.full.min.js');

self.onmessage = async function(e) {
    if (e.data.type === 'TEST_FILE') {
        const log = (msg) => {
            self.postMessage({ type: 'log', message: msg });
        };
        
        try {
            const arrayBuffer = e.data.arrayBuffer;
            log(\`Worker收到文件: \${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB\`);
            
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
                log(\`\\n测试: \${test.name}\`);
                try {
                    const start = Date.now();
                    const workbook = XLSX.read(arrayBuffer, test.options);
                    const elapsed = Date.now() - start;
                    
                    log(\`✅ 成功 (耗时: \${elapsed}ms)\`);
                    log(\`工作表: \${workbook.SheetNames.join(', ')}\`);
                    
                    // 尝试访问Sheet1
                    if (workbook.Sheets && workbook.Sheets['Sheet1']) {
                        const sheet = workbook.Sheets['Sheet1'];
                        const ref = sheet['!ref'];
                        if (ref) {
                            log(\`Sheet1数据范围: \${ref}\`);
                        }
                        
                        // 尝试转换数据
                        try {
                            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                            log(\`数据行数: \${data.length}\`);
                        } catch (err) {
                            log(\`转换数据失败: \${err.message}\`);
                        }
                    }
                    
                    results.push({
                        test: test.name,
                        success: true,
                        elapsed: elapsed
                    });
                } catch (error) {
                    log(\`❌ 失败: \${error.message}\`);
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
                    log(\`内存使用: \${used.toFixed(2)}MB / \${limit.toFixed(2)}MB\`);
                }
            }
            
            self.postMessage({ type: 'result', result: results });
            
        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
};
`;

// 保存测试文件
const testDir = path.join(__dirname, '../public/test');
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}

fs.writeFileSync(path.join(testDir, 'worker-memory-test.html'), htmlContent);
fs.writeFileSync(path.join(__dirname, '../public/test-worker.js'), workerContent);

console.log('✅ 测试文件已创建');
console.log('\n请执行以下步骤：');
console.log('1. 启动开发服务器: npm run dev');
console.log('2. 在Chrome浏览器中打开: http://localhost:3000/test/worker-memory-test.html');
console.log('3. 打开开发者工具Console查看详细日志');
console.log('4. 点击"开始测试"按钮');
console.log('\n注意：测试将在真实的Worker环境中运行，可以准确反映问题');