// LocalStorage Setup
if (!localStorage.getItem('bms_companies')) localStorage.setItem('bms_companies', JSON.stringify([]));
if (!localStorage.getItem('bms_users')) localStorage.setItem('bms_users', JSON.stringify([]));
if (!localStorage.getItem('bms_customers')) localStorage.setItem('bms_customers', JSON.stringify([]));
if (!localStorage.getItem('bms_items')) localStorage.setItem('bms_items', JSON.stringify([]));
if (!localStorage.getItem('bms_orders')) localStorage.setItem('bms_orders', JSON.stringify([]));
if (!localStorage.getItem('bms_notifications')) localStorage.setItem('bms_notifications', JSON.stringify([]));

let activeUser = null; 

// Form tabs toggles
document.getElementById('btn-login-tab')?.addEventListener('click', () => toggleAuthTabs('login'));
document.getElementById('btn-register-tab')?.addEventListener('click', () => toggleAuthTabs('register'));

function toggleAuthTabs(mode) {
    if (mode === 'login') {
        document.getElementById('btn-login-tab').classList.add('active');
        document.getElementById('btn-register-tab').classList.remove('active');
        document.getElementById('login-form').classList.remove('d-none');
        document.getElementById('register-form').classList.add('d-none');
    } else {
        document.getElementById('btn-login-tab').classList.remove('active');
        document.getElementById('btn-register-tab').classList.add('active');
        document.getElementById('login-form').classList.add('d-none');
        document.getElementById('register-form').classList.remove('d-none');
    }
}

// ADMIN REGISTRATION
document.getElementById('register-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const companyName = document.getElementById('reg-company-name').value.trim();
    const adminName = document.getElementById('reg-admin-name').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    let users = JSON.parse(localStorage.getItem('bms_users'));
    if (users.find(u => u.username === username)) {
        alert("Username already exists!");
        return;
    }

    const companyCode = 'CO-' + Math.floor(1000 + Math.random() * 9000);
    const userCode = 'USR-' + Math.floor(10000 + Math.random() * 90000);

    const companies = JSON.parse(localStorage.getItem('bms_companies'));
    companies.push({ companyCode, companyName });
    localStorage.setItem('bms_companies', JSON.stringify(companies));

    // Password එක btoa() මගින් encrypt කර සේව් කෙරේ
    users.push({ userCode, companyCode, name: adminName, username, password: btoa(password), role: 'Admin' });
    localStorage.setItem('bms_users', JSON.stringify(users));

    alert(`Registration Successful!\nCompany Code: ${companyCode}\nUse this Code to log in or link employees!`);
    toggleAuthTabs('login');
    document.getElementById('login-company-code').value = companyCode;
});

// LOGIN LOGIC (නිවැරදි කරන ලද කොටස)
document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const companyCode = document.getElementById('login-company-code').value.trim();
    const role = document.getElementById('login-role').value;
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    // Login වීමේදී ඇතුළත් කරන Password එකද btoa() මගින් Encrypt කර Database එක සමඟ සැසඳිය යුතුය
    const hashedPassword = btoa(password);

    const users = JSON.parse(localStorage.getItem('bms_users'));
    const user = users.find(u => u.username === username && u.companyCode === companyCode && u.role === role && u.password === hashedPassword);

    if (user) {
        activeUser = user;
        document.getElementById('auth-section').classList.add('d-none');
        document.getElementById('app-section').classList.remove('d-none');
        document.getElementById('brand-name').textContent = "BMS - " + companyCode;
        document.getElementById('user-display').textContent = `${user.name} (${user.role})`;
        
        applyRoleRestrictions();
        loadAllData();
        switchView('dashboard');
    } else {
        alert("Login failed! Please check Company Code, Role, Username and Password.");
    }
});

