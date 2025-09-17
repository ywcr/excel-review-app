// ==================== 执行逻辑管理器 ====================

/**
 * 执行逻辑管理器类
 * 负责生成DOM和API模式的执行逻辑代码
 */
class ExecutionLogicManager {
  constructor() {}

  /**
   * 获取DOM模式执行逻辑
   */
  getDomExecutionLogic() {
    return `
// ==================== DOM模式执行逻辑 ====================

let currentIndex = 0;
let isRunning = false;

// 创建任务
async function createTask(name, sex) {
    return new Promise((resolve, reject) => {
        // 设置基本信息
        setInputValue('姓名', name);
        setInputValue('性别', sex);
        setInputValue('实施时间', \`\${year}-\${date.replace('.', '-')}\`);
        
        // 设置问题答案
        try {
            for (let i = 0; i < 10; i++) {
                const answerFunc = window[\`_answer\${i}\`];
                if (typeof answerFunc === 'function') {
                    const answer = answerFunc();
                    setOptionValue(i, answer);
                }
            }
        } catch (error) {
            console.error('设置答案时出错:', error);
        }
        
        // 提交表单
        setTimeout(() => {
            const submitBtn = contentWindow.document.querySelector('button[lay-submit]');
            if (submitBtn) {
                submitBtn.click();
                console.log(\`✅ 已提交: \${name} (\${sex})\`);
                resolve();
            } else {
                console.error('❌ 找不到提交按钮');
                reject(new Error('找不到提交按钮'));
            }
        }, 1000);
    });
}

// 手动执行单个任务
async function start() {
    if (isRunning) {
        console.log('⚠️ 已有任务在运行中');
        return;
    }
    
    if (currentIndex >= data.length) {
        console.log('✅ 所有任务已完成');
        return;
    }
    
    isRunning = true;
    const item = data[currentIndex];
    
    try {
        console.log(\`[DOM] 开始处理第 \${currentIndex + 1}/\${data.length} 个: \${item.name} (\${item.sex})\`);
        await createTask(item.name, item.sex);
        currentIndex++;
        console.log(\`✅ 完成: \${item.name}\`);
    } catch (error) {
        console.error(\`❌ 处理失败: \${item.name}\`, error);
    } finally {
        isRunning = false;
    }
}

// 自动执行所有任务
async function automatic(targetDate = null) {
    if (isRunning) {
        console.log('⚠️ 已有任务在运行中');
        return;
    }
    
    // 如果指定了日期，只处理该日期的数据
    let dataToProcess = data;
    if (targetDate) {
        dataToProcess = data.filter(item => item.time === targetDate);
        console.log(\`📅 仅处理日期 \${targetDate} 的数据，共 \${dataToProcess.length} 条\`);
    }
    
    if (dataToProcess.length === 0) {
        console.log('❌ 没有需要处理的数据');
        return;
    }
    
    isRunning = true;
    console.log(\`🚀 开始自动执行，共 \${dataToProcess.length} 个任务\`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < dataToProcess.length; i++) {
        const item = dataToProcess[i];
        
        try {
            console.log(\`[DOM] 处理第 \${i + 1}/\${dataToProcess.length} 个: \${item.name} (\${item.sex})\`);
            await createTask(item.name, item.sex);
            successCount++;
            
            // 添加延迟避免操作过快
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            console.error(\`❌ 处理失败: \${item.name}\`, error);
            failCount++;
        }
    }
    
    isRunning = false;
    console.log(\`📊 执行完成: 成功 \${successCount} 个, 失败 \${failCount} 个\`);
    
    // 自动验证（如果启用）
    if (typeof validateData === 'function') {
        console.log('🔍 开始自动验证...');
        await validateData();
    }
}
`;
  }

