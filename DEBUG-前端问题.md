# 前端调试指南

**问题**: 输入 000011 显示"未找到该基金"  
**后端**: ✅ 正常（curl 测试通过）  
**根因**: 前端参数传递或解析问题

---

## 🔍 诊断步骤

### 1. 打开浏览器控制台

**操作**:
- F12 打开开发者工具
- 切换到 Console 标签
- 输入 000011 并查询

### 2. 查看发送的请求

**在 Network 标签**:
1. 找到 `fund-info` 请求
2. 查看 **Request Payload**:
   ```json
   {"code":"000011"}
   ```
3. 查看 **Response**:
   ```json
   {"success":true,"data":{...}}
   ```

### 3. 查看控制台日志

**预期日志**:
```
Fetching fund info for: 000011
Worker URL: https://fund-investment-master.seosamhnolan260.workers.dev
Response status: 200
Response data: {success: true, data: {...}}
```

---

## 🛠️ 可能的原因

### 原因 1: Taro.request 参数问题

**Taro 的 request 可能自动包装数据**

**修复**:
```typescript
// 尝试直接发送字符串
const res = await Taro.request({
  url: "...",
  method: "POST",
  data: JSON.stringify({ code }), // 手动 stringify
  header: { "content-type": "application/json" }
})
```

### 原因 2: 数据解析层级错误

**Worker 返回**:
```json
{
  "success": true,
  "data": { "fund_info": {...} }
}
```

**前端解析**:
```typescript
// ❌ 错误
setReportData(res.data.data)

// ✅ 正确
setReportData(res.data)
```

### 原因 3: 前端缓存问题

**修复**:
```typescript
// 添加时间戳防止缓存
const res = await Taro.request({
  url: `.../fund-info?t=${Date.now()}`,
  ...
})
```

---

## 🧪 快速测试

### 在 Mac 终端测试后端

```bash
# 测试 000011
curl -X POST https://fund-investment-master.seosamhnolan260.workers.dev/fund-info \
  -H "Content-Type: application/json" \
  -d '{"code":"000011"}' | jq '.success'
```

**预期**: `true`

### 在浏览器控制台测试

```javascript
// 打开预览页面的控制台，执行
fetch('https://fund-investment-master.seosamhnolan260.workers.dev/fund-info', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({code: '000011'})
}).then(r => r.json()).then(console.log)
```

**预期**: 显示完整基金数据

---

## 📊 调试检查清单

- [ ] 控制台显示"Fetching fund info for: 000011"
- [ ] Network 标签显示 200 状态码
- [ ] Response 包含 `success: true`
- [ ] 数据包含 `fund_info.name`
- [ ] 没有 JavaScript 错误

---

**请发送控制台截图和 Network 标签截图！** 🦐
