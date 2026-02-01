// Vercel Serverless Function
// 路径: /api/data

export default async function handler(req, res) {
    // 只允许 GET 请求
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 从环境变量读取配置
        const { FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_APP_TOKEN, FEISHU_TABLE_ID } = process.env;

        // 验证配置
        if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_APP_TOKEN) {
            return res.status(500).json({
                error: 'Server configuration error',
                message: '飞书 API 配置不完整，请检查 FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_APP_TOKEN'
            });
        }

        // 步骤1: 获取 tenant_access_token
        const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: FEISHU_APP_ID,
                app_secret: FEISHU_APP_SECRET
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.code !== 0) {
            throw new Error(`获取访问令牌失败: ${tokenData.msg}`);
        }

        const accessToken = tokenData.tenant_access_token;

        // 步骤2: 获取 table_id（如果没有配置）
        let tableId = FEISHU_TABLE_ID;

        if (!tableId) {
            // 获取多维表格下的所有工作表
            const tablesUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables`;
            const tablesResponse = await fetch(tablesUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const tablesData = await tablesResponse.json();

            if (tablesData.code !== 0) {
                throw new Error(`获取工作表列表失败: ${tablesData.msg}`);
            }

            if (!tablesData.data.items || tablesData.data.items.length === 0) {
                throw new Error('该多维表格中没有工作表');
            }

            // 使用第一个工作表
            tableId = tablesData.data.items[0].table_id;
            console.log(`自动使用工作表: ${tablesData.data.items[0].name} (${tableId})`);
        }

        // 步骤3: 获取所有表格数据（自动处理分页）
        let allRecords = [];
        let pageToken = '';
        const pageSize = 100;  // 每页最大数量

        do {
            let recordsUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${tableId}/records?page_size=${pageSize}`;
            if (pageToken) {
                recordsUrl += `&page_token=${encodeURIComponent(pageToken)}`;
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

            // 累积数据
            allRecords = allRecords.concat(recordsData.data.items);

            // 检查是否还有更多数据
            pageToken = recordsData.data.page_token || '';
            var hasMore = recordsData.data.has_more || false;

        } while (hasMore);

        // 步骤4: 返回所有数据
        const result = allRecords.map(item => item.fields);

        res.status(200).json({
            success: true,
            data: result,
            total: result.length,
            table_id: tableId
        });

    } catch (error) {
        console.error('获取飞书数据失败:', error);
        res.status(500).json({
            error: 'Failed to fetch data from Feishu',
            message: error.message
        });
    }
}
