// 搬瓦工 (BWG) 流量面板小组件
// 环境变量格式：VPS1=name#veid#apikey ... VPS5=name#veid#apikey
// 例如：VPS1=香港 CN2 GIA#123456#PRIVATE_KEY_1

export default async function (ctx) {
  const MAX = 5;
  const slots = [];

  // 調試：打印可用的環境變量方式
  console.log("ctx.env:", ctx.env);
  console.log("ctx:", Object.keys(ctx));

  for (let i = 1; i <= MAX; i++) {
    const config = (ctx.env[`VPS${i}`] || "").trim();
    if (!config) continue;

    const parts = config.split("#").map(s => s.trim());
    if (parts.length < 3) continue;

    const [name, veid, apiKey] = parts;
    if (!veid || !apiKey) continue;

    slots.push({
      name: name || `VPS ${i}`,
      veid,
      apiKey,
    });
  }

  const refreshTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const bgGradient = {
    type: "linear",
    colors: ["#1B3A6B", "#1E3A8A", "#2D1B69", "#1A1040"],
    stops: [0, 0.35, 0.7, 1],
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 0.8, y: 1 },
  };

  if (!slots.length) {
    // 調試信息：列出所有可用的環境變量方式
    let debugInfo = "無法讀取環境變量";
    if (ctx.env) {
      const envKeys = Object.keys(ctx.env).filter(k => k.includes("VPS")).join(", ");
      debugInfo = envKeys ? `已配置: ${envKeys}` : "環境變數無法讀取";
    }

    return {
      type: "widget",
      padding: 16,
      gap: 10,
      backgroundGradient: bgGradient,
      refreshAfter: refreshTime,
      children: [
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 6,
          children: [
            {
              type: "image",
              src: "sf-symbol:chart.bar.fill",
              width: 13,
              height: 13,
              color: "#6E7FF3",
            },
            {
              type: "text",
              text: "订阅流量",
              font: { size: "caption1", weight: "semibold" },
              textColor: "#FFFFFF66",
            },
          ],
        },
        { type: "spacer" },
        {
          type: "text",
          text: "请配置 VPS1 环境变量 (格式: name#veid#apikey)",
          font: { size: "caption1" },
          textColor: "#FF453A",
          textAlign: "center",
        },
        {
          type: "text",
          text: debugInfo,
          font: { size: "caption2" },
          textColor: "#FFFFFF44",
          textAlign: "center",
        },
      ],
    };
  }

  const results = await Promise.all(slots.map((s) => fetchBWGInfo(ctx, s)));
  const cards = results.map((r) => buildCard(r, slots.length));

  return {
    type: "widget",
    padding: [14, 14, 12, 14],
    gap: 10,
    backgroundGradient: bgGradient,
    refreshAfter: refreshTime,
    children: [
      // 顶部标题栏
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 5,
        children: [
          {
            type: "image",
            src: "sf-symbol:chart.bar.fill",
            width: 13,
            height: 13,
            color: "#6E7FF3",
          },
          {
            type: "text",
            text: "订阅流量",
            font: { size: "caption1", weight: "semibold" },
            textColor: "#FFFFFF55",
          },
          { type: "spacer" },
          {
            type: "image",
            src: "sf-symbol:clock",
            width: 11,
            height: 11,
            color: "#FFFFFF33",
          },
          {
            type: "text",
            text: timeStr,
            font: { size: "caption2" },
            textColor: "#FFFFFF44",
          },
        ],
      },

      // 卡片列表
      {
        type: "stack",
        direction: "column",
        gap: slots.length === 1 ? 0 : 7,
        children: cards,
      },

      { type: "spacer" },
    ],
  };
}

// ─── 卡片构建 ─────────────────────────────────────────────────

