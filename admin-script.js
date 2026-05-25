// ════════════════════════════════════════════════
// EH Brand Admin v2 — Full Featured Script
// ════════════════════════════════════════════════
import { initializeApp } from 'firebase/app';
import {
    getFirestore, collection, getDocs, doc, addDoc, updateDoc,
    deleteDoc, query, where, orderBy, limit, serverTimestamp
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyC2Bsd-HqfhhC8i5cQUF2ZmofUJaFIcvDs",
    authDomain: "lamim-754aa.firebaseapp.com",
    projectId: "lamim-754aa",
    storageBucket: "lamim-754aa.firebasestorage.app",
    messagingSenderId: "1087897423283",
    appId: "1:1087897423283:web:10a57c0acf8879fc1e4fc6"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

let allOrders   = [];
let allProducts = [];
let currentUser = null;

// ════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════
onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appShell').style.display  = 'flex';
        document.getElementById('sbUserEmail').textContent  = user.email;
        document.getElementById('sbUserName').textContent   = user.email.split('@')[0];
        document.getElementById('tbEmail').textContent      = user.email.split('@')[0];
        initApp();
    } else {
        currentUser = null;
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appShell').style.display  = 'none';
    }
});

window.doLogin = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPass').value;
    const btn   = document.getElementById('loginBtn');
    const err   = document.getElementById('loginError');
    err.textContent = '';
    if (!email || !pass) { err.textContent = 'ইমেইল ও পাসওয়ার্ড দিন।'; return; }
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> লগইন হচ্ছে...';
    btn.disabled = true;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch(e) {
        err.textContent = 'ইমেইল বা পাসওয়ার্ড ভুল!';
        btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> প্রবেশ করুন';
        btn.disabled = false;
    }
};

window.togglePass = function() {
    const inp  = document.getElementById('loginPass');
    const icon = document.getElementById('eyeIcon');
    if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
    else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
};

document.getElementById('loginEmail')?.addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
document.getElementById('loginPass')?.addEventListener('keydown',  e => { if(e.key==='Enter') doLogin(); });

document.getElementById('logoutLink')?.addEventListener('click', async () => {
    if (!confirm('লগআউট করতে চান?')) return;
    await signOut(auth);
});

// ════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════
const secTitles = { dashboard:'ড্যাশবোর্ড', orders:'অর্ডার সমূহ', products:'পণ্য ব্যবস্থাপনা', sliders:'Slider ম্যানেজমেন্ট' };

window.switchSec = function(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
    const pg = document.getElementById('sec-' + id);
    if (pg) pg.classList.add('active');
    const lnk = document.querySelector(`.sb-link[data-sec="${id}"]`);
    if (lnk) lnk.classList.add('active');
    document.getElementById('topTitle').textContent = secTitles[id] || id;
    closeSidebar();
};

document.querySelectorAll('.sb-link[data-sec]').forEach(lnk => {
    lnk.addEventListener('click', () => switchSec(lnk.dataset.sec));
});

// Mobile sidebar
function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sbOverlay').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sbOverlay').classList.remove('open'); }
document.getElementById('hamburger')?.addEventListener('click', openSidebar);
document.getElementById('sbClose')?.addEventListener('click', closeSidebar);
document.getElementById('sbOverlay')?.addEventListener('click', closeSidebar);

// ════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════
function toast(msg, type='') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = `toast show ${type}`;
    setTimeout(() => t.className = 'toast', 3000);
}

// ════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════
async function initApp() {
    await Promise.all([loadDashboard(), loadOrdersTable(), loadProductsTable(), loadSliders()]);
}