// Logout
document.getElementById('btn-logout')?.addEventListener('click', () => {
    activeUser = null;
    document.getElementById('auth-section').classList.remove('d-none');
    document.getElementById('app-section').classList.add('d-none');
    document.getElementById('login-form').reset(); // Form එක reset කෙරේ
});

function applyRoleRestrictions() {
    const adminElements = document.querySelectorAll('.admin-only');
    if (activeUser.role !== 'Admin') {
        adminElements.forEach(el => el.classList.add('d-none'));
    } else {
        adminElements.forEach(el => el.classList.remove('d-none'));
    }
}

function switchView(viewName) {
    document.querySelectorAll('.app-view').forEach(view => view.classList.add('d-none'));
    document.getElementById('view-' + viewName).classList.remove('d-none');
}

function loadAllData() {
    loadCustomers();
    loadItems();
    loadOrders();
    loadEmployees();
    renderNotifications();
    updateDashboardMetrics();
}

function updateDashboardMetrics() {
    const orders = JSON.parse(localStorage.getItem('bms_orders')).filter(o => o.companyCode === activeUser.companyCode);
    const items = JSON.parse(localStorage.getItem('bms_items')).filter(i => i.companyCode === activeUser.companyCode);
    const customers = JSON.parse(localStorage.getItem('bms_customers')).filter(c => c.companyCode === activeUser.companyCode);

    const approvedOrders = orders.filter(o => o.status === 'Approved');
    const totalSales = approvedOrders.reduce((sum, o) => sum + o.total, 0);

    let netProfit = 0;
    approvedOrders.forEach(ord => {
        const matchingItem = items.find(i => i.code === ord.itemCode);
        if (matchingItem) {
            netProfit += ((ord.unitPrice - matchingItem.cost) * ord.qty);
        }
    });

    const outstanding = customers.reduce((sum, c) => sum + Number(c.balance), 0);

    document.getElementById('dash-sales').textContent = 'Rs. ' + totalSales.toFixed(2);
    document.getElementById('dash-profit').textContent = 'Rs. ' + netProfit.toFixed(2);
    document.getElementById('dash-orders').textContent = orders.length;
    document.getElementById('dash-outstanding').textContent = 'Rs. ' + outstanding.toFixed(2);

    const tblDash = document.getElementById('dash-sales-table');
    tblDash.innerHTML = '';
    orders.slice(-5).reverse().forEach(o => {
        tblDash.innerHTML += `<tr><td>${o.orderNo}</td><td>Rs. ${o.total.toFixed(2)}</td><td><span class="badge bg-${o.status === 'Approved' ? 'success' : o.status === 'Pending' ? 'warning' : 'danger'}">${o.status}</span></td></tr>`;
    });

    const alertsDiv = document.getElementById('dash-alerts');
    alertsDiv.innerHTML = '';
    items.forEach(i => {
        if (i.qty <= i.lowStock) {
            alertsDiv.innerHTML += `<div>⚠️ Low Stock: <b>${i.name}</b> (${i.qty} left)</div>`;
        }
    });

    if (activeUser.role === 'Admin') {
        document.getElementById('rep-inv-cost').textContent = 'Rs. ' + items.reduce((sum, i) => sum + (i.cost * i.qty), 0).toFixed(2);
        document.getElementById('rep-inv-sell').textContent = 'Rs. ' + items.reduce((sum, i) => sum + (i.sell * i.qty), 0).toFixed(2);
        document.getElementById('rep-total-orders').textContent = approvedOrders.length;
        document.getElementById('rep-outstanding').textContent = 'Rs. ' + outstanding.toFixed(2);
    }
}

