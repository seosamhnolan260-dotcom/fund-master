import { Button, Input, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState } from "react";

export default function Index() {
	const [fundInput, setFundInput] = useState("");
	const [loading, _setLoading] = useState(false);

	const handleQuery = () => {
		const trimmedInput = fundInput.trim();

		if (!trimmedInput) {
			Taro.showToast({
				title: "请输入基金名称或代码",
				icon: "none",
				duration: 2000,
			});
			return;
		}

		// 跳转到报告页面
		Taro.navigateTo({
			url: `/pages/report/index?fund=${encodeURIComponent(trimmedInput)}`,
		});
	};

	return (
		<View className="min-h-screen bg-background">
			{/* 顶部装饰渐变 */}
			<View className="h-48 bg-gradient-primary" />

			{/* 主内容区域 */}
			<View className="px-6 -mt-32">
				{/* 标题卡片 */}
				<View className="bg-card rounded-2xl p-8 shadow-elegant mb-6">
					<View className="flex flex-col items-center">
						<View className="i-mdi-chart-line text-6xl text-primary mb-4" />
						<Text className="text-3xl font-bold text-foreground text-center mb-2">
							基金投资大师
						</Text>
						<Text className="text-base text-muted-foreground text-center">
							AI 驱动的基金查询与深度投研工具
						</Text>
					</View>
				</View>

				{/* 输入卡片 */}
				<View className="bg-card rounded-2xl p-6 shadow-elegant mb-6">
					<Text className="text-lg font-semibold text-foreground mb-4">
						输入<Text className="text-red-500">基金代码</Text>或名称
					</Text>

					<View className="bg-input rounded-xl border border-border px-4 py-3 mb-3">
						<Input
							className="w-full text-foreground text-base"
							style={{ padding: 0, border: "none", background: "transparent" }}
							placeholder="请输入基金名称或代码"
							placeholderClass="text-muted-foreground"
							value={fundInput}
							onInput={(e) => setFundInput(e.detail.value)}
							maxlength={20}
						/>
					</View>

					<Text className="text-sm text-muted-foreground mb-2">支持格式：</Text>
					<View className="bg-muted rounded-lg p-3 mb-6">
						<Text className="text-sm text-foreground font-semibold mb-2">
							支持所有公募基金查询
						</Text>
						<Text className="text-sm text-foreground mb-1">
							• 基金代码：000001、110022（6 位数字）
						</Text>
						<Text className="text-sm text-foreground mb-1">
							• 基金名称：易方达、华夏成长（完整或部分名称）
						</Text>
						<Text className="text-sm text-foreground">
							• 拼音缩写：YFD、HXCZ（首字母）
						</Text>
					</View>

					<Button
						className="w-full bg-primary text-white py-4 rounded-xl break-keep text-base font-semibold"
						size="default"
						onClick={loading ? undefined : handleQuery}
					>
						{loading ? "查询中..." : "查询基金并生成 AI 报告"}
					</Button>
				</View>

				{/* 功能特点 */}
				<View className="bg-card rounded-2xl p-6 shadow-elegant mb-6">
					<Text className="text-lg font-semibold text-foreground mb-4">
						核心功能
					</Text>

					<View className="space-y-3">
						<View className="flex items-start">
							<View className="i-mdi-check-circle text-xl text-success mr-3 mt-0.5" />
							<View className="flex-1">
								<Text className="text-base text-foreground">
									基金信息实时查询（净值、涨跌幅、规模等）
								</Text>
							</View>
						</View>

						<View className="flex items-start">
							<View className="i-mdi-check-circle text-xl text-success mr-3 mt-0.5" />
							<View className="flex-1">
								<Text className="text-base text-foreground">
									AI 生成深度投研报告（6 大维度分析）
								</Text>
							</View>
						</View>

						<View className="flex items-start">
							<View className="i-mdi-check-circle text-xl text-success mr-3 mt-0.5" />
							<View className="flex-1">
								<Text className="text-base text-foreground">
									历史业绩与持仓分析
								</Text>
							</View>
						</View>

						<View className="flex items-start">
							<View className="i-mdi-check-circle text-xl text-success mr-3 mt-0.5" />
							<View className="flex-1">
								<Text className="text-base text-foreground">
									基金经理评估与风险评估
								</Text>
							</View>
						</View>

						<View className="flex items-start">
							<View className="i-mdi-check-circle text-xl text-success mr-3 mt-0.5" />
							<View className="flex-1">
								<Text className="text-base text-foreground">
									一键分享报告到微信
								</Text>
							</View>
						</View>
					</View>
				</View>

				{/* 免责声明 */}
				<View className="pb-8">
					<Text className="text-xs text-muted-foreground text-center">
						本内容基于公开信息与 AI 生成，仅供学习研究，不构成任何投资建议。
					</Text>
				</View>
			</View>
		</View>
	);
}
