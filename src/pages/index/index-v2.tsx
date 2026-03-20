/**
 * 基金研报页面 - Phase 2 完整版
 * 集成中信蓝配色 + 雷达加载 + 持仓图表 + AI 研报
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

// --- 主页面 ---
const IndexV2: React.FC = () => {
	const [code, setCode] = useState("000011");
	const [loading, setLoading] = useState(false);
	const [reportData, setReportData] = useState<any>(null);

	const handleSearch = async () => {
		if (!/^\d{6}$/.test(code)) {
			Taro.showToast({ title: "请输入 6 位基金代码", icon: "none" });
			return;
		}

		setLoading(true);
		Taro.showLoading({ title: "AI 穿透分析中...", mask: true });

		try {
			// 调用 Worker API
			const res = await Taro.request({
				url: "https://fund-investment-master.seosamhnolan260.workers.dev/fund-info",
				method: "POST",
				data: { code },
				header: { "content-type": "application/json" },
			});

			if (res.statusCode === 200 && res.data?.success) {
				// Worker 返回格式：{ success: true, data: { fund_info, portfolios, ai_analysis } }
				setReportData(res.data.data);
				Taro.showToast({ title: "研报生成成功", icon: "success" });
			} else {
				throw new Error(res.data?.error || "查询失败");
			}
		} catch (err: any) {
			console.error("Search Error:", err);
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
			{/* 搜索区域 */}
			<View className="search-box">
				<Input
					className="fund-input"
					value={code}
					onInput={(e) => setCode(e.detail.value)}
					placeholder="请输入 6 位基金代码"
					type="number"
					maxlength={6}
				/>
				<Button
					className="search-btn"
					onClick={handleSearch}
					disabled={loading}
				>
					{loading ? "生成中" : "查询"}
				</Button>
			</View>

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

					{/* 4. 数据来源标注 */}
					<View
						style={{
							textAlign: "center",
							fontSize: "20rpx",
							color: "#94a3b8",
							marginTop: "20rpx",
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
			{!reportData && !loading && (
				<View className="empty-holder">
					<View className="icon-ai">🤖</View>
					<View className="text">输入基金代码，AI 助你穿透底层资产</View>
				</View>
			)}
		</ScrollView>
	);
};

export default IndexV2;
