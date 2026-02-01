/**
 * 后端代理服务器
 * 隐藏飞书 API 密钥，前端通过此接口获取数据
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 飞书 API 配置
const FEISHU_CONFIG = {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    appToken: process.env.FEISHU_APP_TOKEN,
    tableId: process.env.FEISHU_TABLE_ID
};

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取飞书数据接口
app.get('/api/feishu/data', async (req, res) => {
    try {
        // 验证配置
        if (!FEISHU_CONFIG.appId || !FEISHU_CONFIG.appSecret ||
            !FEISHU_CONFIG.appToken || !FEISHU_CONFIG.tableId) {
            return res.status(500).json({
                error: 'Server configuration error',
                message: '飞书 API 配置不完整，请检查环境变量'
            });
        }

        // 步骤1: 获取 tenant_access_token
        const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: FEISHU_CONFIG.appId,
                app_secret: FEISHU_CONFIG.appSecret
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.code !== 0) {
            throw new Error(`获取访问令牌失败: ${tokenData.msg}`);
        }

        const accessToken = tokenData.tenant_access_token;

        // 步骤2: 获取表格数据
        const recordsUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.tableId}/records`;

        const recordsResponse = await fetch(recordsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const recordsData = await recordsResponse.json();

        if (recordsData.code !== 0) {
            throw new Error(`获取表格数据失败: ${recordsData.msg}`);
        }

        // 步骤3: 转换数据格式并返回
        const result = recordsData.data.items.map(item => item.fields);

        res.json({
            success: true,
            data: result,
            total: result.length
        });

    } catch (error) {
        console.error('获取飞书数据失败:', error);
        res.status(500).json({
            error: 'Failed to fetch data from Feishu',
            message: error.message
        });
    }
});

// 支持分页查询
app.get('/api/feishu/data/paginated', async (req, res) => {
    try {
        const pageToken = req.query.page_token;
        const pageSize = parseInt(req.query.page_size) || 100;

        if (!FEISHU_CONFIG.appId || !FEISHU_CONFIG.appSecret ||
            !FEISHU_CONFIG.appToken || !FEISHU_CONFIG.tableId) {
            return res.status(500).json({
                error: 'Server configuration error'
            });
        }

        // 获取 token
        const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: FEISHU_CONFIG.appId,
                app_secret: FEISHU_CONFIG.appSecret
            })
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.code !== 0) {
            throw new Error(`获取访问令牌失败: ${tokenData.msg}`);
        }

        const accessToken = tokenData.tenant_access_token;

        // 构建查询 URL
        let recordsUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.tableId}/records?page_size=${pageSize}`;
        if (pageToken) {
            recordsUrl += `&page_token=${pageToken}`;
        }

        const recordsResponse = await fetch(recordsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const recordsData = await recordsResponse.json();

        if (recordsData.code !== 0) {
            throw new Error(`获取表格数据失败: ${recordsData.msg}`);
        }

        const result = recordsData.data.items.map(item => item.fields);

        res.json({
            success: true,
            data: result,
            total: recordsData.data.total,
            page_token: recordsData.data.page_token,
            has_more: recordsData.data.has_more
        });

    } catch (error) {
        console.error('获取飞书数据失败:', error);
        res.status(500).json({
            error: 'Failed to fetch data from Feishu',
            message: error.message
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  - GET  /api/health`);
    console.log(`  - GET  /api/feishu/data`);
    console.log(`  - GET  /api/feishu/data/paginated`);
});
