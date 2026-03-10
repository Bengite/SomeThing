/**
 * 搬瓦工 (BWG) 多台 VPS 流量彙整腳本 for Egern
 */

// --- 配置區域：在此添加你的 VPS 信息 ---
const vpsList = [
    { name: "香港 CN2 GIA", veid: "123456", apiKey: "PRIVATE_KEY_1" },
    { name: "洛杉磯 DC9", veid: "789012", apiKey: "PRIVATE_KEY_2" },
    { name: "日本軟銀", veid: "345678", apiKey: "PRIVATE_KEY_3" }
];
// ---------------------------------------

// 核心請求函數
function fetchBWG(vps) {
    const url = `https://api.64clouds.com/v1/getServiceInfo?veid=${vps.veid}&api_key=${vps.apiKey}`;
    return new Promise((resolve) => {
        $httpClient.get({ url: url, timeout: 5000 }, (error, response, data) => {
            if (error) {
                console.log(`[${vps.name}] 請求失敗: ${error}`);
                resolve(`❌ ${vps.name}: 連接超時`);
                return;
            }
            try {
                const obj = JSON.parse(data);
                if (obj.error !== 0) {
                    resolve(`❌ ${vps.name}: API Key 錯誤`);
                    return;
                }

                // 計算數據 (使用 1024^3)
                const total = (obj.plan_monthly_data / 1073741824).toFixed(1);
                const used = (obj.data_counter / 1073741824).toFixed(1);
                const remain = (total - used).toFixed(1);
                const percent = Math.min(((used / total) * 100), 100).toFixed(0);
                
                // 處理日期
                const d = new Date(obj.data_next_reset * 1000);
                const resetDate = `${d.getMonth() + 1}/${d.getDate()}`;

                // 構建美化樣式
                const barNum = Math.floor(percent / 10);
                const bar = "■".repeat(barNum) + "□".repeat(10 - barNum);
                const alert = percent > 90 ? "🔴" : (percent > 70 ? "🟡" : "🟢");

                resolve(`${alert} **${vps.name}**\n   ${bar} ${percent}%\n   剩餘: ${remain}G / ${total}G | 🗓️ ${resetDate}`);
            } catch (e) {
                console.log(`[${vps.name}] 解析出錯: ${e}`);
                resolve(`❌ ${vps.name}: 數據解析失敗`);
            }
        });
    });
}

// 主邏輯
async function main() {
    console.log("BWG 腳本開始運行...");
    try {
        const results = await Promise.all(vpsList.map(vps => fetchBWG(vps)));
        const finalContent = results.join("\n\n");

        // 同時輸出到通知和日誌
        $notification.post("🚀 搬瓦工流量監控", "", finalContent);
        console.log("查詢結果:\n" + finalContent);
    } catch (err) {
        console.log("主程序出錯: " + err);
    } finally {
        // 確保腳本結束，否則 Egern 可能會卡死或不顯示
        $done();
    }
}

main();


