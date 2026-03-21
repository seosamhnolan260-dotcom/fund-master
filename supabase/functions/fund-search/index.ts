import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 盈米 MCP 配置
const YINGMI_MCP_ENDPOINT = Deno.env.get("YINGMI_MCP_ENDPOINT") || "";
const YINGMI_MCP_API_KEY = Deno.env.get("YINGMI_MCP_API_KEY") || "";

interface FundSearchResult {
  fund_code: string;
  fund_name: string;
  fund_type: string;
  company: string;
  match_score: number;
}

interface FundSearchResponse {
  success: boolean;
  matches?: FundSearchResult[];
  error?: string;
}

async function searchFund(query: string): Promise<FundSearchResult[]> {
  console.log("Searching fund with query:", query);
  
  // 调用盈米 MCP fund/search 接口
  const response = await fetch(`${YINGMI_MCP_ENDPOINT}/fund/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${YINGMI_MCP_API_KEY}`,
    },
    body: JSON.stringify({
      keyword: query,
      limit: 10,
    }),
  });
  
  if (!response.ok) {
    console.error("Yingmi MCP search failed:", response.status);
    return [];
  }
  
  const data = await response.json();
  
  // 转换数据格式
  return (data.data || []).map((item: any) => ({
    fund_code: item.fundCode || item.code,
    fund_name: item.fundName || item.name,
    fund_type: item.fundType || "未知",
    company: item.company || item.manager || "未知",
    match_score: item.score || 100,
  }));
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

    const { query } = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "请输入基金代码或名称" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // 执行搜索
    const matches = await searchFund(query.trim());

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          matches: [],
          message: "未找到匹配的基金"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 如果只有一个完全匹配，直接返回
    if (matches.length === 1 && matches[0].match_score === 100) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          matches,
          exact_match: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 返回多个匹配结果，让用户选择
    return new Response(
      JSON.stringify({ 
        success: true, 
        matches,
        exact_match: false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Fund search error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "搜索失败，请稍后重试" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
