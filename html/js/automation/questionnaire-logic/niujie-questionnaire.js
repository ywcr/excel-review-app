// ==================== 牛解消费者问卷逻辑 ====================

/**
 * 牛解消费者问卷逻辑类
 */
class NiujieQuestionnaire extends BaseQuestionnaire {
  constructor(config) {
    super(config);
  }

  /**
   * 获取牛解消费者问卷答题逻辑
   */
  getQuestionLogic() {
    return `
// ==================== 牛解消费者问卷答题逻辑 ====================

${this.getRandomAnswerFunctions()}

// 1、您的年龄？
function _answer0() {
    const option = ['20岁以下', '20-35岁', '35-45岁','45-60岁','60岁以上'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、您的职业？
function _answer1() {
    const answer0 = window._answer0 ? window._answer0() : '20-35岁';
    const option = [];
    if(answer0 == "20岁以下"){
        option.push("学生");
    } else if(answer0 == "20-35岁"){
        option.push("企业或公司职工","政府工作人员","医药专业人士","个体户","学生");
    } else {
        option.push("企业或公司职工","政府工作人员","医药专业人士","个体户");
    }
    const index = random(0, option.length - 1);
    return option[index];
}

// 3、您一般购买牛黄解毒丸的渠道是？
function _answer2() {
    const option = ['网上购买', '等级医院', '药店', '社区乡镇医院'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、您一般选购牛黄解毒丸的依据是什么？
function _answer3() {
    const option = ['遵医嘱', '电视广告', '网络、杂志介绍','药店服务人员推荐','亲朋好友推荐','个人经验'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 5、影响您选择同仁堂品牌药品的因素有哪些？
function _answer4(){
    const option = ['疗效', '价格', '服务','品牌规模','医生推荐','广告普及度'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 6、对于药品广告您主要通过哪类媒体了解？
function _answer5() {
    const option = ['电视', '网络', '杂志','传单','户外广告'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 7、您对药品广告的信任程度是？
function _answer6(){
    return randomAnswerByRate(['非常信任', '信任'],['不一定','不信任','非常不信任'],0.19);
}

// 8、您选择药店会考虑哪些因素？
function _answer7(){
    const option = ['离家较近', '口碑更好', '药师服务更好', '药店专业形象', '家人朋友推荐'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 9、您在药店购买药品比较在意哪几点？
function _answer8(){
    const option = ['药品价格', '店员是否会乱推荐', '药品不良反应', '无法判断疗效', '副作用','是否医保'];
    const index = random(0, option.length - 1);
    return option[index];
}
`;
  }
}

// 导出
window.NiujieQuestionnaire = NiujieQuestionnaire;
