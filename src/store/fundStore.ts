import { create } from "zustand";

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

interface QueryHistoryItem {
	fund_code: string;
	fund_name: string;
	timestamp: number;
}

interface FundState {
	// 当前查询的基金
	currentFund: FundInfo | null;
	// 查询历史（最近 10 条）
	queryHistory: QueryHistoryItem[];
	// 设置当前基金
	setCurrentFund: (fund: FundInfo | null) => void;
	// 添加到查询历史
	addToHistory: (fund: FundInfo) => void;
	// 清空查询历史
	clearHistory: () => void;
	// 从历史记录中移除
	removeFromHistory: (fundCode: string) => void;
}

export const useFundStore = create<FundState>((set, get) => ({
	currentFund: null,
	queryHistory: [],

	setCurrentFund: (fund) => {
		set({ currentFund: fund });
	},

	addToHistory: (fund) => {
		const history = get().queryHistory;
		// 移除已存在的记录（如果有）
		const filtered = history.filter(
			(item) => item.fund_code !== fund.fund_code,
		);
		// 添加到开头
		const newHistory = [
			{
				fund_code: fund.fund_code,
				fund_name: fund.fund_name,
				timestamp: Date.now(),
			},
			...filtered,
		].slice(0, 10); // 只保留最近 10 条

		set({ queryHistory: newHistory });

		// 持久化到 localStorage
		try {
			Taro.setStorageSync("fund_query_history", newHistory);
		} catch (e) {
			console.error("保存查询历史失败:", e);
		}
	},

	clearHistory: () => {
		set({ queryHistory: [] });
		try {
			Taro.removeStorageSync("fund_query_history");
		} catch (e) {
			console.error("清空查询历史失败:", e);
		}
	},

	removeFromHistory: (fundCode) => {
		const history = get().queryHistory;
		const newHistory = history.filter((item) => item.fund_code !== fundCode);
		set({ queryHistory: newHistory });

		try {
			Taro.setStorageSync("fund_query_history", newHistory);
		} catch (e) {
			console.error("更新查询历史失败:", e);
		}
	},
}));

// 从 localStorage 加载历史
if (typeof Taro !== "undefined") {
	try {
		const savedHistory = Taro.getStorageSync("fund_query_history");
		if (savedHistory && savedHistory.length > 0) {
			useFundStore.setState({ queryHistory: savedHistory });
		}
	} catch (e) {
		console.error("加载查询历史失败:", e);
	}
}
