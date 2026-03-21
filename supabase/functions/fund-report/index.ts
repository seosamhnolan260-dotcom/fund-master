import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 盈米 MCP 配置
const YINGMI_MCP_ENDPOINT = Deno.env.get("YINGMI_MCP_ENDPOINT") || "";
const YINGMI_MCP_API_KEY = Deno.env.get("YINGMI_MCP_API_KEY") || "";

// 阿里云百炼配置（用于生成 AI 分析）
const BAILIAN_API_KEY = Deno.env.get("BAILIAN_API_KEY") || "";
const BAILIAN_MODEL = "qwen-plus";

interface FundReport {
  // 基本信息
  fund_code: string;
  fund_name: string;
  fund_type: string;
  risk_level: string;
  company: string;
  manager: string;
  established_date: string;
  scale: string;
  
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
    "since_setup": string;
  };
  
  // 风险指标
  risk_metrics: {
    sharpe_ratio: string;
    max_drawdown: string;
    volatility: string;
  };
  
  // 资产配置
  asset_allocation: Array<{
    name: string;
    ratio: string;
  }>;
  
  // 行业配置
  industry_allocation: Array<{
    name: string;
    ratio: string;
  }>;
  
  // 重仓股
  top_stocks: Array<{
    code: string;
    name: string;
    ratio: string;
    industry: string;
  }>;
  
  // 基金经理
  manager_info: {
    name: string;
    tenure: string;
    experience: string;
    bio: string;
  };
  
  // 费率
  fees: {
    management_fee: string;
    custody_fee: string;
    subscription_fee: string;
    redemption_fee: string;
  };
  
  // AI 分析
  ai_analysis: {
    summary: string;
    strengths: string[];
    risks: string[];
    recommendation: string;
    rating: number;
  };
}

async function fetchFundData(code: string): Promise<Partial<FundReport>> {
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
    throw new Error("获取基金数据失败");
  }
  
  const data = await response.json();
  return data.data || {};
}

async function generateAIAnalysis(fundData: Partial<FundReport>): Promise<FundReport["ai_analysis"]> {
  // 调用阿里云百炼生成 AI 分析
  const prompt = `请分析以下基金并生成专业的投资建议：

基金名称：${fundData.fund_name}
基金代码：${fundData.fund_code}
基金类型：${fundData.fund_type}
单位净值：${fundData.nav} (${fundData.nav_date})
日涨跌幅：${fundData.daily_growth}
基金规模：${fundData.scale}
基金经理：${fundData.manager}

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

前十大持仓：${JSON.stringify(fundData.top_stocks)}

请以 JSON 格式返回分析结果，包含：
1. summary: 一句话总结（50 字以内）
2. strengths: 核心优势（3-5 条）
3. risks: 潜在风险（3-5 条）
4. recommendation: 投资建议（100 字以内）
5. rating: 综合评级（1-5 分）`;

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
      return {
        summary: "暂无 AI 分析",
        strengths: [],
        risks: [],
        recommendation: "请参考基金定期报告",
        rating: 3,
      };
    }
    
    const result = await response.json();
    const content = result.output?.choices?.[0]?.message?.content || "{}";
    
    // 尝试解析 JSON
    try {
      const analysis = JSON.parse(content);
      return {
        summary: analysis.summary || "暂无 AI 分析",
        strengths: analysis.strengths || [],
        risks: analysis.risks || [],
        recommendation: analysis.recommendation || "请参考基金定期报告",
        rating: analysis.rating || 3,
      };
    } catch {
      return {
        summary: content.substring(0, 100),
        strengths: [],
        risks: [],
        recommendation: content,
        rating: 3,
      };
    }
  } catch (error) {
    console.error("AI analysis error:", error);
    return {
      summary: "暂无 AI 分析",
      strengths: [],
      risks: [],
      recommendation: "请参考基金定期报告",
      rating: 3,
    };
  }
}

