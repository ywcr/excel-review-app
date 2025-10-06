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
async function createTask(name, sex, taskDate) {
    return new Promise((resolve, reject) => {
        // 确定实施日期
        const implementDate = taskDate || date;
        const implementYear = (new Date()).getFullYear();
        const formattedDate = \`\${implementYear}-\${implementDate.replace('.', '-')}\`;
        
        // 根据配置确定姓名标签
        const nameLabel = config.labelName || '姓名';
        
        // 设置基本信息
        setInputValue(nameLabel, name);
        setInputValue('性别', sex);
        setInputValue('实施日期', formattedDate);
        
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
        
        // 提交表单 - 等待5秒后提交（参考原HTML实现）
        setTimeout(() => {
            // 尝试两种选择器
            let submitBtn = contentWindow.document.querySelector('.btn-over button');
            if (!submitBtn) {
                submitBtn = contentWindow.document.querySelector('button[lay-submit]');
            }
            
            if (submitBtn) {
                submitBtn.click();
                console.log(\`✅ 已提交: \${name} (\${sex}) - \${formattedDate}\`);
                
                // 等待10秒确保页面刷新完成
                setTimeout(() => {
                    console.log(\`⏳ 页面刷新完成，准备下一个任务\`);
                resolve();
                }, 10000);
            } else {
                console.error('❌ 找不到提交按钮');
                reject(new Error('找不到提交按钮'));
            }
        }, 5000); // 填表后等待5秒再提交
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
    
    // 首次执行时检查并更新问卷内容
    if (currentIndex === 0 && typeof initializeQuestionnaireContent === 'function') {
        try {
            await initializeQuestionnaireContent();
        } catch (error) {
            console.warn('⚠️ 问卷内容检查失败，继续使用默认配置:', error);
        }
    }
    
    const item = data[currentIndex];
    
    try {
        console.log(\`[DOM] 开始处理第 \${currentIndex + 1}/\${data.length} 个: \${item.name} (\${item.sex}) - \${item.time}\`);
        await createTask(item.name, item.sex, item.time);
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
    
    // 执行前检查并更新问卷内容
    if (typeof initializeQuestionnaireContent === 'function') {
        try {
            await initializeQuestionnaireContent();
        } catch (error) {
            console.warn('⚠️ 问卷内容检查失败，继续使用默认配置:', error);
        }
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < dataToProcess.length; i++) {
        const item = dataToProcess[i];
        
        try {
            console.log(\`[DOM] 处理第 \${i + 1}/\${dataToProcess.length} 个: \${item.name} (\${item.sex}) - \${item.time}\`);
            await createTask(item.name, item.sex, item.time);
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
let isPaused = false;
let shouldStop = false;
let apiRequestInterval = 5000; // 默认间隔5秒，可通过setApiInterval调整

// 执行统计
let executionStats = {
    total: 0,
    current: 0,
    success: 0,
    failed: 0,
    startTime: null
};

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

// 重置执行进度
function resetProgress() {
    currentIndex = 0;
    executionStats = { total: 0, current: 0, success: 0, failed: 0, startTime: null };
    console.log('✅ 进度已重置，将从第1个任务开始执行');
    updateProgressDisplay();
}

// 设置起始位置
function setStartPosition(position) {
    if (!data || data.length === 0) {
        console.error('❌ 没有数据可处理');
        return;
    }
    
    if (typeof position === 'number') {
        // 按索引（从1开始）
        const newIndex = Math.max(0, Math.min(position - 1, data.length - 1));
        currentIndex = newIndex;
        console.log(\`✅ 起始位置已设置为第 \${position} 个: \${data[newIndex].name}\`);
    } else if (typeof position === 'string') {
        // 按姓名查找
        const foundIndex = data.findIndex(item => item.name === position);
        if (foundIndex !== -1) {
            currentIndex = foundIndex;
            console.log(\`✅ 起始位置已设置为「\${position}」(第 \${foundIndex + 1} 个)\`);
        } else {
            console.error(\`❌ 未找到姓名「\${position}」\`);
        }
    } else {
        console.error('❌ 无效的位置参数，请输入数字（索引）或字符串（姓名）');
    }
}

// 暂停执行
function pauseExecution() {
    if (!isRunning) {
        console.warn('⚠️ 当前没有任务在执行');
        return;
    }
    isPaused = true;
    console.log('⏸️ 已暂停执行');
    updateProgressDisplay();
}

// 继续执行
function resumeExecution() {
    if (!isRunning) {
        console.warn('⚠️ 当前没有任务在执行');
        return;
    }
    if (!isPaused) {
        console.warn('⚠️ 任务未暂停');
        return;
    }
    isPaused = false;
    console.log('▶️ 继续执行');
    updateProgressDisplay();
}

// 停止执行
function stopExecution() {
    if (!isRunning) {
        console.warn('⚠️ 当前没有任务在执行');
        return;
    }
    shouldStop = true;
    isPaused = false;
    console.log('⏹️ 正在停止执行...');
    updateProgressDisplay();
}

// 更新进度显示
function updateProgressDisplay() {
    // 触发自定义事件，通知控制面板更新
    if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('executionStatsUpdate', { 
            detail: { 
                ...executionStats, 
                isRunning, 
                isPaused, 
                shouldStop 
            } 
        }));
    }
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
            "function formatParams(arys){ let newkey=Object.keys(arys).sort(); let newObj=Array.isArray(arys)?[]:{};  for(let i=0;i<newkey.length;i++){ let currentValue=arys[newkey[i]]; if(typeof currentValue==='object'){ if(Array.isArray(currentValue)){ let isArrObject=(currentValue||[]).every(i=>Object.prototype.toString.call(i)==='[object Object]'); if(isArrObject){ newObj[newkey[i]]=formatParams(currentValue); }else{ newObj[newkey[i]]=currentValue; } }else{ newObj[newkey[i]]=formatParams(currentValue); } }else{ newObj[newkey[i]]=currentValue; } } return newObj; }",
            "function toQueryString(obj){ const part=[]; for(const [key,value] of Object.entries(obj)){ if(typeof value==='object'){ part.push(key+'='+JSON.stringify(value)); }else{ part.push(key+'='+value); } } return part.join('&'); }",
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
        ].join('\\n');

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
async function createTaskApi(name, sex, taskDate) {
    try {
        // 确定实施日期
        const implementDate = taskDate || date;
        const implementYear = (new Date()).getFullYear();
        const formattedDate = \`\${implementYear}-\${implementDate.replace('.', '-')}\`;
        
        // 获取动态盐值
        const saltData = await createDynamicsSalt();
        
        // 构建请求数据
        const requestData = {
            name: name,
            sex: sex,
            date: formattedDate,
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
        
        // 从页面提取问卷结构（questions, options, types）和项目参数
        // 获取 contentWindow（可能在 iframe 中或直接在当前页面）
        let targetWindow = window;
        
        // 优先使用 DOM 模式定义的 contentWindow
        if (typeof contentWindow !== 'undefined' && contentWindow) {
            targetWindow = contentWindow;
        } 
        // 否则尝试查找 iframe
        else {
            const iframe = document.querySelector('#ssfwIframe') || 
                          document.querySelector('iframe[src*="xfzwj"]') ||
                          document.querySelector('iframe[src*="hzwj"]') ||
                          document.querySelector('iframe[src*="yswj"]') ||
                          document.querySelector('iframe[src*="dywj"]');
            if (iframe && iframe.contentWindow) {
                targetWindow = iframe.contentWindow;
            }
        }
        
        console.log('🔍 目标窗口:', targetWindow === window ? '当前窗口' : 'iframe窗口');
        
        // 读取问卷结构字段
        const questionsInput = targetWindow.document.querySelector('input[name="questions"]');
        const optionsInput = targetWindow.document.querySelector('input[name="options"]');
        const typesInput = targetWindow.document.querySelector('input[name="types"]');
        
        const questionsValue = questionsInput ? questionsInput.value : '';
        const optionsValue = optionsInput ? optionsInput.value : '';
        const typesValue = typesInput ? typesInput.value : '';
        
        if (!questionsValue || !optionsValue || !typesValue) {
            console.warn('⚠️ 问卷结构字段缺失:', {
                hasQuestions: !!questionsValue,
                hasOptions: !!optionsValue,
                hasTypes: !!typesValue,
                questionsLength: questionsValue.length,
                optionsLength: optionsValue.length,
                typesLength: typesValue.length
            });
            console.warn('💡 请确保在问卷页面（xfzwj.jsp等）的 iframe 内执行脚本');
        }
        
        // ⚠️ 重要：从页面实时读取项目参数（而非使用硬编码默认值）
        // 这些参数必须与当前问卷页面的配置完全一致，否则会导致"系统异常"
        const getInputValue = (name, fallback = '') => {
            const input = targetWindow.document.querySelector(\`input[name="\${name}"]\`);
            return input ? input.value : fallback;
        };
        
        // 辅助函数：从URL获取projectId（与验证功能保持一致）
        const getProjectIdFromUrl = () => {
            // 方法1: 从当前页面URL获取
            const urlParams = new URLSearchParams(window.location.search);
            let id = urlParams.get('projectId');
            if (id) return id;
            
            // 方法2: 从iframe的URL获取
            const iframe = document.querySelector('#ssfwIframe') || 
                          document.querySelector('iframe[src*="xfzwj"]') ||
                          document.querySelector('iframe[src*="hzwj"]') ||
                          document.querySelector('iframe[src*="yswj"]') ||
                          document.querySelector('iframe[src*="dywj"]');
            if (iframe) {
                try {
                    const iframeSrc = iframe.contentWindow.location.href;
                    const iframeParams = new URLSearchParams(iframeSrc.split('?')[1]);
                    id = iframeParams.get('projectId');
                    if (id) return id;
                } catch (e) {
                    // 跨域限制，尝试从src属性获取
                    const src = iframe.getAttribute('src');
                    if (src) {
                        const srcParams = new URLSearchParams(src.split('?')[1]);
                        id = srcParams.get('projectId');
                        if (id) return id;
                    }
                }
            }
            return null;
        };
        
        // 优先从隐藏字段读取，如果失败则从URL获取
        let projectId = getInputValue('projectId', '');
        if (!projectId || projectId === config.projectId) {
            const urlProjectId = getProjectIdFromUrl();
            if (urlProjectId) {
                console.log('📋 从URL获取projectId:', urlProjectId);
                projectId = urlProjectId;
            } else {
                projectId = config.projectId || "1756460958725101";
            }
        }
        
        const corpId = getInputValue('corpId', config.corpId || "1749721838789101");
        const projectTpl = getInputValue('projectTpl', config.projectTpl || "1756451075934101");
        const sponsorProjectId = getInputValue('sponsorProjectId', config.sponsorProjectId || "1756451241652103");
        const title = getInputValue('title', config.title || "致力庆西黄丸消费者问卷");
        const memo = getInputValue('memo', config.memo || "为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。");
        const way = getInputValue('way', "实名调查");
        // ⚠️ 关键：dcdxName（调查对象姓名）必须有值
        // 如果页面隐藏字段为空，使用 config.dcdxName 或当前调查对象的 name
        let dcdxName = getInputValue('dcdxName', '');
        if (!dcdxName || dcdxName.trim() === '') {
            dcdxName = config.dcdxName || name;
            console.log('📝 dcdxName 为空，使用默认值:', dcdxName);
        }
        const channelAddress = getInputValue('channelAddress', '');
        const latLng = getInputValue('latLng', '');
        const recId = getInputValue('recId', '');
        
        // ⚠️ 关键：获取 nvcVal（无痕验证值）
        // 与原项目一致：优先通过 window.nvc.getNVCValAsync 获取；不可用时回退到隐藏字段
        // ⚠️ 关键：每个请求都必须获取新的 nvcVal（nvcVal 是一次性的！）
        const nvcValHidden = getInputValue('nvcVal', '');
        let nvcVal = '';
        try {
            const nvcObj = targetWindow && targetWindow.nvc;
            if (nvcObj && typeof nvcObj.getNVCValAsync === 'function') {
                // 强制重新获取新的 nvcVal
                nvcVal = await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        console.warn('⚠️ getNVCValAsync 超时，使用hidden input值');
                        resolve(nvcValHidden);
                    }, 3000);
                    
                    try {
                        nvcObj.getNVCValAsync(function(val) {
                            clearTimeout(timeout);
                            if (val) {
                                console.log(\`✅ [\${name}] 获取新的 nvcVal 成功\`);
                                resolve(val);
                            } else {
                                console.warn(\`⚠️ [\${name}] getNVCValAsync 返回空值\`);
                                resolve(nvcValHidden);
                            }
                        });
                    } catch (e) {
                        clearTimeout(timeout);
                        console.warn(\`⚠️ [\${name}] getNVCValAsync 失败:\`, e);
                        resolve(nvcValHidden);
                    }
                });
            } else {
                console.warn(\`⚠️ [\${name}] window.nvc 不可用，使用hidden input（可能失败）\`);
                nvcVal = nvcValHidden;
            }
        } catch (e) {
            console.warn(\`⚠️ [\${name}] 获取nvcVal异常:\`, e);
            nvcVal = nvcValHidden;
        }
        
        if (!nvcVal) {
            console.error(\`❌ [\${name}] nvcVal 为空！将导致验签失败\`);
        }
        if (!nvcVal) {
            console.warn('⚠️ 未检测到 nvcVal（无痕验证值），可能导致提交失败');
        }
        
        console.log('📋 从页面读取的项目参数:', {
            projectId: projectId ? projectId.substring(0, 10) + '...' : '(空)',
            corpId: corpId ? corpId.substring(0, 10) + '...' : '(空)',
            title: title ? title.substring(0, 20) + '...' : '(空)',
            hasNvcVal: !!nvcVal,
            hasQuestions: !!questionsValue,
            hasOptions: !!optionsValue,
            hasTypes: !!typesValue
        });
        
        // 如果关键参数缺失，给出明确提示并终止执行
        if (!questionsValue || !optionsValue || !typesValue) {
            console.error('❌ 问卷结构字段缺失，无法继续执行！');
            console.error('💡 解决方案：');
            console.error('   1. 确保在问卷页面（如 xfzwj.jsp）内执行');
            console.error('   2. 或者在外层页面先打开问卷 iframe');
            console.error('   3. 检查 iframe 选择器是否正确');
            throw new Error('问卷结构字段缺失 (questions/options/types)，无法生成正确的签名');
        }
        
        if (!projectId || projectId === config.projectId) {
            console.warn('⚠️ projectId 使用了默认值，可能不是当前问卷的正确ID');
        }
        
        // 检查 corpId 是否正确（不应该使用旧的默认值）
        if (corpId === '1749721838789101') {
            console.error('❌ corpId 使用了错误的默认值！');
            console.error('💡 当前 corpId:', corpId);
            console.error('💡 这会导致验签失败或系统异常');
        }
        
        // 将答案数组转换为 # 分隔的字符串（与手动请求格式一致）
        const answersString = answersArray.filter(a => a !== undefined).join('#');
        
        // 先构建用于签名的数据结构（排除 fieldName, fill, nvcVal）
        const paramsForSign = {
            // 基本信息
            name: requestData.name,
            sex: requestData.sex,
            date: requestData.date,
            answers: answersString,

            // 项目字段（从页面实时读取）
            recId: recId,
            // nvcVal: nvcVal,  // 排除：不参与签名
            latLng: latLng,
            projectId: projectId,
            corpId: corpId,
            projectTpl: projectTpl,
            sponsorProjectId: sponsorProjectId,
            isForward: 1,
            title: title,
            way: way,
            startTime: requestData.date,
            memo: memo,
            dcdxName: dcdxName,
            // fieldName: "性别",  // 排除：不参与签名
            // fill: requestData.sex,  // 排除：不参与签名
            channelAddress: channelAddress,
            // 注意：根据原项目 dcwj.js，questions/options/types 参与签名
            questions: questionsValue,
            options: optionsValue,
            types: typesValue
        };

        // 按原项目规则：剔除空值键（value === ''）
        const cleanedParamsForSign = {};
        Object.keys(paramsForSign).forEach(function(k){
            const v = paramsForSign[k];
            if (v !== undefined && v !== null && v !== '') {
                cleanedParamsForSign[k] = v;
            }
        });

        // 添加所有 answerN 到签名（包括多选题）
        // ⚠️ 重要发现：手动创建时，jQuery serialize() 会包含所有 answerN，包括多选题
        // 之前认为多选题不应该包含 answerN 是错误的！
        requestData.answers.forEach((answer, index) => {
            if (answer !== undefined && answer !== '') {
                cleanedParamsForSign[\`answer\${index}\`] = answer;
                if (typesValue) {
                    const typeList = typesValue.split('#');
                    const typeName = (typeList[index] || '').trim();
                    console.log(\`  ✅ answer\${index} (\${typeName}): 加入签名\`);
                } else {
                    console.log(\`  ✅ answer\${index}: 加入签名\`);
                }
            }
        });

        // 格式化参数并生成encryptedText（用于签名验证）
        console.log('📋 签名前的参数对象 keys:', Object.keys(cleanedParamsForSign).sort());
        const formattedData = formatParams(cleanedParamsForSign);
        console.log('📋 formatParams 后的 keys:', Object.keys(formattedData));
        const encryptedText = toQueryString(formattedData);
        console.log('📝 完整 encryptedText 长度:', encryptedText.length);
        console.log('📝 完整 encryptedText (前200字符):', encryptedText.substring(0, 200));
        
        // 检查 questions/options/types 的长度
        const qotLength = (questionsValue.length + optionsValue.length + typesValue.length);
        console.log('📊 questions/options/types 总长度:', qotLength);
        if (qotLength > 500) {
            console.warn('⚠️ questions/options/types 字段过长，可能导致关键参数被截断');
        }
        
        // ⚠️ 重要：必须截取前255字符（与后端dcwj.js保持一致）
        // 后端会使用相同的逻辑重新生成encryptedText并验签
        const finalEncryptedText = encryptedText.length > 255 ? encryptedText.substring(0, 255) : encryptedText;

        console.log('📝 截取后 encryptedText 长度:', finalEncryptedText.length);
        if (encryptedText.length > 255) {
            console.warn('⚠️ encryptedText 超过255字符，已截取前255字符用于签名');
            console.log('📝 截取后 encryptedText:', finalEncryptedText);
        }

        // ⚠️ 关键：签名使用截断后的encryptedText，但发送时使用完整的encryptedText
        // 生成签名（使用截断后的encryptedText）
        const signature = generateSign(finalEncryptedText, saltData.signkey);

        console.log('🔐 签名参数:', {
            dataLength: finalEncryptedText.length,
            keyLength: saltData.signkey.length,
            key: saltData.signkey.substring(0, 5) + '...'
        });
        console.log('🔑 签名生成成功:', signature.substring(0, 16) + '...');

        // 准备请求数据，按照参考API的格式构建（使用从页面读取的实时值）
        const ajaxData = {
            // 基本信息
            name: requestData.name,
            sex: requestData.sex,
            date: requestData.date,

            // 答案数据 - 使用 # 分隔的字符串格式
            answers: answersString,

            // 必要的项目字段（从页面实时读取）
            recId: recId,
            nvcVal: nvcVal,  // ⚠️ 关键：滑块验证值
            latLng: latLng,
            projectId: projectId,
            corpId: corpId,
            projectTpl: projectTpl,
            sponsorProjectId: sponsorProjectId,
            isForward: 1,
            title: title,
            way: way,
            startTime: requestData.date,
            memo: memo,
            dcdxName: dcdxName,
            fieldName: "性别",
            fill: requestData.sex,
            channelAddress: channelAddress,
            
            // 添加问卷结构字段
            questions: questionsValue,
            options: optionsValue,
            types: typesValue
            
            // ⚠️ 重要：不发送encryptedText字段！
            // 后端会根据接收到的参数重新生成encryptedText并验签
            // 我们只需要在headers中发送signature即可
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
        // 情况1: 响应直接是数字（如：1）
        if (typeof result === 'number') {
            if (result === 0 || result === 1 || result === 200) {
                console.log(\`✅ API创建成功: \${name} (\${sex})\`, { code: result });
                return { success: true, data: { code: result } };
            } else {
                console.error(\`❌ API返回错误码: \${result}\`);
                throw new Error(\`API返回错误码: \${result}\`);
            }
        }
        
        // 情况2: 响应是对象
        const code = result.code || result.errCode;
        const message = result.message || result.errMsg;

        // 检查是否成功
        // 支持多种成功响应码：0, 1, 200
        if (code === 0 || code === '0' || code === 1 || code === '1' || code === 200 || code === '200') {
            console.log(\`✅ API创建成功: \${name} (\${sex})\`, { code, message });
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
        console.error(\`❌ API返回未知状态码: \${code}, 消息: \${message}\`);
        throw new Error(\`API返回错误: \${message || '未知错误'} (code: \${code})\`);
    } catch (error) {
        console.error(\`❌ API创建失败: \${name}\`, error);
        throw error;
    }
}

// 手动执行单个任务（API模式）
async function startApi(startFrom = null) {
    if (isRunning) {
        console.log('⚠️ 已有任务在运行中');
        return;
    }
    
    // 处理起始位置
    if (startFrom !== null) {
        if (typeof startFrom === 'number') {
            // 按索引（从1开始）
            currentIndex = Math.max(0, Math.min(startFrom - 1, data.length - 1));
            console.log(\`📍 从第 \${startFrom} 个开始执行\`);
        } else if (typeof startFrom === 'string') {
            // 按姓名查找
            const foundIndex = data.findIndex(item => item.name === startFrom);
            if (foundIndex !== -1) {
                currentIndex = foundIndex;
                console.log(\`📍 从「\${startFrom}」开始执行（第 \${foundIndex + 1} 个）\`);
            } else {
                console.warn(\`⚠️ 未找到姓名「\${startFrom}」，从当前位置继续\`);
            }
        }
    }
    
    if (currentIndex >= data.length) {
        console.log('✅ 所有任务已完成');
        return;
    }
    
    isRunning = true;
    
    // 首次执行时检查并更新问卷内容
    if (currentIndex === 0 && typeof initializeQuestionnaireContent === 'function') {
        try {
            await initializeQuestionnaireContent();
        } catch (error) {
            console.warn('⚠️ 问卷内容检查失败，继续使用默认配置:', error);
        }
    }
    
    const item = data[currentIndex];
    
    try {
        console.log(\`[API] 开始处理第 \${currentIndex + 1}/\${data.length} 个: \${item.name} (\${item.sex}) - \${item.time}\`);
        const result = await createTaskApi(item.name, item.sex, item.time);

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

// 快速批量执行（API模式 - 并发）
async function automaticApiFast(batchSize = 10, targetDate = null, startFrom = null) {
    if (!data || data.length === 0) {
        console.error('❌ 没有数据可处理');
        return;
    }
    
    if (isRunning) {
        console.warn('⚠️ 已有任务在运行中');
        return;
    }
    
    isRunning = true;
    isPaused = false;
    shouldStop = false;
    
    console.log('');
    console.log('='.repeat(60));
    console.log('🚀 快速批量执行模式（并发）');
    console.log('📦 批次大小:', batchSize, '个/批');
    console.log('⚠️  注意: 并发模式速度快，但可能对服务器压力较大');
    console.log('💡 提示: 可使用 pauseExecution() / stopExecution() 控制执行');
    console.log('='.repeat(60));
    
    // 初始化问卷内容
    if (typeof initializeQuestionnaireContent === 'function') {
        try {
            console.log('📋 检查问卷内容是否需要更新...');
            await initializeQuestionnaireContent();
        } catch (error) {
            console.warn('⚠️ 问卷内容检查失败，继续使用默认配置:', error);
        }
    }
    
    // 筛选数据
    let dataToProcess = data;
    if (targetDate) {
        const formattedDate = formatDateForFilter(targetDate);
        dataToProcess = data.filter(item => item.time === formattedDate);
        console.log(\`📅 筛选日期: \${targetDate} -> 找到 \${dataToProcess.length} 条数据\`);
    }
    
    // 记录原始总数（用于日志显示）
    const originalTotal = dataToProcess.length;
    
    // 处理起始位置
    // 如果没有明确指定 startFrom，则使用 currentIndex（由 setStartPosition 设置）
    let startIndex = 0;
    if (startFrom !== null) {
        if (typeof startFrom === 'number') {
            // 按索引（从1开始）
            startIndex = Math.max(0, Math.min(startFrom - 1, dataToProcess.length - 1));
            console.log(\`📍 从第 \${startFrom} 个开始执行（共 \${dataToProcess.length} 个任务）\`);
        } else if (typeof startFrom === 'string') {
            // 按姓名查找
            const foundIndex = dataToProcess.findIndex(item => item.name === startFrom);
            if (foundIndex !== -1) {
                startIndex = foundIndex;
                console.log(\`📍 从「\${startFrom}」开始执行（第 \${foundIndex + 1}/\${dataToProcess.length} 个）\`);
            } else {
                console.warn(\`⚠️ 未找到姓名「\${startFrom}」，从头开始\`);
            }
        }
    } else if (currentIndex > 0) {
        // 使用 setStartPosition 设置的 currentIndex
        startIndex = Math.max(0, Math.min(currentIndex, dataToProcess.length - 1));
        console.log(\`📍 使用已设置的起始位置：第 \${startIndex + 1} 个\`);
    }
    
    // 截取从起始位置开始的数据
    if (startIndex > 0) {
        dataToProcess = dataToProcess.slice(startIndex);
        console.log(\`📊 实际处理 \${dataToProcess.length} 条数据（跳过前 \${startIndex} 条）\`);
    }
    
    if (dataToProcess.length === 0) {
        console.log('📭 没有需要处理的数据');
        isRunning = false;
        return;
    }
    
    // 初始化统计（使用实际处理的数据量）
    executionStats = {
        total: dataToProcess.length,  // 使用切片后的长度
        current: 0,
        success: 0,
        failed: 0,
        startTime: Date.now(),
        startIndex: startIndex  // 记录起始索引，用于显示绝对位置
    };
    updateProgressDisplay();
    
    let successCount = 0;
    let failCount = 0;
    let quotaReached = false;
    let criticalError = false;
    
    try {
        // 分批处理
        for (let i = 0; i < dataToProcess.length; i += batchSize) {
            // 检查是否需要停止
            if (shouldStop) {
                console.log('⏹️ 用户请求停止执行');
                break;
            }
            
            // 检查是否暂停
            while (isPaused && !shouldStop) {
                console.log('⏸️ 执行已暂停，等待继续...');
                updateProgressDisplay();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            if (quotaReached || criticalError) break;
        
        const batch = dataToProcess.slice(i, Math.min(i + batchSize, dataToProcess.length));
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(dataToProcess.length / batchSize);
        
        console.log('');
        console.log(\`📦 批次 \${batchNum}/\${totalBatches}: 处理 \${batch.length} 个任务\`);
        
        // 并发执行当前批次
        // ⚠️ 关键修复：每个请求之间添加500ms延迟，避免并发获取盐值导致覆盖
        const promises = batch.map(async (item, idx) => {
            const globalIdx = i + idx;
            
            // 批次内的每个请求错开500ms，避免盐值竞态
            if (idx > 0) {
                await new Promise(resolve => setTimeout(resolve, idx * 500));
            }
            
            try {
                console.log(\`[API] [\${globalIdx + 1}/\${dataToProcess.length}] 开始: \${item.name} (\${item.sex}) - \${item.time}\`);
                const result = await createTaskApi(item.name, item.sex, item.time);
                
                // 检查是否达标
                if (result && result.isQuotaReached) {
                    quotaReached = true;
                    console.log(\`🎯 [\${globalIdx + 1}/\${dataToProcess.length}] 任务数量已达标: \${item.name}\`);
                    return { success: false, name: item.name, quotaReached: true };
                }
                
                console.log(\`✅ [\${globalIdx + 1}/\${dataToProcess.length}] 完成: \${item.name}\`);
                return { success: true, name: item.name };
            } catch (error) {
                const errorMsg = error.message || error;
                console.error(\`❌ [\${globalIdx + 1}/\${dataToProcess.length}] 失败: \${item.name}\`, error);
                
                // 检查是否是严重错误（问卷结构缺失等）
                if (errorMsg.includes('问卷结构字段缺失') || errorMsg.includes('questions/options/types')) {
                    criticalError = true;
                    console.error('🛑 检测到严重错误，停止执行！');
                    console.error('💡 请确保在正确的问卷页面内执行');
                    return { success: false, name: item.name, error: true, critical: true };
                }
                
                return { success: false, name: item.name, error: true };
            }
        });
        
        // 等待当前批次完成
        const results = await Promise.all(promises);
        
        // 统计结果
        results.forEach(result => {
            executionStats.current++;
            if (result.success) {
                successCount++;
                executionStats.success++;
            } else {
                failCount++;
                executionStats.failed++;
            }
        });
        
        // 更新进度
        updateProgressDisplay();
        
        console.log(\`📊 批次 \${batchNum} 完成: 成功 \${results.filter(r => r.success).length}, 失败 \${results.filter(r => !r.success).length}\`);
        
        // 检查是否有严重错误
        if (criticalError) {
            console.error('🛑 检测到严重错误，立即停止执行！');
            break;
        }
        
        // 如果检测到达标，停止处理
        if (quotaReached) {
            console.log('🎯 检测到任务数量已达标，停止处理');
            break;
        }
        
        // 批次间短暂延迟，避免服务器压力过大（使用可配置的间隔或默认200ms）
        if (i + batchSize < dataToProcess.length && !shouldStop && !criticalError) {
            const batchInterval = Math.min(apiRequestInterval, 500); // 批次间延迟不超过0.5秒
            console.log(\`⏱️  批次间延迟 \${(batchInterval/1000).toFixed(1)}秒...\`);
            await new Promise(resolve => setTimeout(resolve, batchInterval));
        }
    }
    } finally {
        isRunning = false;
        isPaused = false;
        shouldStop = false;
        updateProgressDisplay();
    }
    
    console.log('');
    console.log('='.repeat(60));
    if (criticalError) {
        console.error('❌ 执行因严重错误而终止！');
    } else if (shouldStop) {
        console.log('⏹️ 执行已被用户停止！');
    } else {
        console.log('🎉 快速批量执行完成！');
    }
    console.log(\`📊 总计: 成功 \${successCount} 个, 失败 \${failCount} 个\`);
    if (quotaReached) {
        console.log(\`⏹️  剩余 \${dataToProcess.length - successCount - failCount} 个任务未处理（已达标）\`);
    }
    console.log('='.repeat(60));
}

// 自动执行所有任务（API模式）
async function automaticApi(targetDate = null, startFrom = null, useWorker = false) {
    // 如果请求使用Worker模式
    if (useWorker && !useWorkerMode) {
        initWorkerMode();
    }
    
    // 如果Worker模式可用，使用Worker执行
    if (useWorkerMode && apiWorker && workerReady) {
        return automaticApiWithWorker(targetDate, startFrom);
    }
    if (isRunning) {
        console.log('⚠️ 已有任务在运行中');
        return;
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('🚀 自动执行模式（串行，安全）');
    console.log('💡 提示: 可使用 pauseExecution() / stopExecution() 控制执行');
    console.log('='.repeat(60));
    
    // 如果指定了日期，只处理该日期的数据
    let dataToProcess = data;
    if (targetDate) {
        const formattedDate = formatDateForFilter(targetDate);
        dataToProcess = data.filter(item => item.time === formattedDate);
        console.log(\`📅 筛选日期: \${targetDate} -> 找到 \${dataToProcess.length} 条数据\`);
    }
    
    // 记录原始总数
    const originalTotal = dataToProcess.length;
    
    // 处理起始位置
    // 如果没有明确指定 startFrom，则使用 currentIndex（由 setStartPosition 设置）
    let startIndex = 0;
    if (startFrom !== null) {
        if (typeof startFrom === 'number') {
            // 按索引（从1开始）
            startIndex = Math.max(0, Math.min(startFrom - 1, dataToProcess.length - 1));
            console.log(\`📍 从第 \${startFrom} 个开始执行（共 \${dataToProcess.length} 个任务）\`);
        } else if (typeof startFrom === 'string') {
            // 按姓名查找
            const foundIndex = dataToProcess.findIndex(item => item.name === startFrom);
            if (foundIndex !== -1) {
                startIndex = foundIndex;
                console.log(\`📍 从「\${startFrom}」开始执行（第 \${foundIndex + 1}/\${dataToProcess.length} 个）\`);
            } else {
                console.warn(\`⚠️ 未找到姓名「\${startFrom}」，从头开始\`);
            }
        }
    } else if (currentIndex > 0) {
        // 使用 setStartPosition 设置的 currentIndex
        startIndex = Math.max(0, Math.min(currentIndex, dataToProcess.length - 1));
        console.log(\`📍 使用已设置的起始位置：第 \${startIndex + 1} 个\`);
    }
    
    // 截取从起始位置开始的数据
    if (startIndex > 0) {
        dataToProcess = dataToProcess.slice(startIndex);
        console.log(\`📊 实际处理 \${dataToProcess.length} 条数据（跳过前 \${startIndex} 条）\`);
    }
    
    if (dataToProcess.length === 0) {
        console.log('❌ 没有需要处理的数据');
        return;
    }
    
    isRunning = true;
    isPaused = false;
    shouldStop = false;
    
    // 初始化统计
    executionStats = {
        total: dataToProcess.length,
        current: 0,
        success: 0,
        failed: 0,
        startTime: Date.now(),
        startIndex: startIndex
    };
    updateProgressDisplay();
    
    // 执行前检查并更新问卷内容
    if (typeof initializeQuestionnaireContent === 'function') {
        try {
            await initializeQuestionnaireContent();
        } catch (error) {
            console.warn('⚠️ 问卷内容检查失败，继续使用默认配置:', error);
        }
    }
    
    let successCount = 0;
    let failCount = 0;
    let quotaReached = false;
    let criticalError = false;
    
    try {
    for (let i = 0; i < dataToProcess.length; i++) {
            // 检查是否需要停止
            if (shouldStop) {
                console.log('⏹️ 用户请求停止执行');
                break;
            }
            
            // 检查是否暂停
            while (isPaused && !shouldStop) {
                console.log('⏸️ 执行已暂停，等待继续...');
                updateProgressDisplay();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            if (quotaReached || criticalError) break;
            
        const item = dataToProcess[i];
        
        try {
                console.log(\`[API] [\${i + 1}/\${dataToProcess.length}] 开始: \${item.name} (\${item.sex}) - \${item.time}\`);
                const result = await createTaskApi(item.name, item.sex, item.time);

            // 检查是否是任务数量达标
            if (result && result.isQuotaReached) {
                    quotaReached = true;
                    console.log(\`🎯 任务数量已达标: \${item.name}\`);
                    break;
            }

            successCount++;
                executionStats.success++;
                console.log(\`✅ [\${i + 1}/\${dataToProcess.length}] 完成: \${item.name}\`);

            // 添加延迟避免请求过快（使用可配置的间隔）
                if (i < dataToProcess.length - 1 && !shouldStop && !quotaReached) {
                    console.log(\`⏱️ 等待 \${(apiRequestInterval/1000).toFixed(1)}秒...\`);
            await new Promise(resolve => setTimeout(resolve, apiRequestInterval));
                }
        } catch (error) {
                const errorMsg = error.message || error;
                console.error(\`❌ [\${i + 1}/\${dataToProcess.length}] 失败: \${item.name}\`, error);
                
                // 检查是否是严重错误
                if (errorMsg.includes('问卷结构字段缺失') || errorMsg.includes('questions/options/types')) {
                    criticalError = true;
                    console.error('🛑 检测到严重错误，停止执行！');
                    console.error('💡 请确保在正确的问卷页面内执行');
                    break;
                }
                
            failCount++;
                executionStats.failed++;
    }
    
            executionStats.current++;
            updateProgressDisplay();
        }
    } finally {
    isRunning = false;
        isPaused = false;
        shouldStop = false;
        updateProgressDisplay();
    }
    
    console.log('');
    console.log('='.repeat(60));
    if (criticalError) {
        console.error('❌ 执行因严重错误而终止！');
    } else if (shouldStop) {
        console.log('⏹️ 执行已被用户停止！');
    } else if (quotaReached) {
        console.log('🎯 任务数量已达标！');
    } else {
        console.log('🎉 执行完成！');
    }
    console.log(\`📊 总计: 成功 \${successCount} 个, 失败 \${failCount} 个\`);
    console.log('='.repeat(60));
    
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
        
        // 日期间隔延迟（使用可配置的间隔）
        if (dates.indexOf(targetDate) < dates.length - 1) {
            console.log('');
            console.log(\`等待 \${(apiRequestInterval/1000).toFixed(1)}秒后继续下一个日期...\`);
            await new Promise(resolve => setTimeout(resolve, apiRequestInterval));
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
