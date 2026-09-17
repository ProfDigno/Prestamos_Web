import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "./api";

function SavedMap({
  latitud,
  longitud,
  apiKey,
}: {
  latitud: number;
  longitud: number;
  apiKey: string;
}) {
  const src = apiKey
    ? `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(apiKey)}&center=${latitud},${longitud}&zoom=16`
    : `https://maps.google.com/maps?q=${latitud},${longitud}&z=16&output=embed`;
  return (
    <div className="map-preview">
      <iframe title="Ubicación GPS del cliente" src={src} loading="lazy" />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`}
        target="_blank"
        rel="noreferrer"
      >
        Abrir en Google Maps
      </a>
    </div>
  );
}

export default function EditClient() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<any>();
  const [types, setTypes] = useState<any[]>([]);
  const [mapKey, setMapKey] = useState("");
  const [error, setError] = useState("");
  const [cedulaFile, setCedulaFile] = useState<File | null>(null);
  const [cedulaBackFile, setCedulaBackFile] = useState<File | null>(null);
  useEffect(() => {
    api<any>(`/api/clientes/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
    api<any[]>("/api/tipos-referencia")
      .then(setTypes)
      .catch(() => {});
    api<any>("/api/mapa/config").then((r) => setMapKey(r.apiKey || ""));
  }, [id]);
  if (error)
    return (
      <main className="page">
        <div className="alert error">{error}</div>
      </main>
    );
  if (!data)
    return (
      <main className="page">
        <div className="panel empty">Cargando cliente…</div>
      </main>
    );
  const set = (k: string, v: string) => setData((d: any) => ({ ...d, [k]: v }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/clientes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombre_completo: data.nombre_completo,
          fecha_nacimiento: data.fecha_nacimiento || null,
          latitud: data.latitud ?? null,
          longitud: data.longitud ?? null,
          fecha_ubicacion:
            data.latitud != null ? new Date().toISOString() : null,
          ruc: data.ruc || null,
          direccion: data.direccion,
          telefono1: data.telefono1,
          telefono2: data.telefono2 || null,
          email: data.email || null,
          direccion_trabajo: data.direccion_trabajo || null,
          nombre_empresa: data.nombre_empresa || null,
          telefono_empresa: data.telefono_empresa || null,
          ruc_empresa: data.ruc_empresa || null,
          observacion: data.observacion || null,
          profesion: data.profesion || null,
          dedicacion: data.dedicacion || null,
          ingreso_promedio: data.ingreso_promedio || null,
          tasa_interes_sugerida: data.tasa_interes_sugerida || null,
        }),
      });
      if (data.referencias?.length === 2)
        await api(`/api/clientes/${id}/referencias`, {
          method: "PATCH",
          body: JSON.stringify({ referencias: data.referencias }),
        });
      if (cedulaFile) {
        const form = new FormData();
        form.append("cedula", cedulaFile);
        form.append("lado", "FRENTE");
        await api(`/api/clientes/${id}/cedula`, {
          method: "POST",
          body: form,
        });
      }
      if (cedulaBackFile) {
        const form = new FormData();
        form.append("cedula", cedulaBackFile);
        form.append("lado", "ATRAS");
        await api(`/api/clientes/${id}/cedula`, { method: "POST", body: form });
      }
      nav("/clientes");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">CLIENTES</p>
          <h1>Editar cliente</h1>
          <p className="muted">Actualiza los datos personales y laborales</p>
        </div>
      </div>
      <form className="panel form-grid" onSubmit={submit}>
        <label>
          Nombre completo
          <input
            required
            value={data.nombre_completo || ""}
            onChange={(e) => set("nombre_completo", e.target.value)}
          />
        </label>
        <label>
          Cédula
          <input value={data.cedula || ""} disabled />
        </label>
        <label>
          Fecha de nacimiento
          <input
            type="date"
            value={
              data.fecha_nacimiento
                ? String(data.fecha_nacimiento).slice(0, 10)
                : ""
            }
            onChange={(e) => set("fecha_nacimiento", e.target.value)}
          />
        </label>
        <label>
          RUC
          <input
            value={data.ruc || ""}
            onChange={(e) => set("ruc", e.target.value)}
          />
        </label>
        <label>
          Dirección
          <input
            required
            value={data.direccion || ""}
            onChange={(e) => set("direccion", e.target.value)}
          />
        </label>
        <label>
          Teléfono 1 / WhatsApp
          <input
            required
            value={data.telefono1 || ""}
            onChange={(e) => set("telefono1", e.target.value)}
          />
        </label>
        <label>
          Teléfono 2
          <input
            value={data.telefono2 || ""}
            onChange={(e) => set("telefono2", e.target.value)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={data.email || ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </label>
        <label>
          Profesión
          <input
            value={data.profesion || ""}
            onChange={(e) => set("profesion", e.target.value)}
          />
        </label>
        <label>
          Dedicación
          <input
            value={data.dedicacion || ""}
            onChange={(e) => set("dedicacion", e.target.value)}
          />
        </label>
        <label>
          Ingreso promedio
          <input
            inputMode="decimal"
            value={data.ingreso_promedio || ""}
            onChange={(e) =>
              set("ingreso_promedio", e.target.value.replace(/[^0-9.]/g, ""))
            }
          />
        </label>
        <label>
          Interés sugerido (%)
          <input
            inputMode="numeric"
            value={String(data.tasa_interes_sugerida || "").split(".")[0]}
            onChange={(e) =>
              set("tasa_interes_sugerida", e.target.value.replace(/\D/g, ""))
            }
          />
        </label>
        <div className="full panel gps-panel">
          <h2>Ubicación GPS</h2>
          {data.latitud != null && data.longitud != null ? (
            <>
              <p className="gps-ok">
                {Number(data.latitud).toFixed(6)},{" "}
                {Number(data.longitud).toFixed(6)}
              </p>
              <SavedMap
                latitud={Number(data.latitud)}
                longitud={Number(data.longitud)}
                apiKey={mapKey}
              />
            </>
          ) : (
            <p className="muted">Ubicación no capturada</p>
          )}
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              navigator.geolocation?.getCurrentPosition(
                (p) =>
                  setData((d: any) => ({
                    ...d,
                    latitud: p.coords.latitude,
                    longitud: p.coords.longitude,
                  })),
                (e) => setError(e.message),
                { enableHighAccuracy: true },
              )
            }
          >
            Actualizar ubicación GPS
          </button>
        </div>
        <fieldset className="full employer-box">
          <legend>Datos de la empresa</legend>
          <div className="form-grid nested-grid">
            <label>
              Dirección de trabajo
              <input
                value={data.direccion_trabajo || ""}
                onChange={(e) => set("direccion_trabajo", e.target.value)}
              />
            </label>
            <label>
              Nombre de empresa
              <input
                value={data.nombre_empresa || ""}
                onChange={(e) => set("nombre_empresa", e.target.value)}
              />
            </label>
            <label>
              Teléfono laboral
              <input
                value={data.telefono_empresa || ""}
                onChange={(e) => set("telefono_empresa", e.target.value)}
              />
            </label>
            <label>
              RUC laboral
              <input
                value={data.ruc_empresa || ""}
                onChange={(e) => set("ruc_empresa", e.target.value)}
              />
            </label>
          </div>
        </fieldset>
        <section className="full panel">
          <h2>Referencias</h2>
          {(data.referencias || []).map((r: any, i: number) => (
            <div className="reference" key={r.idcliente_referencia || i}>
              <strong>Referencia {i + 1}</strong>
              <input
                required
                placeholder="Nombre completo"
                value={r.nombre_completo || ""}
                onChange={(e) =>
                  setData((d: any) => ({
                    ...d,
                    referencias: d.referencias.map((x: any, n: number) =>
                      n === i ? { ...x, nombre_completo: e.target.value } : x,
                    ),
                  }))
                }
              />
              <input
                required
                placeholder="Teléfono"
                value={r.telefono || ""}
                onChange={(e) =>
                  setData((d: any) => ({
                    ...d,
                    referencias: d.referencias.map((x: any, n: number) =>
                      n === i ? { ...x, telefono: e.target.value } : x,
                    ),
                  }))
                }
              />
              <input
                placeholder="Dirección"
                value={r.direccion || ""}
                onChange={(e) =>
                  setData((d: any) => ({
                    ...d,
                    referencias: d.referencias.map((x: any, n: number) =>
                      n === i ? { ...x, direccion: e.target.value } : x,
                    ),
                  }))
                }
              />
              <select
                required
                value={r.fk_idtipo_referencia || ""}
                onChange={(e) =>
                  setData((d: any) => ({
                    ...d,
                    referencias: d.referencias.map((x: any, n: number) =>
                      n === i
                        ? { ...x, fk_idtipo_referencia: Number(e.target.value) }
                        : x,
                    ),
                  }))
                }
              >
                <option value="">Tipo de referencia</option>
                {types.map((t) => (
                  <option key={t.idtipo_referencia} value={t.idtipo_referencia}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </section>
        <section className="full panel cedula-panel">
          <h2>Cédula del cliente</h2>
          <div className="cedula-sides">
            <div className="cedula-side"><h3>Frente de cédula</h3>{data.cedula_frente && !cedulaFile && <a href={data.cedula_frente.url} target="_blank" rel="noreferrer"><img className="cedula-thumbnail" src={data.cedula_frente.url} alt="Frente de cédula" /></a>}{data.cedula_frente && !cedulaFile && <small className="file-name">{data.cedula_frente.nombre_original}</small>}<input type="file" accept="image/jpeg,image/png" onChange={(e) => setCedulaFile(e.target.files?.[0] || null)} />{cedulaFile ? <><small className="file-name">{cedulaFile.name}</small><img className="cedula-thumbnail" src={URL.createObjectURL(cedulaFile)} alt="Vista previa del frente" /></> : !data.cedula_frente && <p className="muted">Sin imagen cargada</p>}</div>
            <div className="cedula-side"><h3>Atrás de cédula</h3>{data.cedula_atras && !cedulaBackFile && <a href={data.cedula_atras.url} target="_blank" rel="noreferrer"><img className="cedula-thumbnail" src={data.cedula_atras.url} alt="Atrás de cédula" /></a>}{data.cedula_atras && !cedulaBackFile && <small className="file-name">{data.cedula_atras.nombre_original}</small>}<input type="file" accept="image/jpeg,image/png" onChange={(e) => setCedulaBackFile(e.target.files?.[0] || null)} />{cedulaBackFile ? <><small className="file-name">{cedulaBackFile.name}</small><img className="cedula-thumbnail" src={URL.createObjectURL(cedulaBackFile)} alt="Vista previa del atrás" /></> : !data.cedula_atras && <p className="muted">Sin imagen cargada</p>}</div>
          </div>
        </section>
        <label className="full">
          Observación
          <textarea
            value={data.observacion || ""}
            onChange={(e) => set("observacion", e.target.value)}
          />
        </label>
        {error && <div className="alert error full">{error}</div>}
        <div className="form-actions full">
          <button
            type="button"
            className="button secondary"
            onClick={() => nav("/clientes")}
          >
            Cancelar
          </button>{" "}
          <button className="button primary">Guardar cambios</button>
        </div>
      </form>
    </main>
  );
}
