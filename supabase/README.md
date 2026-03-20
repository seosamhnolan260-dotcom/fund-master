# Supabase Edge Functions 部署指南

## 前置准备

### 1. 安装 Supabase CLI
```bash
# macOS
brew install supabase/tap/supabase

# 或 npm
npm install -g supabase
```

### 2. 登录 Supabase
```bash
supabase login
```

### 3. 链接项目
```bash
cd supabase
supabase link --project-ref <your-project-ref>
```

---

## 环境变量配置

### 1. 复制环境变量模板
```bash
cp .env.example .env.local
```

### 2. 填写环境变量

| 变量名 | 说明 | 来源 |
|--------|------|------|
| `YINGMI_MCP_ENDPOINT` | 盈米基金 MCP 服务端点 | **待 PM 提供** |
| `YINGMI_MCP_API_KEY` | 盈米基金 MCP API Key | **待 PM 提供** |
| `QWEN_API_KEY` | 阿里云百炼 API Key | 阿里云控制台 |
| `SUPABASE_URL` | Supabase 项目 URL | Supabase 项目设置 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务密钥 | Supabase 项目设置 |

### 3. 设置 Edge Functions 环境变量
```bash
# 设置盈米 MCP 配置 (待 PM 提供后执行)
supabase secrets set YINGMI_MCP_ENDPOINT=<endpoint>
supabase secrets set YINGMI_MCP_API_KEY=<api_key>

# 设置阿里云百炼配置
supabase secrets set QWEN_API_KEY=<qwen_api_key>
```

---

## 数据库迁移

### 执行迁移
```bash
supabase db push
```

这将创建 `cache` 表用于数据缓存。

---

## 部署 Edge Functions

### 部署 fund-info 函数
```bash
supabase functions deploy fund-info
```

### 部署 fund-analysis 函数
```bash
supabase functions deploy fund-analysis
```

### 部署所有函数
```bash
supabase functions deploy
```

---

## 获取函数 URL

部署后，函数 URL 格式为：
```
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

例如：
- `https://xxxxx.supabase.co/functions/v1/fund-info`
- `https://xxxxx.supabase.co/functions/v1/fund-analysis`

---

## 本地测试

### 启动本地 Supabase
```bash
supabase start
```

### 本地运行函数
```bash
# fund-info
curl -i --location 'http://localhost:54321/functions/v1/fund-info' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"code":"000001"}'

# fund-analysis
curl -i --location 'http://localhost:54321/functions/v1/fund-analysis' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{
    "fundInfo": {
      "fund_code": "000001",
      "fund_name": "华夏成长混合",
      "net_value": 1.2345,
      "daily_growth_rate": 1.02,
      "fund_type": "混合型",
      "fund_scale": 50.5,
      "fund_manager": "张三"
    }
  }'
```

---

## 监控与日志

### 查看函数日志
```bash
supabase functions logs fund-info
supabase functions logs fund-analysis
```

### 实时监控
```bash
supabase functions logs --watch
```

---

## 缓存策略说明

| 数据类型 | 缓存键格式 | TTL | 说明 |
|----------|-----------|-----|------|
| 基金基本信息 | `fund:info:{code}` | 24 小时 | 基金名称、类型、经理等 |
| 净值数据 | `fund:nav:{code}` | 12 小时 | 至下一交易日 |
| AI 报告 | `fund:report:{code}:{date}` | 7 天 | 相同基金 + 日期 |

---

## 故障排查

### 常见问题

1. **函数返回 401 错误**
   - 检查 Authorization header 是否正确
   - 确认 anon key 或 service role key 有效

2. **函数返回 500 错误**
   - 查看函数日志：`supabase functions logs <function-name>`
   - 检查环境变量是否设置正确

3. **盈米 MCP 调用失败**
   - 确认 MCP endpoint 和 API key 正确
   - 检查网络连接
   - 实现降级方案（使用缓存数据）

4. **AI 报告生成超时**
   - 检查 Qwen API key 是否有效
   - 确认 API 配额是否充足
   - 增加超时时间或重试机制

---

## 下一步

- [ ] 等待 PM 提供盈米 MCP 接入凭证
- [ ] 配置环境变量
- [ ] 执行数据库迁移
- [ ] 部署 Edge Functions
- [ ] 与前端联调测试

---

*文档版本：v1.0*  
*更新时间：2026-03-17*
