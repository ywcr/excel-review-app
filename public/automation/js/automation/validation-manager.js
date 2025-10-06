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
 * 获取项目ID
 * 参考 wenjuanyanzheng.js 的实现
 */
function getProjectIdFromUrl() {
    // 方法1: 从当前页面URL获取
    const urlParams = new URLSearchParams(window.location.search);
    let projectId = urlParams.get('projectId');
    
    if (projectId) {
        console.log(\`📋 从URL获取projectId: \${projectId}\`);
        return projectId;
    }
    
    // 方法2: 从iframe获取（参考 wenjuanyanzheng.js）
    const iframe = document.querySelector('#ssfwIframe');
    if (iframe) {
        try {
            // 尝试从 iframe 的 contentWindow.location 获取
            const iframeSrc = iframe.contentWindow.location.href;
            const iframeParams = new URLSearchParams(iframeSrc.split('?')[1]);
            projectId = iframeParams.get('projectId');
            
            if (projectId) {
                console.log(\`📋 从iframe获取projectId: \${projectId}\`);
                return projectId;
            }
        } catch (error) {
            // 跨域限制，尝试从 iframe.src 获取
            try {
                if (iframe.src) {
                    const iframeUrl = new URL(iframe.src);
                    projectId = iframeUrl.searchParams.get('projectId');
                    
                    if (projectId) {
                        console.log(\`📋 从iframe.src获取projectId: \${projectId}\`);
                        return projectId;
                    }
                }
            } catch (e) {
                console.warn('⚠️ 无法从iframe获取projectId，可能是跨域限制');
            }
        }
    }
    
    // 方法3: 使用默认值
    console.warn('⚠️ 无法获取projectId，使用默认值');
    return '1756460958725101';
}

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
        // 转换日期格式 MM.DD -> YYYY-MM-DD
        const year = new Date().getFullYear();
        let checkDate = targetDate;
        
        // 如果是 MM.DD 格式，转换为 YYYY-MM-DD
        if (targetDate.includes('.')) {
            const [month, day] = targetDate.split('.');
            checkDate = \`\${year}-\${month.padStart(2, '0')}-\${day.padStart(2, '0')}\`;
        }
        
        // 使用与 wenjuanyanzheng.js 相同的接口
        const response = await fetch(
            \`/lgb/workOrder/mobile/list?searchValue=&pageNum=1&pageSize=100000&projectId=\${projectId}&queryState=-1\`,
            {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'x-requested-with': 'XMLHttpRequest'
                },
                credentials: 'include'
            }
        );
        
        const result = await response.json();
        
        // 接口返回 code: 200 表示成功
        if (result.code === 200) {
            const createdSurveys = result.rows || [];
            // 提取姓名字段，兼容多种字段名
            return createdSurveys.map(item => ({
                name: item.workOrderValue || item.patientName || item.consumerName || '',
                ...item
            }));
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
    
    // 在执行前检查并更新问卷内容（如果函数存在）
    if (typeof initializeQuestionnaireContent === 'function') {
        try {
            console.log('%c📋 检查问卷内容是否需要更新...', 'color: #17a2b8; font-weight: bold;');
            await initializeQuestionnaireContent();
        } catch (error) {
            console.warn('⚠️ 问卷内容检查失败，继续使用默认配置:', error);
        }
    }
    
    // 自动执行缺失的数据
    console.log('%c🚀 开始自动执行缺失数据...', 'color: #6f42c1; font-weight: bold;');
    
    // 🎵 开始播放后台音频（保持标签页活跃）
    if (typeof startBackgroundAudio === 'function') {
        startBackgroundAudio();
    }
    
    let successCount = 0;
    let failCount = 0;
    let criticalError = false;
    
    // 初始化进度显示和执行状态
    if (typeof executionStats !== 'undefined' && typeof updateProgressDisplay === 'function') {
        executionStats = {
            total: dataToProcess.length,
            current: 0,
            success: 0,
            failed: 0,
            startTime: Date.now(),
            startIndex: 0
        };
        isRunning = true;
        isPaused = false;
        shouldStop = false; // ⚠️ 关键：重置停止标志
        updateProgressDisplay();
    }
    
    for (let i = 0; i < dataToProcess.length; i++) {
        const item = dataToProcess[i];
        
        // 检查是否遇到严重错误，如果是则停止
        if (criticalError) {
            console.warn(\`⚠️ 因严重错误停止，剩余 \${dataToProcess.length - i} 个任务未处理\`);
            break;
        }
        
        // 检查是否应该停止
        if (typeof shouldStop !== 'undefined' && shouldStop) {
            console.log('%c⏹️ 执行已停止', 'color: #ff6b6b; font-weight: bold;');
            break;
        }
        
        // 检查是否暂停（等待恢复）
        while (typeof isPaused !== 'undefined' && isPaused) {
            console.log('%c⏸️ 执行已暂停，等待恢复...', 'color: #ffa502; font-weight: bold;');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 在暂停期间也检查是否要停止
            if (typeof shouldStop !== 'undefined' && shouldStop) {
                console.log('%c⏹️ 执行已停止', 'color: #ff6b6b; font-weight: bold;');
                break;
            }
        }
        
        // 再次检查停止状态（可能在暂停期间被设置）
        if (typeof shouldStop !== 'undefined' && shouldStop) {
            break;
        }
        
        try {
            console.log(\`[\${i + 1}/\${dataToProcess.length}] 处理: \${item.name} (\${item.sex}) - \${item.time}\`);
            
            if (typeof createTaskApi !== 'undefined') {
                await createTaskApi(item.name, item.sex, item.time);
            } else if (typeof createTask !== 'undefined') {
                await createTask(item.name, item.sex, item.time);
            }
            
            successCount++;
            console.log(\`✅ [\${i + 1}/\${dataToProcess.length}] 成功: \${item.name}\`);
            
            // 更新进度
            if (typeof executionStats !== 'undefined' && typeof updateProgressDisplay === 'function') {
                executionStats.current = i + 1;
                executionStats.success = successCount;
                executionStats.failed = failCount;
                updateProgressDisplay();
            }
            
            // 使用全局间隔设置（如果存在），否则使用默认5秒
            const interval = typeof apiRequestInterval !== 'undefined' ? apiRequestInterval : 5000;
            await new Promise(resolve => setTimeout(resolve, interval));
        } catch (error) {
            failCount++;
            const errorMsg = error.message || String(error);
            console.error(\`❌ [\${i + 1}/\${dataToProcess.length}] 处理失败: \${item.name}\`, error);
            
            // 更新进度
            if (typeof executionStats !== 'undefined' && typeof updateProgressDisplay === 'function') {
                executionStats.current = i + 1;
                executionStats.success = successCount;
                executionStats.failed = failCount;
                updateProgressDisplay();
            }
            
            // 检查是否是严重错误（问卷结构缺失等）
            if (errorMsg.includes('问卷结构字段缺失') || errorMsg.includes('questions/options/types')) {
                criticalError = true;
                console.error('🛑 检测到严重错误，停止执行！');
                console.error('💡 请确保在正确的问卷页面内执行');
                console.error('💡 需要在问卷页面（如 xfzwj.jsp）的 iframe 中才能获取问卷结构');
                break;
            }
        }
    }
    
    // 重置进度显示状态
    if (typeof executionStats !== 'undefined' && typeof updateProgressDisplay === 'function') {
        isRunning = false;
        isPaused = false;
        shouldStop = false; // ⚠️ 关键：重置停止标志
        updateProgressDisplay();
    }
    
    // 🔇 停止后台音频
    if (typeof stopBackgroundAudio === 'function') {
        stopBackgroundAudio();
    }
    
    console.log('%c📊 补充完成:', 'color: #28a745; font-weight: bold;');
    console.log('成功:', successCount);
    console.log('失败:', failCount);
    if (criticalError) {
        console.log('⚠️ 因严重错误提前停止');
    }
    
    // 仅在没有严重错误时重新验证
    if (!criticalError) {
        console.log('%c🔄 重新验证数据...');
        await validateData();
    } else {
        console.warn('⚠️ 跳过验证，请修复问题后重试');
    }
}
`;
    }
}

// 导出
window.ValidationManager = ValidationManager;
