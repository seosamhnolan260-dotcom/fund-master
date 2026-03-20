# Phase 2: 基金研报网站迭代开发计划

**版本**: V2.0  
**日期**: 2026-03-19  
**状态**: 进行中

---

## 🎯 迭代目标

确保数据**真实性**和**合规性**，AI 严格基于盈米基金 MCP 返回的结构化数据进行解读，禁止幻觉。

---

## 📋 开发任务清单

### 1. 数据清洗层 (Data Sanitization) ✅

**位置**: `workers/src/index.ts`

**任务**：
- [x] 净值数据标准化
- [x] 规模数据格式化（XX 亿）
- [x] 日期格式统一
- [x] 空值处理（显示"暂无"或"数据同步中"）

**完成状态**: ✅ 已完成

---

### 2. 持仓归因分析组件 🔴

**位置**: `src/components/PortfolioSection.tsx`

**功能**：
- 行业配置饼图（Recharts PieChart）
- 前十大重仓股柱状图（Recharts BarChart）
- 集中度计算
- 空状态处理

**技术栈**：
- React + TypeScript
- Recharts
- Tailwind CSS

**状态**: 🔄 开发中

---

### 3. 高端 PDF 风格报告组件 🔴

**位置**: `src/components/ProfessionalReport.tsx`

**功能**：
- PDF 纸张质感容器
- 专业页眉（基金名称、代码）
- 衬线字体正文
- 防伪水印背景
- 底部风险提示

**技术栈**：
- React + TypeScript
- Tailwind CSS
- Lucide React Icons

**状态**: 🔄 开发中

---

### 4. AI Prompt 逻辑集成 🟡

**位置**: `workers/src/index.ts` + `src/utils/ai-prompt.ts`

**功能**：
- 数据预封装（generatePortfolioContext）
- 核心分析 Prompt 模板
- Brinson 归因框架
- 数据缺失处理

**Prompt 模板**：
```markdown
# Role
你是一位拥有 CFA 资格的资深公募基金策略研究员。

# Context
请基于以下来自【盈米基金 MCP】的实时持仓数据，撰写一段专业的"持仓归因分析"报告：
{{PortfolioContext}}

# Analysis Framework
1. 配置风格 (Allocation Strategy)
2. 集中度风险 (Concentration Risk)
3. 超额收益来源 (Alpha Source)

# Output Constraints
- 语言风格：严谨、中性、专业
- 字数控制：200-300 字
- 禁止废话：直接给结论和趋势判断
- 数据来源提示：必须在结尾说明
```

**状态**: ⏳ 待开发

---

### 5. 前端页面整合 🟡

**位置**: `src/pages/report/index.tsx`

**任务**：
- [ ] 导入新组件
- [ ] 调用 AI 生成归因分析
- [ ] 整合持仓分析组件
- [ ] 整合 PDF 风格报告组件
- [ ] 添加数据时间戳显示
- [ ] 添加数据来源标注

**状态**: ⏳ 待开发

---

## 🔧 技术实现细节

### 1. 数据清洗层实现

```typescript
// workers/src/index.ts

// 规模格式化
const formatScale = (netAsset: any): string => {
  if (!netAsset) return "暂无";
  const num = typeof netAsset === 'string' ? parseFloat(netAsset) : netAsset;
  if (isNaN(num)) return "暂无";
  return (num / 100000000).toFixed(2) + "亿";
};

// 空值处理
const safeValue = (value: any, fallback: string = "暂无"): any => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return value;
};

// 数据时间戳
const data_date = formatDate(summary.navDate) ?? formatDate(new Date()) ?? "暂无";
const data_source = summary.navDate ? "盈米实时" : "搜索数据";
```

---

### 2. 持仓归因组件实现

```typescript
// src/components/PortfolioSection.tsx

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from 'recharts';

const PortfolioSection: React.FC<PortfolioProps> = ({ 
  industryData = [], 
  stockData = [] 
}) => {
  // 数据清洗
  const formattedIndustry = industryData?.map(item => ({
    name: item.industryName || '其他',
    value: parseFloat(item.ratio || 0)
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  const formattedStocks = stockData?.map(item => ({
    name: item.assetName || '未知股票',
    ratio: parseFloat(item.ratio || 0)
  })).slice(0, 10);

  // 计算集中度
  const totalConcentration = formattedStocks.reduce(
    (sum, s) => sum + s.ratio, 0
  ).toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
      {/* 行业配置饼图 */}
      <div>...</div>
      
      {/* 前十大重仓股 */}
      <div>...</div>
    </div>
  );
};
```

