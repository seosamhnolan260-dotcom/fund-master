import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

// 盈米 MCP 配置
const YINGMI_MCP_ENDPOINT =
	Deno.env.get("YINGMI_MCP_ENDPOINT") || "https://stargate.yingmi.com/mcp/v2";
const YINGMI_MCP_API_KEY = Deno.env.get("YINGMI_MCP_API_KEY") || "";

interface PerformancePeriod {
	period: string;
	growth_rate: number;
	rank?: number;
	total_funds?: number;
	percentile?: number;
}

interface PerformanceDetail {
	fund_code: string;
	fund_name: string;
	performance_periods?: PerformancePeriod[];
	annual_returns?: PerformancePeriod[];
	yield_this_year?: number;
	yield_1y?: number;
	yield_3y?: number;
	yield_5y?: number;
	since_inception?: number;
}

interface PerformanceResponse {
	success: boolean;
	data?: PerformanceDetail | PerformanceDetail[];
	error?: string;
}

/**
 * 调用盈米 MCP 工具
 */
async function callMcpTool(
	method: string,
	arguments_: Record<string, any>,
): Promise<any> {
	const requestBody = {
		jsonrpc: "2.0",
		id: Date.now(),
		method: "tools/call",
		params: {
			name: method,
			arguments: arguments_,
		},
	};

	const response = await fetch(YINGMI_MCP_ENDPOINT, {
		method: "POST",
		headers: {
			"x-api-key": YINGMI_MCP_API_KEY,
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		},
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		throw new Error(
			`MCP API 请求失败：${response.status} ${response.statusText}`,
		);
	}

	const result = await response.json();

	if (result.error) {
		throw new Error(`MCP API 错误：${result.error.message}`);
	}

	// 解析返回的文本内容
	const content = result.result?.content?.[0]?.text;
	if (!content) {
		throw new Error("MCP 返回数据格式异常");
	}

	// 尝试解析 JSON
	try {
		return JSON.parse(content);
	} catch {
		return content;
	}
}

/**
 * 获取基金历史业绩
 */
async function getFundPerformance(
	fundCodes: string[],
): Promise<PerformanceDetail[]> {
	const result = await callMcpTool("GetBatchFundPerformance", {
		fundCodes: fundCodes,
	});

	// 返回可能是数组或单个对象
	const performances = Array.isArray(result) ? result : [result];

	return performances.map((item: any) => {
		// 解析各阶段收益率
		const performancePeriods: PerformancePeriod[] = [];

		// 处理不同格式的业绩数据
		const periods =
			item.performancePeriods || item.periods || item.stageReturns || [];
		for (const period of periods) {
			performancePeriods.push({
				period: period.period || period.name || "",
				growth_rate: period.growthRate || period.rate || period.value || 0,
				rank: period.rank,
				total_funds: period.totalFunds,
				percentile: period.percentile,
			});
		}

		// 解析年度收益
		const annualReturns: PerformancePeriod[] = [];
		const annuals =
			item.annualReturns || item.yearReturns || item.yearlyReturns || [];
		for (const annual of annuals) {
			annualReturns.push({
				period: annual.year || annual.period || "",
				growth_rate: annual.return || annual.growthRate || annual.value || 0,
				rank: annual.rank,
				total_funds: annual.totalFunds,
			});
		}

		return {
			fund_code: item.fundCode || "",
			fund_name: item.fundName || "",
			performance_periods: performancePeriods,
			annual_returns: annualReturns,
			yield_this_year: item.yieldThisYear || item.thisYearReturn || 0,
			yield_1y: item.yield1y || item.oneYearReturn || 0,
			yield_3y: item.yield3y || item.threeYearReturn || 0,
			yield_5y: item.yield5y || item.fiveYearReturn || 0,
			since_inception: item.sinceInception || item.establishedReturn || 0,
		};
	});
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
		const { codes } = await req.json();

		if (!codes) {
			return new Response(
				JSON.stringify({ success: false, error: "缺少基金代码" }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400,
				},
			);
		}

		// 支持单个代码或数组
		const fundCodes = Array.isArray(codes) ? codes : [codes];

		// 验证基金代码格式
		for (const code of fundCodes) {
			if (!/^\d{6}$/.test(code)) {
				return new Response(
					JSON.stringify({
						success: false,
						error: `基金代码格式错误：${code}（应为 6 位数字）`,
					}),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
						status: 400,
					},
				);
			}
		}

		console.log("Fund performance request:", { fundCodes });

		// 调用盈米 MCP 获取历史业绩
		const performances = await getFundPerformance(fundCodes);

		if (performances.length === 0) {
			return new Response(
				JSON.stringify({ success: false, error: "未找到业绩信息", data: null }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 404,
				},
			);
		}

		const responseData: PerformanceResponse = {
			success: true,
			data: performances.length === 1 ? performances[0] : performances,
		};

		return new Response(JSON.stringify(responseData), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		console.error("Error in fund-performance:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : "服务器内部错误",
				data: null,
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 500,
			},
		);
	}
});
