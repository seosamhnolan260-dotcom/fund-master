#!/usr/bin/env deno run --allow-net --allow-env

/**
 * 测试盈米 MCP 基金接口
 * 测试 fund-detail, fund-holding, fund-performance 三个接口
 */

const YINGMI_MCP_ENDPOINT = "https://stargate.yingmi.com/mcp/v2";
const YINGMI_MCP_API_KEY = "FmSylSxtSrUGWWL3KWI47A";

// 测试用基金代码
const TEST_FUND_CODE = "000001"; // 华夏成长

interface TestResult {
	name: string;
	success: boolean;
	error?: string;
	data?: any;
	duration: number;
}

/**
 * 调用盈米 MCP 工具
 */
async function callMcpTool(
	method: string,
	arguments_: Record<string, any>,
): Promise<any> {
	const requestBody = {
		jsonrpc: "2.0",
		id: Date.now(),
		method: "tools/call",
		params: {
			name: method,
			arguments: arguments_,
		},
	};

	const response = await fetch(YINGMI_MCP_ENDPOINT, {
		method: "POST",
		headers: {
			"x-api-key": YINGMI_MCP_API_KEY,
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		},
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		throw new Error(
			`MCP API 请求失败：${response.status} ${response.statusText}`,
		);
	}

	const result = await response.json();

	if (result.error) {
		throw new Error(`MCP API 错误：${result.error.message}`);
	}

	const content = result.result?.content?.[0]?.text;
	if (!content) {
		throw new Error("MCP 返回数据格式异常");
	}

	try {
		return JSON.parse(content);
	} catch {
		return content;
	}
}

/**
 * 测试 fund-detail 接口
 */
async function testFundDetail(): Promise<TestResult> {
	const startTime = Date.now();
	try {
		console.log("\n📊 测试 fund-detail (BatchGetFundsDetail)...");
		const result = await callMcpTool("BatchGetFundsDetail", {
			fundCodes: [TEST_FUND_CODE],
		});

		const duration = Date.now() - startTime;
		console.log(`✅ 成功 (${duration}ms)`);
		console.log("基金详情:", JSON.stringify(result, null, 2));

		return {
			name: "fund-detail",
			success: true,
			data: result,
			duration,
		};
	} catch (error) {
		const duration = Date.now() - startTime;
		console.log(`❌ 失败 (${duration}ms)`);
		console.log("错误:", error instanceof Error ? error.message : error);

		return {
			name: "fund-detail",
			success: false,
			error: error instanceof Error ? error.message : String(error),
			duration,
		};
	}
}

/**
 * 测试 fund-holding 接口
 */
async function testFundHolding(): Promise<TestResult> {
	const startTime = Date.now();
	try {
		console.log("\n📊 测试 fund-holding (BatchGetFundsHolding)...");
		const result = await callMcpTool("BatchGetFundsHolding", {
			fundCodes: [TEST_FUND_CODE],
		});

		const duration = Date.now() - startTime;
		console.log(`✅ 成功 (${duration}ms)`);
		console.log("持仓信息:", JSON.stringify(result, null, 2));

		return {
			name: "fund-holding",
			success: true,
			data: result,
			duration,
		};
	} catch (error) {
		const duration = Date.now() - startTime;
		console.log(`❌ 失败 (${duration}ms)`);
		console.log("错误:", error instanceof Error ? error.message : error);

		return {
			name: "fund-holding",
			success: false,
			error: error instanceof Error ? error.message : String(error),
			duration,
		};
	}
}

/**
 * 测试 fund-performance 接口
 */
async function testFundPerformance(): Promise<TestResult> {
	const startTime = Date.now();
	try {
		console.log("\n📊 测试 fund-performance (GetBatchFundPerformance)...");
		const result = await callMcpTool("GetBatchFundPerformance", {
			fundCodes: [TEST_FUND_CODE],
		});

		const duration = Date.now() - startTime;
		console.log(`✅ 成功 (${duration}ms)`);
		console.log("历史业绩:", JSON.stringify(result, null, 2));

		return {
			name: "fund-performance",
			success: true,
			data: result,
			duration,
		};
	} catch (error) {
		const duration = Date.now() - startTime;
		console.log(`❌ 失败 (${duration}ms)`);
		console.log("错误:", error instanceof Error ? error.message : error);

		return {
			name: "fund-performance",
			success: false,
			error: error instanceof Error ? error.message : String(error),
			duration,
		};
	}
}

/**
 * 主测试函数
 */
async function main() {
	console.log("🚀 开始测试盈米 MCP 基金接口");
	console.log("测试基金代码:", TEST_FUND_CODE);
	console.log("MCP Endpoint:", YINGMI_MCP_ENDPOINT);

	const results: TestResult[] = [];

	// 执行测试
	results.push(await testFundDetail());
	results.push(await testFundHolding());
	results.push(await testFundPerformance());

	// 输出测试报告
	console.log(`\n${"=".repeat(60)}`);
	console.log("📋 测试报告");
	console.log("=".repeat(60));

	const passed = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;
	const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

	console.log(`\n总计：${results.length} 个测试`);
	console.log(`✅ 通过：${passed}`);
	console.log(`❌ 失败：${failed}`);
	console.log(`⏱️  总耗时：${totalDuration}ms`);
	console.log(`⚡ 平均耗时：${Math.round(totalDuration / results.length)}ms`);

	console.log("\n详细结果:");
	for (const result of results) {
		const status = result.success ? "✅" : "❌";
		console.log(`${status} ${result.name}: ${result.duration}ms`);
	}

	// 如果全部通过，输出成功消息
	if (failed === 0) {
		console.log("\n🎉 所有测试通过！接口已准备就绪，可以与前端联调。");
	} else {
		console.log("\n⚠️  部分测试失败，请检查错误信息。");
	}
}

// 运行测试
main().catch(console.error);
