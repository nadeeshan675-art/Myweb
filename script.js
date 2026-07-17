// LocalStorage Schema Initialization
if (!localStorage.getItem('bms_companies')) localStorage.setItem('bms_companies', JSON.stringify([]));
if (!localStorage.getItem('bms_users')) localStorage.setItem('bms_users', JSON.stringify([]));
if (!localStorage.getItem('bms_customers')) localStorage.setItem('bms_customers', JSON.stringify([]));
if (!localStorage.getItem('bms_items')) localStorage.setItem('bms_items', JSON.stringify([]));
if (!localStorage.getItem('bms_orders')) localStorage.setItem('bms_orders', JSON.stringify([]));
if (!localStorage.getItem('bms_notifications')) localStorage.setItem('bms_notifications', JSON.stringify([]));

// Active Session state
let activeUser = null; 

// Form tabs triggers
document.getElementById('btn-login-tab')?.addEventListener('click', () => {
    toggleAuthTabs('login');
});
document.getElementById('btn-register-tab')?.addEventListener('click', () => {
    toggleAuthTabs('register');
});

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

// ----------------- ADMIN REGISTRATION -----------------
document.getElementById('register-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const companyName = document.getElementById('reg-company-name').value.trim();
    const adminName = document.getElementById('reg-admin-name').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    let users = JSON.parse(localStorage.getItem('bms_users'));
    if (users.find(u => u.username === username)) {
        alert("This Username already exists! / මෙම පරිශීලක නාමය දැනටමත් ඇත.");
        return;
    }

    // Auto-generate Company/User Code
    const companyCode = 'CO-' + Math.floor(1000 + Math.random() * 9000);
    const userCode = 'USR-' + Math.floor(10000 + Math.random() * 90000);

    const newCompany = { companyCode, companyName };
    const companies = JSON.parse(localStorage.getItem('bms_companies'));
    companies.push(newCompany);
    localStorage.setItem('bms_companies', JSON.stringify(companies));

    const newUser = {
        userCode,
        companyCode,
        name: adminName,
        username,
        password: btoa(password), // simple base64 hashing
        role: 'Admin'
    };
    users.push(newUser);
    localStorage.setItem('bms_users', JSON.stringify(users));

    alert(`Registration Successful!\nCompany Code: ${companyCode}\nUse this code to login and link employees.`);
    toggleAuthTabs('login');
    document.getElementById('login-company-code').value = companyCode;
});

// ----------------- LOGIN LOGIC -----------------
document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const companyCode = document.getElementById('login-company-code').value.trim();
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    const users = JSON.parse(localStorage.getItem('bms_users'));
    const user = users.find(u => u.username === username && u.companyCode === companyCode && u.password === btoa(password));

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
        alert("Invalid details! Please check Company Code, Username and Password.");
    }
});

// Logout
document.getElementById('btn-logout')?.addEventListener('click', () => {
    activeUser = null;
    document.getElementById('auth-section').classList.remove('d-none');
    document.getElementById('app-section').classList.add('d-none');
});

// Role checking to show/hide admin panels
function applyRoleRestrictions() {
    const adminElements = document.querySelectorAll('.admin-only');
    if (activeUser.role !== 'Admin') {
        adminElements.forEach(el => el.classList.add('d-none'));
    } else {
        adminElements.forEach(el => el.classList.remove('d-none'));
    }
}

// ----------------- VIEW SWITCHER -----------------
function switchView(viewName) {
    document.querySelectorAll('.app-view').forEach(view => view.classList.add('d-none'));
    document.getElementById('view-' + viewName).classList.remove('d-none');
    
    // Manage bottom nav active state
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => btn.classList.remove('active'));
    event?.currentTarget?.classList?.add('active');
}

