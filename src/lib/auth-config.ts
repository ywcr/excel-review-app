// 认证配置
export const AUTH_CONFIG = {
  // JWT设置
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "your-super-secret-jwt-key-change-this-in-production",

  // 令牌过期时间设置
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",

  // 自动刷新设置
  AUTO_REFRESH_ENABLED: process.env.AUTO_REFRESH_ENABLED !== "false", // 默认启用
  AUTO_REFRESH_INTERVAL: parseInt(
    process.env.AUTO_REFRESH_INTERVAL || "1200000"
  ), // 20分钟

  // 任务期间会话保持设置
  TASK_SESSION_KEEP_ALIVE: process.env.TASK_SESSION_KEEP_ALIVE !== "false", // 默认启用
  TASK_REFRESH_INTERVAL: parseInt(
    process.env.TASK_REFRESH_INTERVAL || "300000"
  ), // 5分钟

  // Cookie设置
  COOKIE_NAME: "auth-token",
  COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24小时

  // 安全设置
  SECURE_COOKIES: process.env.NODE_ENV === "production",
  SAME_SITE: "lax" as const,
  HTTP_ONLY: true,
};

// 获取JWT过期时间（毫秒）
export function getJWTExpirationMs(): number {
  const expiresIn = AUTH_CONFIG.JWT_EXPIRES_IN;

  if (typeof expiresIn === "string") {
    // 解析时间字符串 (如 "24h", "7d", "30m")
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case "s":
          return value * 1000;
        case "m":
          return value * 60 * 1000;
        case "h":
          return value * 60 * 60 * 1000;
        case "d":
          return value * 24 * 60 * 60 * 1000;
        default:
          return 24 * 60 * 60 * 1000; // 默认24小时
      }
    }
  }

  return 24 * 60 * 60 * 1000; // 默认24小时
}

// 检查是否需要刷新令牌（在过期前5分钟刷新）
export function shouldRefreshToken(tokenExp: number): boolean {
  const now = Date.now() / 1000;
  const timeUntilExpiry = tokenExp - now;
  const refreshThreshold = 5 * 60; // 5分钟

  return timeUntilExpiry <= refreshThreshold;
}
