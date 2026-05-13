import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const PERSONAS = ["Manu", "Sofi"];

const DESCRIPCIONES = [
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

const gastosIniciales = [
  {
    id: 1,
    fecha: "2026-05-12",
    descripcion: "Supermercado",
    detalle: "Compra semanal",
    monto: 45000,
    pago: "Manu",
  },
  {
    id: 2,
    fecha: "2026-05-11",
    descripcion: "Servicios",
    detalle: "Internet",
    monto: 28000,
    pago: "Sofi",
  },
  {
    id: 3,
    fecha: "2026-05-08",
    descripcion: "Mercadito",
    detalle: "Verduras y almacén",
    monto: 18500,
    pago: "Sofi",
  },
  {
    id: 4,
    fecha: "2026-05-05",
    descripcion: "Vinoteca",
    detalle: "Bebidas para cena",
    monto: 22000,
    pago: "Manu",
  },
  {
    id: 5,
    fecha: "2026-04-28",
    descripcion: "Alquiler",
    detalle: "Alquiler departamento",
    monto: 420000,
    pago: "Manu",
  },
  {
    id: 6,
    fecha: "2026-04-22",
    descripcion: "Consorcio",
    detalle: "Expensas abril",
    monto: 78000,
    pago: "Sofi",
  },
  {
    id: 7,
    fecha: "2026-04-18",
    descripcion: "Impuestos",
    detalle: "Municipal",
    monto: 16500,
    pago: "Manu",
  },
  {
    id: 8,
    fecha: "2026-04-12",
    descripcion: "Pedidos comida",
    detalle: "Cena del viernes",
    monto: 31000,
    pago: "Sofi",
  },
  {
    id: 9,
    fecha: "2026-03-26",
    descripcion: "Servicios",
    detalle: "Luz y gas",
    monto: 52000,
    pago: "Manu",
  },
  {
    id: 10,
    fecha: "2026-03-20",
    descripcion: "Mercadito",
    detalle: "Compras chicas",
    monto: 14500,
    pago: "Sofi",
  },
  {
    id: 11,
    fecha: "2026-03-14",
    descripcion: "Supermercado",
    detalle: "Compra mensual",
    monto: 96000,
    pago: "Manu",
  },
  {
    id: 12,
    fecha: "2026-03-09",
    descripcion: "Vinoteca",
    detalle: "Regalo y bebidas",
    monto: 27500,
    pago: "Sofi",
  },
];

export default function App() {
  const [usuarioActivo, setUsuarioActivo] = useState("");

  const [gastos, setGastos] = useState(() => {
    const guardados = localStorage.getItem("gastos-casa");
    return guardados ? JSON.parse(guardados) : gastosIniciales;
  });

  const [mesActivo, setMesActivo] = useState(obtenerMesActual());
  const [gastoEditando, setGastoEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: "Supermercado",
    detalle: "",
    monto: "",
  });

  const [formularioEdicion, setFormularioEdicion] = useState({
    fecha: "",
    descripcion: "Supermercado",
    detalle: "",
    monto: "",
    pago: "Manu",
  });

  useEffect(() => {
    localStorage.setItem("gastos-casa", JSON.stringify(gastos));
  }, [gastos]);

  const mesesDisponibles = useMemo(() => {
    const meses = gastos.map((gasto) => obtenerClaveMes(gasto.fecha));
    const mesesUnicos = Array.from(new Set([...meses, obtenerMesActual()]));
    return mesesUnicos.sort().reverse();
  }, [gastos]);

  const gastosDelMes = useMemo(() => {
    return gastos.filter((gasto) => obtenerClaveMes(gasto.fecha) === mesActivo);
  }, [gastos, mesActivo]);

  const resumen = useMemo(() => {
    const total = gastosDelMes.reduce((acc, gasto) => acc + Number(gasto.monto), 0);

    const pagado = { Manu: 0, Sofi: 0 };
    const categorias = {};

    gastosDelMes.forEach((gasto) => {
      pagado[gasto.pago] += Number(gasto.monto);
      categorias[gasto.descripcion] =
        (categorias[gasto.descripcion] || 0) + Number(gasto.monto);
    });

    const gastosPorCategoria = Object.entries(categorias)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);

    return { total, pagado, gastosPorCategoria };
  }, [gastosDelMes]);

  function cambiarFormulario(e) {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));

    if (name === "fecha") {
      setMesActivo(obtenerClaveMes(value));
    }
  }

  function cambiarFormularioEdicion(e) {
    const { name, value } = e.target;
    setFormularioEdicion((prev) => ({ ...prev, [name]: value }));
  }

  function agregarGasto(e) {
    e.preventDefault();

    if (!formulario.monto || Number(formulario.monto) <= 0) return;

    const nuevoGasto = {
      id: Date.now(),
      fecha: formulario.fecha,
      descripcion: formulario.descripcion,
      detalle: formulario.detalle.trim(),
      monto: Number(formulario.monto),
      pago: usuarioActivo,
    };

    setGastos((prev) => [nuevoGasto, ...prev]);
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
      detalle: gasto.detalle,
      monto: gasto.monto,
      pago: gasto.pago,
    });
  }

  function guardarEdicion(e) {
    e.preventDefault();

    if (!formularioEdicion.monto || Number(formularioEdicion.monto) <= 0) return;

    setGastos((prev) =>
      prev.map((gasto) =>
        gasto.id === gastoEditando.id
          ? {
              ...gasto,
              fecha: formularioEdicion.fecha,
              descripcion: formularioEdicion.descripcion,
              detalle: formularioEdicion.detalle.trim(),
              monto: Number(formularioEdicion.monto),
              pago: formularioEdicion.pago,
            }
          : gasto
      )
    );

    setMesActivo(obtenerClaveMes(formularioEdicion.fecha));
    setGastoEditando(null);
  }

  function eliminarGastoEditado() {
    setGastos((prev) => prev.filter((gasto) => gasto.id !== gastoEditando.id));
    setGastoEditando(null);
  }

  function cerrarSesion() {
    setUsuarioActivo("");
  }

  if (!usuarioActivo) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p className="eyebrow">Gastos compartidos del hogar</p>
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
          <p className="eyebrow">Gastos compartidos del hogar</p>
          <h1>Sofi y Manu</h1>
          <p className="subtitulo">
            Estás cargando gastos como <strong>{usuarioActivo}</strong>.
          </p>
        </div>

        <button className="boton-sesion" onClick={cerrarSesion}>
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
              <input type="date" name="fecha" value={formulario.fecha} onChange={cambiarFormulario} />
            </label>

            <label>
              Descripción
              <select name="descripcion" value={formulario.descripcion} onChange={cambiarFormulario}>
                {DESCRIPCIONES.map((descripcion) => (
                  <option key={descripcion} value={descripcion}>{descripcion}</option>
                ))}
              </select>
            </label>

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
              <input type="number" name="monto" value={formulario.monto} onChange={cambiarFormulario} placeholder="0" />
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
              <p className="texto-vacio">Todavía no hay gastos cargados este mes.</p>
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
                          width: `${resumen.total ? (item.total / resumen.total) * 100 : 0}%`,
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
                <p>{gastosDelMes.length} gastos cargados en {obtenerNombreMes(mesActivo)}</p>
              </div>
            </div>

            {gastosDelMes.length === 0 ? (
              <p className="texto-vacio">No hay gastos cargados para este mes.</p>
            ) : (
              <div className="lista-gastos">
                {gastosDelMes.map((gasto) => (
                  <div className="fila-gasto" key={gasto.id}>
                    <div className="dato fecha">
                      <span>Fecha</span>
                      <strong>{gasto.fecha}</strong>
                    </div>

                    <div className="dato descripcion">
                      <span>Descripción</span>
                      <strong>{gasto.descripcion}</strong>
                    </div>

                    <div className="dato detalle">
                      <span>Detalle</span>
                      <strong>{gasto.detalle || "-"}</strong>
                    </div>

                    <div className="dato pago">
                      <span>Pagó</span>
                      <strong>{gasto.pago}</strong>
                    </div>

                    <div className="dato monto">
                      <span>Monto</span>
                      <strong>{formatoMoneda(gasto.monto)}</strong>
                    </div>

                    <button className="boton-editar-tabla" onClick={() => abrirEdicion(gasto)}>
                      ✎
                    </button>
                  </div>
                ))}
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

              <button className="boton-cerrar" onClick={() => setGastoEditando(null)}>
                ×
              </button>
            </div>

            <form onSubmit={guardarEdicion} className="formulario">
              <label>
                Fecha
                <input type="date" name="fecha" value={formularioEdicion.fecha} onChange={cambiarFormularioEdicion} />
              </label>

              <label>
                Descripción
                <select name="descripcion" value={formularioEdicion.descripcion} onChange={cambiarFormularioEdicion}>
                  {DESCRIPCIONES.map((descripcion) => (
                    <option key={descripcion} value={descripcion}>{descripcion}</option>
                  ))}
                </select>
              </label>

              <label>
                Detalle
                <input type="text" name="detalle" value={formularioEdicion.detalle} onChange={cambiarFormularioEdicion} />
              </label>

              <label>
                Monto
                <input type="number" name="monto" value={formularioEdicion.monto} onChange={cambiarFormularioEdicion} />
              </label>

              <label>
                Pagó
                <select name="pago" value={formularioEdicion.pago} onChange={cambiarFormularioEdicion}>
                  {PERSONAS.map((persona) => (
                    <option key={persona} value={persona}>{persona}</option>
                  ))}
                </select>
              </label>

              <div className="modal-acciones">
                <button type="submit">Guardar cambios</button>
                <button type="button" className="boton-eliminar" onClick={eliminarGastoEditado}>
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