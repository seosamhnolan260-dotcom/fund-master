const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // 设置为 iPhone 尺寸
    await page.setViewportSize({ width: 375, height: 812 });
    
    // 打开 HTML 文件
    await page.goto('file://' + process.cwd() + '/ui-design-preview.html');
    
    // 等待页面加载
    await page.waitForTimeout(1000);
    
    // 截图保存到桌面
    await page.screenshot({ 
        path: '/Users/jun15prolan/Desktop/基金投资大师-UI 设计稿 - 现代简约.png',
        fullPage: true
    });
    
    await browser.close();
    console.log('✅ 截图已保存到桌面！');
})();
