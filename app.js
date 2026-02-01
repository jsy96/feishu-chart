// 全局状态
let currentData = [];
let currentChart = null;

// DOM 元素
const elements = {
    // 面板
    dataSourcePanel: document.getElementById('dataSourcePanel'),
    csvPanel: document.getElementById('csvPanel'),
    jsonPanel: document.getElementById('jsonPanel'),
    feishuPanel: document.getElementById('feishuPanel'),
    chartPanel: document.getElementById('chartPanel'),
    loadingOverlay: document.getElementById('loadingOverlay'),

    // 按钮
    settingsBtn: document.getElementById('settingsBtn'),
    backBtn: document.getElementById('backBtn'),
    backFromJsonBtn: document.getElementById('backFromJsonBtn'),
    backFromFeishuBtn: document.getElementById('backFromFeishuBtn'),
    loadJsonBtn: document.getElementById('loadJsonBtn'),
    loadFeishuBtn: document.getElementById('loadFeishuBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    changeDataBtn: document.getElementById('changeDataBtn'),

    // 选项按钮
    optionBtns: document.querySelectorAll('.option-btn'),

    // 输入
    csvFileInput: document.getElementById('csvFileInput'),
    jsonInput: document.getElementById('jsonInput'),

    // 图表控制
    chartType: document.getElementById('chartType'),
    xAxisField: document.getElementById('xAxisField'),
    yAxisField: document.getElementById('yAxisField'),
    chart: document.getElementById('chart'),
    dataTable: document.getElementById('dataTable'),
    dataTableContent: document.getElementById('dataTableContent')
};

// 初始化
function init() {
    loadSavedConfig();
    bindEvents();
}

// 加载保存的配置
function loadSavedConfig() {
    // 飞书配置现在在服务器端，前端不需要保存

    // 检查是否有保存的数据
    const savedData = localStorage.getItem(CONFIG.storageKeys.lastData);
    if (savedData) {
        try {
            currentData = JSON.parse(savedData);
            showChartPanel();
        } catch (e) {
            console.error('加载保存的数据失败:', e);
        }
    }
}

// 绑定事件
function bindEvents() {
    // 数据来源选择
    elements.optionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const source = btn.dataset.source;
            switchPanel(`${source}Panel`);
        });
    });

    // 返回按钮
    elements.backBtn.addEventListener('click', () => showPanel('dataSourcePanel'));
    elements.backFromJsonBtn.addEventListener('click', () => showPanel('dataSourcePanel'));
    elements.backFromFeishuBtn.addEventListener('click', () => showPanel('dataSourcePanel'));

    // CSV 上传
    elements.csvFileInput.addEventListener('change', handleCsvUpload);

    // JSON 加载
    elements.loadJsonBtn.addEventListener('click', handleJsonInput);

    // 飞书加载
    elements.loadFeishuBtn.addEventListener('click', handleFeishuLoad);

    // 图表控制
    elements.refreshBtn.addEventListener('click', renderChart);
    elements.changeDataBtn.addEventListener('click', () => showPanel('dataSourcePanel'));

    // 拖拽上传
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.addEventListener('click', () => elements.csvFileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            parseCsvFile(file);
        }
    });
}

// 显示/隐藏面板
function showPanel(panelId) {
    elements.dataSourcePanel.classList.add('hidden');
    elements.csvPanel.classList.add('hidden');
    elements.jsonPanel.classList.add('hidden');
    elements.feishuPanel.classList.add('hidden');
    elements.chartPanel.classList.add('hidden');

    elements[panelId].classList.remove('hidden');
}

function switchPanel(panelId) {
    showPanel(panelId);
}

function showChartPanel() {
    showPanel('chartPanel');
    populateFieldSelectors();
    renderChart();
}

