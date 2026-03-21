/**
 * 基金研报页面 - Phase 3 完整版
 * 支持模糊搜索 + 基金选择 + 研报生成与下载
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
        <Text className="section-title">前十大重仓资产穿透</Text>
        <View className="empty-state">盈米 MCP 暂未返回持仓数据</View>
      </View>
    );
  }

  return (
    <View className="portfolio-section">
      <Text className="section-title">前十大重仓资产穿透</Text>
      {formattedStocks.map((s, i) => (
        <View key={i} className="bar-item">
          <View className="bar-info">
            <Text>{s.name}</Text>
            <Text>{s.ratio.toFixed(2)}%</Text>
          </View>
          <View className="bar-track">
            <View
              className="bar-fill"
              style={{ width: `${Math.min(s.ratio * 10, 100)}%` }}
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
    <View className="pdf-report">
      <View className="report-header">
        <Text className="tag">DEEP ALPHA AI 分析报告</Text>
      </View>
      <View className="report-content">
        <Text>{content || "正在同步盈米底层持仓归因数据..."}</Text>
      </View>
      <View className="report-footer">
        <Text>数据来源：盈米基金 MCP | 生成时间：{today}</Text>
      </View>
    </View>
  );
};

// --- 内部组件：基金选择器 ---
const FundSelector: React.FC<{
  matches: any[];
  onSelect: (code: string) => void;
  onCancel: () => void;
}> = ({ matches, onSelect, onCancel }) => {
  return (
    <View className="fund-selector">
      <Text className="selector-title">请选择基金</Text>
      {matches.map((fund) => (
        <View
          key={fund.fund_code}
          className="fund-item"
          onClick={() => onSelect(fund.fund_code)}
        >
          <Text className="fund-name">{fund.fund_name}</Text>
          <Text className="fund-code">{fund.fund_code}</Text>
          <Text className="fund-type">{fund.fund_type}</Text>
        </View>
      ))}
      <Button className="cancel-btn" onClick={onCancel}>
        取消
      </Button>
    </View>
  );
};

// --- 主页面 ---
const IndexV3: React.FC = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [searchMatches, setSearchMatches] = useState<any[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 模糊搜索基金
  const handleSearch = async () => {
    if (!query.trim()) {
      Taro.showToast({ title: "请输入基金代码或名称", icon: "none" });
      return;
    }

    setSearchLoading(true);
    setSearchQuery(query.trim());

    try {
      const res = await Taro.request({
        url: "https://fund-investment-master.seosamhnolan260.workers.dev/fund-search",
        method: "POST",
        data: { query: query.trim() },
        header: { "content-type": "application/json" },
      });

      if (res.statusCode === 200 && res.data?.success) {
        if (res.data.exact_match && res.data.matches?.length === 1) {
          // 完全匹配，直接获取详情
          selectFund(res.data.matches[0].fund_code);
        } else if (res.data.matches?.length > 0) {
          // 多个匹配，显示选择器
          setSearchMatches(res.data.matches);
          setShowSelector(true);
        } else {
          Taro.showToast({ title: "未找到匹配的基金", icon: "none" });
        }
      } else {
        throw new Error(res.data?.error || "搜索失败");
      }
    } catch (err: any) {
      console.error("Search Error:", err);
      Taro.showModal({
        title: "搜索失败",
        content: err.message || "网络拥塞，请稍后再试",
        showCancel: false,
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // 选择基金
  const selectFund = async (code: string) => {
    setShowSelector(false);
    setLoading(true);
    Taro.showLoading({ title: "AI 穿透分析中...", mask: true });

    try {
      const res = await Taro.request({
        url: "https://fund-investment-master.seosamhnolan260.workers.dev/fund-info",
        method: "POST",
        data: { code },
        header: { "content-type": "application/json" },
      });

      if (res.statusCode === 200 && res.data?.success) {
        setReportData(res.data.data);
        Taro.showToast({ title: "研报生成成功", icon: "success" });
      } else {
        throw new Error(res.data?.error || "查询失败");
      }
    } catch (err: any) {
      console.error("Fund Detail Error:", err);
      Taro.showModal({
        title: "生成失败",
        content: err.message || "网络拥塞，请稍后再试",
        showCancel: false,
      });
    } finally {
      setLoading(false);
      Taro.hideLoading();
    }
  };

  // 生成并下载详细研报
  const handleDownloadReport = async () => {
    if (!reportData?.fund_code) {
      Taro.showToast({ title: "请先查询基金", icon: "none" });
      return;
    }

    setLoading(true);
    Taro.showLoading({ title: "正在生成研报...", mask: true });

    try {
      const res = await Taro.request({
        url: "https://fund-investment-master.seosamhnolan260.workers.dev/fund-report",
        method: "POST",
        data: { fund_code: reportData.fund_code },
        header: { "content-type": "application/json" },
      });

      if (res.statusCode === 200 && res.data?.success) {
        // 下载 Markdown 文件到桌面
        const markdown = res.data.markdown;
        const fileName = `${reportData.fund_name}_${reportData.fund_code}_深度研究报告.md`;
        
        // 使用文件系统 API 保存文件
        const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`;
        const fs = Taro.getFileSystemManager();
        
        fs.writeFile({
          filePath: filePath,
          data: markdown,
          encoding: "utf-8",
          success: () => {
            Taro.showModal({
              title: "研报已生成",
              content: `研报已保存到：${filePath}\n\n您可以稍后在电脑桌面查看完整报告。`,
              showCancel: false,
            });
          },
          fail: (err) => {
            console.error("Save file error:", err);
            Taro.showToast({ title: "保存失败，请重试", icon: "none" });
          },
        });
      } else {
        throw new Error(res.data?.error || "研报生成失败");
      }
    } catch (err: any) {
      console.error("Download Report Error:", err);
      Taro.showModal({
        title: "生成失败",
        content: err.message || "网络拥塞，请稍后再试",
        showCancel: false,
      });
    } finally {
      setLoading(false);
      Taro.hideLoading();
    }
  };

  // 取消选择
  const cancelSelect = () => {
    setShowSelector(false);
    setSearchMatches([]);
  };

  return (
    <ScrollView className="page-container" scrollY>
      {/* 搜索区域 */}
      <View className="search-box">
        <Input
          className="fund-input"
          value={query}
          onInput={(e) => setQuery(e.detail.value)}
          placeholder="请输入基金代码或名称"
          type="text"
          maxlength={10}
        />
        <Button
          className="search-btn"
          onClick={handleSearch}
          disabled={searchLoading || loading}
        >
          {searchLoading ? "搜索中" : "搜索"}
        </Button>
      </View>

      {/* 基金选择器 */}
      {showSelector && (
        <FundSelector
          matches={searchMatches}
          onSelect={selectFund}
          onCancel={cancelSelect}
        />
      )}

      {/* 数据渲染区 */}
      {reportData && !loading && (
        <View className="fade-in">
          {/* 1. 基础信息：中信蓝风格 */}
          <View className="info-card">
            <Text className="name">{reportData?.fund_name || "未知基金"}</Text>
            <Text className="code">{reportData?.fund_code || ""}</Text>
            <View className="stats-grid">
              <View className="stat-item">
                <Text className="label">单位净值</Text>
                <Text className="value">{reportData?.net_value || "-"}</Text>
              </View>
              <View className="stat-item">
                <Text className="label">日涨跌幅</Text>
                <Text
                  className={`value ${parseFloat(reportData?.daily_growth_rate || reportData?.daily_growth || 0) >= 0 ? "up" : "down"}`}
                >
                  {reportData?.daily_growth || "-"}
                </Text>
              </View>
              <View className="stat-item">
                <Text className="label">规模</Text>
                <Text className="value">{reportData?.fund_scale || "-"}</Text>
              </View>
            </View>
          </View>

          {/* 2. 持仓分布：CSS 柱状图 */}
          <PortfolioBar stocks={reportData?.asset_allocation || []} />

          {/* 3. AI 分析报告：PDF 质感 */}
          <AnalysisReport
            content={reportData?.ai_analysis || "暂无 AI 分析"}
            fundName={reportData?.fund_name || "基金"}
          />

          {/* 4. 下载研报按钮 */}
          <Button
            className="download-btn"
            onClick={handleDownloadReport}
            disabled={loading}
          >
            📥 下载完整研报到桌面
          </Button>

          {/* 5. 数据来源标注 */}
          <View
            style={{
              textAlign: "center",
              fontSize: "20rpx",
              color: "#94a3b8",
              marginTop: "20rpx",
              marginBottom: "40rpx",
            }}
          >
            <Text>
              数据来源：盈米基金 MCP | {reportData?.nav_date || reportData?.data_date || "数据日期待更新"}
            </Text>
          </View>
        </View>
      )}

      {/* Loading 状态 */}
      {loading && (
        <View className="loading-wrapper">
          <Text>正在穿透资产底层并生成 AI 研报...</Text>
        </View>
      )}

      {/* 初始空状态 */}
      {!reportData && !loading && !showSelector && (
        <View className="empty-holder">
          <View className="icon-ai">🤖</View>
          <View className="text">输入基金代码或名称，AI 助你穿透底层资产</View>
          <View className="hint">支持模糊搜索，如输入"华夏"或"000001"</View>
        </View>
      )}
    </ScrollView>
  );
};

export default IndexV3;
