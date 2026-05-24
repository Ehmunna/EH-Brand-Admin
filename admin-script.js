// ===========================================
// EH Brand Admin Script - Category + Multi-Image + Pin
// ===========================================
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyC2Bsd-HqfhhC8i5cQUF2ZmofUJaFIcvDs",
    authDomain: "lamim-754aa.firebaseapp.com",
    projectId: "lamim-754aa",
    storageBucket: "lamim-754aa.firebasestorage.app",
    messagingSenderId: "1087897423283",
    appId: "1:1087897423283:web:10a57c0acf8879fc1e4fc6",
    measurementId: "G-R5SNM13YMG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
window.db = db;

let currentUser = null;
let allProductsCache = [];

// DOM
const sections = document.querySelectorAll('.content-section');
const navLinks = document.querySelectorAll('.sidebar-nav li');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const addProductBtn = document.getElementById('addProductBtn');
const logoutBtn = document.getElementById('logoutBtn');
const statusFilter = document.getElementById('statusFilter');
const categoryFilter = document.getElementById('categoryFilter');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebarNav = document.getElementById('sidebarNav');

// মোবাইল মেনু
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => sidebarNav.classList.toggle('open'));
}

// নেভিগেশন
function switchSection(sectionId) {
    navLinks.forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');
    sections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');
    const pageTitle = document.getElementById('pageTitle');
    const txt = activeLink?.querySelector('span')?.textContent || sectionId;
    if (pageTitle) pageTitle.textContent = txt;
    if (sidebarNav) sidebarNav.classList.remove('open');
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        if (section) switchSection(section);
    });
});

// ── ক্যাটাগরি কাস্টম ইনপুট ─────────────────────────────────────────────
document.getElementById('productCategory')?.addEventListener('change', function() {
    const custom = document.getElementById('customCategory');
    if (this.value === 'custom') {
        custom.style.display = 'block';
        custom.focus();
    } else {
        custom.style.display = 'none';
        custom.value = '';
    }
});

// ── Pin Toggle Text ──────────────────────────────────────────────────────
document.getElementById('productPinned')?.addEventListener('change', function() {
    document.getElementById('pinToggleText').textContent = this.checked ? '📌 পিন করা আছে' : 'পিন করা নেই';
});

// ── Multiple Image Inputs ────────────────────────────────────────────────
document.getElementById('addMoreImageBtn')?.addEventListener('click', addImageRow);

function addImageRow(value = '') {
    const container = document.getElementById('multiImageContainer');
    const idx = container.querySelectorAll('.image-input-row').length;
    const row = document.createElement('div');
    row.className = 'image-input-row';
    row.dataset.index = idx;
    row.innerHTML = `
        <input type="url" class="extra-image-input" placeholder="https://i.ibb.co/... (ছবি ${idx + 2})" value="${value}">
        <button type="button" class="btn-remove-img" title="সরান"><i class="fas fa-times"></i></button>
    `;
    row.querySelector('.btn-remove-img').addEventListener('click', () => row.remove());
    container.appendChild(row);
}

function getExtraImages() {
    return [...document.querySelectorAll('.extra-image-input')]
        .map(i => i.value.trim())
        .filter(Boolean);
}

function setExtraImages(images = []) {
    const container = document.getElementById('multiImageContainer');
    container.innerHTML = `
        <div class="image-input-row" data-index="0">
            <input type="url" class="extra-image-input" placeholder="https://i.ibb.co/... (ছবি ২)">
            <button type="button" class="btn-remove-img" title="সরান"><i class="fas fa-times"></i></button>
        </div>
    `;
    container.querySelector('.btn-remove-img').addEventListener('click', e => e.target.closest('.image-input-row').remove());
    images.forEach(url => addImageRow(url));
}