// ════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════
async function loadDashboard() {
    try {
        const [prodSnap, orderSnap] = await Promise.all([
            getDocs(collection(db,'products')),
            getDocs(collection(db,'orders'))
        ]);

        allOrders = [];
        orderSnap.forEach(d => allOrders.push({ id:d.id,...d.data() }));
        allOrders.sort((a,b) => (b.orderTime?.toDate?.() || 0) - (a.orderTime?.toDate?.() || 0));

        const pending   = allOrders.filter(o => (o.status||'Pending') === 'Pending').length;
        const today     = new Date(); today.setHours(0,0,0,0);
        const todayOrds = allOrders.filter(o => (o.orderTime?.toDate?.() || new Date()) >= today).length;

        document.getElementById('st-products').textContent = prodSnap.size;
        document.getElementById('st-orders').textContent   = allOrders.length;
        document.getElementById('st-pending').textContent  = pending;
        document.getElementById('st-today').textContent    = todayOrds;
        document.getElementById('pendingBadge').textContent = pending;

        // Recent orders
        const recentEl = document.getElementById('recentOrdersList');
        if (recentEl) {
            if (!allOrders.length) {
                recentEl.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:.82rem;padding:12px">কোনো অর্ডার নেই</p>';
            } else {
                recentEl.innerHTML = allOrders.slice(0,5).map(o => {
                    const t = o.orderTime?.toDate?.() || new Date();
                    const st = o.status || 'Pending';
                    return `<div class="dash-order-item" onclick="openOrderModal('${o.id}')">
                        <div class="doi-icon"><i class="fas fa-receipt"></i></div>
                        <div>
                            <div class="doi-name">${o.name||'N/A'}</div>
                            <div class="doi-time">${t.toLocaleString('bn-BD')}</div>
                        </div>
                        <div class="doi-status"><span class="status-badge status-${st}">${statusBn(st)}</span></div>
                    </div>`;
                }).join('');
            }
        }

        // Summary
        const summEl = document.getElementById('orderSummary');
        if (summEl) {
            const counts = { Pending:0, Confirmed:0, Delivered:0, Cancelled:0 };
            allOrders.forEach(o => { const s = o.status||'Pending'; if(counts[s]!==undefined) counts[s]++; });
            const colors = { Pending:'#f59e0b', Confirmed:'#10b981', Delivered:'#3b82f6', Cancelled:'#ef4444' };
            const labels = { Pending:'বাকি', Confirmed:'নিশ্চিত', Delivered:'ডেলিভারি', Cancelled:'বাতিল' };
            summEl.innerHTML = Object.entries(counts).map(([s,c]) => `
                <div class="summary-row">
                    <div class="sr-label">
                        <span class="sr-dot" style="background:${colors[s]}"></span>
                        ${labels[s]}
                    </div>
                    <span class="sr-val" style="color:${colors[s]}">${c}</span>
                </div>`).join('');
        }
    } catch(e) { console.error('Dashboard error:', e); }
}

function statusBn(s) {
    return { Pending:'বাকি', Confirmed:'নিশ্চিত', Delivered:'ডেলিভারি', Cancelled:'বাতিল' }[s] || s;
}

// ════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════
async function loadOrdersTable() {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '<div class="tbl-loader"><i class="fas fa-spinner fa-spin"></i> লোড হচ্ছে...</div>';
    try {
        const snap = await getDocs(collection(db,'orders'));
        allOrders = [];
        snap.forEach(d => allOrders.push({ id:d.id,...d.data() }));
        allOrders.sort((a,b) => (b.orderTime?.toDate?.() || 0) - (a.orderTime?.toDate?.() || 0));
        renderOrders(allOrders);
    } catch(e) {
        container.innerHTML = `<div class="tbl-loader" style="color:var(--danger)">লোড করা যায়নি।</div>`;
    }
}

