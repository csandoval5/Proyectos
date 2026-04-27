const express = require("express");
const bodyParser = require("body-parser");
const XLSX = require("xlsx");
const path = require("path");

const app = express();
app.use(bodyParser.json());

// 👉 Servir todos los archivos estáticos desde D:\Inventario
app.use(express.static(__dirname));

// 👉 Ruta raíz: redirigir a index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 👉 Endpoint para guardar Excel
app.post("/guardarExcel", (req, res) => {
  const { clientes, productos, ventas } = req.body;

  try {
    const wb = XLSX.utils.book_new();

    const wsClientes = XLSX.utils.json_to_sheet(clientes || []);
    XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");

    const wsProductos = XLSX.utils.json_to_sheet(productos || []);
    XLSX.utils.book_append_sheet(wb, wsProductos, "Productos");

    const wsVentas = XLSX.utils.json_to_sheet(ventas || []);
    XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");

    const ruta = path.join("D:/Inventario", `inventario-${new Date().toISOString().split("T")[0]}.xlsx`);
    XLSX.writeFile(wb, ruta);

    console.log("Datos recibidos:", { clientes, productos, ventas });
    res.json({ mensaje: "Excel guardado en " + ruta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar Excel" });
  }
});

// 👉 Iniciar servidor
app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