function generateMarkdownReport(report: FundReport): string {
  return `# 基金深度研究报告

**基金名称**: ${report.fund_name}  
**基金代码**: ${report.fund_code}  
**报告日期**: ${new Date().toLocaleDateString("zh-CN")}  
**数据来源**: 盈米基金 MCP

---

## 一、基金基本信息

| 项目 | 内容 |
|------|------|
| 基金名称 | ${report.fund_name} |
| 基金代码 | ${report.fund_code} |
| 基金类型 | ${report.fund_type} |
| 风险等级 | ${report.risk_level} |
| 基金公司 | ${report.company} |
| 基金经理 | ${report.manager} |
| 成立日期 | ${report.established_date} |
| 基金规模 | ${report.scale} |

---

## 二、业绩表现

| 时间段 | 收益率 |
|--------|--------|
| 近 1 个月 | ${report.returns["1month"]} |
| 近 3 个月 | ${report.returns["3month"]} |
| 近 6 个月 | ${report.returns["6month"]} |
| 近 1 年 | ${report.returns["1year"]} |
| 近 3 年 | ${report.returns["3year"]} |
| 成立以来 | ${report.returns["since_setup"]} |

**当前净值**: ${report.nav} (${report.nav_date})  
**日涨跌幅**: ${report.daily_growth}

---

## 三、风险指标

| 指标 | 数值 |
|------|------|
| 夏普比率 | ${report.risk_metrics.sharpe_ratio} |
| 最大回撤 | ${report.risk_metrics.max_drawdown} |
| 波动率 | ${report.risk_metrics.volatility} |

---

## 四、资产配置

| 资产类别 | 配置比例 |
|----------|----------|
${report.asset_allocation.map(item => `| ${item.name} | ${item.ratio} |`).join("\n")}

---

## 五、行业配置

| 行业 | 配置比例 |
|------|----------|
${report.industry_allocation.map(item => `| ${item.name} | ${item.ratio} |`).join("\n")}

---

## 六、前十大重仓股

| 序号 | 代码 | 名称 | 持仓比例 | 行业 |
|------|------|------|----------|------|
${report.top_stocks.map((stock, i) => `| ${i+1} | ${stock.code} | ${stock.name} | ${stock.ratio} | ${stock.industry} |`).join("\n")}

---

## 七、基金经理

**姓名**: ${report.manager_info.name}  
**任职年限**: ${report.manager_info.tenure}  
**从业经验**: ${report.manager_info.experience}

**简介**: ${report.manager_info.bio}

---

## 八、费率结构

| 费用类型 | 费率 |
|----------|------|
| 管理费 | ${report.fees.management_fee} |
| 托管费 | ${report.fees.custody_fee} |
| 申购费 | ${report.fees.subscription_fee} |
| 赎回费 | ${report.fees.redemption_fee} |

---

## 九、AI 深度分析

### 核心观点
> ${report.ai_analysis.summary}

### 核心优势
${report.ai_analysis.strengths.map(s => `- ${s}`).join("\n")}

### 潜在风险
${report.ai_analysis.risks.map(r => `- ${r}`).join("\n")}

### 投资建议
${report.ai_analysis.recommendation}

### 综合评级
${"⭐".repeat(report.ai_analysis.rating)}${"☆".repeat(5 - report.ai_analysis.rating)} (${report.ai_analysis.rating}/5)

---

## 十、适合人群

- ✅ 看好${report.fund_type}的长期投资者
- ✅ 风险承受能力${report.risk_level}的投资者
- ✅ 希望配置${report.company}旗下基金的投资者
- ❌ 不适合短期投机者
- ❌ 不适合风险承受能力低的投资者

---

## 重要声明

1. 本报告基于公开数据编制，仅供参考，不构成投资建议
2. 基金有风险，投资需谨慎
3. 过往业绩不代表未来表现
4. 投资者应仔细阅读基金合同、招募说明书等法律文件
5. 数据来源：盈米基金 MCP
6. 报告生成时间：${new Date().toISOString()}

---

**报告生成**: 基金投资大师 AI 研报系统  
**数据支持**: 盈米基金 MCP  
**AI 分析**: 阿里云百炼
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
      manager: fundData.manager || "未知",
      established_date: fundData.established_date || "未知",
      scale: fundData.scale || "未知",
      nav: fundData.nav || 0,
      nav_date: fundData.nav_date || "",
      daily_growth: fundData.daily_growth || "0%",
      returns: {
        "1month": fundData.returns?.["1month"] || "-",
        "3month": fundData.returns?.["3month"] || "-",
        "6month": fundData.returns?.["6month"] || "-",
        "1year": fundData.returns?.["1year"] || "-",
        "3year": fundData.returns?.["3year"] || "-",
        "since_setup": fundData.returns?.["since_setup"] || "-",
      },
      risk_metrics: {
        sharpe_ratio: fundData.risk_metrics?.sharpe_ratio || "-",
        max_drawdown: fundData.risk_metrics?.max_drawdown || "-",
        volatility: fundData.risk_metrics?.volatility || "-",
      },
      asset_allocation: fundData.asset_allocation || [],
      industry_allocation: fundData.industry_allocation || [],
      top_stocks: fundData.top_stocks || [],
      manager_info: {
        name: fundData.manager || "未知",
        tenure: fundData.manager_tenure || "未知",
        experience: fundData.manager_experience || "未知",
        bio: fundData.manager_bio || "",
      },
      fees: {
        management_fee: fundData.fees?.management_fee || "-",
        custody_fee: fundData.fees?.custody_fee || "-",
        subscription_fee: fundData.fees?.subscription_fee || "-",
        redemption_fee: fundData.fees?.redemption_fee || "-",
      },
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
