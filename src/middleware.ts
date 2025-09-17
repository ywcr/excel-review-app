import { NextRequest, NextResponse } from "next/server";
import { decodeJWT, validateSessionInEdge } from "@/lib/auth-edge";

// 需要认证的路径
const protectedPaths = [
  "/",
  "/api/tasks",
  "/api/templates",
  "/api/test",
  "/api/test-templates",
];

// 公开路径（不需要认证）
const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"];

// 强制HTTPS重定向（生产环境）
function enforceHTTPS(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    request.headers.get("x-forwarded-proto") !== "https"
  ) {
    return NextResponse.redirect(
      `https://${request.headers.get("host")}${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    );
  }
  return null;
}

// 添加安全头
function addSecurityHeaders(response: NextResponse) {
  // 安全头
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // 在生产环境中强制HTTPS
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 强制HTTPS（生产环境）
  const httpsRedirect = enforceHTTPS(request);
  if (httpsRedirect) {
    return httpsRedirect;
  }

  // 检查是否是公开路径
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // 检查是否是需要保护的路径
  const isProtectedPath = protectedPaths.some((path) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  });

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // 从cookie中获取token
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    // 如果是API路径，返回401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 如果是页面路径，重定向到登录页
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 验证token（在Edge Runtime中只能做基本验证）
  let user = decodeJWT(token);

  if (!user || !validateSessionInEdge(token)) {
    // 如果是API请求，返回401让前端处理刷新
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "认证令牌已过期或会话无效",
        },
        { status: 401 }
      );
    }

    // 如果是页面请求，重定向到登录页
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);

    // 清除过期的cookie
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return addSecurityHeaders(response);
  }

  // 在请求头中添加用户信息，供API使用
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", user.userId);
  requestHeaders.set("x-user-username", user.username);
  requestHeaders.set("x-user-role", user.role);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下开头的：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon文件)
     * - public文件夹中的文件
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
