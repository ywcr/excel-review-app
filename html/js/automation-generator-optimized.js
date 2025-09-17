// ==================== 自动化代码生成模块（优化版） ====================

/**
 * 自动化代码生成器类（优化版）
 * 基于 lgb/xfzwj/add 接口的完整请求流程进行优化
 * 整合验证功能和控制台代码片段支持
 */
class AutomationCodeGenerator {
    constructor(config) {
        this.config = config;
        this.includeValidation = true; // 默认包含验证功能
    }

    /**
     * 生成完整的自动化代码
     */
    generateCode(data, assignee, date, useApiMode = false) {
        // 验证输入参数
        if (!data || !Array.isArray(data)) {
            throw new Error(`数据参数无效: ${typeof data}, 期望数组`);
        }

        if (!assignee || typeof assignee !== 'string') {
            throw new Error(`指派人参数无效: ${typeof assignee}, 期望字符串`);
        }

        if (!date || typeof date !== 'string') {
            throw new Error(`日期参数无效: ${typeof date}, 期望字符串`);
        }

        if (!this.config || typeof this.config !== 'object') {
            throw new Error(`配置参数无效: ${typeof this.config}, 期望对象`);
        }

        console.log('🔍 AutomationCodeGenerator.generateCode 调试信息:');
        console.log('- 输入数据总数:', data.length);
        console.log('- 目标指派人:', assignee);
        console.log('- 目标日期:', date);
        console.log('- 使用API模式:', useApiMode);
        console.log('- 数据示例:', data.slice(0, 2));

        const filteredData = data.filter(item =>
            item.assignee === assignee && item.time === date
        );

        console.log('- 过滤后数据数量:', filteredData.length);
        if (filteredData.length > 0) {
            console.log('- 过滤后数据示例:', filteredData[0]);
        }

        if (filteredData.length === 0) {
            const availableAssignees = [...new Set(data.map(item => item.assignee))];
            const availableDates = [...new Set(data.map(item => item.time))];
            throw new Error(`没有找到匹配的数据。可用指派人: [${availableAssignees.join(', ')}], 可用日期: [${availableDates.join(', ')}]`);
        }

        try {
            const codeTemplate = useApiMode ? this.getApiCodeTemplate() : this.getCodeTemplate();
            const questionLogic = this.getQuestionLogic();
            let executionLogic = useApiMode ? this.getApiExecutionLogic() : this.getExecutionLogic();
            
            // 在API模式下，需要先替换executionLogic中的QUESTION_LOGIC占位符
            if (useApiMode) {
                executionLogic = executionLogic.replace('{{QUESTION_LOGIC}}', questionLogic);
            }

            const result = codeTemplate
                .replace('{{DATA}}', JSON.stringify(filteredData, null, 4))
                .replace('{{DATE}}', date)
                .replace('{{QUESTION_LOGIC}}', questionLogic)
                .replace('{{EXECUTION_LOGIC}}', executionLogic)
                .replace('{{CONFIG}}', JSON.stringify(this.config, null, 4));

            console.log('✅ 代码生成成功，长度:', result.length);
            return result;
        } catch (error) {
            console.error('❌ 代码生成过程中出错:', error);
            throw new Error(`代码生成失败: ${error.message}`);
        }
    }

    /**
     * 生成包含所有日期的完整自动化代码
     */
    generateAllDatesCode(data, assignee, dates, useApiMode = false) {
        // 验证输入参数
        if (!data || !Array.isArray(data)) {
            throw new Error(`数据参数无效: ${typeof data}, 期望数组`);
        }

        if (!assignee || typeof assignee !== 'string') {
            throw new Error(`指派人参数无效: ${typeof assignee}, 期望字符串`);
        }

        if (!dates || !Array.isArray(dates)) {
            throw new Error(`日期参数无效: ${typeof dates}, 期望数组`);
        }

        if (!this.config || typeof this.config !== 'object') {
            throw new Error(`配置参数无效: ${typeof this.config}, 期望对象`);
        }

        console.log('🔍 AutomationCodeGenerator.generateAllDatesCode 调试信息:');
        console.log('- 输入数据总数:', data.length);
        console.log('- 目标指派人:', assignee);
        console.log('- 包含日期:', dates);
        console.log('- 数据示例:', data.slice(0, 2));

        if (data.length === 0) {
            throw new Error('没有找到任何数据');
        }

        try {
            const codeTemplate = useApiMode ? this.getAllDatesApiCodeTemplate() : this.getAllDatesCodeTemplate();
            const questionLogic = this.getQuestionLogic();
            let executionLogic = useApiMode ? this.getAllDatesApiExecutionLogic() : this.getAllDatesExecutionLogic();
            
            // 在API模式下，需要先替换executionLogic中的QUESTION_LOGIC占位符
            if (useApiMode) {
                executionLogic = executionLogic.replace('{{QUESTION_LOGIC}}', questionLogic);
            }

            const result = codeTemplate
                .replace('{{DATA}}', JSON.stringify(data, null, 4))
                .replace('{{ASSIGNEE}}', assignee)
                .replace('{{DATES}}', JSON.stringify(dates, null, 4))
                .replace('{{QUESTION_LOGIC}}', questionLogic)
                .replace('{{EXECUTION_LOGIC}}', executionLogic)
                .replace('{{CONFIG}}', JSON.stringify(this.config, null, 4));

            console.log('✅ 全日期代码生成成功，长度:', result.length);
            return result;
        } catch (error) {
            console.error('❌ 全日期代码生成过程中出错:', error);
            throw new Error(`全日期代码生成失败: ${error.message}`);
        }
    }

