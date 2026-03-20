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

interface FundSearchResult {
	fund_code: string;
	fund_name: string;
	fund_type?: string;
	status?: string;
	setup_date?: string;
	url?: string;
}

interface SearchResponse {
	success: boolean;
	data?: FundSearchResult[];
	error?: string;
	total?: number;
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
 * 搜索基金
 */
async function searchFundsByYingmi(
	keyword: string,
	page: number = 0,
	size: number = 20,
): Promise<FundSearchResult[]> {
	const result = await callMcpTool("SearchFunds", {
		keyword: keyword,
		page: page,
		size: size,
	});

	const funds = result.funds || [];

	return funds.map((fund: any) => ({
		fund_code: fund.fundCode || "",
		fund_name: fund.fundName || "",
		fund_type: fund.fundInvestType || "",
		status: fund.status || "",
		setup_date: fund.setupDate || "",
		url: fund.url || "",
	}));
}

/**
 * 使用 GuessFundCode 进行基金代码模糊匹配
 */
async function guessFundCode(query: string): Promise<FundSearchResult[]> {
	const result = await callMcpTool("GuessFundCode", {
		fundNameOrCode: query,
	});

	const matches = result.matches || result.funds || [];

	return matches.map((match: any) => ({
		fund_code: match.fundCode || "",
		fund_name: match.fundName || "",
		fund_type: match.fundInvestType || "",
	}));
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
		const { keyword, page = 0, size = 20 } = await req.json();

		if (!keyword) {
			return new Response(
				JSON.stringify({ success: false, error: "缺少搜索关键词" }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400,
				},
			);
		}

		console.log("Fund search request:", { keyword, page, size });

		// 判断搜索类型
		const isFundCode = /^\d{6}$/.test(keyword);

		let results: FundSearchResult[];

		if (isFundCode) {
			// 精确查询：使用 GuessFundCode 匹配基金代码
			results = await guessFundCode(keyword);
		} else {
			// 模糊搜索：使用 SearchFunds 接口
			results = await searchFundsByYingmi(keyword, page, size);
		}

		if (results.length === 0) {
			return new Response(
				JSON.stringify({ success: false, error: "未找到相关基金", data: [] }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 404,
				},
			);
		}

		const searchResponse: SearchResponse = {
			success: true,
			data: results,
			total: results.length,
		};

		return new Response(JSON.stringify(searchResponse), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		console.error("Error in fund-search:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : "服务器内部错误",
				data: [],
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 500,
			},
		);
	}
});
