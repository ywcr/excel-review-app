import { NextRequest, NextResponse } from "next/server";
import {
  verifyTokenWithSession,
  generateToken,
  findUserByUsername,
  setUserSession,
  hashToken,
  getDeviceInfo,
  type ActiveSession,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 从cookie中获取当前token
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "未找到认证令牌" }, { status: 401 });
    }

    // 🆕 使用增强的token验证（包含会话验证）
    // 对于refresh，我们需要特殊处理，因为token可能即将过期
    let user;
    try {
      user = verifyTokenWithSession(token);
    } catch (error: any) {
      // 如果会话验证失败，尝试基本的token验证
      try {
        user = verifyToken(token);
        if (user) {
          // Token有效但会话可能失效，需要重新验证用户
          const currentUser = findUserByUsername(user.username);
          if (!currentUser || !currentUser.activeSession) {
            return NextResponse.json(
              {
                error: "会话已失效，请重新登录",
              },
              { status: 401 }
            );
          }
        }
      } catch (tokenError: any) {
        // 如果是过期错误，尝试解析过期的token
        if (tokenError.name === "TokenExpiredError") {
          const jwt = await import("jsonwebtoken");
          const JWT_SECRET =
            process.env.JWT_SECRET ||
            "your-super-secret-jwt-key-change-this-in-production";
          user = jwt.decode(token);
        } else {
          return NextResponse.json(
            { error: "无效的认证令牌" },
            { status: 401 }
          );
        }
      }
    }

    if (!user || typeof user === "string" || !user.username) {
      return NextResponse.json({ error: "无效的用户信息" }, { status: 401 });
    }

    // 验证用户是否仍然存在
    const currentUser = findUserByUsername(user.username);
    if (!currentUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    // 生成新的JWT令牌
    const newToken = generateToken(currentUser);

    // 🆕 更新会话信息
    const newTokenHash = hashToken(newToken);

    if (currentUser.activeSession) {
      // 更新现有会话
      const updatedSession: ActiveSession = {
        ...currentUser.activeSession,
        tokenHash: newTokenHash,
        lastActivity: new Date().toISOString(),
      };
      setUserSession(currentUser.id, updatedSession);
    }

    // 创建响应
    const response = NextResponse.json({
      success: true,
      message: "令牌刷新成功",
      user: {
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      },
    });

    // 设置新的HTTP-only cookie
    response.cookies.set("auth-token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("令牌刷新API错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