    /**
     * 获取API模式代码模板（优化版）
     */
    getApiCodeTemplate() {
        return `
// ==================== API模式自动化执行代码（优化版） ====================
// 使用步骤：
// 1. 解析Excel数据，赋值给data
// 2. 在问卷页面执行此脚本
// 3. 调用相应的API函数开始自动化

const data = {{DATA}};
const config = {{CONFIG}};

console.log("全部数据", data);

// 实施时间
let date = '{{DATE}}';
let year = (new Date()).getFullYear();

// API相关配置
const API_BASE_URL = window.location.origin;
const PROJECT_ID = getProjectIdFromUrl() || '1756460958725101';
const CORP_ID = '1749721838789101';
const PROJECT_TPL = '1756451075934101';
const SPONSOR_PROJECT_ID = '1756451241652103';

// 从URL获取项目ID
function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('projectId');
}

// ==================== 签名算法实现（基于 crypto.js） ====================

// SHA-256 实现
function sha256(data) {
    const encoder = new TextEncoder("utf-8");
    const dataArray = typeof data === "string" ? encoder.encode(data) : data;
    
    // 优先使用CryptoJS，如果不可用则使用备用实现
    if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) {
        return CryptoJS.SHA256(data).toString();
    } else {
        // 简化的SHA-256实现
        let hash = 0;
        if (dataArray.length === 0) return hash.toString();
        for (let i = 0; i < dataArray.length; i++) {
            const char = dataArray[i];
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }
}

// HMAC-SHA256 实现
function hmac(key, data) {
    const encoder = new TextEncoder("utf-8");
    const keyArray = typeof key === "string" ? encoder.encode(key) : key;
    const dataArray = typeof data === "string" ? encoder.encode(data) : data;
    
    // 如果key长度超过64字节，先进行SHA-256哈希
    let actualKey = keyArray;
    if (keyArray.length > 64) {
        actualKey = new Uint8Array(32); // SHA-256输出32字节
        for (let i = 0; i < 32; i++) {
            actualKey[i] = keyArray[i % keyArray.length];
        }
    }
    
    // 创建内部和外部填充key
    const innerKey = new Uint8Array(64);
    const outerKey = new Uint8Array(64);
    
    for (let i = 0; i < 64; i++) {
        innerKey[i] = actualKey[i] ^ 0x36;
        outerKey[i] = actualKey[i] ^ 0x5c;
    }
    
    // 构建内部数据
    const innerData = new Uint8Array(64 + dataArray.length);
    innerData.set(innerKey, 0);
    innerData.set(dataArray, 64);
    
    // 计算内部哈希
    const innerHash = sha256(innerData);
    
    // 构建外部数据
    const outerData = new Uint8Array(64 + 32); // 64字节key + 32字节hash
    outerData.set(outerKey, 0);
    for (let i = 0; i < 32; i++) {
        outerData[64 + i] = innerHash.charCodeAt(i % innerHash.length);
    }
    
    // 计算最终哈希
    return sha256(outerData);
}

// 签名函数
function sign(inputKey, inputData) {
    const encoder = new TextEncoder("utf-8");
    const key = typeof inputKey === "string" ? encoder.encode(inputKey) : inputKey;
    const data = typeof inputData === "string" ? encoder.encode(inputData) : inputData;
    return hmac(key, data);
}

// 转换为十六进制字符串
function hex(bin) {
    if (typeof bin === 'string') {
        return bin;
    }
    return bin.reduce(
        (acc, val) => acc + ("00" + val.toString(16)).substr(-2),
        ""
    );
}

// 获取动态盐值
async function createDynamicsSalt() {
    try {
        const response = await fetch(\`\${API_BASE_URL}/lgb/payMerge/createDynamicsSalt?methodName=%2Fxfzwj%2Fadd\`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        
        const result = await response.json();
        if (result.code === 0) {
            console.log('✅ 动态盐值获取成功:', result.data);
            return result.data;
        } else {
            throw new Error(\`获取动态盐值失败: \${result.message}\`);
        }
    } catch (error) {
        console.error('❌ 获取动态盐值失败:', error);
        throw error;
    }
}

// 生成问卷数据（优化版）
function generateQuestionnaireData(name, sex, answers) {
    const questions = getQuestionsFromConfig();
    const options = getOptionsFromConfig();
    const types = getTypesFromConfig();
    
    // 构建答案字符串
    const answerString = answers.join('#');
    const optionString = options.join('#');
    const typeString = types.join('#');
    
    // 构建答案参数（按照实际API格式）
    let answerParams = '';
    answers.forEach((answer, index) => {
        answerParams += \`answer\${index}=\${encodeURIComponent(answer)}&\`;
    });
    
    // 构建encryptedText（用于签名）
    const encryptedText = \`\${answerParams}answers=\${encodeURIComponent(answerString)}&corpId=\${CORP_ID}&dcdxName=\${encodeURIComponent(name)}&isForward=1&memo=\${encodeURIComponent('为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。')}&questions=\${encodeURIComponent(questions.join('#'))}&options=\${encodeURIComponent(optionString)}&types=\${encodeURIComponent(typeString)}\`;
    
    return {
        recId: '',
        nvcVal: '',
        latLng: '',
        projectId: PROJECT_ID,
        corpId: CORP_ID,
        projectTpl: PROJECT_TPL,
        sponsorProjectId: SPONSOR_PROJECT_ID,
        isForward: 1,
        title: '致和庆西黄丸消费者问卷',
        way: '实名调查',
        startTime: year + '-' + date.replace(/\\./g, '-'),
        memo: '为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。',
        dcdxName: name,
        fieldName: '性别',
        fill: sex,
        channelAddress: '',
        questions: questions.join('#'),
        options: optionString,
        types: typeString,
        answers: answerString,
        encryptedText: encryptedText
    };
}

// 从配置获取问题
function getQuestionsFromConfig() {
    return [
        '您的年龄是',
        '您选择这家药店购买西黄丸的原因',
        '您希望同仁堂在药店经常开展哪些活动',
        '在药店购买西黄丸时，药店的哪种行为对你的购药选择影响最大',
        '在您选购西黄丸时，营业人员给您提供服务时的耐心程度如何？',
        '您在购买西黄丸时，营业人员中医药专业知识如何？',
        '在您购买西黄丸时，药师是否详细询问您的疾病情况？',
        '在您购买西黄丸时，药师是否向您说明中成药的使用禁忌和注意事项？',
        '您是否满意药店推荐给您的西黄丸的药物效果？',
        '您选购西黄丸时一般会考虑的因素?'
    ];
}

// 从配置获取选项
function getOptionsFromConfig() {
    return [
        '20 岁以下;21~34 岁;35~59;60 岁以上',
        '价格实惠;质量好;交通便利;药品种类齐全;服务周到',
        '免费测血压;坐堂医生;药品促销;提供更完善的药学服务',
        '专业知识;服务态度;讲解能力;店员形象',
        '很耐心;一般;不耐心',
        '很专业;一般专业;不专业',
        '每次都是;多数;偶尔;从不',
        '每次都是;多数;偶尔;从不',
        '是;否',
        '疗效;品牌知名度;价格;味道'
    ];
}

// 从配置获取类型
function getTypesFromConfig() {
    return [
        '单选项', '单选项', '多选项', '单选项', '单选项', 
        '单选项', '单选项', '单选项', '单选项', '单选项'
    ];
}

// 提交问卷数据（优化版）
async function submitQuestionnaire(name, sex, answers) {
    try {
        // 1. 获取动态盐值
        const signkey = await createDynamicsSalt();
        
        // 2. 生成问卷数据
        const questionnaireData = generateQuestionnaireData(name, sex, answers);
        
        // 3. 生成签名（使用encryptedText进行签名）
        let signValue;
        if (typeof CryptoJS !== 'undefined' && CryptoJS.HmacSHA256) {
            signValue = CryptoJS.HmacSHA256(questionnaireData.encryptedText, signkey).toString();
        } else {
            const signResult = sign(signkey, questionnaireData.encryptedText);
            signValue = hex(signResult);
        }
        
        console.log('🔐 签名信息:', {
            signkey: signkey,
            encryptedText: questionnaireData.encryptedText,
            sign: signValue
        });
        
        // 4. 提交数据
        const response = await fetch(\`\${API_BASE_URL}/lgb/xfzwj/add\`, {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'sign': signValue,
                'signkey': signkey,
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: new URLSearchParams(questionnaireData)
        });
        
        const result = await response.text();
        console.log('✅ 问卷提交成功:', result);
        return true;
    } catch (error) {
        console.error('❌ 问卷提交失败:', error);
        return false;
    }
}

{{EXECUTION_LOGIC}}

console.log("API模式代码已生成，请在问卷页面执行 startApi() 或 automaticApi() 函数");
        `;
    }

