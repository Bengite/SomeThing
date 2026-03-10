// == Egern Script ==
// @name         BWG 流量查詢 (剩餘 + 重置日期)
// @description  透過搬瓦工官方 API 獲取 VPS 已用/剩餘流量，並估算下次重置日期
// @type         generic
// @author       Grok
// @version      1.0
// @icon         https://www.bandwagonhost.com/favicon.ico
// ==/Egern Script ==

async function main() {
  // === 請替換成你自己的資訊 ===
  const veid = "你的VEID";          // 例如 "1234567"
  const api_key = "你的API_KEY";    // 例如 "private_xxxxxxxxxxxxxxxxxxxxxxxx"
  const resetDay = 15;               // 你的流量重置日（購買當天的「日」，1~31）

  const url = `https://api.64clouds.com/v1/getServiceInfo?veid=${veid}&api_key=${api_key}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'no-cors',          // 嘗試 no-cors 模式，繞過部分 CORS 檢查（但 response 會 opaque）
      cache: 'no-cache',
      redirect: 'follow'
    });

    // 如果用 no-cors，response.ok 會是 false，但我們可以試讀 body
    if (!response.ok && response.type !== 'opaque') {
      throw new Error(`HTTP 錯誤: ${response.status} - ${response.statusText}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      throw new Error("無法解析 JSON: " + jsonErr.message + " (可能是 no-cors 導致 body 不可讀)");
    }

    if (data.error) {
      $done({ title: "BWG API 錯誤", content: data.error });
      return;
    }

    const usedBytes = data.data_counter || 0;
    const totalBytes = data.plan_monthly_data || 0;
    const usedGB = (usedBytes / (1024 ** 3)).toFixed(2);
    const totalGB = (totalBytes / (1024 ** 3)).toFixed(2);
    const remainingGB = (totalGB - usedGB).toFixed(2);

    const now = new Date();
    let resetDate = new Date(now.getFullYear(), now.getMonth(), resetDay);
    if (now > resetDate) {
      resetDate.setMonth(resetDate.getMonth() + 1);
    }
    const resetStr = resetDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

    const title = "搬瓦工 VPS 流量狀態";
    const content = `總配額：${totalGB} GB\n已用：${usedGB} GB\n剩餘：${remainingGB} GB\n下次重置：${resetStr} (購買日 ${resetDay} 號)`;

    $notification.post(title, "", content);
    $done({ title, content });

  } catch (err) {
    let msg = err.message || "未知錯誤";
    if (msg.includes("Load failed") || msg.includes("TypeError")) {
      msg = "Load failed - 常見原因：1. 代理節點失效（請設 DIRECT）；2. CORS 限制；3. MITM 干擾；4. 網路/DNS 問題。";
    }
    console.log("錯誤詳情: " + msg + "\nURL: " + url);
    $notification.post("BWG 查詢失敗", "", msg + "\n請檢查規則設 DIRECT");
    $done({ title: "錯誤", content: msg });
  }
}

main();
