/**
 * 持仓分布组件 - Taro 兼容版
 * 使用纯 CSS 实现柱状图，兼容小程序
 */

import { Text, View } from "@tarojs/components";
import "./index.scss";

interface StockItem {
	assetName: string;
	ratio: number | string;
}

interface PortfolioBarProps {
	stocks?: StockItem[];
	concentration?: string;
}

export const PortfolioBar: React.FC<PortfolioBarProps> = ({
	stocks = [],
	concentration = "0.00",
}) => {
	// 数据清洗：确保 ratio 是数字
	const formattedStocks = stocks
		.map((item) => ({
			name: item.assetName || "未知",
			ratio:
				typeof item.ratio === "string"
					? parseFloat(item.ratio)
					: item.ratio || 0,
		}))
		.slice(0, 10);

	return (
		<View className="portfolio-section">
			<View className="section-header">
				<Text className="section-title">前十大重仓股</Text>
				<View className="concentration-tag">
					<Text className="tag-label">集中度</Text>
					<Text className="tag-value">{concentration}%</Text>
				</View>
			</View>

			{formattedStocks.length > 0 ? (
				formattedStocks.map((item, index) => (
					<View key={index} className="bar-container">
						<View className="bar-info">
							<Text className="stock-name">{item.name}</Text>
							<Text className="stock-ratio">{item.ratio.toFixed(2)}%</Text>
						</View>
						{/* 背景条 */}
						<View className="bar-bg">
							{/* 动态进度条 - 纯 CSS 实现 */}
							<View
								className="bar-fill"
								style={{ width: `${Math.min(item.ratio * 10, 100)}%` }}
							/>
						</View>
					</View>
				))
			) : (
				<View className="empty-state">
					<Text className="empty-text">盈米 MCP 暂未返回重仓数据</Text>
				</View>
			)}
		</View>
	);
};
