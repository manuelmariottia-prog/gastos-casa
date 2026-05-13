import React, { useEffect, useMemo, useState } from "react";
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

  const [categorias, setCategorias] = useState(() => {
    const guardadas = localStorage.getItem("categorias-casa");
    return guardadas ? JSON.parse(guardadas) : CATEGORIAS_INICIALES;
  });

  const [nuevaCategoria, setNuevaCategoria] = useState("");

  const [gastos, setGastos] = useState(() => {
    const guardados = localStorage.getItem("gastos-casa");
    return guardados ? JSON.parse(guardados) : [];
  });

  const [mesActivo, setMesActivo] = useState(obtenerMesActual());
  const [gastoEditando, setGastoEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: categorias[0],
    detalle: "",
    monto: "",
  });

  const [formularioEdicion, setFormularioEdicion] = useState({
    fecha: "",
    descripcion: categorias[0],
    detalle: "",
    monto: "",
    pago: "Manu",
  });

  useEffect(() => {
    localStorage.setItem("gastos-casa", JSON.stringify(gastos));
  }, [gastos]);

  useEffect(() => {
    localStorage.setItem("categorias-casa", JSON.stringify(categorias));
  }, [categorias]);

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
  }

  function cambiarFormularioEdicion(e) {
    const { name, value } = e.target;

    setFormularioEdicion((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function agregarCategoria() {
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

    setCategorias((prev) => [...prev, categoriaLimpia]);

    setFormulario((prev) => ({
      ...prev,
      descripcion: categoriaLimpia,
    }));

    setNuevaCategoria("");
  }

  function agregarGasto(e) {
    e.preventDefault();

    if (formulario.descripcion === "__nueva__") {
      alert("Primero guardá la nueva categoría.");
      return;
    }

    if (!formulario.monto || Number(formulario.monto) <= 0) return;

    const nuevoGasto = {
      id: Date.now(),
      fecha: formulario.fecha,
      descripcion: formulario.descripcion,
      detalle: formulario.detalle,
      monto: Number(formulario.monto),
      pago: usuarioActivo,
    };

    setGastos((prev) => [nuevoGasto, ...prev]);

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
      detalle: gasto.detalle,
      monto: gasto.monto,
      pago: gasto.pago,
    });
  }

  function guardarEdicion(e) {
    e.preventDefault();

    setGastos((prev) =>
      prev.map((gasto) =>
        gasto.id === gastoEditando.id
          ? {
              ...gasto,
              ...formularioEdicion,
              monto: Number(formularioEdicion.monto),
            }
          : gasto
      )
    );

    setGastoEditando(null);
  }

  function eliminarGastoEditado() {
    setGastos((prev) =>
      prev.filter((gasto) => gasto.id !== gastoEditando.id)
    );

    setGastoEditando(null);
  }

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