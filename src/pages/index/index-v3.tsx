/**
 * 基金研报页面 - Phase 3 优化版
 * 修复搜索问题 + 优化 UI 设计
 */

import { Button, Input, ScrollView, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type React from "react";
import { useState } from "react";
import "./index-v3.scss";

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
            <Text className="bar-name">{s.name}</Text>
            <Text className="bar-ratio">{s.ratio.toFixed(2)}%</Text>
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

// --- 主页面 ---
const IndexV3: React.FC = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const handleSearch = async () => {
    // 验证输入
    const searchCode = code.trim();
    if (!searchCode) {
      Taro.showToast({ title: "请输入基金代码或名称", icon: "none" });
      return;
    }

    setLoading(true);
    Taro.showLoading({ title: "AI 穿透分析中...", mask: true });

    try {
      // 直接使用 fund-info 接口（已验证可用）
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

  // 生成并下载详细研报
  const handleDownloadReport = async () => {
    if (!reportData?.fund_code) {
      Taro.showToast({ title: "请先查询基金", icon: "none" });
      return;
    }

    setLoading(true);
    Taro.showLoading({ title: "正在生成研报...", mask: true });

    try {
      // 调用研报生成接口
      const res = await Taro.request({
        url: "https://fund-investment-master.seosamhnolan260.workers.dev/fund-report",
        method: "POST",
        data: { fund_code: reportData.fund_code },
        header: { "content-type": "application/json" },
      });

      if (res.statusCode === 200 && res.data?.success) {
        const markdown = res.data.markdown;
        const fileName = `${reportData.fund_name}_${reportData.fund_code}_深度研究报告.md`;
        
        // 保存文件
        const fs = Taro.getFileSystemManager();
        const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`;
        
        fs.writeFile({
          filePath: filePath,
          data: markdown,
          encoding: "utf-8",
          success: () => {
            Taro.showModal({
              title: "研报已生成",
              content: `研报已保存，可在电脑桌面查看`,
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

  return (
    <ScrollView className="page-container" scrollY>
      {/* 顶部标题 */}
      <View className="page-header">
        <Text className="page-title">基金投资大师</Text>
        <Text className="page-subtitle">AI 穿透底层资产 · 生成深度研报</Text>
      </View>

      {/* 搜索区域 */}
      <View className="search-section">
        <View className="search-box">
          <Input
            className="fund-input"
            value={code}
            onInput={(e) => setCode(e.detail.value)}
            placeholder="输入基金代码或名称"
            type="text"
            maxlength={10}
          />
          <Button
            className="search-btn"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "查询中" : "查询"}
          </Button>
        </View>
        <Text className="search-hint">支持模糊搜索，如"华夏"或"000001"</Text>
      </View>

      {/* 数据渲染区 */}
      {reportData && !loading && (
        <View className="content-section fade-in">
          {/* 1. 基础信息卡片 */}
          <View className="info-card">
            <View className="card-header">
              <Text className="fund-name">{reportData?.fund_name || "未知基金"}</Text>
              <Text className="fund-code">{reportData?.fund_code || ""}</Text>
            </View>
            <View className="stats-grid">
              <View className="stat-item">
                <Text className="stat-label">单位净值</Text>
                <Text className="stat-value">{reportData?.net_value || "-"}</Text>
              </View>
              <View className="stat-item">
                <Text className="stat-label">日涨跌幅</Text>
                <Text
                  className={`stat-value ${parseFloat(reportData?.daily_growth_rate || reportData?.daily_growth || 0) >= 0 ? "up" : "down"}`}
                >
                  {reportData?.daily_growth || "-"}
                </Text>
              </View>
              <View className="stat-item">
                <Text className="stat-label">基金规模</Text>
                <Text className="stat-value">{reportData?.fund_scale || "-"}</Text>
              </View>
            </View>
          </View>

          {/* 2. 持仓分布 */}
          <PortfolioBar stocks={reportData?.asset_allocation || []} />

          {/* 3. AI 分析报告 */}
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
          <View className="data-source">
            <Text>
              数据来源：盈米基金 MCP | {reportData?.nav_date || reportData?.data_date || "数据日期待更新"}
            </Text>
          </View>
        </View>
      )}

      {/* Loading 状态 */}
      {loading && (
        <View className="loading-wrapper">
          <View className="loading-spinner"></View>
          <Text>正在穿透资产底层并生成 AI 研报...</Text>
        </View>
      )}

      {/* 初始空状态 */}
      {!reportData && !loading && (
        <View className="empty-state-section">
          <View className="empty-icon">🤖</View>
          <Text className="empty-text">输入基金代码，AI 助你穿透底层资产</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default IndexV3;