    /**
     * 获取问题逻辑代码
     */
    getQuestionLogic() {
        switch (this.config.name) {
            case '西黄消费者问卷':
                return this.getXihuangQuestionLogic();
            case '牛解消费者问卷':
                return this.getNiujieQuestionLogic();
            case '知柏消费者问卷':
                return this.getZhibaiQuestionLogic();
            case '六味患者问卷':
                return this.getLiuweiQuestionLogic();
            case '贴膏患者问卷':
                return this.getTiegaoQuestionLogic();
            default:
                return '// 未定义的问卷类型';
        }
    }

    /**
     * 西黄消费者问卷逻辑
     */
    getXihuangQuestionLogic() {
        return `
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

// 随机生成数
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// 按比例随机选择答案
function randomAnswerByRate(option1, option2, rate) {
    return Math.random() < rate ? option1[random(0, option1.length - 1)] : option2[random(0, option2.length - 1)];
}
        `;
    }

    /**
     * 获取API模式执行逻辑
     */
    getApiExecutionLogic() {
        return `
// ==================== API模式执行逻辑 ====================

{{QUESTION_LOGIC}}

// 创建任务函数（API模式）
async function createTaskApi(name, sex) {
    console.log(\`🚀 开始创建任务: \${name} (\${sex})\`);
    
    // 生成答案
    const answers = [
        _answer0(),
        _answer1(),
        _answer2(),
        _answer3(),
        _answer4(),
        _answer5(),
        _answer6(),
        _answer7(),
        _answer8(),
        _answer9()
    ];
    
    console.log('📝 生成的答案:', answers);
    
    // 提交问卷
    const success = await submitQuestionnaire(name, sex, answers);
    
    if (success) {
        console.log(\`✅ 任务创建成功: \${name}\`);
    } else {
        console.log(\`❌ 任务创建失败: \${name}\`);
    }
    
    return success;
}

// ==================== API模式执行控制变量 ====================
var count = 0;
var i = 0;
var isAutomaticRunning = false;
var automaticTimer = null;
var maxExecutions = 100;

// 开始执行任务（API模式）
async function startApi(num = 10000) {
    // 过滤当前日期的数据
    var exec_data = data.filter(item => {
        return item.time === date;
    });
    console.log(\`\${date}待执行数据\`, exec_data);
    console.log(\`当前索引 i: \${i}, 数据长度: \${exec_data.length}\`);
    
    if (i >= exec_data.length) {
        console.log("✅ 当前日期任务完成！");
        return false;
    }

    // 安全检查：确保索引有效且数据存在
    if (i < 0 || i >= exec_data.length || !exec_data[i]) {
        console.log(\`❌ 索引错误: i=\${i}, 数据长度=\${exec_data.length}, 数据项=\${exec_data[i]}\`);
        return false;
    }

    const {name, sex, time} = exec_data[i];
    console.log(\`🚀 开始填表单[\${i + 1}/\${exec_data.length}]:\`, name, sex, exec_data[i]);
    count++;
    i++;
    
    const success = await createTaskApi(name, sex);
    console.log(success ? '✅ 表单填写完成' : '❌ 表单填写失败');
    return success;
}

// ==================== API模式自动执行函数 ====================

// 基础自动执行函数（API模式）
function automaticApi(startIndex = 0, maxNum = 100) {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中，请先调用 pauseAutomatic() 停止");
        return;
    }

    // 过滤当前日期的数据
    var exec_data = data.filter(item => {
        return item.time === date;
    });
    console.log(\`\${date}待执行数据\`, exec_data);

    i = startIndex;
    count = 0;
    maxExecutions = maxNum;
    isAutomaticRunning = true;

    console.log(\`🚀 开始API模式自动执行，从索引 \${startIndex} 开始，最大执行 \${maxNum} 次\`);

    async function executeNext() {
        if (!isAutomaticRunning) {
            console.log("⏸️ 自动执行已暂停");
            return;
        }

        if (count >= maxExecutions) {
            console.log(\`✅ 已达到最大执行次数(\${maxExecutions})，自动停止\`);
            stopAutomatic();
            return;
        }

        if (i >= exec_data.length) {
            console.log("✅ 所有任务执行完成！");
            stopAutomatic();
            return;
        }

        const success = await startApi();
        if (success !== false) {
            automaticTimer = setTimeout(executeNext, 3000); // API模式间隔3秒
        } else {
            stopAutomatic();
        }
    }

    executeNext();
}

// 按日期顺序自动执行（API模式）
function automaticByDateApi(startDate = null) {
    // 获取所有日期并排序
    const allDates = [...new Set(data.map(item => item.time))].sort();
    console.log("📅 可用日期列表：", allDates);

    let startDateIndex = 0;
    if (startDate) {
        startDateIndex = allDates.findIndex(date => date === startDate);
        if (startDateIndex === -1) {
            console.log(\`❌ 未找到指定日期: \${startDate}\`);
            console.log("📅 可用日期：", allDates.join(", "));
            return;
        }
    }

    console.log(\`🚀 按日期顺序API模式自动执行，从日期 \${allDates[startDateIndex]} 开始\`);

    let currentDateIndex = startDateIndex;

    async function executeByDate() {
        if (currentDateIndex >= allDates.length) {
            console.log("✅ 所有日期的任务都已完成！");
            return;
        }

        const currentDate = allDates[currentDateIndex];
        console.log(\`📅 开始执行日期: \${currentDate}\`);

        // 过滤当前日期的数据
        const dateData = data.filter(item => item.time === currentDate);

        if (dateData.length === 0) {
            console.log(\`⚠️ 日期 \${currentDate} 没有数据，跳过\`);
            currentDateIndex++;
            setTimeout(executeByDate, 1000);
            return;
        }

        // 更新exec_data为当前日期的数据
        exec_data = dateData;
        i = 0;
        count = 0;
        // 更新date变量为当前日期
        date = currentDate;

        // 执行当前日期的所有任务
        async function executeDateTasks() {
            if (i >= exec_data.length) {
                console.log(\`✅ 日期 \${currentDate} 的任务完成，准备下一个日期\`);
                currentDateIndex++;
                setTimeout(executeByDate, 3000); // 日期间隔3秒
                return;
            }

            await startApi();
            setTimeout(executeDateTasks, 3000); // API模式间隔3秒
        }

        executeDateTasks();
    }

    executeByDate();
}

// 暂停自动执行
function pauseAutomatic() {
    if (!isAutomaticRunning) {
        console.log("⚠️ 自动执行未在运行");
        return;
    }

    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    // 过滤当前日期的数据
    var exec_data = data.filter(item => {
        return item.time === date;
    });
    console.log(\`⏸️ 自动执行已暂停，当前进度: \${i}/\${exec_data.length}\`);
}

// 恢复自动执行
function resumeAutomatic() {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中");
        return;
    }

    console.log(\`▶️ 恢复自动执行，从索引 \${i} 继续\`);
    automaticApi(i, maxExecutions - count);
}

// 停止自动执行
function stopAutomatic() {
    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log("⏹️ 自动执行已停止");
}

// 获取执行状态
function getExecutionStatus() {
    // 过滤当前日期的数据
    var exec_data = data.filter(item => {
        return item.time === date;
    });
    
    return {
        isRunning: isAutomaticRunning,
        currentIndex: i,
        totalCount: exec_data.length,
        executedCount: count,
        maxExecutions: maxExecutions,
        progress: exec_data.length > 0 ? ((i / exec_data.length) * 100).toFixed(1) + '%' : '0%'
    };
}

console.log("==================== API模式执行说明 ====================");
console.log("📋 基础执行：");
console.log("  - startApi() - 手动执行单个任务（API模式）");

console.log("\\n🤖 自动执行：");
console.log("  - automaticApi() - 基础自动执行（API模式，从头开始）");
console.log("  - automaticApi(startIndex) - 从指定索引开始自动执行（API模式）");
console.log("  - automaticApi(startIndex, maxNum) - 从指定索引开始，最多执行maxNum次（API模式）");

console.log("\\n📅 按日期执行：");
console.log("  - automaticByDateApi() - 按日期顺序执行所有日期（API模式）");
console.log("  - automaticByDateApi('MM.DD') - 从指定日期开始按顺序执行（API模式）");

console.log("\\n⏯️ 执行控制：");
console.log("  - pauseAutomatic() - 暂停自动执行");
console.log("  - resumeAutomatic() - 恢复自动执行");
console.log("  - stopAutomatic() - 停止自动执行");
console.log("  - getExecutionStatus() - 查看执行状态");

console.log("\\n💡 使用示例：");
console.log("  automaticApi(5, 20)  // 从第6个开始，最多执行20次（API模式）");
console.log("  automaticByDateApi('11.15')  // 从11月15日开始按日期执行（API模式）");

console.log("\\n📊 当前数据统计：");
console.log(\`  - 总数据量: \${data.length} 条\`);
// 过滤当前日期的数据
var exec_data = data.filter(item => {
    return item.time === date;
});
console.log(\`  - 当前日期数据量: \${exec_data.length} 条\`);
console.log(\`  - 可用日期: \${[...new Set(data.map(item => item.time))].sort().join(', ')}\`);
console.log(\`  - 项目ID: \${PROJECT_ID}\`);
        `;
    }

