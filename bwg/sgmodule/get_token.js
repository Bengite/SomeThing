/**
 * EGERN Token Capture Script
 * 功能: 监控指定网址, 自动提取TOKEN和BODY参数到备忘录
 */

// 配置区域 - 修改这些参数来适应你的需求
const CONFIG = {
  // 要监控的网址 (支持正则表达式或字符串匹配)
  monitorUrl: /api\.example\.com\/login/i, // 修改为你要监控的网址

  // 要提取的TOKEN字段名称
  tokenField: 'token', // 或 'access_token', 'bearer_token' 等

  // 要提取的BODY参数 (数组形式, 可以提取多个)
  bodyFields: ['user_id', 'username', 'device_id'],

  // 备忘录保存位置 (使用iOS快捷指令或系统API)
  saveToNotes: true,

  // 是否在控制台输出调试信息
  debug: true,

  // TOKEN过期时间 (分钟)
  expireTime: 1440 // 24小时
};

/**
 * 主函数: 拦截请求并提取数据
 */
function hookRequest() {
  // EGERN 请求拦截中间件
  const originalFetch = fetch;

  window.fetch = function(...args) {
    const [resource, config] = args;

    // 检查URL是否匹配
    if (isUrlMatch(resource, CONFIG.monitorUrl)) {
      logDebug(`[Hook] 检测到目标请求: ${resource}`);

      // 拦截请求体
      if (config && config.body) {
        const bodyData = parseBody(config.body);
        logDebug('[Hook] 请求BODY:', bodyData);

        // 处理响应
        return originalFetch.apply(this, args).then(response => {
          // 克隆响应以避免流被消耗
          const clonedResponse = response.clone();

          // 异步处理数据提取
          clonedResponse.json().then(responseData => {
            extractAndSaveData(responseData, bodyData);
          }).catch(err => {
            logDebug('[Error] 解析响应失败:', err);
          });

          return response;
        });
      }
    }

    return originalFetch.apply(this, args);
  };
}

/**
 * 钩子XHR请求 (支持旧版XMLHttpRequest)
 */
function hookXHR() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._requestUrl = url;
    this._requestMethod = method;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (isUrlMatch(this._requestUrl, CONFIG.monitorUrl)) {
      logDebug(`[XHR Hook] 检测到目标请求: ${this._requestUrl}`);

      const bodyData = parseBody(body);
      logDebug('[XHR Hook] 请求BODY:', bodyData);

      // 监听响应
      this.addEventListener('load', function() {
        if (this.status === 200) {
          try {
            const responseData = JSON.parse(this.responseText);
            extractAndSaveData(responseData, bodyData);
          } catch (err) {
            logDebug('[Error] 解析XHR响应失败:', err);
          }
        }
      });
    }

    return originalSend.apply(this, [body]);
  };
}

/**
 * 提取并保存数据
 */
function extractAndSaveData(responseData, bodyData) {
  const tokenValue = responseData[CONFIG.tokenField];

  if (!tokenValue) {
    logDebug('[Warn] 未找到TOKEN字段: ' + CONFIG.tokenField);
    return;
  }

  logDebug('[Success] 成功提取TOKEN:', tokenValue);

  // 构建要保存的数据对象
  const dataToSave = {
    timestamp: new Date().toISOString(),
    token: tokenValue,
    extractedFields: {}
  };

  // 提取指定的BODY参数
  CONFIG.bodyFields.forEach(field => {
    if (bodyData[field]) {
      dataToSave.extractedFields[field] = bodyData[field];
    }
  });

  logDebug('[Data] 将保存的数据:', dataToSave);

  // 保存到备忘录
  if (CONFIG.saveToNotes) {
    saveToNotes(dataToSave);
  }

  // 保存到本地存储
  saveToLocalStorage(dataToSave);
}

/**
 * 解析请求体
 */
function parseBody(body) {
  if (!body) return {};

  try {
    if (typeof body === 'string') {
      // 尝试JSON解析
      try {
        return JSON.parse(body);
      } catch {
        // 尝试URL编码解析
        return parseUrlEncoded(body);
      }
    }

    if (body instanceof FormData) {
      const obj = {};
      body.forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    }

    if (body instanceof Blob) {
      logDebug('[Warn] 请求体为Blob,无法直接解析');
      return {};
    }

    return body;
  } catch (err) {
    logDebug('[Error] 解析BODY失败:', err);
    return {};
  }
}