  /**
   * 获取API模式执行逻辑
   */
  getApiExecutionLogic() {
    return `
// ==================== API模式执行逻辑 ====================

let currentIndex = 0;
let isRunning = false;

// API创建任务
async function createTaskApi(name, sex) {
    try {
        // 获取动态盐值
        const saltData = await createDynamicsSalt();
        
        // 构建请求数据
        const requestData = {
            name: name,
            sex: sex,
            date: \`\${year}-\${date.replace('.', '-')}\`,
            // 添加问题答案
            answers: {}
        };
        
        // 设置问题答案 - 使用数组格式，索引对应answer0, answer1, answer2...
        const answersArray = [];
        for (let i = 0; i < 10; i++) {
            const answerFunc = window[\`_answer\${i}\`];
            if (typeof answerFunc === 'function') {
                answersArray[i] = answerFunc();
            }
        }
        requestData.answers = answersArray;
        
        // 先构建完整的请求数据结构
        const tempData = {
            // 基本信息
            name: requestData.name,
            sex: requestData.sex,
            date: requestData.date,
            answers: JSON.stringify(requestData.answers),

            // 项目字段
            recId: "",
            nvcVal: "",
            latLng: "",
            projectId: "1756460958725101",
            corpId: "1749721838789101",
            projectTpl: "1756451075934101",
            sponsorProjectId: "1756451241652103",
            isForward: 1,
            title: "致力庆西黄丸消费者问卷",
            way: "实名调查",
            startTime: requestData.date,
            memo: "为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。",
            dcdxName: "吴承",
            fieldName: "性别",
            fill: requestData.sex,
            channelAddress: ""
        };

        // 添加单独的answer字段
        requestData.answers.forEach((answer, index) => {
            if (answer !== undefined) {
                tempData[\`answer\${index}\`] = answer;
            }
        });

        // 格式化参数并生成encryptedText（用于签名验证）
        const formattedData = formatParams(tempData);
        const encryptedText = toQueryString(formattedData);
        const finalEncryptedText = encryptedText.length > 255 ? encryptedText.substring(0, 255) : encryptedText;

        // 生成签名（使用encryptedText）
        const signature = generateSign(finalEncryptedText, saltData.signkey);

        // 准备请求数据，按照参考API的格式构建
        const ajaxData = {
            // 基本信息
            name: requestData.name,
            sex: requestData.sex,
            date: requestData.date,

            // 答案数据 - 既要有单独的answer字段，也要有合并的answers字段
            answers: JSON.stringify(requestData.answers), // JSON格式的答案对象

            // 必要的项目字段（参考api.md）
            recId: "",
            nvcVal: "",
            latLng: "",
            projectId: "1756460958725101", // 从参考API获取
            corpId: "1749721838789101",
            projectTpl: "1756451075934101",
            sponsorProjectId: "1756451241652103",
            isForward: 1,
            title: "致力庆西黄丸消费者问卷",
            way: "实名调查",
            startTime: requestData.date,
            memo: "为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。",
            dcdxName: "吴承",
            fieldName: "性别",
            fill: requestData.sex,
            channelAddress: "",

            // encryptedText用于签名验证
            encryptedText: finalEncryptedText
        };

        // 添加单独的answer字段（answer0, answer1, answer2...）
        requestData.answers.forEach((answer, index) => {
            if (answer !== undefined) {
                ajaxData[\`answer\${index}\`] = answer;
            }
        });

        console.log('📤 发送请求数据:', ajaxData);
        console.log('🔐 签名信息:', { signature: signature.substring(0, 16) + '...', signKey: saltData.signkey });

        // 使用$.ajax发送请求（与网站其他接口保持一致）
        const result = await new Promise((resolve, reject) => {
            $.ajax({
                url: config.apiEndpoint,
                type: "POST",
                data: ajaxData,
                headers: {
                    sign: signature,
                    signKey: saltData.signkey
                },
                traditional: true,
                success: function(res) {
                    console.log('📥 API响应:', res);
                    resolve(res);
                },
                error: function(xhr, status, error) {
                    console.error('❌ Ajax请求失败:', { status, error, responseText: xhr.responseText });
                    reject(new Error(\`请求失败: \${status} - \${error}\`));
                }
            });
        });
        // 处理不同的响应格式
        const code = result.code || result.errCode;
        const message = result.message || result.errMsg;

        // 检查是否成功
        if (code === 0 || code === '0' || code === 200 || code === '200') {
            console.log(\`✅ API创建成功: \${name} (\${sex})\`);
            return { success: true, data: result };
        }
        // 检查是否是任务数量达标
        else if (code === 5000 || code === '5000') {
            if (message && message.includes('任务数量已达标')) {
                console.log(\`🎯 任务数量已达标: \${name} (\${sex}) - \${message}\`);
                return { success: false, isQuotaReached: true, message: message };
            }
        }

        // 其他错误情况
        throw new Error(\`API返回错误: \${message || '未知错误'}\`);
    } catch (error) {
        console.error(\`❌ API创建失败: \${name}\`, error);
        throw error;
    }
}

// 手动执行单个任务（API模式）
async function startApi() {
    if (isRunning) {
        console.log('⚠️ 已有任务在运行中');
        return;
    }
    
    if (currentIndex >= data.length) {
        console.log('✅ 所有任务已完成');
        return;
    }
    
    isRunning = true;
    const item = data[currentIndex];
    
    try {
        console.log(\`[API] 开始处理第 \${currentIndex + 1}/\${data.length} 个: \${item.name} (\${item.sex})\`);
        const result = await createTaskApi(item.name, item.sex);

        // 检查是否是任务数量达标
        if (result && result.isQuotaReached) {
            console.log(\`🎯 任务数量已达标，无法继续创建: \${item.name}\`);
            return; // 直接返回，不增加currentIndex
        }

        currentIndex++;
        console.log(\`✅ 完成: \${item.name}\`);
    } catch (error) {
        console.error(\`❌ 处理失败: \${item.name}\`, error);
    } finally {
        isRunning = false;
    }
}

// 自动执行所有任务（API模式）
async function automaticApi(targetDate = null) {
    if (isRunning) {
        console.log('⚠️ 已有任务在运行中');
        return;
    }
    
    // 如果指定了日期，只处理该日期的数据
    let dataToProcess = data;
    if (targetDate) {
        dataToProcess = data.filter(item => item.time === targetDate);
        console.log(\`📅 仅处理日期 \${targetDate} 的数据，共 \${dataToProcess.length} 条\`);
    }
    
    if (dataToProcess.length === 0) {
        console.log('❌ 没有需要处理的数据');
        return;
    }
    
    isRunning = true;
    console.log(\`🚀 开始API自动执行，共 \${dataToProcess.length} 个任务\`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < dataToProcess.length; i++) {
        const item = dataToProcess[i];
        
        try {
            console.log(\`[API] 处理第 \${i + 1}/\${dataToProcess.length} 个: \${item.name} (\${item.sex})\`);
            const result = await createTaskApi(item.name, item.sex);

            // 检查是否是任务数量达标
            if (result && result.isQuotaReached) {
                console.log(\`🎯 检测到任务数量已达标，停止继续处理\`);
                console.log(\`📊 已处理: \${successCount} 个成功, \${failCount} 个失败\`);
                console.log(\`⏹️ 剩余 \${filteredData.length - i - 1} 个任务未处理\`);
                break; // 跳出循环，停止处理后续数据
            }

            successCount++;

            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            console.error(\`❌ 处理失败: \${item.name}\`, error);
            failCount++;
        }
    }
    
    isRunning = false;
    console.log(\`📊 执行完成: 成功 \${successCount} 个, 失败 \${failCount} 个\`);
    
    // 自动验证（如果启用）
    if (typeof validateData === 'function') {
        console.log('🔍 开始自动验证...');
        await validateData();
    }
}
`;
  }

