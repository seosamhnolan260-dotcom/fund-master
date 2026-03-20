#!/bin/bash
# 基金投资大师 - 一键部署脚本
# 使用方法：./deploy.sh

set -e

echo "🚀 开始部署基金投资大师 Edge Functions"
echo "========================================"

# 配置变量
PROJECT_REF="epuswribzgubnjigpcui"
SUPABASE_URL="https://epuswribzgubnjigpcui.supabase.co"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}步骤 1/6: 检查 Supabase CLI 登录状态${NC}"
if ! supabase projects list &>/dev/null; then
    echo -e "${RED}未登录 Supabase，请先执行：supabase login${NC}"
    echo "然后重新运行此脚本"
    exit 1
fi
echo -e "${GREEN}✓ 已登录 Supabase${NC}"

echo ""
echo -e "${YELLOW}步骤 2/6: 链接项目${NC}"
supabase link --project-ref $PROJECT_REF
echo -e "${GREEN}✓ 项目已链接：$PROJECT_REF${NC}"

echo ""
echo -e "${YELLOW}步骤 3/6: 配置环境变量${NC}"

# 盈米 MCP 配置
supabase secrets set YINGMI_MCP_ENDPOINT=https://stargate.yingmi.com/mcp/v2
supabase secrets set YINGMI_MCP_API_KEY=FmSylSxtSrUGWWL3KWI47A
echo -e "${GREEN}✓ 盈米 MCP 配置已设置${NC}"

# 阿里云百炼配置
supabase secrets set QWEN_API_KEY=sk-sp-0cb0574acc0a4e47b8f184d1299dad77
supabase secrets set QWEN_BASE_URL=https://coding.dashscope.aliyuncs.com/v1
supabase secrets set QWEN_MODEL=qwen3.5-plus
echo -e "${GREEN}✓ 阿里云百炼配置已设置${NC}"

# Supabase 配置
supabase secrets set SUPABASE_URL=$SUPABASE_URL
echo -e "${GREEN}✓ Supabase URL 已设置${NC}"

echo ""
echo -e "${YELLOW}步骤 4/6: 执行数据库迁移${NC}"
supabase db push
echo -e "${GREEN}✓ 数据库迁移完成${NC}"

echo ""
echo -e "${YELLOW}步骤 5/6: 部署 Edge Functions${NC}"

FUNCTIONS=(
    "fund-search"
    "fund-nav"
    "fund-detail"
    "fund-holding"
    "fund-performance"
    "fund-info"
    "fund-analysis"
)

for func in "${FUNCTIONS[@]}"; do
    echo "部署 $func..."
    supabase functions deploy $func
    echo -e "${GREEN}✓ $func 部署完成${NC}"
done

echo ""
echo -e "${YELLOW}步骤 6/6: 验证部署${NC}"
supabase functions list
echo -e "${GREEN}✓ 所有函数已部署${NC}"

echo ""
echo "========================================"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo "函数 URL 格式："
echo "https://$PROJECT_REF.supabase.co/functions/v1/<function-name>"
echo ""
echo "示例测试："
echo "curl -X POST 'https://$PROJECT_REF.supabase.co/functions/v1/fund-search' \\"
echo "  -H 'Authorization: Bearer <anon-key>' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"code\": \"000001\"}'"
echo ""
