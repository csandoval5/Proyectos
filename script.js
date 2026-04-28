// =================================================================
// SISTEMA DE GESTIÓN PARA TALLER DE MOTOS - VERSIÓN EXTENDIDA
// CONEXIÓN ILIMITADA VÍA GOOGLE APPS SCRIPT
// =================================================================

/**
 * ESTADO GLOBAL: Variables que mantienen la información en la memoria 
 * del navegador mientras la aplicación está abierta.
 */
let clientes = [];
let productos = [];
let ventas = [];
let chartVentas = null;
let clienteEditandoId = null;
let productoEditandoId = null;

// URL de la API (Google Apps Script Deploy)
const URL_API = "https://script.google.com/macros/s/AKfycbwX5bZ62PeOk4Kfx1bdKxYtjjk3E9Cvp77RtetRbqmfQyj_L_j0x1hB3WHjg18XBqu4/exec";

// =================================================================
// 1. MÓDULO DE COMUNICACIÓN (API HELPERS)
// =================================================================

/**
 * Obtiene los registros de una pestaña específica de Google Sheets.
 */
async function apiGet(tab) {
    try {
        const respuesta = await fetch(`${URL_API}?pestaña=${tab}`);
        if (!respuesta.ok) {
            throw new Error(`Error en la petición: ${respuesta.statusText}`);
        }
        const datos = await respuesta.json();
        return datos;
    } catch (error) {
        console.error(`Error al obtener datos de ${tab}:`, error);
        return [];
    }
}

/**
 * Envía un nuevo registro a Google Sheets.
 * Nota: Google Apps Script siempre añade una fila al final (append).
 */
async function apiPost(tab, fila) {
    try {
        await fetch(URL_API, {
            method: "POST",
            mode: "no-cors", 
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pestaña: tab,
                datos: fila
            })
        });
        return true;
    } catch (error) {
        console.error(`Error al enviar datos a ${tab}:`, error);
        return false;
    }
}

// =================================================================
// 2. LÓGICA DE INICIALIZACIÓN
// =================================================================

/**
 * Arranca la aplicación: carga datos, configura botones y dibuja tablas.
 */
async function inicializarApp() {
    console.log("Iniciando sistema de inventario...");
    await cargarDatosDesdeNube();
    vincularEventosInterfaz();
    actualizarTodaLaInterfaz();
}

/**
 * Sincroniza los arrays locales con la base de datos de Google.
 */
async function cargarDatosDesdeNube() {
    try {
        const [rawClientes, rawProductos, rawVentas] = await Promise.all([
            apiGet("Clientes"),
            apiGet("Productos"),
            apiGet("Ventas")
        ]);

        // Procesar y limpiar datos de Clientes
        clientes = rawClientes.map(c => ({
            id: Number(c.id) || Date.now(),
            nombre: String(c.nombre || ""),
            telefono: String(c.telefono || ""),
            direccion: String(c.direccion || ""),
            moto: String(c.moto || ""),
            fecha: String(c.fecha || new Date().toLocaleDateString())
        }));

        // Procesar y limpiar datos de Productos
        productos = rawProductos.map(p => ({
            id: Number(p.id) || Date.now(),
            nombre: String(p.nombre || ""),
            precio: parseFloat(p.precio) || 0,
            cantidad: parseInt(p.cantidad) || 0,
            stockMin: parseInt(p.stockMin) || 5,
            fecha: String(p.fecha || new Date().toLocaleDateString())
        }));

        // Procesar y limpiar datos de Ventas
        ventas = rawVentas.map(v => ({
            id: Number(v.id) || Date.now(),
            cliente: String(v.cliente || ""),
            producto: String(v.producto || ""),
            cantidad: parseInt(v.cantidad) || 0,
            total: parseFloat(v.total) || 0,
            fecha: String(v.fecha || new Date().toLocaleDateString())
        }));

        respaldarEnLocalStorage();
        console.log("Sincronización completada.");
    } catch (err) {
        console.warn("Fallo la conexión. Cargando datos locales.");
        recuperarDeLocalStorage();
    }
}

