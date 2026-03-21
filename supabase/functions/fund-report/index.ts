import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 盈米 MCP 配置
const YINGMI_MCP_ENDPOINT = Deno.env.get("YINGMI_MCP_ENDPOINT") || "";
const YINGMI_MCP_API_KEY = Deno.env.get("YINGMI_MCP_API_KEY") || "";

// 阿里云百炼配置
const BAILIAN_API_KEY = Deno.env.get("BAILIAN_API_KEY") || "";
const BAILIAN_MODEL = "qwen-plus";

interface FundReport {
  // 基本信息
  fund_code: string;
  fund_name: string;
  fund_type: string;
  risk_level: string;
  company: string;
  custodian: string;
  established_date: string;
  scale: string;
  shares: string;
  benchmark: string;
  investment_range: string;
  
  // 业绩数据
  nav: number;
  nav_date: string;
  daily_growth: string;
  returns: {
    "1month": string;
    "3month": string;
    "6month": string;
    "1year": string;
    "3year": string;
    "5year": string;
    "since_setup": string;
  };
  
  // 风险指标
  risk_metrics: {
    sharpe_ratio: string;
    max_drawdown: string;
    volatility: string;
    beta: string;
    alpha: string;
    sortino: string;
    calmar: string;
  };
  
  // 资产配置
  asset_allocation: Array<{
    name: string;
    ratio: string;
    change: string;
  }>;
  
  // 历史资产配置
  asset_allocation_history: Array<{
    period: string;
    stock: string;
    bond: string;
    cash: string;
    other: string;
  }>;
  
  // 行业配置
  industry_allocation: Array<{
    name: string;
    ratio: string;
    overweight: string;
    rank: number;
  }>;
  
  // 重仓股
  top_stocks: Array<{
    code: string;
    name: string;
    ratio: string;
    industry: string;
    change: string;
  }>;
  
  // 基金经理
  manager: {
    name: string;
    tenure: string;
    experience: string;
    education: string;
    style: string;
    funds_count: string;
    representative_fund: string;
    history_performance: Array<{
      fund_name: string;
      period: string;
      annual_return: string;
      rank: string;
      max_drawdown: string;
    }>;
  };
  
  // 费率
  fees: {
    management_fee: string;
    custody_fee: string;
    service_fee: string;
    subscription_fee: string;
    redemption_fee: string;
  };
  
  // 年度收益
  yearly_returns: Array<{
    year: string;
    fund_return: string;
    benchmark_return: string;
    excess_return: string;
    rank: string;
  }>;
  
  // AI 分析
  ai_analysis: {
    summary: string;
    strengths: string[];
    risks: string[];
    recommendation: string;
    rating: number;
    short_term: string;
    mid_term: string;
    long_term: string;
    allocation_ratio: string;
    build_position: string;
    take_profit: string;
    stop_loss: string;
  };
}

async function fetchFundData(code: string): Promise<Partial<FundReport>> {
  console.log("Fetching fund data for:", code);
  
  // 调用盈米 MCP 获取基金详细数据
  const response = await fetch(`${YINGMI_MCP_ENDPOINT}/fund/detail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${YINGMI_MCP_API_KEY}`,
    },
    body: JSON.stringify({ fund_code: code }),
  });
  
  if (!response.ok) {
    console.error("Yingmi MCP error:", response.status);
    throw new Error("获取基金数据失败");
  }
  
  const data = await response.json();
  return data.data || {};
}

