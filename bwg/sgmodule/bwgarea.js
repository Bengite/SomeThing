/**
 * BWG VPS Status Panel (Egern Style)
 * 模仿「機場訂閱.js」精緻風格
 * 參數格式: 名稱#VEID#KEY,名稱#VEID#KEY
 */

let vpsList = [];
if (typeof $argument !== "undefined" && $argument !== "") {
    vpsList = $argument.split(",").map(item => {
        const [name, veid, apiKey] = item.split("#");
        return { name, veid, apiKey };
    });
}

async function fetchBWG(vps) {
    const url = `https://api.64clouds.com/v1/getServiceInfo?veid=${vps.veid}&api_key=${vps.apiKey}`;
    return new Promise((resolve) => {
        $httpClient.get({ url: url, timeout: 5000 }, (error, response, data) => {
            if (error) return resolve(`🚫 **${vps.name}**\n   └ 網絡連接超時`);
            try {
                const obj = JSON.parse(data);
                if (obj.error !== 0) return resolve(`⚠️ **${vps.name}**\n   └ API 配置無效`);

                // 數據轉換
                const total = (obj.plan_monthly_data / 1073741824).toFixed(0);
                const used = (obj.data_counter / 1073741824).toFixed(2);
                const remain = (total - used).toFixed(2);
                const percent = Math.min(((used / total) * 100), 100).toFixed(1);
                
                // 日期格式化 (MM-DD)
                const d = new Date(obj.data_next_reset * 1000);
                const resetDate = `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

                // 顏色與狀態控制 (模仿原腳本邏輯)
                let icon = "🟢";
                if (percent > 60) icon = "🟡";
                if (percent > 85) icon = "🔴";

                // 生成進度條 (8格)
                const barLen = 8;
                const barUsed = Math.round((percent / 100) * barLen);
                const bar = "●".repeat(barUsed) + "○".repeat(barLen - barUsed);

                // 拼湊精美樣式
                let res = `${icon} **${vps.name.toUpperCase()}**\n`;
                res += `   📊 使用：${used} / ${total} GB (${percent}%)\n`;
                res += `   ⏳ 狀態：${bar} 剩餘 ${remain} GB\n`;
                res += `   🗓️ 重置：${resetDate} (UTC+0)`;

                resolve(res);
            } catch (e) {
                resolve(`❌ **${vps.name}**\n   └ 數據解析異常`);
            }
        });
    });
}

async function main() {
    if (vpsList.length === 0) {
        $done({ title: "VPS 流量監控", content: "未檢測到參數配置\n請在插件參數中輸入 名稱#VEID#KEY", icon: "exclamationmark.triangle.fill", "icon-color": "#FFCC00" });
        return;
    }

    try {
        const results = await Promise.all(vpsList.map(vps => fetchBWG(vps)));
        const finalBody = results.join("\n" + "─".repeat(15) + "\n");

        $done({
            title: "BandwagonHost 控制面板",
            content: finalBody,
            icon: "icloud.and.arrow.down.fill",
            "icon-color": "#5856D6" // 使用原腳本風格的紫色調
        });
    } catch (err) {
        $done({ title: "ERROR", content: err.toString() });
    }
}

main();