  /**
   * 获取全日期执行逻辑
   */
  getAllDatesExecutionLogic(mode = "dom") {
    const baseLogic =
      mode === "api"
        ? this.getApiExecutionLogic()
        : this.getDomExecutionLogic();

    return (
      baseLogic +
      `

// 按日期顺序执行所有任务
async function executeAllDates() {
    console.log('%c🚀 开始执行所有日期的任务', 'color: #17a2b8; font-weight: bold; font-size: 16px;');
    
    // 获取所有日期
    const dates = [...new Set(data.map(item => item.time))].sort();
    console.log('📅 日期列表:', dates);
    
    for (const targetDate of dates) {
        console.log('');
        console.log('='.repeat(60));
        console.log(\`📅 开始执行日期: \${targetDate}\`);
        console.log('='.repeat(60));
        
        // 执行该日期的所有任务
        if (mode === 'api') {
            await automaticApi(targetDate);
        } else {
            await automatic(targetDate);
        }
        
        // 日期间隔延迟
        if (dates.indexOf(targetDate) < dates.length - 1) {
            console.log('');
            console.log('等待5秒后继续下一个日期...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('%c🎉 所有日期任务执行完成！', 'color: #28a745; font-weight: bold; font-size: 16px;');
    console.log('='.repeat(60));
    
    // 验证所有数据
    console.log('');
    console.log('🔍 开始验证所有数据...');
    await validateData();
}
`
    );
  }
}

// 导出
window.ExecutionLogicManager = ExecutionLogicManager;
