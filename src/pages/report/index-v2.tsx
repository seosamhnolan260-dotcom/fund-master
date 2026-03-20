/**
 * 基金研报页面 - Phase 2 版本
 * 集成 AI 归因分析 + 持仓分布 + PDF 风格报告
 */

import { Button, ScrollView, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useCallback, useState } from "react";
import { AnalysisReport } from "../../components/AnalysisReport";
import { PortfolioBar } from "../../components/PortfolioBar";
import { RadarLoading } from "../../components/RadarLoading";
import "./index-v2.scss";

interface FundInfo {
	code: string;
	name: string;
	type: string;
	scale: string;
	nav: string;
	daily_growth: string;
	nav_date: string;
}

interface PortfolioData {
	stocks: Array<{ assetName: string; ratio: number }>;
	industries: Array<{ industryName: string; ratio: number }>;
	concentration: string;
}

interface ReportData {
	fund_info: FundInfo;
	portfolios: PortfolioData;
	ai_analysis: string;
	data_source: string;
}

export default function ReportV2() {
	const [fundInput, setFundInput] = useState("");
	const [reportData, setReportData] = useState<ReportData | null>(null);
	const [isSearching, setIsSearching] = useState(false);
	const [error, setError] = useState("");

	// 获取路由参数
	useDidShow(() => {
		const instance = Taro.getCurrentInstance();
		const fund = instance.router?.params?.fund;
		if (fund) {
			const code = decodeURIComponent(fund);
			setFundInput(code);
			onSearch(code);
		}
	});

	// 核心请求函数
	const onSearch = useCallback(
		async (input?: string) => {
			const code = input || fundInput.trim();

			if (!/^\d{6}$/.test(code)) {
				Taro.showToast({
					title: "请输入 6 位基金代码",
					icon: "none",
				});
				return;
			}

			// 1. 开启全局 Loading 状态
			setIsSearching(true);
			setError("");

			try {
				// 2. 发起请求 (对接 Worker 接口)
				const response = await fetch(
					"https://fund-investment-master.seosamhnolan260.workers.dev/fund-info",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ code }),
					},
				);

				const data = await response.json();

				if (!response.ok || !data?.success) {
					throw new Error(data?.error || "获取基金信息失败");
				}

				// 3. 成功拿到数据，更新 State
				setReportData(data);

				Taro.showToast({
					title: "研报生成成功",
					icon: "success",
				});
			} catch (err: any) {
				console.error("Search Error:", err);
				setError(err.message || "网络拥塞，请稍后再试");
				Taro.showModal({
					title: "生成失败",
					content: err.message || "网络拥塞，请稍后再试",
					showCancel: false,
				});
			} finally {
				// 4. 无论成功失败，关闭 Loading
				setIsSearching(false);
			}
		},
		[fundInput],
	);

	return (
		<ScrollView scrollY className="page-container">
			{/* 搜索栏 */}
			<View className="search-section">
				<View className="search-title">基金代码</View>
				<View className="search-input-wrapper">
					<input
						className="fund-input"
						placeholder="输入 6 位基金代码"
						value={fundInput}
						onChange={(e) => setFundInput(e.target.value)}
						maxLength={6}
						type="number"
					/>
					<Button
						className="search-btn"
						onClick={() => onSearch()}
						loading={isSearching}
						disabled={isSearching}
					>
						{isSearching ? "生成中" : "生成研报"}
					</Button>
				</View>
			</View>

			{/* 加载中：显示雷达扫描 */}
			{isSearching && (
				<View className="loading-wrapper">
					<RadarLoading tip="AI 正在穿透底层资产并生成研报..." />
				</View>
			)}

			{/* 错误提示 */}
			{error && !isSearching && (
				<View className="error-wrapper">
					<Text className="error-text">❌ {error}</Text>
				</View>
			)}

			{/* 结果展示区 - 只有拿到数据才渲染 */}
			{!isSearching && reportData ? (
				<View className="result-section fade-in">
					{/* 1. 基础信息卡片 */}
					<View className="info-card">
						<View className="name">{reportData.fund_info.name}</View>
						<View className="code">{reportData.fund_info.code}</View>
						<View className="grid-stats">
							<View className="stat-item">
								<View className="label">单位净值</View>
								<View
									className={`value ${parseFloat(reportData.fund_info.daily_growth) >= 0 ? "red" : "green"}`}
								>
									{reportData.fund_info.nav}
								</View>
								<View className="sub-value">
									{reportData.fund_info.daily_growth}
								</View>
							</View>
							<View className="stat-item">
								<View className="label">基金规模</View>
								<View className="value">{reportData.fund_info.scale}</View>
							</View>
							<View className="stat-item">
								<View className="label">基金类型</View>
								<View className="value">{reportData.fund_info.type}</View>
							</View>
						</View>
					</View>

					{/* 2. 持仓归因组件 (方案 A：Taro 兼容版) */}
					<PortfolioBar
						stocks={reportData.portfolios.stocks}
						concentration={reportData.portfolios.concentration}
					/>

					{/* 3. PDF 风格 AI 研报组件 */}
					<AnalysisReport
						content={reportData.ai_analysis}
						fundName={reportData.fund_info.name}
						fundCode={reportData.fund_info.code}
					/>

					{/* 4. 底部数据来源 */}
					<View className="source-footer">
						<Text>数据来源：{reportData.data_source}</Text>
						<Text> | </Text>
						<Text>{reportData.fund_info.nav_date}</Text>
					</View>
				</View>
			) : (
				!isSearching && (
					// 初始占位图或引导语
					<View className="empty-holder">
						<View className="icon-ai">🤖</View>
						<View className="text">输入基金代码，AI 助你穿透底层资产</View>
					</View>
				)
			)}
		</ScrollView>
	);
}