// ----------------- DATA LOADER & POPULATOR -----------------
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

    // Calc Total Sales from APPROVED orders
    const approvedOrders = orders.filter(o => o.status === 'Approved');
    const totalSales = approvedOrders.reduce((sum, o) => sum + o.total, 0);

    // Calc profit (selling price - cost price) * Qty
    let netProfit = 0;
    approvedOrders.forEach(ord => {
        const matchingItem = items.find(i => i.code === ord.itemCode);
        if (matchingItem) {
            const unitCost = matchingItem.cost;
            const unitProfit = ord.unitPrice - unitCost;
            netProfit += (unitProfit * ord.qty);
        }
    });

    // Total outstanding
    const outstanding = customers.reduce((sum, c) => sum + Number(c.balance), 0);

    document.getElementById('dash-sales').textContent = 'Rs. ' + totalSales.toFixed(2);
    document.getElementById('dash-profit').textContent = 'Rs. ' + netProfit.toFixed(2);
    document.getElementById('dash-orders').textContent = orders.length;
    document.getElementById('dash-outstanding').textContent = 'Rs. ' + outstanding.toFixed(2);

    // Load Last 5 orders on dashboard
    const tblDash = document.getElementById('dash-sales-table');
    tblDash.innerHTML = '';
    orders.slice(-5).reverse().forEach(o => {
        tblDash.innerHTML += `
            <tr>
                <td>${o.orderNo}</td>
                <td>Rs. ${o.total.toFixed(2)}</td>
                <td><span class="badge bg-${o.status === 'Approved' ? 'success' : o.status === 'Pending' ? 'warning' : 'danger'}">${o.status}</span></td>
            </tr>
        `;
    });

    // Load Alerts
    const alertsDiv = document.getElementById('dash-alerts');
    alertsDiv.innerHTML = '';
    items.forEach(i => {
        if (i.qty <= i.lowStock) {
            alertsDiv.innerHTML += `<div>⚠️ Low Stock: <b>${i.name}</b> is at ${i.qty} left.</div>`;
        }
    });

    // Load Metrics inside report page if admin
    if (activeUser.role === 'Admin') {
        const totalCostVal = items.reduce((sum, i) => sum + (i.cost * i.qty), 0);
        const totalSellVal = items.reduce((sum, i) => sum + (i.sell * i.qty), 0);
        document.getElementById('rep-inv-cost').textContent = 'Rs. ' + totalCostVal.toFixed(2);
        document.getElementById('rep-inv-sell').textContent = 'Rs. ' + totalSellVal.toFixed(2);
        document.getElementById('rep-total-orders').textContent = approvedOrders.length;
        document.getElementById('rep-outstanding').textContent = 'Rs. ' + outstanding.toFixed(2);
    }
}