function respaldarEnLocalStorage() {
    localStorage.setItem("clientes", JSON.stringify(clientes));
    localStorage.setItem("productos", JSON.stringify(productos));
    localStorage.setItem("ventas", JSON.stringify(ventas));
}

function recuperarDeLocalStorage() {
    clientes = JSON.parse(localStorage.getItem("clientes")) || [];
    productos = JSON.parse(localStorage.getItem("productos")) || [];
    ventas = JSON.parse(localStorage.getItem("ventas")) || [];
}

// =================================================================
// 3. MÓDULO DE CLIENTES
// =================================================================

function dibujarTablaClientes() {
    const contenedor = document.getElementById("listaClientes");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    if (clientes.length === 0) {
        contenedor.innerHTML = '<p class="vacio">No hay clientes en la base de datos.</p>';
        return;
    }

    let tabla = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Dirección</th>
                    <th>Moto / Modelo</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    clientes.forEach(c => {
        tabla += `
            <tr>
                <td>${c.nombre}</td>
                <td>${c.telefono}</td>
                <td>${c.direccion}</td>
                <td>${c.moto}</td>
                <td class="acciones">
                    <button class="btn-edit" onclick="prepararEdicionCliente(${c.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="eliminarClienteLocal(${c.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tabla += "</tbody></table>";
    contenedor.innerHTML = tabla;
}

async function procesarFormularioCliente(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('clienteNombre').value.trim();
    const telefono = document.getElementById('clienteTelefono').value.trim();
    const direccion = document.getElementById('clienteDireccion').value.trim();
    const moto = document.getElementById('clienteMoto').value.trim();

    if (!nombre || !telefono) {
        Swal.fire("Atención", "Nombre y Teléfono son obligatorios", "warning");
        return;
    }

    const dataCliente = {
        id: clienteEditandoId || Date.now(),
        nombre: nombre,
        telefono: telefono,
        direccion: direccion,
        moto: moto,
        fecha: new Date().toLocaleDateString()
    };

    if (clienteEditandoId) {
        const indice = clientes.findIndex(c => c.id === clienteEditandoId);
        if (indice !== -1) clientes[indice] = dataCliente;
        clienteEditandoId = null;
        document.getElementById('btnGuardarCliente').innerText = "Guardar Cliente";
    } else {
        clientes.push(dataCliente);
    }

    await apiPost("Clientes", dataCliente);
    document.getElementById('formCliente').reset();
    actualizarTodaLaInterfaz();
    Swal.fire("Éxito", "Cliente sincronizado", "success");
}

function prepararEdicionCliente(id) {
    const c = clientes.find(x => x.id === id);
    if (!c) return;

    clienteEditandoId = id;
    document.getElementById('clienteNombre').value = c.nombre;
    document.getElementById('clienteTelefono').value = c.telefono;
    document.getElementById('clienteDireccion').value = c.direccion;
    document.getElementById('clienteMoto').value = c.moto;
    document.getElementById('btnGuardarCliente').innerText = "Actualizar Cliente";
    
    // Ir a la pestaña de clientes
    cambiarPestana('clientes');
}

// =================================================================
// 4. MÓDULO DE INVENTARIO (PRODUCTOS)
// =================================================================

function dibujarTablaProductos() {
    const contenedor = document.getElementById("listaProductos");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    let tabla = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Repuesto</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    productos.forEach(p => {
        const stockBajo = p.cantidad <= p.stockMin;
        const claseEstado = stockBajo ? 'status-low' : 'status-ok';
        const textoEstado = stockBajo ? 'Bajo Stock' : 'Disponible';

        tabla += `
            <tr>
                <td>${p.nombre}</td>
                <td>$${p.precio.toFixed(2)}</td>
                <td>${p.cantidad} unidades</td>
                <td><span class="badge ${claseEstado}">${textoEstado}</span></td>
                <td class="acciones">
                    <button class="btn-edit" onclick="prepararEdicionProducto(${p.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="eliminarProductoLocal(${p.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tabla += "</tbody></table>";
    contenedor.innerHTML = tabla;
}

async function procesarFormularioProducto(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('productoNombre').value.trim();
    const precio = parseFloat(document.getElementById('productoPrecio').value);
    const cantidad = parseInt(document.getElementById('productoCantidad').value);
    const min = parseInt(document.getElementById('productoStockMin').value) || 5;

    if (!nombre || isNaN(precio) || isNaN(cantidad)) {
        Swal.fire("Error", "Verifica los datos del producto", "error");
        return;
    }

    const dataProducto = {
        id: productoEditandoId || Date.now(),
        nombre: nombre,
        precio: precio,
        cantidad: cantidad,
        stockMin: min,
        fecha: new Date().toLocaleDateString()
    };

    if (productoEditandoId) {
        const idx = productos.findIndex(p => p.id === productoEditandoId);
        if (idx !== -1) productos[idx] = dataProducto;
        productoEditandoId = null;
        document.getElementById('btnGuardarProducto').innerText = "Guardar Producto";
    } else {
        productos.push(dataProducto);
    }

    await apiPost("Productos", dataProducto);
    document.getElementById('formProducto').reset();
    actualizarTodaLaInterfaz();
    Swal.fire("Sincronizado", "Inventario actualizado en Google", "success");
}

function prepararEdicionProducto(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;

    productoEditandoId = id;
    document.getElementById('productoNombre').value = p.nombre;
    document.getElementById('productoPrecio').value = p.precio;
    document.getElementById('productoCantidad').value = p.cantidad;
    document.getElementById('productoStockMin').value = p.stockMin;
    document.getElementById('btnGuardarProducto').innerText = "Actualizar Producto";
}

// =================================================================
// 5. MÓDULO DE VENTAS Y CAJA
// =================================================================

async function registrarNuevaVenta(event) {
    event.preventDefault();

    const cId = parseInt(document.getElementById('ventaCliente').value);
    const pId = parseInt(document.getElementById('ventaProducto').value);
    const cant = parseInt(document.getElementById('ventaCantidad').value);

    const cliente = clientes.find(c => c.id === cId);
    const producto = productos.find(p => p.id === pId);

    if (!cliente || !producto || isNaN(cant) || cant < 1) {
        Swal.fire("Error", "Selecciona cliente, producto y cantidad", "warning");
        return;
    }

    if (producto.cantidad < cant) {
        Swal.fire("Sin Stock", `Solo quedan ${producto.cantidad} unidades`, "error");
        return;
    }

    const totalVenta = cant * producto.precio;
    const nuevaVenta = {
        id: Date.now(),
        cliente: cliente.nombre,
        producto: producto.nombre,
        cantidad: cant,
        total: totalVenta,
        fecha: new Date().toLocaleDateString()
    };

    // Actualización local
    ventas.push(nuevaVenta);
    producto.cantidad -= cant;

    // Enviar a la nube (Venta y el Producto actualizado)
    await apiPost("Ventas", nuevaVenta);
    await apiPost("Productos", producto); 

    document.getElementById('formVenta').reset();
    document.getElementById('ventaTotalDisplay').innerText = "$0.00";
    
    actualizarTodaLaInterfaz();
    Swal.fire("Venta Registrada", `Total: $${totalVenta.toFixed(2)}`, "success");
}

function dibujarTablaVentas() {
    const contenedor = document.getElementById("listaVentas");
    if (!contenedor) return;

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Repuesto</th>
                    <th>Cant.</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Mostrar últimas ventas primero
    [...ventas].reverse().forEach(v => {
        html += `
            <tr>
                <td>${v.fecha}</td>
                <td>${v.cliente}</td>
                <td>${v.producto}</td>
                <td>${v.cantidad}</td>
                <td>$${v.total.toFixed(2)}</td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    contenedor.innerHTML = html;
}

// =================================================================
// 6. DASHBOARD Y UI HELPERS
// =================================================================

function actualizarResumenDashboard() {
    const ingresosTotales = ventas.reduce((suma, v) => suma + v.total, 0);
    const stockCritico = productos.filter(p => p.cantidad <= p.stockMin).length;

    if(document.getElementById("dashIngresos")) {
        document.getElementById("dashIngresos").innerText = `$${ingresosTotales.toFixed(2)}`;
    }
    if(document.getElementById("dashVentasCount")) {
        document.getElementById("dashVentasCount").innerText = ventas.length;
    }
    if(document.getElementById("dashStockAlerta")) {
        document.getElementById("dashStockAlerta").innerText = stockCritico;
    }

    dibujarGraficoVentas();
}

function dibujarGraficoVentas() {
    const ctx = document.getElementById('canvasGraficoVentas')?.getContext('2d');
    if (!ctx) return;

    const datosPorFecha = {};
    ventas.forEach(v => {
        datosPorFecha[v.fecha] = (datosPorFecha[v.fecha] || 0) + v.total;
    });

    const etiquetas = Object.keys(datosPorFecha);
    const valores = Object.values(datosPorFecha);

    if (chartVentas) chartVentas.destroy();

    chartVentas = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Ingresos Diarios ($)',
                data: valores,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function cargarSelectsVenta() {
    const selCliente = document.getElementById("ventaCliente");
    const selProducto = document.getElementById("ventaProducto");

    if (selCliente) {
        selCliente.innerHTML = '<option value="">-- Seleccionar Cliente --</option>' +
            clientes.map(c => `<option value="${c.id}">${c.nombre} (${c.moto})</option>`).join('');
    }

    if (selProducto) {
        selProducto.innerHTML = '<option value="">-- Seleccionar Producto --</option>' +
            productos.map(p => `<option value="${p.id}">${p.nombre} - $${p.precio}</option>`).join('');
    }
}

function calcularTotalDinamico() {
    const pId = parseInt(document.getElementById('ventaProducto').value);
    const cant = parseInt(document.getElementById('ventaCantidad').value) || 0;
    const p = productos.find(x => x.id === pId);
    
    if (p) {
        const total = cant * p.precio;
        document.getElementById('ventaTotalDisplay').innerText = `$${total.toFixed(2)}`;
    }
}

// =================================================================
// 7. EVENTOS Y CONTROLADORES
// =================================================================

function vincularEventosInterfaz() {
    // Formulario Clientes
    const fCliente = document.getElementById("formCliente");
    if (fCliente) fCliente.addEventListener("submit", procesarFormularioCliente);

    // Formulario Productos
    const fProducto = document.getElementById("formProducto");
    if (fProducto) fProducto.addEventListener("submit", procesarFormularioProducto);

    // Formulario Ventas
    const fVenta = document.getElementById("formVenta");
    if (fVenta) fVenta.addEventListener("submit", registrarNuevaVenta);

    // Cálculos automáticos en venta
    const vProd = document.getElementById("ventaProducto");
    if (vProd) vProd.addEventListener("change", calcularTotalDinamico);
    
    const vCant = document.getElementById("ventaCantidad");
    if (vCant) vCant.addEventListener("input", calcularTotalDinamico);

    // Buscador Global
    const buscar = document.getElementById("inputBuscador");
    if (buscar) buscar.addEventListener("input", ejecutarBusqueda);
}

function ejecutarBusqueda() {
    const query = document.getElementById("inputBuscador").value.toLowerCase();
    const filas = document.querySelectorAll(".data-table tbody tr");

    filas.forEach(fila => {
        const texto = fila.innerText.toLowerCase();
        fila.style.display = texto.includes(query) ? "" : "none";
    });
}

function cambiarPestana(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    
    // Marcar botón activo
    const btn = document.querySelector(`[onclick="cambiarPestana('${id}')"]`);
    if (btn) btn.classList.add('active');
}

function actualizarTodaLaInterfaz() {
    dibujarTablaClientes();
    dibujarTablaProductos();
    dibujarTablaVentas();
    cargarSelectsVenta();
    actualizarResumenDashboard();
    respaldarEnLocalStorage();
}

// INICIO AUTOMÁTICO
document.addEventListener('DOMContentLoaded', inicializarApp);