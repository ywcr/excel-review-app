/**
 * Vercel Serverless API - 服装季节检测
 * 
 * 由于Vercel不支持运行Python AI模型，本API提供两种模式：
 * 1. 基于规则的简化检测（纯TS实现）
 * 2. 调用外部AI服务（如果配置了第三方API）
 */

import { NextRequest, NextResponse } from 'next/server';

// 季节定义
const SEASON_MAP = {
  spring: { months: [3, 4, 5], name: '春季', expected: 'light' },
  summer: { months: [6, 7, 8], name: '夏季', expected: 'summer' },
  autumn: { months: [9, 10, 11], name: '秋季', expected: 'light' },
  winter: { months: [12, 1, 2], name: '冬季', expected: 'winter' }
};

// 换季月份
const TRANSITION_MONTHS = [3, 5, 9, 11];

/**
 * 获取当前季节
 */
function getCurrentSeason(month?: number) {
  const currentMonth = month || new Date().getMonth() + 1;
  
  for (const [key, value] of Object.entries(SEASON_MAP)) {
    if (value.months.includes(currentMonth)) {
      return {
        seasonKey: key,
        seasonName: value.name,
        expectedClothing: value.expected,
        isTransition: TRANSITION_MONTHS.includes(currentMonth),
        month: currentMonth
      };
    }
  }
  
  return {
    seasonKey: 'summer',
    seasonName: '夏季',
    expectedClothing: 'summer',
    isTransition: false,
    month: currentMonth
  };
}

/**
 * GET /api/clothing-detect - 获取当前季节信息
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month');
  
  const seasonInfo = getCurrentSeason(month ? parseInt(month) : undefined);
  
  return NextResponse.json({
    success: true,
    data: seasonInfo,
    mode: 'rule-based'
  });
}

/**
 * POST /api/clothing-detect - 检测图片服装（简化版）
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const expectedSeason = formData.get('expected_season') as string | null;
    const month = formData.get('month') as string | null;
    const tolerance = parseFloat(formData.get('tolerance') as string || '0.2');
    
    // 获取季节信息
    const seasonInfo = getCurrentSeason(month ? parseInt(month) : undefined);
    const finalExpectedSeason = expectedSeason || seasonInfo.expectedClothing;
    
    // 调整容差（换季期）
    const adjustedTolerance = seasonInfo.isTransition 
      ? tolerance * 1.5 
      : tolerance;
    
    // ⚠️ 简化检测逻辑（无AI模型）
    // 在Vercel Serverless环境中，我们返回一个占位结果
    // 实际检测需要调用外部AI服务或使用客户端检测
    
    const result = {
      success: true,
      mode: 'placeholder',
      warning: '此为占位响应。完整AI检测需要外部服务支持。',
      data: {
        has_person: false,
        person_count: 0,
        season_name: seasonInfo.seasonName,
        expected_season: finalExpectedSeason,
        is_transition_period: seasonInfo.isTransition,
        compliant_count: 0,
        compliance_rate: 0,
        overall_compliant: null,
        message: '服装检测功能需要AI服务支持',
        tolerance: adjustedTolerance
      }
    };
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: '服装检测失败'
      },
      { status: 500 }
    );
  }
}
