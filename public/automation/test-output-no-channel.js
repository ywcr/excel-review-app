
// ==================== DOM模式自动化执行代码（增强版） ====================
// 执行人: 李伟
// 日期: 09.01
// 包含功能: 自动化创建 + 数据验证 + 缺失补充

const data = [
    {
        "name": "张三",
        "sex": "男",
        "time": "09.01",
        "assignee": "李伟",
        "hospital": "北京医院",
        "address": "北京市朝阳区"
    }
];
const config = {
    "name": "西黄消费者问卷",
    "hasChannel": false,
    "contactType": "消费者",
    "labelName": "姓名"
};
const hasChannel = false;

console.log("数据加载完成，共", data.length, "条");

// 实施时间
let date = '09.01';
let year = (new Date()).getFullYear();

// DOM操作相关变量
const contentWindow = document.querySelector('#ssfwIframe')?.contentWindow ?? window;

// API基础配置（用于验证功能）
const API_BASE_URL = window.location.origin;
const PROJECT_ID = getProjectIdFromUrl() || '1756460958725101';


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
            date: targetDate.replace(/\./g, '-'),
            pageSize: 1000
        });
        
        const response = await fetch(`${API_BASE_URL}/lgb/project/submitList?${params}`, {
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
    
    console.log(`%c🔄 开始处理 ${dataToProcess.length} 条缺失数据...`, 'color: #17a2b8; font-weight: bold;');
    
    // 更新全局data变量
    const existingNames = new Set(data.map(item => item.name));
    const uniqueNewData = dataToProcess.filter(item => !existingNames.has(item.name));
    
    if (uniqueNewData.length > 0) {
        data.push(...uniqueNewData);
        console.log(`✅ 已添加 ${uniqueNewData.length} 条新数据到数据集`);
    }
    
    // 自动执行缺失的数据
    console.log('%c🚀 开始自动执行缺失数据...', 'color: #6f42c1; font-weight: bold;');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const item of dataToProcess) {
        try {
            console.log(`处理: ${item.name} (${item.sex})`);
            
            if (typeof createTaskApi !== 'undefined') {
                await createTaskApi(item.name, item.sex);
            } else if (typeof createTask !== 'undefined') {
                await createTask(item.name, item.sex);
            }
            
            successCount++;
            
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`❌ 处理失败: ${item.name}`, error);
            failCount++;
        }
    }
    
    console.log('%c📊 补充完成:', 'color: #28a745; font-weight: bold;');
    console.log('成功:', successCount);
    console.log('失败:', failCount);
    
    // 重新验证
    console.log('🔄 重新验证数据...');
    await validateData();
}

// 辅助函数：从URL获取项目ID
function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let projectId = urlParams.get('projectId');
    
    if (!projectId) {
        // 尝试从iframe获取
        const iframe = document.querySelector('#ssfwIframe');
        if (iframe && iframe.src) {
            const iframeUrl = new URL(iframe.src);
            projectId = iframeUrl.searchParams.get('projectId');
        }
    }
    
    return projectId || PROJECT_ID;
}


// 设置输入框值
function setInputValue(name, value) {
    const items = contentWindow.document.querySelectorAll('.main')[0].querySelectorAll('.layui-form-item');
    for (let item of items) {
        const label = item.querySelector('label').innerText.replace('*', '').replaceAll(' ', '');
        if (label !== name) {
            continue;
        }
        const list = item.querySelectorAll('input');
        list[list.length - 1].value = value;
        return;
    }
}

// 设置选项值
function setOptionValue(index, values) {
    const mainElements = contentWindow.document.querySelectorAll('.main');
    if (mainElements.length < 2) {
        console.error('页面结构异常：找不到足够的.main元素');
        return;
    }
    
    const items = mainElements[1].querySelectorAll('.layui-form-item');
    if (index >= items.length) {
        console.error(`索引${index}超出范围`);
        return;
    }
    
    if (!Array.isArray(values)) {
        values = [values];
    }
    
    values.forEach(val => {
        const targetItem = items[index];
        const inputElement = targetItem.querySelector(`input[value="${val}"]`);
        if (inputElement && inputElement.nextElementSibling) {
            inputElement.nextElementSibling.click();
            console.log(`成功点击第${index}个问题的选项: ${val}`);
        } else {
            console.error(`第${index}个问题：未找到选项值为"${val}"的元素`);
        }
    });
}

