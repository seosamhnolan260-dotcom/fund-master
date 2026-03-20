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

interface NavHistory {
	nav_date: string;
	net_value: number;
	daily_growth_rate: number;
}

interface NavResponse {
	success: boolean;
	data?: {
		fund_code: string;
		fund_name: string;
		current_nav: number;
		nav_date: string;
		daily_growth_rate: number;
		history: NavHistory[];
	};
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

	return content;
}

/**
 * 解析盈米返回的净值数据（YAML 格式）
 */
function parseNavData(yamlText: string): {
	fundCode: string;
	navList: NavHistory[];
} {
	const lines = yamlText.split("\n");
	let fundCode = "";
	const navList: NavHistory[] = [];

	for (const line of lines) {
		// 提取基金代码
		const fundCodeMatch = line.match(/fundCode:\s*"(\d+)"/);
		if (fundCodeMatch) {
			fundCode = fundCodeMatch[1];
			continue;
		}

		// 提取净值数据行（格式：2026 年 03 月 17 日，1.063,"-2.12%"）
		const navMatch = line.match(
			/(\d+)\s+年\s+(\d+)\s+月\s+(\d+)\s+日，([\d.]+),(.+)/,
		);
		if (navMatch) {
			const [, year, month, day, nav, growthRaw] = navMatch;
			// 转换日期格式：2026 年 03 月 17 日 -> 2026-03-17
			const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

			// 清理涨跌幅：去除引号和百分号
			const growth = growthRaw.replace(/"/g, "").replace(/%/g, "");

			navList.push({
				nav_date: formattedDate,
				net_value: parseFloat(nav),
				daily_growth_rate: parseFloat(growth),
			});
		}
	}

	return { fundCode, navList };
}

/**
 * 获取基金详情
 */
async function getFundDetail(fundCode: string): Promise<any> {
	const result = await callMcpTool("BatchGetFundsDetail", {
		fundCodes: [fundCode],
	});

	// 返回第一个匹配的基金详情
	return result[0] || result;
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
		const { code, dimensionType = "oneMonth" } = await req.json();

		if (!code) {
			return new Response(
				JSON.stringify({ success: false, error: "缺少基金代码" }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400,
				},
			);
		}

		// 验证基金代码格式
		if (!/^\d{6}$/.test(code)) {
			return new Response(
				JSON.stringify({
					success: false,
					error: "基金代码格式错误（应为 6 位数字）",
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400,
				},
			);
		}

		console.log("Fund NAV request:", { code, dimensionType });

		// 1. 获取净值历史数据
		const navYamlText = await callMcpTool("BatchGetFundNavHistory", {
			fundCodes: [code],
			dimensionType: dimensionType,
			isDesc: true,
		});

		// 2. 解析 YAML 格式的净值数据
		const navData = parseNavData(navYamlText);

		// 3. 获取基金详细信息
		const fundDetail = await getFundDetail(code);

		// 构建响应数据
		const currentNav = navData.navList[0]?.net_value || 0;
		const currentNavDate = navData.navList[0]?.nav_date || "";
		const dailyGrowthRate = navData.navList[0]?.daily_growth_rate || 0;

		const responseData: NavResponse = {
			success: true,
			data: {
				fund_code: navData.fundCode || code,
				fund_name: fundDetail.fundName || fundDetail.fund_name || "",
				current_nav: currentNav,
				nav_date: currentNavDate,
				daily_growth_rate: dailyGrowthRate,
				history: navData.navList,
			},
		};

		return new Response(JSON.stringify(responseData), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		console.error("Error in fund-nav:", error);
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
