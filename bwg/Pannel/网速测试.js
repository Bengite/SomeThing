// 网络测速小组件
// 使用 Cloudflare 测速 API，无需 API Key。
// 测试单位：MB/s
//
// 环境变量：
//   MB     - 每次测试流量（MB），默认 3
//   TITLE  - 自定义标题，默认 "NetSpeed"

export default async function (ctx) {
  const mb = parseFloat(ctx.env.MB) || 20;
  const bytes = Math.round(mb * 1024 * 1024);

  let speedMBs = "--";
  let speedMbps = "--";
  let ping = "--";
  let duration = "--";
  let statusIcon = "wifi.slash";
  let statusColor = "#FFFFFF99";
  let statusLabel = "测速失败";
  let timeLabel = "--";
  let gradientColors = ["#1C1C1E", "#2C2C2E", "#3A3A3C"];

  try {
    const dlStart = Date.now();
    const dlResp = await ctx.http.get(
      `https://speed.cloudflare.com/__down?bytes=${bytes}`,
      { timeout: 15000 }
    );
    await dlResp.text();
    const dlEnd = Date.now();
    const dlDuration = (dlEnd - dlStart) / 1000;

    const pingStart = Date.now();
    await ctx.http.get("https://cp.cloudflare.com/generate_204", { timeout: 8000 });
    const pingEnd = Date.now();

    const rawPing = pingEnd - pingStart;
    const rawMBs = mb / dlDuration;
    const rawMbps = rawMBs * 8;

    speedMBs = rawMBs.toFixed(2);
    speedMbps = rawMbps.toFixed(1);
    ping = rawPing;
    duration = dlDuration.toFixed(2);

    if (rawMbps >= 120) {
      statusIcon = "hare.fill";
      statusColor = "#34D399";
      statusLabel = "极速";
      gradientColors = ["#064E3B", "#065F46", "#047857"];
    } else if (rawMbps >= 30) {
      statusIcon = "figure.run";
      statusColor = "#FBBF24";
      statusLabel = "良好";
      gradientColors = ["#451A03", "#78350F", "#92400E"];
    } else {
      statusIcon = "tortoise.fill";
      statusColor = "#F87171";
      statusLabel = "较慢";
      gradientColors = ["#450A0A", "#7F1D1D", "#991B1B"];
    }

    const now = new Date();
    timeLabel = now.toTimeString().slice(0, 8);
  } catch (e) {
    statusIcon = "wifi.exclamationmark";
    statusLabel = "连接失败";
    gradientColors = ["#1C1C1E", "#2C2C2E", "#3A3A3C"];
  }

  const refreshTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const statItem = (icon, value, label) => ({
    type: "stack",
    direction: "column",
    alignItems: "center",
    gap: 3,
    children: [
      {
        type: "image",
        src: `sf-symbol:${icon}`,
        width: 13,
        height: 13,
        color: "#FFFFFF55",
      },
      {
        type: "text",
        text: value,
        font: { size: "caption2", weight: "semibold" },
        textColor: "#FFFFFFDD",
      },
      {
        type: "text",
        text: label,
        font: { size: "caption2", weight: "regular" },
        textColor: "#FFFFFF55",
      },
    ],
  });

  return {
    type: "widget",
    padding: 14,
    gap: 6,
    backgroundGradient: {
      type: "linear",
      colors: gradientColors,
      stops: [0, 0.55, 1],
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0.4, y: 1 },
    },
    refreshAfter: refreshTime,
    children: [
      // 顶部：标题 + 状态
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 5,
        children: [
          {
            type: "text",
            text: "NetSpeed",
            font: { size: "caption1", weight: "medium" },
            textColor: "#FFFFFF99",
          },
          { type: "spacer" },
          {
            type: "stack",
            direction: "row",
            alignItems: "center",
            gap: 3,
            children: [
              {
                type: "image",
                src: `sf-symbol:${statusIcon}`,
                width: 14,
                height: 14,
                color: statusColor,
              },
              {
                type: "text",
                text: statusLabel,
                font: { size: "caption2", weight: "medium" },
                textColor: statusColor,
              },
            ],
          },
        ],
      },

      // 主速度显示
      {
        type: "stack",
        direction: "row",
        alignItems: "end",
        gap: 4,
        children: [
          {
            type: "text",
            text: `${speedMBs}`,
            font: { size: 42, weight: "thin" },
            textColor: "#FFFFFF",
          },
          {
            type: "stack",
            direction: "column",
            alignItems: "start",
            padding: [0, 0, 9, 0],
            gap: 1,
            children: [
              {
                type: "text",
                text: "MB/s",
                font: { size: "caption1", weight: "semibold" },
                textColor: "#FFFFFFCC",
              },
              {
                type: "text",
                text: `${speedMbps} Mbps`,
                font: { size: "caption2", weight: "regular" },
                textColor: "#FFFFFF66",
              },
            ],
          },
        ],
      },

      { type: "spacer" },

      // 底部指标：延迟 / 耗时 / 时间（图标统一无色）
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 0,
        children: [
          statItem(
            "antenna.radiowaves.left.and.right",
            ping !== "--" ? `${ping}ms` : "--",
            "延迟"
          ),
          { type: "spacer" },
          statItem(
            "timer",
            duration !== "--" ? `${duration}s` : "--",
            "耗时"
          ),
          { type: "spacer" },
          statItem(
            "clock",
            timeLabel,
            "时间"
          ),
        ],
      },
    ],
  };
}
