# 基金投资大师

AI 驱动的基金查询与深度投研 H5 应用

## 项目简介

"基金投资大师"是一款面向个人投资者的基金查询与深度投研工具，用户输入基金名称或代码后，可实时查询基金当前价格并获取 AI 生成的深度投研报告。

## 功能特点

- 📊 **基金信息查询**：支持基金代码、名称、拼音缩写搜索
- 🤖 **AI 投研报告**：基于 qwen3.5-plus 模型的专业投研分析报告
- 📱 **移动友好**：H5 网页版，无需下载，即开即用
- 🎨 **专业设计**：金融风格的专业 UI 设计，清晰易读

## 分析内容

- ✅ 一句话投资判断
- ✅ 基金概况与定位
- ✅ 历史业绩分析
- ✅ 持仓分析
- ✅ 基金经理评估
- ✅ 风险评估
- ✅ 投资建议

## 技术栈

- **前端框架**：Taro 4.x + React 18
- **样式方案**：Tailwind CSS 3.x
- **状态管理**：Zustand
- **语言**：TypeScript 5.x
- **后端服务**：Supabase Edge Functions
- **AI 模型**：阿里云百炼 qwen3.5-plus
- **数据源**：盈米基金 MCP

## 项目结构

```
基金投资大师/
├── config/                 # Taro 配置文件
├── scripts/                # 构建和检查脚本
├── src/
│   ├── app.config.ts       # Taro 应用配置
│   ├── app.scss            # 全局样式
│   ├── app.tsx             # 应用入口
│   ├── client/
│   │   └── supabase.ts     # Supabase 客户端配置
│   ├── pages/              # 页面组件
│   │   ├── index/          # 首页（搜索）
│   │   └── report/         # 报告页（基金详情+AI 报告）
│   ├── store/              # Zustand 状态管理
│   │   └── fundStore.ts    # 基金状态管理
│   └── types/              # TypeScript 类型定义
├── .env.example            # 环境变量示例
├── package.json            # 项目依赖
├── tailwind.config.js      # Tailwind 配置
└── tsconfig.json           # TypeScript 配置
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Supabase 配置和盈米 MCP 端点。

### 3. 开发调试

```bash
pnpm run dev:h5
```

### 4. 构建生产版本

```bash
pnpm run build:h5
```

### 5. 代码检查

```bash
pnpm run lint
```

## 输入格式说明

### 支持的基金输入方式

1. **基金代码**（推荐）
   - 6 位数字：`000001`、`110022`

2. **基金名称**
   - 完整名称：`易方达蓝筹精选混合`
   - 部分名称：`易方达`、`蓝筹精选`

3. **拼音缩写**
   - 首字母：`YFD`、`HXCZ`

### 代码规则说明

- **0 开头**：开放式基金
- **1 开头**：封闭式基金
- **5 开头**：ETF 基金

## API 接口

### 基金信息查询

```typescript
POST /functions/v1/fund-info
Body: { code: string }

Response:
{
  success: boolean,
  data?: {
    fund_code: string,
    fund_name: string,
    net_value: number,
    nav_date: string,
    daily_growth: number,
    daily_growth_rate: number,
    accumulated_nav: number,
    fund_type: string,
    established_date: string,
    fund_scale: number,
    fund_manager: string
  },
  error?: string,
  multiple?: boolean,
  matches?: Array<{fund_code: string, fund_name: string}>
}
```

### AI 投研报告生成

```typescript
POST /functions/v1/fund-analysis
Body: { fundInfo: FundInfo }

Response: Server-Sent Events (流式)
data: {"choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

## 页面说明

### 首页 (index)

- 顶部装饰渐变
- 标题卡片（产品名称 + 简介）
- 搜索输入框
- 支持格式说明
- 查询按钮
- 功能特点介绍
- 免责声明

### 报告页 (report)

- 顶部导航栏（返回首页按钮）
- 基金标题卡片
- 基金基础信息卡片（10 个字段）
- 一句话投资判断（高亮）
- AI 投研报告（流式展示）
- 分享按钮
- 免责声明

## 开发计划

| 阶段 | 任务 | 状态 |
|------|------|------|
| Phase 1 | 项目初始化 | ✅ 已完成 |
| Phase 2 | 首页开发 | ✅ 已完成 |
| Phase 3 | 报告页开发 | ✅ 已完成 |
| Phase 4 | 状态管理 | ✅ 已完成 |
| Phase 5 | API 集成 | ⏳ 待开始 |
| Phase 6 | 测试与优化 | ⏳ 待开始 |

## 性能指标

- 首页加载时间 < 2 秒
- 基金查询响应 < 3 秒
- AI 报告生成 < 30 秒
- 页面 Lighthouse 评分 > 85

## 兼容性

- iOS Safari 13+
- Android Chrome 9+
- 微信内置浏览器
- 主流安卓手机适配

## 常见问题

**Q: 为什么提示"无法获取基金信息"？**  
A: 请确认：
- 基金代码或名称确实存在且正确
- 网络连接正常
- 如果输入中文名称未找到，可尝试直接输入 6 位代码

**Q: AI 分析报告为什么没有生成？**  
A: 可能原因：
- AI 服务暂时繁忙，请稍后重试
- 网络连接不稳定
- 建议刷新页面后重新尝试

**Q: 支持哪些基金？**  
A: 支持所有公募开放式基金，包括股票型、混合型、债券型、指数型等。

## 免责声明

本内容基于公开信息与 AI 生成，仅供学习研究，不构成任何投资建议。市场有风险，投资需谨慎。

---

**开发团队**: FE_Dev  
**最后更新**: 2026-03-17  
**项目版本**: v1.0.0
