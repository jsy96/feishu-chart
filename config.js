// 配置文件 - 可以在这里修改默认设置

const CONFIG = {
    // 后端 API 地址（部署时自动使用相对路径 /api/data）
    // 本地开发时可以设置为: 'http://localhost:3000/api/data'
    apiUrl: '',

    // 默认图表设置
    chart: {
        defaultType: 'bar',
        theme: 'default',
        animation: true
    },

    // 本地存储键名
    storageKeys: {
        lastData: 'last_data'
    }
};