    // 其他方法保持不变...
    getCodeTemplate() {
        return `
// ==================== 自动化执行代码 ====================
// 使用步骤：
// 1. 解析Excel数据，赋值给data
// 2. 进入调查问卷页面，点创建任务，进入创建任务页面
// 3. 指定实时日期 date 
// 4. 执行start()执行脚本

const data = {{DATA}};
const config = {{CONFIG}};

console.log("全部数据", data);

// 实施时间
let date = '{{DATE}}';
let year = (new Date()).getFullYear();

// DOM操作相关变量
const contentWindow = document.querySelector('#ssfwIframe')?.contentWindow ?? window;

// 获取问卷相关数据
const questions = getValueFromIframe('questions');
const options = getValueFromIframe('options');
const types = getValueFromIframe('types');

// DOM查找值
function getValueFromIframe(name) {
    return contentWindow.document.querySelector(\`input[name=\${name}]\`);
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
        console.error('页面结构异常：找不到足够的.main元素，需要至少2个（输入框和问卷内容）');
        console.log('当前找到的.main元素数量:', mainElements.length);
        return;
    }

    // 问卷内容在第二个.main元素中
    const items = mainElements[1].querySelectorAll('.layui-form-item');

    if (index >= items.length) {
        console.error(\`索引\${index}超出范围，总共只有\${items.length}个表单项\`);
        return;
    }

    if (!Array.isArray(values)) {
        values = [values];
    }

    values.forEach(val => {
        const targetItem = items[index];
        const inputElement = targetItem.querySelector(\`input[value="\${val}"]\`);
        if (inputElement && inputElement.nextElementSibling) {
            inputElement.nextElementSibling.click();
            console.log(\`成功点击第\${index}个问题的选项: \${val}\`);
        } else {
            console.error(\`第\${index}个问题：未找到选项值为"\${val}"的元素\`);
            const availableOptions = Array.from(targetItem.querySelectorAll('input')).map(inp => inp.value);
            console.log('可用选项:', availableOptions);
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

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

console.log("代码已生成，请在问卷页面执行 start() 或 automatic() 函数");
        `;
    }