// 随机生成数
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// 按比例随机选择答案
function randomAnswerByRate(option1, option2, rate) {
    return Math.random() < rate ? option1[random(0, option1.length - 1)] : option2[random(0, option2.length - 1)];
}


// ==================== 西黄消费者问卷答题逻辑 ====================

// 1、您的年龄是
function _answer0() {
    const option = ['20 岁以下','21~34 岁', '35~59','60 岁以上'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、您选择这家药店购买西黄丸的原因
function _answer1() {
    const option = ['价格实惠', '质量好', '交通便利','药品种类齐全','服务周到'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 3、您希望同仁堂在药店经常开展哪些活动
function _answer2() {
    const option = ['免费测血压', '坐堂医生', '药品促销', '提供更完善的药学服务'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、在药店购买西黄丸时，药店的哪种行为对你的购药选择影响最大
function _answer3() {
    const option = ['专业知识', '服务态度', '讲解能力','店员形象'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 5、在您选购西黄丸时，营业人员给您提供服务时的耐心程度如何？
function _answer4() {
    const option = ['很耐心','一般','不耐心'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 6、您在购买西黄丸时，营业人员中医药专业知识如何？
function _answer5() {
    const option = ['很专业', '一般专业','不专业'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 7、在您购买西黄丸时，药师是否详细询问您的疾病情况？
function _answer6() {
    const option = ['每次都是', '多数', '偶尔','从不'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 8、在您购买西黄丸时，药师是否向您说明中成药的使用禁忌和注意事项？
function _answer7() {
    const option = ['每次都是','多数','偶尔','从不'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 9、您是否满意药店推荐给您的西黄丸的药物效果？
function _answer8() {
    return randomAnswerByRate(['是'],['否'],0.18);
}

// 10、您选购西黄丸时一般会考虑的因素?
function _answer9() {
    const option = ['疗效','品牌知名度','价格','味道'];
    const index = random(0, option.length - 1);
    return option[index];
}



// ==================== DOM模式执行逻辑 ====================




// ==================== 消费者创建逻辑 ====================

// 查询消费者是否存在
function getSame(name, sex) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/lgb/lxrgl/getMessage",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                lxrType: "消费者",
                name: name,
                sex: sex,
                remark: ""
            },
            traditional: true,
            success: function(res) {
                setTimeout(function() {
                    resolve(res);
                }, 500);
            }
        });
    });
}

// 创建消费者
function addContact(name, sex) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/lgb/lxrgl/save",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                lxrType: "消费者",
                name: name,
                sex: sex,
                remark: ""
            },
            traditional: true,
            success: function(res) {
                setTimeout(function() {
                    resolve();
                }, 2000);
            }
        });
    });
}

// 执行创建消费者任务
async function startAddContact() {
    console.log('👥 准备创建消费者，共' + data.length + '个');
    
    let successCount = 0;
    let existCount = 0;
    
    for (let i = 0; i < data.length; i++) {
        let name = data[i].name;
        let sex = data[i].sex;
        
        await getSame(name, sex).then(async (res) => {
            if (res.code == 0) {
                await addContact(name, sex);
                console.log('[' + (i + 1) + '/' + data.length + '] 添加成功：' + name);
                successCount++;
            } else {
                console.log('[' + (i + 1) + '/' + data.length + '] 消费者已存在：' + name);
                existCount++;
            }
        });
    }
    
    console.log('✅ 消费者创建完毕！');
    console.log('📊 统计: 新建' + successCount + '个, 已存在' + existCount + '个');
}


// 辅助函数：格式化日期
function formatDate(dateStr) {
    // 将 '9.1' 格式转换为 '09.01' 格式
    if (!dateStr) return null;
    
    const parts = dateStr.split('.');
    if (parts.length !== 2) return dateStr;
    
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    
    return `${month}.${day}`;
}

// 创建任务（增强版，支持日期设置）
async function createTask(name, sex, taskDate = null) {
    const actualDate = taskDate || date;
    console.log(`🚀 开始创建任务: ${name} (${sex}) - 日期: ${actualDate}`);
    
    // 设置基本信息
    setInputValue('调查对象', name);
    setInputValue('性别', sex);
    // 显式设置实施日期，使用数据中的实施日期
    setInputValue('实施日期', year + '-' + actualDate.replace(/\./g, '-'));
    
    // 设置问卷答案
    setOptionValue(0, _answer0());
    setOptionValue(1, _answer1());
    setOptionValue(2, _answer2());
    setOptionValue(3, _answer3());
    setOptionValue(4, _answer4());
    setOptionValue(5, _answer5());
    setOptionValue(6, _answer6());
    setOptionValue(7, _answer7());
    setOptionValue(8, _answer8());
    setOptionValue(9, _answer9());
    
    // 提交表单
    const submitBtn = contentWindow.document.querySelector('.layui-btn-normal');
    if (submitBtn) {
        submitBtn.click();
        console.log(`✅ 任务创建成功: ${name}`);
        return true;
    } else {
        console.error('❌ 找不到提交按钮');
        return false;
    }
}

// 手动执行单个任务
let currentIndex = 0;
async function start() {
    if (currentIndex >= data.length) {
        console.log('所有任务已完成');
        return;
    }
    
    const item = data[currentIndex];
    const actualDate = item.time || date; // 使用数据中的实施日期
    await createTask(item.name, item.sex, actualDate);
    currentIndex++;
    
    console.log(`进度: ${currentIndex}/${data.length}`);
}

// 自动执行所有任务（增强版，支持日期过滤）
async function automaticDom(targetDate = null) {
    let filteredData = data;
    let dateDescription = '';
    
    // 如果指定了日期，则过滤数据
    if (targetDate) {
        // 格式化日期（支持 '9.1' -> '09.01' 格式）
        const formattedDate = formatDate(targetDate);
        filteredData = data.filter(item => item.time === formattedDate);
        dateDescription = ` - 仅执行日期: ${formattedDate}`;
        
        if (filteredData.length === 0) {
            console.error(`❌ 没有找到日期为 ${formattedDate} 的数据`);
            console.log('可用的日期有:', [...new Set(data.map(d => d.time))].sort());
            return null;
        }
    } else {
        dateDescription = ' - 执行所有数据';
    }
    
    console.log('='.repeat(60));
    console.log(`%c🚀 开始自动执行任务${dateDescription}`, 'color: #17a2b8; font-weight: bold; font-size: 16px;');
    console.log(`📊 待执行任务数: ${filteredData.length} 条`);
    console.log('='.repeat(60));
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];
        const actualDate = item.time || date; // 使用数据中的实施日期
        console.log('');
        console.log(`[${i + 1}/${filteredData.length}] 处理: ${item.name} - 日期: ${actualDate}`);
        
        const success = await createTask(item.name, item.sex, actualDate);
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // 等待页面刷新（DOM模式需要更长的等待时间）
        if (i < filteredData.length - 1) {
            console.log('等待3秒，等待页面刷新...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('%c🎉 自动执行完成！', 'color: #28a745; font-weight: bold; font-size: 16px;');
    console.log('='.repeat(60));
    
    // 输出执行统计
    console.log('%c📊 执行统计:', 'color: #17a2b8; font-weight: bold;');
    console.log(`✅ 成功: ${successCount} 条`);
    console.log(`❌ 失败: ${failCount} 条`);
    console.log(`📋 总计: ${filteredData.length} 条`);
    
    console.log('');
    console.log('💡 执行 validateData() 验证所有数据');
    
    return {
        total: filteredData.length,
        success: successCount,
        fail: failCount,
        targetDate: targetDate,
        processedData: filteredData
    };
}

// 兼容层：统一入口，支持新旧调用方式
function automatic(param1, param2) {
    // 判断参数类型
    if (typeof param1 === 'string') {
        // 新方式：automatic('09.01') - 按日期过滤
        return automaticDom(param1);
    } else if (typeof param1 === 'number' && typeof param2 === 'number') {
        // 旧方式：automatic(0, 100) - 按索引范围执行（已弃用，仅为兼容保留）
        console.warn('%c⚠️ 弃用警告: 使用旧的调用方式 automatic(startIdx, maxNum)，建议改用:', 'color: #ff6b6b; font-weight: bold;');
        console.log('  automatic()        - 执行所有数据（使用各自的实施日期）');
        console.log('  automatic("09.01") - 仅执行指定日期的数据');
        return automaticDomOld(param1, param2);
    } else if (param1 === undefined) {
        // 默认方式：automatic() - 执行所有数据
        return automaticDom();
    } else {
        console.error('❌ 参数错误！使用方式：');
        console.log('  automatic()        - 执行所有数据');
        console.log('  automatic("09.01") - 仅执行指定日期的数据');
        return null;
    }
}

// [弃用] 旧版本的automaticDomOld - 仅为兼容保留，建议使用automaticDom(targetDate)
async function automaticDomOld(startIdx = 0, maxNum = data.length) {
    currentIndex = startIdx;
    const endIdx = Math.min(startIdx + maxNum, data.length);
    
    console.log(`开始自动执行任务 (旧版本模式，从索引 ${startIdx} 到 ${endIdx - 1})`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = startIdx; i < endIdx; i++) {
        const item = data[i];
        const actualDate = item.time || date;
        console.log(`[${i + 1}/${endIdx}] 处理: ${item.name} - 日期: ${actualDate}`);
        
        const success = await createTask(item.name, item.sex, actualDate);
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // 等待页面刷新
        if (i < endIdx - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('%c🎉 自动执行完成！', 'color: #28a745; font-weight: bold; font-size: 16px;');
    console.log('='.repeat(60));
    
    console.log('%c📊 执行统计:', 'color: #17a2b8; font-weight: bold;');
    console.log(`✅ 成功: ${successCount} 条`);
    console.log(`❌ 失败: ${failCount} 条`);
    console.log(`📋 总计: ${endIdx - startIdx} 条`);
    
    console.log('');
    console.log('💡 执行 validateData() 验证结果');
    
    return {
        total: endIdx - startIdx,
        success: successCount,
        fail: failCount
    };
}


// 启动提示
console.log('%c🎉 自动化代码加载成功！', 'color: #28a745; font-weight: bold; font-size: 16px;');
console.log('可用命令:');

console.log('  • startAddContact() - 创建联系人');
console.log('  • start() - 手动执行单个任务');
console.log('  • automatic() - 自动执行或按日期执行');
console.log('  • validateData() - 验证数据完整性');
console.log('  • showMissing() - 显示缺失数据');
console.log('  • updateWithMissing() - 补充缺失数据');

// 控制面板

// ==================== 自动化控制面板 ====================
(function(){
  try {
    if (document.getElementById('automation-control-panel')) return;

    // 样式
    var style = document.createElement('style');
    style.id = 'automation-control-panel-style';
    style.textContent = "#automation-control-panel{position:fixed;right:20px;bottom:20px;width:320px;background:#fff;border:1px solid #e1e4e8;border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.12);font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue','Noto Sans','Liberation Sans',Arial,'Apple Color Emoji','Segoe UI Emoji';z-index:2147483647;overflow:hidden;}"+
      "#automation-control-panel .acp-header{cursor:move;background:linear-gradient(135deg,#20c997,#17a2b8);color:#fff;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;font-weight:600;}"+
      "#automation-control-panel .acp-title{display:flex;align-items:center;gap:8px;font-size:14px;}"+
      "#automation-control-panel .acp-actions{display:flex;gap:6px;}"+
      "#automation-control-panel .acp-btn{border:0;background:transparent;color:#fff;cursor:pointer;font-size:14px;opacity:.9}"+
      "#automation-control-panel .acp-btn:hover{opacity:1}"+
      "#automation-control-panel .acp-body{padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;}"+
      "#automation-control-panel .acp-row{grid-column:1/-1;display:flex;gap:8px;align-items:center;}"+
      "#automation-control-panel .acp-separator{grid-column:1/-1;height:1px;background:#dee2e6;margin:4px 0;}"+
      "#automation-control-panel input[type='text']{flex:1;border:1px solid #ced4da;border-radius:6px;padding:6px 8px;font-size:13px;}"+
        "#automation-control-panel button.primary{background:#28a745;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.primary:hover{background:#218838;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
        "#automation-control-panel button.secondary{background:#17a2b8;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.secondary:hover{background:#138496;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
        "#automation-control-panel button.light{background:#f1f3f5;color:#212529;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.light:hover{background:#e2e6ea;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
        "#automation-control-panel button.warn{background:#ffc107;color:#212529;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.warn:hover{background:#e0a800;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
        "#automation-control-panel button.error{background:#dc3545;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.error:hover{background:#c82333;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
        "#automation-control-panel button.info{background:#6f42c1;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.info:hover{background:#5e35b1;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
      "#automation-control-panel .muted{color:#6c757d;font-size:12px;}";
    document.head.appendChild(style);

    // 控制面板
    var panel = document.createElement('div');
    panel.id = 'automation-control-panel';

    var header = document.createElement('div');
    header.className = 'acp-header';
    var title = document.createElement('div');
    title.className = 'acp-title';
    var mode = (typeof window.startApi==='function' || typeof window.automaticApi==='function') ? 'API' : 'DOM';
    title.innerHTML = '<span>🧰 自动化控制台</span><span class="muted">(' + mode + '模式)</span>';
    var actions = document.createElement('div'); actions.className='acp-actions';
    var minBtn=document.createElement('button'); minBtn.className='acp-btn'; minBtn.title='最小化'; minBtn.textContent='—';
    var closeBtn=document.createElement('button'); closeBtn.className='acp-btn'; closeBtn.title='关闭'; closeBtn.textContent='×';
    actions.appendChild(minBtn); actions.appendChild(closeBtn);
    header.appendChild(title); header.appendChild(actions);

    var body = document.createElement('div'); body.className='acp-body';

    // 创建按钮组
    var btnAddChannel = document.createElement('button'); btnAddChannel.className='info'; btnAddChannel.textContent='创建医院'; btnAddChannel.title='startAddChannel()';
    var btnAddContact = document.createElement('button'); btnAddContact.className='info'; btnAddContact.textContent='创建联系人'; btnAddContact.title='startAddContact()';
    
    // 添加创建按钮（如果有医院字段则显示医院创建按钮）
    if (false) {
      body.appendChild(btnAddChannel);
    }
    body.appendChild(btnAddContact);
    
    // 分隔线
    var separator1 = document.createElement('div'); separator1.className='acp-separator';
    body.appendChild(separator1);

    // 控制按钮
    var btnStart = document.createElement('button'); btnStart.className='light'; btnStart.textContent='单步执行'; btnStart.title='start()';
    var btnAuto = document.createElement('button'); btnAuto.className='primary'; btnAuto.textContent='自动执行'; btnAuto.title='automatic()';
    var btnValidate = document.createElement('button'); btnValidate.className='secondary'; btnValidate.textContent='验证数据'; btnValidate.title='validateData()';
    var btnShowMissing = document.createElement('button'); btnShowMissing.className='light'; btnShowMissing.textContent='显示缺失'; btnShowMissing.title='showMissing()';
    var btnUpdateMissing = document.createElement('button'); btnUpdateMissing.className='warn'; btnUpdateMissing.textContent='填充缺失'; btnUpdateMissing.title='updateWithMissing()';
    var btnExecuteAll = document.createElement('button'); btnExecuteAll.className='secondary'; btnExecuteAll.textContent='全部日期'; btnExecuteAll.title='executeAllDates()';
    var btnErrorSummary = document.createElement('button'); btnErrorSummary.className='error'; btnErrorSummary.textContent='错误汇总'; btnErrorSummary.title='showErrorSummary()';

    body.appendChild(btnStart);
    body.appendChild(btnAuto);
    body.appendChild(btnValidate);
    body.appendChild(btnShowMissing);
    body.appendChild(btnUpdateMissing);
    body.appendChild(btnExecuteAll);
    body.appendChild(btnErrorSummary);

    // 日期输入行
    var row = document.createElement('div'); row.className='acp-row';
    var dateInput = document.createElement('input'); dateInput.type='text'; dateInput.placeholder='输入日期 (如 09.01)';
    var runByDateBtn = document.createElement('button'); runByDateBtn.className='secondary'; runByDateBtn.textContent='按日期执行';
    row.appendChild(dateInput); row.appendChild(runByDateBtn);
    body.appendChild(row);

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    // 拖拽
    (function(){
      var isDown=false, sx=0, sy=0, startRight=0, startBottom=0;
      header.addEventListener('mousedown', function(e){ isDown=true; sx=e.clientX; sy=e.clientY; var rect=panel.getBoundingClientRect(); startRight = window.innerWidth - rect.right; startBottom = window.innerHeight - rect.bottom; document.body.style.userSelect='none'; });
      window.addEventListener('mouseup', function(){ isDown=false; document.body.style.userSelect=''; });
      window.addEventListener('mousemove', function(e){ if(!isDown) return; var dx=e.clientX - sx; var dy=e.clientY - sy; panel.style.right = Math.max(0, startRight - dx) + 'px'; panel.style.bottom = Math.max(0, startBottom - dy) + 'px'; });
    })();

    // 最小化 / 关闭
    var minimized=false;
    minBtn.addEventListener('click', function(){ minimized=!minimized; body.style.display=minimized?'none':'grid'; });
    closeBtn.addEventListener('click', function(){ panel.remove(); });

    // 安全调用函数
    var fns = {
      start: (window.startApi || window.start),
      automatic: (window.automaticApi || window.automatic),
      validateData: window.validateData,
      showMissing: window.showMissing,
      updateWithMissing: window.updateWithMissing,
      executeAllDates: window.executeAllDates,
      showErrorSummary: window.showErrorSummary,
      startAddChannel: window.startAddChannel,
      startAddContact: window.startAddContact
    };
    function call(name, arg){
      var fn = fns[name];
      if (typeof fn !== 'function'){ console.warn('函数不可用:', name); return; }
      try { (arg===undefined) ? fn() : fn(arg); } catch(err){ console.error('执行失败', name, err); }
    }

    // 事件绑定
    if (false && btnAddChannel) {
      btnAddChannel.addEventListener('click', function(){ call('startAddChannel'); });
    }
    if (btnAddContact) {
      btnAddContact.addEventListener('click', function(){ call('startAddContact'); });
    }
    btnStart.addEventListener('click', function(){ call('start'); });
    btnAuto.addEventListener('click', function(){ call('automatic'); });
    runByDateBtn.addEventListener('click', function(){ var v=(dateInput.value||'').trim(); if(!v){ call('automatic'); } else { call('automatic', v); } });
    btnValidate.addEventListener('click', function(){ call('validateData'); });
    btnShowMissing.addEventListener('click', function(){ call('showMissing'); });
    btnUpdateMissing.addEventListener('click', function(){ call('updateWithMissing'); });

    // 可选按钮
    if (typeof fns.executeAllDates === 'function' && false) {
      btnExecuteAll.style.display='inline-block';
      btnExecuteAll.addEventListener('click', function(){ call('executeAllDates'); });
    } else {
      btnExecuteAll.style.display='none';
    }
    if (typeof fns.showErrorSummary === 'function') {
      btnErrorSummary.style.display='inline-block';
      btnErrorSummary.addEventListener('click', function(){ call('showErrorSummary'); });
    } else {
      btnErrorSummary.style.display='none';
    }
  } catch(e){ console.warn('初始化控制面板失败:', e); }
})();

