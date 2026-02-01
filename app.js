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
    mainPanel: document.getElementById('mainPanel'),
    errorPanel: document.getElementById('errorPanel'),
    errorMessage: document.getElementById('errorMessage'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    retryBtn: document.getElementById('retryBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    todayBtn: document.getElementById('todayBtn'),
    monthSelect: document.getElementById('monthSelect'),
    totalIncome: document.getElementById('totalIncome'),
    totalExpense: document.getElementById('totalExpense'),
    netBalance: document.getElementById('netBalance'),
    detailsSection: document.getElementById('detailsSection'),
    incomeList: document.getElementById('incomeList'),
    expenseList: document.getElementById('expenseList'),
    noDataTip: document.getElementById('noDataTip')
};

// 初始化
function init() {
    bindEvents();
    loadFeishuData();
}

// 绑定事件
function bindEvents() {
    elements.retryBtn.addEventListener('click', loadFeishuData);
    elements.refreshBtn.addEventListener('click', loadFeishuData);
    elements.monthSelect.addEventListener('change', handleMonthChange);
    elements.todayBtn.addEventListener('click', selectCurrentMonth);
}

// 显示/隐藏面板
function showMainPanel() {
    elements.mainPanel.classList.remove('hidden');
    elements.errorPanel.classList.add('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorPanel.classList.remove('hidden');
    elements.mainPanel.classList.add('hidden');
}

// 显示/隐藏加载动画
function showLoading(text = '加载数据中...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

// 从飞书加载数据
async function loadFeishuData() {
    showLoading('从飞书加载数据...');

    try {
        const response = await fetch('/api/data');

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || '获取数据失败');
        }

        if (!result.data || result.data.length === 0) {
            throw new Error('飞书表格中没有数据');
        }

        allData = result.data;
        detectFields();
        populateMonthSelect();
        showMainPanel();
    } catch (error) {
        console.error('加载飞书数据失败:', error);
        showError('加载失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

// 自动检测字段名
function detectFields() {
    if (allData.length === 0) return;

    const firstRow = allData[0];
    const fields = Object.keys(firstRow);

    // 检测年月字段 - 查找格式为 "YYYY.MM" 的字段
    fieldNames.month = fields.find(f => {
        const value = firstRow[f];
        return value && /^\d{4}\.\d{2}$/.test(String(value));
    }) || fields.find(f => /月|month/i.test(f));

    // 检测收支类型字段
    fieldNames.type = fields.find(f => /类型|type|收支|分类/i.test(f));

    // 检测金额字段
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
            name: row[fieldNames.name] || '-',
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
