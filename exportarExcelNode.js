// archivo: exportarExcelNode.js
const XLSX = require("xlsx");
const path = require("path");

// Tus arrays de datos (pueden empezar vacíos)
let clientes = [];
let productos = [];
let ventas = [];

function exportarExcel() {
  try {
    // Crear libro
    const wb = XLSX.utils.book_new();

    // Hoja Clientes
    const wsClientes = XLSX.utils.json_to_sheet(clientes);
    XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");

    // Hoja Productos
    const wsProductos = XLSX.utils.json_to_sheet(productos);
    XLSX.utils.book_append_sheet(wb, wsProductos, "Productos");

    // Hoja Ventas
    const wsVentas = XLSX.utils.json_to_sheet(ventas);
    XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");

    // Ruta fija en disco D
    const ruta = path.join("D:/Inventario", `inventario-${new Date().toISOString().split("T")[0]}.xlsx`);

    // Guardar archivo directamente en carpeta
    XLSX.writeFile(wb, ruta);

    console.log("Excel guardado en:", ruta);
  } catch (err) {
    console.error("Error al exportar Excel:", err);
  }
}

// Ejecutar
exportarExcel();