function buildCard(result, total) {
  const { name, error, errorMsg, used, totalBytes, percent, expire, remainDays } = result;

  const usageColor =
    error
      ? "#FF453A"
      : percent >= 90
      ? "#FF453A"
      : percent >= 70
      ? "#FF9F0A"
      : "#34D399";

  // 错误卡片
  if (error) {
    return {
      type: "stack",
      direction: "column",
      gap: 4,
      padding: [9, 11, 9, 11],
      backgroundColor: "#FFFFFF07",
      borderRadius: 11,
      borderWidth: 0.5,
      borderColor: "#FF453A28",
      children: [
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 6,
          children: [
            {
              type: "image",
              src: "sf-symbol:exclamationmark.circle.fill",
              width: 12,
              height: 12,
              color: "#FF453A",
            },
            {
              type: "text",
              text: name,
              font: { size: "caption1", weight: "semibold" },
              textColor: "#FFFFFFCC",
              maxLines: 1,
              minScale: 0.8,
              flex: 1,
            },
          ],
        },
        {
          type: "text",
          text: errorMsg || "获取失败",
          font: { size: "caption2" },
          textColor: "#FF9F0A",
          maxLines: 2,
        },
      ],
    };
  }

  // 到期文字
  let expireText = "";
  let expireColor = "#FFFFFF40";
  if (expire) {
    const daysLeft = Math.ceil((expire * 1000 - Date.now()) / 86400000);
    if (daysLeft < 0) {
      expireText = "已到期";
      expireColor = "#FF453A";
    } else if (daysLeft <= 7) {
      expireText = `${daysLeft}天后到期`;
      expireColor = "#FF9F0A";
    } else {
      expireText = formatDate(expire);
    }
  } else if (remainDays !== null) {
    expireText = `${remainDays}天重置`;
    expireColor = remainDays <= 3 ? "#FF9F0A" : "#FFFFFF40";
  }

  const barFilled = Math.round(Math.min(Math.max(percent, 0), 100) / 10);
  const barEmpty = 10 - barFilled;
  const isSingle = total === 1;

  return {
    type: "stack",
    direction: "column",
    gap: 0,
    padding: isSingle ? [11, 13, 11, 13] : [9, 11, 9, 11],
    backgroundColor: "#FFFFFF08",
    borderRadius: 11,
    borderWidth: 0.5,
    borderColor: "#FFFFFF10",
    children: [
      // ── 第一行：名称 + 到期 ──
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 5,
        children: [
          {
            type: "image",
            src: "sf-symbol:dot.radiowaves.left.and.right",
            width: 12,
            height: 12,
            color: usageColor,
          },
          {
            type: "text",
            text: name,
            font: { size: "caption1", weight: "semibold" },
            textColor: "#FFFFFFDD",
            maxLines: 1,
            minScale: 0.75,
            flex: 1,
          },
          ...(expireText
            ? [
                {
                  type: "text",
                  text: expireText,
                  font: { size: "caption2" },
                  textColor: expireColor,
                },
              ]
            : []),
        ],
      },

      // ── 名称与进度条之间固定间距 ──
      {
        type: "stack",
        direction: "row",
        height: 10,
        children: [],
      },

      // ── 第二行：进度条 ──
      {
        type: "stack",
        direction: "row",
        gap: 3,
        alignItems: "center",
        children: [
          ...(barFilled > 0
            ? [
                {
                  type: "stack",
                  flex: barFilled,
                  height: isSingle ? 5 : 4,
                  backgroundColor: usageColor,
                  borderRadius: 99,
                  children: [],
                },
              ]
            : []),
          ...(barEmpty > 0
            ? [
                {
                  type: "stack",
                  flex: barEmpty,
                  height: isSingle ? 5 : 4,
                  backgroundColor: "#FFFFFF15",
                  borderRadius: 99,
                  children: [],
                },
              ]
            : []),
        ],
      },

      // ── 进度条与用量行之间固定间距 ──
      {
        type: "stack",
        direction: "row",
        height: 5,
        children: [],
      },

      // ── 第三行：用量 + 百分比 ──
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        children: [
          {
            type: "text",
            text: `${bytesToSize(used)} / ${bytesToSize(totalBytes)}`,
            font: { size: "caption2", weight: "medium" },
            textColor: "#FFFFFFAA",
          },
          { type: "spacer" },
          {
            type: "text",
            text: `${percent.toFixed(1)}%`,
            font: { size: "caption2", weight: "semibold" },
            textColor: usageColor,
          },
        ],
      },
    ],
  };
}

// ─── 搬瓦工 API 请求 ─────────────────────────────────────────────────

async function fetchBWGInfo(ctx, slot) {
  if (!slot.veid || !slot.apiKey) {
    return { name: slot.name, error: true, errorMsg: "缺少 VEID 或 API Key" };
  }

  const url = `https://api.64clouds.com/v1/getServiceInfo?veid=${slot.veid}&api_key=${slot.apiKey}`;

  try {
    const resp = await ctx.http.get(url, { timeout: 9000 });

    if (!resp.body) {
      return { name: slot.name, error: true, errorMsg: "API 無響應" };
    }

    const obj = JSON.parse(resp.body);

    if (obj.error !== 0) {
      const errorMap = {
        1: "API Key 錯誤",
        2: "無效的 VEID",
        3: "VPS 已被刪除",
        4: "VPS 已暫停",
      };
      return { name: slot.name, error: true, errorMsg: errorMap[obj.error] || `API 錯誤 ${obj.error}` };
    }

    // 计算数据（使用 1024^3 = 1073741824）
    const totalBytes = obj.plan_monthly_data || 0;
    const used = obj.data_counter || 0;
    const percent = totalBytes > 0 ? (used / totalBytes) * 100 : 0;

    // 处理重置日期
    const resetTs = obj.data_next_reset || null;
    let remainDays = null;
    if (resetTs) {
      const resetDate = new Date(resetTs * 1000);
      const now = new Date();
      remainDays = Math.max(0, Math.ceil((resetDate - now) / 86400000));
    }

    return {
      name: slot.name,
      error: null,
      used,
      totalBytes,
      percent,
      expire: null,
      remainDays: remainDays,
    };
  } catch (err) {
    return { name: slot.name, error: true, errorMsg: `請求失敗: ${err.message || "未知錯誤"}` };
  }
}

// ─── 工具函数 ─────────────────────────────────────────────────

function bytesToSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function formatDate(ts) {
  const d = new Date(ts > 1e12 ? ts : ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