// Customers Logic
function loadCustomers() {
    const customers = JSON.parse(localStorage.getItem('bms_customers')).filter(c => c.companyCode === activeUser.companyCode);
    const tableBody = document.getElementById('table-customers');
    const orderCustomerSelect = document.getElementById('order-customer');
    tableBody.innerHTML = '';
    orderCustomerSelect.innerHTML = '<option value="">-- Choose Customer --</option>';

    customers.forEach(c => {
        tableBody.innerHTML += `<tr><td><b>${c.name}</b></td><td>${c.phone}</td><td>${c.address}</td><td class="text-danger fw-bold">Rs. ${Number(c.balance).toFixed(2)}</td><td><button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer('${c.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        orderCustomerSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
}

document.getElementById('form-customer')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = 'CST-' + Date.now();
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const address = document.getElementById('cust-address').value;
    const balance = document.getElementById('cust-balance').value || 0;

    const customers = JSON.parse(localStorage.getItem('bms_customers'));
    customers.push({ id, companyCode: activeUser.companyCode, name, phone, address, balance });
    localStorage.setItem('bms_customers', JSON.stringify(customers));

    bootstrap.Modal.getInstance(document.getElementById('modal-customer')).hide();
    document.getElementById('form-customer').reset();
    loadCustomers();
    updateDashboardMetrics();
});

function deleteCustomer(id) {
    if (confirm("Remove Customer?")) {
        let customers = JSON.parse(localStorage.getItem('bms_customers'));
        customers = customers.filter(c => c.id !== id);
        localStorage.setItem('bms_customers', JSON.stringify(customers));
        loadCustomers();
        updateDashboardMetrics();
    }
}

// Items Logic
function loadItems() {
    const items = JSON.parse(localStorage.getItem('bms_items')).filter(i => i.companyCode === activeUser.companyCode);
    const tableBody = document.getElementById('table-items');
    const orderItemSelect = document.getElementById('order-item');
    tableBody.innerHTML = '';
    orderItemSelect.innerHTML = '<option value="">-- Choose Item --</option>';

    items.forEach(i => {
        const isLow = i.qty <= i.lowStock;
        tableBody.innerHTML += `<tr><td><span class="badge bg-secondary">${i.code}</span></td><td><b>${i.name}</b></td><td>Rs. ${Number(i.cost).toFixed(2)}</td><td>Rs. ${Number(i.sell).toFixed(2)}</td><td><span class="badge bg-${isLow ? 'danger' : 'success'}">${i.qty} Units</span></td><td>${isLow ? '<span class="text-danger small">Reorder</span>' : '<span class="text-success small">OK</span>'}</td><td class="admin-only"><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${i.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        orderItemSelect.innerHTML += `<option value="${i.code}">${i.name} (Rs. ${i.sell})</option>`;
    });
}

document.getElementById('form-item')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = 'ITM-' + Date.now();
    const name = document.getElementById('item-name').value;
    const cost = parseFloat(document.getElementById('item-cost').value);
    const sell = parseFloat(document.getElementById('item-sell').value);
    const qty = parseInt(document.getElementById('item-qty').value);
    const lowStock = parseInt(document.getElementById('item-low').value);
    const code = 'SKU-' + Math.floor(1000 + Math.random() * 9000);

    const items = JSON.parse(localStorage.getItem('bms_items'));
    items.push({ id, code, companyCode: activeUser.companyCode, name, cost, sell, qty, lowStock });
    localStorage.setItem('bms_items', JSON.stringify(items));

    bootstrap.Modal.getInstance(document.getElementById('modal-item')).hide();
    document.getElementById('form-item').reset();
    loadItems();
    updateDashboardMetrics();
});

function deleteItem(id) {
    if (confirm("Delete Item?")) {
        let items = JSON.parse(localStorage.getItem('bms_items'));
        items = items.filter(i => i.id !== id);
        localStorage.setItem('bms_items', JSON.stringify(items));
        loadItems();
        updateDashboardMetrics();
    }
}

