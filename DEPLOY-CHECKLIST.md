# Phase 2 稳定版部署检查清单

**日期**: 2026-03-20  
**版本**: Phase 2 稳定版  
**状态**: 准备就绪

---

## ✅ 已完成配置

### 1. 路由配置
**文件**: `src/app.config.ts`

**配置**:
```typescript
export default defineAppConfig({
  pages: [
    'pages/index/index-v2', // Phase 2 稳定版（首页）
    'pages/index/index', // 旧版备份
    'pages/report/index'
  ],
  window: {
    navigationBarBackgroundColor: '#1c2a44', // 中信蓝
    navigationBarTitleText: '基金投资大师',
    navigationBarTextStyle: 'white'
  }
})
```

**状态**: ✅ 已完成

---

### 2. 目录结构

```
src/
├── components/
│   ├── RadarLoading/
│   │   ├── index.tsx ✅
│   │   └── index.scss ✅
│   ├── PortfolioBar/
│   │   ├── index.tsx ✅
│   │   └── index.scss ✅
│   └── AnalysisReport/
│       ├── index.tsx ✅
│       └── index.scss ✅
├── pages/
│   └── index/
│       ├── index-v2.tsx ✅
│       └── index.scss ✅
└── app.config.ts ✅
```

**状态**: ✅ 已完成

---

### 3. 样式配置

**文件**: `src/pages/index/index.scss`

**配色**:
- 中信蓝：`#1c2a44`
- 博时金：`#c5a368`
- 冷灰背景：`#f8fafc`

**状态**: ✅ 已完成

---

## 🧪 部署前测试清单

### 1. 静态资源检查

- [ ] Logo 图片是否上传 CDN
- [ ] 本地路径是否正确
- [ ] 图片在打包后是否丢失

**操作**:
```bash
# 检查图片引用
grep -r "import.*png\|import.*jpg" src/
```

---

### 2. 机型适配测试

**测试设备**:
- [ ] iPhone SE (小屏)
- [ ] iPhone 15 (标准屏)
- [ ] iPhone 15 Pro Max (大屏)
- [ ] Android 主流机型

**检查项**:
- [ ] 中信蓝卡片是否溢出
- [ ] 文字是否换行正常
- [ ] 按钮是否可点击

---

### 3. 空数据测试

**测试用例**:

| 输入 | 预期结果 | 状态 |
|------|----------|------|
| `999999` | 显示错误 Toast | ⏳ 待测试 |
| `000001` | 显示华夏成长 | ⏳ 待测试 |
| `000011` | 显示华夏大盘 | ⏳ 待测试 |
| 空输入 | 提示输入代码 | ⏳ 待测试 |

---

### 4. API 连通性测试

**命令**:
```bash
curl -X POST https://fund-investment-master.seosamhnolan260.workers.dev/fund-info \
  -H "Content-Type: application/json" \
  -d '{"code":"000001"}' | jq '.success'
```

**预期**: `true`

**状态**: ✅ 已验证

---

## 🚀 部署步骤

### 方案 A：Cloudflare Pages（推荐）

**步骤**:
1. 本地构建（如果环境支持）
   ```bash
   cd ~/.openclaw/workspace/projects/基金投资大师
   pnpm build
   ```

2. 上传到 GitHub
   ```bash
   git add .
   git commit -m "Phase 2 稳定版部署"
   git push origin main
   ```

3. Cloudflare Pages 自动部署
   - 访问 https://pages.cloudflare.com/
   - 选择项目
   - 查看部署状态

**预计时间**: 5-10 分钟

---

### 方案 B：本地测试

**步骤**:
1. 启动本地开发服务器
   ```bash
   cd ~/.openclaw/workspace/projects/基金投资大师
   pnpm dev:h5
   ```

2. 访问本地地址
   ```
   http://localhost:10086
   ```

3. 测试功能
   - 输入 `000001`
   - 点击查询
   - 验证 UI 和数据

**预计时间**: 2-3 分钟

---

## 📊 上线后验证

### 1. 访问测试

**URL**: `https://your-domain.com/`

**检查项**:
- [ ] 页面加载正常
- [ ] 中信蓝配色显示
- [ ] 搜索框可用
- [ ] 查询结果正常

### 2. 功能测试

| 功能 | 预期 | 状态 |
|------|------|------|
| 基金查询 | 显示数据 | ⏳ 待测试 |
| 持仓图表 | 显示柱状图 | ⏳ 待测试 |
| AI 研报 | 显示"暂无 AI 分析" | ⏳ 待测试 |
| 错误处理 | 显示 Toast | ⏳ 待测试 |

### 3. 性能测试

| 指标 | 目标 | 状态 |
|------|------|------|
| 首屏加载 | < 2 秒 | ⏳ 待测试 |
| API 响应 | < 3 秒 | ⏳ 待测试 |
| 图表渲染 | < 1 秒 | ⏳ 待测试 |

---

## 🎊 上线成功标志

- ✅ 首页显示中信蓝配色
- ✅ 基金查询正常
- ✅ 持仓图表显示
- ✅ 无控制台错误
- ✅ 移动端适配正常

---

## 📞 问题反馈

如果部署过程中遇到问题，请提供：
1. 错误截图
2. 控制台日志
3. Network 标签请求详情

---

**最后更新**: 2026-03-20 02:15  
**状态**: 准备就绪，等待部署
