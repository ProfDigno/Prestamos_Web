import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, MessageCircle } from "lucide-react";
import { api, money, shortDate } from "./api";

export default function OperationDetailSelectable() {
  const { id } = useParams();
  const [data, setData] = useState<any>();
  const [forms, setForms] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [amount, setAmount] = useState("");
  const [form, setForm] = useState("");
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"TOTAL" | "INTERES">("TOTAL");
  const [discount, setDiscount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const load = () => api<any>(`/api/operaciones/${id}`).then(setData);
  useEffect(() => {
    load();
    api<any[]>("/api/formas-pago").then((r) => {
      setForms(r);
      if (r[0]) setForm(String(r[0].idforma_pago));
    });
  }, [id]);
  const selectedTotal = useMemo(
    () =>
      data?.cuotas
        ?.filter((q: any) => selected.includes(q.idcuota))
        .reduce(
          (s: number, q: any) =>
            s +
            Number(q.monto_total) -
            Number(q.interes_pagado || 0) -
            Number(q.capital_pagado || 0),
          0,
        ) || 0,
    [data, selected],
  );
  const interestTotal = useMemo(
    () =>
      data?.cuotas
        ?.filter((q: any) => selected.includes(q.idcuota))
        .reduce(
          (s: number, q: any) =>
            s + Number(q.monto_interes) - Number(q.interes_pagado || 0),
          0,
        ) || 0,
    [data, selected],
  );
  const selectedCapital = useMemo(
    () =>
      data?.cuotas
        ?.filter((q: any) => selected.includes(q.idcuota))
        .reduce(
          (s: number, q: any) =>
            s + Number(q.monto_capital) - Number(q.capital_pagado || 0),
          0,
        ) || 0,
    [data, selected],
  );
  const canDiscount =
    selected.length > 0 &&
    paymentMode === "TOTAL" &&
    Math.abs(selectedTotal - Number(data?.saldo || 0)) < 0.01;
  function toggle(q: any) {
    if (q.estado === "PAGADA" || q.estado === "ANULADA") return;
    setDiscount("");
    setSelected((v) =>
      v.includes(q.idcuota)
        ? v.filter((x) => x !== q.idcuota)
        : [...v, q.idcuota],
    );
  }
  async function confirmPay(destination: "PDF" | "WHATSAPP") {
    if (processing) return;
    const popup = window.open("about:blank", "_blank");
    setProcessing(true);
    try {
      const body = selected.length
        ? {
            cuota_ids: selected,
            modo: paymentMode,
            monto:
              paymentMode === "INTERES"
                ? interestTotal.toFixed(2)
                : discount
                  ? (selectedTotal - Number(discount)).toFixed(2)
                  : undefined,
            descuento_general: discount ? String(discount) : undefined,
            fk_idforma_pago: Number(form),
          }
        : { monto: amount, fk_idforma_pago: Number(form) };
      const r = await api<any>("/api/operaciones/" + id + "/pagos", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSelected([]);
      setAmount("");
      setDiscount("");
      setError("");
      setPaymentMode("TOTAL");
      await load();
      if (destination === "PDF") {
        if (popup)
          popup.location.href = "/api/pagos/" + r.idpago + "/comprobante.pdf";
        else
          window.open("/api/pagos/" + r.idpago + "/comprobante.pdf", "_blank");
      } else if (r.resumen?.whatsapp_url) {
        if (popup) popup.location.href = r.resumen.whatsapp_url;
        else window.open(r.resumen.whatsapp_url, "_blank");
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
    setPaymentMode("TOTAL");
    setConfirmOpen(true);
  }
  function payInterest() {
    setPaymentMode("INTERES");
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
    let phone = String(data.telefono1 || "").replace(/\D/g, "");
    if (phone.startsWith("00")) phone = phone.slice(2);
    if (phone.startsWith("0")) phone = "595" + phone.slice(1);
    else if (!phone.startsWith("595") && phone.length === 9)
      phone = "595" + phone;
    const text = [
      "PRÉSTAMOS CDE",
      "COMPROBANTE DE PAGO #" + receipt.idpago,
      "Cliente: " + data.nombre_completo,
      "C.I.: " + data.cedula,
      "Fecha: " + shortDate(receipt.fecha_pago),
      "Forma de pago: " + receipt.forma_pago,
      "Monto recibido: " + amount,
      "Saldo restante: " + money(data.saldo),
    ].join("\n");
    if (phone.length < 11) {
      setError("El cliente no tiene un teléfono válido para WhatsApp");
      setReceipt(null);
      return;
    }
    window.open(
      "https://web.whatsapp.com/send?phone=" +
        phone +
        "&text=" +
        encodeURIComponent(text),
      "_blank",
    );
    setReceipt(null);
  }
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
          <p className="eyebrow">PRÉSTAMOS CDE</p>
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
      <section className="metrics-grid four">
        <article className="metric">
          <span>Prestado</span>
          <strong>{money(data.monto_capital)}</strong>
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
          <div className="section-head">
            <div>
              <p className="eyebrow">CRONOGRAMA</p>
              <h2>Plan de cuotas</h2>
              {selected.length > 0 && (
                <p className="selection-total">
                  {selected.length} cuota(s) seleccionada(s) ·{" "}
                  <strong>{money(selectedTotal)}</strong>
                </p>
              )}
            </div>
            <div className="pay-box">
              <input
                placeholder="Monto a cobrar"
                inputMode="numeric"
                value={
                  selected.length
                    ? String(
                        Math.round(
                          paymentMode === "INTERES"
                            ? interestTotal
                            : Math.max(
                                0,
                                selectedTotal - Number(discount || 0),
                              ),
                        ),
                      )
                    : amount
                }
                disabled={selected.length > 0}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              />
              <select value={form} onChange={(e) => setForm(e.target.value)}>
                {forms.map((f) => (
                  <option key={f.idforma_pago} value={f.idforma_pago}>
                    {f.nombre}
                  </option>
                ))}
              </select>
              {canDiscount && (
                <input
                  placeholder="Descuento general"
                  inputMode="numeric"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(e.target.value.replace(/\D/g, ""))
                  }
                />
              )}
              <button
                className="button success"
                disabled={
                  (!selected.length && !amount) || data.estado === "PAGADA"
                }
                onClick={pay}
              >
                Registrar pago
              </button>
              <button
                className="button secondary"
                disabled={!selected.length || data.estado === "PAGADA"}
                onClick={payInterest}
              >
                Solo interés
              </button>
            </div>
          </div>
          {error && <div className="alert error">{error}</div>}
          <div className="installments">
            <div className="installment header">
              <span>Sel.</span>
              <span>#</span>
              <span>Vencimiento</span>
              <span>Interés</span>
              <span>Capital</span>
              <span>Total</span>
              <span>Estado</span>
            </div>
            {data.cuotas.map((q: any) => (
              <div
                className={`installment ${q.estado === "PAGADA" ? "paid-row" : ""}`}
                key={q.idcuota}
              >
                <span>
                  <input
                    type="checkbox"
                    checked={selected.includes(q.idcuota)}
                    disabled={q.estado === "PAGADA" || q.estado === "ANULADA"}
                    onChange={() => toggle(q)}
                  />
                </span>
                <span>
                  {q.numero}/{data.cantidad_cuotas}
                </span>
                <span>{shortDate(q.fecha_vencimiento)}</span>
                <span>
                  {money(q.monto_interes)}
                  {q.fecha_pago_interes && (
                    <small className="paid-date">
                      Pagado: {shortDate(q.fecha_pago_interes)}
                    </small>
                  )}
                </span>
                <span>{money(q.monto_capital)}</span>
                <strong>{money(q.monto_total)}</strong>
                <span>
                  <span className={`badge ${q.estado.toLowerCase()}`}>
                    {q.estado}
                  </span>
                  {q.fecha_pago && (
                    <small className="paid-date">
                      Pagada: {shortDate(q.fecha_pago)}
                    </small>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
        <aside className="panel data-panel">
          <p className="eyebrow">DATOS</p>
          <dl>
            <dt>Cliente</dt>
            <dd>{data.nombre_completo}</dd>
            <dt>Cédula</dt>
            <dd>{data.cedula}</dd>
            <dt>Fecha de inicio</dt>
            <dd>{shortDate(data.fecha_inicio)}</dd>
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
          {data.pagos.map((p: any) => (
            <button
              key={p.idpago}
              className="button secondary wide"
              onClick={() => setReceipt(p)}
            >
              Comprobante #{p.idpago}
            </button>
          ))}
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
              {paymentMode === "INTERES"
                ? "Se cobrará únicamente el interés pendiente de "
                : discount
                  ? "Se registrará una liquidación de "
                  : "Se registrará un pago de "}
              <strong>
                {money(
                  selected.length
                    ? paymentMode === "INTERES"
                      ? interestTotal
                      : discount
                        ? Math.max(0, selectedTotal - Number(discount))
                        : selectedTotal
                    : amount,
                )}
              </strong>
              {discount
                ? ` sobre ${money(selectedTotal)}. Descuento aplicado: ${money(discount)}. Saldo restante: Gs. 0.`
                : paymentMode === "INTERES"
                  ? ` de ${selected.length} cuota(s). Capital pendiente: ${money(selectedCapital)}.`
                  : selected.length > 0
                    ? ` correspondiente a ${selected.length} cuota(s) seleccionada(s).`
                    : " como pago libre."}
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                disabled={processing}
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
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
