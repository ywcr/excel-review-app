import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  generateToken,
  clearUserSession,
  setUserSession,
  generateSessionId,
  hashToken,
  getDeviceInfo,
  type ActiveSession,
} from "@/lib/auth";

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

    // 🆕 检查是否已有活跃会话，如果有则清除（实现互踢）
    if (user.activeSession) {
      console.log(`用户 ${username} 在其他设备登录，清除之前的会话`);
      clearUserSession(user.id);
    }

    // 🆕 创建新的会话信息
    const sessionId = generateSessionId();
    const deviceInfo = getDeviceInfo(request);

    // 生成JWT令牌（包含会话ID）
    const token = generateToken(user, sessionId);
    const tokenHash = hashToken(token);

    const newSession: ActiveSession = {
      sessionId,
      tokenHash,
      deviceInfo,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    // 🆕 保存会话信息
    setUserSession(user.id, newSession);

    // 创建响应（不返回敏感信息）
    const response = NextResponse.json({
      success: true,
      message: "登录成功",
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
    console.error("登录API错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
