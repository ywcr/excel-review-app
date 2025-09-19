// ==================== API请求Web Worker ====================
// 负责在后台线程处理API请求，避免窗口切换影响

// 工具函数
function formatParams(params) {
    const formatted = {};
    for (let key in params) {
        if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
            formatted[key] = params[key];
        }
    }
    return formatted;
}

function toQueryString(params) {
    const keys = Object.keys(params).sort();
    const pairs = keys.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    return pairs.join('&');
}

// 序列化数据，模拟jQuery.param的traditional模式
function serializeData(data, traditional = true) {
    const params = [];
    
    function addParam(key, value) {
        // 处理null和undefined
        if (value == null) {
            value = '';
        }
        
        // 转换为字符串
        value = typeof value === 'function' ? value() : value;
        params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
    
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            const value = data[key];
            
            if (Array.isArray(value)) {
                if (traditional) {
                    // traditional模式：key=value1&key=value2
                    value.forEach(v => addParam(key, v));
                } else {
                    // 非traditional模式：key[]=value1&key[]=value2
                    value.forEach(v => addParam(key + '[]', v));
                }
            } else if (typeof value === 'object' && value !== null) {
                // 对象序列化为JSON字符串
                addParam(key, JSON.stringify(value));
            } else {
                addParam(key, value);
            }
        }
    }
    
    return params.join('&');
}

// 签名生成函数 - 使用HmacSHA256算法
function generateSign(text, signKey) {
    // 在Worker中需要引入CryptoJS库
    // 可以通过importScripts引入
    if (typeof CryptoJS === 'undefined') {
        try {
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');
        } catch (e) {
            console.error('Failed to load CryptoJS in Worker:', e);
            // 如果CryptoJS不可用，使用备用的Web Crypto API
            return generateSignWithWebCrypto(text, signKey);
        }
    }
    
    if (typeof CryptoJS !== 'undefined' && CryptoJS.HmacSHA256) {
        return CryptoJS.HmacSHA256(text, signKey).toString();
    } else {
        // 使用Web Crypto API作为备用
        return generateSignWithWebCrypto(text, signKey);
    }
}

// 使用Web Crypto API生成签名（异步）
async function generateSignWithWebCrypto(text, signKey) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signKey);
    const messageData = encoder.encode(text);
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        messageData
    );
    
    // 将ArrayBuffer转换为十六进制字符串
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// 在Worker启动时尝试加载CryptoJS
try {
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');
    console.log('CryptoJS loaded successfully in Worker');
} catch (e) {
    console.warn('CryptoJS could not be loaded in Worker, will use Web Crypto API as fallback');
}

// Worker消息处理
self.addEventListener('message', async function(e) {
    const { type, data } = e.data;
    
    switch(type) {
        case 'CREATE_TASK':
            await handleCreateTask(data);
            break;
            
        case 'BATCH_CREATE':
            await handleBatchCreate(data);
            break;
            
        case 'GET_SALT':
            await handleGetSalt(data);
            break;
            
        default:
            self.postMessage({
                type: 'ERROR',
                error: `Unknown message type: ${type}`
            });
    }
});

// 处理单个任务创建
async function handleCreateTask(data) {
    const { taskData, config, saltData, requestId } = data;
    
    try {
        // 构建请求数据
        const requestData = buildRequestData(taskData, config, saltData);
        
        // 发送API请求 - 完全复制浏览器的fetch请求
        const formData = serializeData(requestData.ajaxData, true);
        const fullUrl = config.baseUrl ? config.baseUrl + (config.apiEndpoint || '/lgb/xfzwj/add') : (config.apiEndpoint || '/lgb/xfzwj/add');
        
        // 完全仿照浏览器的请求格式
        const response = await fetch(fullUrl, {
            headers: {
                "accept": "*/*",
                "accept-language": "zh-CN,zh;q=0.9",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "sign": requestData.signature,
                "signkey": saltData.signkey,  // 注意：实际请求中是小写
                "x-requested-with": "XMLHttpRequest"
            },
            referrer: config.referrer || "",
            body: formData,
            method: "POST",
            mode: "cors",
            credentials: "include"
        });
        
        const result = await response.json();
        
        // 发送成功消息
        self.postMessage({
            type: 'TASK_COMPLETE',
            requestId: requestId,
            success: true,
            result: result,
            taskData: taskData
        });
        
    } catch (error) {
        // 发送错误消息
        self.postMessage({
            type: 'TASK_ERROR',
            requestId: requestId,
            success: false,
            error: error.message,
            taskData: taskData
        });
    }
}

