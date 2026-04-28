let clientes = [], productos = [], ventas = [], chartVentas = null;
let clienteEditandoId = null, productoEditandoId = null;
const URL_API = "https://script.google.com/macros/s/AKfycbzmo0l_GDbCF7gq5RNLIQ_lOO7sKz2A5H2s5BIHKuqA0mLeaO8e_Mmvktob317RsoAk/exec";

async function apiGet(p) {
    try {
        const r = await fetch(`${URL_API}?pestaña=${p}`);
        const d = await r.json();
        return Array.isArray(d) ? d : [];
    } catch (e) { console.error(e); return []; }
}

async function apiPost(p, d) {
    try {
        await fetch(URL_API, { method: "POST", mode: "no-cors", body: JSON.stringify({ pestaña: p, datos: d }) });
        return true;
    } catch (e) { return false; }
}

async function inicializarApp() {
    console.log("Iniciando...");
    await sincronizarTodo();
    configurarForms();
    renderizarTodo();
}

async function sincronizarTodo() {
    const [c, p, v] = await Promise.all([apiGet("Clientes"), apiGet("Productos"), apiGet("Ventas")]);
    clientes = c.map(i => ({ id: Number(i.id), nombre: String(i.nombre || ""), telefono: String(i.telefono || ""), direccion: String(i.direccion || ""), moto: String(i.moto || ""), fecha: String(i.fecha || "") }));
    productos = p.map(i => ({ id: Number(i.id), nombre: String(i.nombre || ""), precio: parseFloat(i.precio) || 0, cantidad: parseInt(i.cantidad) || 0, stockmin: parseInt(i.stockmin) || 5, fecha: String(i.fecha || "") }));
    ventas = v.map(i => ({ id: Number(i.id), cliente: String(i.cliente || ""), producto: String(i.producto || ""), cantidad: parseInt(i.cantidad) || 0, total: parseFloat(i.total) || 0, fecha: String(i.fecha || "") }));
    localStorage.setItem("motos_backup", JSON.stringify({clientes, productos, ventas}));
}

function renderizarProductos() {
    const cont = document.getElementById("listaProductos");
    if (!cont) return;
    cont.innerHTML = "";
    const unicos = [], ids = new Set();
    productos.forEach(p => { if (!ids.has(p.id)) { ids.add(p.id); unicos.push(p); } });
    let h = `<table class="data-table"><thead><tr><th>ID</th><th>Repuesto</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>`;
    unicos.forEach(p => {
        const crit = p.cantidad <= p.stockmin;
        const cl = p.cantidad <= 0 ? 'status-critical' : (crit ? 'status-low' : 'status-ok');
        h += `<tr><td>${p.id}</td><td>${p.nombre}</td><td>$${p.precio.toFixed(2)}</td><td>${p.cantidad}</td><td><span class="badge ${cl}">${p.cantidad <= 0 ? 'Agotado' : (crit ? 'Bajo' : 'OK')}</span></td><td><button onclick="editProd(${p.id})" class="btn-edit"><i class="fas fa-edit"></i></button></td></tr>`;
    });
    cont.innerHTML = h + "</tbody></table>";
}

async function saveProd(e) {
    e.preventDefault();
    const d = { id: productoEditandoId || Date.now(), nombre: document.getElementById('productoNombre').value.trim(), precio: parseFloat(document.getElementById('productoPrecio').value), cantidad: parseInt(document.getElementById('productoCantidad').value), stockmin: parseInt(document.getElementById('productoStockMin').value) || 5, fecha: new Date().toLocaleDateString() };
    if (!d.nombre || isNaN(d.precio)) return Swal.fire("Error", "Completa los datos", "error");
    await apiPost("Productos", d);
    productoEditandoId = null;
    document.getElementById('formProducto').reset();
    document.getElementById('btnSubmitProd').innerHTML = '<i class="fas fa-save"></i> Guardar';
    await sincronizarTodo();
    renderizarTodo();
    Swal.fire("Éxito", "Producto sincronizado", "success");
}

function editProd(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    productoEditandoId = id;
    document.getElementById('productoNombre').value = p.nombre;
    document.getElementById('productoPrecio').value = p.precio;
    document.getElementById('productoCantidad').value = p.cantidad;
    document.getElementById('productoStockMin').value = p.stockmin;
    document.getElementById('btnSubmitProd').innerHTML = "Actualizar Producto";
    window.scrollTo(0,0);
}

function renderizarClientes() {
    const cont = document.getElementById("listaClientes");
    if (!cont) return;
    cont.innerHTML = "";
    let h = `<table class="data-table"><thead><tr><th>Cliente</th><th>Teléfono</th><th>Moto</th><th>Acciones</th></tr></thead><tbody>`;
    clientes.forEach(c => { h += `<tr><td>${c.nombre}</td><td>${c.telefono}</td><td>${c.moto}</td><td><button onclick="editCli(${c.id})" class="btn-edit"><i class="fas fa-edit"></i></button></td></tr>`; });
    cont.innerHTML = h + "</tbody></table>";
}