function renderOrders(orders) {
    const container = document.getElementById('ordersContainer');
    const filter    = document.getElementById('statusFilter')?.value || 'all';
    const filtered  = filter === 'all' ? orders : orders.filter(o => (o.status||'Pending') === filter);
    if (!filtered.length) {
        container.innerHTML = '<div class="tbl-loader">কোনো অর্ডার পাওয়া যায়নি।</div>'; return;
    }
    container.innerHTML = filtered.map(o => {
        const t  = o.orderTime?.toDate?.() || new Date();
        const st = o.status || 'Pending';
        const hasTxn = o.transactionId && o.transactionId !== 'N/A';
        return `<div class="order-card">
            <div class="oc-top">
                <span class="oc-id">#${o.id.substring(0,10)}</span>
                <span class="status-badge status-${st}">${statusBn(st)}</span>
                <span class="oc-time">${t.toLocaleString('bn-BD')}</span>
            </div>
            <div class="oc-name">${o.name||'N/A'}</div>
            <div class="oc-meta">
                <span class="oc-chip"><i class="fas fa-phone"></i>${o.phone||'—'}</span>
                <span class="oc-chip"><i class="fas fa-location-dot"></i>${o.location||'—'}</span>
                <span class="oc-chip"><i class="fas fa-barcode"></i>${o.productCode||'—'}</span>
                ${hasTxn ? `<span class="oc-chip" style="color:var(--success);border-color:#6ee7b7"><i class="fas fa-check-circle"></i>TXN: ${o.transactionId}</span>` : ''}
            </div>
            <div class="oc-actions">
                <select class="status-select" onchange="updateStatus('${o.id}', this.value)">
                    <option value="Pending"   ${st==='Pending'  ?'selected':''}>⏳ বাকি</option>
                    <option value="Confirmed" ${st==='Confirmed'?'selected':''}>✅ নিশ্চিত</option>
                    <option value="Delivered" ${st==='Delivered'?'selected':''}>🚚 ডেলিভারি</option>
                    <option value="Cancelled" ${st==='Cancelled'?'selected':''}>❌ বাতিল</option>
                </select>
                <button class="btn-detail" onclick="openOrderModal('${o.id}')"><i class="fas fa-eye"></i> বিস্তারিত</button>
                <button class="action-btn danger-btn sm-btn" onclick="deleteOrder('${o.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

window.applyOrderFilter = function() { renderOrders(allOrders); };

window.updateStatus = async function(id, status) {
    try {
        await updateDoc(doc(db,'orders',id), { status });
        const o = allOrders.find(x => x.id===id);
        if (o) o.status = status;
        toast('স্ট্যাটাস আপডেট হয়েছে!','success');
        loadDashboard();
    } catch(e) { toast('আপডেট ব্যর্থ!','error'); }
};

window.deleteOrder = async function(id) {
    if (!confirm('অর্ডারটি মুছে ফেলতে চান?')) return;
    try {
        await deleteDoc(doc(db,'orders',id));
        allOrders = allOrders.filter(x => x.id!==id);
        renderOrders(allOrders);
        loadDashboard();
        toast('অর্ডার মুছে ফেলা হয়েছে।','success');
    } catch(e) { toast('মুছতে সমস্যা হয়েছে।','error'); }
};

// ── ORDER DETAIL MODAL ────────────────────────
window.openOrderModal = function(id) {
    const o = allOrders.find(x => x.id === id);
    if (!o) return;
    const t  = o.orderTime?.toDate?.() || new Date();
    const st = o.status || 'Pending';
    const hasTxn = o.transactionId && o.transactionId !== 'N/A';
    const body = document.getElementById('orderModalBody');
    body.innerHTML = `
        ${hasTxn ? `
        <div class="od-txn">
            <div class="od-txn-label">ট্রানজেকশন আইডি</div>
            <div class="od-txn-id">${o.transactionId}</div>
            <div class="od-txn-method">${o.paymentMethod ? '💳 ' + o.paymentMethod.toUpperCase() : ''}</div>
        </div>` : `
        <div class="od-txn" style="border-color:#fca5a5;background:#fff5f5">
            <div class="od-txn-label">ট্রানজেকশন আইডি</div>
            <div class="od-txn-id" style="color:var(--muted)">পাওয়া যায়নি</div>
        </div>`}

        <div class="od-section">
            <div class="od-section-title"><i class="fas fa-user"></i> কাস্টমার তথ্য</div>
            <div class="od-row"><span class="od-key">নাম</span><span class="od-val">${o.name||'—'}</span></div>
            <div class="od-row"><span class="od-key">ফোন</span><span class="od-val">${o.phone||'—'}</span></div>
            <div class="od-row"><span class="od-key">ঠিকানা</span><span class="od-val">${o.location||'—'}</span></div>
            ${o.comment ? `<div class="od-row"><span class="od-key">মন্তব্য</span><span class="od-val">${o.comment}</span></div>` : ''}
        </div>

        <div class="od-section">
            <div class="od-section-title"><i class="fas fa-box"></i> অর্ডার তথ্য</div>
            <div class="od-row"><span class="od-key">পণ্য কোড</span><span class="od-val"><code>${o.productCode||'—'}</code></span></div>
            <div class="od-row"><span class="od-key">পরিমাণ</span><span class="od-val">${o.quantity||1} টি</span></div>
            <div class="od-row"><span class="od-key">ইউনিট মূল্য</span><span class="od-val">TK ${o.unitPrice||0}</span></div>
            <div class="od-row"><span class="od-key">সাবটোটাল</span><span class="od-val">TK ${o.subtotal||0}</span></div>
            <div class="od-row"><span class="od-key">ডেলিভারি চার্জ</span><span class="od-val">TK ${o.deliveryCharge||0}</span></div>
            <div class="od-row" style="font-weight:700"><span class="od-key" style="color:var(--text)">মোট মূল্য</span><span class="od-val" style="color:var(--primary);font-size:1rem">TK ${o.totalPrice||0}</span></div>
        </div>

        <div class="od-section">
            <div class="od-section-title"><i class="fas fa-clock"></i> অর্ডারের সময়</div>
            <div class="od-row"><span class="od-key">তারিখ ও সময়</span><span class="od-val">${t.toLocaleString('bn-BD')}</span></div>
            <div class="od-row"><span class="od-key">অর্ডার আইডি</span><span class="od-val" style="font-size:.72rem;font-family:monospace">${o.id}</span></div>
        </div>

        <div class="od-status-row">
            <span class="od-status-label">বর্তমান স্ট্যাটাস</span>
            <select class="status-select" onchange="updateStatus('${o.id}',this.value);this.closest('.modal-overlay').classList.remove('open')">
                <option value="Pending"   ${st==='Pending'  ?'selected':''}>⏳ বাকি</option>
                <option value="Confirmed" ${st==='Confirmed'?'selected':''}>✅ নিশ্চিত</option>
                <option value="Delivered" ${st==='Delivered'?'selected':''}>🚚 ডেলিভারি</option>
                <option value="Cancelled" ${st==='Cancelled'?'selected':''}>❌ বাতিল</option>
            </select>
        </div>`;
    document.getElementById('orderModal').classList.add('open');
};

window.closeOrderModal = function(e) {
    if (!e || e.target === document.getElementById('orderModal')) {
        document.getElementById('orderModal').classList.remove('open');
    }
};

// ════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════
window.loadProductsTable = async function() {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '<div class="tbl-loader"><i class="fas fa-spinner fa-spin"></i> লোড হচ্ছে...</div>';
    try {
        const snap = await getDocs(collection(db,'products'));
        allProducts = [];
        snap.forEach(d => allProducts.push({ id:d.id,...d.data() }));
        allProducts.sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0));

        // Populate category filter
        const cats = [...new Set(allProducts.map(p=>p.category).filter(Boolean))];
        const sel  = document.getElementById('categoryFilter');
        const cur  = sel?.value;
        if (sel) {
            sel.innerHTML = '<option value="all">সব ক্যাটাগরি</option>' +
                cats.map(c => `<option value="${c}">${c}</option>`).join('');
            if (cur) sel.value = cur;
        }

        const filter   = sel?.value || 'all';
        const filtered = filter==='all' ? allProducts : allProducts.filter(p=>p.category===filter);

        if (!filtered.length) {
            container.innerHTML = '<div class="tbl-loader">কোনো পণ্য পাওয়া যায়নি।</div>'; return;
        }

        container.innerHTML = filtered.map(p => {
            const img = p.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop';
            return `<div class="product-card">
                <img class="pc-img" src="${img}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop'">
                <div style="flex:1;min-width:0">
                    <div class="pc-name">${p.name||'N/A'} ${p.pinned?'📌':''}</div>
                    <div class="pc-code">${p.productCode||'—'}</div>
                    <div class="pc-price">TK ${p.price||0} ${p.discount?`<span style="font-size:.7rem;color:var(--success);font-weight:600">(${p.discount}% ছাড়)</span>`:''}</div>
                    <div class="pc-badges">
                        ${p.category?`<span class="cat-badge">${p.category}</span>`:''}
                        ${p.pinned?'<span class="pin-badge">📌 পিন করা</span>':''}
                    </div>
                </div>
                <div class="pc-actions">
                    <button class="action-btn ghost-btn sm-btn" onclick="editProduct('${p.id}')"><i class="fas fa-pen"></i></button>
                    <button class="action-btn danger-btn sm-btn" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        container.innerHTML = `<div class="tbl-loader" style="color:var(--danger)">লোড করা যায়নি।</div>`;
    }
};

window.editProduct = function(id) {
    const p = allProducts.find(x => x.id===id);
    if (p) openProdModal(p);
};

window.deleteProduct = async function(id) {
    if (!confirm('পণ্যটি মুছে ফেলতে চান?')) return;
    try {
        await deleteDoc(doc(db,'products',id));
        toast('পণ্য মুছে ফেলা হয়েছে।','success');
        loadProductsTable();
        loadDashboard();
    } catch(e) { toast('মুছতে সমস্যা হয়েছে।','error'); }
};

// Add product btn
document.getElementById('addProductBtn')?.addEventListener('click', () => openProdModal());

// ── PRODUCT MODAL ─────────────────────────────
function openProdModal(p=null) {
    document.getElementById('prodModalTitle').innerHTML =
        `<i class="fas fa-${p?'pen':'plus'}"></i> ${p?'পণ্য এডিট':'নতুন পণ্য যোগ'}`;
    document.getElementById('submitBtnText').textContent = p ? 'আপডেট করুন' : 'যোগ করুন';

    if (p) {
        document.getElementById('productId').value          = p.id;
        document.getElementById('productName').value        = p.name||'';
        document.getElementById('productPrice').value       = p.price||'';
        document.getElementById('productDiscount').value    = p.discount||0;
        document.getElementById('productCode').value        = p.productCode||'';
        document.getElementById('productImage').value       = p.imageUrl||'';
        document.getElementById('productDescription').value = p.description||'';
        document.getElementById('productPinned').checked    = p.pinned||false;
        const cat = p.category||'';
        const sel = document.getElementById('productCategory');
        const opts = [...sel.options].map(o=>o.value);
        if (cat && !opts.includes(cat)) {
            sel.value = 'custom';
            document.getElementById('customCategory').style.display='block';
            document.getElementById('customCategory').value = cat;
        } else {
            sel.value = cat;
            document.getElementById('customCategory').style.display='none';
        }
        setExtraImages(Array.isArray(p.images) ? p.images : []);
    } else {
        document.getElementById('productId').value = '';
        document.getElementById('productForm').reset();
        document.getElementById('customCategory').style.display='none';
        setExtraImages([]);
    }
    document.getElementById('productModal').classList.add('open');
}

window.closeProdModal = function(e) {
    if (!e || e.target===document.getElementById('productModal')) {
        document.getElementById('productModal').classList.remove('open');
    }
};

document.getElementById('productCategory')?.addEventListener('change', function() {
    document.getElementById('customCategory').style.display = this.value==='custom' ? 'block' : 'none';
});

// Multi-image helpers
function addImgRow(val='') {
    const con = document.getElementById('multiImageContainer');
    const idx = con.querySelectorAll('.img-input-row').length;
    const row = document.createElement('div');
    row.className = 'img-input-row';
    row.innerHTML = `
        <input type="url" class="mf-input extra-img" placeholder="https://i.ibb.co/... (ছবি ${idx+2})" value="${val}">
        <button type="button" class="img-rm-btn" onclick="this.closest('.img-input-row').remove()"><i class="fas fa-xmark"></i></button>`;
    con.appendChild(row);
}
function setExtraImages(imgs) {
    const con = document.getElementById('multiImageContainer');
    con.innerHTML = `<div class="img-input-row" data-index="0">
        <input type="url" class="mf-input extra-img" placeholder="https://i.ibb.co/... (ছবি ২)">
        <button type="button" class="img-rm-btn" onclick="this.closest('.img-input-row').remove()"><i class="fas fa-xmark"></i></button>
    </div>`;
    imgs.forEach(u => addImgRow(u));
}
document.getElementById('addMoreImgBtn')?.addEventListener('click', () => addImgRow());

// Product form submit
document.getElementById('productForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id      = document.getElementById('productId').value;
    const name    = document.getElementById('productName').value.trim();
    const price   = parseFloat(document.getElementById('productPrice').value);
    const discount= parseInt(document.getElementById('productDiscount').value)||0;
    const code    = document.getElementById('productCode').value.trim();
    const imgUrl  = document.getElementById('productImage').value.trim();
    const desc    = document.getElementById('productDescription').value.trim();
    const pinned  = document.getElementById('productPinned').checked;
    const catSel  = document.getElementById('productCategory');
    const category = catSel.value==='custom'
        ? document.getElementById('customCategory').value.trim()
        : catSel.value;
    const images = [...document.querySelectorAll('.extra-img')].map(i=>i.value.trim()).filter(Boolean);

    if (!name||!price||!code) { toast('নাম, দাম ও কোড আবশ্যক!','error'); return; }

    const data = {
        name, price, discount, productCode:code, category,
        imageUrl: imgUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
        images, description:desc, pinned, updatedAt: new Date()
    };

    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সেভ হচ্ছে...';
    btn.disabled = true;

    try {
        if (id) { await updateDoc(doc(db,'products',id), data); toast('পণ্য আপডেট হয়েছে!','success'); }
        else   { data.createdAt = new Date(); await addDoc(collection(db,'products'), data); toast('পণ্য যোগ হয়েছে!','success'); }
        closeProdModal();
        loadProductsTable();
        loadDashboard();
    } catch(err) { toast('সেভ করতে ব্যর্থ!','error'); }
    btn.innerHTML = orig; btn.disabled = false;
});

