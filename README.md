# 飞书多维表格数据图表

一个轻量级的网页应用，用于可视化飞书多维表格数据，支持在移动端浏览器访问。

## 功能特性

- 📊 支持柱状图、折线图、饼图
- 📱 移动端友好的响应式设计
- 📁 支持多种数据来源：
  - 上传 CSV 文件
  - 粘贴 JSON 数据
  - 飞书多维表格 API
- 💾 数据本地缓存，刷新不丢失
- 📋 原始数据表格展示

## 部署到 GitHub Pages

### 1. 创建 GitHub 仓库

```bash
git init
git add .
git commit -m "Initial commit"
```

然后在 GitHub 上创建一个新仓库，然后：

```bash
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

### 2. 启用 GitHub Pages

1. 进入仓库的 **Settings** → **Pages**
2. 在 **Source** 下选择 **Deploy from a branch**
3. 选择 **main** 分支和 **/ (root)** 目录
4. 点击 **Save**

### 3. 配置自定义域名

如果你有域名 `nn.leige.site`：

1. 在你的域名 DNS 设置中添加 CNAME 记录：
   ```
   nn.leige.site  ->  你的用户名.github.io
   ```

2. 在仓库根目录创建 `CNAME` 文件：
   ```
   nn.leige.site
   ```

3. 在 GitHub Pages 设置中输入自定义域名

### 4. 等待部署

几分钟后，你的网站就可以通过 `https://nn.leige.site` 访问了。

## 使用方法

### 方式一：上传 CSV 文件

1. 从飞书多维表格导出 CSV
2. 在网页中选择「上传 CSV 文件」
3. 选择文件或直接拖拽

### 方式二：粘贴 JSON 数据

```json
[
  {"日期": "2024-01-01", "销售额": 1000},
  {"日期": "2024-01-02", "销售额": 1500}
]
```

### 方式三：连接飞书多维表格

1. 在 [飞书开放平台](https://open.feishu.cn) 创建应用
2. 获取凭证：
   - App ID
   - App Secret
   - App Token（从表格链接获取）
   - Table ID（从表格链接获取）
3. 在网页中填写这些信息

**注意**：由于浏览器的 CORS 限制，飞书 API 调用需要通过代理服务器。本项目使用公共 CORS 代理仅供测试，生产环境建议：

- 搭建自己的后端代理服务
- 使用 Cloudflare Workers
- 使用 Vercel Serverless Functions

## 获取飞书多维表格信息

从多维表格链接中获取参数：

```
https://example.feishu.cn/base/{app_token}/objects/{table_id}
```

- `app_token`: 路径中的第一段
- `table_id`: 路径中的第二段

## 技术栈

- 纯 HTML/CSS/JavaScript
- [ECharts](https://echarts.apache.org/) - 图表库
- [PapaParse](https://www.papaparse.com/) - CSV 解析

## 本地开发

直接用浏览器打开 `index.html` 即可，无需安装依赖。

或使用本地服务器：

```bash
# Python
python -m http.server 8000

# Node.js (需要安装 http-server)
npx http-server
```

然后访问 `http://localhost:8000`

## License

MIT