// Orders Workflow
function loadOrders() {
    const orders = JSON.parse(localStorage.getItem('bms_orders')).filter(o => o.companyCode === activeUser.companyCode);
    const tableBody = document.getElementById('table-orders');
    tableBody.innerHTML = '';

    orders.forEach(o => {
        let actions = '';
        if (o.status === 'Pending') {
            if (activeUser.role === 'Admin') {
                actions = `<button class="btn btn-sm btn-success py-0 px-2" onclick="approveOrder('${o.id}')">Approve</button> <button class="btn btn-sm btn-danger py-0 px-2" onclick="rejectOrder('${o.id}')">Reject</button>`;
            } else {
                actions = `<span class="text-muted small">Pending Review</span>`;
            }
        } else {
            actions = `<span class="text-muted small">Processed</span>`;
        }
        tableBody.innerHTML += `<tr><td><b>${o.orderNo}</b></td><td>${o.custName}</td><td>Rs. ${o.total.toFixed(2)}</td><td>${o.empName}</td><td><span class="badge bg-${o.status === 'Approved' ? 'success' : o.status === 'Pending' ? 'warning' : 'danger'}">${o.status}</span></td><td>${actions}</td></tr>`;
    });
}

document.getElementById('form-order')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const custId = document.getElementById('order-customer').value;
    const itemCode = document.getElementById('order-item').value;
    const qty = parseInt(document.getElementById('order-qty').value);
    const payment = document.getElementById('order-payment').value;

    const customers = JSON.parse(localStorage.getItem('bms_customers'));
    const items = JSON.parse(localStorage.getItem('bms_items'));

    const customer = customers.find(c => c.id === custId);
    const item = items.find(i => i.code === itemCode);

    if (item.qty < qty) {
        alert("Insufficient Stock!");
        return;
    }

    const orderNo = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const orders = JSON.parse(localStorage.getItem('bms_orders'));
    orders.push({ id: 'ORD-' + Date.now(), orderNo, companyCode: activeUser.companyCode, custId, custName: customer.name, itemCode, qty, unitPrice: item.sell, total: (item.sell * qty), empName: activeUser.name, payment, status: 'Pending' });
    localStorage.setItem('bms_orders', JSON.stringify(orders));

    bootstrap.Modal.getInstance(document.getElementById('modal-order')).hide();
    document.getElementById('form-order').reset();
    pushNotification("New order placed! Waiting for Admin approval.", "info");
    loadOrders();
    updateDashboardMetrics();
});

function approveOrder(orderId) {
    const orders = JSON.parse(localStorage.getItem('bms_orders'));
    const order = orders.find(o => o.id === orderId);
    const items = JSON.parse(localStorage.getItem('bms_items'));
    const item = items.find(i => i.code === order.itemCode);

    if (item && item.qty >= order.qty) {
        item.qty -= order.qty;
        order.status = 'Approved';

        if (order.payment === 'Credit') {
            const customers = JSON.parse(localStorage.getItem('bms_customers'));
            const customer = customers.find(c => c.id === order.custId);
            if (customer) customer.balance = Number(customer.balance) + order.total;
            localStorage.setItem('bms_customers', JSON.stringify(customers));
        }

        localStorage.setItem('bms_items', JSON.stringify(items));
        localStorage.setItem('bms_orders', JSON.stringify(orders));
        pushNotification(`Order ${order.orderNo} Approved!`, "success");
        loadAllData();
    } else {
        alert("Stock insufficient to approve order!");
    }
}

function rejectOrder(orderId) {
    const orders = JSON.parse(localStorage.getItem('bms_orders'));
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = 'Rejected';
        localStorage.setItem('bms_orders', JSON.stringify(orders));
        pushNotification(`Order ${order.orderNo} Rejected.`, "warning");
        loadAllData();
    }
}