async function saveCli(e) {
    e.preventDefault();
    const d = { id: clienteEditandoId || Date.now(), nombre: document.getElementById('clienteNombre').value, telefono: document.getElementById('clienteTelefono').value, direccion: document.getElementById('clienteDireccion').value, moto: document.getElementById('clienteMoto').value, fecha: new Date().toLocaleDateString() };
    await apiPost("Clientes", d);
    clienteEditandoId = null;
    document.getElementById('formCliente').reset();
    await sincronizarTodo();
    renderizarTodo();
}

function editCli(id) {
    const c = clientes.find(x => x.id === id);
    if (!c) return;
    clienteEditandoId = id;
    document.getElementById('clienteNombre').value = c.nombre;
    document.getElementById('clienteTelefono').value = c.telefono;
    document.getElementById('clienteDireccion').value = c.direccion;
    document.getElementById('clienteMoto').value = c.moto;
    showTab('clientes');
}

async function regVenta(e) {
    e.preventDefault();
    const cId = document.getElementById('ventaCliente').value, pId = document.getElementById('ventaProducto').value, cant = parseInt(document.getElementById('ventaCantidad').value);
    const cli = clientes.find(c => c.id == cId), prod = productos.find(p => p.id == pId);
    if (!cli || !prod || cant > prod.cantidad) return Swal.fire("Error", "Stock insuficiente", "error");
    const v = { id: Date.now(), cliente: cli.nombre, producto: prod.nombre, cantidad: cant, total: cant * prod.precio, fecha: new Date().toLocaleDateString() };
    prod.cantidad -= cant;
    await apiPost("Ventas", v);
    await apiPost("Productos", prod);
    await sincronizarTodo();
    renderizarTodo();
    document.getElementById('formVenta').reset();
    Swal.fire("Venta!", "Éxito", "success");
}

function renderizarVentas() {
    const cont = document.getElementById("listaVentas");
    if (!cont) return;
    let h = `<table class="data-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Total</th></tr></thead><tbody>`;
    [...ventas].reverse().forEach(v => { h += `<tr><td>${v.fecha}</td><td>${v.cliente}</td><td>${v.producto}</td><td>$${v.total.toFixed(2)}</td></tr>`; });
    cont.innerHTML = h + "</tbody></table>";
}

function actualizarDash() {
    const total = ventas.reduce((acc, v) => acc + v.total, 0);
    const bajos = productos.filter(p => p.cantidad <= p.stockmin).length;
    if(document.getElementById("dashTotal")) document.getElementById("dashTotal").innerText = `$${total.toFixed(2)}`;
    if(document.getElementById("dashVentas")) document.getElementById("dashVentas").innerText = ventas.length;
    if(document.getElementById("dashAlertas")) document.getElementById("dashAlertas").innerText = bajos;
    dibujarGraf();
}

function dibujarGraf() {
    const canvas = document.getElementById('graficoVentas');
    if (!canvas || !ventas.length) return;
    const ctx = canvas.getContext('2d');
    const datos = {};
    ventas.forEach(v => { datos[v.fecha] = (datos[v.fecha] || 0) + v.total; });
    if (chartVentas) chartVentas.destroy();
    chartVentas = new Chart(ctx, { type: 'line', data: { labels: Object.keys(datos), datasets: [{ label: 'Ventas $', data: Object.values(datos), borderColor: '#3498db', tension: 0.3 }] } });
}

function configurarForms() {
    document.getElementById("formProducto")?.addEventListener("submit", saveProd);
    document.getElementById("formCliente")?.addEventListener("submit", saveCli);
    document.getElementById("formVenta")?.addEventListener("submit", regVenta);
    document.getElementById("ventaProducto")?.addEventListener("change", calcTotal);
    document.getElementById("ventaCantidad")?.addEventListener("input", calcTotal);
    document.getElementById("buscador")?.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll(".data-table tbody tr").forEach(r => { r.style.display = r.innerText.toLowerCase().includes(q) ? "" : "none"; });
    });
}

function calcTotal() {
    const p = productos.find(x => x.id == document.getElementById('ventaProducto').value);
    const c = document.getElementById('ventaCantidad').value || 0;
    if (p) document.getElementById('ventaTotalDisplay').innerText = `$${(p.precio * c).toFixed(2)}`;
}

function renderizarTodo() {
    renderizarProductos();
    renderizarClientes();
    renderizarVentas();
    actualizarDash();
    const sc = document.getElementById("ventaCliente"), sp = document.getElementById("ventaProducto");
    if(sc) sc.innerHTML = '<option value="">Cliente</option>' + clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    if(sp) sp.innerHTML = '<option value="">Producto</option>' + productos.map(p => `<option value="${p.id}">${p.nombre} (${p.cantidad})</option>`).join('');
}

function showTab(t) {
    document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
    document.getElementById(t)?.classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('onclick').includes(t)));
}

document.addEventListener('DOMContentLoaded', inicializarApp);