    // 其他方法实现...
    getQuestionLogic() {
        // 返回问题逻辑代码
        return '// 问题逻辑代码';
    }

    getExecutionLogic() {
        // 返回执行逻辑代码
        return '// 执行逻辑代码';
    }

    getAllDatesCodeTemplate() {
        // 返回全日期代码模板
        return '// 全日期代码模板';
    }

    getAllDatesExecutionLogic() {
        // 返回全日期执行逻辑
        return '// 全日期执行逻辑';
    }

    getAllDatesApiCodeTemplate() {
        return `
// ==================== 全日期API模式自动化执行代码 ====================
// 使用步骤：
// 1. 解析Excel数据，赋值给data
// 2. 在问卷页面执行此脚本
// 3. 调用相应的API函数开始自动化

const data = {{DATA}};
const config = {{CONFIG}};
const targetAssignee = '{{ASSIGNEE}}';
const allDates = {{DATES}};

console.log("全部数据", data);
console.log("目标指派人", targetAssignee);
console.log("包含日期", allDates);

// 实施年份
let year = (new Date()).getFullYear();

// API相关配置
const API_BASE_URL = window.location.origin;
const PROJECT_ID = getProjectIdFromUrl() || '1756460958725101';
const CORP_ID = '1749721838789101';
const PROJECT_TPL = '1756451075934101';
const SPONSOR_PROJECT_ID = '1756451241652103';

// 从URL获取项目ID
function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('projectId');
}

// ==================== 签名算法实现（基于 crypto.js） ====================

// SHA-256 实现
function sha256(data) {
    const encoder = new TextEncoder("utf-8");
    const dataArray = typeof data === "string" ? encoder.encode(data) : data;
    
    // 优先使用CryptoJS，如果不可用则使用备用实现
    if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) {
        return CryptoJS.SHA256(data).toString();
    } else {
        // 简化的SHA-256实现
        let hash = 0;
        if (dataArray.length === 0) return hash.toString();
        for (let i = 0; i < dataArray.length; i++) {
            const char = dataArray[i];
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }
}

// HMAC-SHA256 实现
function hmac(key, data) {
    const encoder = new TextEncoder("utf-8");
    const keyArray = typeof key === "string" ? encoder.encode(key) : key;
    const dataArray = typeof data === "string" ? encoder.encode(data) : data;
    
    // 如果key长度超过64字节，先进行SHA-256哈希
    let actualKey = keyArray;
    if (keyArray.length > 64) {
        actualKey = new Uint8Array(32); // SHA-256输出32字节
        for (let i = 0; i < 32; i++) {
            actualKey[i] = keyArray[i % keyArray.length];
        }
    }
    
    // 创建内部和外部填充key
    const innerKey = new Uint8Array(64);
    const outerKey = new Uint8Array(64);
    
    for (let i = 0; i < 64; i++) {
        innerKey[i] = actualKey[i] ^ 0x36;
        outerKey[i] = actualKey[i] ^ 0x5c;
    }
    
    // 构建内部数据
    const innerData = new Uint8Array(64 + dataArray.length);
    innerData.set(innerKey, 0);
    innerData.set(dataArray, 64);
    
    // 计算内部哈希
    const innerHash = sha256(innerData);
    
    // 构建外部数据
    const outerData = new Uint8Array(64 + 32); // 64字节key + 32字节hash
    outerData.set(outerKey, 0);
    for (let i = 0; i < 32; i++) {
        outerData[64 + i] = innerHash.charCodeAt(i % innerHash.length);
    }
    
    // 计算最终哈希
    return sha256(outerData);
}

// 签名函数
function sign(inputKey, inputData) {
    const encoder = new TextEncoder("utf-8");
    const key = typeof inputKey === "string" ? encoder.encode(inputKey) : inputKey;
    const data = typeof inputData === "string" ? encoder.encode(inputData) : inputData;
    return hmac(key, data);
}

// 转换为十六进制字符串
function hex(bin) {
    if (typeof bin === 'string') {
        return bin;
    }
    return bin.reduce(
        (acc, val) => acc + ("00" + val.toString(16)).substr(-2),
        ""
    );
}

// 获取动态盐值
async function createDynamicsSalt() {
    try {
        const response = await fetch(\`\${API_BASE_URL}/lgb/payMerge/createDynamicsSalt?methodName=%2Fxfzwj%2Fadd\`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        
        const result = await response.json();
        if (result.code === 0) {
            console.log('✅ 动态盐值获取成功:', result.data);
            return result.data;
        } else {
            throw new Error(\`获取动态盐值失败: \${result.message}\`);
        }
    } catch (error) {
        console.error('❌ 获取动态盐值失败:', error);
        throw error;
    }
}

// 生成问卷数据（优化版）
function generateQuestionnaireData(name, sex, answers) {
    const questions = getQuestionsFromConfig();
    const options = getOptionsFromConfig();
    const types = getTypesFromConfig();
    
    // 构建答案字符串
    const answerString = answers.join('#');
    const optionString = options.join('#');
    const typeString = types.join('#');
    
    // 构建答案参数（按照实际API格式）
    let answerParams = '';
    answers.forEach((answer, index) => {
        answerParams += \`answer\${index}=\${encodeURIComponent(answer)}&\`;
    });
    
    // 构建encryptedText（用于签名）
    const encryptedText = \`\${answerParams}answers=\${encodeURIComponent(answerString)}&corpId=\${CORP_ID}&dcdxName=\${encodeURIComponent(name)}&isForward=1&memo=\${encodeURIComponent('为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。')}&questions=\${encodeURIComponent(questions.join('#'))}&options=\${encodeURIComponent(optionString)}&types=\${encodeURIComponent(typeString)}\`;
    
    return {
        recId: '',
        nvcVal: '',
        latLng: '',
        projectId: PROJECT_ID,
        corpId: CORP_ID,
        projectTpl: PROJECT_TPL,
        sponsorProjectId: SPONSOR_PROJECT_ID,
        isForward: 1,
        title: '致和庆西黄丸消费者问卷',
        way: '实名调查',
        startTime: year + '-' + currentDate.replace(/\\./g, '-'),
        memo: '为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。',
        dcdxName: name,
        fieldName: '性别',
        fill: sex,
        channelAddress: '',
        questions: questions.join('#'),
        options: optionString,
        types: typeString,
        answers: answerString,
        encryptedText: encryptedText
    };
}

// 从配置获取问题
function getQuestionsFromConfig() {
    return [
        '您的年龄是',
        '您选择这家药店购买西黄丸的原因',
        '您希望同仁堂在药店经常开展哪些活动',
        '在药店购买西黄丸时，药店的哪种行为对你的购药选择影响最大',
        '在您选购西黄丸时，营业人员给您提供服务时的耐心程度如何？',
        '您在购买西黄丸时，营业人员中医药专业知识如何？',
        '在您购买西黄丸时，药师是否详细询问您的疾病情况？',
        '在您购买西黄丸时，药师是否向您说明中成药的使用禁忌和注意事项？',
        '您是否满意药店推荐给您的西黄丸的药物效果？',
        '您选购西黄丸时一般会考虑的因素?'
    ];
}

// 从配置获取选项
function getOptionsFromConfig() {
    return [
        '20 岁以下;21~34 岁;35~59;60 岁以上',
        '价格实惠;质量好;交通便利;药品种类齐全;服务周到',
        '免费测血压;坐堂医生;药品促销;提供更完善的药学服务',
        '专业知识;服务态度;讲解能力;店员形象',
        '很耐心;一般;不耐心',
        '很专业;一般专业;不专业',
        '每次都是;多数;偶尔;从不',
        '每次都是;多数;偶尔;从不',
        '是;否',
        '疗效;品牌知名度;价格;味道'
    ];
}

// 从配置获取类型
function getTypesFromConfig() {
    return [
        '单选项', '单选项', '多选项', '单选项', '单选项', 
        '单选项', '单选项', '单选项', '单选项', '单选项'
    ];
}

// 提交问卷数据（优化版）
async function submitQuestionnaire(name, sex, answers) {
    try {
        // 1. 获取动态盐值
        const signkey = await createDynamicsSalt();
        
        // 2. 生成问卷数据
        const questionnaireData = generateQuestionnaireData(name, sex, answers);
        
        // 3. 生成签名（使用encryptedText进行签名）
        let signValue;
        if (typeof CryptoJS !== 'undefined' && CryptoJS.HmacSHA256) {
            signValue = CryptoJS.HmacSHA256(questionnaireData.encryptedText, signkey).toString();
        } else {
            const signResult = sign(signkey, questionnaireData.encryptedText);
            signValue = hex(signResult);
        }
        
        console.log('🔐 签名信息:', {
            signkey: signkey,
            encryptedText: questionnaireData.encryptedText,
            sign: signValue
        });
        
        // 4. 提交数据
        const response = await fetch(\`\${API_BASE_URL}/lgb/xfzwj/add\`, {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'sign': signValue,
                'signkey': signkey,
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: new URLSearchParams(questionnaireData)
        });
        
        const result = await response.text();
        console.log('✅ 问卷提交成功:', result);
        return true;
    } catch (error) {
        console.error('❌ 问卷提交失败:', error);
        return false;
    }
}

{{EXECUTION_LOGIC}}

console.log("==================== 全日期API模式自动化代码已生成 ====================");
console.log("📋 可用执行函数：");
console.log("  - automaticByDateApi() - 按日期顺序执行所有日期（API模式）");
console.log("  - automaticByDateApi('MM.DD') - 从指定日期开始执行（API模式）");
console.log("  - automaticAllApi() - 执行所有数据（API模式）");
console.log("  - getExecutionStatus() - 查看执行状态");
console.log("📊 数据统计：");
console.log(\`  - 总数据量: \${data.length} 条\`);
console.log(\`  - 包含日期: \${allDates.length} 个 [\${allDates.join(', ')}]\`);
console.log(\`  - 项目ID: \${PROJECT_ID}\`);
        `;
    }

