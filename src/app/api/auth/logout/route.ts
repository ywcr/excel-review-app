import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, clearUserSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 🆕 获取当前用户信息并清除会话
    const token = request.cookies.get("auth-token")?.value;
    if (token) {
      const user = verifyToken(token); // 使用原始验证函数获取用户信息
      if (user) {
        clearUserSession(user.userId);
        console.log(`用户 ${user.username} 登出，清除会话`);
      }
    }

    // 创建响应
    const response = NextResponse.json({
      success: true,
      message: "登出成功",
    });

    // 清除认证cookie
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // 立即过期
      path: "/",
    });

    return response;
  } catch (error) {
    console.error('登出API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
