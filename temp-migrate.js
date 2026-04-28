const fs = require('fs');

// ========== ESCRIBIR INDEX.HTML ==========
const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Taller de Motos</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css" rel="stylesheet">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#0f172a">
</head>
<body>
    <div class="app">
        <header class="main-header">
            <div class="header-content">
                <div class="brand">
                    <div class="brand-icon"><i class="fas fa-motorcycle"></i></div>
                    <div class="brand-text">
                        <h1>Taller de Motos</h1>
                        <span>Sistema de Inventario y Ventas</span>
                    </div>
                <div class="header-actions">
                    <button id="btnExportarExcel" class="icon-btn" title="Exportar Excel"><i class="fas fa-file-excel"></i></button>
                    <button id="btnExportar" class="icon-btn" title="Backup JSON"><i class="fas fa-download"></i></button>
                    <button id="btnConfig" class="icon-btn" title="Configuracion"><i class="fas fa-cog"></i></button>
                </div>
        </header>

        <section class="stats-bar">
            <div class="stat-item"><div class="stat-icon blue"><i class="fas fa-users"></i></div><div class="stat-info"><span class="stat-value" id="totalClientes">0</span><span class="stat-label">Clientes</span></div>
            <div class="stat-item"><div class="stat-icon purple"><i class="fas fa-boxes-stacked"></i></div><div class="stat-info"><span class="stat-value" id="totalProductos">0</span><span class="stat-label">Productos</span></div>
            <div class="stat-item"><div class="stat-icon green"><i class="fas fa-cart-shopping"></i></div><div class="stat-info"><span class="stat-value" id="totalVentas">0</span><span class="stat-label">Ventas</span></div>
            <div class="stat-item"><div class="stat-icon orange"><i class="fas fa-sack-dollar"></i></div><div class="stat-info"><span class="stat-value" id="totalIngresos">$0</span><span class="stat-label">Ingresos</span></div>
        </section>

        <section class="search-section">
            <div class="search-box"><i class="fas fa-search"></i><input type="text" id="buscador" placeholder="Buscar clientes, productos o ventas..."></div>
            <div class="filter-box"><i class="fas fa-filter"></i><select id="filtroTipo"><option value="todos">Todos</option><option value="clientes">Clientes</option><option value="productos">Productos</option><option value="ventas">Ventas</option></select></div>
        </section>

        <nav class="tab-nav">
            <button class="tab-btn active" onclick="showTab('clientes')"><i class="fas fa-users"></i><span>Clientes</span><span id="badgeClientes" class="tab-badge">0</span></button>
            <button class="tab-btn" onclick="showTab('productos')"><i class="fas fa-boxes-stacked"></i><span>Productos</span><span id="badgeProductos" class="tab-badge">0</span></button>
            <button class="tab-btn" onclick="showTab('ventas')"><i class="fas fa-cart-shopping"></i><span>Ventas</span><span id="badgeVentas" class="tab-badge">0</span></button>
            <button class="tab-btn" onclick="showTab('reportes')"><i class="fas fa-chart-pie"></i><span>Reportes</span></button>
        </nav>

        <main class="main-content">
            <div id="clientes" class="tab-content active">
                <div class="content-grid">
                    <div class="form-card">
                        <div class="card-header"><i class="fas fa-user-plus"></i><h2>Registrar Cliente</h2></div>
                        <form id="formCliente">
                            <div class="form-grid">
                                <div class="field-group"><label>Nombre completo *</label><input type="text" id="clienteNombre" placeholder="Ej: Juan Perez" required></div>
                                <div class="field-group"><label>Telefono *</label><input type="tel" id="clienteTelefono" placeholder="Ej: 300 123 4567" required></div>
                                <div class="field-group"><label>Direccion</label><input type="text" id="clienteDireccion" placeholder="Ej: Calle 123 # 45-67"></div>
                                <div class="field-group"><label>Moto / Vehiculo</label><input type="text" id="clienteMoto" placeholder="Ej: Yamaha MT-03"></div>
                            <button type="submit" class="btn-submit"><i class="fas fa-save"></i> Guardar Cliente</button>
                        </form>
                    </div>
                    <div class="table-card">
                        <div class="card-header"><i class="fas fa-list"></i><h2>Lista de Clientes <span class="count-badge" id="countClientes">0</span></h2></div>
                        <div id="listaClientes" class="table-wrapper"></div>
                </div>

            <div id="productos" class="tab-content">
                <div class="content-grid">
                    <div class="form-card">
                        <div class="card-header"><i class="fas fa-box-open"></i><h2>Registrar Producto</h2></div>
                        <form id="formProducto">
                            <div class="form-grid">
                                <div class="field-group"><label>Nombre del repuesto *</label><input type="text" id="productoNombre" placeholder="Ej: Aceite 10W40" required></div>
                                <div class="field-group"><label>Precio de venta *</label><div class="input-prefix"><span>$</span><input type="number" id="productoPrecio" step="0.01" placeholder="0.00" required></div>
                                <div class="field-group"><label>Cantidad en stock *</label><input type="number" id="productoCantidad" placeholder="0" required></div>
                                <div class="field-group"><label>Stock minimo de alerta</label><input type="number" id="productoStockMin" value="5"></div>
                            <button type="submit" id="btnSubmitProd" class="btn-submit"><i class="fas fa-save"></i> Guardar Producto</button>
                        </form>
                    </div>
                    <div class="table-card">
                        <div class="card-header"><i class="fas fa-warehouse"></i><h2>Inventario <span class="count-badge" id="countProductos">0</span></h2></div>
                        <div id="listaProductos" class="table-wrapper"></div>
                </div>

            <div id="ventas" class="tab-content">
                <div class="content-grid">
                    <div class="form-card">
                        <div class="card-header"><i class="fas fa-cash-register"></i><h2>Registrar Venta</h2></div>
                        <form id="formVenta">
                            <div class="form-grid">
                                <div class="field-group"><label>Cliente *</label><select id="ventaCliente" required><option value="">Seleccionar cliente...</option></select></div>
                                <div class="field-group"><label>Producto *</label><select id="ventaProducto" required><option value="">Seleccionar producto...</option></select><small id="precioProducto" class="field-hint"></small></div>
                                <div class="field-group"><label>Cantidad *</label><input type="number" id="ventaCantidad" min="1" placeholder="1" required></div>
                                <div class="field-group"><label>Total a pagar</label><div class="input-prefix readonly"><span>$</span><input type="text" id="ventaTotal" readonly placeholder="0.00"></div>
                            </div>
                            <button type="submit" class="btn-submit"><i class="fas fa-check-circle"></i> Confirmar Venta</button>
                        </form>
                    </div>
                    <div class="table-card">
                        <div class="card-header"><i class="fas fa-receipt"></i><h2>Historial de Ventas <span class="count-badge" id="countVentas">0</span></h2></div>
                        <div id="listaVentas" class="table-wrapper"></div>
                </div>

            <div id="reportes" class="tab-content">
                <div class="reports-grid">
                    <div class="report-card highlight"><div class="report-icon blue"><i class="fas fa-calendar-day"></i></div><div class="report-data"><span class="report-label">Ventas Hoy</span><span class="report-number" id="ventasHoy">0</span><span class="report-sublabel" id="ingresosHoy">$0</span></div>
                    <div class="report-card"><div class="report-icon green"><i class="fas fa-trophy"></i></div><div class="report-data"><span class="report-label">Mejor
