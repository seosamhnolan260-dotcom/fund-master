import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 盈米 MCP 配置
const YINGMI_MCP_ENDPOINT = Deno.env.get("YINGMI_MCP_ENDPOINT") || "";
const YINGMI_MCP_API_KEY = Deno.env.get("YINGMI_MCP_API_KEY") || "";

// 阿里云百炼配置 (LLM)
const BAILIAN_API_KEY = Deno.env.get("BAILIAN_API_KEY") || "";
const BAILIAN_MODEL = "qwen-plus";

// 专业 Prompt 模板 - 基金经理级别
const ANALYSIS_PROMPT = `你是一位拥有 20 年从业经验的资深基金分析师，擅长深度穿透底层资产、跨维度关联分析。

请根据以下盈米 MCP 提供的基金数据，参考《人工智能 ETF 深度研究报告》的专业口径，生成一份符合长期价值投资理念的深度研报。

## 数据输入
{{FUND_DATA}}

## 输出要求

### 1. 核心摘要 (200 字以内)
- 投资评级：强烈推荐/推荐/中性/谨慎（基于 PE 分位、业绩表现、风险指标综合判断）
- 核心观点：3 条，每条 50 字以内
- 目标收益区间：未来 1 年预期收益（注明为模拟测算）

### 2. 业绩归因分析
- Alpha 收益来源：经理选股能力还是行业 Beta？
- 风险调整后收益：夏普比率评价
- 同类排名评价：前 10%/前 30%/中等/后 50%

### 3. 持仓深度画像
- 前十大重仓股集中度评价：高/中/低
- 行业关联度分析：是否存在单一行业风险暴露？
- 穿透分析：如持仓全是光模块，指出对 AI 算力基建的高度依赖

### 4. 基金经理风格评测
- 投资理念：价值/成长/均衡？
- 操作风格：高频调仓/长期持有？
- 能力圈：擅长哪些行业？

### 5. 风险提示 (强制)
- 至少列出 3 条具体风险
- 包含市场风险、流动性风险、管理风险

### 6. 投资建议 (强制)
- 短期（1-3 月）：推荐/中性/谨慎
- 中期（3-12 月）：推荐/中性/谨慎
- 长期（1 年以上）：推荐/中性/谨慎
- 建议配置比例：X%-X%
- 止盈止损建议

### 7. 免责声明 (强制)
必须包含：
- 本报告仅供参考，不构成投资建议
- 基金有风险，投资需谨慎
- 过往业绩不代表未来表现

## 写作风格
- 专业但不晦涩
- 数据驱动，避免空话
- 具有预见性和洞察力
- 符合合规要求

## 输出格式
请严格按照 Markdown 格式输出，包含以下章节：
1. 核心摘要
2. 业绩归因分析
3. 持仓深度画像
4. 基金经理风格评测
5. 风险分析
6. 投资建议
7. 免责声明`;

interface FundData {
  fund_code: string;
  fund_name: string;
  fund_type: string;
  risk_level: string;
  company: string;
  custodian: string;
  established_date: string;
  fund_scale: string;
  net_value: number;
  nav_date: string;
  daily_growth: string;
  return_1month?: string;
  return_3month?: string;
  return_6month?: string;
  return_1year?: string;
  return_3year?: string;
  return_5year?: string;
  return_since_setup?: string;
  fund_manager?: string;
  manager_tenure?: string;
  manager_experience?: string;
  management_fee?: string;
  custody_fee?: string;
  asset_allocation?: Array<{ name: string; ratio: string | number }>;
  industry_allocation?: Array<{ name: string; ratio: string | number }>;
  top_stocks?: Array<{
    code: string;
    name: string;
    ratio: string | number;
    industry?: string;
  }>;
  [key: string]: any;
}