// 处理批量任务创建
async function handleBatchCreate(data) {
    const { tasks, config, interval = 5000 } = data;
    let successCount = 0;
    let failCount = 0;
    
    self.postMessage({
        type: 'BATCH_START',
        total: tasks.length
    });
    
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        try {
            // 获取新的盐值
            const saltData = await getSalt(config);
            
            // 创建任务
            await handleCreateTask({
                taskData: task,
                config: config,
                saltData: saltData,
                requestId: `batch_${i}`
            });
            
            successCount++;
            
            // 发送进度更新
            self.postMessage({
                type: 'BATCH_PROGRESS',
                current: i + 1,
                total: tasks.length,
                successCount: successCount,
                failCount: failCount
            });
            
            // 等待间隔时间
            if (i < tasks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
            
        } catch (error) {
            failCount++;
            console.error(`Task ${i + 1} failed:`, error);
        }
    }
    
    // 发送批量完成消息
    self.postMessage({
        type: 'BATCH_COMPLETE',
        successCount: successCount,
        failCount: failCount,
        total: tasks.length
    });
}

// 获取动态盐值 - 完全复制浏览器的请求格式
async function getSalt(config) {
    try {
        // 使用配置的端点或默认值
        const endpoint = config.saltEndpoint || '/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add';
        const fullUrl = config.baseUrl ? config.baseUrl + endpoint : endpoint;
        
        // 完全复制浏览器的fetch请求
        const response = await fetch(fullUrl, {
            headers: {
                "accept": "*/*",
                "accept-language": "zh-CN,zh;q=0.9",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest"
            },
            referrer: config.referrer || window.location.href,
            body: null,
            method: "GET",
            mode: "cors",
            credentials: "include"
        });
        
        const result = await response.json();
        
        if (result.code === 0 || result.code === 200) {
            return result.data || result;
        } else {
            throw new Error('Failed to get salt');
        }
    } catch (error) {
        console.error('Get salt error:', error);
        throw error;
    }
}

// 处理获取盐值请求
async function handleGetSalt(data) {
    const { config, requestId } = data;
    
    try {
        const saltData = await getSalt(config);
        
        self.postMessage({
            type: 'SALT_RESPONSE',
            requestId: requestId,
            success: true,
            saltData: saltData
        });
        
    } catch (error) {
        self.postMessage({
            type: 'SALT_ERROR',
            requestId: requestId,
            success: false,
            error: error.message
        });
    }
}

// 构建请求数据
function buildRequestData(taskData, config, saltData) {
    const { name, sex, date, answers } = taskData;
    
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
    
    // 生成签名
    const formattedData = formatParams(tempData);
    const encryptedText = toQueryString(formattedData);
    const finalEncryptedText = encryptedText.length > 255 ? encryptedText.substring(0, 255) : encryptedText;
    
    // 签名可能是异步的（如果使用Web Crypto API）
    let signature;
    try {
        signature = await generateSign(finalEncryptedText, saltData.signkey);
    } catch (error) {
        console.error('Signature generation failed:', error);
        throw new Error('签名生成失败');
    }
    
    return {
        ajaxData: tempData,
        signature: signature
    };
}

// Worker状态报告
self.postMessage({
    type: 'WORKER_READY',
    message: 'API Worker is ready'
});