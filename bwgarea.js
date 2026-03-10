/**
 * BWG 多台 VPS 監控 - 模板參數版
 * 參數格式 (Argument): 
 * 別名1#VEID1#KEY1,別名2#VEID2#KEY2
 */

// 從 Egern 的 Argument 獲取配置並解析
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
        $httpClient.get({ url: url, timeout: 4000 }, (error, response, data) => {
            if (error) return resolve(`❌ ${vps.name}: 連接失敗`);
            try {
                const obj = JSON.parse(data);
                if (obj.error !== 0) return resolve(`❌ ${vps.name}: Key 錯誤`);

                const total = (obj.plan_monthly_data / 1073741824).toFixed(0);
                const used = (obj.data_counter / 1073741824).toFixed(1);
                const remain = (total - used).toFixed(1);
                const percent = Math.min(((used / total) * 100), 100).toFixed(0);
                
                const barNum = Math.floor(percent / 20);
                const bar = "■".repeat(barNum) + "□".repeat(5 - barNum);
                
                resolve(`${vps.name}: ${remain}G / ${total}G ${bar} ${percent}%`);
            } catch (e) {
                resolve(`❌ ${vps.name}: 解析失敗`);
            }
        });
    });
}

async function main() {
    if (vpsList.length === 0) {
        $done({ title: "BWG 監控", content: "未配置參數\n格式: 名稱#VEID#KEY", icon: "exclamationmark.circle" });
        return;
    }

    try {
        const results = await Promise.all(vpsList.map(vps => fetchBWG(vps)));
        $done({
            title: "BWG 流量監控",
            content: results.join("\n"),
            icon: "server.rack.fill",
            "icon-color": "#5ac8fa"
        });
    } catch (err) {
        $done({ title: "BWG 監控", content: "運行出錯", icon: "error" });
    }
}

main();