// ════════════════════════════════════════════════
// SLIDERS
// ════════════════════════════════════════════════
window.slPreview = function(url) {
    const img = document.getElementById('slPreviewImg');
    const ph  = document.getElementById('slPreviewPh');
    if (url && url.startsWith('http')) {
        img.src = url; img.style.display = 'block'; ph.style.display = 'none';
        img.onerror = () => { img.style.display='none'; ph.style.display='flex'; };
    } else { img.style.display='none'; ph.style.display='flex'; }
};

async function loadSliders() {
    const con = document.getElementById('sliderListContainer');
    con.innerHTML = '<div class="tbl-loader"><i class="fas fa-spinner fa-spin"></i></div>';
    try {
        const snap = await getDocs(collection(db,'sliders'));
        const sliders = [];
        snap.forEach(d => sliders.push({ id:d.id,...d.data() }));
        sliders.sort((a,b) => (a.order||0)-(b.order||0));
        document.getElementById('slCount').textContent = `${sliders.length}টি slider`;
        if (!sliders.length) {
            con.innerHTML = '<div class="tbl-loader">কোনো slider নেই। উপরে যোগ করুন।</div>'; return;
        }
        con.innerHTML = sliders.map((s,i) => `
            <div class="slider-card" id="slc-${s.id}">
                <img src="${s.imageUrl}" alt="${s.title||''}" onerror="this.style.opacity='.3'">
                <div class="sc-info">
                    <div class="sc-title">${s.title||'(শিরোনাম নেই)'}</div>
                    <div class="sc-url">${s.imageUrl}</div>
                </div>
                <div class="sc-actions">
                    <button class="sc-btn" onclick="moveSlider('${s.id}',${s.order||i+1},-1)" title="উপরে"><i class="fas fa-chevron-up"></i></button>
                    <button class="sc-btn" onclick="moveSlider('${s.id}',${s.order||i+1},1)" title="নিচে"><i class="fas fa-chevron-down"></i></button>
                    <button class="sc-btn del" onclick="deleteSlider('${s.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`).join('');
    } catch(e) { con.innerHTML = '<div class="tbl-loader" style="color:var(--danger)">লোড করা যায়নি।</div>'; }
}

