// ==================== Worker端调度器 ====================
// 负责任务调度和签名生成，但不执行ajax请求
// ajax请求委托给主线程执行，确保与jQuery配置一致

// 加载CryptoJS用于签名
try {
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');
    console.log('CryptoJS loaded in Worker scheduler');
} catch (e) {
    console.warn('CryptoJS could not be loaded, using fallback');
}

// 任务调度状态
let batchTasks = [];
let currentIndex = 0;
let successCount = 0;
let failCount = 0;
let config = {};
let isProcessing = false;

// 消息处理
self.addEventListener('message', async function(e) {
    const { type, data } = e.data;
    
    switch(type) {
        case 'START_BATCH':
            startBatchProcessing(data);
            break;
            
        case 'AJAX_RESPONSE':
            handleAjaxResponse(e.data);
            break;
            
        case 'AJAX_ERROR':
            handleAjaxError(e.data);
            break;
            
        case 'SALT_RESPONSE':
            handleSaltResponse(e.data);
            break;
            
        case 'SALT_ERROR':
            handleSaltError(e.data);
            break;
    }
});

// 开始批量处理
async function startBatchProcessing(data) {
    batchTasks = data.tasks;
    config = data.config;
    currentIndex = 0;
    successCount = 0;
    failCount = 0;
    isProcessing = true;
    
    self.postMessage({
        type: 'BATCH_START',
        data: {
            total: batchTasks.length
        }
    });
    
    // 开始处理第一个任务
    processNextTask();
}

// 处理下一个任务
async function processNextTask() {
    if (!isProcessing || currentIndex >= batchTasks.length) {
        // 批量处理完成
        self.postMessage({
            type: 'BATCH_COMPLETE',
            data: {
                successCount: successCount,
                failCount: failCount,
                total: batchTasks.length
            }
        });
        isProcessing = false;
        return;
    }
    
    const task = batchTasks[currentIndex];
    
    // 请求主线程获取盐值
    requestSalt();
}

// 请求盐值
function requestSalt() {
    const requestId = `salt_${currentIndex}_${Date.now()}`;
    
    // 保存请求上下文
    pendingRequests.set(requestId, {
        type: 'salt',
        taskIndex: currentIndex
    });
    
    // 请求主线程获取盐值
    self.postMessage({
        type: 'REQUEST_SALT',
        requestId: requestId,
        data: {
            endpoint: config.saltEndpoint
        }
    });
}

// 处理盐值响应
function handleSaltResponse(response) {
    const { requestId, data } = response;
    const context = pendingRequests.get(requestId);
    
    if (!context) return;
    
    pendingRequests.delete(requestId);
    
    // 使用盐值生成签名并发送请求
    const task = batchTasks[context.taskIndex];
    sendTaskRequest(task, data);
}

// 处理盐值错误
function handleSaltError(response) {
    const { requestId, error } = response;
    const context = pendingRequests.get(requestId);
    
    if (!context) return;
    
    pendingRequests.delete(requestId);
    
    console.error('获取盐值失败:', error);
    failCount++;
    currentIndex++;
    
    // 继续下一个任务
    setTimeout(() => processNextTask(), config.interval || 5000);
}

// 发送任务请求
function sendTaskRequest(task, saltData) {
    const requestId = `task_${currentIndex}_${Date.now()}`;
    
    // 构建请求数据
    const ajaxData = buildRequestData(task, config, saltData);
    
    // 生成签名
    const signature = generateSign(ajaxData.encryptedText, saltData.signkey);
    
    // 保存请求上下文
    pendingRequests.set(requestId, {
        type: 'task',
        taskIndex: currentIndex,
        task: task
    });
    
    // 请求主线程执行ajax
    self.postMessage({
        type: 'REQUEST_AJAX',
        requestId: requestId,
        data: {
            url: config.apiEndpoint,
            ajaxData: ajaxData.data,
            signature: signature,
            signKey: saltData.signkey
        }
    });
}

// 处理ajax响应
function handleAjaxResponse(response) {
    const { requestId, data } = response;
    const context = pendingRequests.get(requestId);
    
    if (!context) return;
    
    pendingRequests.delete(requestId);
    
    // 检查响应结果
    const code = data.code || data.errCode;
    if (code === 0 || code === '0' || code === 200 || code === '200') {
        successCount++;
        console.log(`✅ 任务成功: ${context.task.name}`);
    } else {
        failCount++;
        console.log(`❌ 任务失败: ${context.task.name}`);
    }
    
    // 更新进度
    currentIndex++;
    self.postMessage({
        type: 'BATCH_PROGRESS',
        data: {
            current: currentIndex,
            total: batchTasks.length,
            successCount: successCount,
            failCount: failCount
        }
    });
    
    // 等待间隔后处理下一个
    setTimeout(() => processNextTask(), config.interval || 5000);
}

// 处理ajax错误
function handleAjaxError(response) {
    const { requestId, error } = response;
    const context = pendingRequests.get(requestId);
    
    if (!context) return;
    
    pendingRequests.delete(requestId);
    
    console.error(`任务失败: ${context.task.name}`, error);
    failCount++;
    currentIndex++;
    
    // 继续下一个任务
    setTimeout(() => processNextTask(), config.interval || 5000);
}

// 构建请求数据
function buildRequestData(task, config, saltData) {
    const { name, sex, date, answers } = task;
    
    // 构建完整的请求数据
    const tempData = {
        name: name,
        sex: sex,
        date: date,
        answers: JSON.stringify(answers),
        
        // 项目字段
        recId: "",
        nvcVal: "",
        latLng: "",
        projectId: config.projectId || "1756460958725101",
        corpId: config.corpId || "1749721838789101",
        projectTpl: config.projectTpl || "1756451075934101",
        sponsorProjectId: config.sponsorProjectId || "1756451241652103",
        isForward: 1,
        title: config.title || "问卷调查",
        way: "实名调查",
        startTime: date,
        memo: config.memo || "",
        dcdxName: name,
        fieldName: "性别",
        fill: sex,
        channelAddress: ""
    };
    
    // 添加答案字段
    if (answers && Array.isArray(answers)) {
        answers.forEach((answer, index) => {
            if (answer !== undefined) {
                tempData[`answer${index}`] = answer;
            }
        });
    }
    
    // 生成encryptedText
    const formattedData = formatParams(tempData);
    const encryptedText = toQueryString(formattedData);
    const finalEncryptedText = encryptedText.length > 255 ? encryptedText.substring(0, 255) : encryptedText;
    
    // 添加encryptedText到数据
    tempData.encryptedText = finalEncryptedText;
    
    return {
        data: tempData,
        encryptedText: finalEncryptedText
    };
}

// 生成签名
function generateSign(text, signKey) {
    if (typeof CryptoJS !== 'undefined' && CryptoJS.HmacSHA256) {
        return CryptoJS.HmacSHA256(text, signKey).toString();
    } else {
        // 使用Web Crypto API作为备用
        console.warn('使用备用签名方法');
        return simpleHash(text + signKey);
    }
}

// 简单哈希函数（备用）
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// 格式化参数
function formatParams(params) {
    const formatted = {};
    for (let key in params) {
        if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
            formatted[key] = params[key];
        }
    }
    return formatted;
}

// 转换为查询字符串
function toQueryString(params) {
    const keys = Object.keys(params).sort();
    const pairs = keys.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    return pairs.join('&');
}

// 待处理请求映射
const pendingRequests = new Map();

// Worker就绪
self.postMessage({
    type: 'WORKER_READY',
    message: 'Worker scheduler is ready'
});