// 检查活跃会话 API

import { NextRequest, NextResponse } from 'next/server';
import { UserStorage } from '@/lib/auth/fileStorage';
import { createAuthResponse } from '@/lib/auth';

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

    // 查找用户
    const user = await UserStorage.findByPhone(phone);

    if (!user) {
      return NextResponse.json(
        {
          success: true,
          hasActiveSession: false,
          message: '用户不存在'
        },
        { status: 200 }
      );
    }

    // 检查最后登录时间
    const lastLoginTime = new Date(user.lastLoginAt).getTime();
    const now = Date.now();
    const timeSinceLastLogin = now - lastLoginTime;
    
    // 如果最后登录时间在7天内，认为有活跃会话
    const hasActiveSession = timeSinceLastLogin < 7 * 24 * 60 * 60 * 1000;

    return NextResponse.json(
      {
        success: true,
        hasActiveSession,
        lastLoginAt: user.lastLoginAt,
        message: hasActiveSession ? '检测到活跃会话' : '无活跃会话'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('检查会话API错误:', error);
    
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
