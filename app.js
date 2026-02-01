// 全局状态
let allData = [];

// 字段名配置（自动识别）
let fieldNames = {
    month: null,    // 年月字段，如 "2025.08"
    type: null,     // 收支类型字段：收入/支出
    amount: null,   // 金额字段
    name: null,     // 名称/描述字段
    date: null      // 日期字段（可选）
};

// DOM 元素
const elements = {
    // 面板
    dataSourcePanel: document.getElementById('dataSourcePanel'),
    csvPanel: document.getElementById('csvPanel'),
    mainPanel: document.getElementById('mainPanel'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),

    // 按钮
    refreshBtn: document.getElementById('refreshBtn'),
    backBtn: document.getElementById('backBtn'),
    changeDataBtn: document.getElementById('changeDataBtn'),
    todayBtn: document.getElementById('todayBtn'),

    // 选项按钮
    optionBtns: document.querySelectorAll('.option-btn'),

    // 输入
    csvFileInput: document.getElementById('csvFileInput'),

    // 月份和统计
    monthSelect: document.getElementById('monthSelect'),
    totalIncome: document.getElementById('totalIncome'),
    totalExpense: document.getElementById('totalExpense'),
    netBalance: document.getElementById('netBalance'),

    // 明细列表
    detailsSection: document.getElementById('detailsSection'),
    incomeList: document.getElementById('incomeList'),
    expenseList: document.getElementById('expenseList'),
    noDataTip: document.getElementById('noDataTip')
};

// 初始化
function init() {
    loadSavedData();
    bindEvents();
}

// 加载保存的数据
function loadSavedData() {
    const savedData = localStorage.getItem('feishu_chart_data');
    if (savedData) {
        try {
            allData = JSON.parse(savedData);
            if (allData.length > 0) {
                detectFields();
                populateMonthSelect();
                showMainPanel();
            }
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
            if (source === 'csv') {
                showPanel('csvPanel');
            } else if (source === 'feishu') {
                loadFeishuData();
            }
        });
    });

    // 返回按钮
    elements.backBtn.addEventListener('click', () => showPanel('dataSourcePanel'));
    elements.changeDataBtn.addEventListener('click', () => showPanel('dataSourcePanel'));

    // 刷新按钮
    elements.refreshBtn.addEventListener('click', () => {
        if (localStorage.getItem('feishu_chart_data')) {
            loadFeishuData();
        }
    });

    // CSV 上传
    elements.csvFileInput.addEventListener('change', handleCsvUpload);

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

    // 月份选择
    elements.monthSelect.addEventListener('change', handleMonthChange);

    // 当前月按钮
    elements.todayBtn.addEventListener('click', selectCurrentMonth);
}

// 显示/隐藏面板
function showPanel(panelId) {
    elements.dataSourcePanel.classList.add('hidden');
    elements.csvPanel.classList.add('hidden');
    elements.mainPanel.classList.add('hidden');

    elements[panelId].classList.remove('hidden');
}

function showMainPanel() {
    showPanel('mainPanel');
}

// 显示/隐藏加载动画
function showLoading(text = '加载数据中...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

// 处理 CSV 上传
function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (file) {
        parseCsvFile(file);
    }
}

function parseCsvFile(file) {
    showLoading('解析 CSV 文件...');

    Papa.parse(file, {
        header: true,
        complete: function(results) {
            allData = results.data.filter(row => Object.values(row).some(v => v && v.trim()));
            saveData();
            detectFields();
            populateMonthSelect();
            showMainPanel();
            hideLoading();
        },
        error: function(error) {
            alert('CSV 解析失败: ' + error.message);
            hideLoading();
        }
    });
}

// 加载飞书数据
async function loadFeishuData() {
    showLoading('从飞书加载数据...');

    try {
        const response = await fetch('/api/data');

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '请求失败');
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || '获取数据失败');
        }

        allData = result.data;
        saveData();
        detectFields();
        populateMonthSelect();
        showMainPanel();
    } catch (error) {
        alert('加载飞书数据失败: ' + error.message);
        console.error(error);
        showPanel('dataSourcePanel');
    } finally {
        hideLoading();
    }
}

// 保存数据到本地存储
function saveData() {
    try {
        localStorage.setItem('feishu_chart_data', JSON.stringify(allData));
    } catch (e) {
        console.warn('数据太大，无法保存到本地存储:', e);
    }
}

// 自动检测字段名
function detectFields() {
    if (allData.length === 0) return;

    const firstRow = allData[0];
    const fields = Object.keys(firstRow);

    // 检测年月字段 - 查找包含 "月" 或 "month" 或格式为 "YYYY.MM" 的字段
    fieldNames.month = fields.find(f => {
        const value = firstRow[f];
        return value && /^\d{4}\.\d{2}$/.test(String(value));
    }) || fields.find(f => /月|month/i.test(f));

    // 检测收支类型字段 - 查找包含 "类型"、"type"、"收支" 等的字段
    fieldNames.type = fields.find(f => /类型|type|收支|分类/i.test(f));

    // 检测金额字段 - 查找数值类型的字段
    fieldNames.amount = fields.find(f => {
        const value = parseFloat(firstRow[f]);
        return !isNaN(value) && /金额|amount|价格|price|元/i.test(f);
    }) || fields.find(f => !isNaN(parseFloat(firstRow[f])) && f !== fieldNames.month);

    // 检测名称字段
    fieldNames.name = fields.find(f => /名称|name|描述|desc|备注|项目/i.test(f)) ||
                       fields.find(f => f !== fieldNames.month && f !== fieldNames.type && f !== fieldNames.amount);

    // 检测日期字段（可选）
    fieldNames.date = fields.find(f => /日期|date|时间|time/i.test(f));

    console.log('检测到的字段:', fieldNames);
}

