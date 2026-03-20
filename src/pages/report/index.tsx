import { Button, RichText, ScrollView, Text, View } from "@tarojs/components";
import Taro, {
	useDidShow,
	useShareAppMessage,
	useShareTimeline,
} from "@tarojs/taro";
import { useCallback, useEffect, useState } from "react";

interface FundInfo {
	fund_code: string;
	fund_name: string;
	net_value: number;
	nav_date: string;
	daily_growth: number;
	daily_growth_rate: number;
	accumulated_nav: number;
	fund_type: string;
	fund_scale: number;
	fund_manager: string;
	established_date: string;
}

interface FundMatch {
	fund_code: string;
	fund_name: string;
}

export default function Report() {
	const [fundInput, setFundInput] = useState("");
	const [fundInfo, setFundInfo] = useState<FundInfo | null>(null);
	const [analysisContent, setAnalysisContent] = useState("");
	const [investmentSummary, setInvestmentSummary] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [analyzing, setAnalyzing] = useState(false);
	const [showMatchSelector, setShowMatchSelector] = useState(false);
	const [matchedFunds, setMatchedFunds] = useState<FundMatch[]>([]);

	// 获取路由参数
	useDidShow(() => {
		const instance = Taro.getCurrentInstance();
		const fund = instance.router?.params?.fund;
		if (fund) {
			setFundInput(decodeURIComponent(fund));
		}
	});

	// 获取基金信息
	const fetchFundInfo = useCallback(async (input: string) => {
		try {
			setLoading(true);
			setError("");

			// 调用 Cloudflare Workers API（演示版）
			const WORKER_URL =
				"https://fund-investment-master.seosamhnolan260.workers.dev";

			console.log("Fetching fund info for:", input);
			console.log("Worker URL:", WORKER_URL);

			const response = await fetch(`${WORKER_URL}/fund-info`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({ code: input }),
				// 禁用缓存
				cache: "no-cache",
			});

			console.log("Response status:", response.status);

			// 检查 HTTP 状态码
			if (!response.ok) {
				const errorText = await response.text();
				console.error("HTTP Error:", response.status, errorText);
				throw new Error(`HTTP ${response.status}: ${errorText || "请求失败"}`);
			}

			const data = await response.json();
			console.log("Response data:", data);

			if (!data?.success) {
				throw new Error(data?.error || "获取基金信息失败");
			}

			// 检查是否返回多个匹配结果
			if (data?.success && data?.multiple && data?.matches) {
				console.log("找到多个匹配结果:", data.matches);
				setMatchedFunds(data.matches);
				setShowMatchSelector(true);
				setLoading(false);
				return null;
			}

			if (!data?.success || !data?.data) {
				throw new Error(
					data?.error || "无法获取基金信息，请检查基金代码或名称是否正确",
				);
			}

			// 确保数值类型正确
			const fundData = {
				...data.data,
				net_value: Number(data.data.net_value) || 0,
				daily_growth: Number(data.data.daily_growth) || 0,
				daily_growth_rate: Number(data.data.daily_growth_rate) || 0,
				accumulated_nav: Number(data.data.accumulated_nav) || 0,
				fund_scale: Number(data.data.fund_scale) || 0,
			};

			setFundInfo(fundData);
			return fundData;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "获取基金信息失败";
			setError(errorMessage);
			Taro.showToast({
				title: errorMessage,
				icon: "none",
				duration: 3000,
			});
			return null;
		} finally {
			setLoading(false);
		}
	}, []);

	// 生成 AI 分析报告
	const generateAnalysis = useCallback(
		async (fundData: FundInfo) => {
			try {
				setAnalyzing(true);
				setAnalysisContent("");
				setInvestmentSummary("");

				// 调用 Cloudflare Workers AI API (流式 SSE - 演示版)
				const WORKER_URL =
					"https://fund-investment-master.seosamhnolan260.workers.dev";

				const response = await fetch(`${WORKER_URL}/fund-analysis`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						fundInfo: fundData,
					}),
				});

				if (!response.ok) {
					throw new Error("AI 报告生成失败");
				}

				const reader = response.body?.getReader();
				const decoder = new TextDecoder();

				if (!reader) {
					throw new Error("无法读取流式响应");
				}

				let buffer = "";
				let fullContent = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (line.startsWith("data: ")) {
							const content = line.slice(6);
							if (content === "[DONE]") {
								break;
							}
							try {
								const parsed = JSON.parse(content);
								const delta = parsed.choices?.[0]?.delta?.content || "";
								if (delta) {
									fullContent += delta;
									setAnalysisContent(fullContent);

									// 提取一句话投资判断（第一段）
									if (
										!investmentSummary &&
										fullContent.includes("## 一句话投资判断")
									) {
										const summaryMatch = fullContent.match(
											/## 一句话投资判断\s*\n([\s\S]*?)(?=\n##|$)/,
										);
										if (summaryMatch) {
											setInvestmentSummary(summaryMatch[1].trim());
										}
									}
								}
							} catch (_e) {
								// 忽略解析错误
							}
						}
					}
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "AI 报告生成失败";
				setError(errorMessage);
				Taro.showToast({
					title: errorMessage,
					icon: "none",
					duration: 3000,
				});
			} finally {
				setAnalyzing(false);
				setLoading(false);
			}
		},
		[investmentSummary],
	);

	// 选择匹配的基金
	const handleSelectFund = useCallback(
		async (fundCode: string) => {
			setShowMatchSelector(false);
			setFundInput(fundCode);
			await fetchFundInfo(fundCode);
		},
		[fetchFundInfo],
	);

	// 返回首页
	const handleGoHome = () => {
		Taro.navigateBack();
	};

	// 分享功能
	useShareAppMessage(() => {
		return {
			title: fundInfo ? `${fundInfo.fund_name} - AI 投研报告` : "基金投资大师",
			path: `/pages/report/index?fund=${fundInput}`,
		};
	});

	useShareTimeline(() => {
		return {
			title: fundInfo ? `${fundInfo.fund_name} - AI 投研报告` : "基金投资大师",
			path: `/pages/report/index?fund=${fundInput}`,
		};
	});

	// 初始化加载
	useEffect(() => {
		if (fundInput) {
			fetchFundInfo(fundInput).then((data) => {
				if (data && !showMatchSelector) {
					generateAnalysis(data);
				}
			});
		}
	}, [fundInput, fetchFundInfo, generateAnalysis, showMatchSelector]);

	// 渲染基金基础信息
	const renderFundInfo = () => {
		if (!fundInfo) return null;

		const isPositive = fundInfo.daily_growth_rate >= 0;

		return (
			<View className="bg-card rounded-2xl p-6 shadow-elegant mb-6">
				<View className="flex items-center justify-between mb-4">
					<Text className="text-xl font-bold text-foreground">
						{fundInfo.fund_name}
					</Text>
					<Text className="text-sm text-muted-foreground">
						{fundInfo.fund_code}
					</Text>
				</View>

				<View className="grid grid-cols-2 gap-4">
					<View>
						<Text className="text-sm text-muted-foreground">单位净值</Text>
						<Text className="text-2xl font-bold text-foreground">
							{fundInfo.net_value.toFixed(4)}
						</Text>
					</View>
					<View>
						<Text className="text-sm text-muted-foreground">日涨跌幅</Text>
						<Text
							className={`text-2xl font-bold ${isPositive ? "text-red-500" : "text-green-500"}`}
						>
							{isPositive ? "+" : ""}
							{fundInfo.daily_growth_rate.toFixed(2)}%
						</Text>
					</View>
					<View>
						<Text className="text-sm text-muted-foreground">累计净值</Text>
						<Text className="text-lg text-foreground">
							{fundInfo.accumulated_nav.toFixed(4)}
						</Text>
					</View>
					<View>
						<Text className="text-sm text-muted-foreground">净值日期</Text>
						<Text className="text-lg text-foreground">{fundInfo.nav_date}</Text>
					</View>
				</View>

				<View className="border-t border-border mt-4 pt-4">
					<View className="grid grid-cols-2 gap-3">
						<View>
							<Text className="text-xs text-muted-foreground">基金类型</Text>
							<Text className="text-sm text-foreground">
								{fundInfo.fund_type}
							</Text>
						</View>
						<View>
							<Text className="text-xs text-muted-foreground">基金规模</Text>
							<Text className="text-sm text-foreground">
								{fundInfo.fund_scale}亿元
							</Text>
						</View>
						<View>
							<Text className="text-xs text-muted-foreground">基金经理</Text>
							<Text className="text-sm text-foreground">
								{fundInfo.fund_manager}
							</Text>
						</View>
						<View>
							<Text className="text-xs text-muted-foreground">成立日期</Text>
							<Text className="text-sm text-foreground">
								{fundInfo.established_date}
							</Text>
						</View>
					</View>
				</View>
			</View>
		);
	};

	// 渲染一句话投资判断
	const renderInvestmentSummary = () => {
		if (!investmentSummary) return null;

		return (
			<View className="bg-gradient-primary rounded-2xl p-6 shadow-elegant mb-6">
				<Text className="text-lg font-bold text-white mb-2">
					💡 一句话投资判断
				</Text>
				<Text className="text-base text-white/90">{investmentSummary}</Text>
			</View>
		);
	};

	// 渲染 AI 报告内容
	const renderAnalysisContent = () => {
		if (!analysisContent) return null;

		// 将 Markdown 转换为简单的 HTML
		const htmlContent = analysisContent
			.replace(
				/^## (.*$)/gim,
				'<h2 class="text-xl font-bold text-foreground mt-6 mb-3">$1</h2>',
			)
			.replace(
				/^### (.*$)/gim,
				'<h3 class="text-lg font-semibold text-foreground mt-4 mb-2">$1</h3>',
			)
			.replace(
				/^- (.*$)/gim,
				'<li class="text-base text-foreground ml-4 mb-1">$1</li>',
			)
			.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
			.replace(/\n/g, "<br/>");

		return (
			<View className="bg-card rounded-2xl p-6 shadow-elegant mb-6">
				<Text className="text-lg font-bold text-foreground mb-4">
					📊 AI 投研报告
				</Text>
				<RichText nodes={htmlContent} />
			</View>
		);
	};

	// 渲染匹配选择器
	const renderMatchSelector = () => {
		if (!showMatchSelector) return null;

		return (
			<View className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
				<View className="bg-card rounded-2xl p-6 mx-6 max-h-[80vh] overflow-y-auto">
					<Text className="text-lg font-bold text-foreground mb-4">
						找到多个匹配结果
					</Text>
					<View className="space-y-3">
						{matchedFunds.map((fund) => (
							<Button
								key={fund.fund_code}
								className="w-full bg-muted hover:bg-muted/80 py-3 rounded-xl"
								size="default"
								onClick={() => handleSelectFund(fund.fund_code)}
							>
								<Text className="text-base text-foreground">
									{fund.fund_name} ({fund.fund_code})
								</Text>
							</Button>
						))}
					</View>
					<Button
						className="w-full mt-4 py-3 rounded-xl"
						size="default"
						variant="ghost"
						onClick={() => setShowMatchSelector(false)}
					>
						<Text className="text-base text-muted-foreground">取消</Text>
					</Button>
				</View>
			</View>
		);
	};

	return (
		<ScrollView className="min-h-screen bg-background" scrollY>
			{/* 顶部导航栏 */}
			<View className="sticky top-0 bg-card shadow-md px-4 py-3 flex items-center z-10">
				<Button className="p-2" onClick={handleGoHome}>
					<View className="i-mdi-arrow-left text-xl text-foreground" />
				</Button>
				<Text className="flex-1 text-center text-lg font-semibold text-foreground">
					基金详情
				</Text>
				<View className="w-9" />
			</View>

			<View className="p-6 pb-12">
				{/* 加载状态 */}
				{loading && !fundInfo && (
					<View className="flex flex-col items-center justify-center py-20">
						<View className="i-mdi-loading animate-spin text-6xl text-primary mb-4" />
						<Text className="text-base text-muted-foreground">
							正在查询基金信息...
						</Text>
					</View>
				)}

				{/* 错误状态 */}
				{error && !fundInfo && (
					<View className="flex flex-col items-center justify-center py-20">
						<View className="i-mdi-alert-circle text-6xl text-error mb-4" />
						<Text className="text-base text-foreground mb-4">{error}</Text>
						<Button
							className="bg-primary text-white px-6 py-3 rounded-xl"
							size="default"
							onClick={() => handleGoHome()}
						>
							<Text className="text-base">返回首页</Text>
						</Button>
					</View>
				)}

				{/* 基金信息 */}
				{renderFundInfo()}

				{/* 一句话投资判断 */}
				{renderInvestmentSummary()}

				{/* AI 报告内容 */}
				{renderAnalysisContent()}

				{/* 分析中状态 */}
				{analyzing && (
					<View className="bg-card rounded-2xl p-6 shadow-elegant mb-6">
						<View className="flex items-center">
							<View className="i-mdi-loading animate-spin text-2xl text-primary mr-3" />
							<Text className="text-base text-muted-foreground">
								AI 正在生成投研报告，请稍候...
							</Text>
						</View>
					</View>
				)}

				{/* 分享按钮 */}
				{fundInfo && analysisContent && (
					<View className="mb-6">
						<Button
							className="w-full bg-primary text-white py-4 rounded-xl text-base font-semibold"
							size="default"
							openType="share"
						>
							<View className="i-mdi-share-variant text-xl mr-2" />
							<Text>分享报告</Text>
						</Button>
					</View>
				)}

				{/* 免责声明 */}
				<View className="pb-8">
					<Text className="text-xs text-muted-foreground text-center">
						本报告基于公开信息与 AI
						生成，仅供学习研究，不构成任何投资建议。市场有风险，投资需谨慎。
					</Text>
				</View>
			</View>

			{/* 匹配选择器 */}
			{renderMatchSelector()}
		</ScrollView>
	);
}
