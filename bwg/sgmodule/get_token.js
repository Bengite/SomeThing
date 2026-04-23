/**
 * Egern 提取 Token 脚本 (Header 版)
 * 匹配关键词: eworkplat
 * 提取 Key: authorization
 */

const headers = $request.headers;
// 考虑到某些情况下 Key 可能是小写或大写，做一个兼容性处理
const authKey = Object.keys(headers).find(k => k.toLowerCase() === 'authorization');
const token = authKey ? headers[authKey] : null;

if (token) {
    console.log("检测到 eworkplat 请求，提取到 Authorization: " + token);

    // 发送系统通知，方便直接看到结果
    $notification.post("Token 提取成功", "eworkplat", "Header: " + token);

    // 将 Token 存入持久化存储，变量名为 eworkplat_auth
    $persistentStore.write(token, "eworkplat_auth");
} else {
    // 如果进入了脚本但没找到 header，可能是非目标请求
    console.log("检测到 eworkplat 链接，但 Header 中未发现 authorization 字段");
}

$done({});