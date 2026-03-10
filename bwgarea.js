/**
 * BWG 多台 VPS 監控 - 視覺美化版
 * 格式：名稱 -> 流量狀況 -> 重置日期加
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
            if (error) return resolve(`❌ ${vps.name}\n   連接失敗`);
            try {
                const obj = JSON.parse(data);
                if (obj.error !== 0) return resolve(`❌ ${vps.name}\n   API Key 錯誤`);

                // 數據處理 (GB)
                const total = (obj.plan_monthly_data / 1073741824).toFixed(0);
                const used = (obj.data_counter / 1073741824).toFixed(1);
                const remain = (total - used).toFixed(1);
                const percent = Math.min(((used / total) * 100), 100).toFixed(0);
                
                // 日期處理
                const d = new Date(obj.data_next_reset * 1000);
                const resetDate = `${d.getMonth() + 1}月${d.getDate()}日`;

                // 視覺組件
                const barNum = Math.floor(percent / 10);
                const bar = "■".repeat(barNum) + "□".repeat(10 - barNum);
                const statusEmoji = percent > 90 ? "🔴" : (percent > 70 ? "🟡" : "🟢");

                // --- 格式化輸出 ---
                // 第一行：名稱
                const line1 = `${statusEmoji} **${vps.name.toUpperCase()}**`;
                // 第二行：流量進度條
                const line2 = `   💧 流量: ${bar} ${percent}%`;
                // 第三行：剩餘詳情與日期
                const line3 = `   📅 剩餘: ${remain}G / ${total}G  |  ⏳ ${resetDate} 重置`;

                resolve(`${line1}\n${line2}\n${line3}`);
            } catch (e) {
                resolve(`❌ ${vps.name}\n   數據解析失敗`);
            }
        });
    });
}

async function main() {
    if (vpsList.length === 0) {
        $done({ title: "BWG 監控", content: "⚠️ 未配置參數\n格式: 名稱#VEID#KEY", icon: "info.circle" });
        return;
    }

    try {
        const results = await Promise.all(vpsList.map(vps => fetchBWG(vps)));
        
        // 使用分隔線增加美感
        const separator = "\n" + "─".repeat(20) + "\n";
        const panelBody = results.join(separator);

        $done({
            title: "BandwagonHost 實時狀態",
            content: panelBody,
            icon: "network",
            "icon-color": "#34C759" // 綠色圖標
        });
    } catch (err) {
        $done({ title: "BWG 監控", content: "運行出錯", icon: "error" });
    }
}

main();
