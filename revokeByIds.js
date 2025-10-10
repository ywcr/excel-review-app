// ==================== 批量撤销已提交问卷（西黄消费者问卷-平晓 / xfzwj） ====================
// 说明：
// - 依据 /lgb/workOrder/mobile/list 拉取工单，使用 workOrderId 作为撤销 id
// - 撤销接口：/lgb/projectJs/returnCh，body: tabName=xfzwj&id=<workOrderId>
// - 仅以 HTTP 200 作为成功标准；响应体为空属正常
// - 顺序执行，默认每条 200ms 间隔，避免过快

(function () {
  const API_BASE = location.origin;
  const API_LIST = "/lgb/workOrder/mobile/list";
  const API_REVOKE = "/lgb/projectJs/returnCh";
  const TAB_NAME = "xfzwj"; // 西黄消费者问卷
  const REQUEST_INTERVAL_MS = 200;

  function logInfo(...args) {
    console.log("%cℹ️", "color:#17a2b8;", ...args);
  }
  function logOk(...args) {
    console.log("%c✅", "color:#28a745;font-weight:bold;", ...args);
  }
  function logWarn(...args) {
    console.log("%c⚠️", "color:#ffc107;font-weight:bold;", ...args);
  }
  function logErr(...args) {
    console.log("%c❌", "color:#dc3545;font-weight:bold;", ...args);
  }
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // 获取 projectId（URL 或 iframe）
  function getProjectIdFromContext() {
    const params = new URLSearchParams(location.search);
    let id = params.get("projectId");
    if (id) return id;
    const iframe =
      document.querySelector("#ssfwIframe") ||
      document.querySelector('iframe[src*="xfzwj"]') ||
      document.querySelector('iframe[src*="hzwj"]') ||
      document.querySelector('iframe[src*="yswj"]') ||
      document.querySelector('iframe[src*="dywj"]');
    if (iframe) {
      try {
        const href = iframe.contentWindow.location.href;
        const p = new URLSearchParams(href.split("?")[1] || "");
        id = p.get("projectId");
        if (id) return id;
      } catch (e) {
        const src = iframe.getAttribute("src") || "";
        const p = new URLSearchParams(src.split("?")[1] || "");
        id = p.get("projectId");
        if (id) return id;
      }
    }
    return null;
  }

  // 将 'MM.DD' 转为 'YYYY-MM-DD'
  function formatDateForList(mmdd) {
    const year = new Date().getFullYear();
    const [m, d] = mmdd.split(".");
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

  // 拉取工单列表（可选按日期过滤）
  async function fetchWorkOrders({ projectId, date /* 'MM.DD' or null */ }) {
    const params = new URLSearchParams({
      searchValue: "",
      pageNum: "1",
      pageSize: "100000",
      projectId: projectId || "",
      queryState: "-1",
    });
    if (date) {
      params.set("date", formatDateForList(date));
    }
    const url = `${API_LIST}?${params.toString()}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`列表请求失败: ${res.status}`);
    const json = await res.json();
    if (json.code !== 200) {
      throw new Error(
        `列表接口返回异常: code=${json.code}, msg=${json.msg || ""}`
      );
    }
    const rows = Array.isArray(json.rows) ? json.rows : [];
    return rows;
  }

  function pickWorkOrderId(row) {
    // 用户说明：用 workOrderId；做个兼容兜底
    return row.workOrderId ?? row.recId ?? row.id ?? null;
  }

  async function revokeOne(workOrderId) {
    const body = new URLSearchParams({
      tabName: TAB_NAME,
      id: String(workOrderId),
    }).toString();
    const res = await fetch(API_REVOKE, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "*/*",
      },
      body,
    });
    // 响应体为空属正常，按 HTTP 200 判定成功
    if (!res.ok) throw new Error(`撤销失败: ${res.status}`);
  }

  async function revokeBatch(ids) {
    let ok = 0,
      fail = 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        await revokeOne(id);
        logOk(`[${i + 1}/${ids.length}] 撤销成功: ${id}`);
        ok++;
      } catch (e) {
        logErr(`[${i + 1}/${ids.length}] 撤销失败: ${id} -> ${e.message || e}`);
        fail++;
      }
      if (i < ids.length - 1) await delay(REQUEST_INTERVAL_MS);
    }
    logInfo(`📊 撤销完成: 成功 ${ok}，失败 ${fail}`);
    return { ok, fail };
  }

  // 对外命令：按日期撤销（MM.DD）
  window.revokeByDate = async function (mmdd) {
    try {
      const projectId = getProjectIdFromContext();
      if (!projectId) {
        logErr("无法获取 projectId，请在包含 projectId 的页面内执行");
        return;
      }
      logInfo(`📅 拉取 ${mmdd} 的工单...`);
      const rows = await fetchWorkOrders({ projectId, date: mmdd });
      const ids = rows.map(pickWorkOrderId).filter(Boolean);
      if (ids.length === 0) {
        logWarn(`未找到需要撤销的工单（${mmdd}）`);
        return;
      }
      logInfo(`共 ${ids.length} 条，开始撤销...`);
      await revokeBatch(ids);
    } catch (e) {
      logErr("revokeByDate 执行失败：", e.message || e);
    }
  };

  // 对外命令：按多个日期撤销（['MM.DD','MM.DD']）
  window.revokeAllForDates = async function (mmddList) {
    if (!Array.isArray(mmddList) || mmddList.length === 0) {
      logWarn('请传入日期数组，如 revokeAllForDates(["08.21","08.22"])');
      return;
    }
    const projectId = getProjectIdFromContext();
    if (!projectId) {
      logErr("无法获取 projectId，请在包含 projectId 的页面内执行");
      return;
    }
    let total = 0,
      ok = 0,
      fail = 0;
    for (const mmdd of mmddList) {
      try {
        logInfo(`📅 拉取 ${mmdd} 的工单...`);
        const rows = await fetchWorkOrders({ projectId, date: mmdd });
        const ids = rows.map(pickWorkOrderId).filter(Boolean);
        logInfo(`📦 ${mmdd} 需要撤销：${ids.length} 条`);
        total += ids.length;
        const res = await revokeBatch(ids);
        ok += res.ok;
        fail += res.fail;
      } catch (e) {
        logErr(`日期 ${mmdd} 处理失败：`, e.message || e);
      }
      // 日期之间稍作停顿
      await delay(500);
    }
    logInfo(`📊 所有日期处理完成：合计 ${total}，成功 ${ok}，失败 ${fail}`);
  };

  // 对外命令：按 id 列表撤销（已有 workOrderId 的场景）
  window.revokeByIds = async function (idList) {
    if (!Array.isArray(idList) || idList.length === 0) {
      logWarn('请传入 id 数组，如 revokeByIds(["1759...","1759..."])');
      return;
    }
    logInfo(`共 ${idList.length} 条，开始撤销...`);
    await revokeBatch(idList);
  };

  logInfo(
    '🎯 撤销命令就绪：revokeByDate("MM.DD"), revokeAllForDates(["MM.DD",...]), revokeByIds([id,...])'
  );
})();
