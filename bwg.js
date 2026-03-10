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

async function fetchBWG(vps) {
    const url = `https://api.64clouds.com/v1/getServiceInfo?veid=${vps.veid}&api_key=${vps.apiKey}`;
    return new Promise((resolve) => {
        $httpClient.get(url, (error, response, data) => {
            if (error) return resolve(`❌ ${vps.name}: 連接失敗`);
            try {
                const obj = JSON.parse(data);
                if (obj.error !== 0) return resolve(`❌ ${vps.name}: API 密鑰錯誤`);

                const total = (obj.plan_monthly_data / 1073741824).toFixed(1);
                const used = (obj.data_counter / 1073741824).toFixed(1);
                const remain = (total - used).toFixed(1);
                const percent = Math.min(((used / total) * 100), 100).toFixed(0);
                const resetDate = new Date(obj.data_next_reset * 1000).toLocaleDateString("zh-TW", {month:'2-digit', day:'2-digit'});

                // 視覺組件
                const bar = "■".repeat(Math.floor(percent/10)) + "□".repeat(10 - Math.floor(percent/10));
                const alert = percent > 90 ? "🔴" : (percent > 75 ? "🟡" : "🟢");

                resolve(`${alert} **${vps.name}**\n   ${bar} ${percent}%\n   流量: ${remain}G / ${total}G  |  📅 ${resetDate}`);
            } catch (e) {
                resolve(`❌ ${vps.name}: 解析失敗`);
            }
        });
    });
}

async function main() {
    const results = await Promise.all(vpsList.map(vps => fetchBWG(vps)));
    // 使用雙換行分割，增加呼吸感
    const finalContent = results.join("\n\n");

    $notification.post("🚀 搬瓦工流量監控回報", "", finalContent);
    $done();
}

main();

