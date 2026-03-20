export default defineAppConfig({
	pages: [
		"pages/index/index-v2", // Phase 2 稳定版（首页）
		"pages/index/index", // 旧版备份
		"pages/report/index",
	],
	window: {
		backgroundTextStyle: "light",
		// 中信蓝配色，增强沉浸感
		navigationBarBackgroundColor: "#1c2a44",
		navigationBarTitleText: "基金投资大师",
		navigationBarTextStyle: "white",
	},
});