window.addSlider = async function() {
    const url   = document.getElementById('slImgUrl').value.trim();
    const title = document.getElementById('slTitle').value.trim();
    const order = parseInt(document.getElementById('slOrder').value)||1;
    const link  = document.getElementById('slLink').value.trim();
    if (!url) { toast('ইমেজ URL দিন!','error'); return; }
    if (!url.startsWith('http')) { toast('সঠিক URL দিন (http দিয়ে শুরু)','error'); return; }
    const btn = document.getElementById('slAddBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> যোগ হচ্ছে...'; btn.disabled = true;
    try {
        await addDoc(collection(db,'sliders'), { imageUrl:url, title, order, link, createdAt:serverTimestamp() });
        toast('Slider যোগ হয়েছে!','success');
        document.getElementById('slImgUrl').value=''; document.getElementById('slTitle').value='';
        document.getElementById('slLink').value=''; document.getElementById('slOrder').value='1';
        slPreview(''); loadSliders();
    } catch(e) { toast('যোগ করতে সমস্যা হয়েছে।','error'); }
    btn.innerHTML = '<i class="fas fa-plus"></i> Slider যোগ করুন'; btn.disabled = false;
};

window.deleteSlider = async function(id) {
    if (!confirm('এই slider মুছতে চান?')) return;
    try {
        await deleteDoc(doc(db,'sliders',id));
        document.getElementById(`slc-${id}`)?.remove();
        toast('Slider মুছে ফেলা হয়েছে।','success');
        loadSliders();
    } catch(e) { toast('মুছতে সমস্যা হয়েছে।','error'); }
};

window.moveSlider = async function(id, cur, dir) {
    try {
        await updateDoc(doc(db,'sliders',id), { order: cur+dir });
        loadSliders();
    } catch(e) { toast('ক্রম পরিবর্তন করা যায়নি।','error'); }
};