// ── মোডাল ──────────────────────────────────────────────────────────────
function openProductModal(product = null) {
    document.getElementById('modalTitle').textContent = product ? 'পণ্য এডিট করুন' : 'নতুন পণ্য যোগ করুন';
    document.getElementById('submitBtnText').textContent = product ? 'আপডেট করুন' : 'যোগ করুন';

    if (product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productDiscount').value = product.discount || 0;
        document.getElementById('productCode').value = product.productCode || '';
        document.getElementById('productImage').value = product.imageUrl || '';
        document.getElementById('productDescription').value = product.description || '';
        const pinned = product.pinned || false;
        document.getElementById('productPinned').checked = pinned;
        document.getElementById('pinToggleText').textContent = pinned ? '📌 পিন করা আছে' : 'পিন করা নেই';

        // ক্যাটাগরি
        const cat = product.category || '';
        const catSelect = document.getElementById('productCategory');
        const opts = [...catSelect.options].map(o => o.value);
        if (cat && !opts.includes(cat)) {
            catSelect.value = 'custom';
            document.getElementById('customCategory').style.display = 'block';
            document.getElementById('customCategory').value = cat;
        } else {
            catSelect.value = cat || '';
            document.getElementById('customCategory').style.display = 'none';
        }

        // একাধিক ছবি
        setExtraImages(Array.isArray(product.images) ? product.images : []);
    } else {
        productForm.reset();
        document.getElementById('productId').value = '';
        document.getElementById('productDiscount').value = 0;
        document.getElementById('pinToggleText').textContent = 'পিন করা নেই';
        document.getElementById('customCategory').style.display = 'none';
        setExtraImages([]);
    }
    productModal.style.display = 'flex';
    setTimeout(() => document.getElementById('productName').focus(), 200);
}

function closeModal() { productModal.style.display = 'none'; }

document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => btn.addEventListener('click', closeModal));
window.addEventListener('click', (e) => { if (e.target === productModal) closeModal(); });
addProductBtn?.addEventListener('click', () => openProductModal());

// ── লগআউট ──────────────────────────────────────────────────────────────
logoutBtn?.addEventListener('click', async () => {
    if (!confirm('লগআউট করতে চান?')) return;
    try {
        await signOut(auth);
        currentUser = null;
        document.getElementById('userEmail').textContent = 'অ্যাডমিনিস্ট্রেটর';
        showLoginButton();
        showMessage('লগআউট সফল!', 'success');
    } catch (error) {
        showMessage('লগআউট ব্যর্থ: ' + error.message, 'error');
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('userEmail').textContent = user.email;
        const loginBtn = document.querySelector('.login-btn');
        if (loginBtn) loginBtn.remove();
    } else {
        currentUser = null;
        document.getElementById('userEmail').textContent = 'অ্যাডমিনিস্ট্রেটর';
        showLoginButton();
    }
});

function showLoginButton() {
    const headerRight = document.querySelector('.header-right');
    if (headerRight && !headerRight.querySelector('.login-btn')) {
        const loginBtn = document.createElement('button');
        loginBtn.className = 'login-btn';
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> লগইন';
        loginBtn.onclick = showLoginModal;
        headerRight.appendChild(loginBtn);
    }
}

function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>অ্যাডমিন লগইন</h2>
            <form id="loginForm">
                <div class="form-group"><label>ইমেইল</label><input type="email" id="adminEmail" placeholder="admin@example.com" required></div>
                <div class="form-group"><label>পাসওয়ার্ড</label><input type="password" id="adminPassword" placeholder="********" required></div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">লগইন</button>
                    <button type="button" class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">বাতিল</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, modal.querySelector('#adminEmail').value, modal.querySelector('#adminPassword').value);
            modal.remove();
            showMessage('লগইন সফল!', 'success');
        } catch (error) {
            showMessage('লগইন ব্যর্থ: ' + error.message, 'error');
        }
    });
}

