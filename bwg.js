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
            if (error) {
                resolve(`❌ ${vps.name}: 請求失敗`);
                return;
            }
            
            try {
                const obj = JSON.parse(data);
                if (obj.error !== 0) {
                    resolve(`❌ ${vps.name}: API 錯誤(${obj.error})`);
                    return;
                }

                // 計算數據
                const totalGB = (obj.plan_monthly_data / 1024 / 1024 / 1024).toFixed(1);
                const usedGB = (obj.data_counter / 1024 / 1024 / 1024).toFixed(1);
                const remainGB = (totalGB - usedGB).toFixed(1);
                const percent = ((usedGB / totalGB) * 100).toFixed(0);
                const resetDate = new Date(obj.data_next_reset * 1000).toLocaleDateString("zh-TW", {month:'numeric', day:'numeric'});

                // 格式化單行輸出
                resolve(`📊 ${vps.name}\n   剩餘: ${remainGB}G | 已用: ${percent}% | 重置: ${resetDate}`);
            } catch (e) {
                resolve(`❌ ${vps.name}: 解析解析失敗`);
            }
        });
    });
}

async function main() {
    const results = await Promise.all(vpsList.map(vps => fetchBWG(vps)));
    const finalContent = results.join("\n" + "─".repeat(20) + "\n");

    $notification.post("BWG 雲服務器監控", `共計 ${vpsList.length} 台設備`, finalContent);
    console.log(finalContent);
    $done();
}

main();
