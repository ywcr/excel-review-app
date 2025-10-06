/**
 * 自动化签名工具库
 * 包含所有签名相关的工具函数，避免重复生成
 */
(function (window) {
  "use strict";

  // 防止重复加载
  if (window.AutomationSignUtils) {
    console.log("✅ 签名工具库已加载（跳过重复加载）");
    return;
  }

  /**
   * 生成签名（基于内置HMAC-SHA256）
   */
  function generateSign(data, key) {
    try {
      // 使用内置的 sign 和 hex 函数
      const signature = hex(sign(key, data));
      return signature;
    } catch (error) {
      console.error("❌ 内置签名生成失败:", error);
      throw new Error(`签名生成失败: ${error.message}`);
    }
  }

  /**
   * SHA-256 哈希函数（依赖 CryptoJS）
   */
  function sha256(data) {
    if (typeof CryptoJS !== "undefined" && CryptoJS.SHA256) {
      return CryptoJS.SHA256(data);
    }
    throw new Error("SHA-256实现不可用，请确保已加载 CryptoJS");
  }

  /**
   * HMAC 函数（依赖 CryptoJS）
   */
  function hmac(key, data) {
    const encoder = new TextEncoder("utf-8");
    const keyBytes = typeof key === "string" ? encoder.encode(key) : key;
    const dataBytes = typeof data === "string" ? encoder.encode(data) : data;

    // 使用CryptoJS的HMAC-SHA256
    if (typeof CryptoJS !== "undefined" && CryptoJS.HmacSHA256) {
      const keyStr =
        typeof key === "string" ? key : new TextDecoder().decode(key);
      const dataStr =
        typeof data === "string" ? data : new TextDecoder().decode(data);
      const result = CryptoJS.HmacSHA256(dataStr, keyStr);

      // 转换为Uint8Array格式
      const words = result.words;
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 8; i++) {
        const word = words[i];
        bytes[i * 4] = (word >>> 24) & 0xff;
        bytes[i * 4 + 1] = (word >>> 16) & 0xff;
        bytes[i * 4 + 2] = (word >>> 8) & 0xff;
        bytes[i * 4 + 3] = word & 0xff;
      }
      return bytes;
    }

    throw new Error("HMAC-SHA256实现不可用，请确保已加载 CryptoJS");
  }

  /**
   * 签名函数（HMAC包装）
   */
  function sign(inputKey, inputData) {
    return hmac(inputKey, inputData);
  }

  /**
   * 二进制转十六进制字符串
   */
  function hex(bin) {
    if (typeof bin === "string") {
      return bin;
    }
    return bin.reduce(
      (acc, val) => acc + ("00" + val.toString(16)).substr(-2),
      ""
    );
  }

  /**
   * 参数格式化函数（基于dcwj.js）
   * 对参数对象的键进行排序，并递归处理嵌套对象
   */
  function formatParams(arys) {
    let newkey = Object.keys(arys).sort();
    let newObj = Array.isArray(arys) ? [] : {};
    for (let i = 0; i < newkey.length; i++) {
      let currentValue = arys[newkey[i]];
      if (typeof currentValue === "object") {
        if (Array.isArray(currentValue)) {
          let isArrObject = (currentValue || []).every(
            (i) => Object.prototype.toString.call(i) === "[object Object]"
          );
          if (isArrObject) {
            newObj[newkey[i]] = formatParams(currentValue);
          } else {
            newObj[newkey[i]] = currentValue;
          }
        } else {
          newObj[newkey[i]] = formatParams(currentValue);
        }
      } else {
        newObj[newkey[i]] = currentValue;
      }
    }
    return newObj;
  }

  /**
   * 转换为查询字符串（基于dcwj.js）
   * 不使用 URL 编码
   */
  function toQueryString(obj) {
    const part = [];
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object") {
        part.push(`${key}=${JSON.stringify(value)}`);
      } else {
        part.push(`${key}=${value}`);
      }
    }
    return part.join("&");
  }

  // 导出到全局对象
  window.AutomationSignUtils = {
    generateSign: generateSign,
    sha256: sha256,
    hmac: hmac,
    sign: sign,
    hex: hex,
    formatParams: formatParams,
    toQueryString: toQueryString,

    // 版本信息
    version: "1.0.0",

    // 辅助方法：检查依赖
    checkDependencies: function () {
      const hasCryptoJS = typeof CryptoJS !== "undefined";
      const hasHmacSHA256 =
        hasCryptoJS && typeof CryptoJS.HmacSHA256 === "function";

      if (!hasCryptoJS) {
        console.error("❌ 缺少依赖：CryptoJS 未加载");
        console.error("💡 请在加载此工具库之前先加载 CryptoJS");
        return false;
      }

      if (!hasHmacSHA256) {
        console.error("❌ CryptoJS.HmacSHA256 不可用");
        return false;
      }

      return true;
    },
  };

  // 自动检查依赖
  if (window.AutomationSignUtils.checkDependencies()) {
    console.log(
      "✅ 自动化签名工具库加载成功 (v" +
        window.AutomationSignUtils.version +
        ")"
    );
  } else {
    console.warn("⚠️ 签名工具库加载失败：缺少必要依赖");
  }
})(window);
