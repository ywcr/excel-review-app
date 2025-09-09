// 发送验证码 API

import { NextRequest, NextResponse } from 'next/server';
import { VerificationCodeService } from '@/lib/auth/verificationCode';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    // 验证请求参数
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: '手机号不能为空'
        },
        { status: 400 }
      );
    }

    // 发送验证码
    const result = await VerificationCodeService.sendCode(phone);

    // 根据结果返回相应的状态码
    const status = result.success ? 200 : 400;

    return NextResponse.json(result, { status });
  } catch (error) {
    console.error('发送验证码API错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: '服务器内部错误'
      },
      { status: 500 }
    );
  }
}

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
