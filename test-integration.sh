#!/bin/bash
# 基金投资大师 - 联调测试脚本
# 用途：测试后端 API 接口 (在 Supabase 部署后使用)

# 配置 (请替换为实际的 Supabase 配置)
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_ANON_KEY="YOUR_ANON_KEY"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "  基金投资大师 - 联调测试脚本"
echo "======================================"
echo ""

# 测试 1: 基金代码精确查询
echo -e "${YELLOW}[测试 1] 基金代码精确查询 (000001)${NC}"
echo "请求：POST /functions/v1/fund-info"
echo "参数：{\"code\": \"000001\"}"
echo ""

RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/fund-info" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"code": "000001"}')

echo "响应:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 测试 1 通过${NC}"
else
  echo -e "${RED}✗ 测试 1 失败${NC}"
fi
echo ""
echo "--------------------------------------"
echo ""

# 测试 2: 基金名称模糊搜索
echo -e "${YELLOW}[测试 2] 基金名称模糊搜索 (易方达)${NC}"
echo "请求：POST /functions/v1/fund-info"
echo "参数：{\"code\": \"易方达\"}"
echo ""

RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/fund-info" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"code": "易方达"}')

echo "响应:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 测试 2 通过${NC}"
else
  echo -e "${RED}✗ 测试 2 失败${NC}"
fi
echo ""
echo "--------------------------------------"
echo ""

# 测试 3: 拼音缩写搜索
echo -e "${YELLOW}[测试 3] 拼音缩写搜索 (YFD)${NC}"
echo "请求：POST /functions/v1/fund-info"
echo "参数：{\"code\": \"YFD\"}"
echo ""

RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/fund-info" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"code": "YFD"}')

echo "响应:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 测试 3 通过${NC}"
else
  echo -e "${RED}✗ 测试 3 失败${NC}"
fi
echo ""
echo "--------------------------------------"
echo ""

# 测试 4: AI 报告生成 (SSE 流式)
echo -e "${YELLOW}[测试 4] AI 报告生成 (SSE 流式)${NC}"
echo "请求：POST /functions/v1/fund-analysis"
echo "参数：基金信息 JSON"
echo ""
echo "响应 (前 50 行):"

curl -s -X POST "${SUPABASE_URL}/functions/v1/fund-analysis" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "fundInfo": {
      "fund_code": "000001",
      "fund_name": "易方达蓝筹精选混合",
      "net_value": 1.2345,
      "daily_growth_rate": 1.02,
      "fund_type": "混合型",
      "fund_scale": 50.5,
      "fund_manager": "张坤"
    }
  }' | head -50

echo ""
echo -e "${GREEN}✓ 测试 4 完成 (SSE 流式输出)${NC}"
echo ""
echo "--------------------------------------"
echo ""

# 测试 5: 错误处理 (无效基金代码)
echo -e "${YELLOW}[测试 5] 错误处理 (无效基金代码)${NC}"
echo "请求：POST /functions/v1/fund-info"
echo "参数：{\"code\": \"999999\"}"
echo ""

RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/fund-info" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"code": "999999"}')

echo "响应:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":false'; then
  echo -e "${GREEN}✓ 测试 5 通过 (错误处理正常)${NC}"
else
  echo -e "${YELLOW}⚠ 测试 5 警告 (应返回错误响应)${NC}"
fi
echo ""
echo "--------------------------------------"
echo ""

echo "======================================"
echo "  联调测试完成"
echo "======================================"
echo ""
echo "下一步:"
echo "1. 检查所有测试是否通过"
echo "2. 如有失败，查看后端日志"
echo "3. 前端启动开发服务器：pnpm run dev:h5"
echo "4. 在浏览器中测试完整流程"
echo ""
