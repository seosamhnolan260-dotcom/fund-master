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

interface Holding {
	stock_code?: string;
	stock_name?: string;
	stock_ratio?: number;
	change_ratio?: number;
	industry?: string;
}

interface HoldingDetail {
	fund_code: string;
	fund_name: string;
	holding_date?: string;
	total_stock_ratio?: number;
	top_holdings?: Holding[];
}

interface HoldingResponse {
	success: boolean;
	data?: HoldingDetail | HoldingDetail[];
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
 * 获取基金持仓信息
 */
async function getFundHolding(fundCodes: string[]): Promise<HoldingDetail[]> {
	const result = await callMcpTool("BatchGetFundsHolding", {
		fundCodes: fundCodes,
	});

	// 返回可能是数组或单个对象
	const holdings = Array.isArray(result) ? result : [result];

	return holdings.map((item: any) => {
		// 解析重仓股信息
		const topHoldings: Holding[] = [];
		const stockList = item.stockList || item.topHoldings || item.stocks || [];

		for (const stock of stockList) {
			topHoldings.push({
				stock_code: stock.stockCode || stock.code || "",
				stock_name: stock.stockName || stock.name || "",
				stock_ratio: stock.stockRatio || stock.ratio || 0,
				change_ratio: stock.changeRatio || stock.change || 0,
				industry: stock.industry || "",
			});
		}

		return {
			fund_code: item.fundCode || "",
			fund_name: item.fundName || "",
			holding_date: item.holdingDate || item.date || "",
			total_stock_ratio: item.totalStockRatio || 0,
			top_holdings: topHoldings,
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

		console.log("Fund holding request:", { fundCodes });

		// 调用盈米 MCP 获取持仓信息
		const holdings = await getFundHolding(fundCodes);

		if (holdings.length === 0) {
			return new Response(
				JSON.stringify({ success: false, error: "未找到持仓信息", data: null }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 404,
				},
			);
		}

		const responseData: HoldingResponse = {
			success: true,
			data: holdings.length === 1 ? holdings[0] : holdings,
		};

		return new Response(JSON.stringify(responseData), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		console.error("Error in fund-holding:", error);
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
