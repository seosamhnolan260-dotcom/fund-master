import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * 数据缓存策略实现
 *
 * 缓存层级:
 * 1. 基金基本信息 - 缓存 24 小时
 * 2. 净值数据 - 缓存至下一交易日 (12 小时)
 * 3. AI 报告 - 缓存 7 天 (相同基金 + 日期)
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// 缓存 TTL 配置 (秒)
const CACHE_TTL = {
	FUND_INFO: 86400, // 24 小时
	NAV: 43200, // 12 小时
	REPORT: 604800, // 7 天
};

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	expiresAt: number;
}

/**
 * 检查缓存是否有效
 */
function _isValidCache(entry: CacheEntry<any>): boolean {
	if (!entry) return false;
	const now = Date.now();
	return now < entry.expiresAt;
}

/**
 * 从缓存获取数据
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
	try {
		const { data, error } = await supabase
			.from("cache")
			.select("data, expires_at")
			.eq("cache_key", key)
			.single();

		if (error || !data) {
			return null;
		}

		const now = Date.now();
		if (now >= data.expires_at) {
			// 缓存过期，删除
			await supabase.from("cache").delete().eq("cache_key", key);
			return null;
		}

		return data.data as T;
	} catch (error) {
		console.error("Cache get error:", error);
		return null;
	}
}

/**
 * 写入缓存
 */
export async function setCache<T>(
	key: string,
	data: T,
	ttlSeconds: number,
): Promise<void> {
	try {
		const now = Date.now();
		const expiresAt = now + ttlSeconds * 1000;

		await supabase.from("cache").upsert(
			{
				cache_key: key,
				data: data,
				expires_at: expiresAt,
				updated_at: now,
			},
			{
				onConflict: "cache_key",
			},
		);
	} catch (error) {
		console.error("Cache set error:", error);
	}
}

/**
 * 删除缓存
 */
export async function deleteCache(key: string): Promise<void> {
	try {
		await supabase.from("cache").delete().eq("cache_key", key);
	} catch (error) {
		console.error("Cache delete error:", error);
	}
}

// ============ 基金信息缓存 ============

export async function getCachedFundInfo(fundCode: string) {
	return await getFromCache<any>(`fund:info:${fundCode}`);
}

export async function setCachedFundInfo(fundCode: string, data: any) {
	return await setCache(`fund:info:${fundCode}`, data, CACHE_TTL.FUND_INFO);
}

// ============ 净值数据缓存 ============

export async function getCachedNAV(fundCode: string) {
	return await getFromCache<any>(`fund:nav:${fundCode}`);
}

export async function setCachedNAV(fundCode: string, data: any) {
	return await setCache(`fund:nav:${fundCode}`, data, CACHE_TTL.NAV);
}

// ============ AI 报告缓存 ============

export async function getCachedReport(fundCode: string, date: string) {
	return await getFromCache<string>(`fund:report:${fundCode}:${date}`);
}

export async function setCachedReport(
	fundCode: string,
	date: string,
	report: string,
) {
	return await setCache(
		`fund:report:${fundCode}:${date}`,
		report,
		CACHE_TTL.REPORT,
	);
}

/**
 * 获取今日日期字符串 (YYYY-MM-DD)
 */
export function getTodayString(): string {
	return new Date().toISOString().split("T")[0];
}

/**
 * 判断是否为交易日 (简化实现，实际需对接交易日日历)
 */
export function isTradingDay(): boolean {
	const now = new Date();
	const day = now.getDay();
	// 周六 (6) 和周日 (0) 不是交易日
	return day !== 0 && day !== 6;
}

/**
 * 计算下一交易日 (简化实现)
 */
export function getNextTradingDate(): string {
	const now = new Date();
	const day = now.getDay();

	if (day === 5) {
		// 周五
		now.setDate(now.getDate() + 3); // 下周一
	} else if (day === 6) {
		// 周六
		now.setDate(now.getDate() + 2); // 下周一
	} else {
		now.setDate(now.getDate() + 1); // 次日
	}

	return now.toISOString().split("T")[0];
}