/**
 * 解析URL编码数据
 */
function parseUrlEncoded(str) {
  const params = new URLSearchParams(str);
  const obj = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

/**
 * 判断URL是否匹配
 */
function isUrlMatch(url, pattern) {
  if (typeof url !== 'string') {
    url = url.toString();
  }

  if (pattern instanceof RegExp) {
    return pattern.test(url);
  }

  return url.includes(pattern);
}

/**
 * 保存到系统备忘录 (iOS快捷指令)
 */
function saveToNotes(data) {
  const notesContent = formatNotesContent(data);

  // EGERN特定的备忘录保存API (如果支持)
  if (typeof egern !== 'undefined' && egern.notes) {
    egern.notes.save({
      title: '[Token] ' + new Date().toLocaleString(),
      content: notesContent,
      tags: ['token', 'auto-capture']
    });
    logDebug('[Notes] 数据已保存到EGERN备忘录');
    return;
  }

  // 备用方案: 构造系统快捷指令URL
  const encodedContent = encodeURIComponent(notesContent);
  const shortcutUrl = `shortcuts://run-shortcut/?name=AddToNotes&input=${encodedContent}`;

  logDebug('[Notes] 使用快捷指令URL:', shortcutUrl);
  // 在实际使用中可以通过 window.location.href = shortcutUrl; 触发
}

/**
 * 格式化备忘录内容
 */
function formatNotesContent(data) {
  let content = '【Token自动捕获】\n';
  content += '捕获时间: ' + data.timestamp + '\n\n';

  content += '[Token]\n';
  content += data.token + '\n\n';

  if (Object.keys(data.extractedFields).length > 0) {
    content += '[提取的参数]\n';
    Object.entries(data.extractedFields).forEach(([key, value]) => {
      content += `${key}: ${value}\n`;
    });
  }

  return content;
}

/**
 * 保存到本地存储
 */
function saveToLocalStorage(data) {
  try {
    const storageKey = 'EGERN_CAPTURED_TOKENS';
    const existing = localStorage.getItem(storageKey);
    const tokens = existing ? JSON.parse(existing) : [];

    // 添加新数据
    tokens.push(data);

    // 只保留最近100条记录
    if (tokens.length > 100) {
      tokens.shift();
    }

    localStorage.setItem(storageKey, JSON.stringify(tokens));
    logDebug('[Storage] 数据已保存到localStorage');
  } catch (err) {
    logDebug('[Error] 保存到localStorage失败:', err);
  }
}

/**
 * 调试日志
 */
function logDebug(message, data = null) {
  if (!CONFIG.debug) return;

  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`, data || '');
}

/**
 * 获取已保存的所有TOKEN
 */
function getAllSavedTokens() {
  try {
    const storageKey = 'EGERN_CAPTURED_TOKENS';
    const tokens = localStorage.getItem(storageKey);
    return tokens ? JSON.parse(tokens) : [];
  } catch (err) {
    logDebug('[Error] 读取存储数据失败:', err);
    return [];
  }
}

/**
 * 清除所有已保存的TOKEN
 */
function clearAllTokens() {
  try {
    const storageKey = 'EGERN_CAPTURED_TOKENS';
    localStorage.removeItem(storageKey);
    logDebug('[Storage] 所有TOKEN已清除');
  } catch (err) {
    logDebug('[Error] 清除TOKEN失败:', err);
  }
}

/**
 * 初始化脚本
 */
function initialize() {
  logDebug('[Init] 开始初始化Token捕获脚本...');
  logDebug('[Config] 监控URL:', CONFIG.monitorUrl);
  logDebug('[Config] TOKEN字段:', CONFIG.tokenField);
  logDebug('[Config] 要提取的参数:', CONFIG.bodyFields);

  // 安装钩子
  hookXHR();
  hookRequest();

  logDebug('[Init] Token捕获脚本初始化完成!');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// 导出接口供外部使用
if (typeof window !== 'undefined') {
  window.TokenCapture = {
    config: CONFIG,
    getAllTokens: getAllSavedTokens,
    clearTokens: clearAllTokens,
    initialize: initialize,
    logDebug: logDebug
  };
}

module.exports = {
  CONFIG,
  initialize,
  getAllSavedTokens,
  clearAllTokens
};