---

### 3. AI Prompt 生成逻辑

```typescript
// src/utils/ai-prompt.ts

export const generatePortfolioContext = (data: any) => {
  const topStocks = data.assetPortfolios?.slice(0, 10)
    .map(s => `${s.assetName}(${s.ratio}%)`).join('、');
  
  const topIndustries = data.industryPortfolios?.slice(0, 5)
    .map(i => `${i.industryName}(${i.ratio}%)`).join('、');
  
  const concentration = data.assetPortfolios?.slice(0, 10)
    .reduce((sum: number, s: any) => sum + parseFloat(s.ratio), 0)
    .toFixed(2);

  return `
【当前持仓事实清单】
- 前十大重仓股：${topStocks || '暂无数据'}
- 前五大行业分布：${topIndustries || '暂无数据'}
- 前十大持仓集中度：${concentration}%
- 基金经理：${data.managers?.[0]?.fundManagerName || '未知'}
  `;
};

export const generateAnalysisPrompt = (context: string) => `
# Role
你是一位拥有 CFA 资格的资深公募基金策略研究员。

# Context
请基于以下来自【盈米基金 MCP】的实时持仓数据：
${context}

# Analysis Framework
1. 配置风格：判断是"赛道型"还是"平衡型"
2. 集中度风险：>60% 为高集中度，<40% 为分散配置
3. 超额收益来源：分析选股能力 vs 行业轮动

# Output Constraints
- 语言风格：严谨、中性、专业
- 字数控制：200-300 字
- 禁止废话：直接给结论
- 数据来源：必须在结尾说明
`;
```

---

## 📊 数据流向图

```
用户请求
    ↓
Worker API (fund-info)
    ↓
盈米 MCP (BatchGetFundsDetail)
    ↓
数据清洗层
    ↓
前端页面 (report/index.tsx)
    ↓
├─ 产品概况组件
├─ 持仓归因组件 (PortfolioSection)
├─ AI 归因分析 (callAI)
└─ PDF 风格报告 (ProfessionalReport)
    ↓
用户界面
```

---

## ✅ 验收标准

### 功能验收

| 功能 | 验收标准 | 状态 |
|------|----------|------|
| 数据清洗 | 所有数值格式化正确 | ⏳ |
| 持仓图表 | 饼图、柱状图正常渲染 | ⏳ |
| AI 归因 | 生成 200-300 字专业分析 | ⏳ |
| PDF 报告 | 显示专业研报样式 | ⏳ |
| 数据溯源 | 底部显示数据来源和时间 | ⏳ |

### 性能验收

| 指标 | 目标 | 状态 |
|------|------|------|
| 页面加载 | < 2 秒 | ⏳ |
| 图表渲染 | < 1 秒 | ⏳ |
| AI 生成 | < 10 秒 | ⏳ |

### 合规验收

| 要求 | 验收标准 | 状态 |
|------|----------|------|
| 数据来源 | 严格来自盈米 MCP | ⏳ |
| AI 幻觉 | 禁止编造数据 | ⏳ |
| 风险提示 | 底部显示免责声明 | ⏳ |
| 时间戳 | 显示数据日期 | ⏳ |

---

## 📅 开发时间表

| 日期 | 任务 | 负责人 | 状态 |
|------|------|--------|------|
| 2026-03-19 | 数据清洗层 | BE_Dev | ✅ 完成 |
| 2026-03-20 | 持仓归因组件 | FE_Dev | ⏳ 进行中 |
| 2026-03-20 | PDF 报告组件 | FE_Dev | ⏳ 进行中 |
| 2026-03-20 | AI Prompt 集成 | BE_Dev | ⏳ 待开始 |
| 2026-03-20 | 前端整合 | FE_Dev | ⏳ 待开始 |
| 2026-03-21 | 测试验收 | QA | ⏳ 待开始 |

---

## 🚧 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| Recharts 兼容性问题 | 图表无法渲染 | 准备备用静态图表 |
| AI 生成超时 | 用户体验差 | 添加加载动画和超时处理 |
| 数据缺失 | 显示空白 | 空状态提示"数据同步中" |
| 样式不兼容 | 页面错乱 | 多设备测试 |

---

**下一步**: 开始实现持仓归因组件和 PDF 报告组件！🦐
