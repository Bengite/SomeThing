/**
 * 🚀 全功能网络看板 Pro (沉浸左对齐版 · 原汁原味修复版)
 * 仅修改深色模式背景色为 #121212，完美融入系统卡片，绝不乱改字体和数据项
 */
export default async function(ctx) {
  // ===================== iOS 深浅自适应主题 =====================
  // 🌟 核心修复：深色背景改为 #121212，解决与系统背景糊在一起的问题
  const BG_MAIN   = { light: '#FFFFFF', dark: '#121212' };
  const C_TEXT    = { light: '#333333', dark: '#E5E5EA' };
  const C_SUB     = { light: '#8E8E93', dark: '#8E8E93' };
  const C_TITLE   = { light: '#111111', dark: '#FFFFFF' };

  const C_GREEN   = { light: '#34C759', dark: '#30D158' };
  const C_BLUE    = { light: '#007AFF', dark: '#0A84FF' };
  const C_PURPLE  = { light: '#5856D6', dark: '#5E5CE6' };
  const C_ORANGE  = { light: '#FF9500', dark: '#FF9F0A' };
  const C_RED     = { light: '#FF3B30', dark: '#FF453A' };

  // ===================== 辅助函数 =====================
  const fmtLocalISP = (isp) => {
    if (!isp) return "未知";
    const s = String(isp).toLowerCase();
    if (/移动|mobile|cmcc/i.test(s)) return "中国移动";
    if (/电信|telecom|chinanet/i.test(s)) return "中国电信";
    if (/联通|unicom/i.test(s)) return "中国联通";
    if (/广电|broadcast|cbn/i.test(s)) return "中国广电";
    return isp;
  };

  const fmtProxyISP = (isp) => {
    if (!isp) return "未知商家";
    let s = String(isp);
    if (/it7/i.test(s)) return "IT7 Network";
    if (/dmit/i.test(s)) return "DMIT Network";
    if (/cloudflare/i.test(s)) return "Cloudflare";
    if (/akamai/i.test(s)) return "Akamai";
    if (/amazon|aws/i.test(s)) return "AWS";
    if (/google/i.test(s)) return "Google Cloud";
    if (/microsoft|azure/i.test(s)) return "Microsoft Azure";
    if (/alibaba|aliyun/i.test(s)) return "阿里云";
    if (/tencent/i.test(s)) return "腾讯云";
    if (/oracle/i.test(s)) return "Oracle Cloud";
    return s.length > 15 ? s.substring(0, 15) + "..." : s;
  };

  const getFlag = (code) => {
    if (!code || code.toUpperCase() === 'TW') return '🇨🇳';
    if (code.toUpperCase() === 'XX' || code === 'OK') return '✅';
    return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt()));
  };

  // ===================== 网络状态获取 =====================
  const d = ctx.device || {};
  const isWifi = !!d.wifi?.ssid;
  let netName = "未连接", netIcon = "wifi";

  const netInfo = (typeof $network !== 'undefined') ? $network : (ctx.network || {});
  let localIp = netInfo.v4?.primaryAddress || "—";
  let gateway = netInfo.v4?.primaryRouter || "—";

  if (isWifi) {
    netName = d.wifi.ssid;
  } else if (d.cellular?.radio) {
    const radioMap = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G", "NRNSA": "5G" };
    const rawRadio = d.cellular.radio.toUpperCase().replace(/\s+/g, "");
    netName = radioMap[rawRadio] || rawRadio;
    netIcon = "antenna.radiowaves.left.and.right";
    gateway = "蜂窝内网";
  }

  // ===================== 解锁检测核心算法 =====================
  const BASE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
  const commonHeaders = { "User-Agent": BASE_UA };
  const readBody = async (r) => {
    if (!r) return "";
    if (typeof r.body === "string" && r.body.length) return r.body;
    if (typeof r.text === "function") {
      try { const t = await r.text(); return typeof t === "string" ? t : ""; } catch { return ""; }
    }
    return "";
  };

  async function checkNetflix(ctx) {
    try {
      const fetchTitle = async (url) => {
        const r = await ctx.http.get(url, { timeout: 6000, headers: commonHeaders, followRedirect: true }).catch(() => null);
        return { body: await readBody(r) || "" };
      };
      const [t1, t2] = await Promise.all([ fetchTitle("https://www.netflix.com/title/81280792"), fetchTitle("https://www.netflix.com/title/70143836") ]);
      if (!t1.body && !t2.body) return "❌";
      let region = "XX";
      for (const b of [t1.body, t2.body].filter(Boolean)) {
        const m1 = b.match(/"countryCode"\s*:\s*"?([A-Z]{2})"?/);
        if (m1?.[1]) { region = m1[1]; break; }
      }
      const oh1 = t1.body && /oh no!/i.test(t1.body);
      const oh2 = t2.body && /oh no!/i.test(t2.body);
      if (oh1 && oh2) return "🍿";
      if (!oh1 || !oh2) return region.toUpperCase() || "XX";
      return "❌";
    } catch { return "❌"; }
  }

  async function checkTikTok(ctx) {
    try {
      const fetchOnce = async (url) => {
        const r = await ctx.http.get(url, { timeout: 5000, headers: commonHeaders, followRedirect: true }).catch(() => null);
        return await readBody(r) || "";
      };
      let body = await fetchOnce("https://www.tiktok.com/");
      if (body.includes("Please wait...")) body = await fetchOnce("https://www.tiktok.com/explore") || body;
      const m = body.match(/"region"\s*:\s*"([A-Z]{2})"/);
      return m?.[1] ? m[1] : (body ? "OK" : "❌");
    } catch { return "❌"; }
  }

  async function checkGemini(ctx) {
    try {
      const res = await ctx.http.post('https://gemini.google.com/_/BardChatUi/data/batchexecute', {
        timeout: 6000, headers: { ...commonHeaders, "Content-Type": "application/x-www-form-urlencoded" },
        body: 'f.req=[["K4WWud","[[0],[\"en-US\"]]",null,"generic"]]', followRedirect: true
      }).catch(() => null);
      const txt = await readBody(res);
      if (!txt) return "❌";
      let m = txt.match(/"countryCode"\s*:\s*"([A-Z]{2})"/i);
      return m?.[1] ? m[1].toUpperCase() : "OK";
    } catch { return "❌"; }
  }

  async function checkChatGPT(ctx) {
    try {
      const headRes = await ctx.http.get("https://chatgpt.com", { timeout: 6000, headers: commonHeaders, followRedirect: false }).catch(() => null);
      const webAccessible = !!headRes && !!(headRes?.headers?.location || headRes?.headers?.Location);
      const iosRes = await ctx.http.get("https://ios.chat.openai.com", { timeout: 6000, headers: commonHeaders, followRedirect: true }).catch(() => null);
      const iosBody = await readBody(iosRes);
      const appBlocked = !iosBody || iosBody.includes("blocked") || iosBody.includes("unsupported");
      const appAccessible = !!iosBody && !appBlocked;

      if (!webAccessible && !appAccessible) return "❌";
      if (appAccessible && !webAccessible) return "APP";
      if (webAccessible && appAccessible) {
        const traceRes = await ctx.http.get("https://chatgpt.com/cdn-cgi/trace", { timeout: 5000, headers: commonHeaders, followRedirect: true }).catch(() => null);
        const m = (await readBody(traceRes)).match(/loc=([A-Z]{2})/);
        return m?.[1] || "XX";
      }
      return "❌";
    } catch { return "❌"; }
  }

  // ===================== 并发请求执行 =====================
  const globalStart = Date.now();
  let realTcpDelay = 0;

  const unlockTasks = [
    checkChatGPT(ctx).then(region => ({ name: "GPT", region })),
    checkNetflix(ctx).then(region => ({ name: "NF", region })),
    checkTikTok(ctx).then(region => ({ name: "TK", region })),
    checkGemini(ctx).then(region => ({ name: "GMNI", region }))
  ];

  const [pingTask, lResRaw, nResRaw, pureResRaw, ...unlockResults] = await Promise.all([
    ctx.http.get("http://connectivitycheck.gstatic.com/generate_204", { timeout: 2000 })
      .then(() => { realTcpDelay = Date.now() - globalStart; }).catch(() => {}),
    ctx.http.get('https://myip.ipip.net/json', { headers: commonHeaders, timeout: 4000 }).catch(() => null),
    ctx.http.get('http://ip-api.com/json/?lang=zh-CN', { timeout: 4000 }).catch(() => null),
    ctx.http.get('https://my.ippure.com/v1/info', { timeout: 4000 }).catch(() => null),
    ...unlockTasks
  ]);

  // ===================== 数据解析与渲染 =====================
  let lIp = "—", lLoc = "—", lIsp = "—";
  try {
    if (lResRaw) {
      const body = JSON.parse(await lResRaw.text());
      lIp = body.data.ip || lIp;
      const locArr = body.data.location || [];
      lLoc = `中国${locArr[1] || ""}${locArr[2] || ""}`.trim();
      lIsp = fmtLocalISP(locArr[4] || locArr[3]);
    }
  } catch (e) {}

  let nIp = "—", nLoc = "—", asn = "—", nCountryCode = "XX", proxyProvider = "—";
  try {
    if (nResRaw) {
      const nData = JSON.parse(await nResRaw.text());
      nIp = nData.query || nIp;
      nCountryCode = nData.countryCode || "XX";
      nLoc = `${nData.country || ""} ${nData.city || ""}`.trim();
      const asnMatch = nData.as ? nData.as.match(/(AS\d+)/) : null;
      asn = asnMatch ? asnMatch[1] : "未知ASN";
      proxyProvider = fmtProxyISP(nData.isp || nData.org);
    }
  } catch (e) {}

  let pureData = {};
  try { if (pureResRaw) pureData = JSON.parse(await pureResRaw.text()); } catch (e) {}

  let ipTypeStr = "代理网络";
  if (pureData.isResidential === true) ipTypeStr = "家庭宽带";
  else if (pureData.isResidential === false) ipTypeStr = "商业机房";

  const risk = pureData.fraudScore;
  let riskTxt = "获取超时", riskCol = C_SUB;
  if (risk !== undefined) {
    if (risk >= 80) { riskTxt = `极高危 (${risk})`; riskCol = C_RED; }
    else if (risk >= 70) { riskTxt = `高危 (${risk})`; riskCol = C_ORANGE; }
    else if (risk >= 35) { riskTxt = `中危 (${risk})`; riskCol = C_ORANGE; }
    else { riskTxt = `低危 (${risk})`; riskCol = C_GREEN; }
  }

  const unlockText = unlockResults.map(r => {
    if (r.region === "❌") return `${r.name}:🚫`;
    if (r.region === "🍿") return `${r.name}:🍿`;
    if (r.region === "APP") return `${r.name}:📱`;
    const finalReg = (r.region && r.region !== "OK" && r.region !== "XX") ? r.region : nCountryCode;
    return `${r.name}:${getFlag(finalReg)}`;
  }).join("  ");

  let delayColor = C_SUB;
  if (realTcpDelay > 0) {
    if (realTcpDelay < 150) delayColor = C_GREEN;
    else if (realTcpDelay <= 350) delayColor = C_ORANGE;
    else delayColor = C_RED;
  }

  const headerTitle = lIsp !== "未知" ? `${lIsp} · ${netName}` : netName;
  const dNow = new Date();
  const timeStr = `${String(dNow.getHours()).padStart(2, '0')}:${String(dNow.getMinutes()).padStart(2, '0')}:${String(dNow.getSeconds()).padStart(2, '0')}`;

  // ===================== UI 布局组件 (绝对保留原版字体和间距) =====================
  const Row = (ic, labelCol, label, val, isLast = false) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap: 6, padding: [2.5, 0],
    children: [
      { type: 'image', src: `sf-symbol:${ic}`, color: labelCol, width: 13, height: 13 },
      { type: 'text', text: label, font: { size: 12, weight: 'bold' }, textColor: labelCol },
      { type: 'text', text: val, font: { size: 12 }, textColor: C_TEXT, maxLines: isLast ? 2 : 1 },
      { type: 'spacer' }
    ]
  });

  return {
    type: 'widget',
    padding: 14,
    backgroundColor: BG_MAIN, // 🌟 应用了解决边界问题的背景色
    refreshPolicy: { onNetworkChange: true, onEnter: true, timeout: 10 },
    children: [
      // 头部：原封不动的 14 号粗体 (heavy)
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
          { type: 'image', src: `sf-symbol:${netIcon}`, color: C_TITLE, width: 16, height: 16 },
          { type: 'text', text: headerTitle, font: { size: 14, weight: 'heavy' }, textColor: C_TITLE },
          { type: 'spacer' },
          { type: 'stack', direction: 'row', alignItems: 'center', gap: 3, children: [
             { type: 'image', src: 'sf-symbol:clock', color: delayColor, width: 11, height: 11 },
             { type: 'text', text: realTcpDelay > 0 ? `${realTcpDelay} ms` : '超时', font: { size: 12, weight: 'bold' }, textColor: delayColor }
          ]}
      ]},
      { type: 'spacer', length: 10 },

      // 内容区：原封不动的 5 行内容
      { type: 'stack', direction: 'column', gap: 1, children: [
          Row("house.fill", C_GREEN, "内网", ` ${localIp} / ${gateway}`),
          Row("paperplane.circle.fill", C_BLUE, "本地", ` ${lIp} / ${lLoc}`),
          Row("globe", C_PURPLE, "落地", ` ${nIp} / ${getFlag(nCountryCode)} ${nLoc} / ${asn}`),
          Row("shield.lefthalf.filled", riskCol, "属性", ` ${proxyProvider} / ${ipTypeStr} / ${riskTxt}`),
          Row("play.tv.fill", C_ORANGE, "解锁", ` ${unlockText}`, true)
      ]},
      { type: 'spacer' },

      // 底部：只加了时间，不重复显示“商业机房”
      { type: 'stack', direction: 'row', alignItems: 'center', children: [
          { type: 'image', src: 'sf-symbol:arrow.triangle.2.circlepath', color: C_SUB, width: 9, height: 9 },
          { type: 'text', text: ` 刷新于 ${timeStr}`, font: { size: 10, weight: 'medium' }, textColor: C_SUB },
          { type: 'spacer' }
      ]}
    ]
  };
}