// Customers Crud
function loadCustomers() {
    const customers = JSON.parse(localStorage.getItem('bms_customers')).filter(c => c.companyCode === activeUser.companyCode);
    const tableBody = document.getElementById('table-customers');
    const orderCustomerSelect = document.getElementById('order-customer');
    
    tableBody.innerHTML = '';
    orderCustomerSelect.innerHTML = '<option value="">-- Click to Select --</option>';

    customers.forEach(c => {
        tableBody.innerHTML += `
            <tr>
                <td><b>${c.name}</b></td>
                <td>${c.phone}</td>
                <td>${c.address}</td>
                <td class="text-danger fw-bold">Rs. ${Number(c.balance).toFixed(2)}</td>
                <td class="admin-only">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
        orderCustomerSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
}

document.getElementById('form-customer')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('cust-id').value || 'CST-' + Date.now();
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const address = document.getElementById('cust-address').value;
    const balance = document.getElementById('cust-balance').value || 0;

    const customers = JSON.parse(localStorage.getItem('bms_customers'));
    
    const newCust = { id, companyCode: activeUser.companyCode, name, phone, address, balance };
    customers.push(newCust);
    localStorage.setItem('bms_customers', JSON.stringify(customers));

    const modal = bootstrap.Modal.getInstance(document.getElementById('modal-customer'));
    modal.hide();
    document.getElementById('form-customer').reset();
    loadCustomers();
    updateDashboardMetrics();
});

function deleteCustomer(id) {
    if (confirm("Are you sure you want to delete this customer?")) {
        let customers = JSON.parse(localStorage.getItem('bms_customers'));
        customers = customers.filter(c => c.id !== id);
        localStorage.setItem('bms_customers', JSON.stringify(customers));
        loadCustomers();
        updateDashboardMetrics();
    }
}

// Items Crud
function loadItems() {
    const items = JSON.parse(localStorage.getItem('bms_items')).filter(i => i.companyCode === activeUser.companyCode);
    const tableBody = document.getElementById('table-items');
    const orderItemSelect = document.getElementById('order-item');

    tableBody.innerHTML = '';
    orderItemSelect.innerHTML = '<option value="">-- Choose Item --</option>';

    items.forEach(i => {
        const isLow = i.qty <= i.lowStock;
        tableBody.innerHTML += `
            <tr>
                <td><span class="badge bg-secondary">${i.code}</span></td>
                <td><b>${i.name}</b></td>
                <td>Rs. ${Number(i.cost).toFixed(2)}</td>
                <td>Rs. ${Number(i.sell).toFixed(2)}</td>
                <td><span class="badge bg-${isLow ? 'danger' : 'success'}">${i.qty} Units</span></td>
                <td>${isLow ? '<span class="text-danger small fw-bold">Reorder Needed</span>' : '<span class="text-success small">Normal</span>'}</td>
                <td class="admin-only">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${i.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
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
    const newItem = { id, code, companyCode: activeUser.companyCode, name, cost, sell, qty, lowStock };
    items.push(newItem);
    localStorage.setItem('bms_items', JSON.stringify(items));

    const modal = bootstrap.Modal.getInstance(document.getElementById('modal-item'));
    modal.hide();
    document.getElementById('form-item').reset();
    loadItems();
    updateDashboardMetrics();
});

function deleteItem(id) {
    if (confirm("Remove item?")) {
        let items = JSON.parse(localStorage.getItem('bms_items'));
        items = items.filter(i => i.id !== id);
        localStorage.setItem('bms_items', JSON.stringify(items));
        loadItems();
        updateDashboardMetrics();
    }
}

// ----------------- ORDERS WORKFLOW -----------------
function loadOrders() {
    const orders = JSON.parse(localStorage.getItem('bms_orders')).filter(o => o.companyCode === activeUser.companyCode);
    const tableBody = document.getElementById('table-orders');
    tableBody.innerHTML = '';

    orders.forEach(o => {
        let actions = '';
        if (o.status === 'Pending') {
            if (activeUser.role === 'Admin') {
                actions = `
                    <button class="btn btn-sm btn-success py-0 px-2" onclick="approveOrder('${o.id}')">Approve</button>
                    <button class="btn btn-sm btn-danger py-0 px-2" onclick="rejectOrder('${o.id}')">Reject</button>
                `;
            } else {
                actions = `<span class="text-muted small">Pending Review</span>`;
            }
        } else {
            actions = `<span class="text-muted small">Finished</span>`;
        }

        tableBody.innerHTML += `
            <tr>
                <td><b>${o.orderNo}</b></td>
                <td>${o.custName}</td>
                <td class="fw-bold">Rs. ${o.total.toFixed(2)}</td>
                <td>${o.empName}</td>
                <td><span class="badge bg-${o.status === 'Approved' ? 'success' : o.status === 'Pending' ? 'warning' : 'danger'}">${o.status}</span></td>
                <td>${actions}</td>
            </tr>
        `;
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

    if (!customer || !item) {
        alert("Error mapping resources!");
        return;
    }

    if (item.qty < qty) {
        alert("Not enough inventory items in stock to complete request!");
        return;
    }

    const orderNo = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const total = item.sell * qty;

    const orders = JSON.parse(localStorage.getItem('bms_orders'));
    const newOrder = {
        id: 'ORD-' + Date.now(),
        orderNo,
        companyCode: activeUser.companyCode,
        custId,
        custName: customer.name,
        itemCode,
        qty,
        unitPrice: item.sell,
        total,
        empName: activeUser.name,
        payment,
        status: 'Pending'
    };

    orders.push(newOrder);
    localStorage.setItem('bms_orders', JSON.stringify(orders));

    const modal = bootstrap.Modal.getInstance(document.getElementById('modal-order'));
    modal.hide();
    document.getElementById('form-order').reset();

    // Trigger Notification
    pushNotification("New Order Submitted! Pending approval by Admin.", "info");

    loadOrders();
    updateDashboardMetrics();
});

function approveOrder(orderId) {
    const orders = JSON.parse(localStorage.getItem('bms_orders'));
    const order = orders.find(o => o.id === orderId);

    if (order) {
        const items = JSON.parse(localStorage.getItem('bms_items'));
        const item = items.find(i => i.code === order.itemCode);

        if (item) {
            if (item.qty >= order.qty) {
                // Reduce stock level
                item.qty -= order.qty;
                order.status = 'Approved';
                
                // If it is credit payment, update outstanding balance of customer
                if (order.payment === 'Credit') {
                    const customers = JSON.parse(localStorage.getItem('bms_customers'));
                    const customer = customers.find(c => c.id === order.custId);
                    if (customer) {
                        customer.balance = Number(customer.balance) + order.total;
                        localStorage.setItem('bms_customers', JSON.stringify(customers));
                    }
                }

                localStorage.setItem('bms_items', JSON.stringify(items));
                localStorage.setItem('bms_orders', JSON.stringify(orders));

                pushNotification(`Order ${order.orderNo} Approved! Stock updated.`, "success");
                
                // Trigger low stock warning automatically if drops below lowstock levels
                if (item.qty <= item.lowStock) {
                    pushNotification(`Warning: ${item.name} stock levels are extremely low!`, "danger");
                }

                loadAllData();
            } else {
                alert("Cannot approve. Inefficient stock level.");
            }
        }
    }
}

function rejectOrder(orderId) {
    const orders = JSON.parse(localStorage.getItem('bms_orders'));
    const order = orders.find(o => o.id === orderId);

    if (order) {
        order.status = 'Rejected';
        localStorage.setItem('bms_orders', JSON.stringify(orders));
        pushNotification(`Order ${order.orderNo} Rejected!`, "warning");
        loadAllData();
    }
}

// ----------------- NOTIFICATIONS LOGIC -----------------
function pushNotification(message, type) {
    const notis = JSON.parse(localStorage.getItem('bms_notifications'));
    notis.push({
        id: Date.now(),
        companyCode: activeUser.companyCode,
        message,
        type,
        time: new Date().toLocaleTimeString()
    });
    localStorage.setItem('bms_notifications', JSON.stringify(notis));
    renderNotifications();
}

function renderNotifications() {
    const notis = JSON.parse(localStorage.getItem('bms_notifications')).filter(n => n.companyCode === activeUser.companyCode);
    const countBadge = document.getElementById('noti-count');
    const list = document.getElementById('noti-list');

    countBadge.textContent = notis.length;

    // Remove old placeholder content
    list.innerHTML = '<li><h6 class="dropdown-header">Latest Notifications</h6></li><li><hr class="dropdown-divider"></li>';

    if (notis.length === 0) {
        list.innerHTML += `<li class="p-2 text-center text-muted small">No new updates</li>`;
    } else {
        notis.slice(-5).reverse().forEach(n => {
            list.innerHTML += `
                <li class="p-2 border-bottom">
                    <span class="text-${n.type} small d-block"><b>${n.message}</b></span>
                    <span style="font-size: 10px;" class="text-muted">${n.time}</span>
                </li>
            `;
        });
    }
}

// ----------------- EMPLOYEES CRUD -----------------
function loadEmployees() {
    if (activeUser.role !== 'Admin') return;
    const users = JSON.parse(localStorage.getItem('bms_users')).filter(u => u.companyCode === activeUser.companyCode);
    const tableBody = document.getElementById('table-employees');
    tableBody.innerHTML = '';

    users.forEach(u => {
        tableBody.innerHTML += `
            <tr>
                <td><b>${u.userCode}</b></td>
                <td>${u.name}</td>
                <td>${u.username}</td>
                <td><span class="badge bg-dark">${u.role}</span></td>
                <td>
                    ${u.role !== 'Admin' ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee('${u.userCode}')"><i class="fa-solid fa-trash"></i></button>` : ''}
                </td>
            </tr>
        `;
    });
}

document.getElementById('form-employee')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('emp-name').value;
    const username = document.getElementById('emp-username').value.trim().toLowerCase();
    const password = document.getElementById('emp-password').value;

    const users = JSON.parse(localStorage.getItem('bms_users'));
    if (users.find(u => u.username === username)) {
        alert("This username already exists!");
        return;
    }

    const newUser = {
        userCode: 'EMP-' + Math.floor(10000 + Math.random() * 90000),
        companyCode: activeUser.companyCode,
        name,
        username,
        password: btoa(password),
        role: 'Employee'
    };

    users.push(newUser);
    localStorage.setItem('bms_users', JSON.stringify(users));

    const modal = bootstrap.Modal.getInstance(document.getElementById('modal-employee'));
    modal.hide();
    document.getElementById('form-employee').reset();
    loadEmployees();
});

function deleteEmployee(code) {
    if (confirm("Remove access for employee?")) {
        let users = JSON.parse(localStorage.getItem('bms_users'));
        users = users.filter(u => u.userCode !== code);
        localStorage.setItem('bms_users', JSON.stringify(users));
        loadEmployees();
    }
}

// ----------------- REPORTS EXPORT (SIMULATION) -----------------
function exportReport(format) {
    alert(`Success!\nGenerated Daily Executive Report in ${format} format.\nSaved automatically to Downloads folder.`);
}
