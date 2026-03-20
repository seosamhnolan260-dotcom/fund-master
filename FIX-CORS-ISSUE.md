# 🔧 Failed to fetch 问题修复指南

## 📋 问题诊断

**现象**: 前端查询基金时报错 "Failed to fetch"

**根因**: 浏览器 CORS 策略或网络问题

---

## 🔍 诊断步骤

### 1. 打开浏览器控制台

**操作**:
1. 右键点击页面 → **检查 (Inspect)**
2. 切换到 **控制台 (Console)** 标签
3. 查看具体错误信息

**可能的错误**:
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```
或
```
Failed to fetch
```

### 2. 检查 Network 标签

**操作**:
1. 切换到 **Network (网络)** 标签
2. 重新查询基金
3. 查看 `fund-info` 请求的状态

**可能的状态**:
- **(canceled)**: 前端主动断开
- **504 Gateway Timeout**: Worker 超时
- **CORS error**: 跨域问题

---

## 🛠️ 修复方案

### 方案 1：清除浏览器缓存（推荐）

**原因**: 浏览器可能缓存了旧的 CORS 配置

**操作**:
```bash
# Chrome/Edge
Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows)

# 或手动清除
设置 → 隐私和安全 → 清除浏览数据 → 缓存的图片和文件
```

### 方案 2：检查 Worker CORS 配置

**已修复的代码** (`workers/src/index.ts`):

```typescript
// 1. 处理跨域预检 (CORS)
if (request.method === "OPTIONS") {
  return new Response(null, { 
    headers: { 
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    } 
  });
}

// 2. 正常请求也要添加 CORS 头
return new Response(JSON.stringify(result), {
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",  // ← 关键
  }
});
```

### 方案 3：前端添加错误处理

**已修复的代码** (`src/pages/report/index.tsx`):

```typescript
const response = await fetch(`${WORKER_URL}/fund-info`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({code: input}),
  // 禁用缓存
  cache: 'no-cache'
})

// 检查 HTTP 状态码
if (!response.ok) {
  const errorText = await response.text()
  console.error('HTTP Error:', response.status, errorText)
  throw new Error(`HTTP ${response.status}: ${errorText || '请求失败'}`)
}
```

---

## ✅ 验证步骤

### 1. 测试 Worker API

**命令**:
```bash
curl -X POST https://fund-investment-master.seosamhnolan260.workers.dev/fund-info \
  -H "Content-Type: application/json" \
  -d '{"code":"000001"}' | jq '.success'
```

**预期**: `true`

### 2. 测试前端页面

**操作**:
1. 打开 https://c2d4d7b7.fund-investment-master.pages.dev/
2. 输入基金代码 `000001`
3. 点击查询

**预期**: 显示基金信息，无报错

### 3. 检查控制台日志

**预期日志**:
```
Fetching fund info for: 000001
Worker URL: https://fund-investment-master.seosamhnolan260.workers.dev
Response status: 200
Response data: {success: true, data: {...}}
```

---

## 🚨 常见问题

### Q1: CORS 错误

**错误**:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解决**:
1. 清除浏览器缓存
2. 检查 Worker 是否返回 `Access-Control-Allow-Origin: *`
3. 确保请求是 HTTPS → HTTPS

### Q2: Mixed Content 错误

**错误**:
```
Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'
```

**解决**:
- 确保所有 API URL 都是 `https://`

### Q3: 超时错误

**错误**:
```
504 Gateway Timeout
```

**解决**:
- Worker 响应时间过长
- 检查盈米 MCP API 是否正常
- 简化 AI 分析逻辑

---

## 📞 技术支持

如果以上方案都无法解决，请提供：
1. 浏览器控制台完整错误截图
2. Network 标签中 `fund-info` 请求的详细信息
3. Worker URL 和前端页面 URL

---

**最后更新**: 2026-03-20 01:55
