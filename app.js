// 全局状态
let allData = [];
let currentMonth = '';  // 当前显示的月份
let availableMonths = [];  // 可用的月份列表

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
    prevMonthBtn: document.getElementById('prevMonthBtn'),
    nextMonthBtn: document.getElementById('nextMonthBtn'),
    currentMonthDisplay: document.getElementById('currentMonthDisplay'),
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
    elements.monthSelect.addEventListener('change', handleMonthSelectChange);
    elements.prevMonthBtn.addEventListener('click', goToPrevMonth);
    elements.nextMonthBtn.addEventListener('click', goToNextMonth);
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

    // 检测收支类型字段（类别、类型、收支等）
    fieldNames.type = fields.find(f => /类别|类型|type|收支|分类/i.test(f));

    // 检测金额字段
    fieldNames.amount = fields.find(f => {
        const value = parseFloat(firstRow[f]);
        return !isNaN(value) && /金额|amount|价格|price|元/i.test(f);
    }) || fields.find(f => !isNaN(parseFloat(firstRow[f])) && f !== fieldNames.month);

    // 检测名称字段（项目、名称等）
    fieldNames.name = fields.find(f => /项目|名称|name|描述|desc/i.test(f)) ||
                       fields.find(f => f !== fieldNames.month && f !== fieldNames.type && f !== fieldNames.amount);

    // 检测日期字段（可选）
    fieldNames.date = fields.find(f => /日期|date|时间|time/i.test(f));

    console.log('检测到的字段:', fieldNames);
}

// 格式化月份为 YYYY.MM 格式（月份补零）
function formatMonth(monthStr) {
    const parts = monthStr.split('.');
    if (parts.length === 2) {
        const year = parts[0];
        let month = parts[1];
        // 补零到两位
        let paddedMonth = month.padStart(2, '0');
        const result = `${year}.${paddedMonth}`;
        console.log(`formatMonth: ${monthStr} -> ${result}`);
        return result;
    }
    return monthStr;
}

// 填充月份下拉框
function populateMonthSelect() {
    if (allData.length === 0) return;

    // 调试：打印原始数据中的月份值
    const rawMonths = allData.map(row => row[fieldNames.month]);
    console.log('原始月份数据:', rawMonths);

    // 使用数字方法解析月份：年.月 ×100 四舍五入
    const monthSet = new Set();

    allData.forEach(row => {
        const value = row[fieldNames.month];
        if (!value) return;
        const rawValue = String(value).trim();

        const parts = rawValue.split('.');
        if (parts.length === 2) {
            const numValue = parseFloat(rawValue);
            if (!isNaN(numValue)) {
                // ×100 四舍五入
                const rounded = Math.round(numValue * 100);
                // 后两位是月份，前几位是年份
                const year = Math.floor(rounded / 100);
                const month = rounded % 100;
                const formatted = `${year}.${String(month).padStart(2, '0')}`;
                monthSet.add(formatted);
            }
        } else {
            // 格式不符，直接使用
            monthSet.add(rawValue);
        }
    });

    availableMonths = Array.from(monthSet).sort();
    console.log('格式化后的月份列表:', availableMonths);

    // 只显示到当前月为止
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
    availableMonths = availableMonths.filter(m => m <= currentYearMonth);

    elements.monthSelect.innerHTML = '<option value="">请选择月份</option>';
    availableMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        elements.monthSelect.appendChild(option);
    });

    // 默认显示当前月
    selectCurrentMonth();
}

// 选择当前月
function selectCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${year}.${month}`;

    // 检查当前月是否在可用月份列表中
    if (availableMonths.includes(currentYearMonth)) {
        displayMonth(currentYearMonth);
    } else if (availableMonths.length > 0) {
        // 如果当前月没有数据，显示最新的可用月份
        displayMonth(availableMonths[availableMonths.length - 1]);
    }
}

// 下拉框选择月份
function handleMonthSelectChange() {
    const selectedMonth = elements.monthSelect.value;
    if (selectedMonth) {
        displayMonth(selectedMonth);
    }
}

// 显示指定月份的数据
function displayMonth(month) {
    const formattedMonth = formatMonth(month);
    currentMonth = formattedMonth;
    elements.monthSelect.value = formattedMonth;
    elements.currentMonthDisplay.textContent = formattedMonth;
    updateNavigationButtons();
    handleMonthChange();
}

// 前一月
function goToPrevMonth() {
    const currentIndex = availableMonths.indexOf(currentMonth);
    if (currentIndex > 0) {
        displayMonth(availableMonths[currentIndex - 1]);
    }
}

// 后一月
function goToNextMonth() {
    const currentIndex = availableMonths.indexOf(currentMonth);
    if (currentIndex < availableMonths.length - 1) {
        displayMonth(availableMonths[currentIndex + 1]);
    }
}

// 更新导航按钮状态
function updateNavigationButtons() {
    const currentIndex = availableMonths.indexOf(currentMonth);
    elements.prevMonthBtn.disabled = currentIndex <= 0;
    elements.nextMonthBtn.disabled = currentIndex >= availableMonths.length - 1;
}

// 处理月份变化
function handleMonthChange() {
    const selectedMonth = elements.monthSelect.value;
    if (!selectedMonth) {
        clearDisplay();
        return;
    }

    // 过滤该月份的数据（需要格式化原始数据中的月份来匹配）
    const monthData = allData.filter(row => {
        const value = row[fieldNames.month];
        return value && formatMonth(String(value).trim()) === selectedMonth;
    });

    // 分类收入和支出
    const incomeItems = [];
    const expenseItems = [];

    monthData.forEach(row => {
        const amount = parseFloat(row[fieldNames.amount]) || 0;
        const type = String(row[fieldNames.type] || '').trim();

        // 判断是收入还是支出
        const isIncome = type.includes('收入');
        const isExpense = type.includes('支出');

        const item = {
            name: row[fieldNames.name] || row['备注'] || '-',
            amount: amount,
            remark: row['备注'] || ''
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

    // 净收支颜色：支出大于收入用红色，否则用绿色
    if (expense > income) {
        elements.netBalance.style.color = 'var(--expense-color)';  // 红色
    } else {
        elements.netBalance.style.color = 'var(--income-color)';  // 绿色
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

    const remark = document.createElement('div');
    remark.className = 'item-date';
    remark.textContent = item.remark || ' ';

    info.appendChild(name);
    info.appendChild(remark);

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
