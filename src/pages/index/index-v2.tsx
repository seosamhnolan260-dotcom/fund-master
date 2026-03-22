/**
 * 基金研报页面 - V3.0 专业投研版
 * 深度投研 · 合规化 · 沉浸式阅读 · 盈米 MCP 数据集成 · LLM 驱动
 */

import { Button, Input, ScrollView, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type React from "react";
import { useState, useEffect } from "react";
import "./index.scss";

// --- 内部组件：持仓分布条 ---
const PortfolioBar: React.FC<{ stocks: any[] }> = ({ stocks = [] }) => {
  const formattedStocks = stocks
    .map((s) => ({
      name: s.assetName || s.name || "未知",
      ratio: typeof s.ratio === "string" ? parseFloat(s.ratio) : s.ratio || 0,
    }))
    .slice(0, 10);

  if (formattedStocks.length === 0) {
    return (
      <View className="portfolio-section">
        <Text className="section-title">📊 资产配置</Text>
        <View className="empty-state">数据维护中，请稍后重试</View>
      </View>
    );
  }

  return (
    <View className="portfolio-section">
      <Text className="section-title">📊 资产配置</Text>
      {formattedStocks.map((s, i) => (
        <View key={i} className="bar-item">
          <View className="bar-info">
            <Text className="bar-name">{s.name}</Text>
            <Text className="bar-ratio">{s.ratio.toFixed(2)}%</Text>
          </View>
          <View className="bar-track">
            <View
              className="bar-fill"
              style={{ width: `${Math.min(s.ratio * 100, 100)}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

// --- 内部组件：AI 研报核心摘要 (LLM 生成) ---
const AnalysisReport: React.FC<{ aiAnalysis: string; loading?: boolean }> = ({ aiAnalysis, loading }) => {
  const today = new Date().toLocaleDateString("zh-CN");

  if (loading) {
    return (
      <View className="ai-report">
        <View className="report-header">
          <Text className="report-tag">🤖 AI 投研报告</Text>
        </View>
        <View className="report-content">
          <Text>正在调用 AI 分析师进行深度投研...</Text>
          <Text style={{ fontSize: '13px', color: '#86868B', marginTop: '12px' }}>
            预计需要 10-15 秒
          </Text>
        </View>
      </View>
    );
  }

  if (!aiAnalysis) {
    return (
      <View className="ai-report">
        <View className="report-header">
          <Text className="report-tag">🤖 AI 投研报告</Text>
        </View>
        <View className="report-content">
          <Text>点击"下载完整研报"生成 AI 深度分析</Text>
          <Text style={{ fontSize: '13px', color: '#86868B', marginTop: '12px' }}>
            基于盈米 MCP 数据 + 阿里云百炼大模型
          </Text>
        </View>
      </View>
    );
  }

  const firstLine = aiAnalysis.split('\n')[0] || 'AI 投研报告';

  return (
    <View className="ai-report">
      <View className="report-header">
        <Text className="report-tag">🤖 AI 投研报告</Text>
      </View>
      <View className="report-content">
        <Text style={{ fontSize: '16px', fontWeight: '700', color: '#003371', marginBottom: '16px' }}>
          {firstLine.replace(/^#*\s*/, '')}
        </Text>
        <Text style={{ fontSize: '14px', lineHeight: '1.7', color: '#1D1D1F' }}>
          {aiAnalysis.substring(0, 300)}...
        </Text>
        <Text style={{ fontSize: '13px', color: '#007AFF', marginTop: '12px', fontWeight: '600' }}>
          👉 点击下方按钮下载完整研报
        </Text>
      </View>
      <View className="report-footer">
        <Text>数据来源：盈米 MCP | AI 模型：阿里云百炼 | {today}</Text>
      </View>
    </View>
  );
};

// --- 内部组件：大型 Loading 弹窗 ---
const LoadingModal: React.FC<{ visible: boolean; stage: string; stepIndex: number }> = ({ visible, stage, stepIndex }) => {
  if (!visible) return null;

  const loadingSteps = [
    { icon: "🤖", text: "正在从盈米 MCP 获取底层资产数据..." },
    { icon: "🧠", text: "正在穿透前十大重仓股的行业关联度..." },
    { icon: "✍️", text: "正在基于 20 年投研经验撰写深度分析报告..." },
  ];

  return (
    <>
      {/* 全屏遮罩层 */}
      <View style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }} />
      
      {/* 大型 Loading 弹窗 */}
      <View style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '560px',
        maxWidth: '90vw',
        minHeight: '360px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        zIndex: 10000,
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}>
        {/* 动态图标 */}
        <View style={{
          width: '120px',
          height: '120px',
          borderRadius: '60px',
          background: 'linear-gradient(135deg, #003371, #0052CC)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <Text style={{ fontSize: '64px' }}>
            {loadingSteps[stepIndex % loadingSteps.length]?.icon || "🤖"}
          </Text>
        </View>
        
        {/* 动态话术 */}
        <View style={{ textAlign: 'center', paddingHorizontal: '20px' }}>
          <Text style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#003371',
            marginBottom: '12px',
          }}>
            AI 深度分析中
          </Text>
          <Text style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#6E6E73',
          }}>
            {loadingSteps[stepIndex % loadingSteps.length]?.text || stage}
          </Text>
        </View>
        
        {/* 进度条 */}
        <View style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#F5F5F7',
          borderRadius: '2px',
          overflow: 'hidden',
          marginTop: '12px',
        }}>
          <View style={{
            width: `${((stepIndex % loadingSteps.length) + 1) * 33.33}%`,
            height: '100%',
            backgroundColor: '#003371',
            transition: 'width 0.5s ease',
            borderRadius: '2px',
          }} />
        </View>
        
        {/* 提示信息 */}
        <Text style={{
          fontSize: '13px',
          color: '#86868B',
          marginTop: '8px',
        }}>
          预计需要 10-15 秒，请稍候...
        </Text>
      </View>
      
      {/* 添加动画样式 */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </>
  );
};

// --- 主页面 ---
const IndexV2: React.FC = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingStage, setLoadingStage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const handleSearch = async () => {
    const searchCode = code.trim();
    if (!searchCode) {
      Taro.showToast({ title: "请输入基金代码或名称", icon: "none" });
      return;
    }

    setLoading(true);
    setLoadingStage("正在获取盈米 MCP 实时数据...");
    setLoadingStepIndex(0);
    Taro.showLoading({ title: "数据获取中...", mask: true });

    try {
      const res = await Taro.request({
        url: "https://fund-investment-master.seosamhnolan260.workers.dev/fund-info",
        method: "POST",
        data: { code: searchCode },
        header: { "content-type": "application/json" },
      });

      console.log("API Response:", res);

      if (res.statusCode === 200 && res.data?.success) {
        setLoadingStage("正在进行投资组合归因分析...");
        setAiLoading(true);
        
        const fundData = res.data.data;
        
        console.log("===== 基金数据到达前端 =====");
        console.log("基金名称:", fundData.fund_name);
        console.log("基金代码:", fundData.fund_code);
        console.log("==========================");
        
        setReportData(fundData);
        
        // 调用后端 LLM API 生成 AI 分析
        console.log("步骤 2: 调用 LLM 生成深度分析...");
        
        // 动态切换加载步骤话术
        const loadingSteps = [
          "🤖 正在从盈米 MCP 获取底层资产数据...",
          "🧠 正在穿透前十大重仓股的行业关联度...",
          "✍️ 正在基于 20 年投研经验撰写深度分析报告...",
        ];
        
        const stepInterval = setInterval(() => {
          setLoadingStepIndex((prev) => {
            const next = (prev + 1) % loadingSteps.length;
            setLoadingStage(loadingSteps[next]);
            return next;
          });
        }, 2500);
        
        try {
          const aiRes = await Taro.request({
            url: "https://fund-investment-master.seosamhnolan260.workers.dev/fund-report",
            method: "POST",
            data: { fund_code: fundData.fund_code },
            header: { "content-type": "application/json" },
          });
          
          console.log("LLM API 响应:", aiRes);
          
          if (aiRes.statusCode === 200 && aiRes.data?.success) {
            setAiAnalysis(aiRes.data.ai_analysis || "");
            console.log("AI 分析生成成功，长度:", aiRes.data.ai_analysis?.length);
          }
          
          clearInterval(stepInterval);
        } catch (aiErr) {
          console.error("AI 分析生成失败:", aiErr);
          clearInterval(stepInterval);
        } finally {
          setAiLoading(false);
        }
        
        Taro.showToast({ title: "研报生成成功", icon: "success" });
      } else {
        const errorMsg = res.data?.error || "未找到该基金，请检查代码是否正确";
        Taro.showModal({
          title: "查询失败",
          content: errorMsg,
          showCancel: false,
        });
      }
    } catch (err: any) {
      console.error("Search Error:", err);
      Taro.showModal({
        title: "网络错误",
        content: "请稍后重试或检查网络连接",
        showCancel: false,
      });
    } finally {
      setLoading(false);
      setLoadingStage("");
      Taro.hideLoading();
    }
  };

  // 生成完整版研报（如果 LLM 失败则使用本地模板）
  const generateFullReport = (data: any): string => {
    // 优先使用 LLM 生成的 AI 分析
    if (aiAnalysis) {
      return aiAnalysis;
    }
    
    // LLM 失败时使用本地模板（降级方案）
    const today = new Date().toLocaleDateString("zh-CN");
    
    return `# 基金深度研究报告

**报告日期：** ${today}  
**基金代码：** ${data.fund_code || "-"}  
**基金名称：** ${data.fund_name || "-"}  

---

## 一、基金基本信息

| 项目 | 内容 |
|------|------|
| 基金代码 | ${data.fund_code || "-"} |
| 基金名称 | ${data.fund_name || "-"} |
| 基金类型 | ${data.fund_type || "-"} |
| 单位净值 | ${data.net_value || "-"} |
| 日涨跌幅 | ${data.daily_growth || "-"} |
| 基金规模 | ${data.fund_scale || "-"} |

---

## 二、风险提示

1. **市场风险**：股市波动可能导致基金净值下跌
2. **流动性风险**：大额赎回可能影响基金运作
3. **管理风险**：基金经理变更可能影响投资策略

---

## 三、免责声明

本报告基于公开数据编制，仅供参考，不构成投资建议。基金有风险，投资需谨慎。

---

*数据来源：盈米 MCP*
`;
  };

  // 下载研报
  const handleDownloadReport = async () => {
    if (!reportData?.fund_code) {
      Taro.showToast({ title: "请先查询基金", icon: "none" });
      return;
    }

    setLoading(true);
    Taro.showLoading({ title: "正在生成研报...", mask: true });

    try {
      const markdown = generateFullReport(reportData);
      const fileName = `${reportData.fund_name}_${reportData.fund_code}_深度研究报告.md`;
      
      const fs = Taro.getFileSystemManager();
      const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath: filePath,
        data: markdown,
        encoding: "utf-8",
        success: () => {
          Taro.showModal({
            title: "✅ 研报已生成",
            content: `研报已保存到：${filePath}\n\n请在电脑桌面查看完整报告。`,
            showCancel: false,
          });
        },
        fail: (err) => {
          console.error("Save file error:", err);
          Taro.showModal({
            title: "❌ 保存失败",
            content: "请稍后重试",
            showCancel: false,
          });
        },
      });
    } catch (err: any) {
      console.error("Download Report Error:", err);
      Taro.showModal({
        title: "❌ 生成失败",
        content: err.message || "网络拥塞，请稍后再试",
        showCancel: false,
      });
    } finally {
      setLoading(false);
      Taro.hideLoading();
    }
  };

  return (
    <ScrollView className="page-container" scrollY>
      {/* 版本标识横幅 */}
      <View className="version-banner">
        🎉 V3.0 专业投研版 · 深度数据分析 · 合规化研报
      </View>

      {/* 主容器 - 双栏弹性布局 */}
      <View className="main-container">
        {/* 左侧边栏 - 搜索 */}
        <View className="sidebar-left">
          <Text className="sidebar-title">🔍 基金搜索</Text>
          
          <View className="search-box">
            <Input
              className="fund-input"
              value={code}
              onInput={(e) => setCode(e.detail.value)}
              placeholder="基金代码/名称"
              type="text"
              maxlength={10}
            />
            <Button className="search-btn" onClick={handleSearch} disabled={loading || aiLoading}>
              {loading ? "查询" : "查询"}
            </Button>
          </View>
          <Text className="search-hint">支持模糊搜索</Text>
          
          {/* 最近查询列表 */}
          <View className="fund-list">
            <Text className="fund-list-title">最近查询</Text>
          </View>
        </View>

        {/* 中间主内容区 */}
        <View className="main-content">
          {reportData && !loading ? (
            <View className="fade-in">
              {/* 基金信息卡片 */}
              <View className="info-card">
                <View className="card-header">
                  <View>
                    <Text className="fund-title">{reportData?.fund_name || "未知基金"}</Text>
                    <Text className="fund-subtitle">{reportData?.fund_code || ""} · {reportData?.fund_type || "-"} · {reportData?.risk_level || "R3"}</Text>
                  </View>
                  <View className="fund-badge">⭐ 五星</View>
                </View>
                
                <View className="stats-grid">
                  <View className="stat-item">
                    <Text className="stat-label">单位净值</Text>
                    <Text className="stat-value-large">{reportData?.net_value || "-"}</Text>
                  </View>
                  <View className="stat-item">
                    <Text className="stat-label">日涨跌幅</Text>
                    <Text className={`stat-value-large ${parseFloat(reportData?.daily_growth_rate || reportData?.daily_growth || 0) >= 0 ? "up" : "down"}`}>
                      {reportData?.daily_growth || "-"}
                    </Text>
                  </View>
                  <View className="stat-item">
                    <Text className="stat-label">基金规模</Text>
                    <Text className="stat-value-large">{reportData?.fund_scale || "-"}</Text>
                  </View>
                </View>
              </View>

              {/* 持仓分布 */}
              <PortfolioBar stocks={reportData?.asset_allocation || []} />

              {/* AI 研报 */}
              <AnalysisReport aiAnalysis={aiAnalysis} loading={aiLoading} />

              {/* 下载按钮 */}
              <Button 
                className="download-btn" 
                onClick={handleDownloadReport} 
                disabled={loading || aiLoading}
              >
                {aiLoading ? "AI 分析中..." : "📥 下载完整研报到桌面"}
              </Button>

              {/* 数据源标注 */}
              <View className="data-source">
                <Text>数据来源：盈米 MCP | {reportData?.nav_date || reportData?.data_date || "数据日期待更新"}</Text>
              </View>
            </View>
          ) : (
            /* 空状态 */
            <View className="empty-state-section">
              <Text className="empty-icon">🤖</Text>
              <Text className="empty-text">输入基金代码，AI 助你穿透底层资产</Text>
              <Text className="empty-hint">支持模糊搜索，如"华夏"或"000001"</Text>
            </View>
          )}
        </View>

        {/* 右侧边栏 - 操作与详情 */}
        <View className="sidebar-right">
          <View className="action-card">
            <Text className="action-title">快速操作</Text>
            <Button className="action-btn primary">📊 历史净值</Button>
            <Button className="action-btn">📈 业绩对比</Button>
            <Button className="action-btn">🔔 设置提醒</Button>
            <Button className="action-btn">📤 分享</Button>
          </View>
          
          {reportData && (
            <View className="action-card">
              <Text className="action-title">基金详情</Text>
              <View className="info-list">
                <View className="info-item">
                  <Text className="info-label">成立日期</Text>
                  <Text className="info-value">{reportData?.established_date || "-"}</Text>
                </View>
                <View className="info-item">
                  <Text className="info-label">管理人</Text>
                  <Text className="info-value">{reportData?.company || "-"}</Text>
                </View>
                <View className="info-item">
                  <Text className="info-label">托管人</Text>
                  <Text className="info-value">{reportData?.custodian || "-"}</Text>
                </View>
                <View className="info-item">
                  <Text className="info-label">管理费</Text>
                  <Text className="info-value">{reportData?.management_fee || "-"}</Text>
                </View>
                <View className="info-item">
                  <Text className="info-label">托管费</Text>
                  <Text className="info-value">{reportData?.custody_fee || "-"}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 大型 Loading 弹窗 */}
      <LoadingModal visible={aiLoading} stage={loadingStage} stepIndex={loadingStepIndex} />
    </ScrollView>
  );
};

export default IndexV2;