// ── মেসেজ ──────────────────────────────────────────────────────────────
function showMessage(msg, type = 'error') {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'error-alert';
    alertDiv.style.background = type === 'success' ? '#d1fae5' : '#fee';
    alertDiv.style.borderLeftColor = type === 'success' ? '#10b981' : '#ef4444';
    alertDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}" style="color:${type === 'success' ? '#10b981' : '#ef4444'}"></i>
        <span style="flex:1">${msg}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;">&times;</button>`;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv?.remove(), 4000);
}

// ── ড্যাশবোর্ড ─────────────────────────────────────────────────────────
async function updateDashboardCounters() {
    try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const pendingQuery = query(collection(db, 'orders'), where('status', '==', 'Pending'));
        const pendingSnap = await getDocs(pendingQuery);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todaySnap = await getDocs(query(collection(db, 'orders'), where('orderTime', '>=', today)));

        document.getElementById('totalProducts').textContent = productsSnap.size;
        document.getElementById('totalOrders').textContent = ordersSnap.size;
        document.getElementById('pendingOrders').textContent = pendingSnap.size;
        document.getElementById('todayOrders').textContent = todaySnap.size;

        const recentQuery = query(collection(db, 'orders'), orderBy('orderTime', 'desc'), limit(5));
        const recentSnap = await getDocs(recentQuery);
        const recentDiv = document.getElementById('recentOrders');
        if (recentDiv) {
            if (recentSnap.empty) {
                recentDiv.innerHTML = '<p class="empty-message">কোনো অর্ডার নেই</p>';
            } else {
                recentDiv.innerHTML = '';
                recentSnap.forEach(d => {
                    const o = d.data();
                    const time = o.orderTime?.toDate?.() || new Date();
                    recentDiv.innerHTML += `<div class="stats-item"><div><div class="title">${o.name || 'N/A'}</div><div class="subtitle">${time.toLocaleString()}</div></div><span class="badge-pending" style="padding:2px 8px;border-radius:20px;font-size:12px;">${o.status || 'Pending'}</span></div>`;
                });
            }
        }
        const productDiv = document.getElementById('lowStockProducts');
        if (productDiv) {
            const pinned = [];
            productsSnap.forEach(d => { if (d.data().pinned) pinned.push(d.data().name); });
            productDiv.innerHTML = `
                <div class="stats-item"><div><div class="title">মোট পণ্য</div><div class="subtitle">${productsSnap.size} টি পণ্য</div></div><i class="fas fa-box"></i></div>
                ${pinned.length ? `<div class="stats-item"><div><div class="title">📌 পিন করা পণ্য</div><div class="subtitle">${pinned.slice(0,3).join(', ')}${pinned.length>3?'...':''}</div></div><span style="color:#f59e0b;font-weight:700">${pinned.length}</span></div>` : ''}`;
        }
    } catch (error) { console.error('Counter error:', error); }
}