async function generateAIAnalysis(fundData: Partial<FundReport>): Promise<FundReport["ai_analysis"]> {
  const prompt = `请分析以下基金并生成专业的投资建议：

基金名称：${fundData.fund_name}
基金代码：${fundData.fund_code}
基金类型：${fundData.fund_type}
单位净值：${fundData.nav} (${fundData.nav_date})
日涨跌幅：${fundData.daily_growth}
基金规模：${fundData.scale}
基金经理：${fundData.manager?.name || "未知"}

业绩表现：
- 近 1 月：${fundData.returns?.["1month"]}
- 近 3 月：${fundData.returns?.["3month"]}
- 近 6 月：${fundData.returns?.["6month"]}
- 近 1 年：${fundData.returns?.["1year"]}
- 近 3 年：${fundData.returns?.["3year"]}
- 成立以来：${fundData.returns?.["since_setup"]}

风险指标：
- 夏普比率：${fundData.risk_metrics?.sharpe_ratio}
- 最大回撤：${fundData.risk_metrics?.max_drawdown}
- 波动率：${fundData.risk_metrics?.volatility}

前十大重仓股：${JSON.stringify(fundData.top_stocks?.slice(0, 5))}

请以 JSON 格式返回分析结果，包含以下字段：
{
  "summary": "一句话总结（50 字以内）",
  "strengths": ["优势 1", "优势 2", "优势 3", "优势 4"],
  "risks": ["风险 1", "风险 2", "风险 3"],
  "recommendation": "投资建议（100 字以内）",
  "rating": 综合评级（1-5 分）,
  "short_term": "短期建议（推荐/中性/谨慎）",
  "mid_term": "中期建议（推荐/中性/谨慎）",
  "long_term": "长期建议（推荐/中性/谨慎）",
  "allocation_ratio": "建议配置比例（如 10%-20%）",
  "build_position": "建仓方式（一次性/定投/分批）",
  "take_profit": "止盈建议",
  "stop_loss": "止损建议"
}`;

  try {
    const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BAILIAN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: BAILIAN_MODEL,
        input: {
          messages: [
            { role: "system", content: "你是一位专业的基金分析师，擅长基金深度研究和投资建议。" },
            { role: "user", content: prompt }
          ]
        },
        parameters: {
          result_format: "json",
          temperature: 0.7,
        }
      }),
    });
    
    if (!response.ok) {
      console.error("AI analysis failed:", response.status);
      return getDefaultAIAnalysis();
    }
    
    const result = await response.json();
    const content = result.output?.choices?.[0]?.message?.content || "{}";
    
    try {
      const analysis = JSON.parse(content);
      return {
        summary: analysis.summary || "暂无 AI 分析",
        strengths: analysis.strengths || [],
        risks: analysis.risks || [],
        recommendation: analysis.recommendation || "请参考基金定期报告",
        rating: analysis.rating || 3,
        short_term: analysis.short_term || "中性",
        mid_term: analysis.mid_term || "中性",
        long_term: analysis.long_term || "推荐",
        allocation_ratio: analysis.allocation_ratio || "10%-20%",
        build_position: analysis.build_position || "定投",
        take_profit: analysis.take_profit || "收益率达到 20% 时可考虑部分止盈",
        stop_loss: analysis.stop_loss || "回撤超过 15% 时考虑调整",
      };
    } catch {
      console.error("Failed to parse AI response:", content);
      return getDefaultAIAnalysis();
    }
  } catch (error) {
    console.error("AI analysis error:", error);
    return getDefaultAIAnalysis();
  }
}

function getDefaultAIAnalysis(): FundReport["ai_analysis"] {
  return {
    summary: "暂无 AI 分析",
    strengths: ["数据不足，无法生成分析"],
    risks: ["请参考基金定期报告"],
    recommendation: "建议仔细阅读基金合同、招募说明书等法律文件",
    rating: 3,
    short_term: "中性",
    mid_term: "中性",
    long_term: "推荐",
    allocation_ratio: "10%-20%",
    build_position: "定投",
    take_profit: "收益率达到 20% 时可考虑部分止盈",
    stop_loss: "回撤超过 15% 时考虑调整",
  };
}

