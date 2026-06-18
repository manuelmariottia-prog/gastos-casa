import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import "./App.css";

const PERSONAS = ["Manu", "Sofi"];

const CATEGORIAS_INICIALES = [
  "Supermercado",
  "Mercadito",
  "Vinoteca",
  "Alquiler",
  "Impuestos",
  "Consorcio",
  "Pedidos comida",
  "Servicios",
  "Otros",
];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const PENDIENTES_BASE = [
  "Alquiler",
  "Expensas",
  "Luz",
  "Agua",
  "Gas",
  "Internet",
  "Retributivos",
];

function formatoMoneda(valor) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor || 0);
}

function formatoFecha(fecha) {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio.slice(2)}`;
}

function obtenerClaveMes(fecha) {
  return fecha.slice(0, 7);
}

function obtenerNombreMes(claveMes) {
  const [anio, mes] = claveMes.split("-");
  return `${MESES[Number(mes) - 1]} ${anio}`;
}

function obtenerMesActual() {
  return new Date().toISOString().slice(0, 7);
}

export default function App() {
  const [usuarioActivo, setUsuarioActivo] = useState("");
  const [seccionActiva, setSeccionActiva] = useState("gastos");
  const [productosSupermercado, setProductosSupermercado] = useState([]);
const [nuevoProducto, setNuevoProducto] = useState("");
const [pendientes, setPendientes] = useState([]);
const [nuevoPendiente, setNuevoPendiente] = useState("");

  const [categorias, setCategorias] = useState(CATEGORIAS_INICIALES);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [gastos, setGastos] = useState([]);
  const [mesActivo, setMesActivo] = useState(obtenerMesActual());
  const [gastoEditando, setGastoEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: CATEGORIAS_INICIALES[0],
    detalle: "",
    monto: "",
  });

  const [formularioEdicion, setFormularioEdicion] = useState({
    fecha: "",
    descripcion: CATEGORIAS_INICIALES[0],
    detalle: "",
    monto: "",
    pago: "Manu",
  });

  useEffect(() => {
  const q = collection(db, "gastos");

  const cancelarEscucha = onSnapshot(
    q,
    (snapshot) => {
      const gastosFirebase = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      console.log("Gastos cargados desde Firebase:", gastosFirebase);

      setGastos(gastosFirebase);
    },
    (error) => {
      console.error("Error leyendo gastos:", error);
    }
  );

  return () => cancelarEscucha();
}, []);

  useEffect(() => {
    const referenciaCategorias = doc(db, "configuracion", "categorias");

    const cancelarEscucha = onSnapshot(referenciaCategorias, (documento) => {
      if (documento.exists()) {
        const data = documento.data();

        if (Array.isArray(data.lista) && data.lista.length > 0) {
          setCategorias(data.lista);
        }
      } else {
        setDoc(referenciaCategorias, {
          lista: CATEGORIAS_INICIALES,
        });
      }
    });

    return () => cancelarEscucha();
  }, []);

  useEffect(() => {
  const q = query(collection(db, "supermercado"), orderBy("creadoEn", "desc"));

  const cancelarEscucha = onSnapshot(q, (snapshot) => {
    const productosFirebase = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    setProductosSupermercado(productosFirebase);
  });

  return () => cancelarEscucha();
}, []);

useEffect(() => {
  const q = query(collection(db, "pendientes"), orderBy("nombre", "asc"));

  const cancelarEscucha = onSnapshot(q, (snapshot) => {
    const pendientesFirebase = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    setPendientes(pendientesFirebase);
  });

  return () => cancelarEscucha();
}, []);

useEffect(() => {
  async function crearPendientesBase() {
    const snapshot = await getDocs(collection(db, "pendientes"));

    if (!snapshot.empty) return;

    for (const nombre of PENDIENTES_BASE) {
      await addDoc(collection(db, "pendientes"), {
        nombre,
        pagado: false,
        mes: "todos",
        creadoEn: new Date().toISOString(),
      });
    }
  }

  crearPendientesBase();
}, []);

  const mesesDisponibles = useMemo(() => {
    const meses = gastos.map((gasto) => obtenerClaveMes(gasto.fecha));
    return Array.from(new Set([...meses, obtenerMesActual()])).sort().reverse();
  }, [gastos]);

  const gastosDelMes = useMemo(() => {
    return gastos.filter((gasto) => obtenerClaveMes(gasto.fecha) === mesActivo);
  }, [gastos, mesActivo]);

  const resumen = useMemo(() => {
    const total = gastosDelMes.reduce(
      (acc, gasto) => acc + Number(gasto.monto),
      0
    );

    const pagado = { Manu: 0, Sofi: 0 };
    const categoriasResumen = {};

    gastosDelMes.forEach((gasto) => {
      pagado[gasto.pago] += Number(gasto.monto);
      categoriasResumen[gasto.descripcion] =
        (categoriasResumen[gasto.descripcion] || 0) + Number(gasto.monto);
    });

    const gastosPorCategoria = Object.entries(categoriasResumen)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);

    return { total, pagado, gastosPorCategoria };
  }, [gastosDelMes]);

  function cambiarFormulario(e) {
    const { name, value } = e.target;

    setFormulario((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "descripcion" && value !== "__nueva__") {
      setNuevaCategoria("");
    }

    if (name === "fecha") {
      setMesActivo(obtenerClaveMes(value));
    }
  }

  function cambiarFormularioEdicion(e) {
    const { name, value } = e.target;

    setFormularioEdicion((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function agregarCategoria() {
    const categoriaLimpia = nuevaCategoria.trim();

    if (!categoriaLimpia) return;

    const yaExiste = categorias.some(
      (categoria) =>
        categoria.toLowerCase() === categoriaLimpia.toLowerCase()
    );

    if (yaExiste) {
      alert("Esa categoría ya existe.");
      return;
    }

    const nuevasCategorias = [...categorias, categoriaLimpia];

    await setDoc(doc(db, "configuracion", "categorias"), {
      lista: nuevasCategorias,
    });

    setFormulario((prev) => ({
      ...prev,
      descripcion: categoriaLimpia,
    }));

    setNuevaCategoria("");
  }

  async function agregarGasto(e) {
    e.preventDefault();

    if (formulario.descripcion === "__nueva__") {
      alert("Primero guardá la nueva categoría.");
      return;
    }

    if (!formulario.monto || Number(formulario.monto) <= 0) return;

    const nuevoGasto = {
      fecha: formulario.fecha,
      descripcion: formulario.descripcion,
      detalle: formulario.detalle.trim(),
      monto: Number(formulario.monto),
      pago: usuarioActivo,
      creadoEn: new Date().toISOString(),
    };

    await addDoc(collection(db, "gastos"), nuevoGasto);

    setMesActivo(obtenerClaveMes(formulario.fecha));

    setFormulario((prev) => ({
      ...prev,
      detalle: "",
      monto: "",
    }));
  }

  function abrirEdicion(gasto) {
    setGastoEditando(gasto);

    setFormularioEdicion({
      fecha: gasto.fecha,
      descripcion: gasto.descripcion,
      detalle: gasto.detalle || "",
      monto: gasto.monto,
      pago: gasto.pago,
    });
  }

  async function guardarEdicion(e) {
    e.preventDefault();

    if (!gastoEditando) return;

    await updateDoc(doc(db, "gastos", gastoEditando.id), {
      fecha: formularioEdicion.fecha,
      descripcion: formularioEdicion.descripcion,
      detalle: formularioEdicion.detalle.trim(),
      monto: Number(formularioEdicion.monto),
      pago: formularioEdicion.pago,
      modificadoEn: new Date().toISOString(),
    });

    setMesActivo(obtenerClaveMes(formularioEdicion.fecha));
    setGastoEditando(null);
  }

  async function eliminarGastoEditado() {
    if (!gastoEditando) return;

    await deleteDoc(doc(db, "gastos", gastoEditando.id));
    setGastoEditando(null);
  }

  async function agregarProductoSupermercado(e) {
  e.preventDefault();

  const productoLimpio = nuevoProducto.trim();

  if (!productoLimpio) return;

  await addDoc(collection(db, "supermercado"), {
    nombre: productoLimpio,
    comprado: false,
    creadoPor: usuarioActivo,
    creadoEn: new Date().toISOString(),
  });

  setNuevoProducto("");
}

async function marcarProductoComprado(producto) {
  await updateDoc(doc(db, "supermercado", producto.id), {
    comprado: !producto.comprado,
  });
}

async function editarProductoSupermercado(producto) {
  const nuevoNombre = prompt("Editar producto:", producto.nombre);

  if (!nuevoNombre) return;

  const nombreLimpio = nuevoNombre.trim();

  if (!nombreLimpio) return;

  await updateDoc(doc(db, "supermercado", producto.id), {
    nombre: nombreLimpio,
  });
}

async function borrarProductoSupermercado(producto) {
  const confirmar = confirm(`¿Borrar "${producto.nombre}" de la lista?`);

  if (!confirmar) return;

  await deleteDoc(doc(db, "supermercado", producto.id));
}

async function borrarListaSupermercadoCompleta() {
  const confirmar = confirm(
    "¿Seguro querés borrar toda la lista de supermercado?"
  );

  if (!confirmar) return;

  const snapshot = await getDocs(collection(db, "supermercado"));

  const borrados = snapshot.docs.map((documento) =>
    deleteDoc(doc(db, "supermercado", documento.id))
  );

  await Promise.all(borrados);
}

async function agregarPendiente() {
  const nombre = nuevoPendiente.trim();

  if (!nombre) return;

  const paraMesesSiguientes = confirm(
    "Aceptar = agregar para este mes y los meses siguientes\nCancelar = solo este mes"
  );

  await addDoc(collection(db, "pendientes"), {
    nombre,
    pagado: false,
    mes: paraMesesSiguientes ? "todos" : mesActivo,
    desdeMes: paraMesesSiguientes ? mesActivo : null,
    creadoEn: new Date().toISOString(),
  });

  setNuevoPendiente("");
}

async function togglePendiente(pendiente) {
  if (pendiente.pagado) {
    const confirmar = confirm(
      `¿Marcar "${pendiente.nombre}" como NO pagado?`
    );

    if (!confirmar) return;
  }

  await updateDoc(doc(db, "pendientes", pendiente.id), {
    pagado: !pendiente.pagado,
  });
}

async function editarPendiente(pendiente) {
  const nuevoNombre = prompt(
    "Editar pendiente:",
    pendiente.nombre
  );

  if (!nuevoNombre) return;

  const nombreLimpio = nuevoNombre.trim();

  if (!nombreLimpio) return;

  await updateDoc(doc(db, "pendientes", pendiente.id), {
    nombre: nombreLimpio,
  });
}

async function borrarPendiente(pendiente) {
  const confirmar = confirm(
    `¿Borrar "${pendiente.nombre}"?`
  );

  if (!confirmar) return;

  await deleteDoc(doc(db, "pendientes", pendiente.id));
}

const pendientesDelMes = pendientes.filter((pendiente) => {
  if (pendiente.mes === mesActivo) return true;

  if (pendiente.mes === "todos") {
    if (!pendiente.desdeMes) return true;

    return pendiente.desdeMes <= mesActivo;
  }

  return false;
});

  if (!usuarioActivo) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p className="eyebrow">GASTOS COMPARTIDOS DEL HOGAR</p>

          <h1>¿Quién está usando la app?</h1>

          <p>Elegí tu usuario para cargar gastos automáticamente a tu nombre.</p>

          <div className="login-buttons">
            {PERSONAS.map((persona) => (
              <button key={persona} onClick={() => setUsuarioActivo(persona)}>
                {persona}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-info">
          <p className="eyebrow">GASTOS COMPARTIDOS DEL HOGAR</p>

          <h1>SOFI Y MANU</h1>

          <p className="subtitulo">
            Estás cargando gastos como <strong>{usuarioActivo}</strong>.
          </p>
        </div>

        <button className="boton-sesion" onClick={() => setUsuarioActivo("")}>
          Cambiar usuario
        </button>
      </header>

      <nav className="menu-secciones">
        <button
          className={seccionActiva === "gastos" ? "activa" : ""}
          onClick={() => setSeccionActiva("gastos")}
        >
          Gastos
        </button>

        <button
          className={seccionActiva === "supermercado" ? "activa" : ""}
          onClick={() => setSeccionActiva("supermercado")}
        >
          Lista de supermercado
        </button>

        <button
          className={seccionActiva === "pendientes" ? "activa" : ""}
          onClick={() => setSeccionActiva("pendientes")}
        >
          Pendientes
        </button>
      </nav>

      {seccionActiva === "gastos" && (
        <>
          <section className="tabs-meses">
            {mesesDisponibles.map((mes) => (
              <button
                key={mes}
                className={mesActivo === mes ? "tab-mes activa" : "tab-mes"}
                onClick={() => setMesActivo(mes)}
              >
                {obtenerNombreMes(mes)}
              </button>
            ))}
          </section>

          <section className="resumen-grid">
            <div className="card">
              <p>Total de {obtenerNombreMes(mesActivo)}</p>
              <h2>{formatoMoneda(resumen.total)}</h2>
            </div>

            <div className="card">
              <p>Manu</p>
              <h2>{formatoMoneda(resumen.pagado.Manu)}</h2>
            </div>

            <div className="card destacada">
              <p>Sofi</p>
              <h2>{formatoMoneda(resumen.pagado.Sofi)}</h2>
            </div>
          </section>

          <main className="main-grid">
            <section className="card panel-formulario">
              <h2>Agregar gasto</h2>

              <form onSubmit={agregarGasto} className="formulario">
                <label>
                  Fecha
                  <input
                    type="date"
                    name="fecha"
                    value={formulario.fecha}
                    onChange={cambiarFormulario}
                  />
                </label>

                <label>
                  Descripción
                  <select
                    name="descripcion"
                    value={formulario.descripcion}
                    onChange={cambiarFormulario}
                  >
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}

                    <option value="__nueva__">➕ Agregar nueva categoría</option>
                  </select>
                </label>

                {formulario.descripcion === "__nueva__" && (
                  <>
                    <label>
                      Nueva categoría
                      <input
                        type="text"
                        value={nuevaCategoria}
                        onChange={(e) => setNuevaCategoria(e.target.value)}
                      />
                    </label>

                    <button type="button" onClick={agregarCategoria}>
                      Guardar categoría
                    </button>
                  </>
                )}

                <label>
                  Detalle opcional
                  <input
                    type="text"
                    name="detalle"
                    value={formulario.detalle}
                    onChange={cambiarFormulario}
                    placeholder="Ej: Coto, luz, gas..."
                  />
                </label>

                <label>
                  Monto
                  <input
                    type="number"
                    name="monto"
                    value={formulario.monto}
                    onChange={cambiarFormulario}
                    placeholder="0"
                  />
                </label>

                <div className="usuario-carga">
                  Este gasto lo carga: <strong>{usuarioActivo}</strong>
                </div>

                <button type="submit">Guardar gasto</button>
              </form>
            </section>

            <section className="panel-derecho">
              <div className="card">
                <h2>Gráfico por categoría</h2>

                {resumen.gastosPorCategoria.length === 0 ? (
                  <p className="texto-vacio">
                    Todavía no hay gastos cargados este mes.
                  </p>
                ) : (
                  <div className="grafico-categorias">
                    {resumen.gastosPorCategoria.map((item) => (
                      <div className="barra-item" key={item.categoria}>
                        <div className="barra-info">
                          <span>{item.categoria}</span>
                          <strong>{formatoMoneda(item.total)}</strong>
                        </div>

                        <div className="barra-fondo">
                          <div
                            className="barra-relleno"
                            style={{
                              width: `${
                                resumen.total
                                  ? (item.total / resumen.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card listado-card">
                <div className="listado-header">
                  <div>
                    <h2>Listado de gastos</h2>

                    <p>
                      {gastosDelMes.length} gastos cargados en{" "}
                      {obtenerNombreMes(mesActivo)}
                    </p>
                  </div>
                </div>

                {gastosDelMes.length === 0 ? (
                  <p className="texto-vacio">
                    No hay gastos cargados para este mes.
                  </p>
                ) : (
                  <div className="listado-columnas">
                    <div className="columna-gasto">
                      <h3>Fecha</h3>
                      {gastosDelMes.map((gasto) => (
                        <p key={`fecha-${gasto.id}`}>
                          {formatoFecha(gasto.fecha)}
                        </p>
                      ))}
                    </div>

                    <div className="columna-gasto">
                      <h3>Descripción</h3>
                      {gastosDelMes.map((gasto) => (
                        <p key={`descripcion-${gasto.id}`}>
                          {gasto.descripcion}
                        </p>
                      ))}
                    </div>

                    <div className="columna-gasto columna-detalle">
                      <h3>Detalle</h3>
                      {gastosDelMes.map((gasto) => (
                        <p key={`detalle-${gasto.id}`}>
                          {gasto.detalle || "-"}
                        </p>
                      ))}
                    </div>

                    <div className="columna-gasto">
                      <h3>Pagó</h3>
                      {gastosDelMes.map((gasto) => (
                        <p key={`pago-${gasto.id}`}>{gasto.pago}</p>
                      ))}
                    </div>

                    <div className="columna-gasto">
                      <h3>Monto</h3>
                      {gastosDelMes.map((gasto) => (
                        <p key={`monto-${gasto.id}`}>
                          {formatoMoneda(gasto.monto)}
                        </p>
                      ))}
                    </div>

                    <div className="columna-gasto columna-editar">
                      <h3>Editar</h3>
                      {gastosDelMes.map((gasto) => (
                        <button
                          key={`editar-${gasto.id}`}
                          className="boton-editar-tabla"
                          onClick={() => abrirEdicion(gasto)}
                        >
                          ✎
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>
        </>
      )}

    {seccionActiva === "supermercado" && (
  <section className="card hoja-supermercado">
    <div className="supermercado-header">
      <h2>Lista de supermercado</h2>

      {productosSupermercado.length > 0 && (
        <button
          className="boton-borrar-lista"
          onClick={borrarListaSupermercadoCompleta}
        >
          Borrar lista
        </button>
      )}
    </div>

    <form
      className="formulario-supermercado"
      onSubmit={agregarProductoSupermercado}
    >
      <input
        type="text"
        value={nuevoProducto}
        onChange={(e) => setNuevoProducto(e.target.value)}
        placeholder="Agregar producto..."
      />

      <button type="submit">Agregar</button>
    </form>

    {productosSupermercado.length === 0 ? (
      <p className="texto-vacio">Todavía no hay productos cargados.</p>
    ) : (
      <ul className="lista-supermercado">
        {productosSupermercado.map((producto) => (
          <li
            key={producto.id}
            className={producto.comprado ? "producto-comprado" : ""}
          >
            <button
              className="circulo-compra"
              onClick={() => marcarProductoComprado(producto)}
              type="button"
            >
              {producto.comprado ? "✓" : ""}
            </button>

            <span>{producto.nombre}</span>

            <div className="acciones-producto">
              <button
                type="button"
                onClick={() => editarProductoSupermercado(producto)}
              >
                ✎
              </button>

              <button
                type="button"
                onClick={() => borrarProductoSupermercado(producto)}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
)}

      {seccionActiva === "pendientes" && (
  <section className="card hoja-supermercado">
    <section className="tabs-meses">
  {mesesDisponibles.map((mes) => (
    <button
      key={mes}
      className={mesActivo === mes ? "tab-mes activa" : "tab-mes"}
      onClick={() => setMesActivo(mes)}
    >
      {obtenerNombreMes(mes)}
    </button>
  ))}
</section>
    <div className="supermercado-header">
      <h2>Pendientes de pago</h2>
    </div>

    <div className="formulario-supermercado">
      <input
        type="text"
        value={nuevoPendiente}
        onChange={(e) => setNuevoPendiente(e.target.value)}
        placeholder="Agregar pendiente..."
      />

      <button onClick={agregarPendiente}>
        Agregar
      </button>
    </div>

    <ul className="lista-supermercado">
      {pendientesDelMes.map((pendiente) => (
        <li
          key={pendiente.id}
          className={pendiente.pagado ? "producto-comprado" : ""}
        >
          <button
            className="circulo-compra"
            type="button"
            onClick={() => togglePendiente(pendiente)}
          >
            {pendiente.pagado ? "✓" : ""}
          </button>

          <span>{pendiente.nombre}</span>

          <div className="acciones-producto">
            <button
              type="button"
              onClick={() => editarPendiente(pendiente)}
            >
              ✎
            </button>

            <button
              type="button"
              onClick={() => borrarPendiente(pendiente)}
            >
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  </section>
)}

      {gastoEditando && (
        <div className="modal-fondo">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Editar gasto</p>
                <h2>Modificar registro</h2>
              </div>

              <button
                className="boton-cerrar"
                onClick={() => setGastoEditando(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarEdicion} className="formulario">
              <label>
                Fecha
                <input
                  type="date"
                  name="fecha"
                  value={formularioEdicion.fecha}
                  onChange={cambiarFormularioEdicion}
                />
              </label>

              <label>
                Descripción
                <select
                  name="descripcion"
                  value={formularioEdicion.descripcion}
                  onChange={cambiarFormularioEdicion}
                >
                  {categorias.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Detalle
                <input
                  type="text"
                  name="detalle"
                  value={formularioEdicion.detalle}
                  onChange={cambiarFormularioEdicion}
                />
              </label>

              <label>
                Monto
                <input
                  type="number"
                  name="monto"
                  value={formularioEdicion.monto}
                  onChange={cambiarFormularioEdicion}
                />
              </label>

              <label>
                Pagó
                <select
                  name="pago"
                  value={formularioEdicion.pago}
                  onChange={cambiarFormularioEdicion}
                >
                  {PERSONAS.map((persona) => (
                    <option key={persona} value={persona}>
                      {persona}
                    </option>
                  ))}
                </select>
              </label>

              <div className="modal-acciones">
                <button type="submit">Guardar cambios</button>

                <button
                  type="button"
                  className="boton-eliminar"
                  onClick={eliminarGastoEditado}
                >
                  Borrar gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}