// 填充月份下拉框
function populateMonthSelect() {
    if (allData.length === 0) return;

    // 获取所有唯一的月份
    const months = [...new Set(allData.map(row => {
        const value = row[fieldNames.month];
        return value ? String(value).trim() : '';
    }).filter(v => v))].sort().reverse();

    elements.monthSelect.innerHTML = '<option value="">请选择月份</option>';
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        elements.monthSelect.appendChild(option);
    });

    // 默认选择最新的月份
    if (months.length > 0) {
        elements.monthSelect.value = months[0];
        handleMonthChange();
    }
}

// 选择当前月
function selectCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}.${month}`;

    // 查找是否有当前月的数据
    const hasCurrentMonth = Array.from(elements.monthSelect.options)
        .some(opt => opt.value === currentMonth);

    if (hasCurrentMonth) {
        elements.monthSelect.value = currentMonth;
        handleMonthChange();
    } else {
        alert('暂无当前月的数据');
    }
}

// 处理月份变化
function handleMonthChange() {
    const selectedMonth = elements.monthSelect.value;
    if (!selectedMonth) {
        clearDisplay();
        return;
    }

    // 过滤该月份的数据
    const monthData = allData.filter(row => {
        const value = row[fieldNames.month];
        return value && String(value).trim() === selectedMonth;
    });

    // 分类收入和支出
    const incomeItems = [];
    const expenseItems = [];

    monthData.forEach(row => {
        const amount = parseFloat(row[fieldNames.amount]) || 0;
        const type = String(row[fieldNames.type] || '').trim();

        // 判断是收入还是支出
        const isIncome = amount > 0 && (type.includes('收入') || type === '收' || type === '+');
        const isExpense = amount > 0 && (type.includes('支出') || type === '支' || type === '-');

        const item = {
            name: row[fieldNames.name] || row[fieldNames.amount] || '-',
            amount: amount,
            date: fieldNames.date ? (row[fieldNames.date] || '') : ''
        };

        if (isIncome) {
            incomeItems.push(item);
        } else if (isExpense) {
            expenseItems.push(item);
        }
    });

    // 计算汇总
    const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
    const netBalance = totalIncome - totalExpense;

    // 更新显示
    updateSummary(totalIncome, totalExpense, netBalance);
    updateDetails(incomeItems, expenseItems);
}

// 更新汇总显示
function updateSummary(income, expense, balance) {
    elements.totalIncome.textContent = formatCurrency(income);
    elements.totalExpense.textContent = formatCurrency(expense);
    elements.netBalance.textContent = formatCurrency(balance);

    // 净收支颜色
    if (balance > 0) {
        elements.netBalance.style.color = 'var(--income-color)';
    } else if (balance < 0) {
        elements.netBalance.style.color = 'var(--expense-color)';
    } else {
        elements.netBalance.style.color = 'var(--text-primary)';
    }
}

// 更新明细列表
function updateDetails(incomeItems, expenseItems) {
    // 清空列表
    elements.incomeList.innerHTML = '';
    elements.expenseList.innerHTML = '';

    if (incomeItems.length === 0 && expenseItems.length === 0) {
        elements.detailsSection.classList.add('hidden');
        elements.noDataTip.classList.remove('hidden');
        return;
    }

    elements.detailsSection.classList.remove('hidden');
    elements.noDataTip.classList.add('hidden');

    // 显示收入明细
    incomeItems.forEach(item => {
        const card = createItemCard(item, 'income');
        elements.incomeList.appendChild(card);
    });

    // 显示支出明细
    expenseItems.forEach(item => {
        const card = createItemCard(item, 'expense');
        elements.expenseList.appendChild(card);
    });
}

// 创建明细卡片
function createItemCard(item, type) {
    const card = document.createElement('div');
    card.className = `item-card ${type}`;

    const info = document.createElement('div');
    info.className = 'item-info';

    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = item.name;

    const date = document.createElement('div');
    date.className = 'item-date';
    date.textContent = item.date || ' ';

    info.appendChild(name);
    info.appendChild(date);

    const amount = document.createElement('div');
    amount.className = 'item-amount';
    amount.textContent = formatCurrency(item.amount);

    card.appendChild(info);
    card.appendChild(amount);

    return card;
}

// 清空显示
function clearDisplay() {
    elements.totalIncome.textContent = '¥0.00';
    elements.totalExpense.textContent = '¥0.00';
    elements.netBalance.textContent = '¥0.00';
    elements.detailsSection.classList.add('hidden');
    elements.noDataTip.classList.remove('hidden');
}

// 格式化金额
function formatCurrency(amount) {
    return '¥' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 启动应用
init();
