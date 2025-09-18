// ==================== 验证管理器 ====================

/**
 * 验证管理器类
 * 负责生成数据验证相关的代码
 */
class ValidationManager {
    constructor() {}

    /**
     * 获取验证功能代码
     */
    getValidationCode() {
        return `
// ==================== 数据验证功能 ====================

let validationResults = null;
let missingData = [];

/**
 * 验证数据完整性
 * 检查所有数据是否已成功创建
 */
async function validateData() {
    console.log('%c🔍 开始验证数据...', 'color: #17a2b8; font-weight: bold;');
    
    const projectId = getProjectIdFromUrl();
    if (!projectId) {
        console.error('❌ 无法获取项目ID');
        return false;
    }
    
    // 获取已创建的问卷列表
    const createdList = await getCreatedQuestionnaires(projectId, date);
    const createdNames = new Set(createdList.map(item => item.name));
    
    // 检查缺失的数据
    missingData = data.filter(item => !createdNames.has(item.name));
    
    validationResults = {
        total: data.length,
        created: createdNames.size,
        missing: missingData.length,
        missingList: missingData,
        createdList: Array.from(createdNames)
    };
    
    // 输出验证结果
    console.log('%c📊 验证结果:', 'color: #28a745; font-weight: bold;');
    console.log('总数据量:', validationResults.total);
    console.log('已创建:', validationResults.created);
    console.log('缺失:', validationResults.missing);
    
    if (missingData.length > 0) {
        console.log('%c⚠️ 发现缺失数据:', 'color: #ffc107; font-weight: bold;');
        console.table(missingData.map(item => ({
            姓名: item.name,
            性别: item.sex,
            时间: item.time
        })));
        console.log('💡 提示: 执行 showMissing() 查看详细信息');
        console.log('💡 提示: 执行 updateWithMissing() 自动补充缺失数据');
    } else {
        console.log('%c✅ 所有数据已成功创建！', 'color: #28a745; font-weight: bold;');
    }
    
    return validationResults;
}

/**
 * 获取已创建的问卷列表
 */
async function getCreatedQuestionnaires(projectId, targetDate) {
    try {
        // 构建查询参数
        const params = new URLSearchParams({
            projectId: projectId,
            date: targetDate.replace(/\\./g, '-'),
            pageSize: 1000
        });
        
        const response = await fetch(\`\${API_BASE_URL}/lgb/project/submitList?\${params}\`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        
        const result = await response.json();
        if (result.code === 0 || result.code === 200) {
            return result.data || [];
        }
        
        return [];
    } catch (error) {
        console.error('获取已创建列表失败:', error);
        return [];
    }
}

/**
 * 显示缺失的数据
 */
function showMissing() {
    if (!validationResults) {
        console.log('请先执行 validateData() 进行验证');
        return;
    }
    
    if (missingData.length === 0) {
        console.log('%c✅ 没有缺失的数据', 'color: #28a745; font-weight: bold;');
        return;
    }
    
    console.log('%c📋 缺失数据详情:', 'color: #dc3545; font-weight: bold;');
    console.table(missingData);
    
    // 生成JSON格式输出
    const jsonOutput = JSON.stringify(missingData, null, 2);
    console.log('%cJSON格式:', 'color: #6f42c1; font-weight: bold;');
    console.log(jsonOutput);
    
    // 提供复制功能
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(jsonOutput).then(() => {
            console.log('%c✅ JSON已复制到剪贴板', 'color: #28a745;');
        });
    }
    
    return missingData;
}

/**
 * 使用缺失的数据更新当前数据集
 */
async function updateWithMissing(newData = null) {
    if (!validationResults && !newData) {
        console.log('请先执行 validateData() 进行验证，或提供新数据');
        return;
    }
    
    const dataToProcess = newData || missingData;
    
    if (dataToProcess.length === 0) {
        console.log('%c✅ 没有需要更新的数据', 'color: #28a745; font-weight: bold;');
        return;
    }
    
    console.log(\`%c🔄 开始处理 \${dataToProcess.length} 条缺失数据...\`, 'color: #17a2b8; font-weight: bold;');
    
    // 更新全局data变量
    const existingNames = new Set(data.map(item => item.name));
    const uniqueNewData = dataToProcess.filter(item => !existingNames.has(item.name));
    
    if (uniqueNewData.length > 0) {
        data.push(...uniqueNewData);
        console.log(\`✅ 已添加 \${uniqueNewData.length} 条新数据到数据集\`);
    }
    
    // 自动执行缺失的数据
    console.log('%c🚀 开始自动执行缺失数据...', 'color: #6f42c1; font-weight: bold;');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const item of dataToProcess) {
        try {
            console.log(\`处理: \${item.name} (\${item.sex})\`);
            
            if (typeof createTaskApi !== 'undefined') {
                await createTaskApi(item.name, item.sex);
            } else if (typeof createTask !== 'undefined') {
                await createTask(item.name, item.sex);
            }
            
            successCount++;
            
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(\`❌ 处理失败: \${item.name}\`, error);
            failCount++;
        }
    }
    
    console.log('%c📊 补充完成:', 'color: #28a745; font-weight: bold;');
    console.log('成功:', successCount);
    console.log('失败:', failCount);
    
    // 重新验证
    console.log('%c🔄 重新验证数据...');
    await validateData();
}
`;
    }
}

// 导出
window.ValidationManager = ValidationManager;