function generateMarkdownReport(report: FundReport): string {
  const today = new Date().toLocaleDateString("zh-CN");
  const nextUpdate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("zh-CN");

  return `# 基金深度研究报告

**报告日期：** ${today}
**研究员：** AI 基金分析师
**基金代码：** ${report.fund_code}
**基金名称：** ${report.fund_name}

---

## 一、基金基本信息

| 项目 | 内容 |
|------|------|
| 基金代码 | ${report.fund_code} |
| 基金名称 | ${report.fund_name} |
| 基金类型 | ${report.fund_type} |
| 成立日期 | ${report.established_date} |
| 基金规模 | ${report.scale}（截至${report.nav_date}） |
| 基金份额 | ${report.shares || "-"} |
| 基金管理人 | ${report.company} |
| 基金托管人 | ${report.custodian || "-"} |
| 业绩比较基准 | ${report.benchmark || "-"} |
| 风险等级 | ${report.risk_level} |
| 投资范围 | ${report.investment_range || "-"} |

---

## 二、基金经理信息

### 2.1 现任基金经理

| 姓名 | 任职日期 | 从业年限 | 管理基金数 | 代表作品 |
|------|----------|----------|------------|----------|
| ${report.manager?.name || "-"} | ${report.manager?.tenure || "-"} | ${report.manager?.experience || "-"} | ${report.manager?.funds_count || "-"} | ${report.manager?.representative_fund || "-"} |

### 2.2 基金经理简历

**教育背景：**
- ${report.manager?.education || "数据暂缺"}

**从业经历：**
- 数据暂缺

**投资风格：**
${report.manager?.style || "数据暂缺"}

### 2.3 基金经理历史业绩

| 基金名称 | 任职期间 | 年化收益 | 同类排名 | 最大回撤 |
|----------|----------|----------|----------|----------|
${report.manager?.history_performance?.map(p => `| ${p.fund_name} | ${p.period} | ${p.annual_return} | ${p.rank} | ${p.max_drawdown} |`).join("\n") || "| 数据暂缺 | - | - | - | - |"}

---

## 三、投资目标与策略

### 3.1 投资目标

数据暂缺。请参考基金合同。

### 3.2 投资范围

- **股票投资比例：** 数据暂缺
- **债券投资比例：** 数据暂缺
- **现金及货币市场工具：** 数据暂缺
- **其他金融工具：** 数据暂缺

### 3.3 投资策略

**核心策略：** 数据暂缺

**选股方法：** 数据暂缺

**行业配置：** 数据暂缺

**仓位管理：** 数据暂缺

---

## 四、资产配置分析

### 4.1 当前资产配置（截至${report.nav_date}）

| 资产类别 | 持仓比例 | 较上期变化 |
|----------|----------|------------|
${report.asset_allocation?.map(item => `| ${item.name} | ${item.ratio} | ${item.change || "-"} |`).join("\n") || "| 股票 | 数据暂缺 | - |\n| 债券 | 数据暂缺 | - |\n| 银行存款 | 数据暂缺 | - |\n| 其他资产 | 数据暂缺 | - |"}

### 4.2 历史资产配置变化

| 报告期 | 股票 | 债券 | 现金 | 其他 |
|--------|------|------|------|------|
${report.asset_allocation_history?.map(item => `| ${item.period} | ${item.stock} | ${item.bond} | ${item.cash} | ${item.other} |`).join("\n") || "| 2024Q4 | 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 |\n| 2024Q3 | 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 |\n| 2024Q2 | 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 |\n| 2024Q1 | 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 |"}

### 4.3 仓位分析

- **当前股票仓位：** 数据暂缺
- **近一年平均仓位：** 数据暂缺
- **仓位波动范围：** 数据暂缺
- **仓位特点：** 数据暂缺

---

## 五、行业配置分析

### 5.1 当前行业配置（截至${report.nav_date}）

| 行业 | 持仓比例 | 超配/低配 | 行业排名 |
|------|----------|-----------|----------|
${report.industry_allocation?.map(item => `| ${item.name} | ${item.ratio} | ${item.overweight || "-"} | ${item.rank || "-"} |`).join("\n") || "| 数据暂缺 | 数据暂缺 | - | - |"}

### 5.2 行业配置变化趋势

数据暂缺。

### 5.3 行业配置特点

数据暂缺。

---

## 六、重仓股分析

### 6.1 前十大重仓股（截至${report.nav_date}）

| 序号 | 股票代码 | 股票名称 | 持仓比例 | 所属行业 | 较上期变化 |
|------|----------|----------|----------|----------|------------|
${report.top_stocks?.map((stock, i) => `| ${i+1} | ${stock.code} | ${stock.name} | ${stock.ratio} | ${stock.industry} | ${stock.change || "-"} |`).join("\n") || "| 1 | 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 |"}

### 6.2 重仓股特点分析

**集中度分析：**
- 前十大重仓股合计占比：数据暂缺
- 第一大重仓股占比：数据暂缺
- 集中度评价：数据暂缺

**风格分析：**
- 市值风格：数据暂缺
- 估值风格：数据暂缺
- 行业分布：数据暂缺

### 6.3 重点个股分析

数据暂缺。

---

## 七、业绩表现分析

### 7.1 收益率表现

| 时间段 | 基金收益率 | 业绩基准收益 | 超额收益 | 同类平均 | 同类排名 |
|--------|------------|--------------|----------|----------|----------|
| 近 1 月 | ${report.returns?.["1month"] || "-"} | - | - | - | - |
| 近 3 月 | ${report.returns?.["3month"] || "-"} | - | - | - | - |
| 近 6 月 | ${report.returns?.["6month"] || "-"} | - | - | - | - |
| 近 1 年 | ${report.returns?.["1year"] || "-"} | - | - | - | - |
| 近 3 年 | ${report.returns?.["3year"] || "-"} | - | - | - | - |
| 近 5 年 | ${report.returns?.["5year"] || "-"} | - | - | - | - |
| 成立以来 | ${report.returns?.["since_setup"] || "-"} | - | - | - | - |

### 7.2 年度收益表现

| 年度 | 基金收益率 | 业绩基准收益 | 超额收益 | 同类排名 |
|------|------------|--------------|----------|----------|
${report.yearly_returns?.map(item => `| ${item.year} | ${item.fund_return} | ${item.benchmark_return} | ${item.excess_return} | ${item.rank} |`).join("\n") || "| 2024 | 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 |\n| 2023 | 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 |\n| 2022 | 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 |"}

### 7.3 业绩稳定性分析

- **胜率（月度）：** 数据暂缺
- **胜率（年度）：** 数据暂缺
- **业绩波动性：** 数据暂缺
- **业绩持续性评价：** 数据暂缺

---

## 八、风险分析

### 8.1 风险指标

| 指标 | 数值 | 同类平均 | 评价 |
|------|------|----------|------|
| 夏普比率（近 3 年） | ${report.risk_metrics?.sharpe_ratio || "-"} | - | - |
| 卡玛比率（近 3 年） | ${report.risk_metrics?.calmar || "-"} | - | - |
| 索提诺比率（近 3 年） | ${report.risk_metrics?.sortino || "-"} | - | - |
| 波动率（近 3 年） | ${report.risk_metrics?.volatility || "-"} | - | - |
| Beta 系数（近 3 年） | ${report.risk_metrics?.beta || "-"} | 1.00 | - |
| Alpha（近 3 年） | ${report.risk_metrics?.alpha || "-"} | 0% | - |
| 信息比率（近 3 年） | - | - | - |

### 8.2 回撤分析

| 指标 | 数值 | 同类平均 | 评价 |
|------|------|----------|------|
| 最大回撤（近 1 年） | ${report.risk_metrics?.max_drawdown || "-"} | - | - |
| 最大回撤（近 3 年） | - | - | - |
| 最大回撤（成立以来） | - | - | - |
| 最大回撤发生日期 | - | - | - |
| 最大回撤恢复天数 | - | - | - |

### 8.3 下行风险分析

- **下行标准差：** 数据暂缺
- **VaR（95%，1 日）：** 数据暂缺
- **CVaR（95%）：** 数据暂缺

### 8.4 风险综合评价

数据暂缺。

---

## 九、费率结构

### 9.1 基金费率

| 费用类型 | 费率 | 说明 |
|----------|------|------|
| 管理费 | ${report.fees?.management_fee || "-"} | 按日计提 |
| 托管费 | ${report.fees?.custody_fee || "-"} | 按日计提 |
| 销售服务费 | ${report.fees?.service_fee || "-"} | C 类份额收取 |
| 申购费 | ${report.fees?.subscription_fee || "-"} | 前端收费，可打折 |
| 赎回费 | ${report.fees?.redemption_fee || "-"} | 持有期<7 天：1.5% |

### 9.2 费率对比

| 基金 | 管理费 | 托管费 | 销售服务费 | 综合费率 |
|------|--------|--------|------------|----------|
| 本基金 | ${report.fees?.management_fee || "-"} | ${report.fees?.custody_fee || "-"} | ${report.fees?.service_fee || "-"} | - |
| 同类平均 | - | - | - | - |

### 9.3 费率评价

数据暂缺。

---

## 十、适合人群

### 10.1 投资者画像

**风险承受能力：** ${report.risk_level || "R3"}
**投资期限：** 中长期
**投资目标：** 资本增值

### 10.2 适合场景

- ✅ 看好${report.fund_type}长期发展的投资者
- ✅ 希望配置${report.fund_type}的投资者
- ✅ 寻求长期资本增值的投资者
- ✅ 作为投资组合中的权益资产配置

### 10.3 不适合人群

- ❌ 风险承受能力低于${report.risk_level || "R3"}的投资者
- ❌ 投资期限短于 6 个月的投资者
- ❌ 不认可${report.fund_type}投资理念的投资者

---

## 十一、投资建议

### 11.1 核心优势

${report.ai_analysis?.strengths?.map((s, i) => `${i+1}. **${s.split("：")[0] || `优势${i+1}`}**：${s}`).join("\n") || "1. **数据不足**：请参考基金定期报告"}

### 11.2 潜在风险

${report.ai_analysis?.risks?.map((r, i) => `${i+1}. **${r.split("：")[0] || `风险${i+1}`}**：${r}`).join("\n") || "1. **市场风险**：股市波动可能导致基金净值下跌"}

### 11.3 投资建议

| 投资维度 | 建议 | 理由 |
|----------|------|------|
| 短期（1-3 月） | ${report.ai_analysis?.short_term || "中性"} | 根据市场情况灵活调整 |
| 中期（3-12 月） | ${report.ai_analysis?.mid_term || "中性"} | 关注基金业绩持续性 |
| 长期（1 年以上） | ${report.ai_analysis?.long_term || "推荐"} | 长期持有分享经济增长红利 |

### 11.4 配置建议

- **建议配置比例：** ${report.ai_analysis?.allocation_ratio || "10%-20%"}（占权益资产）
- **建仓方式：** ${report.ai_analysis?.build_position || "定投"}
- **止盈建议：** ${report.ai_analysis?.take_profit || "收益率达到 20% 时可考虑部分止盈"}
- **止损建议：** ${report.ai_analysis?.stop_loss || "回撤超过 15% 时考虑调整"}

### 11.5 总体评级

| 评级维度 | 评级 |
|----------|------|
| 基金经理 | ${"⭐".repeat(report.ai_analysis?.rating || 3)}${"☆".repeat(5 - (report.ai_analysis?.rating || 3))} |
| 投资业绩 | ${"⭐".repeat(report.ai_analysis?.rating || 3)}${"☆".repeat(5 - (report.ai_analysis?.rating || 3))} |
| 风险控制 | ${"⭐".repeat(report.ai_analysis?.rating || 3)}${"☆".repeat(5 - (report.ai_analysis?.rating || 3))} |
| 费率水平 | ${"⭐".repeat(report.ai_analysis?.rating || 3)}${"☆".repeat(5 - (report.ai_analysis?.rating || 3))} |
| **综合评级** | **${"⭐".repeat(report.ai_analysis?.rating || 3)}${"☆".repeat(5 - (report.ai_analysis?.rating || 3))}** |

**投资评级：** ${report.ai_analysis?.rating && report.ai_analysis.rating >= 4 ? "推荐" : report.ai_analysis?.rating === 3 ? "中性" : "谨慎"}

---

## 十二、附录

### 12.1 重要声明

本报告基于公开信息编制，仅供参考，不构成投资建议。投资者据此操作，风险自担。

### 12.2 数据来源

- 基金定期报告
- 盈米基金 MCP
- 基金公司官网

### 12.3 相关报告

- 基金合同
- 招募说明书
- 基金定期报告

---

**报告完成日期：** ${today}
**下次更新：** ${nextUpdate}

---

*本报告由 AI 基金分析师自动生成 · 数据来源：盈米基金 MCP*
`;
}

