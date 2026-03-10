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
    const res = await $http.get({
      url: url,
      headers: { "User-Agent": "Egern Script" }  // 可選，加個 UA 偽裝
    });
  
    if (res.statusCode !== 200) {
      throw new Error(`HTTP ${res.statusCode}`);
    }
  
    const data = JSON.parse(res.body);

    if (data.error) {
      console.log("API 錯誤：" + data.error);
      $done({ title: "BWG 流量查詢失敗", content: data.error });
      return;
    }

    // 流量單位：bytes → GB (保留2位小數)
    const usedBytes = data.data_counter || 0;
    const totalBytes = data.plan_monthly_data || 0;
    const usedGB = (usedBytes / (1024 ** 3)).toFixed(2);
    const totalGB = (totalBytes / (1024 ** 3)).toFixed(2);
    const remainingGB = (totalGB - usedGB).toFixed(2);

    // 計算下次重置日期（簡單估算：當前月份 + resetDay，如果已過就下個月）
    const now = new Date();
    let resetDate = new Date(now.getFullYear(), now.getMonth(), resetDay);

    if (now > resetDate) {
      // 已過本月重置日 → 下個月
      resetDate.setMonth(resetDate.getMonth() + 1);
    }

    const resetStr = resetDate.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // 輸出到 Egern 通知或面板（視你怎麼用）
    const title = "搬瓦工 VPS 流量狀態";
    const content =
      `總配額：${totalGB} GB\n` +
      `已用：${usedGB} GB\n` +
      `剩餘：${remainingGB} GB\n` +
      `下次重置日期：${resetStr} (購買日 ${resetDay} 號)`;

    console.log(content);
    $notification.post(title, "", content);  // 彈通知（如果 Egern 支援）
    // 或用 $done 輸出到面板：$done({title: title, content: content});

  } catch (err) {
    console.log("查詢失敗：" + err);
    $done({ title: "BWG API 錯誤", content: err.message });
  }
}


main();