// 格式化基金数据为 Prompt 上下文
function formatFundDataForPrompt(data: FundData): string {
  const topHoldings = (data.top_stocks || [])
    .slice(0, 10)
    .map((s: any) => `- ${s.name}(${s.code}): ${typeof s.ratio === 'string' ? s.ratio : (s.ratio * 100).toFixed(2)}% (${s.industry || '未知行业'})`)
    .join('\n');
  
  const assetAlloc = (data.asset_allocation || [])
    .map((a: any) => `- ${a.name}: ${typeof a.ratio === 'string' ? a.ratio : (a.ratio * 100).toFixed(2)}%`)
    .join('\n');
  
  const industryAlloc = (data.industry_allocation || [])
    .slice(0, 5)
    .map((i: any) => `- ${i.name}: ${typeof i.ratio === 'string' ? i.ratio : (i.ratio * 100).toFixed(2)}%`)
    .join('\n');

  return `
**基金基本信息**
- 代码：${data.fund_code}
- 名称：${data.fund_name}
- 类型：${data.fund_type}
- 风险等级：${data.risk_level || 'R3'}
- 规模：${data.fund_scale || '未知'}
- 成立日期：${data.established_date || '未知'}
- 管理人：${data.company || '未知'}
- 托管人：${data.custodian || '未知'}

**业绩表现**
- 单位净值：${data.net_value || '-'} (${data.nav_date || '-'})
- 日涨跌幅：${data.daily_growth || '-'}
- 近 1 月：${data.return_1month || '-'}
- 近 3 月：${data.return_3month || '-'}
- 近 6 月：${data.return_6month || '-'}
- 近 1 年：${data.return_1year || '-'}
- 近 3 年：${data.return_3year || '-'}
- 成立以来：${data.return_since_setup || '-'}

**基金经理**
- 姓名：${data.fund_manager || '未知'}
- 任职年限：${data.manager_tenure || '未知'}
- 从业经验：${data.manager_experience || '未知'}

**资产配置**
${assetAlloc || '数据暂缺'}

**行业配置 (前 5)**
${industryAlloc || '数据暂缺'}

**前十大重仓股**
${topHoldings || '数据暂缺'}

**费率结构**
- 管理费：${data.management_fee || '-'}
- 托管费：${data.custody_fee || '-'}
`;
}

// 调用阿里云百炼 API 生成 AI 分析
async function generateAIAnalysis(fundData: FundData): Promise<string> {
  const prompt = ANALYSIS_PROMPT.replace('{{FUND_DATA}}', formatFundDataForPrompt(fundData));
  
  console.log("===== 发送 LLM 请求 =====");
  console.log("模型:", BAILIAN_MODEL);
  console.log("Prompt 长度:", prompt.length);
  console.log("======================");
  
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
            { 
              role: "system", 
              content: "你是一位拥有 20 年从业经验的资深基金分析师，擅长深度穿透底层资产、跨维度关联分析。你的分析报告专业、数据驱动、具有预见性，符合长期价值投资理念。" 
            },
            { 
              role: "user", 
              content: prompt 
            }
          ]
        },
        parameters: {
          result_format: "text",
          temperature: 0.7,
          max_tokens: 4000,
        }
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM API 错误:", response.status, errorText);
      throw new Error(`LLM API 调用失败：${response.status}`);
    }
    
    const result = await response.json();
    const content = result.output?.text || result.output?.choices?.[0]?.message?.content || "";
    
    console.log("===== LLM 响应 =====");
    console.log("内容长度:", content.length);
    console.log("==================");
    
    return content;
  } catch (error) {
    console.error("LLM 调用失败:", error);
    throw error;
  }
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

    console.log("===== 研报生成请求 =====");
    console.log("基金代码:", fund_code);

    // 步骤 1: 从盈米 MCP 获取基金数据
    console.log("步骤 1: 获取盈米 MCP 数据...");
    const fundResponse = await fetch(`${YINGMI_MCP_ENDPOINT}/fund/detail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${YINGMI_MCP_API_KEY}`,
      },
      body: JSON.stringify({ fund_code }),
    });
    
    if (!fundResponse.ok) {
      throw new Error("盈米 MCP 数据获取失败");
    }
    
    const fundResult = await fundResponse.json();
    const fundData: FundData = fundResult.data || {};
    
    console.log("步骤 1 完成：数据获取成功");
    console.log("基金名称:", fundData.fund_name);

    // 步骤 2: 调用 LLM 生成 AI 分析
    console.log("步骤 2: 调用 LLM 生成深度分析...");
    const aiAnalysis = await generateAIAnalysis(fundData);
    console.log("步骤 2 完成：AI 分析生成成功");

    // 步骤 3: 返回完整报告
    return new Response(
      JSON.stringify({
        success: true,
        fund_data: fundData,
        ai_analysis: aiAnalysis,
        markdown: aiAnalysis, // 直接返回 LLM 生成的 Markdown
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
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
