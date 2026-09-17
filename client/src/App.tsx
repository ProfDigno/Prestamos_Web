import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Banknote,
  Boxes,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { api, money, shortDate } from "./api";
import EditClient from "./EditClient";
import OperationDetailSelectable from "./OperationDetailSelectable";

type User = {
  id: number;
  login: string;
  nombre: string;
  rol: string;
  permisos: string[];
};
type Notice = { type: "ok" | "error"; text: string } | null;

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [login, setLogin] = useState("admin@prestamos.local");
  const [password, setPassword] = useState("Prestamo2026!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
      });
      onLogin(r.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">
          <Banknote />
          <span>PC</span>
        </div>
        <p className="eyebrow">GESTIÓN FINANCIERA</p>
        <h1>Préstamos CDE</h1>
        <p className="muted">
          Ingresá para administrar clientes, cobros y caja.
        </p>
        <form onSubmit={submit} className="stack">
          <label>
            Usuario
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="button primary wide" disabled={busy}>
            {busy ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>
        <p className="login-hint">Acceso demo: admin@prestamos.local</p>
      </section>
    </main>
  );
}

const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/prestamos", "Préstamos", WalletCards],
  ["/calendario", "Calendario", CalendarDays],
  ["/clientes", "Clientes", Users],
  ["/nueva-operacion", "Nuevo préstamo", CircleDollarSign],
  ["/ventas", "Ventas financiadas", Package],
  ["/productos", "Producto", Boxes],
  ["/caja", "Caja diaria", CalendarDays],
  ["/gastos", "Gastos", ReceiptText],
  ["/administracion", "Administración", Settings],
] as const;
function Shell({
  user,
  onLogout,
  children,
}: {
  user: User;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark small">
            <Banknote />
          </div>
          <div>
            <strong>Préstamos CDE</strong>
            <span>PANEL</span>
          </div>
          <button className="icon mobile-only" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{user.nombre.charAt(0)}</div>
          <div>
            <strong>{user.nombre}</strong>
            <span>{user.rol}</span>
          </div>
          <button className="icon" onClick={onLogout} title="Cerrar sesión">
            <LogOut />
          </button>
        </div>
      </aside>
      <section className="content">
        <header className="topbar">
          <button className="icon mobile-only" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="top-title">Panel de gestión</div>
          <div className="status-dot">
            <i /> Sistema conectado
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}

function Page({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">PRÉSTAMOS CDE</p>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </main>
  );
}
function Metric({
  label,
  value,
  tone = "blue",
  hint,
}: {
  label: string;
  value: string;
  tone?: string;
  hint?: string;
}) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}
function Loading() {
  return <div className="panel empty">Cargando información…</div>;
}
function NoticeBar({ notice }: { notice: Notice }) {
  return notice ? (
    <div className={`alert ${notice.type === "ok" ? "success" : "error"}`}>
      {notice.text}
    </div>
  ) : null;
}

function Dashboard() {
  const [data, setData] = useState<any>();
  useEffect(() => {
    api("/api/dashboard").then(setData);
  }, []);
  if (!data)
    return (
      <Page title="Dashboard" subtitle="Resumen general de tu cartera">
        <Loading />
      </Page>
    );
  return (
    <Page title="Dashboard" subtitle="Resumen general de tu cartera">
      <section className="metrics-grid">
        <Metric label="Capital prestado" value={money(data.prestado)} />
        <Metric label="Total a cobrar" value={money(data.total_cobrar)} />
        <Metric
          label="Total cobrado"
          value={money(data.cobrado)}
          tone="green"
        />
        <Metric
          label="Saldo pendiente"
          value={money(data.saldo)}
          tone="amber"
        />
        <Metric
          label="Vence hoy"
          value={String(data.vence_hoy)}
          hint={money(data.monto_vencido)}
          tone="amber"
        />
        <Metric
          label="Cuotas atrasadas"
          value={String(data.atrasadas)}
          tone="red"
        />
        <Metric
          label="Ingresos de hoy"
          value={money(data.ingresos)}
          tone="green"
        />
        <Metric label="Egresos de hoy" value={money(data.egresos)} tone="red" />
      </section>
      <section className="panel intro-panel">
        <div>
          <h2>Todo bajo control</h2>
          <p>
            Revisá los vencimientos, registrá cobros y seguí el movimiento
            diario desde un solo lugar.
          </p>
        </div>
        <div className="quick-links">
          <NavLink className="button primary" to="/nueva-operacion">
            Nuevo préstamo
          </NavLink>
          <NavLink className="button secondary" to="/prestamos">
            Ver cartera
          </NavLink>
        </div>
      </section>
    </Page>
  );
}

