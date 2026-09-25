import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, MessageCircle } from "lucide-react";
import { api, money, shortDate } from "./api";
import { displayDateToIso, isoDateToDisplay } from "./dateUtils";
import { openWhatsApp } from "./whatsapp";

export default function OperationDetailSelectable() {
  const { id } = useParams();
  const [data, setData] = useState<any>();
  const [forms, setForms] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [form, setForm] = useState("");
  const [error, setError] = useState("");
  const [dateNotice, setDateNotice] = useState("");
  const [dateError, setDateError] = useState("");
  const [dateEditorOpen, setDateEditorOpen] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"CUOTAS" | "PAGOS">("CUOTAS");
  const [expandedPayment, setExpandedPayment] = useState<number | null>(null);
  const load = () => api<any>(`/api/operaciones/${id}`).then(setData);
  function openDateEditor() {
    setDateValue(isoDateToDisplay(data.fecha_inicio));
    setDateError("");
    setDateEditorOpen(true);
  }
  async function saveStartDate() {
    if (!displayDateToIso(dateValue)) {
      setDateError("Ingrese una fecha válida con formato dd/mm/yyyy.");
      return;
    }
    if (savingDate) return;
    setSavingDate(true);
    setDateError("");
    try {
      const result = await api<{ cuotas_reajustadas: number }>(`/api/operaciones/${id}/fecha-inicio`, {
        method: "PATCH",
        body: JSON.stringify({ fecha_inicio: dateValue }),
      });
      await load();
      setDateEditorOpen(false);
      setDateNotice(`Fecha actualizada. ${result.cuotas_reajustadas} cuota(s) reajustada(s).`);
    } catch (e) {
      setDateError((e as Error).message);
    } finally {
      setSavingDate(false);
    }
  }
  useEffect(() => {
    load();
    api<any[]>("/api/formas-pago").then((r) => {
      setForms(r);
      if (r[0]) setForm(String(r[0].idforma_pago));
    });
  }, [id]);
  const paymentPreview = useMemo(() => {
    let remaining = Number(amount || 0);
    const result: { numero: number; monto: number }[] = [];
    for (const q of data?.cuotas ?? []) {
      if (remaining <= 0) break;
      const due = Number(q.saldo_pendiente ?? 0);
      if (due <= 0) continue;
      const applied = Math.min(remaining, due);
      result.push({ numero: q.numero, monto: applied });
      remaining -= applied;
    }
    return result;
  }, [amount, data]);
  async function confirmPay(destination: "PDF" | "WHATSAPP" | "NONE") {
    if (processing) return;
    const popup = destination === "NONE" ? null : window.open("about:blank", "_blank");
    setProcessing(true);
    try {
      const body = { monto: amount, fk_idforma_pago: Number(form) };
      const r = await api<any>("/api/operaciones/" + id + "/pagos", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setAmount("");
      setError("");
      await load();
      if (destination === "NONE") {
        return;
      }
      if (destination === "PDF") {
        if (popup)
          popup.location.href = "/api/pagos/" + r.idpago + "/comprobante.pdf";
        else
          window.open("/api/pagos/" + r.idpago + "/comprobante.pdf", "_blank");
      } else if (
        r.resumen?.telefono_whatsapp &&
        r.resumen?.texto_whatsapp
      ) {
        openWhatsApp(
          r.resumen.telefono_whatsapp,
          r.resumen.texto_whatsapp,
          popup,
        );
      } else {
        if (popup) popup.close();
        setError(
          "Pago registrado, pero el teléfono del cliente no es válido para WhatsApp.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
      setConfirmOpen(false);
    }
  }
  function pay() {
    if (!amount || Number(amount) <= 0) {
      setError("Ingrese un monto válido para registrar el pago.");
      return;
    }
    if (Number(amount) > Number(data?.saldo || 0)) {
      setError(`El monto supera el saldo pendiente de ${money(data?.saldo)}.`);
      return;
    }
    setError("");
    setConfirmOpen(true);
  }
  function openReceipt(destination: "PDF" | "WHATSAPP") {
    if (!receipt) return;
    const amount = money(receipt.monto);
    if (destination === "PDF") {
      window.open(
        "/api/pagos/" + receipt.idpago + "/comprobante.pdf",
        "_blank",
      );
      setReceipt(null);
      return;
    }
    const text = [
      "NM CREDITOS",
      "COMPROBANTE DE PAGO #" + receipt.idpago,
      "Cliente: " + data.nombre_completo,
      "C.I.: " + data.cedula,
      "Fecha: " + shortDate(receipt.fecha_pago),
      "Forma de pago: " + receipt.forma_pago,
      "Monto recibido: " + amount,
      "Saldo restante: " + money(data.saldo),
    ].join("\n");
    if (!openWhatsApp(data.telefono1, text)) {
      setError("El cliente no tiene un teléfono válido para WhatsApp");
      setReceipt(null);
      return;
    }
    setReceipt(null);
  }
  const paymentDateTime = (value: string) =>
    new Intl.DateTimeFormat("es-PY", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  if (!data)
    return (
      <main className="page">
        <div className="panel empty">Cargando información…</div>
      </main>
    );
  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">NM CREDITOS</p>
          <h1>{data.nombre_completo}</h1>
          <p className="muted">
            {data.tipo === "PRESTAMO" ? "Préstamo" : "Venta financiada"} ·{" "}
            {data.frecuencia}
          </p>
          {data.tipo === "VENTA_FINANCIADA" && data.producto && (
            <p className="product-subtitle">
              Producto: <strong>{data.producto}</strong>
            </p>
          )}
        </div>
      </div>
      <section className="metrics-grid five">
        <article className="metric">
          <span>Prestado</span>
          <strong>{money(data.monto_capital)}</strong>
        </article>
        <article className="metric interest">
          <span>Interés</span>
          <strong>{money(data.monto_interes)} / {data.porcentaje_interes}%</strong>
        </article>
        <article className="metric">
          <span>Total a cobrar</span>
          <strong>{money(data.monto_total)}</strong>
        </article>
        <article className="metric green">
          <span>Recibido</span>
          <strong>{money(data.total_pagado)}</strong>
        </article>
        <article className="metric amber">
          <span>Saldo deudor</span>
          <strong>{money(data.saldo)}</strong>
        </article>
      </section>
      <div className="detail-grid">
        <section className="panel schedule-panel">
          <div className="detail-tabs" role="tablist">
            <button className={activeTab === "CUOTAS" ? "active" : ""} onClick={() => setActiveTab("CUOTAS")}>Cuotas</button>
            <button className={activeTab === "PAGOS" ? "active" : ""} onClick={() => setActiveTab("PAGOS")}>Pagos <span>{data.pagos.length}</span></button>
          </div>
          {activeTab === "CUOTAS" ? (
            <>
              <div className="section-head tab-content-head">
                <div>
                  <p className="eyebrow">CRONOGRAMA</p>
                  <h2>Plan de cuotas</h2>
                </div>
                <div className="pay-box">
                  <input
                    aria-label="Monto a cobrar"
                    placeholder="Monto a cobrar"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  />
                  <select aria-label="Forma de pago" value={form} onChange={(e) => setForm(e.target.value)}>
                    {forms.map((f) => <option key={f.idforma_pago} value={f.idforma_pago}>{f.nombre}</option>)}
                  </select>
                  <button className="button success" disabled={!amount || data.estado === "PAGADA"} onClick={pay}>Registrar pago</button>
                </div>
              </div>
              {error && <div className="alert error">{error}</div>}
              <div className="installments">
                <div className="installment header">
                  <span>#</span><span>Vencimiento</span><span>Interés / Capital</span><span>Total</span><span>Pagado</span><span>Saldo</span><span>Estado</span>
                </div>
                {data.cuotas.map((q: any) => (
                  <div className={`installment ${q.estado === "PAGADA" ? "paid-row" : ""}`} key={q.idcuota}>
                    <span>{q.numero}/{data.cantidad_cuotas}</span>
                    <span>{shortDate(q.fecha_vencimiento)}</span>
                    <span className="amount-stack"><span>{money(q.monto_interes)}</span><span>{money(q.monto_capital)}</span>{q.fecha_pago_interes && <small className="paid-date">Interés cubierto: {shortDate(q.fecha_pago_interes)}</small>}</span>
                    <strong>{money(q.monto_total)}</strong>
                    <span className="paid-amount">{money(q.monto_pagado)}</span>
                    <strong className={Number(q.saldo_pendiente) > 0 ? "pending-amount" : "green-text"}>{money(q.saldo_pendiente)}</strong>
                    <span><span className={`badge ${q.estado.toLowerCase()}`}>{q.estado}</span>{q.fecha_pago && <small className="paid-date">Pagada: {shortDate(q.fecha_pago)}</small>}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="payments-tab">
              <div className="tab-content-head">
                <p className="eyebrow">HISTORIAL</p>
                <h2>Pagos registrados</h2>
              </div>
              {data.pagos.length === 0 ? <div className="empty">Todavía no hay pagos registrados.</div> : (
                <div className="payments-table">
                  <div className="payment-row header"><span>Comprobante</span><span>Fecha</span><span>Forma</span><span>Monto</span><span>Estado</span><span>Acciones</span></div>
                  {data.pagos.map((p: any) => (
                    <div className="payment-group" key={p.idpago}>
                      <div className="payment-row">
                        <button className="payment-expand" onClick={() => setExpandedPayment(expandedPayment === p.idpago ? null : p.idpago)} aria-expanded={expandedPayment === p.idpago}>#{p.idpago} <span>{expandedPayment === p.idpago ? "−" : "+"}</span></button>
                        <span>{paymentDateTime(p.fecha_pago)}</span>
                        <span>{p.forma_pago}</span>
                        <strong>{money(p.monto)}</strong>
                        <span><span className={`badge ${p.estado.toLowerCase()}`}>{p.estado}</span></span>
                        <span className="payment-actions"><button className="button secondary" onClick={() => window.open(`/api/pagos/${p.idpago}/comprobante.pdf`, "_blank")}>PDF</button><button className="button whatsapp" onClick={() => setReceipt(p)}>WhatsApp</button></span>
                      </div>
                      {expandedPayment === p.idpago && (
                        <div className="payment-detail">
                          <div className="payment-detail-row header"><span>Cuota</span><span>Interés / Capital</span><span>Total aplicado</span></div>
                          {p.aplicaciones.length ? p.aplicaciones.map((a: any) => <div className="payment-detail-row" key={`${p.idpago}-${a.idcuota}`}><span>Cuota {a.numero}</span><span className="amount-stack"><span>{money(a.monto_interes)}</span><span>{money(a.monto_capital)}</span></span><strong>{money(a.monto_total)}</strong></div>) : <p className="muted">Este pago no tiene aplicaciones activas.</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
        <aside className="panel data-panel">
          <p className="eyebrow">DATOS</p>
          {dateNotice && <div className="alert success" role="status">{dateNotice}</div>}
          <dl>
            <dt>Cliente</dt>
            <dd>{data.nombre_completo}</dd>
            <dt>Cédula</dt>
            <dd>{data.cedula}</dd>
            <dt>Fecha de inicio</dt>
            <dd className="operation-start-date"><span>{shortDate(data.fecha_inicio)}</span><button type="button" className="button tiny secondary" onClick={openDateEditor}>Editar fecha</button></dd>
            <dt>Tasa de interés</dt>
            <dd>{data.porcentaje_interes}%</dd>
            <dt>Estado</dt>
            <dd>{data.estado}</dd>
            <dt>Observación</dt>
            <dd>{data.observacion || "—"}</dd>
            <dt>Garantía</dt>
            <dd>{data.garantia?.descripcion || "—"}</dd>
          </dl>
          {data.tipo === "VENTA_FINANCIADA" && (
            <section className="product-summary">
              <p className="eyebrow">PRODUCTO FINANCIADO</p>
              <dl>
                <dt>Producto</dt>
                <dd>{data.producto || "—"}</dd>
                <dt>Código</dt>
                <dd>{data.producto_codigo || "—"}</dd>
                <dt>Cantidad</dt>
                <dd>{data.producto_cantidad ?? "—"}</dd>
                <dt>Precio unitario</dt>
                <dd>
                  {data.producto_precio_unitario != null
                    ? money(data.producto_precio_unitario)
                    : "—"}
                </dd>
                <dt>Precio contado</dt>
                <dd>
                  {data.producto_precio_contado != null
                    ? money(data.producto_precio_contado)
                    : "—"}
                </dd>
              </dl>
            </section>
          )}
          <div className="account-actions">
            <a
              className="button primary wide"
              href={`/api/operaciones/${id}/cuenta.pdf`}
              target="_blank"
            >
              <FileText /> Cuenta PDF A4
            </a>
            <a
              className="button success wide"
              href={`/api/operaciones/${id}/cuenta.xlsx`}
            >
              <FileText /> Cuenta EXCEL
            </a>
          </div>
        </aside>
      </div>
      {dateEditorOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-start-date-title">
          <div className="confirm-modal">
            <p className="eyebrow">EDITAR OPERACIÓN</p>
            <h2 id="edit-start-date-title">Fecha de inicio</h2>
            <p>Las cuotas pagadas o con abonos conservan su vencimiento. Se reajustarán las demás cuotas según el plan.</p>
            <label>Fecha de inicio
              <input autoFocus required inputMode="numeric" placeholder="dd/mm/yyyy" maxLength={10} value={dateValue} onChange={(event) => setDateValue(event.target.value.replace(/[^0-9/]/g, "").slice(0, 10))} />
            </label>
            {dateError && <div className="alert error" role="alert">{dateError}</div>}
            <div className="modal-actions">
              <button type="button" className="button secondary" disabled={savingDate} onClick={() => setDateEditorOpen(false)}>Cancelar</button>
              <button type="button" className="button primary" disabled={savingDate} onClick={saveStartDate}>{savingDate ? "Guardando…" : "Guardar y reajustar"}</button>
            </div>
          </div>
        </div>
      )}
      {receipt && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="confirm-modal">
            <p className="eyebrow">COMPROBANTE DE PAGO</p>
            <h2>Comprobante #{receipt.idpago}</h2>
            <p>
              Cliente: <strong>{data.nombre_completo}</strong>
              <br />
              Fecha: {shortDate(receipt.fecha_pago)}
              <br />
              Forma de pago: {receipt.forma_pago}
              <br />
              Monto recibido: <strong>{money(receipt.monto)}</strong>
              <br />
              Saldo actual: <strong>{money(data.saldo)}</strong>
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setReceipt(null)}
              >
                Cancelar
              </button>
              <button
                className="button success"
                onClick={() => openReceipt("PDF")}
              >
                <FileText /> Abrir PDF
              </button>
              <button
                className="button whatsapp"
                onClick={() => openReceipt("WHATSAPP")}
              >
                <MessageCircle /> Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="confirm-modal">
            <p className="eyebrow">CONFIRMAR COBRO</p>
            <h2>¿Confirmar este pago?</h2>
            <p>
              Se registrará un pago de <strong>{money(amount)}</strong> distribuido desde la cuota pendiente más antigua.
            </p>
            {paymentPreview.length > 0 && (
              <div className="allocation-preview">
                <strong>Aplicación estimada</strong>
                {paymentPreview.map((item) => <span key={item.numero}>Cuota {item.numero}: {money(item.monto)}</span>)}
              </div>
            )}
            <div className="modal-actions">
              <button
                className="button secondary"
                disabled={processing}
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={processing}
                onClick={() => confirmPay("NONE")}
              >
                Pagar
              </button>
              <button
                className="button success"
                disabled={processing}
                onClick={() => confirmPay("PDF")}
              >
                <FileText /> Abrir PDF
              </button>
              <button
                className="button whatsapp"
                disabled={processing}
                onClick={() => confirmPay("WHATSAPP")}
              >
                <MessageCircle /> Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
