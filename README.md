# 飞书多维表格数据图表

一个轻量级的网页应用，用于可视化飞书多维表格数据，支持在移动端浏览器访问。

**安全设计**：飞书 API 密钥存储在后端环境变量中，前端不会暴露任何敏感信息。

## 功能特性

- 📊 支持柱状图、折线图、饼图
- 📱 移动端友好的响应式设计
- 🔒 密钥安全存储在后端（不暴露在前端）
- 📁 支持多种数据来源：
  - 上传 CSV 文件
  - 粘贴 JSON 数据
  - 飞书多维表格 API
- 💾 数据本地缓存，刷新不丢失
- 📋 原始数据表格展示

## 安全架构

```
前端网页 (无密钥)
    ↓
Vercel Serverless Function (持有环境变量中的密钥)
    ↓
飞书 API
```

| 环境 | 密钥存储位置 |
|------|-------------|
| 本地开发 | `.env` 文件（不提交到 Git） |
| Vercel 部署 | 环境变量 |

## 部署到 Vercel

### 1. 准备工作

```bash
# 安装 Vercel CLI（可选）
npm i -g vercel
```

### 2. 推送到 GitHub

```bash
git add .
git commit -m "Add Vercel serverless function"
git push origin main
```

### 3. 在 Vercel 部署

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 **Import Project** → 选择你的 GitHub 仓库
3. 配置环境变量：

| 名称 | 值 |
|------|-----|
| `FEISHU_APP_ID` | cli_xxxxxxxxxxxxx |
| `FEISHU_APP_SECRET` | xxxxxxxxxxxxxxxx |
| `FEISHU_APP_TOKEN` | app_xxxxxxxxxxxxx |
| `FEISHU_TABLE_ID` | tbl_xxxxxxxxxxxxx |

4. 点击 **Deploy**

### 4. 配置自定义域名

1. 在 Vercel 项目设置中添加域名 `nn.leige.site`
2. 在你的 DNS 设置中添加 CNAME 记录：
   ```
   nn  CNAME  cname.vercel-dns.com
   ```

## 获取飞书 API 凭证

### 1. 创建飞书应用

访问 [飞书开放平台](https://open.feishu.cn) → 创建应用

### 2. 获取 App ID 和 App Secret

在应用管理页面获取：
- **App ID**
- **App Secret**

### 3. 获取 App Token 和 Table ID

从飞书多维表格链接中提取：

```
https://xxx.feishu.cn/base/{app_token}/objects/{table_id}
```

- `app_token`: 路径中的 `app_xxxxx` 部分
- `table_id`: 路径中的 `tbl_xxxxx` 部分

### 4. 开启权限

在飞书开放平台的应用权限管理中，确保开启：
- `bitable:app` - 读取多维表格权限

## 本地开发

### 方式一：纯前端（无飞书功能）

直接用浏览器打开 `index.html`

### 方式二：使用本地服务器（支持飞书功能）

```bash
# 安装依赖
npm install

# 创建 .env 文件（参考 .env.example）
cp .env.example .env

# 编辑 .env 填入飞书凭证
FEISHU_APP_ID=你的App ID
FEISHU_APP_SECRET=你的App Secret
FEISHU_APP_TOKEN=你的App Token
FEISHU_TABLE_ID=你的Table ID

# 启动开发服务器
npm run dev

# 或使用 Vercel 本地开发
vercel dev
```

访问 `http://localhost:3000`

## 使用方法

### 上传 CSV 文件

1. 从飞书多维表格导出 CSV
2. 在网页中选择「上传 CSV 文件」
3. 选择文件或直接拖拽

### 粘贴 JSON 数据

```json
[
  {"日期": "2024-01-01", "销售额": 1000},
  {"日期": "2024-01-02", "销售额": 1500}
]
```

### 飞书多维表格

点击「飞书多维表格」→ 「从飞书加载数据」，数据会从后端 API 自动获取。

## 项目结构

```
feishu-chart/
├── api/
│   └── data.js          # Vercel Serverless Function
├── index.html           # 前端页面
├── style.css            # 样式
├── app.js               # 前端逻辑
├── config.js            # 配置
├── vercel.json          # Vercel 配置
├── .env.example         # 环境变量示例
├── server.js            # 本地开发服务器（可选）
└── package.json         # 依赖
```

## 技术栈

- **前端**: HTML/CSS/JavaScript
- **图表**: [ECharts](https://echarts.apache.org/)
- **CSV 解析**: [PapaParse](https://www.papaparse.com/)
- **部署**: [Vercel](https://vercel.com/)

## License

MIT