serve(async (req: Request) => {
  // CORS 预检请求
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "只支持 POST 请求" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 405,
        }
      );
    }

    const { fund_code } = await req.json();

    if (!fund_code) {
      return new Response(
        JSON.stringify({ success: false, error: "缺少基金代码" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Generating report for fund:", fund_code);

    // 1. 获取基金基础数据
    const fundData = await fetchFundData(fund_code);
    
    // 2. 生成 AI 分析
    const ai_analysis = await generateAIAnalysis(fundData);

    // 3. 组装完整报告
    const report: FundReport = {
      fund_code: fundData.fund_code || fund_code,
      fund_name: fundData.fund_name || "未知基金",
      fund_type: fundData.fund_type || "未知",
      risk_level: fundData.risk_level || "R3",
      company: fundData.company || "未知",
      custodian: fundData.custodian || "未知",
      established_date: fundData.established_date || "未知",
      scale: fundData.fund_scale || "未知",
      shares: fundData.fund_shares || "未知",
      benchmark: fundData.benchmark || "未知",
      investment_range: fundData.investment_range || "未知",
      nav: fundData.net_value || 0,
      nav_date: fundData.nav_date || "",
      daily_growth: fundData.daily_growth || "0%",
      returns: {
        "1month": fundData.return_1month || "-",
        "3month": fundData.return_3month || "-",
        "6month": fundData.return_6month || "-",
        "1year": fundData.return_1year || "-",
        "3year": fundData.return_3year || "-",
        "5year": fundData.return_5year || "-",
        "since_setup": fundData.return_since_setup || "-",
      },
      risk_metrics: {
        sharpe_ratio: fundData.sharpe_ratio || "-",
        max_drawdown: fundData.max_drawdown || "-",
        volatility: fundData.volatility || "-",
        beta: fundData.beta || "-",
        alpha: fundData.alpha || "-",
        sortino: fundData.sortino_ratio || "-",
        calmar: fundData.calmar_ratio || "-",
      },
      asset_allocation: fundData.asset_allocation || [],
      asset_allocation_history: fundData.asset_allocation_history || [],
      industry_allocation: fundData.industry_allocation || [],
      top_stocks: fundData.top_stocks || [],
      manager: {
        name: fundData.fund_manager || "未知",
        tenure: fundData.manager_tenure || "未知",
        experience: fundData.manager_experience || "未知",
        education: fundData.manager_education || "未知",
        style: fundData.manager_style || "未知",
        funds_count: fundData.manager_funds_count || "未知",
        representative_fund: fundData.manager_representative_fund || "未知",
        history_performance: fundData.manager_history_performance || [],
      },
      fees: {
        management_fee: fundData.management_fee || "-",
        custody_fee: fundData.custody_fee || "-",
        service_fee: fundData.service_fee || "-",
        subscription_fee: fundData.subscription_fee || "-",
        redemption_fee: fundData.redemption_fee || "-",
      },
      yearly_returns: fundData.yearly_returns || [],
      ai_analysis,
    };

    // 4. 生成 Markdown 报告
    const markdown = generateMarkdownReport(report);

    return new Response(
      JSON.stringify({
        success: true,
        report,
        markdown,
        download_url: `/api/download-report?fund_code=${fund_code}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Report generation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "研报生成失败",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
