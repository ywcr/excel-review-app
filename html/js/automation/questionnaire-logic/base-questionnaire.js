// ==================== 基础问卷逻辑类 ====================

/**
 * 基础问卷逻辑类
 * 所有具体问卷类型都应该继承此类
 */
class BaseQuestionnaire {
    constructor(config) {
        this.config = config;
        this.name = config.name;
        this.contactType = config.contactType;
        this.hasChannel = config.hasChannel;
    }

    /**
     * 获取问卷答题逻辑代码
     * 子类必须实现此方法
     */
    getQuestionLogic() {
        throw new Error(`${this.name} 必须实现 getQuestionLogic 方法`);
    }

    /**
     * 获取联系人创建逻辑
     */
    getContactCreationLogic() {
        return `
// ==================== ${this.contactType}创建逻辑 ====================

// 查询${this.contactType}是否存在
function getSame(name, sex) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/lgb/lxrgl/getMessage",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                lxrType: "${this.contactType}",
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

// 查询已存在联系人性别（按姓名+类型）
function getContactSexByName(name, lxrType) {
    return new Promise((resolve) => {
        $.ajax({
            url: "/lgb/lxrgl/getList",
            type: "POST",
            data: {
                page: 1,
                key: name,
                lxrType: lxrType,
                way: "myLinker",
                hospitalName: "",
                departmentName: "",
                orderKey: 3
            },
            traditional: true,
            success: function(res) {
                try {
                    if ((res.code === 0 || res.code === '0') && Array.isArray(res.data) && res.data.length > 0) {
                        // 优先精确匹配姓名和类型
                        var match = res.data.find(function(item){ return item && item.name === name && item.lxrType === lxrType; });
                        var target = match || res.data[0];
                        resolve(target && target.sex ? target.sex : null);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            },
            error: function() { resolve(null); }
        });
    });
}

// 创建${this.contactType}
function addContact(name, sex) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/lgb/lxrgl/save",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                lxrType: "${this.contactType}",
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

// 执行创建${this.contactType}任务
async function startAddContact() {
    console.log('👥 准备创建${this.contactType}，共' + data.length + '个');
    
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
                // 已存在 -> 调用列表接口校验性别并修正本地数据
                const fetchedSex = await getContactSexByName(name, "${this.contactType}");
                if (fetchedSex && fetchedSex !== sex) {
                    console.log('[' + (i + 1) + '/' + data.length + '] ${this.contactType}已存在：' + name + '，性别已由「' + sex + '」修正为「' + fetchedSex + '」');
                    data[i].sex = fetchedSex;
                } else {
                    console.log('[' + (i + 1) + '/' + data.length + '] ${this.contactType}已存在：' + name + (fetchedSex ? '，性别一致：' + fetchedSex : '，未获取到性别'));
                }
                existCount++;
            }
        });
    }
    
    console.log('✅ ${this.contactType}创建完毕！');
    console.log('📊 统计: 新建' + successCount + '个, 已存在' + existCount + '个');
}
`;
    }

    /**
     * 获取渠道创建逻辑（医院创建）
     * 只有需要渠道的问卷才会使用
     */
    getChannelCreationLogic() {
        if (!this.hasChannel) {
            return "// 此问卷类型不需要创建医院";
        }

        return `
// ==================== 医院创建逻辑 ====================

// 创建医院
function addChannel(channelName, address) {
    return new Promise((resolve) => {
        let adcode = getCode(address);
        $.ajax({
            url: "/lgb/qdkh/save",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                channelName: channelName,
                channelType: "医院",
                address: address,
                adcode: adcode,
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

// 获取地区代码
function getCode(address) {
    const codes = {
        '北京': '110000',
        '上海': '310000',
        '广州': '440100',
        '深圳': '440300',
        '杭州': '330100',
        '成都': '510100',
        '武汉': '420100',
        '西安': '610100',
        '南京': '320100',
        '重庆': '500000'
    };
    
    for (let city in codes) {
        if (address.includes(city)) {
            return codes[city];
        }
    }
    return '110000'; // 默认北京
}

// 执行创建医院任务
async function startAddChannel() {
    const uniqueHospitals = [...new Set(data.filter(item => item.hospital).map(item => ({
        hospital: item.hospital || '医院',
        address: item.address || '北京市朝阳区'
    })))];
    
    console.log('🏥 准备创建医院，共' + uniqueHospitals.length + '个');
    
    for (let i = 0; i < uniqueHospitals.length; i++) {
        const {hospital, address} = uniqueHospitals[i];
        await addChannel(hospital, address);
        console.log('[' + (i + 1) + '/' + uniqueHospitals.length + '] 医院创建成功：' + hospital);
    }
    console.log('✅ 医院创建完毕！');
}
`;
    }

    /**
     * 生成随机答案的通用函数
     */
    getRandomAnswerFunctions() {
        return `
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
}

/**
 * 问卷逻辑工厂类
 */
class QuestionnaireLogicFactory {
    static create(questionnaireType) {
        switch (questionnaireType) {
            case "西黄消费者问卷-致力庆":
                return new XihuangQuestionnaire(CONFIG.questionnaireTypes.xihuang_consumer);
            case "西黄消费者问卷-平晓":
                return new XihuangQuestionnaire(CONFIG.questionnaireTypes.xihuang_consumer_pingxiao);
            case "牛解消费者问卷":
                return new NiujieQuestionnaire(CONFIG.questionnaireTypes.niujie_consumer);
            case "知柏消费者问卷":
                return new ZhibaiQuestionnaire(CONFIG.questionnaireTypes.zhibai_consumer);
            case "六味患者问卷":
                return new LiuweiQuestionnaire(CONFIG.questionnaireTypes.liuwei_patient);
            case "贴膏患者问卷":
                return new TiegaoQuestionnaire(CONFIG.questionnaireTypes.tiegao_patient);
            default:
                throw new Error(`不支持的问卷类型: ${questionnaireType}`);
        }
    }
}

// 导出
window.BaseQuestionnaire = BaseQuestionnaire;
window.QuestionnaireLogicFactory = QuestionnaireLogicFactory;
