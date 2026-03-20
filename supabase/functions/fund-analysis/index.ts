import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

// 阿里云百炼 API 配置 (OpenAI 兼容格式)
const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY") || "";
const QWEN_API_ENDPOINT =
	"https://coding.dashscope.aliyuncs.com/v1/chat/completions";

// Supabase 配置
const _supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const _supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface FundInfo {
	fund_code: string;
	fund_name: string;
	net_value: number;
	daily_growth_rate: number;
	fund_type: string;
	fund_scale: number;
	fund_manager: string;
}

interface AnalysisRequest {
	fundInfo: FundInfo;
}

// 构建 AI 报告生成的 Prompt
function buildPrompt(fundInfo: FundInfo): string {
	return `你是一位专业的基金投研分析师，请根据以下基金信息生成一份深度投研报告。

## 基金基本信息
- 基金代码：${fundInfo.fund_code}
- 基金名称：${fundInfo.fund_name}
- 基金类型：${fundInfo.fund_type}
- 当前净值：${fundInfo.net_value}
- 日涨跌幅：${fundInfo.daily_growth_rate}%
- 基金规模：${fundInfo.fund_scale}亿元
- 基金经理：${fundInfo.fund_manager}

请按照以下结构生成报告（使用 Markdown 格式）：

## 一句话投资判断
[用 1 句话概括基金的投资价值，简洁有力]

## 基金概况与定位
- 基金类型与投资策略
- 业绩比较基准
- 风险收益特征

## 历史业绩分析
- 近 1 月/3 月/6 月/1 年/3 年收益率
- 同类排名百分位
- 最大回撤与恢复时间

## 持仓分析
- 前十大重仓股/债券
- 行业分布
- 集中度分析

## 基金经理评估
- 经理履历与投资风格
- 管理该基金时长
- 历史管理业绩

## 风险评估
- 波动率分析
- 下行风险
- 适合的投资人群

## 投资建议
- 买入/持有/观望建议
- 适合的投资期限
- 配置建议

要求：
1. 专业客观，数据驱动
2. 语言通俗易懂，避免过度专业术语
3. 给出明确的投资建议
4. 总字数控制在 800-1200 字`;
}

// 调用阿里云百炼 API (OpenAI 兼容格式)
async function callQwenAPI(
	prompt: string,
): Promise<ReadableStream<Uint8Array>> {
	const response = await fetch(QWEN_API_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${QWEN_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: "qwen3.5-plus",
			messages: [
				{
					role: "system",
					content:
						"你是一位专业的基金投研分析师，擅长用通俗易懂的语言生成深度投研报告。",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			stream: true,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Qwen API 调用失败：${response.status} ${error}`);
	}

	return response.body!;
}

// SSE 格式编码器
function encodeSSE(data: string): string {
	return `data: ${JSON.stringify({ choices: [{ delta: { content: data } }] })}\n\n`;
}

serve(async (req: Request) => {
	// CORS 预检请求
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		// 只接受 POST 请求
		if (req.method !== "POST") {
			return new Response(
				JSON.stringify({ success: false, error: "只支持 POST 请求" }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 405,
				},
			);
		}

		// 解析请求体
		const { fundInfo }: AnalysisRequest = await req.json();

		if (!fundInfo || !fundInfo.fund_code) {
			return new Response(
				JSON.stringify({ success: false, error: "缺少基金信息参数" }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400,
				},
			);
		}

		console.log(
			"Fund analysis request:",
			fundInfo.fund_code,
			fundInfo.fund_name,
		);

		// 检查缓存 (TODO: 实现 Supabase 缓存)
		// const cachedReport = await getCachedReport(fundInfo.fund_code, today);
		// if (cachedReport) { ... }

		// 构建 Prompt
		const prompt = buildPrompt(fundInfo);

		// 调用 AI API 获取流式响应
		const aiStream = await callQwenAPI(prompt);

		// 创建可读流用于 SSE 响应
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				const reader = aiStream.getReader();
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) {
							controller.enqueue(encoder.encode(encodeSSE("[DONE]")));
							break;
						}

						const text = new TextDecoder().decode(value);
						// 解析 AI 响应并转换为 SSE 格式
						controller.enqueue(encoder.encode(encodeSSE(text)));
					}
				} catch (error) {
					console.error("Stream error:", error);
					controller.error(error);
				} finally {
					controller.close();
				}
			},
		});

		// 返回 SSE 流
		return new Response(stream, {
			headers: {
				...corsHeaders,
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error in fund-analysis:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error.message || "服务器内部错误",
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 500,
			},
		);
	}
});
