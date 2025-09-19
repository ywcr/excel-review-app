// ==================== Worker桥接方案 ====================
// 由于Worker不能使用jQuery，采用消息传递机制
// Worker负责任务调度，主线程负责实际的ajax请求

class WorkerBridge {
    constructor() {
        this.worker = null;
        this.pendingRequests = new Map();
        this.requestId = 0;
        this.isWorkerMode = false;
    }

    // 初始化Worker桥接
    init() {
        if (!this.worker) {
            this.worker = new Worker('/automation/js/api-worker-scheduler.js');
            this.setupMessageHandlers();
            this.isWorkerMode = true;
            console.log('✅ Worker桥接模式已启用');
        }
    }

    // 设置消息处理器
    setupMessageHandlers() {
        this.worker.addEventListener('message', async (e) => {
            const { type, data, requestId } = e.data;

            switch(type) {
                case 'REQUEST_AJAX':
                    // Worker请求主线程执行ajax
                    await this.handleAjaxRequest(data, requestId);
                    break;
                    
                case 'REQUEST_SALT':
                    // Worker请求获取盐值
                    await this.handleSaltRequest(data, requestId);
                    break;
                    
                case 'BATCH_PROGRESS':
                    // 进度更新
                    console.log(`📊 进度: ${data.current}/${data.total}`);
                    break;
                    
                case 'BATCH_COMPLETE':
                    // 批量完成
                    console.log(`🎉 批量完成! 成功: ${data.successCount}, 失败: ${data.failCount}`);
                    break;
            }
        });
    }

    // 处理ajax请求（使用jQuery）
    async handleAjaxRequest(data, requestId) {
        const { url, ajaxData, signature, signKey } = data;
        
        try {
            // 使用原生的jQuery ajax，保持所有原始配置
            const result = await new Promise((resolve, reject) => {
                $.ajax({
                    url: url,
                    type: "POST",
                    data: ajaxData,
                    headers: {
                        sign: signature,
                        signKey: signKey
                    },
                    traditional: true,  // 重要：保持jQuery的traditional参数
                    success: function(res) {
                        resolve(res);
                    },
                    error: function(xhr, status, error) {
                        reject(new Error(`请求失败: ${status} - ${error}`));
                    }
                });
            });

            // 发送响应给Worker
            this.worker.postMessage({
                type: 'AJAX_RESPONSE',
                requestId: requestId,
                success: true,
                data: result
            });
            
        } catch (error) {
            // 发送错误给Worker
            this.worker.postMessage({
                type: 'AJAX_ERROR',
                requestId: requestId,
                success: false,
                error: error.message
            });
        }
    }

    // 处理盐值请求
    async handleSaltRequest(data, requestId) {
        const { endpoint } = data;
        
        try {
            // 使用jQuery获取盐值，保证与原始代码一致
            const result = await new Promise((resolve, reject) => {
                $.ajax({
                    url: endpoint || '/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add',
                    type: "GET",
                    success: function(res) {
                        resolve(res);
                    },
                    error: function(xhr, status, error) {
                        reject(new Error(`获取盐值失败: ${status} - ${error}`));
                    }
                });
            });

            // 发送盐值给Worker
            this.worker.postMessage({
                type: 'SALT_RESPONSE',
                requestId: requestId,
                success: true,
                data: result.data || result
            });
            
        } catch (error) {
            // 发送错误给Worker
            this.worker.postMessage({
                type: 'SALT_ERROR',
                requestId: requestId,
                success: false,
                error: error.message
            });
        }
    }

    // 执行批量任务
    async executeBatch(tasks, config) {
        return new Promise((resolve) => {
            // 监听完成事件
            const handleComplete = (e) => {
                if (e.data.type === 'BATCH_COMPLETE') {
                    this.worker.removeEventListener('message', handleComplete);
                    resolve(e.data);
                }
            };
            
            this.worker.addEventListener('message', handleComplete);
            
            // 发送批量任务给Worker
            this.worker.postMessage({
                type: 'START_BATCH',
                data: {
                    tasks: tasks,
                    config: config
                }
            });
        });
    }

    // 终止Worker
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isWorkerMode = false;
            console.log('Worker桥接模式已关闭');
        }
    }
}

// ==================== 使用示例 ====================

// 创建全局桥接实例
window.workerBridge = new WorkerBridge();

// 修改后的automaticApi函数
async function automaticApiWithBridge(targetDate = null) {
    if (!window.workerBridge.isWorkerMode) {
        window.workerBridge.init();
    }
    
    // 准备任务数据
    let dataToProcess = data;
    if (targetDate) {
        dataToProcess = data.filter(item => item.time === targetDate);
    }
    
    const tasks = dataToProcess.map(item => ({
        name: item.name,
        sex: item.sex,
        date: `${year}-${date.replace('.', '-')}`,
        answers: getAnswersArray()
    }));
    
    // 配置信息
    const config = {
        apiEndpoint: '/lgb/xfzwj/add',
        saltEndpoint: '/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/add',
        projectId: '1756460958725101',
        interval: apiRequestInterval || 5000
    };
    
    // 执行批量任务
    const result = await window.workerBridge.executeBatch(tasks, config);
    
    console.log(`✅ 执行完成: 成功 ${result.successCount} 个, 失败 ${result.failCount} 个`);
    return result;
}

// ==================== 集成到现有代码 ====================

// 修改原有的automaticApi函数，添加桥接模式选项
function automaticApiEnhanced(targetDate = null, options = {}) {
    const { useWorker = false, useBridge = true } = options;
    
    if (useWorker && useBridge) {
        // 使用Worker桥接模式（推荐）
        return automaticApiWithBridge(targetDate);
    } else if (useWorker) {
        // 使用纯Worker模式（可能有兼容性问题）
        return automaticApiWithWorker(targetDate);
    } else {
        // 使用传统模式
        return automaticApi(targetDate);
    }
}