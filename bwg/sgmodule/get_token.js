/**
 * EGERN Authorization Header Capture Script
 * 功能: 监听包含eworkplat的URL请求，自动提取headers中的authorization值
 */

// 配置区域
const CONFIG = {
  // 要监控的网址 (包含eworkplat)
  monitorUrl: /eworkplat/i,

  // 要提取的header字段名称
  headerField: 'authorization',

  // 备忘录保存位置
  saveToNotes: true,

  // 是否在控制台输出调试信息
  debug: true,

  // 存储KEY过期时间 (分钟)
  expireTime: 1440 // 24小时
};

/**
 * 主函数: 拦截请求并提取authorization header
 */
function hookRequest() {
  // EGERN 请求拦截中间件
  const originalFetch = fetch;

  window.fetch = function(...args) {
    const [resource, config] = args;

    // 检查URL是否匹配
    if (isUrlMatch(resource, CONFIG.monitorUrl)) {
      logDebug(`[Hook] 检测到目标请求: ${resource}`);

      // 获取请求headers中的authorization
      if (config && config.headers) {
        const authValue = getAuthorizationFromHeaders(config.headers);
        if (authValue) {
          logDebug('[Hook] 获取到Authorization:', authValue);
          extractAndSaveData(resource, authValue);
        }
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
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._requestUrl = url;
    this._requestMethod = method;
    this._requestHeaders = {};
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    this._requestHeaders = this._requestHeaders || {};
    if (header.toLowerCase() === CONFIG.headerField.toLowerCase()) {
      this._requestHeaders[header] = value;
    }
    return originalSetRequestHeader.apply(this, [header, value]);
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    if (isUrlMatch(this._requestUrl, CONFIG.monitorUrl)) {
      logDebug(`[XHR Hook] 检测到目标请求: ${this._requestUrl}`);

      const authValue = this._requestHeaders ?
        Object.values(this._requestHeaders)[0] : null;

      if (authValue) {
        logDebug('[XHR Hook] 获取到Authorization:', authValue);
        extractAndSaveData(this._requestUrl, authValue);
      }
    }

    return originalSend.apply(this, [body]);
  };
}


/**
 * 提取并保存authorization data
 */
function extractAndSaveData(urlString, authValue) {
  if (!authValue) {
    logDebug('[Warn] 未找到Authorization header');
    return;
  }

  logDebug('[Success] 成功提取Authorization:', authValue);

  // 构建要保存的数据对象
  const dataToSave = {
    timestamp: new Date().toISOString(),
    url: urlString,
    authorization: authValue
  };

  logDebug('[Data] 将保存的数据:', dataToSave);

  // 保存到备忘录
  if (CONFIG.saveToNotes) {
    saveToNotes(dataToSave);
  }

  // 保存到本地存储
  saveToLocalStorage(dataToSave);
}

/**
 * 从headers中提取authorization value
 */
function getAuthorizationFromHeaders(headers) {
  if (!headers) return null;

  // 处理不同格式的headers
  if (headers instanceof Headers) {
    return headers.get('authorization');
  }

  if (typeof headers === 'object') {
    // 不区分大小写查找authorization
    for (const key in headers) {
      if (key.toLowerCase() === 'authorization') {
        return headers[key];
      }
    }
  }

  return null;
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
  let content = '【Authorization自动捕获】\n';
  content += '捕获时间: ' + data.timestamp + '\n\n';

  content += '[URL]\n';
  content += data.url + '\n\n';

  content += '[Authorization Key]\n';
  content += data.authorization + '\n';

  return content;
}

/**
 * 保存到本地存储
 */
function saveToLocalStorage(data) {
  try {
    const storageKey = 'EGERN_CAPTURED_AUTHORIZATIONS';
    const existing = localStorage.getItem(storageKey);
    const authorizations = existing ? JSON.parse(existing) : [];

    // 添加新数据
    authorizations.push(data);

    // 只保留最近100条记录
    if (authorizations.length > 100) {
      authorizations.shift();
    }

    localStorage.setItem(storageKey, JSON.stringify(authorizations));
    logDebug('[Storage] Authorization已保存到localStorage');
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
 * 获取已保存的所有Authorization
 */
function getAllSavedAuthorizations() {
  try {
    const storageKey = 'EGERN_CAPTURED_AUTHORIZATIONS';
    const authorizations = localStorage.getItem(storageKey);
    return authorizations ? JSON.parse(authorizations) : [];
  } catch (err) {
    logDebug('[Error] 读取存储数据失败:', err);
    return [];
  }
}

/**
 * 清除所有已保存的Authorization
 */
function clearAllAuthorizations() {
  try {
    const storageKey = 'EGERN_CAPTURED_AUTHORIZATIONS';
    localStorage.removeItem(storageKey);
    logDebug('[Storage] 所有Authorization已清除');
  } catch (err) {
    logDebug('[Error] 清除Authorization失败:', err);
  }
}

/**
 * 初始化脚本
 */
function initialize() {
  logDebug('[Init] 开始初始化Authorization捕获脚本...');
  logDebug('[Config] 监控URL:', CONFIG.monitorUrl);
  logDebug('[Config] 提取Header字段:', CONFIG.headerField);

  // 安装钩子
  hookXHR();
  hookRequest();

  logDebug('[Init] Authorization捕获脚本初始化完成!');
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
    getAllAuthorizations: getAllSavedAuthorizations,
    clearAuthorizations: clearAllAuthorizations,
    initialize: initialize,
    logDebug: logDebug
  };
}

module.exports = {
  CONFIG,
  initialize,
  getAllSavedAuthorizations,
  clearAllAuthorizations
};
