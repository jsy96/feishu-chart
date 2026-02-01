// 配置文件 - 可以在这里修改默认设置

const CONFIG = {
    // 飞书 API 配置（可选在这里填写，或在界面上输入）
    feishu: {
        appId: '',
        appSecret: '',
        appToken: '',
        tableId: ''
    },

    // 默认图表设置
    chart: {
        defaultType: 'bar',
        theme: 'default',
        animation: true
    },

    // 本地存储键名
    storageKeys: {
        feishuConfig: 'feishu_config',
        lastData: 'last_data'
    }
};
