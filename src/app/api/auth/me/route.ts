import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenWithSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // 从cookie中获取token
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 🆕 使用增强的token验证（包含会话验证）
    const user = verifyTokenWithSession(token);

    if (!user) {
      return NextResponse.json(
        { error: "无效的认证令牌或会话已失效" },
        { status: 401 }
      );
    }

    // 返回用户信息
    return NextResponse.json({
      success: true,
      user: {
        id: user.userId,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('获取用户信息API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
