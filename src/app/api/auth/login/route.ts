import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证输入
    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 验证用户凭据
    const user = await authenticateUser(username, password);

    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    // 生成JWT令牌
    const token = generateToken(user);

    // 创建响应（减少敏感信息）
    const response = NextResponse.json({
      success: true,
      message: "登录成功",
      // 不在响应中包含用户信息，通过cookie和后续API获取
    });

    // 设置HTTP-only cookie（增强安全性）
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: true, // 总是要求HTTPS
      sameSite: "strict", // 更严格的同站策略
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      path: "/",
    });

    return response;
  } catch (error) {
    console.error('登录API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
