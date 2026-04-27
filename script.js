// ==========================================
// INVENTARIO PRO - VERSIÓN TOTAL (600+ LÍNEAS)
// ==========================================

// --- Variables Globales de Estado ---
let clientes = [];
let productos = [];
let ventas = [];
let chartVentas = null;
let clienteEditandoId = null;
let productoEditandoId = null;

// URL DE TU APLICACIÓN WEB DE GOOGLE (Apps Script)
const URL_API = "https://script.google.com/macros/s/AKfycbwX5bZ62PeOk4Kfx1bdKxYtjjk3E9Cvp77RtetRbqmfQyj_L_j0x1hB3WHjg18XBqu4/exec";

// --- Helpers de Comunicación con la Nube ---

/**
 * Obtiene datos desde Google Sheets según la pestaña especificada.
 */
async function apiGet(tab) {
    try {
        const res = await fetch(`${URL_API}?pestaña=${tab}`);
        if (!res.ok) {
            throw new Error(`Error en la respuesta del servidor: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error(`Error al obtener datos de ${tab}:`, error);
        throw error;
    }
}

/**
 * Envía datos a Google Sheets (Agrega una fila nueva).
 */
async function apiPost(tab, row) {
    try {
        await fetch(URL_API, {
            method: "POST",
            mode: "no-cors", 
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pestaña: tab,
                datos: row
            })
        });
        return true;
    } catch (error) {
        console.error(`Error al enviar datos a ${tab}:`, error);
        return false;
    }
}

// --- Funciones de Normalización de Datos ---

function normalizarClientes(arr) {
    return arr.map(x => {
        return {
            id: Number(x.id) || Date.now(),
            nombre: String(x.nombre || ""),
            telefono: String(x.telefono || ""),
            direccion: String(x.direccion || ""),
            moto: String(x.moto || ""),
            fecha: String(x.fecha || new Date().toLocaleDateString())
        };
    });
}

function normalizarProductos(arr) {
    return arr.map(x => {
        return {
            id: Number(x.id) || Date.now(),
            nombre: String(x.nombre || ""),
            precio: parseFloat(x.precio) || 0,
            cantidad: parseInt(x.cantidad) || 0,
            stockMin: parseInt(x.stockMin) || 5,
            fecha: String(x.fecha || new Date().toLocaleDateString())
        };
    });
}

function normalizarVentas(arr) {
    return arr.map(x => {
        return {
            id: Number(x.id) || Date.now(),
            clienteId: Number(x.clienteId) || 0,
            cliente: String(x.cliente || ""),
            productoId: Number(x.productoId) || 0,
            producto: String(x.producto || ""),
            cantidad: parseInt(x.cantidad) || 0,
            precioUnitario: parseFloat(x.precioUnitario) || 0,
            total: parseFloat(x.total) || 0,
            fecha: String(x.fecha || new Date().toLocaleDateString())
        };
    });
}

// --- Inicialización de la Aplicación ---

async function inicializarApp() {
    console.log("Iniciando aplicación...");
    await cargarDatos();
    configurarEventos();
    actualizarTodo();
}

async function cargarDatos() {
    try {
        // Carga simultánea de todas las pestañas
        const [c, p, v] = await Promise.all([
            apiGet("Clientes"),
            apiGet("Productos"),
            apiGet("Ventas")
        ]);

        clientes = normalizarClientes(c);
        productos = normalizarProductos(p);
        ventas = normalizarVentas(v);

        // Guardar en caché local para acceso offline
        guardarDatosEnLocalStorage();
        console.log("Sincronización exitosa con la nube.");
    } catch (err) {
        console.warn("Fallo la carga desde la nube, cargando respaldo local...", err);
        clientes = JSON.parse(localStorage.getItem("clientes")) || [];
        productos = JSON.parse(localStorage.getItem("productos")) || [];
        ventas = JSON.parse(localStorage.getItem("ventas")) || [];
    }
}

function guardarDatosEnLocalStorage() {
    localStorage.setItem("clientes", JSON.stringify(clientes));
    localStorage.setItem("productos", JSON.stringify(productos));
    localStorage.setItem("ventas", JSON.stringify(ventas));
}

// --- Configuración de Eventos de la Interfaz ---

function configurarEventos() {
    // Formularios
    document.getElementById("formCliente").addEventListener("submit", function(e) {
        e.preventDefault();
        guardarCliente(clienteEditandoId !== null, clienteEditandoId);
    });

    document.getElementById("formProducto").addEventListener("submit", function(e) {
        e.preventDefault();
        guardarProducto(productoEditandoId !== null, productoEditandoId);
    });

    document.getElementById("formVenta").addEventListener("submit", function(e) {
        e.preventDefault();
        registrarVenta();
    });

    // Botones de exportación e importación
    document.getElementById("btnExportarExcel").addEventListener("click", exportarExcelManual);
    
    document.getElementById("btnImportarExcel").addEventListener("click", function() {
        document.getElementById("inputExcel").click();
    });

    document.getElementById("inputExcel").addEventListener("change", importarExcel);
    
    document.getElementById("btnExportar").addEventListener("click", exportarJson);

    // Eventos de cálculo y búsqueda
    document.getElementById("ventaProducto").addEventListener("change", calcularTotalVenta);
    document.getElementById("ventaCantidad").addEventListener("input", calcularTotalVenta);
    document.getElementById("buscador").addEventListener("input", buscarGlobal);

    // Configuración (Simulada)
    document.getElementById("btnConfig").addEventListener("click", function() {
        Swal.fire('Configuración', 'Ajustes del sistema en desarrollo', 'info');
    });
}

// --- Navegación entre Pestañas ---

function showTab(tabId) {
    // Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });

    // Desactivar todos los botones
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });

    // Activar pestaña seleccionada
    document.getElementById(tabId).classList.add('active');

    // Activar botón correspondiente
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.innerText.toLowerCase().includes(tabId)) {
            btn.classList.add('active');
        }
    });
}

// --- Módulo de Clientes ---

function mostrarClientes() {
    const cont = document.getElementById("listaClientes");
    cont.innerHTML = "";

    if (clientes.length === 0) {
        cont.innerHTML = '<p style="padding:20px;text-align:center;color:#999">No hay clientes registrados en el sistema.</p>';
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Dirección</th>
                    <th>Moto</th>
                    <th>Fecha Registro</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    clientes.forEach(c => {
        html += `
            <tr>
                <td>${c.id}</td>
                <td>${c.nombre}</td>
                <td>${c.telefono}</td>
                <td>${c.direccion || '-'}</td>
                <td>${c.moto || '-'}</td>
                <td>${c.fecha}</td>
                <td class="acciones">
                    <button onclick="editarCliente(${c.id})" class="btn-icon" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="eliminarCliente(${c.id})" class="btn-icon btn-danger" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    cont.innerHTML = html;
}

async function guardarCliente(editando, id) {
    const nombre = document.getElementById('clienteNombre').value.trim();
    const telefono = document.getElementById('clienteTelefono').value.trim();
    const direccion = document.getElementById('clienteDireccion').value.trim();
    const moto = document.getElementById('clienteMoto').value.trim();

    if (!nombre || !telefono) {
        Swal.fire('Error', 'El nombre y el teléfono son campos obligatorios.', 'error');
        return;
    }

    const clienteData = {
        id: id || Date.now(),
        nombre: nombre,
        telefono: telefono,
        direccion: direccion,
        moto: moto,
        fecha: new Date().toLocaleDateString()
    };

    if (editando) {
        const index = clientes.findIndex(c => c.id === id);
        if (index > -1) {
            clientes[index] = clienteData;
        }
        clienteEditandoId = null;
        document.querySelector('#formCliente button[type="submit"]').innerHTML = '<i class="fas fa-user-plus"></i> Guardar Cliente';
    } else {
        clientes.push(clienteData);
    }

    // Sincronizar con Google y Local
    await apiPost("Clientes", clienteData);
    guardarDatosEnLocalStorage();
    
    // UI
    document.getElementById('formCliente').reset();
    actualizarTodo();
    Swal.fire('Guardado', 'La información del cliente se ha sincronizado.', 'success');
}

function editarCliente(id) {
    const c = clientes.find(x => x.id === id);
    if (!c) return;

    clienteEditandoId = id;
    document.getElementById('clienteNombre').value = c.nombre;
    document.getElementById('clienteTelefono').value = c.telefono;
    document.getElementById('clienteDireccion').value = c.direccion || '';
    document.getElementById('clienteMoto').value = c.moto || '';

    const btn = document.querySelector('#formCliente button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-save"></i> Actualizar Cliente';
    
    showTab('clientes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarCliente(id) {
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: "El cliente se eliminará de esta vista. Recuerda actualizar tu Excel manualmente si deseas borrar el registro histórico.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        clientes = clientes.filter(c => c.id !== id);
        guardarDatosEnLocalStorage();
        actualizarTodo();
        Swal.fire('Eliminado', 'Cliente removido de la lista local.', 'success');
    }
}

// --- Módulo de Inventario ---

function mostrarProductos() {
    const cont = document.getElementById("listaProductos");
    cont.innerHTML = "";

    if (productos.length === 0) {
        cont.innerHTML = '<p style="padding:20px;text-align:center;color:#999">No hay repuestos o productos en inventario.</p>';
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    productos.forEach(p => {
        let estado = 'Ok';
        let clase = 'estado-ok';

        if (p.cantidad <= 0) {
            estado = 'Agotado';
            clase = 'estado-critico';
        } else if (p.cantidad <= p.stockMin) {
            estado = 'Stock Bajo';
            clase = 'estado-bajo';
        }

        html += `
            <tr>
                <td>${p.id}</td>
                <td>${p.nombre}</td>
                <td>$${p.precio.toFixed(2)}</td>
                <td>${p.cantidad}</td>
                <td>${p.stockMin}</td>
                <td><span class="${clase}">${estado}</span></td>
                <td class="acciones">
                    <button onclick="editarProducto(${p.id})" class="btn-icon" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="eliminarProducto(${p.id})" class="btn-icon btn-danger" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    cont.innerHTML = html;
}

async function guardarProducto(editando, id) {
    const nombre = document.getElementById('productoNombre').value.trim();
    const precio = parseFloat(document.getElementById('productoPrecio').value);
    const cantidad = parseInt(document.getElementById('productoCantidad').value);
    const stockMin = parseInt(document.getElementById('productoStockMin').value) || 5;

    if (!nombre || isNaN(precio) || isNaN(cantidad)) {
        Swal.fire('Error', 'Completa todos los campos correctamente.', 'error');
        return;
    }

    const productoData = {
        id: id || Date.now(),
        nombre: nombre,
        precio: precio,
        cantidad: cantidad,
        stockMin: stockMin,
        fecha: new Date().toLocaleDateString()
    };

    if (editando) {
        const index = productos.findIndex(p => p.id === id);
        if (index > -1) {
            productos[index] = productoData;
        }
        productoEditandoId = null;
        document.querySelector('#formProducto button[type="submit"]').innerHTML = '<i class="fas fa-box"></i> Guardar Producto';
    } else {
        productos.push(productoData);
    }

    await apiPost("Productos", productoData);
    guardarDatosEnLocalStorage();
    
    document.getElementById('formProducto').reset();
    actualizarTodo();
    Swal.fire('Éxito', 'Producto actualizado en la nube.', 'success');
}

function editarProducto(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;

    productoEditandoId = id;
    document.getElementById('productoNombre').value = p.nombre;
    document.getElementById('productoPrecio').value = p.precio;
    document.getElementById('productoCantidad').value = p.cantidad;
    document.getElementById('productoStockMin').value = p.stockMin;

    document.querySelector('#formProducto button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Actualizar Producto';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarProducto(id) {
    const result = await Swal.fire({
        title: '¿Eliminar producto?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
        productos = productos.filter(p => p.id !== id);
        guardarDatosEnLocalStorage();
        actualizarTodo();
    }
}

// --- Módulo de Ventas ---

async function registrarVenta() {
    const clienteId = parseInt(document.getElementById('ventaCliente').value);
    const productoId = parseInt(document.getElementById('ventaProducto').value);
    const cantidad = parseInt(document.getElementById('ventaCantidad').value);

    if (!clienteId || !productoId || isNaN(cantidad) || cantidad < 1) {
        Swal.fire('Error', 'Selecciona cliente, producto y cantidad válida.', 'error');
        return;
    }

    const cliente = clientes.find(c => c.id === clienteId);
    const producto = productos.find(p => p.id === productoId);

    if (producto.cantidad < cantidad) {
        Swal.fire('Stock Insuficiente', `Solo quedan ${producto.cantidad} unidades de ${producto.nombre}`, 'error');
        return;
    }

    const venta = {
        id: Date.now(),
        clienteId: cliente.id,
        cliente: cliente.nombre,
        productoId: producto.id,
        producto: producto.nombre,
        cantidad: cantidad,
        precioUnitario: producto.precio,
        total: cantidad * producto.precio,
        fecha: new Date().toLocaleDateString()
    };

    // Actualización local
    ventas.push(venta);
    producto.cantidad -= cantidad;

    // Sincronización con Google Sheets
    await apiPost("Ventas", venta);
    await apiPost("Productos", producto); // Actualizamos el stock en la nube también

    guardarDatosEnLocalStorage();
    actualizarTodo();
    
    document.getElementById('formVenta').reset();
    document.getElementById('ventaTotal').value = '$0.00';
    
    Swal.fire('Venta Exitosa', `Se registró la venta por $${venta.total.toFixed(2)}`, 'success');
}

function mostrarVentas() {
    const cont = document.getElementById("listaVentas");
    cont.innerHTML = "";

    if (ventas.length === 0) {
        cont.innerHTML = '<p style="padding:20px;text-align:center;color:#999">No se han registrado ventas aún.</p>';
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Total</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    ventas.forEach(v => {
        html += `
            <tr>
                <td>${v.fecha}</td>
                <td>${v.cliente}</td>
                <td>${v.producto}</td>
                <td>${v.cantidad}</td>
                <td>$${v.total.toFixed(2)}</td>
                <td>
                    <button onclick="eliminarVenta(${v.id})" class="btn-icon btn-danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    cont.innerHTML = html;
}

async function eliminarVenta(id) {
    const res = await Swal.fire({
        title: '¿Anular venta?',
        text: "Esto no devolverá automáticamente el stock al producto.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Anular'
    });

    if (res.isConfirmed) {
        ventas = ventas.filter(v => v.id !== id);
        guardarDatosEnLocalStorage();
        actualizarTodo();
    }
}

// --- Cálculos y UI Dinámica ---

function calcularTotalVenta() {
    const pId = parseInt(document.getElementById('ventaProducto').value);
    const cant = parseInt(document.getElementById('ventaCantidad').value) || 0;
    
    const producto = productos.find(p => p.id === pId);
    
    if (producto) {
        const total = cant * producto.precio;
        document.getElementById('ventaTotal').value = '$' + total.toFixed(2);
        document.getElementById('precioProducto').textContent = `Precio Unitario: $${producto.precio.toFixed(2)} | Stock: ${producto.cantidad}`;
    } else {
        document.getElementById('ventaTotal').value = '$0.00';
        document.getElementById('precioProducto').textContent = '';
    }
}

function buscarGlobal() {
    const query = document.getElementById("buscador").value.toLowerCase();
    
    // Filtramos todas las filas de todas las tablas visibles
    document.querySelectorAll('.data-table tbody tr').forEach(row => {
        const texto = row.textContent.toLowerCase();
        row.style.display = texto.includes(query) ? '' : 'none';
    });
}

function cargarClientesEnSelect() {
    const select = document.getElementById("ventaCliente");
    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar Cliente</option>';
    clientes.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        select.appendChild(opt);
    });
}

function cargarProductosEnSelect() {
    const select = document.getElementById("ventaProducto");
    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar Producto</option>';
    productos.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nombre;
        select.appendChild(opt);
    });
}

// --- Dashboards y Reportes ---

function actualizarContadores() {
    const totalIngresos = ventas.reduce((acc, v) => acc + v.total, 0);

    document.getElementById("totalClientes").textContent = clientes.length;
    document.getElementById("totalProductos").textContent = productos.length;
    document.getElementById("totalVentas").textContent = ventas.length;
    document.getElementById("totalIngresos").textContent = '$' + totalIngresos.toFixed(2);

    // Badges laterales (si existen en el HTML)
    const bC = document.getElementById("badgeClientes");
    if (bC) bC.textContent = clientes.length;
    
    const bP = document.getElementById("badgeProductos");
    if (bP) bP.textContent = productos.length;
    
    const bV = document.getElementById("badgeVentas");
    if (bV) bV.textContent = ventas.length;
}

function actualizarReportes() {
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventas.filter(v => v.fecha === hoy);
    const ingresosHoy = ventasHoy.reduce((acc, v) => acc + v.total, 0);

    if (document.getElementById("ventasHoy")) {
        document.getElementById("ventasHoy").textContent = ventasHoy.length;
    }
    
    if (document.getElementById("ingresosHoy")) {
        document.getElementById("ingresosHoy").textContent = '$' + ingresosHoy.toFixed(2);
    }

    const stockBajo = productos.filter(p => p.cantidad <= p.stockMin).length;
    if (document.getElementById("stockCritico")) {
        document.getElementById("stockCritico").textContent = stockBajo;
    }

    renderizarGraficoVentas();
}

function renderizarGraficoVentas() {
    const canvas = document.getElementById("graficoVentas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const historico = {};

    // Agrupar ventas por fecha
    ventas.forEach(v => {
        historico[v.fecha] = (historico[v.fecha] || 0) + v.total;
    });

    const labels = Object.keys(historico);
    const data = Object.values(historico);

    if (chartVentas) {
        chartVentas.destroy();
    }

    chartVentas = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ingresos por Día ($)',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// --- Importación y Exportación ---

function exportarExcelManual() {
    const wb = XLSX.utils.book_new();
    
    const wsClientes = XLSX.utils.json_to_sheet(clientes);
    const wsProductos = XLSX.utils.json_to_sheet(productos);
    const wsVentas = XLSX.utils.json_to_sheet(ventas);

    XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");
    XLSX.utils.book_append_sheet(wb, wsProductos, "Productos");
    XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");

    XLSX.writeFile(wb, `Inventario_Taller_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function importarExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        clientes = XLSX.utils.sheet_to_json(workbook.Sheets["Clientes"]) || [];
        productos = XLSX.utils.sheet_to_json(workbook.Sheets["Productos"]) || [];
        ventas = XLSX.utils.sheet_to_json(workbook.Sheets["Ventas"]) || [];

        guardarDatosEnLocalStorage();
        actualizarTodo();
        Swal.fire('Importación Exitosa', 'Los datos del Excel han sido cargados.', 'success');
    };
    reader.readAsArrayBuffer(file);
}

function exportarJson() {
    const backup = {
        clientes: clientes,
        productos: productos,
        ventas: ventas,
        fechaBackup: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sistema_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Función Maestra de Actualización ---

function actualizarTodo() {
    mostrarClientes();
    mostrarProductos();
    mostrarVentas();
    cargarClientesEnSelect();
    cargarProductosEnSelect();
    actualizarContadores();
    actualizarReportes();
    console.log("Interfaz actualizada completamente.");
}

// --- Disparador Inicial ---
document.addEventListener('DOMContentLoaded', inicializarApp);