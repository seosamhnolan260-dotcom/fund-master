/**
 * PDF 风格研报组件 - Taro 兼容版
 * 模拟高端金融机构研报质感
 */

import { Text, View } from "@tarojs/components";
import "./index.scss";

interface AnalysisReportProps {
	content: string;
	fundName: string;
	fundCode: string;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({
	content,
	fundName,
	fundCode,
}) => {
	const today = new Date().toLocaleDateString("zh-CN", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<View className="report-paper">
			{/* 模拟 PDF 页眉线 */}
			<View className="header-line" />

			<View className="report-title">
				<Text className="title-text">投资价值归因报告</Text>
				<Text className="fund-tag">{fundName}</Text>
			</View>

			<View className="report-body">
				{/* 利用 whitespace-pre-wrap 保持 AI 生成的换行格式 */}
				<Text className="content-text" style={{ whiteSpace: "pre-wrap" }}>
					{content || "AI 正在基于盈米 MCP 数据进行深度归因..."}
				</Text>
			</View>

			{/* 底部印章感设计 */}
			<View className="footer-mark">
				<Text className="source-text">DATA SOURCE: YINGMI MCP</Text>
				<View className="stamp">
					<Text className="stamp-text">研报专用</Text>
				</View>
				<Text className="date-text">{today}</Text>
			</View>
		</View>
	);
};