// 显示/隐藏加载动画
function showLoading(show = true) {
    if (show) {
        elements.loadingOverlay.classList.remove('hidden');
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

// 处理 CSV 上传
function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (file) {
        parseCsvFile(file);
    }
}

function parseCsvFile(file) {
    showLoading(true);
    Papa.parse(file, {
        header: true,
        complete: function(results) {
            currentData = results.data.filter(row => Object.values(row).some(v => v));
            saveData();
            showChartPanel();
            showLoading(false);
        },
        error: function(error) {
            alert('CSV 解析失败: ' + error.message);
            showLoading(false);
        }
    });
}

// 处理 JSON 输入
function handleJsonInput() {
    const jsonStr = elements.jsonInput.value.trim();
    if (!jsonStr) {
        alert('请输入 JSON 数据');
        return;
    }

    try {
        currentData = JSON.parse(jsonStr);
        if (!Array.isArray(currentData)) {
            throw new Error('数据必须是数组格式');
        }
        saveData();
        showChartPanel();
    } catch (e) {
        alert('JSON 格式错误: ' + e.message);
    }
}

// 处理飞书数据加载
async function handleFeishuLoad() {
    showLoading(true);

    try {
        // 调用后端 API（密钥保存在服务器端，安全！）
        const apiUrl = CONFIG.apiUrl || '/api/data';
        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '请求失败');
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || '获取数据失败');
        }

        currentData = result.data;
        saveData();
        showChartPanel();
    } catch (error) {
        alert('加载飞书数据失败: ' + error.message);
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// 保存数据到本地存储
function saveData() {
    try {
        localStorage.setItem(CONFIG.storageKeys.lastData, JSON.stringify(currentData));
    } catch (e) {
        console.warn('数据太大，无法保存到本地存储:', e);
    }
}

// 填充字段选择器
function populateFieldSelectors() {
    if (currentData.length === 0) return;

    const fields = Object.keys(currentData[0]);

    elements.xAxisField.innerHTML = '<option value="">选择 X 轴字段</option>';
    elements.yAxisField.innerHTML = '<option value="">选择 Y 轴字段</option>';

    fields.forEach(field => {
        elements.xAxisField.innerHTML += `<option value="${field}">${field}</option>`;
        elements.yAxisField.innerHTML += `<option value="${field}">${field}</option>`;
    });

    // 自动选择合理的默认值
    const numericFields = fields.filter(f =>
        currentData.some(row => !isNaN(parseFloat(row[f]))
    );

    const stringFields = fields.filter(f =>
        currentData.some(row => isNaN(parseFloat(row[f]))
    );

    if (stringFields.length > 0) {
        elements.xAxisField.value = stringFields[0];
    }
    if (numericFields.length > 0) {
        elements.yAxisField.value = numericFields[0];
    }
}

// 渲染图表
function renderChart() {
    if (currentData.length === 0) return;

    const chartType = elements.chartType.value;
    const xField = elements.xAxisField.value;
    const yField = elements.yAxisField.value;

    if (!xField || !yField) {
        alert('请选择 X 轴和 Y 轴字段');
        return;
    }

    // 准备图表数据
    const chartData = prepareChartData(xField, yField);

    // 销毁旧图表
    if (currentChart) {
        currentChart.dispose();
    }

    // 创建新图表
    currentChart = echarts.init(elements.chart);

    // 配置选项
    const option = getChartOption(chartType, chartData, xField, yField);
    currentChart.setOption(option);

    // 响应式
    window.addEventListener('resize', () => currentChart.resize());

    // 显示数据表格
    renderDataTable();
}

// 准备图表数据
function prepareChartData(xField, yField) {
    const labels = [];
    const values = [];

    currentData.forEach(row => {
        const xValue = row[xField];
        const yValue = parseFloat(row[yField]) || 0;

        labels.push(xValue);
        values.push(yValue);
    });

    return { labels, values };
}

// 获取图表配置
function getChartOption(type, data, xLabel, yLabel) {
    const baseOption = {
        tooltip: {
            trigger: type === 'pie' ? 'item' : 'axis'
        },
        legend: {
            type: 'scroll',
            bottom: 0
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '10%',
            containLabel: true
        }
    };

    if (type === 'pie') {
        return {
            ...baseOption,
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)'
            },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                data: data.labels.map((label, i) => ({
                    name: label,
                    value: data.values[i]
                })),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
    }

    // 柱状图和折线图
    return {
        ...baseOption,
        xAxis: {
            type: 'category',
            data: data.labels,
            axisLabel: {
                interval: 0,
                rotate: data.labels.length > 10 ? 45 : 0
            }
        },
        yAxis: {
            type: 'value',
            name: yLabel
        },
        series: [{
            type: type,
            data: data.values,
            itemStyle: {
                color: type === 'bar' ? '#3370ff' : undefined
            },
            smooth: type === 'line',
            areaStyle: type === 'line' ? { opacity: 0.3 } : undefined
        }]
    };
}

// 渲染数据表格
function renderDataTable() {
    if (currentData.length === 0) return;

    const fields = Object.keys(currentData[0]);

    let html = '<thead><tr>';
    fields.forEach(field => {
        html += `<th>${field}</th>`;
    });
    html += '</tr></thead><tbody>';

    currentData.forEach(row => {
        html += '<tr>';
        fields.forEach(field => {
            html += `<td>${row[field] || ''}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody>';

    elements.dataTableContent.innerHTML = html;
    elements.dataTable.classList.remove('hidden');
}

// 启动应用
init();
