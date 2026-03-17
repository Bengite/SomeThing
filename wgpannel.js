/**
 * Egern 面板腳本 - BWG API 版
 * 環境變量格式: nems#VEID#API_KEY
 */

(async () => {
    // 1. 獲取環境變量
    const config = $arguments || ""; // 假設你透過 argument 傳入，或使用 $persistentStore
    const [name, veid, apiKey] = config.split("#");

    if (!veid || !apiKey) {
        $done({
            title: "BWG 配置錯誤",
            content: "請檢查環境變量格式是否為: 名字#VEID#KEY",
            icon: "exclamationmark.triangle",
            "icon-color": "#FF0000"
        });
        return;
    }

    const url = `https://api.64clouds.com/v1/getServiceInfo?veid=${veid}&api_key=${apiKey}`;

    try {
        const response = await $httpClient.get(url);
        const data = JSON.parse(response.body);

        // 2. 數據處理
        // 計算流量：BWG 提供的是 Byte，轉換為 GB
        const totalGB = (data.plan_monthly_data / 1024 / 1024 / 1024).toFixed(2);
        const usedGB = (data.data_counter / 1024 / 1024 / 1024).toFixed(2);
        const remainingGB = (totalGB - usedGB).toFixed(2);
        const usagePercent = ((usedGB / totalGB) * 100).toFixed(1);

        // 處理日期 (BWG 回傳 Unix Timestamp)
        const resetDate = new Date(data.data_next_reset * 1000).toLocaleDateString("zh-CN");

        // 3. 生成面板內容
        const content = [
            `已用流量: ${usedGB} GB (${usagePercent}%)`,
            `剩餘流量: ${remainingGB} GB`,
            `月總額度: ${totalGB} GB`,
            `下次重置: ${resetDate}`,
            `伺服器 IP: ${data.ip_addresses[0]}`
        ].join("\n");

        // 4. 回傳給 Egern 面板
        $done({
            title: `${name} 伺服器狀態`,
            content: content,
            icon: "server.rack",
            "icon-color": "#5AC8FA"
        });

    } catch (error) {
        $done({
            title: "API 請求失敗",
            content: error.message,
            icon: "xmark.circle"
        });
    }
})();