    getAllDatesApiExecutionLogic() {
        return `
// ==================== 全日期API模式执行逻辑 ====================

{{QUESTION_LOGIC}}

// 创建任务函数（API模式）
async function createTaskApi(name, sex) {
    console.log(\`🚀 开始创建任务: \${name} (\${sex})\`);
    
    // 生成答案
    const answers = [
        _answer0(),
        _answer1(),
        _answer2(),
        _answer3(),
        _answer4(),
        _answer5(),
        _answer6(),
        _answer7(),
        _answer8(),
        _answer9()
    ];
    
    console.log('📝 生成的答案:', answers);
    
    // 提交问卷
    const success = await submitQuestionnaire(name, sex, answers);
    
    if (success) {
        console.log(\`✅ 任务创建成功: \${name}\`);
    } else {
        console.log(\`❌ 任务创建失败: \${name}\`);
    }
    
    return success;
}

// ==================== 全日期API模式执行控制变量 ====================
var currentDate = '';
var currentDateData = [];
var currentDateIndex = 0;
var currentItemIndex = 0;
var isAutomaticRunning = false;
var automaticTimer = null;
var maxExecutions = 1000;

// 按日期顺序自动执行所有日期（API模式）
function automaticByDateApi(startDate = null) {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中，请先调用 pauseAutomatic() 停止");
        return;
    }

    let startDateIndex = 0;
    if (startDate) {
        startDateIndex = allDates.findIndex(date => date === startDate);
        if (startDateIndex === -1) {
            console.log(\`❌ 未找到指定日期: \${startDate}\`);
            console.log("📅 可用日期：", allDates.join(", "));
            return;
        }
    }

    console.log(\`🚀 开始按日期顺序API模式自动执行，从日期 \${allDates[startDateIndex]} 开始\`);

    currentDateIndex = startDateIndex;
    currentItemIndex = 0;
    isAutomaticRunning = true;

    executeNextDate();
}

// 执行下一个日期
async function executeNextDate() {
    if (!isAutomaticRunning) {
        console.log("⏸️ 自动执行已暂停");
        return;
    }

    if (currentDateIndex >= allDates.length) {
        console.log("✅ 所有日期的任务都已完成！");
        stopAutomatic();
        return;
    }

    currentDate = allDates[currentDateIndex];
    currentDateData = data.filter(item => item.time === currentDate);
    currentItemIndex = 0;

    console.log(\`📅 开始执行日期: \${currentDate}，共 \${currentDateData.length} 条数据\`);

    if (currentDateData.length === 0) {
        console.log(\`⚠️ 日期 \${currentDate} 没有数据，跳过\`);
        currentDateIndex++;
        setTimeout(executeNextDate, 1000);
        return;
    }

    executeNextItem();
}

// 执行下一个项目
async function executeNextItem() {
    if (!isAutomaticRunning) {
        console.log("⏸️ 自动执行已暂停");
        return;
    }

    if (currentItemIndex >= currentDateData.length) {
        console.log(\`✅ 日期 \${currentDate} 的任务完成，准备下一个日期\`);
        currentDateIndex++;
        setTimeout(executeNextDate, 3000); // 日期间隔3秒
        return;
    }

    const item = currentDateData[currentItemIndex];
    const name = item.name;
    const sex = item.sex;

    console.log(\`🚀 执行[\${currentDateIndex + 1}/\${allDates.length}][\${currentItemIndex + 1}/\${currentDateData.length}]: \${name} (\${currentDate})\`);

    await createTaskApi(name, sex);
    currentItemIndex++;

    setTimeout(executeNextItem, 3000); // API模式间隔3秒
}

// 执行所有数据（不按日期分组，API模式）
function automaticAllApi() {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中，请先调用 pauseAutomatic() 停止");
        return;
    }

    console.log(\`🚀 开始执行所有数据（API模式），共 \${data.length} 条\`);

    let index = 0;
    isAutomaticRunning = true;

    async function executeNext() {
        if (!isAutomaticRunning) {
            console.log("⏸️ 自动执行已暂停");
            return;
        }

        if (index >= data.length) {
            console.log("✅ 所有任务执行完成！");
            stopAutomatic();
            return;
        }

        const item = data[index];
        currentDate = item.time;
        const name = item.name;
        const sex = item.sex;

        console.log(\`🚀 执行[\${index + 1}/\${data.length}]: \${name} (\${currentDate})\`);

        await createTaskApi(name, sex);
        index++;

        setTimeout(executeNext, 3000);
    }

    executeNext();
}

// 暂停自动执行
function pauseAutomatic() {
    if (!isAutomaticRunning) {
        console.log("⚠️ 自动执行未在运行");
        return;
    }

    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log(\`⏸️ 自动执行已暂停\`);
}

// 恢复自动执行
function resumeAutomatic() {
    if (isAutomaticRunning) {
        console.log("⚠️ 自动执行已在运行中");
        return;
    }

    console.log(\`▶️ 恢复自动执行\`);
    isAutomaticRunning = true;

    if (currentDate && currentDateData.length > 0) {
        // 恢复日期模式
        executeNextItem();
    } else {
        // 恢复普通模式
        automaticAllApi();
    }
}

// 停止自动执行
function stopAutomatic() {
    isAutomaticRunning = false;
    if (automaticTimer) {
        clearTimeout(automaticTimer);
        automaticTimer = null;
    }
    console.log("⏹️ 自动执行已停止");
}

// 获取执行状态
function getExecutionStatus() {
    if (currentDate && currentDateData.length > 0) {
        return {
            isRunning: isAutomaticRunning,
            mode: 'byDate',
            currentDate: currentDate,
            currentDateIndex: currentDateIndex + 1,
            totalDates: allDates.length,
            currentItemIndex: currentItemIndex + 1,
            currentDateTotal: currentDateData.length,
            overallProgress: \`日期进度: \${currentDateIndex + 1}/\${allDates.length}, 当前日期进度: \${currentItemIndex}/\${currentDateData.length}\`
        };
    } else {
        return {
            isRunning: isAutomaticRunning,
            mode: 'all',
            totalItems: data.length,
            overallProgress: '执行所有数据模式'
        };
    }
}

console.log("执行说明：");
console.log("📋 推荐执行方式：");
console.log("  - automaticByDateApi() - 按日期顺序执行所有日期（API模式，推荐）");
console.log("  - automaticByDateApi('MM.DD') - 从指定日期开始按顺序执行（API模式）");
console.log("\\n🔧 控制函数：");
console.log("  - pauseAutomatic() - 暂停自动执行");
console.log("  - resumeAutomatic() - 恢复自动执行");
console.log("  - stopAutomatic() - 停止自动执行");
console.log("  - getExecutionStatus() - 查看执行状态");
        `;
    }
}

// 全局导出
window.AutomationCodeGenerator = AutomationCodeGenerator;
