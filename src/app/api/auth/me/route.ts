// 获取当前用户信息 API

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuthResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        createAuthResponse(false, '未登录或登录已过期'),
        { status: 401 }
      );
    }

    return NextResponse.json(
      createAuthResponse(true, '获取用户信息成功', user),
      { status: 200 }
    );
  } catch (error) {
    console.error('获取用户信息API错误:', error);
    
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