// Staff / Employee Management
function loadEmployees() {
    if (activeUser.role !== 'Admin') return;
    const users = JSON.parse(localStorage.getItem('bms_users')).filter(u => u.companyCode === activeUser.companyCode);
    const tableBody = document.getElementById('table-employees');
    tableBody.innerHTML = '';

    users.forEach(u => {
        tableBody.innerHTML += `<tr><td><b>${u.userCode}</b></td><td>${u.name}</td><td>${u.username}</td><td><span class="badge bg-dark">${u.role}</span></td><td>${u.role !== 'Admin' ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee('${u.userCode}')"><i class="fa-solid fa-trash"></i></button>` : ''}</td></tr>`;
    });
}

document.getElementById('form-employee')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('emp-name').value;
    const username = document.getElementById('emp-username').value.trim().toLowerCase();
    const password = document.getElementById('emp-password').value;

    const users = JSON.parse(localStorage.getItem('bms_users'));
    if (users.find(u => u.username === username)) {
        alert("Username taken!");
        return;
    }

    // සේවකයා ඇතුළත් කිරීමේදීද Password එක btoa() වලින් Encrypt කර සේව් කෙරේ
    users.push({ userCode: 'EMP-' + Math.floor(10000 + Math.random() * 90000), companyCode: activeUser.companyCode, name, username, password: btoa(password), role: 'Employee' });
    localStorage.setItem('bms_users', JSON.stringify(users));
    bootstrap.Modal.getInstance(document.getElementById('modal-employee')).hide();
    document.getElementById('form-employee').reset();
    loadEmployees();
});

function deleteEmployee(code) {
    if (confirm("Delete Employee account?")) {
        let users = JSON.parse(localStorage.getItem('bms_users'));
        users = users.filter(u => u.userCode !== code);
        localStorage.setItem('bms_users', JSON.stringify(users));
        loadEmployees();
    }
}

// Notifications
function pushNotification(message, type) {
    const notis = JSON.parse(localStorage.getItem('bms_notifications'));
    notis.push({ id: Date.now(), companyCode: activeUser.companyCode, message, type, time: new Date().toLocaleTimeString() });
    localStorage.setItem('bms_notifications', JSON.stringify(notis));
    renderNotifications();
}

function renderNotifications() {
    const notis = JSON.parse(localStorage.getItem('bms_notifications')).filter(n => n.companyCode === activeUser.companyCode);
    document.getElementById('noti-count').textContent = notis.length;
    const list = document.getElementById('noti-list');
    list.innerHTML = '<li><h6 class="dropdown-header">Notifications</h6></li><li><hr class="dropdown-divider"></li>';
    if (notis.length === 0) list.innerHTML += `<li class="p-2 text-center text-muted small">Clean!</li>`;
    else {
        notis.slice(-5).reverse().forEach(n => {
            list.innerHTML += `<li class="p-2 border-bottom"><span class="text-${n.type} small d-block"><b>${n.message}</b></span></li>`;
        });
    }
}

// ================= REAL CSV EXPORT FUNCTIONALITY =================
function downloadSalesReport() {
    const orders = JSON.parse(localStorage.getItem('bms_orders')).filter(o => o.companyCode === activeUser.companyCode);
    if(orders.length === 0) { alert("No sales records found to export!"); return; }

    let csvContent = "data:text/csv;charset=utf-8,Order No,Customer,Employee,Total Price,Payment Method,Status\n";
    orders.forEach(o => {
        csvContent += `${o.orderNo},${o.custName},${o.empName},${o.total},${o.payment},${o.status}\n`;
    });

    triggerDownload(csvContent, "Sales_Report.csv");
}

function downloadInventoryReport() {
    const items = JSON.parse(localStorage.getItem('bms_items')).filter(i => i.companyCode === activeUser.companyCode);
    if(items.length === 0) { alert("No inventory items found to export!"); return; }

    let csvContent = "data:text/csv;charset=utf-8,Item Code,Product Name,Cost Price,Selling Price,Stock Qty\n";
    items.forEach(i => {
        csvContent += `${i.code},${i.name},${i.cost},${i.sell},${i.qty}\n`;
    });

    triggerDownload(csvContent, "Inventory_Report.csv");
}

function triggerDownload(content, fileName) {
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
