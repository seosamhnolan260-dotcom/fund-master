/**
 * 雷达扫描加载组件 - Taro 兼容版
 * 用于 AI 研报生成时的加载动画
 */

import { Text, View } from "@tarojs/components";
import "./index.scss";

interface RadarLoadingProps {
	tip?: string;
}

export const RadarLoading: React.FC<RadarLoadingProps> = ({
	tip = "AI 正在穿透底层资产...",
}) => {
	return (
		<View className="radar-container">
			<View className="radar-box">
				{/* 雷达扫描圆环 */}
				<View className="radar-circle">
					{/* 扫描扇形 */}
					<View className="radar-sweep" />
					{/* 模拟扫描到的数据点（随机分布） */}
					<View className="dot dot-1" />
					<View className="dot dot-2" />
					<View className="dot dot-3" />
				</View>
				{/* 动态数字流效果 */}
				<View className="data-stream">
					<Text className="data-text">ANALYZING ASSETS...</Text>
					<Text className="data-val">021674.SH | 10.5B | 0.88%</Text>
				</View>
			</View>
			<Text className="loading-tip">{tip}</Text>
		</View>
	);
};
