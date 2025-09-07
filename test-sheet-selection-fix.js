const fs = require('fs');
const path = require('path');

// 模拟Worker环境的测试
function testSheetSelectionLogic() {
    console.log('🧪 测试Excel Sheet选择错误处理逻辑\n');

    // 模拟Worker中的关键函数
    function findMatchingSheet(sheetNames, preferredNames) {
        if (!preferredNames || preferredNames.length === 0) {
            return null;
        }
        
        for (const preferred of preferredNames) {
            const found = sheetNames.find(
                (name) =>
                    name === preferred ||
                    name.includes(preferred) ||
                    preferred.includes(name)
            );
            if (found) return found;
        }
        return null; // No fallback to first sheet
    }

    // 模拟验证逻辑
    function simulateValidation(sheetNames, templateSheetNames, selectedSheet) {
        console.log(`📋 测试场景:`);
        console.log(`   可用工作表: [${sheetNames.join(', ')}]`);
        console.log(`   模板预设: [${templateSheetNames.join(', ')}]`);
        console.log(`   用户选择: ${selectedSheet || '未选择'}`);

        let targetSheet = selectedSheet;
        let isAutoMatched = false;
        
        if (!targetSheet || !sheetNames.includes(targetSheet)) {
            // Try to find a matching sheet based on template preferences
            const matchedSheet = findMatchingSheet(sheetNames, templateSheetNames);
            if (matchedSheet) {
                targetSheet = matchedSheet;
                isAutoMatched = true;
            }
        } else {
            // User explicitly selected a sheet
            isAutoMatched = true;
        }

        // If no sheet was auto-matched and user hasn't selected one, ask user to choose
        if (!isAutoMatched) {
            console.log(`✅ 结果: 触发sheet选择对话框`);
            console.log(`   原因: 无法自动匹配到合适的工作表`);
            return {
                needSheetSelection: true,
                availableSheets: sheetNames.map(name => ({ name, hasData: true }))
            };
        }

        // Final fallback: if still no target sheet, use first available
        if (!targetSheet) {
            targetSheet = sheetNames[0];
        }

        console.log(`✅ 结果: 继续验证流程`);
        console.log(`   选择的工作表: ${targetSheet}`);
        console.log(`   自动匹配: ${isAutoMatched ? '是' : '否'}`);
        
        return {
            needSheetSelection: false,
            selectedSheet: targetSheet,
            isAutoMatched
        };
    }

    // 测试用例1：无匹配的工作表名称
    console.log('🔍 测试用例1: 无匹配的工作表名称');
    const result1 = simulateValidation(
        ['Sheet1', '数据表', '空表'],
        ['医院拜访数据', '拜访记录', '医院数据'],
        undefined
    );
    console.log(`   期望: 触发sheet选择对话框`);
    console.log(`   实际: ${result1.needSheetSelection ? '触发sheet选择对话框' : '继续验证流程'}`);
    console.log(`   测试结果: ${result1.needSheetSelection ? '✅ 通过' : '❌ 失败'}\n`);

    // 测试用例2：有匹配的工作表名称
    console.log('🔍 测试用例2: 有匹配的工作表名称');
    const result2 = simulateValidation(
        ['医院拜访数据', '备注'],
        ['医院拜访数据', '拜访记录', '医院数据'],
        undefined
    );
    console.log(`   期望: 自动选择匹配的工作表`);
    console.log(`   实际: ${result2.needSheetSelection ? '触发sheet选择对话框' : `自动选择 ${result2.selectedSheet}`}`);
    console.log(`   测试结果: ${!result2.needSheetSelection && result2.selectedSheet === '医院拜访数据' ? '✅ 通过' : '❌ 失败'}\n`);

    // 测试用例3：用户明确选择工作表
    console.log('🔍 测试用例3: 用户明确选择工作表');
    const result3 = simulateValidation(
        ['Sheet1', '数据表', '空表'],
        ['医院拜访数据', '拜访记录', '医院数据'],
        '数据表'
    );
    console.log(`   期望: 使用用户选择的工作表`);
    console.log(`   实际: ${result3.needSheetSelection ? '触发sheet选择对话框' : `使用 ${result3.selectedSheet}`}`);
    console.log(`   测试结果: ${!result3.needSheetSelection && result3.selectedSheet === '数据表' ? '✅ 通过' : '❌ 失败'}\n`);

    // 测试用例4：部分匹配的工作表名称
    console.log('🔍 测试用例4: 部分匹配的工作表名称');
    const result4 = simulateValidation(
        ['拜访记录2024', '其他数据'],
        ['医院拜访数据', '拜访记录', '医院数据'],
        undefined
    );
    console.log(`   期望: 自动选择部分匹配的工作表`);
    console.log(`   实际: ${result4.needSheetSelection ? '触发sheet选择对话框' : `自动选择 ${result4.selectedSheet}`}`);
    console.log(`   测试结果: ${!result4.needSheetSelection && result4.selectedSheet === '拜访记录2024' ? '✅ 通过' : '❌ 失败'}\n`);

    // 测试用例5：空的模板预设
    console.log('🔍 测试用例5: 空的模板预设');
    const result5 = simulateValidation(
        ['Sheet1', '数据表'],
        [],
        undefined
    );
    console.log(`   期望: 触发sheet选择对话框`);
    console.log(`   实际: ${result5.needSheetSelection ? '触发sheet选择对话框' : '继续验证流程'}`);
    console.log(`   测试结果: ${result5.needSheetSelection ? '✅ 通过' : '❌ 失败'}\n`);

    console.log('📊 测试总结:');
    const testResults = [result1, result2, result3, result4, result5];
    const expectedResults = [true, false, false, false, true]; // needSheetSelection的期望值
    
    let passedTests = 0;
    testResults.forEach((result, index) => {
        const passed = result.needSheetSelection === expectedResults[index];
        if (passed) passedTests++;
        console.log(`   测试用例${index + 1}: ${passed ? '✅ 通过' : '❌ 失败'}`);
    });
    
    console.log(`\n🎯 总体结果: ${passedTests}/${testResults.length} 个测试通过`);
    
    if (passedTests === testResults.length) {
        console.log('🎉 所有测试通过！Sheet选择错误处理逻辑修复成功。');
    } else {
        console.log('⚠️  部分测试失败，需要进一步检查修复逻辑。');
    }
}

// 运行测试
if (require.main === module) {
    testSheetSelectionLogic();
}

module.exports = { testSheetSelectionLogic };
