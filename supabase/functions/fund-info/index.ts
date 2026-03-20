import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

// 盈米 MCP 配置
const _YINGMI_MCP_ENDPOINT = Deno.env.get("YINGMI_MCP_ENDPOINT") || "";
const _YINGMI_MCP_API_KEY = Deno.env.get("YINGMI_MCP_API_KEY") || "";

// Supabase 配置
const _supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const _supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface FundInfo {
	fund_code: string;
	fund_name: string;
	net_value: number;
	nav_date: string;
	daily_growth: number;
	daily_growth_rate: number;
	accumulated_nav: number;
	fund_type: string;
	fund_established: string;
	fund_scale: number;
	fund_manager: string;
}

interface FundSearchResult {
	fund_code: string;
	fund_name: string;
}

interface Response {
	success: boolean;
	data?: FundInfo;
	error?: string;
	multiple?: boolean;
	matches?: FundSearchResult[];
}

async function searchFund(query: string): Promise<FundSearchResult[]> {
	// TODO: 对接盈米 MCP fund/search 接口
	// 当前为模拟实现
	console.log("Searching fund:", query);

	// 模拟数据
	return [
		{ fund_code: "000001", fund_name: "华夏成长混合" },
		{ fund_code: "000002", fund_name: "华夏回报混合" },
	];
}

async function getFundDetail(code: string): Promise<FundInfo | null> {
	// TODO: 对接盈米 MCP fund/detail 接口
	// 当前为模拟实现
	console.log("Getting fund detail:", code);

	// 模拟数据
	return {
		fund_code: code,
		fund_name: "华夏成长混合",
		net_value: 1.2345,
		nav_date: "2026-03-17",
		daily_growth: 0.0123,
		daily_growth_rate: 1.02,
		accumulated_nav: 2.3456,
		fund_type: "混合型",
		fund_established: "2002-12-01",
		fund_scale: 50.5,
		fund_manager: "张三",
	};
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
		const { code } = await req.json();

		if (!code) {
			return new Response(
				JSON.stringify({ success: false, error: "缺少基金代码或名称参数" }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400,
				},
			);
		}

		console.log("Fund info request:", code);

		// 检查是否为基金代码（6 位数字）
		const isFundCode = /^\d{6}$/.test(code);

		if (isFundCode) {
			// 精确查询
			const fundDetail = await getFundDetail(code);

			if (!fundDetail) {
				return new Response(
					JSON.stringify({ success: false, error: "未找到该基金" }),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
						status: 404,
					},
				);
			}

			return new Response(JSON.stringify({ success: true, data: fundDetail }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});
		} else {
			// 模糊搜索
			const matches = await searchFund(code);

			if (matches.length === 0) {
				return new Response(
					JSON.stringify({ success: false, error: "未找到相关基金" }),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
						status: 404,
					},
				);
			}

			if (matches.length === 1) {
				// 只有一个匹配，直接返回详情
				const fundDetail = await getFundDetail(matches[0].fund_code);
				return new Response(
					JSON.stringify({ success: true, data: fundDetail }),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
						status: 200,
					},
				);
			} else {
				// 多个匹配，返回列表
				return new Response(
					JSON.stringify({
						success: true,
						multiple: true,
						matches: matches,
					}),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
						status: 200,
					},
				);
			}
		}
	} catch (error) {
		console.error("Error in fund-info:", error);
		return new Response(
			JSON.stringify({ success: false, error: "服务器内部错误" }),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 500,
			},
		);
	}
});
