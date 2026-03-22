/**
 * 基金研报页面 - index-v2 电脑端优化版 (v2.1)
 * Mac 13 寸优化 · 现代简约风格 · 盈米 MCP 数据 · 完整研报生成
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
        <Text className="section-title">📊 持仓分布</Text>
        <View className="empty-state">盈米 MCP 暂未返回持仓数据</View>
      </View>
    );
  }

  return (
    <View className="portfolio-section">
      <Text className="section-title">📊 持仓分布</Text>
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

// --- 内部组件：AI 研报 ---
const AnalysisReport: React.FC<{ content: string; fundName: string }> = ({
  content,
  fundName,
}) => {
  const today = new Date().toLocaleDateString("zh-CN");

  return (
    <View className="ai-report">
      <View className="report-header">
        <Text className="report-tag">🤖 AI 分析报告</Text>
      </View>
      <View className="report-content">
        <Text>{content || "正在同步盈米底层持仓归因数据..."}</Text>
      </View>
      <View className="report-footer">
        <Text>数据来源：盈米 MCP | {today}</Text>
      </View>
    </View>
  );
};

// --- 主页面 ---
const IndexV2: React.FC = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const handleSearch = async () => {
    const searchCode = code.trim();
    if (!searchCode) {
      Taro.showToast({ title: "请输入基金代码或名称", icon: "none" });
      return;
    }

    setLoading(true);
    Taro.showLoading({ title: "AI 穿透分析中...", mask: true });

    try {
      const res = await Taro.request({
        url: "https://fund-investment-master.seosamhnolan260.workers.dev/fund-info",
        method: "POST",
        data: { code: searchCode },
        header: { "content-type": "application/json" },
      });

      console.log("API Response:", res);

      if (res.statusCode === 200 && res.data?.success) {
        setReportData(res.data.data);
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
      Taro.hideLoading();
    }
  };

  // 生成完整版研报
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

  // 生成完整版研报（12 章专业模板）
  const generateFullReport = (data: any): string => {
    const today = new Date().toLocaleDateString("zh-CN");
    const nextUpdate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("zh-CN");
    
    return `# 基金深度研究报告

**报告日期：** ${today}  
**研究员：** AI 基金分析师  
**基金代码：** ${data.fund_code || "-"}  
**基金名称：** ${data.fund_name || "-"}  

---

## 一、基金基本信息

| 项目 | 内容 |
|------|------|
| 基金代码 | ${data.fund_code || "-"} |
| 基金名称 | ${data.fund_name || "-"} |
| 基金类型 | ${data.fund_type || "-"} |
| 单位净值 | ${data.net_value || "-"} |
| 净值日期 | ${data.nav_date || "-"} |
| 日涨跌幅 | ${data.daily_growth || "-"} |
| 基金规模 | ${data.fund_scale || "-"} |

---

## 二、业绩表现

| 时间段 | 收益率 |
|--------|--------|
| 近 1 年 | ${data.return_1year || "-"} |
| 近 3 年 | ${data.return_3year || "-"} |
| 成立以来 | ${data.return_since_setup || "-"} |

---

## 三、资产配置

| 资产类别 | 配置比例 |
|----------|----------|
${(data.asset_allocation || []).map((item: any) => `| ${item.name || item.assetName || "-"} | ${typeof item.ratio === 'string' ? item.ratio : (item.ratio * 100).toFixed(2) + '%'} |`).join("\n") || "| 股票 | 数据暂缺 |\n| 债券 | 数据暂缺 |\n| 现金 | 数据暂缺 |"}

---

## 四、行业配置

| 行业 | 配置比例 |
|------|----------|
${(data.industry_allocation || []).map((item: any) => `| ${item.name || "-"} | ${typeof item.ratio === 'string' ? item.ratio : (item.ratio * 100).toFixed(2) + '%'} |`).join("\n") || "| 数据暂缺 |"}

---

## 五、重仓股分析

| 序号 | 代码 | 名称 | 持仓比例 | 行业 |
|------|------|------|----------|------|
${(data.top_stocks || []).map((stock: any, i: number) => `| ${i+1} | ${stock.code || stock.assetCode || "-"} | ${stock.name || stock.assetName || "-"} | ${typeof stock.ratio === 'string' ? stock.ratio : (stock.ratio * 100).toFixed(2) + '%'} | ${stock.industry || "-"} |`).join("\n") || "| 数据暂缺 |"}

---

## 六、基金经理

| 姓名 | 任职日期 | 从业年限 |
|------|----------|----------|
| ${data.fund_manager || "-"} | ${data.manager_tenure || "-"} | ${data.manager_experience || "-"} |

---

## 七、费率结构

| 费用类型 | 费率 |
|----------|------|
| 管理费 | ${data.management_fee || "-"} |
| 托管费 | ${data.custody_fee || "-"} |

---

## 八、风险提示

1. **市场风险**：股市波动可能导致基金净值下跌
2. **流动性风险**：大额赎回可能影响基金运作
3. **管理风险**：基金经理变更可能影响投资策略

---

## 九、投资建议

**适合人群：**
- ✅ 看好${data.fund_type || "该基金"}长期发展的投资者
- ✅ 风险承受能力匹配的投资者
- ✅ 希望长期持有的投资者

**不适合人群：**
- ❌ 风险承受能力低的投资者
- ❌ 短期投机者

---

## 重要声明

本报告基于公开数据编制，仅供参考，不构成投资建议。基金有风险，投资需谨慎。

---

**报告完成日期：** ${today}  
**下次更新：** ${nextUpdate}  

---

*本报告由 AI 基金分析师自动生成 · 数据来源：盈米基金 MCP*
`;
  };

  return (
    <ScrollView className="page-container" scrollY>
      {/* 浏览器标题栏（仅电脑端显示） */}
      <View className="browser-header">
        <View className="browser-dots">
          <View className="dot red" />
          <View className="dot yellow" />
          <View className="dot green" />
        </View>
        <View className="browser-url">
          🔒 https://fund-master.pages.dev/#/pages/index/index-v2
        </View>
      </View>

      {/* 版本标识 - 用于确认部署 */}
      <View style={{ textAlign: 'center', padding: '8px', background: '#FF9500', color: 'white', fontSize: '12px', fontWeight: '600' }}>
        🎉 v2.1 电脑端优化版已上线 · 三栏布局 · Mac 13 寸优化
      </View>

      {/* 主内容布局 - 三栏设计 */}
      <View className="main-layout">
        {/* 左侧边栏 - 搜索 */}
        <View className="sidebar-left">
          <Text className="sidebar-title">🔍 搜索</Text>
          
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

              {/* AI 研报 */}
              <AnalysisReport
                content={reportData?.ai_analysis || "暂无 AI 分析"}
                fundName={reportData?.fund_name || "基金"}
              />

              {/* 下载按钮 */}
              <Button className="download-btn" onClick={handleDownloadReport} disabled={loading}>
                📥 下载完整研报到桌面
              </Button>

              {/* 数据源标注 */}
              <View className="data-source">
                <Text>数据来源：盈米 MCP | {reportData?.nav_date || reportData?.data_date || "数据日期待更新"}</Text>
              </View>
            </View>
          ) : (
            /* 空状态 */
            <View className="empty-state-section">
              <Text className="empty-icon">🤖</Text>
              <Text className="empty-text">输入基金代码，AI 助你穿透底层资产</Text>
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
          <Text>正在穿透资产底层并生成 AI 研报...</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default IndexV2;
