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

  $httpClient.get(URL, function(error, response, data) {
    if (error) {
        console.log("網絡請求失敗: " + error);
        $notification.post("BWG 查詢失敗", "請檢查網絡或 API 配置", error);
        $done();
        return;
    }

    const obj = JSON.parse(data);
    
    if (obj.error !== 0) {
        $notification.post("BWG API 錯誤", "錯誤代碼: " + obj.error, obj.message);
        $done();
        return;
    }

    // 數據單位轉換 (API 返回的是 Byte)
    const totalGB = (obj.plan_monthly_data / 1024 / 1024 / 1024).toFixed(2);
    const usedGB = (obj.data_counter / 1024 / 1024 / 1024).toFixed(2);
    const remainingGB = (totalGB - usedGB).toFixed(2);
    const usagePercent = ((usedGB / totalGB) * 100).toFixed(2);
    
    // 獲取重置日期 (API 返回的是 Unix 時間戳)
    const resetDate = new Date(obj.data_next_reset * 1000).toLocaleDateString("zh-CN");

    // 拼湊通知內容
    const title = `VPS 流量報表 (${obj.hostname})`;
    const subtitle = `剩餘: ${remainingGB} GB | 已用: ${usagePercent}%`;
    const content = `總計: ${totalGB} GB\n已用: ${usedGB} GB\n重置日期: ${resetDate}`;

    // 發送通知到系統
    $notification.post(title, subtitle, content);
    
    console.log(`${title}\n${subtitle}\n${content}`);
    $done();
});
}

main();

