// =================================================================
// SUPABASE CONFIG & CORE
// =================================================================
const SUPABASE_URL = 'https://cdvmqzhqjskknfntomtx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wWPwhAUH6NZFYx0j5t1mSA_OebPJgoX';
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);

let clientes = [], productos = [], ventas = [], chartVentas = null;
let clienteEditandoId = null, productoEditandoId = null;

async function inicializarApp() {
    Swal.fire({ title: 'Sincronizando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    await sincronizarTodo();
    vincularEventosUI();
    actualizarVistaCompleta();
    Swal.close();
}

async function sincronizarTodo() {
    const [resC, resP, resV] = await Promise.all([
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('productos').select('*').order('nombre'),
        supabase.from('ventas').select('*').order('id', { ascending: false })
    ]);
    clientes = resC.data || [];
    productos = resP.data || [];
    ventas = resV.data || [];
}

// Limpieza de texto para evitar errores de HTML
function esc(t) { 
    return String(t || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); 
}

// =================================================================
// RENDERIZADO DE TABLAS (CRUD)
// =================================================================

function renderizarProductos() {
    const cont = document.getElementById('listaProductos');
    if (!cont) return;
    let html = '<table class="data-table"><thead><tr><th>ID</th><th>Repuesto</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
    
    productos.forEach(p => {
        const bajo = p.cantidad <= p.stockmin;
        const clase = p.cantidad <= 0 ? 'status-critical' : (bajo ? 'status-low' : 'status-ok');
        const estado = p.cantidad <= 0 ? 'Agotado' : (bajo ? 'Bajo' : 'OK');
        
        html += `<tr>
            <td><small>${p.id}</small></td>
            <td><strong>${esc(p.nombre)}</strong></td>
            <td>$${parseFloat(p.precio).toFixed(2)}</td>
            <td>${p.cantidad}</td>
            <td><span class="badge ${clase}">${estado}</span></td>
            <td class="acciones">
                <button onclick="prepararEdicionProducto(${p.id})" class="btn-icon"><i class="fas fa-edit"></i></button>
                <button onclick="eliminarProducto(${p.id})" class="btn-icon btn-danger"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });
    cont.innerHTML = html + '</tbody></table>';
}

async function guardarProducto(e) {
    e.preventDefault();
    const data = {
        nombre: document.getElementById('productoNombre').value.trim(),
        precio: parseFloat(document.getElementById('productoPrecio').value),
        cantidad: parseInt(document.getElementById('productoCantidad').value),
        stockmin: parseInt(document.getElementById('productoStockMin').value) || 5,
        fecha: new Date().toLocaleDateString()
    };

    // Si estamos editando, incluimos el ID para que UPSERT lo reconozca
    if (productoEditandoId) data.id = productoEditandoId;

    const { error } = await supabase.from('productos').upsert(data);
    
    if (error) return Swal.fire('Error', error.message, 'error');

    productoEditandoId = null;
    document.getElementById('formProducto').reset();
    document.getElementById('btnSubmitProd').innerText = 'Guardar Producto';
    await sincronizarTodo();
    actualizarVistaCompleta();
    Swal.fire('Éxito', 'Producto guardado correctamente', 'success');
}

// =================================================================
// LÓGICA DE VENTAS (DESCUENTO DE STOCK)
// =================================================================

async function registrarVenta(e) {
    e.preventDefault();
    const cId = document.getElementById('ventaCliente').value;
    const pId = document.getElementById('ventaProducto').value;
    const cant = parseInt(document.getElementById('ventaCantidad').value);

    if (!cId || !pId || !cant || cant < 1) return Swal.fire('Error', 'Datos incompletos', 'error');

    const cli = clientes.find(c => c.id == cId);
    const prod = productos.find(p => p.id == pId);

    if (cant > prod.cantidad) return Swal.fire('Atención', 'Stock insuficiente', 'warning');

    const venta = { 
        cliente: cli.nombre, 
        producto: prod.nombre, 
        cantidad: cant, 
        total: cant * prod.precio, 
        fecha: new Date().toLocaleDateString() 
    };

    // 1. Insertar Venta
    const resVenta = await supabase.from('ventas').insert(venta);
    
    // 2. Actualizar solo la cantidad en Productos (MÁS RÁPIDO)
    const resProd = await supabase.from('productos')
        .update({ cantidad: prod.cantidad - cant })
        .eq('id', prod.id);

    if (resVenta.error || resProd.error) return Swal.fire('Error', 'No se pudo procesar', 'error');

    await sincronizarTodo();
    actualizarVistaCompleta();
    document.getElementById('formVenta').reset();
    Swal.fire('Venta Realizada', `Total: $${venta.total.toFixed(2)}`, 'success');
}

// =================================================================
// DASHBOARD & EVENTOS (RESTO DEL CÓDIGO)
// =================================================================

function actualizarVistaCompleta() {
    renderizarProductos();
    renderizarClientes();
    renderizarVentas();
    actualizarDashboard();
    
    const sc = document.getElementById('ventaCliente'), sp = document.getElementById('ventaProducto');
    if(sc) sc.innerHTML = '<option value="">Seleccionar Cliente</option>' + clientes.map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
    if(sp) sp.innerHTML = '<option value="">Seleccionar Repuesto</option>' + productos.map(p => `<option value="${p.id}">${esc(p.nombre)} (Stock: ${p.cantidad})</option>`).join('');
}

// Mantener tus funciones de Dashboard, Gráficos y Filtros igual...
// Solo asegúrate de que usen las variables 'productos', 'clientes' y 'ventas' directamente.