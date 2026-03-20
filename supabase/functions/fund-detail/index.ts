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

interface FundDetail {
	fund_code: string;
	fund_name: string;
	fund_type?: string;
	fund_invest_type?: string;
	setup_date?: string;
	fund_company?: string;
	fund_manager?: string;
	fund_scale?: string;
	risk_level?: string;
	min_invest_amount?: number;
	management_fee?: string;
	custody_fee?: string;
	description?: string;
	url?: string;
}

interface DetailResponse {
	success: boolean;
	data?: FundDetail;
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
 * 获取基金详情
 */
async function getFundDetail(fundCodes: string[]): Promise<FundDetail[]> {
	const result = await callMcpTool("BatchGetFundsDetail", {
		fundCodes: fundCodes,
	});

	// 返回可能是数组或单个对象
	const funds = Array.isArray(result) ? result : [result];

	return funds.map((fund: any) => ({
		fund_code: fund.fundCode || "",
		fund_name: fund.fundName || "",
		fund_type: fund.fundType || "",
		fund_invest_type: fund.fundInvestType || "",
		setup_date: fund.setupDate || "",
		fund_company: fund.fundCompany || "",
		fund_manager: fund.fundManager || "",
		fund_scale: fund.fundScale || "",
		risk_level: fund.riskLevel || "",
		min_invest_amount: fund.minInvestAmount || 0,
		management_fee: fund.managementFee || "",
		custody_fee: fund.custodyFee || "",
		description: fund.description || "",
		url: fund.url || "",
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

		console.log("Fund detail request:", { fundCodes });

		// 调用盈米 MCP 获取基金详情
		const details = await getFundDetail(fundCodes);

		if (details.length === 0) {
			return new Response(
				JSON.stringify({ success: false, error: "未找到基金信息", data: null }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 404,
				},
			);
		}

		const responseData: DetailResponse = {
			success: true,
			data: details.length === 1 ? details[0] : details,
		};

		return new Response(JSON.stringify(responseData), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		console.error("Error in fund-detail:", error);
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
