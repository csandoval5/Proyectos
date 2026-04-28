// =================================================================
// SUPABASE CONFIG
// =================================================================
const SUPABASE_URL = 'https://cdvmqzhqjskknfntomtx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wWPwhAUH6NZFYx0j5t1mSA_OebPJgoX';
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);

let clientes = [];
let productos = [];
let ventas = [];
let chartVentas = null;
let clienteEditandoId = null;
let productoEditandoId = null;

async function inicializarApp() {
    Swal.fire({ title: 'Sincronizando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    await sincronizarTodo();
    vincularEventosUI();
    actualizarVistaCompleta();
    Swal.close();
}

async function sincronizarTodo() {
    const [{ data: c }, { data: p }, { data: v }] = await Promise.all([
        supabase.from('clientes').select('*'),
        supabase.from('productos').select('*'),
        supabase.from('ventas').select('*')
    ]);
    clientes = (c || []).map(i => ({
        id: Number(i.id), nombre: String(i.nombre || ''), telefono: String(i.telefono || ''),
        direccion: String(i.direccion || ''), moto: String(i.moto || ''), fecha: String(i.fecha || '')
    }));
    productos = (p || []).map(i => ({
        id: Number(i.id), nombre: String(i.nombre || ''), precio: parseFloat(i.precio) || 0,
        cantidad: parseInt(i.cantidad) || 0, stockmin: parseInt(i.stockmin) || 5, fecha: String(i.fecha || '')
    }));
    ventas = (v || []).map(i => ({
        id: Number(i.id), cliente: String(i.cliente || ''), producto: String(i.producto || ''),
        cantidad: parseInt(i.cantidad) || 0, total: parseFloat(i.total) || 0, fecha: String(i.fecha || '')
    }));
}

function obtenerUnicosPorId(arr) {
    const unicos = [];
    const idsVistos = new Set();
    arr.forEach(item => { if (!idsVistos.has(item.id)) { idsVistos.add(item.id); unicos.push(item); } });
    return unicos;
}

function esc(t) { return (t || '').replace(/["<>]/g, c => ({'"': '"', '<': '<', '>': '>'}[c])); }

function renderizarProductos() {
    const cont = document.getElementById('listaProductos');
    if (!cont) return;
    cont.innerHTML = '';
    const unicos = obtenerUnicosPorId(productos);
    let html = '<table class="data-table"><thead><tr><th>ID</th><th>Repuesto</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
    unicos.forEach(p => {
        const bajo = p.cantidad <= p.stockmin;
        const clase = p.cantidad <= 0 ? 'status-critical' : (bajo ? 'status-low' : 'status-ok');
        const estado = p.cantidad <= 0 ? 'Agotado' : (bajo ? 'Bajo' : 'OK');
        html += '<tr><td>' + p.id + '</td><td><strong>' + esc(p.nombre) + '</strong></td><td>$' + p.precio.toFixed(2) + '</td><td>' + p.cantidad + '</td><td><span class="badge ' + clase + '">' + estado + '</span></td><td class="acciones"><button onclick="prepararEdicionProducto(' + p.id + ')" class="btn-icon" title="Editar"><i class="fas fa-edit"></i></button><button onclick="eliminarProducto(' + p.id + ')" class="btn-icon btn-danger" title="Eliminar"><i class="fas fa-trash"></i></button></td></tr>';
    });
    cont.innerHTML = html + '</tbody></table>';
}

async function guardarProducto(e) {
    e.preventDefault();
    const id = productoEditandoId || Date.now();
    const data = {
        id: id, nombre: document.getElementById('productoNombre').value.trim(),
        precio: parseFloat(document.getElementById('productoPrecio').value),
        cantidad: parseInt(document.getElementById('productoCantidad').value),
        stockmin: parseInt(document.getElementById('productoStockMin').value) || 5,
        fecha: new Date().toLocaleDateString()
    };
    if (!data.nombre || isNaN(data.precio) || isNaN(data.cantidad)) {
        return Swal.fire('Error', 'Datos incompletos o invalidos', 'error');
    }
    await supabase.from('productos').upsert(data);
    productoEditandoId = null;
    document.getElementById('formProducto').reset();
    document.getElementById('btnSubmitProd').innerText = 'Guardar Producto';
    await sincronizarTodo();
    actualizarVistaCompleta();
    Swal.fire('Exito', 'Producto guardado', 'success');
}

async function eliminarProducto(id) {
    const c = await Swal.fire({ title: 'Eliminar producto?', text: 'No se puede deshacer', icon: 'warning', showCancelButton: true, confirmButtonText: 'Si, eliminar', cancelButtonText: 'Cancelar' });
    if (!c.isConfirmed) return;
    await supabase.from('productos').delete().eq('id', id);
    productos = productos.filter(p => p.id !== id);
    actualizarVistaCompleta();
    Swal.fire('Eliminado', 'Producto eliminado', 'success');
}

function prepararEdicionProducto(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    productoEditandoId = id;
    document.getElementById('productoNombre').value = p.nombre;
    document.getElementById('productoPrecio').value = p.precio;
    document.getElementById('productoCantidad').value = p.cantidad;
    document.getElementById('productoStockMin').value = p.stockmin;
    document.getElementById('btnSubmitProd').innerText = 'Actualizar Producto';
    showTab('productos');
    document.getElementById('productoNombre').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderizarClientes() {
    const cont = document.getElementById('listaClientes');
    if (!cont) return;
    cont.innerHTML = '';
    const unicos = obtenerUnicosPorId(clientes);
    let html = '<table class="data-table"><thead><tr><th>ID</th><th>Nombre</th><th>Telefono</th><th>Direccion</th><th>Moto</th><th>Acciones</th></tr></thead><tbody>';
    unicos.forEach(c => {
        html += '<tr><td>' + c.id + '</td><td>' + esc(c.nombre) + '</td><td>' + esc(c.telefono) + '</td><td>' + esc(c.direccion) + '</td><td>' + esc(c.moto) + '</td><td class="acciones"><button onclick="prepararEdicionCliente(' + c.id + ')" class="btn-icon" title="Editar"><i class="fas fa-user-edit"></i></button><button onclick="eliminarCliente(' + c.id + ')" class="btn-icon btn-danger" title="Eliminar"><i class="fas fa-trash"></i></button></td></tr>';
    });
    cont.innerHTML = html + '</tbody></table>';
}

async function guardarCliente(e) {
    e.preventDefault();
    const nombre = document.getElementById('clienteNombre').value.trim();
    const telefono = document.getElementById('clienteTelefono').value.trim();
    if (!nombre || !telefono) { return Swal.fire('Error', 'Nombre y telefono obligatorios', 'error'); }
    const data = {
        id: clienteEditandoId || Date.now(), nombre: nombre, telefono: telefono,
        direccion: document.getElementById('clienteDireccion').value,
        moto: document.getElementById('clienteMoto').value,
        fecha: new Date().toLocaleDateString()
    };
    await supabase.from('clientes').upsert(data);
    clienteEditandoId = null;
    document.getElementById('formCliente').reset();
    await sincronizarTodo();
    actualizarVistaCompleta();
    Swal.fire('Exito', 'Cliente guardado', 'success');
}

async function eliminarCliente(id) {
    const c = await Swal.fire({ title: 'Eliminar cliente?', text: 'No se puede deshacer', icon: 'warning', showCancelButton: true, confirmButtonText: 'Si, eliminar', cancelButtonText: 'Cancelar' });
    if (!c.isConfirmed) return;
    await supabase.from('clientes').delete().eq('id', id);
    clientes = clientes.filter(x => x.id !== id);
    actualizarVistaCompleta();
    Swal.fire('Eliminado', 'Cliente eliminado', 'success');
}

function prepararEdicionCliente(id) {
    const c = clientes.find(x => x.id === id);
    if (!c) return;
    clienteEditandoId = id;
    document.getElementById('clienteNombre').value = c.nombre;
    document.getElementById('clienteTelefono').value = c.telefono;
    document.getElementById('clienteDireccion').value = c.direccion;
    document.getElementById('clienteMoto').value = c.moto;
    showTab('clientes');
}

function renderizarVentas() {
    const cont = document.getElementById('listaVentas');
    if (!cont) return;
    cont.innerHTML = '';
    const unicos = obtenerUnicosPorId(ventas);
    let html = '<table class="data-table"><thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Cantidad</th><th>Total</th><th>Acciones</th></tr></thead><tbody>';
    unicos.forEach(v => {
        html += '<tr><td>' + v.id + '</td><td>' + v.fecha + '</td><td>' + esc(v.cliente) + '</td><td>' + esc(v.producto) + '</td><td>' + v.cantidad + '</td><td>$' + parseFloat(v.total).toFixed(2) + '</td><td class="acciones"><button onclick="eliminarVenta(' + v.id + ')" class="btn-icon btn-danger" title="Eliminar"><i class="fas fa-trash"></i></button></td></tr>';
    });
    cont.innerHTML = html + '</tbody></table>';
}

async function registrarVenta(e) {
    e.preventDefault();
    const cId = document.getElementById('ventaCliente').value;
    const pId = document.getElementById('ventaProducto').value;
    const cant = parseInt(document.getElementById('ventaCantidad').value);
    if (!cId || !pId || !cant || cant < 1) { return Swal.fire('Error', 'Seleccione cliente, producto y cantidad valida', 'error'); }
    const cli = clientes.find(c => c.id == cId);
    const prod = productos.find(p => p.id == pId);
    if (!cli || !prod) { return Swal.fire('Error', 'Cliente o producto no encontrado', 'error'); }
    if (cant > prod.cantidad) { return Swal.fire('Atencion', 'Stock insuficiente: ' + prod.cantidad, 'warning'); }
    const venta = { id: Date.now(), cliente: cli.nombre, producto: prod.nombre, cantidad: cant, total: cant * prod.precio, fecha: new Date().toLocaleDateString() };
    prod.cantidad -= cant;
    await supabase.from('ventas').insert(venta);
    await supabase.from('productos').update({ stockmin: prod.stockmin, precio: prod.precio, cantidad: prod.cantidad, nombre: prod.nombre, id: prod.id, fecha: prod.fecha }).eq('id', prod.id);
    await sincronizarTodo();
    actualizarVistaCompleta();
    document.getElementById('formVenta').reset();
    document.getElementById('ventaTotal').value = '$0.00';
    Swal.fire('Venta Realizada', 'Total: $' + venta.total.toFixed(2), 'success');
}

async function eliminarVenta(id) {
    const c = await Swal.fire({ title: 'Eliminar venta?', text: 'No se puede deshacer', icon: 'warning', showCancelButton: true, confirmButtonText: 'Si, eliminar', cancelButtonText: 'Cancelar' });
    if (!c.isConfirmed) return;
    await supabase.from('ventas').delete().eq('id', id);
    ventas = ventas.filter(v => v.id !== id);
    actualizarVistaCompleta();
    Swal.fire('Eliminado', 'Venta eliminada', 'success');
}

function actualizarDashboard() {
    const totalVentas = ventas.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);
    const bajoStock = productos.filter(p => p.cantidad <= p.stockmin).length;
    if(document.getElementById('dashIngresos')) document.getElementById('dashIngresos').innerText = '$' + totalVentas.toFixed(2);
    if(document.getElementById('dashVentasCount')) document.getElementById('dashVentasCount').innerText = ventas.length;
    if(document.getElementById('dashAlertas')) document.getElementById('dashAlertas').innerText = bajoStock;
    const unicosProd = obtenerUnicosPorId(productos);
    const unicosCli = obtenerUnicosPorId(clientes);
    const unicosVen = obtenerUnicosPorId(ventas);
    if(document.getElementById('totalClientes')) document.getElementById('totalClientes').innerText = unicosCli.length;
    if(document.getElementById('totalProductos')) document.getElementById('totalProductos').innerText = unicosProd.length;
    if(document.getElementById('totalVentas')) document.getElementById('totalVentas').innerText = unicosVen.length;
    if(document.getElementById('totalIngresos')) document.getElementById('totalIngresos').innerText = '$' + totalVentas.toFixed(2);
    if(document.getElementById('badgeClientes')) document.getElementById('badgeClientes').innerText = unicosCli.length;
    if(document.getElementById('badgeProductos')) document.getElementById('badgeProductos').innerText = unicosProd.length;
    if(document.getElementById('badgeVentas')) document.getElementById('badgeVentas').innerText = unicosVen.length;
    if(document.getElementById('countClientes')) document.getElementById('countClientes').innerText = unicosCli.length;
    if(document.getElementById('countProductos')) document.getElementById('countProductos').innerText = unicosProd.length;
    if(document.getElementById('countVentas')) document.getElementById('countVentas').innerText = unicosVen.length;
    actualizarReportes(unicosVen, unicosProd, unicosCli);
}

function actualizarReportes(ventasU, productosU, clientesU) {
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasU.filter(v => v.fecha === hoy);
    const ingresosHoy = ventasHoy.reduce((a, v) => a + (parseFloat(v.total) || 0), 0);
    if(document.getElementById('ventasHoy')) document.getElementById('ventasHoy').innerText = ventasHoy.length;
    if(document.getElementById('ingresosHoy')) document.getElementById('ingresosHoy').innerText = '$' + ingresosHoy.toFixed(2);
    const clienteCount = {};
    ventasU.forEach(v => { clienteCount[v.cliente] = (clienteCount[v.cliente] || 0) + 1; });
    const mejorCliente = Object.entries(clienteCount).sort((a,b) => b[1]-a[1])[0];
    if(document.getElementById('mejorCliente')) document.getElementById('mejorCliente').innerText = mejorCliente ? mejorCliente[0] : 'N/A';
    if(document.getElementById('ventasMejorCliente')) document.getElementById('ventasMejorCliente').innerText = mejorCliente ? mejorCliente[1] : 0;
    const productoCount = {};
    ventasU.forEach(v => { productoCount[v.producto] = (productoCount[v.producto] || 0) + (parseInt(v.cantidad) || 0); });
    const prodMasVendido = Object.entries(productoCount).sort((a,b) => b[1]-a[1])[0];
    if(document.getElementById('productoMasVendido')) document.getElementById('productoMasVendido').innerText = prodMasVendido ? prodMasVendido[0] : 'N/A';
    if(document.getElementById('unidadesVendidas')) document.getElementById('unidadesVendidas').innerText = prodMasVendido ? prodMasVendido[1] : 0;
    const stockCritico = productosU.filter(p => p.cantidad <= 0).length;
    if(document.getElementById('stockCritico')) document.getElementById('stockCritico').innerText = stockCritico;
    actualizarGraficaVentas(ventasU);
}

function actualizarGraficaVentas(ventasU) {
    const ctx = document.getElementById('graficoVentas');
    if (!ctx) return;
    const ventasPorFecha = {};
    ventasU.forEach(v => { ventasPorFecha[v.fecha] = (ventasPorFecha[v.fecha] || 0) + (parseFloat(v.total) || 0); });
    const fechas = Object.keys(ventasPorFecha).sort();
    const totales = fechas.map(f => ventasPorFecha[f]);
    if (chartVentas) {
        chartVentas.data.labels = fechas;
        chartVentas.data.datasets[0].data = totales;
        chartVentas.update();
    } else {
        chartVentas = new Chart(ctx, {
            type: 'line',
            data: { labels: fechas, datasets: [{ label: 'Ventas ($)', data: totales, borderColor: '#3498db', backgroundColor: 'rgba(52,152,219,0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
}

function vincularEventosUI() {
    document.getElementById('formProducto')?.addEventListener('submit', guardarProducto);
    document.getElementById('formCliente')?.addEventListener('submit', guardarCliente);
    document.getElementById('formVenta')?.addEventListener('submit', registrarVenta);
    const actualizarTotalVenta = () => {
        const p = productos.find(x => x.id == document.getElementById('ventaProducto').value);
        const c = document.getElementById('ventaCantidad').value || 0;
        if(p && document.getElementById('ventaTotal')) { document.getElementById('ventaTotal').value = '$' + (p.precio * c).toFixed(2); }
        const precioProd = document.getElementById('precioProducto');
        if(precioProd && p) precioProd.innerText = 'Precio unitario: $' + p.precio.toFixed(2);
    };
    document.getElementById('ventaProducto')?.addEventListener('change', actualizarTotalVenta);
    document.getElementById('ventaCantidad')?.addEventListener('input', actualizarTotalVenta);
    const buscador = document.getElementById('buscador');
    const filtroTipo = document.getElementById('filtroTipo');
    buscador?.addEventListener('input', () => filtrarTablas(buscador.value, filtroTipo?.value || 'todos'));
    filtroTipo?.addEventListener('change', () => filtrarTablas(buscador.value, filtroTipo.value));
    document.getElementById('btnExportarExcel')?.addEventListener('click', exportarExcel);
    document.getElementById('btnExportar')?.addEventListener('click', exportarJSON);
    document.getElementById('btnConfig')?.addEventListener('click', mostrarConfiguracion);
}

function filtrarTablas(query, tipo) {
    const q = query.toLowerCase().trim();
    const contenedores = [];
    if (tipo === 'todos' || tipo === 'productos') contenedores.push('listaProductos');
    if (tipo === 'todos' || tipo === 'clientes') contenedores.push('listaClientes');
    if (tipo === 'todos' || tipo === 'ventas') contenedores.push('listaVentas');
    contenedores.forEach(id => {
        const cont = document.getElementById(id);
        if (!cont) return;
        cont.querySelectorAll('tbody tr').forEach(row => { row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none'; });
    });
}

function actualizarVistaCompleta() {
    renderizarProductos();
    renderizarClientes();
    renderizarVentas();
    actualizarDashboard();
    const sc = document.getElementById('ventaCliente'), sp = document.getElementById('ventaProducto');
    if(sc) sc.innerHTML = '<option value="">Seleccionar Cliente</option>' + obtenerUnicosPorId(clientes).map(c => '<option value="' + c.id + '">' + esc(c.nombre) + '</option>').join('');
    if(sp) sp.innerHTML = '<option value="">Seleccionar Repuesto</option>' + obtenerUnicosPorId(productos).map(p => '<option value="' + p.id + '">' + esc(p.nombre) + ' (Stock: ' + p.cantidad + ')</option>').join('');
}

function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => {
        const onclick = b.getAttribute('onclick') || '';
        b.classList.toggle('active', onclick.includes(id));
    });
}

function exportarExcel() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(obtenerUnicosPorId(clientes)), 'Clientes');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(obtenerUnicosPorId(productos)), 'Productos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(obtenerUnicosPorId(ventas)), 'Ventas');
    XLSX.writeFile(wb, 'inventario-' + new Date().toISOString().split('T')[0] + '.xlsx');
}

function exportarJSON() {
    const data = { clientes: obtenerUnicosPorId(clientes), productos: obtenerUnicosPorId(productos), ventas: obtenerUnicosPorId(ventas) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-inventario-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

async function mostrarConfiguracion() {
    const { value: accion } = await Swal.fire({ title: 'Configuracion', input: 'select', inputOptions: { '': 'Seleccione', 'limpiar': 'Limpiar datos locales', 'url': 'Ver URL Supabase' }, showCancelButton: true });
    if (accion === 'limpiar') {
        const c = await Swal.fire({ title: 'Esta seguro?', text: 'Solo limpia datos locales', icon: 'warning', showCancelButton: true, confirmButtonText: 'Si, limpiar' });
        if (c.isConfirmed) { clientes = []; productos = []; ventas = []; actualizarVistaCompleta(); Swal.fire('Limpiado', 'Datos locales eliminados', 'info'); }
    } else if (accion === 'url') { Swal.fire('URL Supabase', SUPABASE_URL, 'info'); }
}

document.addEventListener('DOMContentLoaded', inicializarApp);