function Operations({
  type = "PRESTAMO",
  action,
}: {
  type?: string;
  action?: ReactNode;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("ACTIVA");
  useEffect(() => {
    api<any[]>(`/api/operaciones?tipo=${type}&estado=${filter}`).then(setRows);
  }, [type, filter]);
  return (
    <Page
      title={type === "PRESTAMO" ? "Préstamos" : "Ventas financiadas"}
      subtitle="Cartera, vencimientos y estado de cobro"
      action={
        <div className="page-actions">
          {action}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option>ACTIVA</option>
            <option>PAGADA</option>
            <option>CANCELADA</option>
          </select>
        </div>
      }
    >
      <section className="loan-grid">
        {rows.map((row) => (
          <LoanCard key={row.idoperacion_financiera} row={row} />
        ))}
      </section>
      {!rows.length && (
        <div className="panel empty">No hay operaciones para mostrar.</div>
      )}
    </Page>
  );
}
function LoanCard({ row }: { row: any }) {
  const overdue =
    row.proximo_vencimiento &&
    row.proximo_vencimiento < new Date().toISOString().slice(0, 10);
  const tone = row.estado === "PAGADA" ? "paid" : overdue ? "late" : "current";
  return (
    <article className={`loan-card ${tone}`}>
      <div className="loan-title">
        <div>
          <h3>{row.nombre_completo}</h3>
          <div className="chips">
            <span>
              {row.estado === "PAGADA"
                ? "PAGADO"
                : overdue
                  ? "ATRASADO"
                  : "AL DÍA"}
            </span>
            <span>{row.frecuencia}</span>
            <span>
              {row.cuotas_pagadas}/{row.cantidad_cuotas} pagas
            </span>
          </div>
        </div>
        <div className="balance">
          <small>RESTANTE</small>
          <strong>{money(row.saldo)}</strong>
        </div>
      </div>
      <p className="due">
        Próximo vencimiento{" "}
        <strong>{shortDate(row.proximo_vencimiento)}</strong>
      </p>
      <div className="loan-stats">
        <div>
          <small>PRESTADO</small>
          <strong>{money(row.monto_capital)}</strong>
        </div>
        <div>
          <small>TOTAL</small>
          <strong>{money(row.monto_total)}</strong>
        </div>
        <div>
          <small>COBRADO</small>
          <strong className="green-text">{money(row.total_pagado)}</strong>
        </div>
        <div>
          <small>INTERÉS</small>
          <strong>{row.porcentaje_interes}%</strong>
        </div>
      </div>
      <NavLink
        className="button primary wide"
        to={`/operaciones/${row.idoperacion_financiera}`}
      >
        Ver cronograma
      </NavLink>
    </article>
  );
}

function CalendarView() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [data, setData] = useState<any>();
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [notify, setNotify] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [year, monthNo] = month.split("-").map(Number);
  const load = () =>
    api<any>(`/api/calendario?mes=${month}`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  useEffect(() => {
    setError("");
    setSelectedDate(null);
    load();
  }, [month]);
  const first = new Date(year, monthNo - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, monthNo - 1, 1 - offset + i);
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      day: d.getDate(),
      current: d.getMonth() === monthNo - 1,
    };
  });
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const q of data?.cuotas ?? [])
      (map[q.fecha_vencimiento] ??= []).push(q);
    return map;
  }, [data]);
  const selectedDateItems = selectedDate ? (grouped[selectedDate] ?? []) : [];
  const monthLabel = new Intl.DateTimeFormat("es-PY", {
    month: "long",
    year: "numeric",
  }).format(first);
  function shift(delta: number) {
    const d = new Date(year, monthNo - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  async function confirmNotify() {
    if (!notify || processing) return;
    const popup = window.open("about:blank", "_blank");
    setProcessing(true);
    try {
      const result = await api<any>(`/api/cuotas/${notify.idcuota}/notificar`, {
        method: "POST",
      });
      if (popup) popup.location.href = result.whatsapp_url;
      else window.open(result.whatsapp_url, "_blank");
      setNotify(null);
      await load();
    } catch (e) {
      if (popup) popup.close();
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }
  return (
    <Page
      title="Calendario"
      subtitle="Cuotas pendientes de cobro"
      action={
        <div className="calendar-nav">
          <button
            className="button secondary"
            onClick={() => shift(-1)}
            aria-label="Mes anterior"
          >
            <ChevronLeft />
          </button>
          <button
            className="button secondary today-button"
            onClick={() => {
              const d = new Date();
              setMonth(
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
              );
            }}
          >
            Hoy
          </button>
          <button
            className="button secondary"
            onClick={() => shift(1)}
            aria-label="Mes siguiente"
          >
            <ChevronRight />
          </button>
        </div>
      }
    >
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="calendar-title">
            <h2>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h2>
            <span>
              {data?.resumen?.cantidad ?? 0} cuotas ·{" "}
              {money(data?.resumen?.monto_total)}
            </span>
          </div>
          <div className="calendar-weekdays">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          {error && <div className="alert error">{error}</div>}
          <div className="calendar-grid">
            {cells.map((cell) => {
              const items = grouped[cell.date] ?? [];
              const overdue = items.some(
                (q) =>
                  q.estado === "VENCIDA" ||
                  q.fecha_vencimiento < new Date().toISOString().slice(0, 10),
              );
              return (
                <button
                  key={cell.date}
                  className={`calendar-day ${cell.current ? "" : "outside"} ${items.length ? "has-items" : ""} ${overdue ? "overdue" : ""} ${selectedDate === cell.date ? "selected" : ""}`}
                  onClick={() => items.length && setSelectedDate(cell.date)}
                  disabled={!items.length}
                >
                  <span className="day-number">{cell.day}</span>
                  {items.length > 0 && (
                    <>
                      <span className="day-count">
                        {items.length} cuota{items.length > 1 ? "s" : ""}
                      </span>
                      <strong>
                        {money(
                          items.reduce(
                            (s, q) => s + Number(q.monto_pendiente),
                            0,
                          ),
                        )}
                      </strong>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>
        {selectedDate && (
          <aside className="panel calendar-detail">
            <div className="section-head">
              <div>
                <p className="eyebrow">VENCIMIENTOS</p>
                <h2>{shortDate(selectedDate)}</h2>
              </div>
              <button
                className="icon"
                onClick={() => setSelectedDate(null)}
                aria-label="Cerrar"
              >
                <X />
              </button>
            </div>
            {selectedDateItems.length === 0 ? (
              <div className="empty">No hay cuotas pendientes.</div>
            ) : (
              <>
                <div className="calendar-day-total">
                  <span>Total del día</span>
                  <strong>
                    {money(
                      selectedDateItems.reduce(
                        (s, q) => s + Number(q.monto_pendiente),
                        0,
                      ),
                    )}
                  </strong>
                </div>
                <div className="calendar-items">
                  {selectedDateItems.map((q) => (
                    <article
                      className={`calendar-item ${q.notificado_hoy ? "notified-today" : ""}`}
                      key={q.idcuota}
                    >
                      <div>
                        <strong>{q.cliente}</strong>
                        <small>
                          C.I. {q.cedula} · Cuota {q.numero}
                        </small>
                        <small>
                          {q.estado} · Interés{" "}
                          {money(q.monto_interes_pendiente)} · Capital{" "}
                          {money(q.monto_capital_pendiente)}
                        </small>
                        {q.notificado_hoy && (
                          <small className="notified-label">
                            Notificado hoy
                          </small>
                        )}
                      </div>
                      <strong>{money(q.monto_pendiente)}</strong>
                      <div className="calendar-item-actions">
                        <button
                          className="button secondary"
                          disabled={q.notificado_hoy}
                          onClick={() => setNotify(q)}
                        >
                          {q.notificado_hoy ? "Notificado" : "Notificar"}
                        </button>
                        <button
                          className="button primary"
                          onClick={() =>
                            navigate(
                              `/operaciones/${q.idoperacion_financiera ?? q.fk_idoperacion_financiera}`,
                            )
                          }
                        >
                          Cobrar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </aside>
        )}
      </div>
      {notify && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="confirm-modal notify-modal">
            <p className="eyebrow">NOTIFICAR PAGO</p>
            <h2>¿Notificar al cliente?</h2>
            <p>
              Se enviará un recordatorio a <strong>{notify.cliente}</strong> por
              la cuota <strong>{notify.numero}</strong>, con vencimiento el{" "}
              <strong>{shortDate(notify.fecha_vencimiento)}</strong>.
            </p>
            <div className="notify-summary">
              <span>
                Interés pendiente{" "}
                <strong>{money(notify.monto_interes_pendiente)}</strong>
              </span>
              <span>
                Capital pendiente{" "}
                <strong>{money(notify.monto_capital_pendiente)}</strong>
              </span>
              <span>
                Total a pagar <strong>{money(notify.monto_pendiente)}</strong>
              </span>
            </div>
            <div className="modal-actions">
              <button
                className="button secondary"
                disabled={processing}
                onClick={() => setNotify(null)}
              >
                Cancelar
              </button>
              <button
                className="button whatsapp"
                disabled={processing}
                onClick={confirmNotify}
              >
                Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

function OperationDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>();
  const [forms, setForms] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [form, setForm] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const load = () => api(`/api/operaciones/${id}`).then(setData);
  useEffect(() => {
    load();
    api<any[]>("/api/formas-pago").then((r) => {
      setForms(r);
      if (r[0]) setForm(String(r[0].idforma_pago));
    });
  }, [id]);
  async function pay() {
    try {
      const r = await api<any>(`/api/operaciones/${id}/pagos`, {
        method: "POST",
        body: JSON.stringify({ monto: amount, fk_idforma_pago: Number(form) }),
      });
      setNotice({ type: "ok", text: "Pago registrado correctamente." });
      setAmount("");
      await load();
      window.open(`/api/pagos/${r.idpago}/comprobante.pdf`, "_blank");
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  if (!data)
    return (
      <Page title="Detalle de operación">
        <Loading />
      </Page>
    );
  return (
    <Page
      title={data.nombre_completo}
      subtitle={`${data.tipo === "PRESTAMO" ? "Préstamo" : "Venta financiada"} · ${data.frecuencia}`}
    >
      <NoticeBar notice={notice} />
      <section className="metrics-grid four">
        <Metric label="Prestado" value={money(data.monto_capital)} />
        <Metric label="Total a cobrar" value={money(data.monto_total)} />
        <Metric
          label="Recibido"
          value={money(data.total_pagado)}
          tone="green"
        />
        <Metric label="Saldo deudor" value={money(data.saldo)} tone="amber" />
      </section>
      <div className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">CRONOGRAMA</p>
              <h2>Plan de cuotas</h2>
            </div>
            {data.estado !== "PAGADA" && (
              <div className="pay-box">
                <input
                  placeholder="Monto a cobrar"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                />
                <select value={form} onChange={(e) => setForm(e.target.value)}>
                  {forms.map((f) => (
                    <option key={f.idforma_pago} value={f.idforma_pago}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
                <button
                  className="button success"
                  disabled={!amount}
                  onClick={pay}
                >
                  Registrar pago
                </button>
              </div>
            )}
          </div>
          <div className="installments">
            <div className="installment header">
              <span>#</span>
              <span>Vencimiento</span>
              <span>Interés</span>
              <span>Capital</span>
              <span>Total</span>
              <span>Estado</span>
            </div>
            {data.cuotas.map((q: any) => (
              <div className="installment" key={q.idcuota}>
                <span>
                  {q.numero}/{data.cantidad_cuotas}
                </span>
                <span>{shortDate(q.fecha_vencimiento)}</span>
                <span>{money(q.monto_interes)}</span>
                <span>{money(q.monto_capital)}</span>
                <strong>{money(q.monto_total)}</strong>
                <span className={`badge ${q.estado.toLowerCase()}`}>
                  {q.estado}
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
          {data.pagos.map((p: any) => (
            <a
              key={p.idpago}
              className="button secondary wide"
              href={`/api/pagos/${p.idpago}/comprobante.pdf`}
              target="_blank"
            >
              Comprobante #{p.idpago}
            </a>
          ))}
        </aside>
      </div>
    </Page>
  );
}

function Clients() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const load = () =>
    api<any[]>(`/api/clientes?q=${encodeURIComponent(q)}`).then(setRows);
  useEffect(() => {
    load();
  }, [q]);
  return (
    <Page
      title="Clientes"
      subtitle="Información personal, laboral y referencias"
      action={
        <button className="button primary" onClick={() => setShow(!show)}>
          {show ? "Cerrar" : "Nuevo cliente"}
        </button>
      }
    >
      <NoticeBar notice={notice} />
      {show && (
        <ClientFormComplete
          onDone={() => {
            setShow(false);
            setNotice({ type: "ok", text: "Cliente creado correctamente." });
            load();
          }}
        />
      )}
      <div className="toolbar">
        <input
          placeholder="Buscar por nombre o cédula…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Cédula</th>
              <th>Teléfono</th>
              <th>Profesión</th>
              <th>Ingreso</th>
              <th>Operaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.idcliente}>
                <td>
                  <strong>{r.nombre_completo}</strong>
                  <small>{r.email}</small>
                </td>
                <td>{r.cedula}</td>
                <td>{r.telefono1}</td>
                <td>{r.profesion || "—"}</td>
                <td>{money(r.ingreso_promedio)}</td>
                <td>{r.operaciones}</td>
                <td>
                  <NavLink
                    className="button tiny secondary"
                    to={`/clientes/${r.idcliente}/editar`}
                  >
                    Editar
                  </NavLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
function MapPreview({
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
      <iframe
        title="Ubicación GPS del cliente"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
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
function ClientForm({ onDone }: { onDone: () => void }) {
  const [types, setTypes] = useState<any[]>([]);
  const [cedulaFile, setCedulaFile] = useState<File | null>(null);
  const [cedulaBackFile, setCedulaBackFile] = useState<File | null>(null);
  const [mapKey, setMapKey] = useState("");
  const [data, setData] = useState<any>({
    nombre_completo: "",
    cedula: "",
    direccion: "",
    telefono1: "",
    email: "",
    profesion: "",
    ingreso_promedio: "",
    tasa_interes_sugerida: "",
    referencias: [
      { nombre_completo: "", telefono: "", fk_idtipo_referencia: "" },
      { nombre_completo: "", telefono: "", fk_idtipo_referencia: "" },
    ],
  });
  const [error, setError] = useState("");
  useEffect(() => {
    api<any[]>("/api/tipos-referencia").then((r) => {
      setTypes(r);
      if (r[0])
        setData((d: any) => ({
          ...d,
          referencias: d.referencias.map((x: any) => ({
            ...x,
            fk_idtipo_referencia:
              x.fk_idtipo_referencia || String(r[0].idtipo_referencia),
          })),
        }));
    });
    api<any[]>("/api/configuracion")
      .then((r) => {
        const minimo = r[0]?.interes_minimo;
        if (minimo !== undefined && minimo !== null)
          setData((d: any) => ({
            ...d,
            tasa_interes_sugerida: String(minimo),
          }));
      })
      .catch(() => {});
    api<any>("/api/mapa/config").then((r) => setMapKey(r.apiKey || ""));
  }, []);
  function field(k: string, v: any) {
    setData({ ...data, [k]: v });
  }
  function ref(i: number, k: string, v: string) {
    const refs = data.referencias.map((r: any, n: number) =>
      n === i ? { ...r, [k]: v } : r,
    );
    field("referencias", refs);
  }
  function numeric(v: string) {
    return v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  }
  function gps() {
    if (!navigator.geolocation) {
      setError("GPS no disponible");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setData((d: any) => ({
          ...d,
          latitud: p.coords.latitude,
          longitud: p.coords.longitude,
        })),
      (e) => setError(e.message),
      { enableHighAccuracy: true },
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const created = await api<{ idcliente: number }>("/api/clientes", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (cedulaFile) {
        const form = new FormData();
        form.append("cedula", cedulaFile);
        form.append("lado", "FRENTE");
        await api(`/api/clientes/${created.idcliente}/cedula`, {
          method: "POST",
          body: form,
        });
      }
      if (cedulaBackFile) {
        const form = new FormData();
        form.append("cedula", cedulaBackFile);
        form.append("lado", "ATRAS");
        await api(`/api/clientes/${created.idcliente}/cedula`, { method: "POST", body: form });
      }
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form className="panel form-grid" onSubmit={submit}>
      <h2 className="full">Nuevo cliente</h2>
      <label>
        Nombre completo
        <input
          required
          value={data.nombre_completo}
          onChange={(e) => field("nombre_completo", e.target.value)}
        />
      </label>
      <label>
        Cédula
        <input
          required
          value={data.cedula}
          onChange={(e) => field("cedula", e.target.value)}
        />
      </label>
      <label>
        Dirección
        <input
          required
          value={data.direccion}
          onChange={(e) => field("direccion", e.target.value)}
        />
      </label>
      <label>
        Teléfono 1 / WhatsApp
        <input
          required
          value={data.telefono1}
          onChange={(e) => field("telefono1", e.target.value)}
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={data.email}
          onChange={(e) => field("email", e.target.value)}
        />
      </label>
      <label>
        Profesión
        <input
          value={data.profesion}
          onChange={(e) => field("profesion", e.target.value)}
        />
      </label>
      <label>
        Ingreso promedio
        <input
          required
          type="text"
          inputMode="decimal"
          pattern="[0-9]+(\.[0-9]{1,4})?"
          value={data.ingreso_promedio}
          onChange={(e) => field("ingreso_promedio", numeric(e.target.value))}
        />
      </label>
      <label>
        Interés sugerido (%)
        <input
          required
          type="text"
          inputMode="decimal"
          pattern="[0-9]+(\.[0-9]{1,4})?"
          value={data.tasa_interes_sugerida}
          onChange={(e) =>
            field("tasa_interes_sugerida", numeric(e.target.value))
          }
        />
      </label>
      <button type="button" className="button secondary" onClick={gps}>
        Capturar ubicación GPS
      </button>
      {data.latitud != null && data.longitud != null && (
        <>
          <span className="gps-ok">
            Ubicación capturada: {Number(data.latitud).toFixed(6)},{" "}
            {Number(data.longitud).toFixed(6)}
          </span>
          <div className="full">
            <MapPreview
              latitud={Number(data.latitud)}
              longitud={Number(data.longitud)}
              apiKey={mapKey}
            />
          </div>
        </>
      )}
      {data.referencias.map((r: any, i: number) => (
        <div className="reference full" key={i}>
          <strong>Referencia {i + 1}</strong>
          <input
            required
            placeholder="Nombre completo"
            value={r.nombre_completo}
            onChange={(e) => ref(i, "nombre_completo", e.target.value)}
          />
          <input
            required
            placeholder="Teléfono"
            value={r.telefono}
            onChange={(e) => ref(i, "telefono", e.target.value)}
          />
          <select
            required
            value={r.fk_idtipo_referencia}
            onChange={(e) => ref(i, "fk_idtipo_referencia", e.target.value)}
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
      <section className="full panel cedula-panel">
        <h2>Cédula del cliente</h2>
        <div className="cedula-sides">
          <div className="cedula-side"><label>Frente de cédula<input type="file" accept="image/jpeg,image/png" onChange={(e) => setCedulaFile(e.target.files?.[0] || null)} /></label>{cedulaFile && <><small className="file-name">{cedulaFile.name}</small><img className="cedula-thumbnail" src={URL.createObjectURL(cedulaFile)} alt="Vista previa del frente" /></>}</div>
          <div className="cedula-side"><label>Atrás de cédula<input type="file" accept="image/jpeg,image/png" onChange={(e) => setCedulaBackFile(e.target.files?.[0] || null)} /></label>{cedulaBackFile && <><small className="file-name">{cedulaBackFile.name}</small><img className="cedula-thumbnail" src={URL.createObjectURL(cedulaBackFile)} alt="Vista previa del atrás" /></>}</div>
        </div>
      </section>
      {error && <div className="alert error full">{error}</div>}
      <div className="form-actions full">
        <button className="button primary">Guardar cliente</button>
      </div>
    </form>
  );
}

function NewOperation({ sale = false }: { sale?: boolean }) {
  const nav = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>({
    fk_idcliente: "",
    fecha_inicio: new Date().toISOString().slice(0, 10),
    monto_capital: "",
    porcentaje_interes: "10",
    cantidad_cuotas: 12,
    frecuencia: "MENSUAL",
    dias_semana: [1],
    dias_mes: [10, 25],
    fk_idproducto: "",
  });
  useEffect(() => {
    api<any[]>("/api/clientes").then((r) => {
      setClients(r);
      if (r[0])
        setData((d: any) => ({
          ...d,
          fk_idcliente: String(r[0].idcliente),
          porcentaje_interes:
            r[0].tasa_interes_sugerida != null
              ? String(r[0].tasa_interes_sugerida)
              : d.porcentaje_interes,
        }));
    });
    api<any[]>("/api/productos").then((r) => {
      setProducts(r);
      if (r[0])
        setData((d: any) => ({ ...d, fk_idproducto: String(r[0].idproducto) }));
    });
  }, []);
  const total = useMemo(
    () =>
      Number(data.monto_capital || 0) *
      (1 + Number(data.porcentaje_interes || 0) / 100),
    [data],
  );
  function toggleWeekday(day: number) {
    setData((d: any) => {
      const current = d.dias_semana || [];
      const next =
        d.frecuencia === "SEMANAL"
          ? [day]
          : current.includes(day)
            ? current.filter((x: number) => x !== day)
            : [...current, day].sort((a: number, b: number) => a - b);
      return { ...d, dias_semana: next };
    });
  }
  function setFrequency(value: string) {
    setData((d: any) => {
      let dias = d.dias_mes || [];
      if (value === "QUINCENAL") {
        dias =
          dias.length >= 2
            ? dias.slice(0, 2)
            : [dias[0] || 10, dias[0] === 25 ? 10 : 25];
      } else if (value === "MENSUAL") {
        dias = [dias[0] || 10];
      }
      return { ...d, frecuencia: value, dias_mes: dias };
    });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (data.frecuencia === "DIARIA" && !data.dias_semana.length) {
      setError("Seleccione al menos un día de la semana para un plan diario");
      return;
    }
    if (
      data.frecuencia === "QUINCENAL" &&
      (data.dias_mes.length !== 2 ||
        data.dias_mes[0] === data.dias_mes[1] ||
        data.dias_mes.some((d: number) => d < 1 || d > 31))
    ) {
      setError(
        "Seleccione dos fechas distintas entre 1 y 31 para el plan quincenal",
      );
      return;
    }
    if (
      data.frecuencia === "MENSUAL" &&
      (data.dias_mes.length !== 1 ||
        data.dias_mes[0] < 1 ||
        data.dias_mes[0] > 31)
    ) {
      setError("Seleccione una fecha válida entre 1 y 31");
      return;
    }
    try {
      const body = {
        ...data,
        fk_idcliente: Number(data.fk_idcliente),
        fk_idproducto: sale ? Number(data.fk_idproducto) : undefined,
        cantidad_cuotas: Number(data.cantidad_cuotas),
        dias_semana: ["DIARIA", "SEMANAL"].includes(data.frecuencia)
          ? data.dias_semana
          : [],
        dias_mes: ["QUINCENAL", "MENSUAL"].includes(data.frecuencia)
          ? [...data.dias_mes].sort((a: number, b: number) => a - b)
          : [],
        precio_contado: sale ? data.monto_capital : undefined,
      };
      const r = await api<any>(
        `/api/operaciones/${sale ? "ventas" : "prestamos"}`,
        { method: "POST", body: JSON.stringify(body) },
      );
      nav(`/operaciones/${r.idoperacion_financiera}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page
      title={sale ? "Nueva venta financiada" : "Nuevo préstamo"}
      subtitle="Configurá capital, interés y calendario"
    >
      <form className="panel operation-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Cliente
            <select
              required
              value={data.fk_idcliente}
              onChange={(e) => {
                const value = e.target.value;
                const client = clients.find(
                  (c) => String(c.idcliente) === value,
                );
                setData({
                  ...data,
                  fk_idcliente: value,
                  porcentaje_interes:
                    client?.tasa_interes_sugerida != null
                      ? String(client.tasa_interes_sugerida)
                      : data.porcentaje_interes,
                });
              }}
            >
              {clients.map((c) => (
                <option key={c.idcliente} value={c.idcliente}>
                  {c.nombre_completo}
                </option>
              ))}
            </select>
          </label>
          {sale && (
            <label>
              Producto
              <select
                value={data.fk_idproducto}
                onChange={(e) =>
                  setData({ ...data, fk_idproducto: e.target.value })
                }
              >
                {products.map((p) => (
                  <option key={p.idproducto} value={p.idproducto}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Fecha de inicio
            <input
              type="date"
              value={data.fecha_inicio}
              onChange={(e) =>
                setData({ ...data, fecha_inicio: e.target.value })
              }
            />
          </label>
          <label>
            Monto
            <input
              required
              inputMode="numeric"
              value={data.monto_capital}
              onChange={(e) =>
                setData({
                  ...data,
                  monto_capital: e.target.value.replace(/\D/g, ""),
                })
              }
            />
          </label>
          <label>
            Interés (%)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={data.porcentaje_interes}
              onChange={(e) =>
                setData({ ...data, porcentaje_interes: e.target.value })
              }
            />
          </label>
          <label>
            Cantidad de cuotas
            <input
              required
              type="number"
              min="1"
              value={data.cantidad_cuotas}
              onChange={(e) =>
                setData({ ...data, cantidad_cuotas: e.target.value })
              }
            />
          </label>
          <label>
            Frecuencia
            <div className="frequency-buttons">
              {(
                [
                  ["DIARIA", "Diaria"],
                  ["SEMANAL", "Semanal"],
                  ["QUINCENAL", "Quincenal"],
                  ["MENSUAL", "Mensual"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`button ${data.frecuencia === value ? "primary" : "secondary"}`}
                  onClick={() => setFrequency(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </label>
          {["DIARIA", "SEMANAL"].includes(data.frecuencia) ? (
            <label>
              Días de semana
              <div className="weekday-buttons">
                {(
                  [
                    [1, "LUNES"],
                    [2, "MARTES"],
                    [3, "MIÉRCOLES"],
                    [4, "JUEVES"],
                    [5, "VIERNES"],
                    [6, "SÁBADO"],
                    [7, "DOMINGO"],
                  ] as const
                ).map(([day, label]) => (
                  <button
                    type="button"
                    key={day}
                    className={
                      "button " +
                      ((data.dias_semana || []).includes(day)
                        ? "primary"
                        : "secondary")
                    }
                    onClick={() => toggleWeekday(day)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <small className="field-help">
                {data.frecuencia === "DIARIA"
                  ? "Podés elegir uno o varios días."
                  : "Elegí un solo día."}
              </small>
            </label>
          ) : data.frecuencia === "QUINCENAL" ? (
            <div className="month-days-group">
              <label>
                Primera fecha del mes
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={data.dias_mes[0] || ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      dias_mes: [
                        Number(e.target.value),
                        data.dias_mes[1] || 25,
                      ],
                    })
                  }
                />
              </label>
              <label>
                Segunda fecha del mes
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={data.dias_mes[1] || ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      dias_mes: [
                        data.dias_mes[0] || 10,
                        Number(e.target.value),
                      ],
                    })
                  }
                />
              </label>
            </div>
          ) : (
            <label>
              Día del mes
              <input
                type="number"
                min="1"
                max="31"
                value={data.dias_mes[0] || ""}
                onChange={(e) =>
                  setData({ ...data, dias_mes: [Number(e.target.value)] })
                }
              />
            </label>
          )}
        </div>
        <div className="simulation">
          <div>
            <span>Capital</span>
            <strong>{money(data.monto_capital)}</strong>
          </div>
          <div>
            <span>Interés</span>
            <strong>{money(total - Number(data.monto_capital || 0))}</strong>
          </div>
          <div>
            <span>Total a cobrar</span>
            <strong>{money(total)}</strong>
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        <button className="button primary">
          Crear {sale ? "venta" : "préstamo"} y generar cuotas
        </button>
      </form>
    </Page>
  );
}

function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    precio_referencia: "",
  });
  const [editing, setEditing] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const load = () =>
    api<any[]>("/api/productos")
      .then(setProducts)
      .catch((e) => setNotice({ type: "error", text: (e as Error).message }));
  useEffect(() => {
    load();
  }, []);
  function reset() {
    setForm({ codigo: "", nombre: "", precio_referencia: "" });
    setEditing(null);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (editing)
        await api(`/api/productos/${editing}`, {
          method: "PATCH",
          body: JSON.stringify({
            nombre: form.nombre,
            precio_referencia: form.precio_referencia,
          }),
        });
      else
        await api("/api/productos", {
          method: "POST",
          body: JSON.stringify(form),
        });
      setNotice({
        type: "ok",
        text: editing ? "Producto actualizado." : "Producto creado.",
      });
      reset();
      load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  function edit(p: any) {
    setEditing(p.idproducto);
    setForm({
      codigo: p.codigo,
      nombre: p.nombre,
      precio_referencia: String(p.precio_referencia),
    });
  }
  async function deactivate(p: any) {
    if (!window.confirm(`¿Desactivar ${p.nombre}?`)) return;
    try {
      await api(`/api/productos/${p.idproducto}`, { method: "DELETE" });
      setNotice({ type: "ok", text: "Producto desactivado." });
      load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  return (
    <Page
      title="Producto"
      subtitle="Catálogo de productos para ventas financiadas"
    >
      <NoticeBar notice={notice} />
      <div className="detail-grid">
        <form className="panel stack" onSubmit={save}>
          <h2>{editing ? "Editar producto" : "Nuevo producto"}</h2>
          <label>
            Código
            <input
              required
              disabled={editing !== null}
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            />
          </label>
          <label>
            Nombre
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </label>
          <label>
            Precio de referencia
            <input
              required
              inputMode="numeric"
              value={form.precio_referencia}
              onChange={(e) =>
                setForm({ ...form, precio_referencia: e.target.value })
              }
            />
          </label>
          <div className="form-actions">
            <button className="button primary">
              {editing ? "Guardar cambios" : "Guardar producto"}
            </button>
            {editing && (
              <button
                type="button"
                className="button secondary"
                onClick={reset}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
        <section className="panel">
          <h2>Productos activos</h2>
          {products.length ? (
            products.map((p) => (
              <div className="list-row" key={p.idproducto}>
                <div>
                  <strong>{p.nombre}</strong>
                  <small>{p.codigo}</small>
                </div>
                <strong>{money(p.precio_referencia)}</strong>
                <div className="row-actions">
                  <button
                    className="button tiny secondary"
                    onClick={() => edit(p)}
                  >
                    Editar
                  </button>
                  <button
                    className="button tiny secondary"
                    onClick={() => deactivate(p)}
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">No hay productos activos.</div>
          )}
        </section>
      </div>
    </Page>
  );
}
function SalesProducts() {
  return (
    <Operations
      type="VENTA_FINANCIADA"
      action={
        <NavLink className="button primary" to="/nueva-venta">
          Nueva venta financiada
        </NavLink>
      }
    />
  );
}

function Cash() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>();
  useEffect(() => {
    api(`/api/caja?fecha=${date}`).then(setData);
  }, [date]);
  return (
    <Page
      title="Caja diaria"
      subtitle="Ingresos y egresos organizados por fecha"
      action={
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      }
    >
      {!data ? (
        <Loading />
      ) : (
        <>
          <section className="metrics-grid three">
            <Metric
              label="Ingresos"
              value={money(data.ingresos)}
              tone="green"
            />
            <Metric label="Egresos" value={money(data.egresos)} tone="red" />
            <Metric
              label="Resultado del día"
              value={money(data.saldo)}
              tone={Number(data.saldo) >= 0 ? "blue" : "red"}
            />
          </section>
          <section className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.movimientos.map((m: any) => (
                  <tr key={m.idmovimiento_caja}>
                    <td>{String(m.fecha_movimiento).slice(11, 16)}</td>
                    <td>{m.concepto}</td>
                    <td>
                      <span className={`badge ${m.tipo.toLowerCase()}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td>{money(m.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </Page>
  );
}

function Expenses() {
  const [types, setTypes] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [form, setForm] = useState<any>({
    fk_idgasto_tipo: "",
    fecha: new Date().toISOString().slice(0, 10),
    concepto: "",
    monto: "",
    observacion: "",
  });
  const load = () =>
    Promise.all([
      api<any[]>("/api/gasto-tipos"),
      api<any[]>("/api/gastos"),
    ]).then(([t, r]) => {
      setTypes(t);
      setRows(r);
      if (t[0])
        setForm((f: any) => ({
          ...f,
          fk_idgasto_tipo: String(t[0].idgasto_tipo),
        }));
    });
  useEffect(() => {
    load();
  }, []);
  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/gastos", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          fk_idgasto_tipo: Number(form.fk_idgasto_tipo),
        }),
      });
      setNotice({ type: "ok", text: "Gasto registrado en caja." });
      setForm({ ...form, concepto: "", monto: "", observacion: "" });
      load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  return (
    <Page title="Gastos" subtitle="Registro de egresos relacionados con caja">
      <NoticeBar notice={notice} />
      <div className="detail-grid">
        <form className="panel stack" onSubmit={add}>
          <h2>Registrar gasto</h2>
          <label>
            Tipo
            <select
              value={form.fk_idgasto_tipo}
              onChange={(e) =>
                setForm({ ...form, fk_idgasto_tipo: e.target.value })
              }
            >
              {types.map((t) => (
                <option key={t.idgasto_tipo} value={t.idgasto_tipo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </label>
          <label>
            Concepto
            <input
              required
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            />
          </label>
          <label>
            Monto
            <input
              required
              inputMode="numeric"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
            />
          </label>
          <button className="button primary">Registrar egreso</button>
        </form>
        <section className="panel">
          <h2>Últimos gastos</h2>
          {rows.map((g) => (
            <div className="list-row" key={g.idgasto}>
              <div>
                <strong>{g.concepto}</strong>
                <small>
                  {g.tipo} · {shortDate(g.fecha)}
                </small>
              </div>
              <strong className="red-text">{money(g.monto)}</strong>
            </div>
          ))}
        </section>
      </div>
    </Page>
  );
}

function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [userForm, setUserForm] = useState<any>({
    fk_idrol: "",
    login: "",
    password: "",
    nombres: "",
    apellidos: "",
    cedula: "",
  });
  const [bankForm, setBankForm] = useState({ codigo: "", nombre: "" });
  const [typeForm, setTypeForm] = useState({
    nombre: "",
    descripcion: "",
    orden: "1",
  });
  const load = () =>
    Promise.all([
      api<any[]>("/api/usuarios"),
      api<any[]>("/api/roles"),
      api<any[]>("/api/bancos"),
      api<any[]>("/api/configuracion"),
      api<any[]>("/api/administracion/tipos-referencia"),
    ]).then(([u, r, b, c, t]) => {
      setUsers(u);
      setRoles(r);
      setBanks(b);
      setSettings(c);
      setTypes(t);
      if (r[0])
        setUserForm((f: any) => ({
          ...f,
          fk_idrol: f.fk_idrol || String(r[0].idrol),
        }));
    });
  useEffect(() => {
    load();
  }, []);
  async function addUser(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({
          ...userForm,
          fk_idrol: Number(userForm.fk_idrol),
        }),
      });
      setNotice({ type: "ok", text: "Usuario creado correctamente." });
      setUserForm({
        ...userForm,
        login: "",
        password: "",
        nombres: "",
        apellidos: "",
        cedula: "",
      });
      load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  async function addBank(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/bancos", {
        method: "POST",
        body: JSON.stringify(bankForm),
      });
      setBankForm({ codigo: "", nombre: "" });
      setNotice({ type: "ok", text: "Banco creado." });
      load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  async function addType(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/administracion/tipos-referencia", {
        method: "POST",
        body: JSON.stringify({ ...typeForm, orden: Number(typeForm.orden) }),
      });
      setTypeForm({
        nombre: "",
        descripcion: "",
        orden: String(types.length + 1),
      });
      setNotice({ type: "ok", text: "Tipo de referencia creado." });
      load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  async function toggleType(t: any) {
    try {
      await api(`/api/administracion/tipos-referencia/${t.idtipo_referencia}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: !t.activo }),
      });
      load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  async function saveInterest(e: FormEvent) {
    e.preventDefault();
    try {
      await api(
        `/api/configuracion/${settings[0].idconfiguracion_financiera}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            interes_minimo: settings[0].interes_minimo,
            moneda: "PYG",
          }),
        },
      );
      setNotice({ type: "ok", text: "Configuración actualizada." });
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  return (
    <Page
      title="Administración"
      subtitle="Usuarios, roles, bancos y configuración"
    >
      <NoticeBar notice={notice} />
      <section className="admin-grid">
        <div className="panel">
          <h2>
            <ShieldCheck /> Usuarios y roles
          </h2>
          <form className="mini-form" onSubmit={addUser}>
            <input
              required
              placeholder="Nombres"
              value={userForm.nombres}
              onChange={(e) =>
                setUserForm({ ...userForm, nombres: e.target.value })
              }
            />
            <input
              required
              placeholder="Apellidos"
              value={userForm.apellidos}
              onChange={(e) =>
                setUserForm({ ...userForm, apellidos: e.target.value })
              }
            />
            <input
              required
              type="email"
              placeholder="Usuario / email"
              value={userForm.login}
              onChange={(e) =>
                setUserForm({ ...userForm, login: e.target.value })
              }
            />
            <input
              required
              placeholder="Cédula"
              value={userForm.cedula}
              onChange={(e) =>
                setUserForm({ ...userForm, cedula: e.target.value })
              }
            />
            <input
              required
              type="password"
              minLength={8}
              placeholder="Contraseña"
              value={userForm.password}
              onChange={(e) =>
                setUserForm({ ...userForm, password: e.target.value })
              }
            />
            <select
              value={userForm.fk_idrol}
              onChange={(e) =>
                setUserForm({ ...userForm, fk_idrol: e.target.value })
              }
            >
              {roles.map((r) => (
                <option key={r.idrol} value={r.idrol}>
                  {r.nombre}
                </option>
              ))}
            </select>
            <button className="button primary">Crear usuario</button>
          </form>
          {users.map((u) => (
            <div className="list-row" key={u.idusuario}>
              <div>
                <strong>
                  {u.nombres} {u.apellidos}
                </strong>
                <small>{u.login}</small>
              </div>
              <span className="badge pendiente">{u.rol}</span>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>
            <Building2 /> Bancos
          </h2>
          <form className="stack compact" onSubmit={addBank}>
            <input
              required
              placeholder="Código"
              value={bankForm.codigo}
              onChange={(e) =>
                setBankForm({ ...bankForm, codigo: e.target.value })
              }
            />
            <input
              required
              placeholder="Nombre del banco"
              value={bankForm.nombre}
              onChange={(e) =>
                setBankForm({ ...bankForm, nombre: e.target.value })
              }
            />
            <button className="button secondary">Agregar banco</button>
          </form>
          {banks.map((b) => (
            <div className="list-row" key={b.idbanco}>
              <strong>{b.nombre}</strong>
              <small>{b.codigo}</small>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>
            <Boxes /> Tipos de referencia
          </h2>
          <form className="stack compact" onSubmit={addType}>
            <input
              required
              placeholder="Nombre (ej. Familiar)"
              value={typeForm.nombre}
              onChange={(e) =>
                setTypeForm({ ...typeForm, nombre: e.target.value })
              }
            />
            <input
              placeholder="Descripción"
              value={typeForm.descripcion}
              onChange={(e) =>
                setTypeForm({ ...typeForm, descripcion: e.target.value })
              }
            />
            <input
              required
              type="number"
              min="1"
              value={typeForm.orden}
              onChange={(e) =>
                setTypeForm({ ...typeForm, orden: e.target.value })
              }
            />
            <button className="button secondary">Agregar tipo</button>
          </form>
          {types.map((t) => (
            <div className="list-row" key={t.idtipo_referencia}>
              <div>
                <strong>{t.nombre}</strong>
                <small>{t.descripcion || "Sin descripción"}</small>
              </div>
              <button className="button tiny" onClick={() => toggleType(t)}>
                {t.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>
            <Boxes /> Configuración
          </h2>
          {settings[0] && (
            <form className="stack" onSubmit={saveInterest}>
              <label>
                Interés mínimo (%)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings[0].interes_minimo}
                  onChange={(e) =>
                    setSettings([
                      { ...settings[0], interes_minimo: e.target.value },
                    ])
                  }
                />
              </label>
              <label>
                Moneda
                <input value="PYG" disabled />
              </label>
              <button className="button primary">Guardar</button>
            </form>
          )}
        </div>
      </section>
    </Page>
  );
}

function ClientFormComplete({ onDone }: { onDone: () => void }) {
  const [types, setTypes] = useState<any[]>([]);
  const [mapKey, setMapKey] = useState("");
  const [cedulaFile, setCedulaFile] = useState<File | null>(null);
  const [cedulaBackFile, setCedulaBackFile] = useState<File | null>(null);
  const [data, setData] = useState<any>({
    nombre_completo: "",
    cedula: "",
    fecha_nacimiento: "",
    ruc: "",
    direccion: "",
    telefono1: "",
    telefono2: "",
    email: "",
    profesion: "",
    dedicacion: "",
    ingreso_promedio: "",
    tasa_interes_sugerida: "",
    direccion_trabajo: "",
    nombre_empresa: "",
    telefono_empresa: "",
    ruc_empresa: "",
    observacion: "",
    referencias: [
      {
        nombre_completo: "",
        telefono: "",
        direccion: "",
        fk_idtipo_referencia: "",
      },
      {
        nombre_completo: "",
        telefono: "",
        direccion: "",
        fk_idtipo_referencia: "",
      },
    ],
  });
  const [error, setError] = useState("");
  useEffect(() => {
    api<any[]>("/api/tipos-referencia").then((r) => {
      setTypes(r);
      if (r[0])
        setData((d: any) => ({
          ...d,
          referencias: d.referencias.map((x: any) => ({
            ...x,
            fk_idtipo_referencia:
              x.fk_idtipo_referencia || String(r[0].idtipo_referencia),
          })),
        }));
    });
    api<any[]>("/api/configuracion")
      .then((r) => {
        if (r[0]?.interes_minimo != null)
          setData((d: any) => ({
            ...d,
            tasa_interes_sugerida: String(r[0].interes_minimo),
          }));
      })
      .catch(() => {});
    api<any>("/api/mapa/config").then((r) => setMapKey(r.apiKey || ""));
  }, []);
  const set = (k: string, v: string) => setData((d: any) => ({ ...d, [k]: v }));
  const ref = (i: number, k: string, v: string) =>
    setData((d: any) => ({
      ...d,
      referencias: d.referencias.map((r: any, n: number) =>
        n === i ? { ...r, [k]: v } : r,
      ),
    }));
  const numeric = (v: string) =>
    v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  const integer = (v: string) => v.replace(/\D/g, "");
  const gps = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) =>
        setData((d: any) => ({
          ...d,
          latitud: p.coords.latitude,
          longitud: p.coords.longitude,
        })),
      (e) => setError(e.message),
      { enableHighAccuracy: true },
    );
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const created = await api<{ idcliente: number }>("/api/clientes", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (cedulaFile) {
        const form = new FormData();
        form.append("cedula", cedulaFile);
        form.append("lado", "FRENTE");
        await api(`/api/clientes/${created.idcliente}/cedula`, {
          method: "POST",
          body: form,
        });
      }
      if (cedulaBackFile) {
        const form = new FormData();
        form.append("cedula", cedulaBackFile);
        form.append("lado", "ATRAS");
        await api(`/api/clientes/${created.idcliente}/cedula`, { method: "POST", body: form });
      }
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form className="panel form-grid" onSubmit={submit}>
      <h2 className="full">Nuevo cliente</h2>
      <label>
        Nombre completo
        <input
          required
          value={data.nombre_completo}
          onChange={(e) => set("nombre_completo", e.target.value)}
        />
      </label>
      <label>
        Cédula
        <input
          required
          value={data.cedula}
          onChange={(e) => set("cedula", e.target.value)}
        />
      </label>
      <label>
        Fecha de nacimiento
        <input
          required
          type="date"
          value={data.fecha_nacimiento}
          onChange={(e) => set("fecha_nacimiento", e.target.value)}
        />
      </label>
      <label>
        RUC
        <input value={data.ruc} onChange={(e) => set("ruc", e.target.value)} />
      </label>
      <label>
        Dirección
        <input
          required
          value={data.direccion}
          onChange={(e) => set("direccion", e.target.value)}
        />
      </label>
      <label>
        Teléfono 1 / WhatsApp
        <input
          required
          value={data.telefono1}
          onChange={(e) => set("telefono1", e.target.value)}
        />
      </label>
      <label>
        Teléfono 2
        <input
          value={data.telefono2}
          onChange={(e) => set("telefono2", e.target.value)}
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={data.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </label>
      <label>
        Profesión
        <input
          value={data.profesion}
          onChange={(e) => set("profesion", e.target.value)}
        />
      </label>
      <label>
        Dedicación
        <input
          value={data.dedicacion}
          onChange={(e) => set("dedicacion", e.target.value)}
        />
      </label>
      <label>
        Ingreso promedio
        <input
          required
          inputMode="decimal"
          value={data.ingreso_promedio}
          onChange={(e) => set("ingreso_promedio", numeric(e.target.value))}
        />
      </label>
      <label>
        Interés sugerido (%)
        <input
          required
          inputMode="numeric"
          value={data.tasa_interes_sugerida}
          onChange={(e) =>
            set("tasa_interes_sugerida", integer(e.target.value))
          }
        />
      </label>
      <fieldset className="full employer-box">
        <legend>Datos de la empresa</legend>
        <div className="form-grid nested-grid">
          <label>
            Dirección de trabajo
            <input
              value={data.direccion_trabajo}
              onChange={(e) => set("direccion_trabajo", e.target.value)}
            />
          </label>
          <label>
            Nombre de empresa
            <input
              value={data.nombre_empresa}
              onChange={(e) => set("nombre_empresa", e.target.value)}
            />
          </label>
          <label>
            Teléfono laboral
            <input
              value={data.telefono_empresa}
              onChange={(e) => set("telefono_empresa", e.target.value)}
            />
          </label>
          <label>
            RUC laboral
            <input
              value={data.ruc_empresa}
              onChange={(e) => set("ruc_empresa", e.target.value)}
            />
          </label>
        </div>
      </fieldset>
      <label>
        Observación
        <textarea
          value={data.observacion}
          onChange={(e) => set("observacion", e.target.value)}
        />
      </label>
      <button type="button" className="button secondary" onClick={gps}>
        Capturar ubicación GPS
      </button>
      {data.latitud != null && data.longitud != null && (
        <div className="full">
          <MapPreview
            latitud={Number(data.latitud)}
            longitud={Number(data.longitud)}
            apiKey={mapKey}
          />
        </div>
      )}
      {data.referencias.map((r: any, i: number) => (
        <div className="reference full" key={i}>
          <strong>Referencia {i + 1}</strong>
          <input
            required
            placeholder="Nombre completo"
            value={r.nombre_completo}
            onChange={(e) => ref(i, "nombre_completo", e.target.value)}
          />
          <input
            required
            placeholder="Teléfono"
            value={r.telefono}
            onChange={(e) => ref(i, "telefono", e.target.value)}
          />
          <input
            placeholder="Dirección"
            value={r.direccion}
            onChange={(e) => ref(i, "direccion", e.target.value)}
          />
          <select
            required
            value={r.fk_idtipo_referencia}
            onChange={(e) => ref(i, "fk_idtipo_referencia", e.target.value)}
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
      <section className="full panel cedula-panel">
        <h2>Cédula del cliente</h2>
        <div className="cedula-sides">
          <div className="cedula-side"><label>Frente de cédula<input type="file" accept="image/jpeg,image/png" onChange={(e) => setCedulaFile(e.target.files?.[0] || null)} /></label>{cedulaFile && <><small className="file-name">{cedulaFile.name}</small><img className="cedula-thumbnail" src={URL.createObjectURL(cedulaFile)} alt="Vista previa del frente" /></>}</div>
          <div className="cedula-side"><label>Atrás de cédula<input type="file" accept="image/jpeg,image/png" onChange={(e) => setCedulaBackFile(e.target.files?.[0] || null)} /></label>{cedulaBackFile && <><small className="file-name">{cedulaBackFile.name}</small><img className="cedula-thumbnail" src={URL.createObjectURL(cedulaBackFile)} alt="Vista previa del atrás" /></>}</div>
        </div>
      </section>
      {error && <div className="alert error full">{error}</div>}
      <div className="form-actions full">
        <button className="button primary">Guardar cliente</button>
      </div>
    </form>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
  }, []);
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  }
  if (user === undefined)
    return (
      <div className="splash">
        <Banknote />
        <span>Préstamos CDE</span>
      </div>
    );
  if (!user) return <Login onLogin={setUser} />;
  return (
    <Shell user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/prestamos" element={<Operations />} />
        <Route path="/calendario" element={<CalendarView />} />
        <Route
          path="/operaciones/:id"
          element={<OperationDetailSelectable />}
        />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/clientes/:id/editar" element={<EditClient />} />
        <Route path="/nueva-operacion" element={<NewOperation />} />
        <Route path="/nueva-venta" element={<NewOperation sale />} />
        <Route path="/ventas" element={<SalesProducts />} />
        <Route path="/productos" element={<Products />} />
        <Route path="/caja" element={<Cash />} />
        <Route path="/gastos" element={<Expenses />} />
        <Route path="/administracion" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Shell>
  );
}