// ── ক্যাটাগরি ফিল্টার পপুলেট ───────────────────────────────────────────
function populateCategoryFilter(products) {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    const sel = document.getElementById('categoryFilter');
    const current = sel?.value;
    if (!sel) return;
    sel.innerHTML = '<option value="all">সব ক্যাটাগরি</option>';
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

// ── পণ্য টেবিল ─────────────────────────────────────────────────────────
async function loadProductsTable(filterCat = 'all') {
    const tbody = document.getElementById('productsTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><div class="loader"><div class="spinner"></div><p>লোড হচ্ছে...</p></div></td></tr>';

    try {
        const snapshot = await getDocs(collection(db, 'products'));
        allProductsCache = [];
        snapshot.forEach(d => allProductsCache.push({ id: d.id, ...d.data() }));

        // পিন করা আগে, তারপর বাকিরা
        allProductsCache.sort((a, b) => {
            if (b.pinned && !a.pinned) return 1;
            if (a.pinned && !b.pinned) return -1;
            return 0;
        });

        populateCategoryFilter(allProductsCache);

        const filtered = filterCat === 'all'
            ? allProductsCache
            : allProductsCache.filter(p => p.category === filterCat);

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-row"><p class="empty-message">${filterCat === 'all' ? 'কোনো পণ্য নেই।' : `"${filterCat}" ক্যাটাগরিতে কোনো পণ্য নেই।`}</p></td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        filtered.forEach(product => {
            const imgUrl = product.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop';
            const extraCount = Array.isArray(product.images) ? product.images.length : 0;
            const isPinned = product.pinned || false;
            const catBadge = product.category
                ? `<span class="cat-badge">${product.category}</span>`
                : '<span class="cat-badge cat-none">—</span>';

            const row = document.createElement('tr');
            if (isPinned) row.classList.add('pinned-row');
            row.innerHTML = `
                <td class="td-img">
                    <div class="img-wrap">
                        <img src="${imgUrl}" class="product-image" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop'">
                        ${extraCount > 0 ? `<span class="img-count">+${extraCount}</span>` : ''}
                    </div>
                </td>
                <td><span class="product-name-cell">${product.name || 'N/A'}</span></td>
                <td>${catBadge}</td>
                <td><code>${product.productCode || 'N/A'}</code></td>
                <td class="price-cell">TK ${parseFloat(product.price || 0).toFixed(0)}</td>
                <td>${product.discount || 0}%</td>
                <td class="pin-cell">
                    <button class="btn-pin ${isPinned ? 'pinned' : ''}" data-id="${product.id}" data-pinned="${isPinned}" title="${isPinned ? 'পিন সরান' : 'পিন করুন'}">
                        <i class="fas fa-thumbtack"></i>
                        ${isPinned ? 'পিন' : ''}
                    </button>
                </td>
                <td class="actions">
                    <button class="btn-primary btn-sm edit-product" data-id="${product.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger btn-sm delete-product" data-id="${product.id}"><i class="fas fa-trash"></i></button>
                </td>`;
            tbody.appendChild(row);
        });

        // Edit
        document.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', async () => {
                const p = allProductsCache.find(x => x.id === btn.dataset.id);
                if (p) openProductModal(p);
            });
        });

        // Delete
        document.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('পণ্যটি ডিলিট করতে চান?')) return;
                await deleteDoc(doc(db, 'products', btn.dataset.id));
                showMessage('পণ্য ডিলিট করা হয়েছে!', 'success');
                loadProductsTable(categoryFilter?.value || 'all');
                updateDashboardCounters();
            });
        });

        // Pin toggle
        document.querySelectorAll('.btn-pin').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const wasPinned = btn.dataset.pinned === 'true';
                try {
                    await updateDoc(doc(db, 'products', id), { pinned: !wasPinned });
                    showMessage(wasPinned ? 'পিন সরানো হয়েছে।' : '📌 পণ্য পিন করা হয়েছে! ওয়েবসাইটে প্রথমে দেখাবে।', 'success');
                    loadProductsTable(categoryFilter?.value || 'all');
                    updateDashboardCounters();
                } catch (err) {
                    showMessage('পিন আপডেট ব্যর্থ: ' + err.message, 'error');
                }
            });
        });

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="8" class="empty-row"><p class="error-message">লোড করা যায়নি: ${error.message}</p></td></tr>`;
    }
}

categoryFilter?.addEventListener('change', () => loadProductsTable(categoryFilter.value));

// ── অর্ডার টেবিল ────────────────────────────────────────────────────────
async function loadOrdersTable() {
    const tbody = document.getElementById('ordersTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><div class="loader"><div class="spinner"></div><p>লোড হচ্ছে...</p></div></td></tr>';
    try {
        const snapshot = await getDocs(collection(db, 'orders'));
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><p class="empty-message">কোনো অর্ডার নেই</p></td></tr>';
            return;
        }
        tbody.innerHTML = '';
        const orders = [];
        snapshot.forEach(d => orders.push({ id: d.id, ...d.data() }));
        orders.sort((a, b) => (b.orderTime?.toDate?.() || 0) - (a.orderTime?.toDate?.() || 0));

        orders.forEach(order => {
            const time = order.orderTime?.toDate?.() || new Date();
            const status = order.status || 'Pending';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${order.id.substring(0, 8)}</code></td>
                <td>${order.name || 'N/A'}</td>
                <td>${order.phone || 'N/A'}</td>
                <td>${order.location || 'N/A'}</td>
                <td><code>${order.productCode || 'N/A'}</code></td>
                <td>${time.toLocaleString()}</td>
                <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                <td class="actions">
                    <select class="status-select" data-id="${order.id}">
                        <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Delivered" ${status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                    <button class="btn-danger btn-sm delete-order" data-id="${order.id}"><i class="fas fa-trash"></i></button>
                </td>`;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async () => {
                await updateDoc(doc(db, 'orders', select.dataset.id), { status: select.value });
                showMessage('স্ট্যাটাস আপডেট হয়েছে!', 'success');
                loadOrdersTable();
                updateDashboardCounters();
            });
        });
        document.querySelectorAll('.delete-order').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('অর্ডারটি ডিলিট করতে চান?')) return;
                await deleteDoc(doc(db, 'orders', btn.dataset.id));
                showMessage('অর্ডার ডিলিট করা হয়েছে!', 'success');
                loadOrdersTable();
                updateDashboardCounters();
            });
        });
        applyOrderFilter();
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="8" class="empty-row"><p class="error-message">লোড করা যায়নি: ${error.message}</p></td></tr>`;
    }
}

function applyOrderFilter() {
    const filter = statusFilter?.value || 'all';
    document.querySelectorAll('#ordersTable tr').forEach(row => {
        if (row.cells.length < 7) return;
        const statusSpan = row.cells[6]?.querySelector('.status-badge');
        const status = statusSpan?.textContent?.trim() || 'Pending';
        row.style.display = (filter === 'all' || status === filter) ? '' : 'none';
    });
}
statusFilter?.addEventListener('change', applyOrderFilter);

// ── পণ্য ফর্ম সাবমিট ────────────────────────────────────────────────────
productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productId = document.getElementById('productId').value;
    const name      = document.getElementById('productName').value.trim();
    const price     = parseFloat(document.getElementById('productPrice').value);
    const discount  = parseInt(document.getElementById('productDiscount').value) || 0;
    const productCode = document.getElementById('productCode').value.trim();
    const imageUrl  = document.getElementById('productImage').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const pinned    = document.getElementById('productPinned').checked;

    // ক্যাটাগরি
    const catSelect = document.getElementById('productCategory');
    let category = catSelect.value === 'custom'
        ? document.getElementById('customCategory').value.trim()
        : catSelect.value;

    if (!name || !price || !productCode) {
        showMessage('নাম, দাম এবং কোড অবশ্যই দিতে হবে!', 'error'); return;
    }

    // Extra images
    const images = getExtraImages();

    const productData = {
        name, price, discount, productCode, category,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
        images,
        description,
        pinned,
        updatedAt: new Date()
    };

    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সেভ হচ্ছে...';
    btn.disabled = true;

    try {
        if (productId) {
            await updateDoc(doc(db, 'products', productId), productData);
            showMessage('পণ্য আপডেট হয়েছে!', 'success');
        } else {
            productData.createdAt = new Date();
            await addDoc(collection(db, 'products'), productData);
            showMessage('পণ্য যোগ হয়েছে!', 'success');
        }
        closeModal();
        loadProductsTable(categoryFilter?.value || 'all');
        updateDashboardCounters();
    } catch (error) {
        showMessage('সেভ করতে ব্যর্থ: ' + error.message, 'error');
    } finally {
        btn.innerHTML = orig;
        btn.disabled = false;
    }
});

// ── Init ─────────────────────────────────────────────────────────────────
async function init() {
    await updateDashboardCounters();
    await loadProductsTable();
    await loadOrdersTable();
    console.log('✅ EH Admin রেডি');
}
init();
