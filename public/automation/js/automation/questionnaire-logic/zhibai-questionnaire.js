// ==================== 知柏消费者问卷逻辑 ====================

/**
 * 知柏消费者问卷逻辑类
 */
class ZhibaiQuestionnaire extends BaseQuestionnaire {
  constructor(config) {
    super(config);
  }

  /**
   * 获取知柏消费者问卷答题逻辑
   */
  getQuestionLogic() {
    return `
// ==================== 知柏消费者问卷答题逻辑 ====================

${this.getRandomAnswerFunctions()}

// 1、您的年龄？
function _answer0() {
    const option = ['20岁以下', '20-35岁', '35-45岁','45-60岁','60岁以上'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、您在什么情况下会去药店买药？
function _answer1() {
    const option = ['身体不适', '自身保健需要', '为亲友购药','咨询用药问题','药店有促销活动'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 3、您选择药店会考虑哪些因素？
function _answer2() {
    const option = ['离家较近', '口碑更好', '药师服务更好', '药店专业形象', '家人朋友推荐'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、您买知柏地黄丸时是否会受周围药品广告的影响？
function _answer3() {
    const option = ['会，但是影响不大', '不会', '会，而且影响很大'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 5、您选择这家药店购买知柏地黄丸的原因
function _answer4() {
    const answer2 = window._answer2 ? window._answer2() : '离家较近';
    const option = [];
    if (answer2 == '离家较近'){
        option.push('交通便利');
    } else if(answer2 == '口碑更好'){
        option.push('质量好');
    } else if(answer2 == '药师服务更好'){
        option.push('服务周到');
    } else {
        option.push('交通便利', '质量好', '服务周到');
    }
    const index = random(0, option.length - 1);
    return option[index];
}

// 6、在药店购买知柏地黄丸时，药店的哪种行为对你的购药选择影响最大
function _answer5() {
    const option = ['专业知识', '服务态度', '讲解能力','店员形象'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 7、您在购买知柏地黄丸时，营业人员中医药专业知识如何？
function _answer6(){
    const option = ['很专业', '一般专业', '不专业'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 8、在您购买知柏地黄丸时，药师是否向您说明中成药的使用禁忌和注意事项？
function _answer7(){
    const option=['每次都是','多数','偶尔','从不'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 9、您是否满意药店推荐给您的知柏地黄丸的药物效果？
function _answer8(){
    return randomAnswerByRate(['是'],['否'],0.18);
}
`;
  }
}

// 导出
window.ZhibaiQuestionnaire = ZhibaiQuestionnaire;
