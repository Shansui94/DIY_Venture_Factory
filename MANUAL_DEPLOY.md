# 手动部署指南 (Manual Deployment Guide)

由于命令行工具需要复杂的登录验证，最简单的 **手动部署** 方法是使用 **Netlify Drop** 功能。

## 第一步：确认构建文件
我已经为您运行了构建命令。请在您的项目文件夹中找到：
`C:\Users\User\.gemini\antigravity\playground\cobalt-rocket\dist`

这个 `dist` 文件夹包含了网站上线所需的所有文件 (HTML, CSS, JS)。

## 第二步：拖拽部署 (Drag & Drop)

1.  打开浏览器，访问 **[app.netlify.com/drop](https://app.netlify.com/drop)**。
    *   (如果您没有登录，它可能允许您作为匿名用户试用，或者需要您登录一下 Netlify 账号)。
2.  在网页上会看到一个 **"Drag and drop your site folder here"** 的区域。
3.  **将您的 `dist` 文件夹整个拖进去**。

## 第三步：完成
1.  松手后，Netlify 会自动上传并发布。
2.  几秒钟后，它会给您一个 **随机的网址** (例如 `https://nervous-curie-12345.netlify.app`)。
3.  点击该链接，您的应用就已经上线了！

---

## 备选方案：传统服务器
如果您有自己的服务器 (Nginx / Apache / IIS):
1.  将 `dist` 文件夹内的 **所有内容** 复制到服务器的 Web 根目录 (例如 `/var/www/html` 或 `C:\inetpub\wwwroot`)。
2.  确保服务器配置了 rewrite 规则以支持 SPA (Single Page Application)，即所有 404 请求都重定向回 `index.html`。
