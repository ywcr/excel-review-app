// ==================== 六味患者问卷逻辑 ====================

/**
 * 六味患者问卷逻辑类
 */
class LiuweiQuestionnaire extends BaseQuestionnaire {
  constructor(config) {
    super(config);
  }

  /**
   * 获取六味患者问卷答题逻辑
   */
  getQuestionLogic() {
    return `
// ==================== 六味患者问卷答题逻辑 ====================

${this.getRandomAnswerFunctions()}

// 1、您的年龄？
function _answer0() {
    const option = ['20岁以下', '20-35岁', '35-45岁','45-60岁','60岁以上'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、您是通过什么渠道了解到六味地黄丸的？
function _answer1() {
    const option = ['医生推荐', '药店推荐', '朋友介绍','广告宣传','自己了解'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 3、您使用六味地黄丸主要是为了治疗什么症状？
function _answer2() {
    const option = ['肾虚', '腰膝酸软', '头晕耳鸣', '盗汗遗精', '消渴'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、您使用六味地黄丸的频率是怎样的？
function _answer3() {
    const option = ['每天按时服用', '隔天服用', '症状严重时服用', '偶尔服用'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 5、您觉得六味地黄丸的治疗效果如何？
function _answer4() {
    return randomAnswerByRate(['非常有效', '有效', '一般'], ['不太有效'], 0.15);
}

// 6、您在服用六味地黄丸期间是否有不良反应？
function _answer5(){
    return randomAnswerByRate(['无不良反应'], ['有轻微不适', '有明显不良反应'], 0.20);
}

// 7、您对六味地黄丸的服用方法是否满意？
function _answer6(){
    const option = ['很满意，服用方便', '一般，可以接受', '不太满意，服用不便'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 8、您会推荐六味地黄丸给其他有类似症状的人吗？
function _answer7(){
    return randomAnswerByRate(['会，效果好，愿意推荐'], ['看情况，如果别人有需要会推荐', '不确定'], 0.25);
}

// 9、您对六味地黄丸的价格是否满意？
function _answer8(){
    return randomAnswerByRate(['满意，价格合理','可以接受'], ['不满意，价格过高'], 0.15);
}

// 10、您在服用六味地黄丸的过程中，是否同时使用了其他药物？
function _answer9(){
    const option=['是，同时使用了其他药物','否，仅使用了六味地黄丸'];
    const index = random(0, option.length - 1);
    return option[index];
}
`;
  }
}

// 导出
window.LiuweiQuestionnaire = LiuweiQuestionnaire;
