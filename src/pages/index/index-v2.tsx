/**
 * 基金研报页面 - V3.0 专业投研版
 * 深度投研 · 合规化 · 沉浸式阅读 · 盈米 MCP 数据集成
 */

import { Button, Input, ScrollView, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type React from "react";
import { useState } from "react";
import "./index.scss";

// --- 内部组件：持仓分布条 ---
const PortfolioBar: React.FC<{ stocks: any[] }> = ({ stocks = [] }) => {
  const formattedStocks = stocks
    .map((s) => ({
      name: s.assetName || s.name || "未知",
      ratio: typeof s.ratio === "string" ? parseFloat(s.ratio) : s.ratio || 0,
    }))
    .slice(0, 10);

  if (formattedStocks.length === 0) {
    return (
      <View className="portfolio-section">
        <Text className="section-title">📊 资产配置</Text>
        <View className="empty-state">数据维护中，请稍后重试</View>
      </View>
    );
  }

  return (
    <View className="portfolio-section">
      <Text className="section-title">📊 资产配置</Text>
      {formattedStocks.map((s, i) => (
        <View key={i} className="bar-item">
          <View className="bar-info">
            <Text className="bar-name">{s.name}</Text>
            <Text className="bar-ratio">{s.ratio.toFixed(2)}%</Text>
          </View>
          <View className="bar-track">
            <View
              className="bar-fill"
              style={{ width: `${Math.min(s.ratio * 100, 100)}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

// --- 内部组件：AI 研报核心摘要 (LLM 生成) ---
const AnalysisReport: React.FC<{ aiAnalysis: string; loading?: boolean }> = ({ aiAnalysis, loading }) => {
  const today = new Date().toLocaleDateString("zh-CN");

  if (loading) {
    return (
      <View className="ai-report">
        <View className="report-header">
          <Text className="report-tag">🤖 AI 投研报告</Text>
        </View>
        <View className="report-content">
          <Text>正在调用 AI 分析师进行深度投研...</Text>
          <Text style={{ fontSize: '13px', color: '#86868B', marginTop: '12px' }}>
            预计需要 10-15 秒
          </Text>
        </View>
      </View>
    );
  }

  if (!aiAnalysis) {
    return (
      <View className="ai-report">
        <View className="report-header">
          <Text className="report-tag">🤖 AI 投研报告</Text>
        </View>
        <View className="report-content">
          <Text>点击"下载完整研报"生成 AI 深度分析</Text>
          <Text style={{ fontSize: '13px', color: '#86868B', marginTop: '12px' }}>
            基于盈米 MCP 数据 + 阿里云百炼大模型
          </Text>
        </View>
      </View>
    );
  }

  // 简单解析 Markdown 的第一行作为标题
  const firstLine = aiAnalysis.split('\n')[0] || 'AI 投研报告';

  return (
    <View className="ai-report">
      <View className="report-header">
        <Text className="report-tag">🤖 AI 投研报告</Text>
      </View>
      <View className="report-content">
        <Text style={{ fontSize: '16px', fontWeight: '700', color: '#003371', marginBottom: '16px' }}>
          {firstLine.replace(/^#*\s*/, '')}
        </Text>
        <Text style={{ fontSize: '14px', lineHeight: '1.7', color: '#1D1D1F' }}>
          {aiAnalysis.substring(0, 300)}...
        </Text>
        <Text style={{ fontSize: '13px', color: '#007AFF', marginTop: '12px', fontWeight: '600' }}>
          👉 点击下方按钮下载完整研报
        </Text>
      </View>
      <View className="report-footer">
        <Text>数据来源：盈米 MCP | AI 模型：阿里云百炼 | {today}</Text>
      </View>
    </View>
  );
};

// --- 主页面 ---
const IndexV2: React.FC = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingStage, setLoadingStage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const handleSearch = async () => {
    const searchCode = code.trim();
    if (!searchCode) {
      Taro.showToast({ title: "请输入基金代码或名称", icon: "none" });
      return;
    }

    setLoading(true);
    setLoadingStage("正在获取盈米 MCP 实时数据...");
    Taro.showLoading({ title: "数据获取中...", mask: true });

    try {
      // 阶段 1: 获取基础数据
      const res = await Taro.request({
        url: "https://fund-investment-master.seosamhnolan260.workers.dev/fund-info",
        method: "POST",
        data: { code: searchCode },
        header: { "content-type": "application/json" },
      });

      console.log("API Response:", res);

      if (res.statusCode === 200 && res.data?.success) {
        setLoadingStage("正在进行投资组合归因分析...");
        setAiLoading(true);
        
        const fundData = res.data.data;
        
        // 调试日志：确认数据到达前端
        console.log("===== 基金数据到达前端 =====");
        console.log("基金名称:", fundData.fund_name);
        console.log("基金代码:", fundData.fund_code);
        console.log("==========================");
        
        setReportData(fundData);
        
        // 调用后端 LLM API 生成 AI 分析
        console.log("步骤 2: 调用 LLM 生成深度分析...");
        setLoadingStage("AI 正在穿透底层资产...");
        
        try {
          const aiRes = await Taro.request({
            url: "https://fund-investment-master.seosamhnolan260.workers.dev/fund-report",
            method: "POST",
            data: { fund_code: fundData.fund_code },
            header: { "content-type": "application/json" },
          });
          
          console.log("LLM API 响应:", aiRes);
          
          if (aiRes.statusCode === 200 && aiRes.data?.success) {
            setAiAnalysis(aiRes.data.ai_analysis || "");
            console.log("AI 分析生成成功，长度:", aiRes.data.ai_analysis?.length);
          }
        } catch (aiErr) {
          console.error("AI 分析生成失败:", aiErr);
        } finally {
          setAiLoading(false);
        }
        
        Taro.showToast({ title: "研报生成成功", icon: "success" });
      } else {
        const errorMsg = res.data?.error || "未找到该基金，请检查代码是否正确";
        Taro.showModal({
          title: "查询失败",
          content: errorMsg,
          showCancel: false,
        });
      }
    } catch (err: any) {
      console.error("Search Error:", err);
      Taro.showModal({
        title: "网络错误",
        content: "请稍后重试或检查网络连接",
        showCancel: false,
      });
    } finally {
      setLoading(false);
      setLoadingStage("");
      Taro.hideLoading();
    }
  };

  // 生成完整版研报（专业投研模板）
  const generateFullReport = (data: any): string => {
    const today = new Date().toLocaleDateString("zh-CN");
    const nextUpdate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("zh-CN");
    
    // 估值分析话术
    const valuationComment = (() => {
      const pe = parseFloat(data?.pe_ratio) || 0;
      const pePercentile = parseFloat(data?.pe_percentile) || 50;
      
      if (pePercentile < 20) {
        return "当前估值处于历史低位，具备较好配置价值，建议重点关注。";
      } else if (pePercentile < 50) {
        return "当前估值处于合理区间，适合定投布局。";
      } else if (pePercentile < 80) {
        return "当前估值处于历史中高位，建议谨慎配置。";
      } else {
        return "当前估值处于历史高位，建议等待回调机会。";
      }
    })();
    
    // 投资评级
    const rating = (() => {
      const pePercentile = parseFloat(data?.pe_percentile) || 50;
      const return1Year = parseFloat(data?.return_1year) || 0;
      
      if (pePercentile < 30 && return1Year > 10) return "强烈推荐";
      if (pePercentile < 50 && return1Year > 5) return "推荐";
      if (pePercentile < 70) return "中性";
      return "谨慎";
    })();
    
    return `# 基金深度研究报告

**报告日期：** ${today}  
**研究员：** AI 基金分析师  
**执业编号：** S123456789（模拟）  
**基金代码：** ${data.fund_code || "-"}  
**基金名称：** ${data.fund_name || "-"}  

---

## 一、核心摘要

**投资评级：** ${rating}  
**风险等级：** ${data.risk_level || "R3"}  
**适合人群：** ${data.fund_type === "股票型" ? "进取型投资者" : "稳健型投资者"}

${data.fund_name || "该基金"}在${data.fund_type || "同类基金"}中表现${parseFloat(data?.return_1year || "0") > 10 ? "优异" : "良好"}，近一年收益${data.return_1year || "数据暂缺"}，成立以来收益${data.return_since_setup || "数据暂缺"}。基金经理${data.fund_manager || "未知"}从业${data.manager_experience || "未知"}年，投资风格${data.manager_style || "稳健"}。

**核心观点：**
- ✅ ${valuationComment}
- ✅ 资产配置${parseFloat(data?.asset_allocation?.[0]?.ratio || 0) > 80 ? "集中" : "分散"}，主要投向${data.industry_allocation?.[0]?.name || "多个行业"}
- ⚠️ 需关注${data.risk_level === "R4" || data.risk_level === "R5" ? "市场波动风险" : "流动性风险"}

---

## 二、基金基本信息

| 项目 | 内容 |
|------|------|
| 基金代码 | ${data.fund_code || "-"} |
| 基金名称 | ${data.fund_name || "-"} |
| 基金类型 | ${data.fund_type || "-"} |
| 成立日期 | ${data.established_date || "-"} |
| 基金规模 | ${data.fund_scale || "-"} |
| 单位净值 | ${data.net_value || "-"} (${data.nav_date || "-"}) |
| 日涨跌幅 | ${data.daily_growth || "-"} |
| 基金经理 | ${data.fund_manager || "-"} |
| 管理费率 | ${data.management_fee || "-"} |
| 托管费率 | ${data.custody_fee || "-"} |

---

## 三、业绩表现分析

### 3.1 收益率表现

| 时间段 | 基金收益率 | 同类平均 | 排名 |
|--------|------------|----------|------|
| 近 1 月 | ${data.return_1month || "-"} | - | - |
| 近 3 月 | ${data.return_3month || "-"} | - | - |
| 近 6 月 | ${data.return_6month || "-"} | - | - |
| 近 1 年 | ${data.return_1year || "-"} | - | - |
| 近 3 年 | ${data.return_3year || "-"} | - | - |
| 成立以来 | ${data.return_since_setup || "-"} | - | - |

### 3.2 业绩归因

**Alpha 收益：** 数据暂缺（需盈米 MCP 支持）  
**Beta 收益：** 数据暂缺（需盈米 MCP 支持）  

*注：Alpha 收益代表基金经理超额收益能力，Beta 收益代表市场波动贡献*

---

## 四、资产配置分析

### 4.1 当前资产配置（截至${data.nav_date || "最新"}）

| 资产类别 | 持仓比例 | 较上期变化 |
|----------|----------|------------|
${(data.asset_allocation || []).map((item: any) => `| ${item.name || item.assetName || "-"} | ${typeof item.ratio === 'string' ? item.ratio : (item.ratio * 100).toFixed(2) + '%'} | - |`).join("\n") || "| 股票 | 数据暂缺 | - |\n| 债券 | 数据暂缺 | - |\n| 现金 | 数据暂缺 | - |"}

### 4.2 配置特点

${parseFloat(data?.asset_allocation?.[0]?.ratio || 0) > 80 ? "基金仓位较高，显示基金经理对市场持乐观态度。" : "基金仓位适中，保持一定灵活性。"}

---

## 五、行业配置深度画像

### 5.1 行业分布

| 行业 | 配置比例 | 超配/低配 |
|------|----------|-----------|
${(data.industry_allocation || []).map((item: any) => `| ${item.name || "-"} | ${typeof item.ratio === 'string' ? item.ratio : (item.ratio * 100).toFixed(2) + '%'} | - |`).join("\n") || "| 数据暂缺 | 数据暂缺 | - |"}

### 5.2 行业偏向

**风格分析：**
- ${data.industry_allocation?.[0]?.name?.includes("科技") ? "成长风格显著，重点配置科技行业。" : "行业配置均衡，无明显风格偏向。"}
- ${data.industry_allocation?.length || 0 > 5 ? "行业分散度较高，抗风险能力强。" : "行业集中度较高，波动可能较大。"}

---

## 六、重仓股分析

### 6.1 前十大重仓股（截至${data.nav_date || "最新"}）

| 序号 | 代码 | 名称 | 持仓比例 | 行业 |
|------|------|------|----------|------|
${(data.top_stocks || []).map((stock: any, i: number) => `| ${i+1} | ${stock.code || stock.assetCode || "-"} | ${stock.name || stock.assetName || "-"} | ${typeof stock.ratio === 'string' ? stock.ratio : (stock.ratio * 100).toFixed(2) + '%'} | ${stock.industry || "-"} |`).join("\n") || "| 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 | 数据暂缺 |"}

### 6.2 重仓股特点

**集中度：** 前十大重仓股合计占比${"数据暂缺"}，集中度${"中等"}。  
**估值匹配度：** ${valuationComment}

---

## 七、基金经理风格评测

| 指标 | 内容 |
|------|------|
| 姓名 | ${data.fund_manager || "-"} |
| 任职日期 | ${data.manager_tenure || "-"} |
| 从业年限 | ${data.manager_experience || "-"} |
| 管理基金数 | ${data.manager_funds_count || "-"} |
| 投资风格 | ${data.manager_style || "稳健"} |
| 代表作品 | ${data.manager_representative_fund || "-"} |

**风格评价：**
${data.manager_experience && parseInt(data.manager_experience) > 5 ? "基金经理从业经验丰富，穿越过多轮牛熊周期。" : "基金经理从业时间较短，需持续关注。"}

---

## 八、风险分析

### 8.1 风险指标

| 指标 | 数值 | 同类平均 | 评价 |
|------|------|----------|------|
| 夏普比率 | ${data.sharpe_ratio || "-"} | - | - |
| 最大回撤 | ${data.max_drawdown || "-"} | - | - |
| 波动率 | ${data.volatility || "-"} | - | - |

### 8.2 风险提示

1. **市场风险**：股市波动可能导致基金净值下跌
2. **流动性风险**：大额赎回可能影响基金运作
3. **管理风险**：基金经理变更可能影响投资策略
4. **政策风险**：宏观政策变化可能影响基金表现

---

## 九、估值与盈利匹配度

**当前 PE：** ${data.pe_ratio || "数据暂缺"}  
**PE 历史分位：** ${data.pe_percentile || "数据暂缺"}  

**分析：** ${valuationComment}

---

## 十、投资建议

### 10.1 投资评级

| 评级维度 | 评级 |
|----------|------|
| 基金经理 | ⭐⭐⭐⭐ |
| 投资业绩 | ⭐⭐⭐⭐ |
| 风险控制 | ⭐⭐⭐ |
| 费率水平 | ⭐⭐⭐⭐ |
| **综合评级** | **⭐⭐⭐⭐** |

### 10.2 配置建议

| 投资维度 | 建议 | 理由 |
|----------|------|------|
| 短期（1-3 月） | 中性 | 市场波动较大，建议观望 |
| 中期（3-12 月） | 推荐 | 估值合理，具备配置价值 |
| 长期（1 年以上） | 推荐 | 长期持有分享经济增长红利 |

**建议配置比例：** 10%-20%（占权益资产）  
**建仓方式：** 定投  
**止盈建议：** 收益率达到 20% 时可考虑部分止盈  
**止损建议：** 回撤超过 15% 时考虑调整

---

## 十一、重要声明

**免责声明：**
1. 本报告基于公开信息编制，仅供参考，不构成投资建议
2. 基金有风险，投资需谨慎
3. 过往业绩不代表未来表现
4. 投资者应仔细阅读基金合同、招募说明书等法律文件
5. 市场有风险，投资需谨慎。本报告中的信息或意见不构成对任何人的投资建议

**数据来源：**
- 盈米基金 MCP
- 基金定期报告
- 基金公司官网

---

**报告完成日期：** ${today}  
**下次更新：** ${nextUpdate}  
**执业编号：** S123456789（模拟）  

---

*本报告由 AI 基金分析师自动生成 · 数据来源：盈米基金 MCP · 仅供参考，不构成投资建议*
`;
  };

  // 下载研报
  const handleDownloadReport = async () => {
    if (!reportData?.fund_code) {
      Taro.showToast({ title: "请先查询基金", icon: "none" });
      return;
    }

    setLoading(true);
    Taro.showLoading({ title: "正在生成研报...", mask: true });

    try {
      const markdown = generateFullReport(reportData);
      const fileName = `${reportData.fund_name}_${reportData.fund_code}_深度研究报告.md`;
      
      const fs = Taro.getFileSystemManager();
      const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath: filePath,
        data: markdown,
        encoding: "utf-8",
        success: () => {
          Taro.showModal({
            title: "✅ 研报已生成",
            content: `研报已保存到：${filePath}\n\n请在电脑桌面查看完整报告。`,
            showCancel: false,
          });
        },
        fail: (err) => {
          console.error("Save file error:", err);
          Taro.showModal({
            title: "❌ 保存失败",
            content: "请稍后重试",
            showCancel: false,
          });
        },
      });
    } catch (err: any) {
      console.error("Download Report Error:", err);
      Taro.showModal({
        title: "❌ 生成失败",
        content: err.message || "网络拥塞，请稍后再试",
        showCancel: false,
      });
    } finally {
      setLoading(false);
      Taro.hideLoading();
    }
  };

  return (
    <ScrollView className="page-container" scrollY>
      {/* 版本标识横幅 */}
      <View className="version-banner">
        🎉 V3.0 专业投研版 · 深度数据分析 · 合规化研报
      </View>

      {/* 主容器 - 双栏弹性布局 */}
      <View className="main-container">
        {/* 左侧边栏 - 搜索 */}
        <View className="sidebar-left">
          <Text className="sidebar-title">🔍 基金搜索</Text>
          
          <View className="search-box">
            <Input
              className="fund-input"
              value={code}
              onInput={(e) => setCode(e.detail.value)}
              placeholder="基金代码/名称"
              type="text"
              maxlength={10}
            />
            <Button className="search-btn" onClick={handleSearch} disabled={loading}>
              {loading ? "查询" : "查询"}
            </Button>
          </View>
          <Text className="search-hint">支持模糊搜索</Text>
          
          {/* 加载进度提示 */}
          {loadingStage && (
            <View style={{ marginTop: '16px', padding: '12px', background: '#F5F5F7', borderRadius: '8px' }}>
              <Text style={{ fontSize: '12px', color: '#6E6E73' }}>{loadingStage}</Text>
            </View>
          )}
          
          {/* 最近查询列表 */}
          <View className="fund-list">
            <Text className="fund-list-title">最近查询</Text>
            {/* 这里可以添加最近查询的历史记录 */}
          </View>
        </View>

        {/* 中间主内容区 */}
        <View className="main-content">
          {reportData && !loading ? (
            <View className="fade-in">
              {/* 基金信息卡片 */}
              <View className="info-card">
                <View className="card-header">
                  <View>
                    <Text className="fund-title">{reportData?.fund_name || "未知基金"}</Text>
                    <Text className="fund-subtitle">{reportData?.fund_code || ""} · {reportData?.fund_type || "-"} · {reportData?.risk_level || "R3"}</Text>
                  </View>
                  <View className="fund-badge">⭐ 五星</View>
                </View>
                
                <View className="stats-grid">
                  <View className="stat-item">
                    <Text className="stat-label">单位净值</Text>
                    <Text className="stat-value-large">{reportData?.net_value || "-"}</Text>
                  </View>
                  <View className="stat-item">
                    <Text className="stat-label">日涨跌幅</Text>
                    <Text className={`stat-value-large ${parseFloat(reportData?.daily_growth_rate || reportData?.daily_growth || 0) >= 0 ? "up" : "down"}`}>
                      {reportData?.daily_growth || "-"}
                    </Text>
                  </View>
                  <View className="stat-item">
                    <Text className="stat-label">基金规模</Text>
                    <Text className="stat-value-large">{reportData?.fund_scale || "-"}</Text>
                  </View>
                </View>
              </View>

              {/* 持仓分布 */}
              <PortfolioBar stocks={reportData?.asset_allocation || []} />

              {/* AI 研报核心摘要 (LLM 生成) */}
              <AnalysisReport aiAnalysis={aiAnalysis} loading={aiLoading} />

              {/* 下载按钮 */}
              <Button 
                className="download-btn" 
                onClick={handleDownloadReport} 
                disabled={loading || aiLoading}
              >
                {aiLoading ? "AI 分析中..." : "📥 下载完整研报到桌面"}
              </Button>

              {/* 数据源标注 */}
              <View className="data-source">
                <Text>数据来源：盈米 MCP | {reportData?.nav_date || reportData?.data_date || "数据日期待更新"}</Text>
              </View>
            </View>
          ) : (
            /* 空状态 */}
            <View className="empty-state-section">
              <Text className="empty-icon">🤖</Text>
              <Text className="empty-text">输入基金代码，AI 助你穿透底层资产</Text>
              <Text className="empty-hint">支持模糊搜索，如"华夏"或"000001"</Text>
            </View>
          )}
        </View>

        {/* 右侧边栏 - 操作与详情 */}
        <View className="sidebar-right">
          <View className="action-card">
            <Text className="action-title">快速操作</Text>
            <Button className="action-btn primary">📊 历史净值</Button>
            <Button className="action-btn">📈 业绩对比</Button>
            <Button className="action-btn">🔔 设置提醒</Button>
            <Button className="action-btn">📤 分享</Button>
          </View>
          
          {reportData && (
            <View className="action-card">
              <Text className="action-title">基金详情</Text>
              <View className="info-list">
                <View className="info-item">
                  <Text className="info-label">成立日期</Text>
                  <Text className="info-value">{reportData?.established_date || "-"}</Text>
                </View>
                <View className="info-item">
                  <Text className="info-label">管理人</Text>
                  <Text className="info-value">{reportData?.company || "-"}</Text>
                </View>
                <View className="info-item">
                  <Text className="info-label">托管人</Text>
                  <Text className="info-value">{reportData?.custodian || "-"}</Text>
                </View>
                <View className="info-item">
                  <Text className="info-label">管理费</Text>
                  <Text className="info-value">{reportData?.management_fee || "-"}</Text>
                </View>
                <View className="info-item">
                  <Text className="info-label">托管费</Text>
                  <Text className="info-value">{reportData?.custody_fee || "-"}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Loading 状态 */}
      {loading && (
        <View className="loading-wrapper">
          <View className="loading-spinner" />
          <Text>{loadingStage || "正在穿透资产底层并生成 AI 研报..."}</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default IndexV2;
