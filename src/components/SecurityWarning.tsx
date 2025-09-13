"use client";

import { useEffect, useState } from 'react';

export default function SecurityWarning() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // 只在开发环境且非HTTPS时显示警告
    if (
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:'
    ) {
      setShowWarning(true);
    }
  }, []);

  if (!showWarning) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black px-4 py-2 text-sm z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">⚠️ 安全警告:</span>
          <span>
            当前使用HTTP连接，登录信息可能被窃取。生产环境请务必使用HTTPS！
          </span>
        </div>
        <button
          onClick={() => setShowWarning(false)}
          className="text-black hover:text-gray-700 font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
