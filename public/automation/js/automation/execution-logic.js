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
let apiRequestInterval = 5000; // 默认间隔5秒，可通过setApiInterval调整

// 设置API请求间隔时间（毫秒）
function setApiInterval(interval) {
    if (interval < 200) {
        console.warn('⚠️ 间隔时间不能小于200ms，已自动设置为500ms');
        interval = 500;
    }
    apiRequestInterval = interval;
    console.log(\`✅ API请求间隔已设置为: \${interval}ms (\${(interval/1000).toFixed(1)}秒)\`);
    return interval;
}

// 获取当前API请求间隔
function getApiInterval() {
    return apiRequestInterval;
}

// Worker模式相关变量
let apiWorker = null;
let useWorkerMode = false;
let workerReady = false;

// 初始化Worker模式（内联 Worker 版本，无需外部脚本路径）
function initWorkerMode() {
    if (typeof Worker === 'undefined') {
        console.warn('⚠️ 浏览器不支持Web Worker，使用传统模式');
        useWorkerMode = false;
        return false;
    }

    try {
        // 内联 Worker 源码（最小实现：批量获取盐值、签名并提交表单）
        const WORKER_JS = [
            "// Inline API Worker - generated by ExecutionLogicManager",
            "async function hmacSHA256Hex(message, key){",
            "  const enc=new TextEncoder();",
            "  const k=await crypto.subtle.importKey('raw', enc.encode(key), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);",
            "  const sig=await crypto.subtle.sign('HMAC', k, enc.encode(message));",
            "  return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');",
            "}",
            "function encodeForm(data){",
            "  const params=[];",
            "  for(const k in data){ if(!Object.prototype.hasOwnProperty.call(data,k)) continue;",
            "    let v=data[k]; if(v==null) v='';",
            "    if(Array.isArray(v)){ v.forEach(x=>params.push(encodeURIComponent(k)+'='+encodeURIComponent(x))); }",
            "    else if(typeof v==='object'){ params.push(encodeURIComponent(k)+'='+encodeURIComponent(JSON.stringify(v))); }",
            "    else { params.push(encodeURIComponent(k)+'='+encodeURIComponent(v)); }",
            "  } return params.join('&');",
            "}",
            "function formatParams(obj){ const out={}; for(const k in obj){ if(obj[k]!==undefined && obj[k]!==null){ out[k]=obj[k]; } } return out; }",
            "function toQueryString(obj){ const keys=Object.keys(obj).sort(); return keys.map(k=>encodeURIComponent(k)+'='+encodeURIComponent(obj[k])).join('&'); }",
            "async function getSalt(config){",
            "  const endpoint=(config && config.saltEndpoint) ? config.saltEndpoint : '/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add';",
            "  const res=await fetch(endpoint,{method:'GET',credentials:'include',headers:{'accept':'*/*','x-requested-with':'XMLHttpRequest'}});",
            "  const json=await res.json(); return json.data || json;",
            "}",
            "function buildRequestData(task, config){",
            "  const temp={",
            "    name: task.name,",
            "    sex: task.sex,",
            "    date: task.date,",
            "    answers: JSON.stringify(task.answers||[]),",
            "    recId:'', nvcVal:'', latLng:'',",
            "    projectId: (config && config.projectId) || '1756460958725101',",
            "    corpId: (config && config.corpId) || '1749721838789101',",
            "    projectTpl: (config && config.projectTpl) || '1756451075934101',",
            "    sponsorProjectId: (config && config.sponsorProjectId) || '1756451241652103',",
            "    isForward: 1,",
            "    title: (config && config.title) || '问卷调查',",
            "    way: '实名调查',",
            "    startTime: task.date,",
            "    memo: (config && config.memo) || '',",
            "    dcdxName: task.name,",
            "    fieldName: '性别',",
            "    fill: task.sex,",
            "    channelAddress: ''",
            "  };",
            "  if(Array.isArray(task.answers)){ task.answers.forEach((ans,i)=>{ if(ans!==undefined){ temp['answer'+i]=ans; } }); }",
            "  const formatted=formatParams(temp);",
            "  const encrypted=toQueryString(formatted);",
            "  const finalText=encrypted.length>255?encrypted.substring(0,255):encrypted;",
            "  return { data: temp, encryptedText: finalText };",
            "}",
            "self.addEventListener('message', async function(e){",
            "  const msg=e.data||{}; const type=msg.type; const payload=msg.data||{};",
            "  if(type==='BATCH_CREATE'){",
            "    const tasks=payload.tasks||[]; const config=payload.config||{}; const interval=payload.interval||5000;",
            "    let successCount=0, failCount=0;",
            "    self.postMessage({type:'BATCH_START', total: tasks.length});",
            "    for(let i=0;i<tasks.length;i++){",
            "      const t=tasks[i];",
            "      try{",
            "        const salt=await getSalt(config);",
            "        const req=buildRequestData(t, config);",
            "        const signature=await hmacSHA256Hex(req.encryptedText, salt.signkey);",
            "        const url=(config && config.apiEndpoint) || '/lgb/xfzwj/add';",
            "        const body=encodeForm(req.data);",
            "        const res=await fetch(url,{method:'POST',credentials:'include',headers:{",
            "          'accept':'*/*','content-type':'application/x-www-form-urlencoded; charset=UTF-8',",
            "          'x-requested-with':'XMLHttpRequest','sign':signature,'signkey':salt.signkey",
            "        }, body: body});",
            "        const json=await res.json().catch(()=>({}));",
            "        successCount++;",
            "        self.postMessage({type:'TASK_COMPLETE', data:{ taskData:t, result:json }});",
            "      }catch(err){",
            "        failCount++;",
            "        self.postMessage({type:'TASK_ERROR', data:{ taskData:t, error: (err && err.message) ? err.message : String(err) }});",
            "      }",
            "      self.postMessage({type:'BATCH_PROGRESS', data:{ current:i+1, total:tasks.length, successCount:successCount, failCount:failCount }});",
            "      if(i<tasks.length-1){ await new Promise(r=>setTimeout(r, interval)); }",
            "    }",
"    self.postMessage({type:'BATCH_COMPLETE', successCount:successCount, failCount:failCount, total:batchTasks.length, data:{ successCount:successCount, failCount:failCount, total:batchTasks.length }});",
            "  }",
            "});",
            "self.postMessage({type:'WORKER_READY', message:'Inline Worker ready'});"
        ].join('\n');

        const blob = new Blob([WORKER_JS], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);

        apiWorker = new Worker(workerUrl);
        // 监听Worker消息
        apiWorker.addEventListener('message', handleWorkerMessage);
        // 监听Worker错误
        apiWorker.addEventListener('error', function(error) {
            console.error('❌ Worker错误:', error);
            useWorkerMode = false;
        });

        console.log('✅ 已使用内联 Worker 启用后台执行');
        useWorkerMode = true;
        return true;
    } catch (error) {
        console.error('❌ 初始化内联 Worker 失败:', error);
        useWorkerMode = false;
        return false;
    }
}

// 处理Worker消息
function handleWorkerMessage(e) {
    const { type, data } = e.data;
    
    switch(type) {
        case 'WORKER_READY':
            workerReady = true;
            console.log('✅ Worker就绪:', e.data.message);
            break;
            
        case 'TASK_COMPLETE':
            console.log(\`✅ [Worker] 任务完成: \${data.taskData.name}\`);
            break;
            
        case 'TASK_ERROR':
            console.error(\`❌ [Worker] 任务失败: \${data.taskData.name}\`, data.error);
            break;
            
        case 'BATCH_PROGRESS':
            console.log(\`📋 [Worker] 进度: \${data.current}/\${data.total} (成功: \${data.successCount}, 失败: \${data.failCount})\`);
            break;
            
        case 'BATCH_COMPLETE':
            console.log(\`🎉 [Worker] 批量完成! 成功: \${data.successCount}, 失败: \${data.failCount}\`);
            break;
    }
}

// 切换Worker模式
function toggleWorkerMode(enable) {
    if (enable && !useWorkerMode) {
        return initWorkerMode();
    } else if (!enable && useWorkerMode) {
        if (apiWorker) {
            apiWorker.terminate();
            apiWorker = null;
        }
        useWorkerMode = false;
        console.log('⚠️ Worker模式已关闭');
        return false;
    }
    return useWorkerMode;
}

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
async function automaticApi(targetDate = null, useWorker = false) {
    // 如果请求使用Worker模式
    if (useWorker && !useWorkerMode) {
        initWorkerMode();
    }
    
    // 如果Worker模式可用，使用Worker执行
    if (useWorkerMode && apiWorker && workerReady) {
        return automaticApiWithWorker(targetDate);
    }
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

            // 添加延迟避免请求过快（使用可配置的间隔）
            console.log(\`⏱️ 等待 \${(apiRequestInterval/1000).toFixed(1)}秒 后处理下一个任务...\`);
            await new Promise(resolve => setTimeout(resolve, apiRequestInterval));
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

// 使用Worker模式自动执行任务
async function automaticApiWithWorker(targetDate = null) {
    if (isRunning) {
        console.log('⚠️ 已有任务在运行中');
        return;
    }

    // 确保已初始化内联Worker；若不可用则自动回退到非Worker API模式
    if (!useWorkerMode || !apiWorker) {
        const ok = initWorkerMode();
        if (!ok || !apiWorker) {
            console.warn('⚠️ Worker 不可用，自动回退到非Worker的 API 模式');
            return automaticApi(targetDate);
        }
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
    console.log(\`🚀 [Worker模式] 开始API自动执行，共 \${dataToProcess.length} 个任务\`);
    console.log(\`⏱️ 使用间隔: \${(apiRequestInterval/1000).toFixed(1)}秒\`);
    
    // 准备任务数据
    const tasks = dataToProcess.map(item => ({
        name: item.name,
        sex: item.sex,
        date: \`\${year}-\${date.replace('.', '-')}\`,
        answers: getAnswersArray()
    }));
    
    // 发送批量任务到Worker
    apiWorker.postMessage({
        type: 'BATCH_CREATE',
        data: {
            tasks: tasks,
            config: {
                apiEndpoint: config.apiEndpoint || '/lgb/project/submitOne',
                projectId: config.projectId || '1756460958725101',
                corpId: config.corpId || '1749721838789101',
                projectTpl: config.projectTpl || '1756451075934101',
                sponsorProjectId: config.sponsorProjectId || '1756451241652103',
                title: config.title || '问卷调查',
                memo: config.memo || ''
            },
            interval: apiRequestInterval
        }
    });
    
    // 等待Worker完成
    return new Promise((resolve) => {
        const handleComplete = (e) => {
            if (e.data.type === 'BATCH_COMPLETE') {
                isRunning = false;
                apiWorker.removeEventListener('message', handleComplete);
                
                console.log(\`📊 [Worker] 执行完成: 成功 \${e.data.successCount} 个, 失败 \${e.data.failCount} 个\`);
                
                // 自动验证
                if (typeof validateData === 'function') {
                    console.log('🔍 开始自动验证...');
                    validateData();
                }
                
                resolve({
                    success: e.data.successCount,
                    fail: e.data.failCount,
                    total: e.data.total
                });
            }
        };
        
        apiWorker.addEventListener('message', handleComplete);
    });
}

// 获取答案数组
function getAnswersArray() {
    const answersArray = [];
    for (let i = 0; i < 10; i++) {
        const answerFunc = window[\`_answer\${i}\`];
        if (typeof answerFunc === 'function') {
            answersArray[i] = answerFunc();
        }
    }
    return answersArray;
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
