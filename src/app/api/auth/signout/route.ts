// 用户退出登录 API

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth/jwt';
import { createAuthResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 创建响应
    const response = NextResponse.json(
      createAuthResponse(true, '退出登录成功'),
      { status: 200 }
    );

    // 清除认证Cookie
    response.headers.set('Set-Cookie', clearAuthCookie());

    return response;
  } catch (error) {
    console.error('退出登录API错误:', error);
    
    return NextResponse.json(
      createAuthResponse(false, '服务器内部错误'),
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
