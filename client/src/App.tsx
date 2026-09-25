import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
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
  ChevronDown,
  Handshake,
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
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { optimizeCedulaImage } from "./imageUtils";
import { api, money, shortDate } from "./api";
import { openWhatsApp } from "./whatsapp";
import { calculatePreviewInstallments } from "./loanPreview";
import EditClient from "./EditClient";
import OperationDetailSelectable from "./OperationDetailSelectable";
import { version as appVersion } from "../package.json";

type User = {
  id: number;
  login: string;
  nombre: string;
  rol: string;
  permisos: string[];
};
type Notice = { type: "ok" | "error"; text: string } | null;

function ageFromBirth(value: string | null | undefined) {
  if (!value) return "—";
  const birth = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? `${age} años` : "—";
}

function normalizeDecimalInput(value: string, maxDecimals = 4) {
  if (value.trim().startsWith("-")) return "";
  const normalized = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const [integer = "", ...fractionParts] = normalized.split(".");
  if (!fractionParts.length) return integer;
  return `${integer || "0"}.${fractionParts.join("").slice(0, maxDecimals)}`;
}

function roundedAmount(value: number) {
  return Number.isFinite(value) ? (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2) : "";
}

function roundedPercentage(value: number) {
  return Number.isFinite(value) ? (Math.round((value + Number.EPSILON) * 10000) / 10000).toString() : "";
}

function localDateInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
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
          <img src="/nm-creditos-logo.jpeg" alt="NM CREDITOS" />
        </div>
        <p className="eyebrow">GESTIÓN FINANCIERA</p>
        <h1>NM CREDITOS</h1>
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
        <p className="login-version">Versión {appVersion}</p>
      </section>
    </main>
  );
}

const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/calendario", "Calendario", CalendarDays],
  ["/caja", "Caja diaria", CalendarDays],
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
  const [adminOpen, setAdminOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [loansOpen, setLoansOpen] = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);
  const location = useLocation();
  const administrationPath = ["/administracion", "/administracion/formas-pago", "/administracion/tipos-referencia", "/administracion/bancos"].includes(location.pathname);
  const usersPath = ["/administracion/usuarios", "/administracion/roles", "/administracion/eventos"].includes(location.pathname);
  const loansPath = ["/prestamos", "/ventas", "/productos", "/clientes"].includes(location.pathname)
    || location.pathname === "/administracion/corredores";
  const expensesPath = ["/gastos", "/gastos/analisis", "/gasto-tipos"].includes(location.pathname);
  useEffect(() => {
    if (administrationPath) setAdminOpen(true);
  }, [administrationPath]);
  useEffect(() => {
    if (usersPath) setUsersOpen(true);
  }, [usersPath]);
  useEffect(() => {
    if (loansPath) setLoansOpen(true);
  }, [loansPath]);
  useEffect(() => {
    if (expensesPath) setExpensesOpen(true);
  }, [expensesPath]);
  return (
    <div className="app-shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark small">
            <img src="/nm-creditos-logo.jpeg" alt="NM CREDITOS" />
          </div>
          <div>
            <strong>NM CREDITOS</strong>
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
          <div className={`nav-group ${loansPath ? "active" : ""}`}>
            <div className="nav-parent-row">
              <NavLink to="/prestamos" onClick={() => setOpen(false)}>
                <WalletCards />
                <span>Préstamos</span>
              </NavLink>
              <button className="nav-expander" type="button" aria-label="Mostrar submenú de préstamos" aria-expanded={loansOpen} onClick={() => setLoansOpen((value) => !value)}>
                <ChevronDown className={loansOpen ? "rotated" : ""} />
              </button>
            </div>
            {loansOpen && <div className="nav-submenu">
              <NavLink to="/prestamos" end onClick={() => setOpen(false)}><WalletCards /><span>Préstamos</span></NavLink>
              <NavLink to="/ventas" onClick={() => setOpen(false)}><Package /><span>Ventas financiadas</span></NavLink>
              <NavLink to="/productos" onClick={() => setOpen(false)}><Boxes /><span>Producto</span></NavLink>
              <NavLink to="/clientes" onClick={() => setOpen(false)}><Users /><span>Clientes</span></NavLink>
              <NavLink to="/administracion/corredores" onClick={() => setOpen(false)}><Handshake /><span>Corredores</span></NavLink>
            </div>}
          </div>
          <div className={`nav-group ${expensesPath ? "active" : ""}`}>
            <div className="nav-parent-row">
              <NavLink to="/gastos" onClick={() => setOpen(false)}>
                <ReceiptText />
                <span>Gastos</span>
              </NavLink>
              <button className="nav-expander" type="button" aria-label="Mostrar submenú de gastos" aria-expanded={expensesOpen} onClick={() => setExpensesOpen((value) => !value)}>
                <ChevronDown className={expensesOpen ? "rotated" : ""} />
              </button>
            </div>
            {expensesOpen && <div className="nav-submenu">
              <NavLink to="/gastos" end onClick={() => setOpen(false)}><ReceiptText /><span>Gastos</span></NavLink>
              <NavLink to="/gastos/analisis" onClick={() => setOpen(false)}><LayoutDashboard /><span>Análisis de gastos</span></NavLink>
              <NavLink to="/gasto-tipos" onClick={() => setOpen(false)}><Boxes /><span>Gasto tipo</span></NavLink>
            </div>}
          </div>
          <div className={`nav-group ${usersPath ? "active" : ""}`}>
            <div className="nav-parent-row">
              <NavLink to="/administracion/usuarios" onClick={() => setOpen(false)}>
                <Users />
                <span>Usuarios</span>
              </NavLink>
              <button className="nav-expander" type="button" aria-label="Mostrar submenú de usuarios" aria-expanded={usersOpen} onClick={() => setUsersOpen((value) => !value)}>
                <ChevronDown className={usersOpen ? "rotated" : ""} />
              </button>
            </div>
            {usersOpen && <div className="nav-submenu">
              <NavLink to="/administracion/usuarios" onClick={() => setOpen(false)}><Users /><span>Usuarios</span></NavLink>
              <NavLink to="/administracion/roles" onClick={() => setOpen(false)}><ShieldCheck /><span>Roles</span></NavLink>
              <NavLink to="/administracion/eventos" onClick={() => setOpen(false)}><Settings /><span>Eventos</span></NavLink>
            </div>}
          </div>
          <div className={`nav-group ${administrationPath ? "active" : ""}`}>
            <div className="nav-parent-row">
              <NavLink to="/administracion" end onClick={() => setOpen(false)}>
                <Settings />
                <span>Administración</span>
              </NavLink>
              <button className="nav-expander" type="button" aria-label="Mostrar submenú de administración" aria-expanded={adminOpen} onClick={() => setAdminOpen((value) => !value)}>
                <ChevronDown className={adminOpen ? "rotated" : ""} />
              </button>
            </div>
            {adminOpen && <div className="nav-submenu">
              <NavLink to="/administracion/formas-pago" onClick={() => setOpen(false)}><Banknote /><span>Forma de pago</span></NavLink>
              <NavLink to="/administracion/tipos-referencia" onClick={() => setOpen(false)}><Boxes /><span>Tipos de referencia</span></NavLink>
              <NavLink to="/administracion/bancos" onClick={() => setOpen(false)}><Building2 /><span>Bancos</span></NavLink>
            </div>}
          </div>
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
          <p className="eyebrow">NM CREDITOS</p>
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
      {hint && <small className="metric-hint">{hint}</small>}
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

const CHART_COLORS = ["#4f91c7", "#24c784", "#f4c542", "#a979e8", "#ef5966", "#57c7d4"];

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultDashboardRange() {
  const now = new Date();
  return { desde: localIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)), hasta: localIsoDate(now) };
}

function chartDate(value: string) {
  return new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
}

function compactNumber(value: unknown) {
  return new Intl.NumberFormat("es-PY", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value ?? 0));
}

function percent(value: unknown) {
  return `${Number(value ?? 0).toFixed(2)}%`;
}

function Dashboard() {
  const initialRange = useMemo(defaultDashboardRange, []);
  const [filters, setFilters] = useState(initialRange);
  const [applied, setApplied] = useState(initialRange);
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<any>(`/api/dashboard?desde=${applied.desde}&hasta=${applied.hasta}`)
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError((reason as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied]);

  function applyRange(e: FormEvent) {
    e.preventDefault();
    if (!filters.desde || !filters.hasta) return setError("Seleccione la fecha de inicio y fin");
    if (filters.desde > filters.hasta) return setError("La fecha de inicio no puede ser posterior a la fecha final");
    setApplied({ ...filters });
  }

  const hasCash = data?.flujo_diario?.some((row: any) => Number(row.ingresos) || Number(row.egresos));
  const hasActivity = data?.actividad_diaria?.some((row: any) => Number(row.capital_prestamos) || Number(row.capital_ventas) || row.operaciones || row.clientes_nuevos);
  const paymentData = (data?.formas_pago ?? []).map((row: any) => ({ ...row, valor: Number(row.monto) }));
  const delinquencyData = data ? [
    { nombre: "Cartera al día", valor: Number(data.morosidad.cartera_al_dia), color: "#24c784" },
    { nombre: "Cartera vencida", valor: Number(data.morosidad.cartera_vencida), color: "#ef5966" },
  ].filter((row) => row.valor > 0) : [];

  return (
    <Page title="Dashboard" subtitle="Análisis financiero de préstamos y ventas financiadas">
      <form className="panel analytics-filter" onSubmit={applyRange} noValidate>
        <label>Desde<input type="date" value={filters.desde} max={filters.hasta} onChange={(e) => setFilters({ ...filters, desde: e.target.value })} /></label>
        <label>Hasta<input type="date" value={filters.hasta} min={filters.desde} onChange={(e) => setFilters({ ...filters, hasta: e.target.value })} /></label>
        <button className="button primary" disabled={loading}>{loading ? "Actualizando…" : "Actualizar análisis"}</button>
        <span>Período inclusivo · Caja completa</span>
      </form>
      {error && <div className="alert error">{error}</div>}
      {!data && loading ? <Loading /> : data && <>
        <section className="metrics-grid five analytics-metrics">
          <Metric label="Ingresos" value={money(data.kpis.ingresos)} tone="green" />
          <Metric label="Egresos" value={money(data.kpis.egresos)} tone="red" />
          <Metric label="Flujo neto" value={money(data.kpis.flujo_neto)} tone={Number(data.kpis.flujo_neto) >= 0 ? "green" : "red"} />
          <Metric label="Capital colocado" value={money(data.kpis.capital_colocado)} hint={`Préstamos ${money(data.kpis.capital_prestamos)} · Ventas ${money(data.kpis.capital_ventas)}`} />
          <Metric label="Interés cobrado" value={money(data.kpis.interes_cobrado)} tone="green" />
          <Metric label="Cartera pendiente" value={money(data.kpis.cartera_pendiente)} tone="amber" />
          <Metric label="Cartera vencida" value={money(data.kpis.cartera_vencida)} hint={`${data.kpis.cuotas_vencidas} cuotas`} tone="red" />
          <Metric label="Morosidad monetaria" value={percent(data.kpis.morosidad_porcentaje)} hint="Saldo vencido / saldo pendiente" tone="red" />
          <Metric label="Clientes morosos" value={String(data.kpis.clientes_morosos)} hint={`${percent(data.kpis.clientes_morosos_porcentaje)} de ${data.kpis.clientes_con_saldo} con saldo`} tone="red" />
          <Metric label="Cumplimiento" value={percent(data.kpis.cumplimiento_porcentaje)} hint="Cuotas vencidas en el período" tone="green" />
          <Metric label="Clientes nuevos" value={String(data.kpis.clientes_nuevos)} />
          <Metric label="Operaciones nuevas" value={String(data.kpis.operaciones_nuevas)} />
          <Metric label="Ticket promedio" value={money(data.kpis.ticket_promedio)} />
        </section>

        <section className="analytics-grid">
          <article className="panel chart-panel chart-wide">
            <div className="chart-heading"><div><h2>Ingresos y egresos por día</h2><p>Barras de movimiento y línea de flujo neto.</p></div></div>
            {hasCash ? <div className="chart-body" role="img" aria-label="Gráfico diario de ingresos, egresos y flujo neto">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.flujo_diario} margin={{ top: 10, right: 18, left: 5, bottom: 0 }}>
                  <CartesianGrid stroke="#29445a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fecha" tickFormatter={chartDate} stroke="#8fa8bc" minTickGap={22} fontSize={10} />
                  <YAxis tickFormatter={compactNumber} stroke="#8fa8bc" width={58} fontSize={10} />
                  <Tooltip labelFormatter={(label: any) => chartDate(String(label))} formatter={(value: any, name: any) => [money(value), name === "ingresos" ? "Ingresos" : name === "egresos" ? "Egresos" : "Flujo neto"]} contentStyle={{ background: "#102536", border: "1px solid #34536a", borderRadius: 8 }} />
                  <Legend formatter={(value) => value === "ingresos" ? "Ingresos" : value === "egresos" ? "Egresos" : "Flujo neto"} />
                  <Bar dataKey="ingresos" fill="#24c784" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="egresos" fill="#ef5966" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="neto" stroke="#57c7d4" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div> : <div className="chart-empty">No hay movimientos de caja en este período.</div>}
          </article>

          <article className="panel chart-panel">
            <div className="chart-heading"><div><h2>Formas de pago</h2><p>Distribución de cobros confirmados.</p></div></div>
            {paymentData.length ? <div className="chart-body pie-body" role="img" aria-label="Gráfico de formas de pago">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={paymentData} dataKey="valor" nameKey="nombre" innerRadius="48%" outerRadius="76%" paddingAngle={2}>
                  {paymentData.map((_: any, index: number) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie><Tooltip formatter={(value: any, _name: any, item: any) => [`${money(value)} · ${item.payload.porcentaje}% · ${item.payload.cantidad} pagos`, item.payload.nombre]} contentStyle={{ background: "#102536", border: "1px solid #34536a", borderRadius: 8 }} /><Legend /></PieChart>
              </ResponsiveContainer>
            </div> : <div className="chart-empty">No hay pagos confirmados en este período.</div>}
            {!!paymentData.length && <div className="chart-legend-list">{paymentData.map((row: any, index: number) => <div key={row.nombre}><i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><span>{row.nombre}</span><strong>{money(row.monto)} · {row.porcentaje}%</strong></div>)}</div>}
          </article>

          <article className="panel chart-panel">
            <div className="chart-heading"><div><h2>Estado de la cartera</h2><p>Saldo al día frente a saldo vencido.</p></div></div>
            {delinquencyData.length ? <div className="chart-body pie-body" role="img" aria-label="Gráfico de cartera al día y vencida">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={delinquencyData} dataKey="valor" nameKey="nombre" innerRadius="48%" outerRadius="76%" paddingAngle={2}>
                  {delinquencyData.map((row) => <Cell key={row.nombre} fill={row.color} />)}
                </Pie><Tooltip formatter={(value: any, name: any) => [money(value), name]} contentStyle={{ background: "#102536", border: "1px solid #34536a", borderRadius: 8 }} /><Legend /></PieChart>
              </ResponsiveContainer>
            </div> : <div className="chart-empty">No existe cartera pendiente a la fecha seleccionada.</div>}
            <div className="delinquency-summary"><div><span>Morosidad por monto</span><strong>{percent(data.kpis.morosidad_porcentaje)}</strong></div><div><span>Morosidad por clientes</span><strong>{percent(data.kpis.clientes_morosos_porcentaje)}</strong></div></div>
          </article>

          <article className="panel chart-panel chart-wide">
            <div className="chart-heading"><div><h2>Colocaciones y altas</h2><p>Capital por tipo de operación, operaciones creadas y clientes nuevos.</p></div></div>
            {hasActivity ? <div className="chart-body" role="img" aria-label="Gráfico de capital colocado, operaciones y clientes nuevos">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.actividad_diaria} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
                  <CartesianGrid stroke="#29445a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fecha" tickFormatter={chartDate} stroke="#8fa8bc" minTickGap={22} fontSize={10} />
                  <YAxis yAxisId="money" tickFormatter={compactNumber} stroke="#8fa8bc" width={58} fontSize={10} />
                  <YAxis yAxisId="count" orientation="right" allowDecimals={false} stroke="#8fa8bc" width={32} fontSize={10} />
                  <Tooltip labelFormatter={(label: any) => chartDate(String(label))} formatter={(value: any, name: any) => [String(name).startsWith("capital") ? money(value) : String(value), name === "capital_prestamos" ? "Capital préstamos" : name === "capital_ventas" ? "Capital ventas" : name === "operaciones" ? "Operaciones" : "Clientes nuevos"]} contentStyle={{ background: "#102536", border: "1px solid #34536a", borderRadius: 8 }} />
                  <Legend formatter={(value) => value === "capital_prestamos" ? "Capital préstamos" : value === "capital_ventas" ? "Capital ventas" : value === "operaciones" ? "Operaciones" : "Clientes nuevos"} />
                  <Bar yAxisId="money" dataKey="capital_prestamos" stackId="capital" fill="#4f91c7" />
                  <Bar yAxisId="money" dataKey="capital_ventas" stackId="capital" fill="#a979e8" />
                  <Line yAxisId="count" type="monotone" dataKey="operaciones" stroke="#f4c542" strokeWidth={3} dot={false} />
                  <Line yAxisId="count" type="monotone" dataKey="clientes_nuevos" stroke="#24c784" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div> : <div className="chart-empty">No hay operaciones ni clientes nuevos en este período.</div>}
          </article>
        </section>
      </>}
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
  const [clientSearch, setClientSearch] = useState("");
  useEffect(() => {
    api<any[]>(`/api/operaciones?tipo=${type}&estado=${filter}&cliente=${encodeURIComponent(clientSearch.trim())}`).then(setRows);
  }, [type, filter, clientSearch]);
  return (
    <Page
      title={type === "PRESTAMO" ? "Préstamos" : "Ventas financiadas"}
      subtitle="Cartera, vencimientos y estado de cobro"
      action={
        <div className="page-actions">
          {action}
          <input
            type="search"
            className="client-search"
            placeholder="Buscar cliente..."
            aria-label="Buscar cliente por nombre o cédula"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
          />
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
  const paymentMethod = row.tipo === "VENTA_FINANCIADA"
    ? row.venta_forma_pago || "Efectivo"
    : row.prestamo_forma_pago || "—";
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
          <span className="payment-method-card">{paymentMethod}</span>
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
          <strong>{money(row.monto_interes)} / {row.porcentaje_interes}%</strong>
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
      openWhatsApp(
        result.telefono_whatsapp ?? result.telefono1,
        result.texto_whatsapp,
        popup,
      );
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
        <Metric
          label="Prestado"
          value={money(data.monto_capital)}
          hint={data.tipo === "PRESTAMO" ? data.prestamo_forma_pago || data.forma_pago || "—" : data.venta_forma_pago || data.forma_pago || "Efectivo"}
        />
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
            <dt>Corredor</dt>
            <dd>{data.corredor_nombre ? `${data.corredor_nombre} · ${data.porcentaje_comision}% · ${money(data.monto_comision)}` : "Sin corredor"}</dd>
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
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [publicLink, setPublicLink] = useState<{ url: string; fecha_expira: string } | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientOperations, setClientOperations] = useState<any[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const load = () =>
    api<any[]>(`/api/clientes?q=${encodeURIComponent(q)}`).then(setRows);
  useEffect(() => {
    load();
  }, [q]);
  useEffect(() => {
    if (selectedClientId == null) {
      setClientOperations([]);
      return;
    }
    setOperationsLoading(true);
    api<any[]>(`/api/operaciones?clienteId=${selectedClientId}`)
      .then(setClientOperations)
      .catch(() => setClientOperations([]))
      .finally(() => setOperationsLoading(false));
  }, [selectedClientId]);
  async function generatePublicLink() {
    try {
      setPublicLink(await api("/api/clientes/enlaces", { method: "POST" }));
      setNotice({ type: "ok", text: "Link generado por 24 horas." });
    } catch (e) { setNotice({ type: "error", text: (e as Error).message }); }
  }
  function openNew() { setEditingId(null); setModal("new"); }
  function openEdit(id: number) { setEditingId(id); setModal("edit"); }
  function closeModal() { setModal(null); setEditingId(null); }
  async function toggle(client: any) {
    try {
      await api(`/api/clientes/${client.idcliente}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !client.activo }) });
      setNotice({ type: "ok", text: client.activo ? "Cliente desactivado." : "Cliente activado." });
      await load();
    } catch (e) { setNotice({ type: "error", text: (e as Error).message }); }
  }
  return (
    <Page
      title="Clientes"
      subtitle="Información personal, laboral y referencias"
      action={
        <div className="page-actions"><button className="button secondary" onClick={generatePublicLink}>Generar link</button><button className="button primary" onClick={openNew}>Nuevo cliente</button></div>
      }
    >
      <NoticeBar notice={notice} />
      {publicLink && <section className="panel public-link-box"><h2>Link para cargar datos</h2><p className="muted">Vence el {shortDate(publicLink.fecha_expira)} y se invalida después de guardar correctamente.</p><input readOnly value={publicLink.url} /><div className="public-link-actions"><button className="button secondary" onClick={() => navigator.clipboard?.writeText(publicLink.url)}>Copiar link</button><a className="button secondary" href={publicLink.url} target="_blank" rel="noreferrer">Abrir link</a><a className="button whatsapp" href={`https://wa.me/?text=${encodeURIComponent(publicLink.url)}`} target="_blank" rel="noreferrer">Compartir por WhatsApp</a></div></section>}
      {modal === "new" && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="client-modal-title"><div className="confirm-modal client-modal"><ClientFormComplete onCancel={closeModal} onDone={() => { closeModal(); setNotice({ type: "ok", text: "Cliente creado correctamente." }); load(); }} /></div></div>}
      {modal === "edit" && editingId && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="client-modal-title"><div className="confirm-modal client-modal"><ClientFormComplete clientId={editingId} onCancel={closeModal} onDone={() => { closeModal(); setNotice({ type: "ok", text: "Cliente actualizado correctamente." }); load(); }} /></div></div>}
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
              <th>Dirección</th>
              <th>Edad</th>
              <th>Operaciones</th>
              <th>Acciones</th>
              <th>Activo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.idcliente} className={`selectable-row${selectedClientId === r.idcliente ? " selected-row" : ""}${!r.activo ? " product-inactive" : ""}`} onClick={() => setSelectedClientId(r.idcliente)}>
                <td>
                  <strong>{r.nombre_completo}</strong>
                  <small>{r.email}</small>
                </td>
                <td>{r.cedula}</td>
                <td>{r.telefono1}</td>
                <td>{r.direccion || "—"}</td>
                <td>{ageFromBirth(r.fecha_nacimiento)}</td>
                <td>{r.operaciones}</td>
                <td>
                  <button className="button tiny secondary" onClick={(e) => { e.stopPropagation(); openEdit(r.idcliente); }}>Editar</button>
                </td>
                <td><label className="product-active-toggle"><input type="checkbox" checked={Boolean(r.activo)} onChange={() => toggle(r)} onClick={(e) => e.stopPropagation()} aria-label={`${r.activo ? "Desactivar" : "Activar"} ${r.nombre_completo}`} /><span>{r.activo ? "Activo" : "Inactivo"}</span></label></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {selectedClientId != null && <section className="panel client-operations-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">OPERACIONES DEL CLIENTE</p>
            <h2>{rows.find((client) => client.idcliente === selectedClientId)?.nombre_completo || "Cliente seleccionado"}</h2>
          </div>
          <button className="button tiny secondary" onClick={() => setSelectedClientId(null)}>Cerrar</button>
        </div>
        {operationsLoading ? <div className="empty">Cargando operaciones…</div> : clientOperations.length ? <div className="security-table"><table><thead><tr><th>Tipo</th><th>Fecha</th><th>Capital</th><th>Total</th><th>Saldo</th><th>Frecuencia</th><th>Estado</th></tr></thead><tbody>{clientOperations.map((operation) => <tr key={operation.idoperacion_financiera}><td><NavLink to={`/operaciones/${operation.idoperacion_financiera}`}>{operation.tipo === "PRESTAMO" ? "Préstamo" : "Venta financiada"}</NavLink></td><td>{shortDate(operation.fecha_inicio)}</td><td>{money(operation.monto_capital)}</td><td>{money(operation.monto_total)}</td><td>{money(operation.saldo)}</td><td>{operation.frecuencia}</td><td>{operation.estado}</td></tr>)}</tbody></table></div> : <div className="empty">Este cliente no tiene operaciones registradas.</div>}
      </section>}
    </Page>
  );
}

function ClientEditModal({ id, onCancel, onDone }: { id: number; onCancel: () => void; onDone: () => void }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { api<any>(`/api/clientes/${id}`).then(setData).catch((e) => setError((e as Error).message)); }, [id]);
  const set = (key: string, value: any) => setData((current: any) => ({ ...current, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(`/api/clientes/${id}`, { method: "PATCH", body: JSON.stringify({
        nombre_completo: data.nombre_completo,
        fecha_nacimiento: data.fecha_nacimiento ? String(data.fecha_nacimiento).slice(0, 10) : null,
        ruc: data.ruc || null,
        direccion: data.direccion,
        telefono1: data.telefono1,
        telefono2: data.telefono2 || null,
        email: data.email || null,
        profesion: data.profesion || null,
        dedicacion: data.dedicacion || null,
        ingreso_promedio: data.ingreso_promedio || null,
        tasa_interes_sugerida: data.tasa_interes_sugerida || null,
      }) });
      onDone();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="client-edit-modal-title"><form className="confirm-modal product-modal stack" onSubmit={submit}><p className="eyebrow">ADMINISTRACIÓN DE CLIENTES</p><h2 id="client-edit-modal-title">Editar cliente</h2>{error && <div className="alert error">{error}</div>}{!data ? <div className="empty">Cargando cliente…</div> : <><label>Nombre completo<input required value={data.nombre_completo || ""} onChange={(e) => set("nombre_completo", e.target.value)} /></label><label>Cédula<input disabled value={data.cedula || ""} /></label><label>Fecha de nacimiento<input type="date" value={data.fecha_nacimiento ? String(data.fecha_nacimiento).slice(0, 10) : ""} onChange={(e) => set("fecha_nacimiento", e.target.value)} /></label><label>Dirección<input required value={data.direccion || ""} onChange={(e) => set("direccion", e.target.value)} /></label><label>Teléfono 1 / WhatsApp<input required value={data.telefono1 || ""} onChange={(e) => set("telefono1", e.target.value)} /></label><label>Email<input type="email" value={data.email || ""} onChange={(e) => set("email", e.target.value)} /></label><label>RUC<input value={data.ruc || ""} onChange={(e) => set("ruc", e.target.value)} /></label><label>Profesión<input value={data.profesion || ""} onChange={(e) => set("profesion", e.target.value)} /></label><label>Dedicación<input value={data.dedicacion || ""} onChange={(e) => set("dedicacion", e.target.value)} /></label><label>Ingreso promedio<input inputMode="decimal" value={data.ingreso_promedio || ""} onChange={(e) => set("ingreso_promedio", e.target.value.replace(/[^0-9.]/g, ""))} /></label><label>Interés sugerido (%)<input inputMode="numeric" value={String(data.tasa_interes_sugerida || "").split(".")[0]} onChange={(e) => set("tasa_interes_sugerida", e.target.value.replace(/\D/g, ""))} /></label></>}<div className="modal-actions"><button type="button" className="button secondary" onClick={onCancel} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving || !data}>{saving ? "Guardando…" : "Guardar cambios"}</button></div></form></div>;
}

function PublicClientForm({ token }: { token: string }) {
  const [meta, setMeta] = useState<any>();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [preparingImages, setPreparingImages] = useState(false);
  const [data, setData] = useState<any>({
    nombre_completo: "", cedula: "", fecha_nacimiento: "", direccion: "", telefono1: "",
    ruc: "", telefono2: "", email: "", dedicacion: "", ingreso_promedio: "0",
    direccion_trabajo: "", nombre_empresa: "", telefono_empresa: "", ruc_empresa: "", observacion: "",
    latitud: null, longitud: null, fecha_ubicacion: null,
    referencias: [{ nombre_completo: "", telefono: "", direccion: "", fk_idtipo_referencia: "" }],
  });
  useEffect(() => {
    api<any>(`/api/public/clientes/${encodeURIComponent(token)}`).then(setMeta).catch((e) => setError(e.message));
  }, [token]);
  const set = (key: string, value: any) => setData((current: any) => ({ ...current, [key]: value }));
  const setRef = (key: string, value: any) => setData((current: any) => ({ ...current, referencias: [{ ...current.referencias[0], [key]: value }] }));
  function gps() {
    if (!navigator.geolocation) return setError("Este dispositivo no permite obtener ubicación GPS");
    navigator.geolocation.getCurrentPosition(
      (position) => setData((current: any) => ({ ...current, latitud: position.coords.latitude, longitud: position.coords.longitude, fecha_ubicacion: new Date().toISOString() })),
      (e) => setError(e.message || "No se pudo obtener la ubicación GPS"),
      { enableHighAccuracy: true },
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setError("");
    if (data.latitud == null || data.longitud == null) return setError("Debe capturar la ubicación GPS");
    setBusy(true);
    setPreparingImages(true);
    try {
      const [optimizedFront, optimizedBack] = await Promise.all([front ? optimizeCedulaImage(front) : null, back ? optimizeCedulaImage(back) : null]);
      const form = new FormData(); form.append("datos", JSON.stringify(data));
      if (optimizedFront) form.append("cedula_frente", optimizedFront);
      if (optimizedBack) form.append("cedula_atras", optimizedBack);
      await api(`/api/public/clientes/${encodeURIComponent(token)}`, { method: "POST", body: form });
      setSuccess(true);
    } catch (e) { setError((e as Error).message); } finally { setPreparingImages(false); setBusy(false); }
  }
  if (success) return <main className="public-page"><section className="public-card panel"><p className="eyebrow">NM CREDITOS</p><h1>Datos recibidos</h1><p className="muted">Tus datos y documentos fueron enviados correctamente. Este enlace ya no puede volver a utilizarse.</p></section></main>;
  if (error && !meta) return <main className="public-page"><section className="public-card panel"><h1>Enlace no disponible</h1><p className="alert error">{error}</p></section></main>;
  if (!meta) return <main className="public-page"><section className="public-card panel empty">Cargando formulario…</section></main>;
  return <main className="public-page"><section className="public-card panel"><p className="eyebrow">NM CREDITOS</p><h1>Cargar datos del cliente</h1><p className="muted">Completá el formulario y elegí fotos claras de ambos lados de tu cédula desde la galería o la cámara.</p><form className="form-grid public-form" onSubmit={submit}>
    <label>Nombre completo<input required value={data.nombre_completo} onChange={(e) => set("nombre_completo", e.target.value)} /></label>
    <label>Cédula<input required value={data.cedula} onChange={(e) => set("cedula", e.target.value)} /></label>
    <label>Fecha de nacimiento<input required type="date" value={data.fecha_nacimiento} onChange={(e) => set("fecha_nacimiento", e.target.value)} /></label>
    <label>Dirección<input required value={data.direccion} onChange={(e) => set("direccion", e.target.value)} /></label>
    <label>Teléfono 1 / WhatsApp<input required value={data.telefono1} onChange={(e) => set("telefono1", e.target.value)} /></label>
    <button type="button" className="button secondary full" onClick={gps}>{data.latitud != null ? "Ubicación capturada · Actualizar GPS" : "Capturar ubicación GPS"}</button>
    {data.latitud != null && <p className="gps-ok full">Ubicación capturada: {Number(data.latitud).toFixed(6)}, {Number(data.longitud).toFixed(6)}</p>}
    <button type="button" className="button secondary full additional-toggle" onClick={() => setAdditionalOpen((open) => !open)}>{additionalOpen ? "Ocultar datos adicional" : "Datos adicional"}</button>
    {additionalOpen && <div className="full additional-fields"><label>RUC<input value={data.ruc} onChange={(e) => set("ruc", e.target.value)} /></label><label>Teléfono 2<input value={data.telefono2} onChange={(e) => set("telefono2", e.target.value)} /></label><label>Email<input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} /></label><label>Dedicación<input value={data.dedicacion} onChange={(e) => set("dedicacion", e.target.value)} /></label><label>Ingreso promedio<input inputMode="decimal" value={data.ingreso_promedio} onChange={(e) => set("ingreso_promedio", e.target.value.replace(/[^0-9.]/g, ""))} /></label><fieldset className="full employer-box"><legend>Datos de la empresa</legend><div className="form-grid nested-grid"><label>Dirección de trabajo<input value={data.direccion_trabajo} onChange={(e) => set("direccion_trabajo", e.target.value)} /></label><label>Nombre de empresa<input value={data.nombre_empresa} onChange={(e) => set("nombre_empresa", e.target.value)} /></label><label>Teléfono laboral<input value={data.telefono_empresa} onChange={(e) => set("telefono_empresa", e.target.value)} /></label><label>RUC laboral<input value={data.ruc_empresa} onChange={(e) => set("ruc_empresa", e.target.value)} /></label></div></fieldset><label className="full">Observación<textarea value={data.observacion} onChange={(e) => set("observacion", e.target.value)} /></label></div>}
    <section className="full panel reference"><strong>Referencia 1</strong><input required placeholder="Nombre completo" value={data.referencias[0].nombre_completo} onChange={(e) => setRef("nombre_completo", e.target.value)} /><input required placeholder="Teléfono" value={data.referencias[0].telefono} onChange={(e) => setRef("telefono", e.target.value)} /><input placeholder="Dirección" value={data.referencias[0].direccion} onChange={(e) => setRef("direccion", e.target.value)} /><select required value={data.referencias[0].fk_idtipo_referencia} onChange={(e) => setRef("fk_idtipo_referencia", Number(e.target.value))}><option value="">Tipo de referencia</option>{meta.tipos_referencia?.map((type: any) => <option key={type.idtipo_referencia} value={type.idtipo_referencia}>{type.nombre}</option>)}</select></section>
    <section className="full panel cedula-panel"><h2>Fotos de cédula <span className="muted">(opcional)</span></h2><p className="muted">Podés elegir fotos desde la galería o la cámara. Las imágenes se reducen automáticamente para evitar problemas de memoria y conexión.</p><div className="cedula-sides"><label className="cedula-side">Frente de cédula<input type="file" accept="image/jpeg,image/png" onChange={(e) => setFront(e.target.files?.[0] || null)} />{front && <small className="file-name">{front.name}</small>}</label><label className="cedula-side">Reverso de cédula<input type="file" accept="image/jpeg,image/png" onChange={(e) => setBack(e.target.files?.[0] || null)} />{back && <small className="file-name">{back.name}</small>}</label></div></section>
    {error && <div className="alert error full">{error}</div>}<button className="button primary full" disabled={busy}>{busy ? (preparingImages ? "Preparando fotos…" : "Enviando…") : "Enviar datos"}</button>
  </form></section></main>;
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
    ingreso_promedio: "0",
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
  const [brokers, setBrokers] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<any | null>(null);
  const createLock = useRef(false);
  const [interestMode, setInterestMode] = useState<"PORCENTAJE" | "MONTO">("PORCENTAJE");
  const [data, setData] = useState<any>({
    fk_idcliente: "",
    fk_idcorredor: "",
    fecha_inicio: new Date().toISOString().slice(0, 10),
    monto_capital: "",
    porcentaje_interes: "10",
    monto_interes: "",
    cantidad_cuotas: 12,
    frecuencia: "MENSUAL",
    dias_semana: [1],
    dias_mes: [10, 25],
    fk_idproducto: "",
    fk_idforma_pago: "",
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
          monto_interes:
            d.monto_capital && r[0].tasa_interes_sugerida != null
              ? roundedAmount(Number(d.monto_capital) * Number(r[0].tasa_interes_sugerida) / 100)
              : d.monto_interes,
        }));
    });
    api<any[]>("/api/productos").then((r) => {
      setProducts(r);
      if (r[0])
        setData((d: any) => ({ ...d, fk_idproducto: String(r[0].idproducto) }));
    });
    api<any[]>("/api/corredores/activos").then(setBrokers).catch(() => setBrokers([]));
    api<any[]>("/api/formas-pago").then((r) => {
      setPaymentMethods(r);
      const defaultMethod = r.find((item) => item.codigo === "EFECTIVO") || r[0];
      if (defaultMethod) setData((d: any) => ({ ...d, fk_idforma_pago: String(defaultMethod.idforma_pago) }));
    });
  }, []);
  const total = useMemo(() => Number(data.monto_capital || 0) + Number(data.monto_interes || 0), [data]);
  const installmentsPreview = useMemo(
    () => calculatePreviewInstallments(data.monto_capital, data.monto_interes, data.cantidad_cuotas),
    [data.monto_capital, data.monto_interes, data.cantidad_cuotas],
  );
  function updateCapital(value: string) {
    setData((d: any) => {
      const capital = Number(value || 0);
      if (interestMode === "MONTO") {
        return {
          ...d,
          monto_capital: value,
          porcentaje_interes: capital > 0
            ? roundedPercentage(Number(d.monto_interes || 0) / capital * 100)
            : "",
        };
      }
      return {
        ...d,
        monto_capital: value,
        monto_interes: value && d.porcentaje_interes !== ""
          ? roundedAmount(capital * Number(d.porcentaje_interes || 0) / 100)
          : "",
      };
    });
  }
  function updatePercentage(value: string) {
    const normalized = normalizeDecimalInput(value);
    setInterestMode("PORCENTAJE");
    setData((d: any) => ({
      ...d,
      porcentaje_interes: normalized,
      monto_interes: d.monto_capital && normalized !== ""
        ? roundedAmount(Number(d.monto_capital) * Number(normalized) / 100)
        : "",
    }));
  }
  function updateInterestAmount(value: string) {
    const normalized = normalizeDecimalInput(value, 2);
    setInterestMode("MONTO");
    setData((d: any) => ({
      ...d,
      monto_interes: normalized,
      porcentaje_interes: d.monto_capital && normalized !== ""
        ? roundedPercentage(Number(normalized) / Number(d.monto_capital) * 100)
        : "",
    }));
  }
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
      const diasSemana = value === "DIARIA"
        ? [1, 2, 3, 4, 5]
        : value === "SEMANAL"
          ? [5]
          : d.dias_semana || [];
      if (value === "QUINCENAL") {
        dias =
          dias.length >= 2
            ? dias.slice(0, 2)
            : [dias[0] || 10, dias[0] === 25 ? 10 : 25];
      } else if (value === "MENSUAL") {
        dias = [dias[0] || 10];
      }
      return { ...d, frecuencia: value, dias_mes: dias, dias_semana: diasSemana };
    });
  }
  function buildOperationBody() {
    return {
      ...data,
      modo_interes: interestMode,
      monto_interes_objetivo: interestMode === "MONTO" ? data.monto_interes : undefined,
      fk_idcliente: Number(data.fk_idcliente),
      fk_idforma_pago: Number(data.fk_idforma_pago),
      fk_idcorredor: data.fk_idcorredor ? Number(data.fk_idcorredor) : undefined,
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
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (confirmationOpen || creating) return;
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
    setError("");
    setPendingOperation(buildOperationBody());
    setConfirmationOpen(true);
  }
  async function confirmCreate() {
    if (!pendingOperation || creating || createLock.current) return;
    createLock.current = true;
    setCreating(true);
    setError("");
    try {
      const r = await api<any>(
        `/api/operaciones/${sale ? "ventas" : "prestamos"}`,
        { method: "POST", body: JSON.stringify(pendingOperation) },
      );
      nav(`/operaciones/${r.idoperacion_financiera}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      createLock.current = false;
      setCreating(false);
    }
  }
  const summaryClient = clients.find((client) => String(client.idcliente) === String(pendingOperation?.fk_idcliente));
  const summaryPayment = paymentMethods.find((method) => String(method.idforma_pago) === String(pendingOperation?.fk_idforma_pago));
  const summaryProduct = products.find((product) => String(product.idproducto) === String(pendingOperation?.fk_idproducto));
  const summaryWeekdays = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const summaryDays = pendingOperation?.frecuencia === "DIARIA"
    ? (pendingOperation.dias_semana || []).map((day: number) => summaryWeekdays[day]).join(", ")
    : pendingOperation?.frecuencia === "SEMANAL"
      ? summaryWeekdays[pendingOperation.dias_semana?.[0] || 0]
      : pendingOperation?.frecuencia === "QUINCENAL"
        ? (pendingOperation.dias_mes || []).join(" y ")
        : pendingOperation?.dias_mes?.[0];
  const frequencyLabel = pendingOperation?.frecuencia === "DIARIA" ? "Diaria" : pendingOperation?.frecuencia === "SEMANAL" ? "Semanal" : pendingOperation?.frecuencia === "QUINCENAL" ? "Quincenal" : "Mensual";
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
                  monto_interes:
                    client?.tasa_interes_sugerida != null && data.monto_capital
                      ? roundedAmount(Number(data.monto_capital) * Number(client.tasa_interes_sugerida) / 100)
                      : data.monto_interes,
                });
                setInterestMode("PORCENTAJE");
              }}
            >
              {clients.map((c) => (
                <option key={c.idcliente} value={c.idcliente}>
                  {c.nombre_completo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Corredor (opcional)
            <select value={data.fk_idcorredor} onChange={(e) => setData({ ...data, fk_idcorredor: e.target.value })}>
              <option value="">Sin corredor</option>
              {brokers.map((broker) => <option key={broker.idcorredor} value={broker.idcorredor}>{broker.nombre_completo} · {broker.porcentaje_comision}%</option>)}
            </select>
          </label>
          <label>
            Forma de pago
            <select required value={data.fk_idforma_pago} onChange={(e) => setData({ ...data, fk_idforma_pago: e.target.value })}>
              <option value="">Seleccione una forma de pago</option>
              {paymentMethods.map((method) => <option key={method.idforma_pago} value={method.idforma_pago}>{method.nombre}</option>)}
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
              inputMode="decimal"
              value={data.monto_capital}
              onChange={(e) => updateCapital(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label>
            Interés (%)
            <input
              required
              type="text"
              inputMode="decimal"
              min="0"
              value={data.porcentaje_interes}
              onChange={(e) => updatePercentage(e.target.value)}
            />
          </label>
          <label>
            Interés a cobrar
            <input
              required
              type="text"
              inputMode="decimal"
              value={data.monto_interes}
              onChange={(e) => updateInterestAmount(e.target.value)}
            />
            <small className="field-help">Podés ingresar el monto o el porcentaje; se calcula el otro valor.</small>
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
        <section className="installments-preview" aria-label="Vista previa de cuotas">
          <div className="installments-preview-head">
            <div>
              <h2>Vista previa de cuotas</h2>
              <p>Importes calculados en guaraníes. Se ajusta la última cuota por redondeo.</p>
            </div>
            <span>{installmentsPreview.length} cuotas</span>
          </div>
          <div className="installments-preview-table" role="table" aria-label="Detalle de cuotas">
            <div className="installments-preview-row installments-preview-header" role="row">
              <span role="columnheader">Cuota</span>
              <span role="columnheader">Interés</span>
              <span role="columnheader">Capital</span>
              <span role="columnheader">Total</span>
            </div>
            {installmentsPreview.map((cuota) => (
              <div className="installments-preview-row" role="row" key={cuota.numero}>
                <span role="cell">{cuota.numero}/{installmentsPreview.length}</span>
                <strong role="cell">{money(cuota.montoInteres)}</strong>
                <strong role="cell">{money(cuota.montoCapital)}</strong>
                <strong role="cell">{money(cuota.montoTotal)}</strong>
              </div>
            ))}
          </div>
        </section>
        {error && <div className="alert error">{error}</div>}
        <button className="button primary" disabled={confirmationOpen || creating}>
          Crear {sale ? "venta" : "préstamo"} y generar cuotas
        </button>
      </form>
      {confirmationOpen && pendingOperation && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="operation-confirm-title"><div className="confirm-modal operation-confirm-modal"><p className="eyebrow">CONFIRMAR {sale ? "VENTA FINANCIADA" : "PRÉSTAMO"}</p><h2 id="operation-confirm-title">Revisá los datos antes de crear</h2><div className="operation-summary"><div><span>Cliente</span><strong>{summaryClient?.nombre_completo || "—"}</strong></div><div><span>Forma de pago</span><strong>{summaryPayment?.nombre || "—"}</strong></div>{sale && <div><span>Producto</span><strong>{summaryProduct?.nombre || "—"} · {pendingOperation.cantidad} unidad(es)</strong></div>}<div><span>Fecha de inicio</span><strong>{shortDate(pendingOperation.fecha_inicio)}</strong></div><div><span>Capital solicitado</span><strong>{money(pendingOperation.monto_capital)}</strong></div><div><span>Interés</span><strong>{money(pendingOperation.monto_interes)} ({pendingOperation.porcentaje_interes}%)</strong></div><div><span>Total a cobrar</span><strong>{money(Number(pendingOperation.monto_capital || 0) + Number(pendingOperation.monto_interes || 0))}</strong></div><div><span>Cuotas</span><strong>{pendingOperation.cantidad_cuotas}</strong></div><div><span>Frecuencia</span><strong>{frequencyLabel}{summaryDays ? ` · ${summaryDays}` : ""}</strong></div></div>{error && <div className="alert error">{error}</div>}<div className="modal-actions"><button type="button" className="button secondary" onClick={() => { if (!creating) { setConfirmationOpen(false); setPendingOperation(null); setError(""); } }} disabled={creating}>Cancelar</button><button type="button" className="button primary" onClick={confirmCreate} disabled={creating}>{creating ? "Creando…" : "Aceptar y crear"}</button></div></div></div>}
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
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setModalOpen(false);
  }
  function openNew() {
    setForm({ codigo: "", nombre: "", precio_referencia: "" });
    setEditing(null);
    setModalOpen(true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
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
      await load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }
  function edit(p: any) {
    setEditing(p.idproducto);
    setForm({
      codigo: p.codigo,
      nombre: p.nombre,
      precio_referencia: String(p.precio_referencia),
    });
    setModalOpen(true);
  }
  async function toggleActive(p: any) {
    try {
      await api(`/api/productos/${p.idproducto}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ activo: !p.activo }),
      });
      setNotice({
        type: "ok",
        text: p.activo ? "Producto desactivado." : "Producto activado.",
      });
      await load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  return (
    <Page
      title="Producto"
      subtitle="Catálogo de productos para ventas financiadas"
      action={
        <button className="button primary" onClick={openNew}>
          Nuevo producto
        </button>
      }
    >
      <NoticeBar notice={notice} />
      <section className="panel products-panel">
        <div className="security-table products-table">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Precio de referencia</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.idproducto} className={!p.activo ? "product-inactive" : undefined}>
                  <td>{p.codigo}</td>
                  <td><strong>{p.nombre}</strong></td>
                  <td>{money(p.precio_referencia)}</td>
                  <td>
                    <label className="product-active-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(p.activo)}
                        onChange={() => toggleActive(p)}
                        aria-label={`${p.activo ? "Desactivar" : "Activar"} ${p.nombre}`}
                      />
                      <span>{p.activo ? "Activo" : "Inactivo"}</span>
                    </label>
                  </td>
                  <td>
                    <button
                      className="button tiny secondary"
                      onClick={() => edit(p)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && <div className="empty">No hay productos registrados.</div>}
        </div>
      </section>
      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
          <form className="confirm-modal product-modal stack" onSubmit={save}>
            <p className="eyebrow">CATÁLOGO DE PRODUCTOS</p>
            <h2 id="product-modal-title">{editing ? "Editar producto" : "Nuevo producto"}</h2>
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
                onChange={(e) => setForm({ ...form, precio_referencia: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="button secondary" onClick={reset} disabled={saving}>
                Cancelar
              </button>
              <button className="button primary" disabled={saving}>
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar producto"}
              </button>
            </div>
          </form>
        </div>
      )}
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
  const [date, setDate] = useState(localDateInput());
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
                  <th>Forma de pago</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.movimientos.map((m: any) => (
                  <tr key={m.idmovimiento_caja} className={m.gasto_estado === "ANULADO" ? "cancelled-row" : undefined}>
                    <td>{String(m.fecha_movimiento).slice(11, 16)}</td>
                    <td className={m.gasto_estado === "ANULADO" ? "status-inactive" : undefined}>{m.concepto}</td>
                    <td className={m.gasto_estado === "ANULADO" ? "status-inactive" : undefined}>{m.forma_pago || "—"}</td>
                    <td>
                      <span className={`badge ${m.tipo.toLowerCase()}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className={m.gasto_estado === "ANULADO" ? "status-inactive" : undefined}>{money(m.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel table-wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">RESUMEN</p>
                <h2>Resumen por forma de pago</h2>
              </div>
            </div>
            {data.resumen_por_forma_pago?.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Forma de pago</th>
                    <th>Ingresos</th>
                    <th>Egresos</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.resumen_por_forma_pago.map((summary: any) => (
                    <tr key={summary.forma_pago}>
                      <td><strong>{summary.forma_pago}</strong></td>
                      <td className="status-active">{money(summary.ingresos)}</td>
                      <td className="status-inactive">{money(summary.egresos)}</td>
                      <td className={Number(summary.saldo) >= 0 ? "status-active" : "status-inactive"}>{money(summary.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty">No hay movimientos para la fecha seleccionada.</div>}
          </section>
        </>
      )}
    </Page>
  );
}

type ExpenseAnalysisData = {
  periodo: { from: string; to: string };
  total: string;
  cantidad: number;
  por_dia: { fecha: string; monto: string; cantidad: number }[];
  por_forma_pago: { idforma_pago: number; nombre: string; monto: string; cantidad: number; porcentaje: string }[];
  tipos_frecuentes: { idgasto_tipo: number; nombre: string; cantidad: number; monto: string }[];
};

function ExpenseAnalysis() {
  const initialRange = useMemo(defaultDashboardRange, []);
  const [filters, setFilters] = useState(initialRange);
  const [applied, setApplied] = useState(initialRange);
  const [data, setData] = useState<ExpenseAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    api<ExpenseAnalysisData>(`/api/gastos/analisis?desde=${applied.desde}&hasta=${applied.hasta}`)
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError((reason as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied]);

  function applyRange(event: FormEvent) {
    event.preventDefault();
    if (!filters.desde || !filters.hasta) return setError("Seleccione la fecha de inicio y fin");
    if (filters.desde > filters.hasta) return setError("La fecha de inicio no puede ser posterior a la fecha final");
    setError("");
    setApplied({ ...filters });
  }

  const hasExpenses = (data?.cantidad ?? 0) > 0;
  const paymentData = (data?.por_forma_pago ?? []).map((row) => ({ ...row, valor: Number(row.monto) }));

  return <Page title="Análisis de gastos" subtitle="Evolución y distribución de los egresos registrados">
    <form className="panel analytics-filter" onSubmit={applyRange} noValidate>
      <label>Fecha inicio<input type="date" value={filters.desde} max={filters.hasta} onChange={(event) => setFilters({ ...filters, desde: event.target.value })} /></label>
      <label>Fecha fin<input type="date" value={filters.hasta} min={filters.desde} onChange={(event) => setFilters({ ...filters, hasta: event.target.value })} /></label>
      <button className="button primary" disabled={loading}>{loading ? "Actualizando…" : "Actualizar análisis"}</button>
      <span>Período inclusivo · Gastos emitidos</span>
    </form>
    {error && <div className="alert error">{error}</div>}
    {loading && !data ? <Loading /> : data && <>
      <section className="metrics-grid three analytics-metrics">
        <Metric label="Total de gastos" value={money(data.total)} tone="red" />
        <Metric label="Cantidad de gastos" value={String(data.cantidad)} />
        <Metric label="Promedio por gasto" value={money(data.cantidad ? Number(data.total) / data.cantidad : 0)} />
      </section>
      <section className="analytics-grid">
        <article className="panel chart-panel chart-wide">
          <div className="chart-heading"><div><h2>Gastos por día</h2><p>Monto registrado en cada fecha del período.</p></div></div>
          {hasExpenses ? <div className="chart-body" role="img" aria-label="Gráfico diario de gastos">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.por_dia} margin={{ top: 10, right: 18, left: 5, bottom: 0 }}>
                <CartesianGrid stroke="#29445a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="fecha" tickFormatter={chartDate} stroke="#8fa8bc" minTickGap={22} fontSize={10} />
                <YAxis tickFormatter={compactNumber} stroke="#8fa8bc" width={58} fontSize={10} />
                <Tooltip labelFormatter={(label: any) => chartDate(String(label))} formatter={(value: any, _name: any, item: any) => [`${money(value)} · ${item.payload.cantidad} gastos`, "Gastos"]} contentStyle={{ background: "#102536", border: "1px solid #34536a", borderRadius: 8 }} />
                <Bar dataKey="monto" fill="#ef5966" radius={[3, 3, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div> : <div className="chart-empty">No hay gastos emitidos en este período.</div>}
        </article>
        <article className="panel chart-panel">
          <div className="chart-heading"><div><h2>Por forma de pago</h2><p>Distribución del monto gastado.</p></div></div>
          {paymentData.length ? <div className="chart-body pie-body" role="img" aria-label="Gráfico de gastos por forma de pago">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={paymentData} dataKey="valor" nameKey="nombre" innerRadius="48%" outerRadius="76%" paddingAngle={2}>
                {paymentData.map((row, index) => <Cell key={row.idforma_pago} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
              </Pie><Tooltip formatter={(value: any, _name: any, item: any) => [`${money(value)} · ${item.payload.porcentaje}% · ${item.payload.cantidad} gastos`, item.payload.nombre]} contentStyle={{ background: "#102536", border: "1px solid #34536a", borderRadius: 8 }} /><Legend /></PieChart>
            </ResponsiveContainer>
          </div> : <div className="chart-empty">No hay formas de pago con gastos en este período.</div>}
          {!!paymentData.length && <div className="chart-legend-list">{paymentData.map((row, index) => <div key={row.idforma_pago}><i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><span>{row.nombre}</span><strong>{money(row.monto)} · {row.porcentaje}%</strong></div>)}</div>}
        </article>
        <article className="panel chart-panel">
          <div className="chart-heading"><div><h2>Tipos más frecuentes</h2><p>Ordenados por cantidad de gastos.</p></div></div>
          {data.tipos_frecuentes.length ? <div className="chart-body expense-types-chart" style={{ height: Math.max(250, data.tipos_frecuentes.length * 40) }} role="img" aria-label="Gráfico de tipos de gasto más frecuentes">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart layout="vertical" data={data.tipos_frecuentes} margin={{ top: 5, right: 22, left: 5, bottom: 0 }}>
                <CartesianGrid stroke="#29445a" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke="#8fa8bc" fontSize={10} />
                <YAxis type="category" dataKey="nombre" width={120} tickFormatter={(name: string) => name.length > 17 ? `${name.slice(0, 16)}…` : name} stroke="#8fa8bc" fontSize={10} />
                <Tooltip formatter={(value: any, _name: any, item: any) => [`${value} gastos · ${money(item.payload.monto)}`, item.payload.nombre]} contentStyle={{ background: "#102536", border: "1px solid #34536a", borderRadius: 8 }} />
                <Bar dataKey="cantidad" fill="#4f91c7" radius={[0, 3, 3, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div> : <div className="chart-empty">No hay tipos de gasto registrados en este período.</div>}
          {!!data.tipos_frecuentes.length && <div className="chart-legend-list expense-type-list">{data.tipos_frecuentes.map((row) => <div key={row.idgasto_tipo}><span>{row.nombre}</span><strong>{row.cantidad} gastos · {money(row.monto)}</strong></div>)}</div>}
        </article>
      </section>
    </>}
  </Page>;
}

function Expenses() {
  const [types, setTypes] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [annulTarget, setAnnulTarget] = useState<any | null>(null);
  const [annulReason, setAnnulReason] = useState("");
  const [form, setForm] = useState<any>({
    fk_idgasto_tipo: "",
    fk_idforma_pago: "",
    fecha: localDateInput(),
    concepto: "",
    monto: "",
    observacion: "",
  });
  const load = () =>
    Promise.all([
      api<any[]>("/api/gasto-tipos"),
      api<any[]>("/api/gastos"),
      api<any[]>("/api/formas-pago"),
    ]).then(([t, r, methods]) => {
      setTypes(t);
      setRows(r);
      setPaymentMethods(methods);
      const defaultMethod = methods.find((item: any) => item.codigo === "EFECTIVO") || methods[0];
      if (t[0])
        setForm((f: any) => ({
          ...f,
          fk_idgasto_tipo: String(t[0].idgasto_tipo),
          fk_idforma_pago: defaultMethod ? String(defaultMethod.idforma_pago) : f.fk_idforma_pago,
        }));
    });
  useEffect(() => {
    load();
  }, []);
  function openNew() {
    const defaultMethod = paymentMethods.find((item) => item.codigo === "EFECTIVO") || paymentMethods[0];
    setForm({ fk_idgasto_tipo: types[0] ? String(types[0].idgasto_tipo) : "", fk_idforma_pago: defaultMethod ? String(defaultMethod.idforma_pago) : "", fecha: localDateInput(), concepto: "", monto: "", observacion: "" });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); }
  async function add(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/gastos", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          fk_idgasto_tipo: Number(form.fk_idgasto_tipo),
          fk_idforma_pago: Number(form.fk_idforma_pago),
        }),
      });
      setNotice({ type: "ok", text: "Gasto registrado en caja." });
      closeModal();
      await load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    } finally { setSaving(false); }
  }
  async function annul() {
    if (!annulTarget || !annulReason.trim()) return;
    setSaving(true);
    try {
      await api(`/api/gastos/${annulTarget.idgasto}/anular`, { method: "PATCH", body: JSON.stringify({ motivo_anulacion: annulReason.trim() }) });
      setNotice({ type: "ok", text: "Gasto anulado correctamente." });
      setAnnulTarget(null);
      setAnnulReason("");
      await load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    } finally { setSaving(false); }
  }
  return (
    <Page title="Gastos" subtitle="Registro de egresos relacionados con caja" action={<button className="button primary" onClick={openNew}>Nuevo gasto</button>}>
      <NoticeBar notice={notice} />
      <section className="panel products-panel">
        <div className="security-table products-table">
          <table>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Forma de pago</th><th>Concepto</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.idgasto} className={g.estado === "ANULADO" ? "cancelled-row" : undefined}>
                  <td>{shortDate(g.fecha)}</td>
                  <td>{g.tipo}</td>
                  <td>{g.forma_pago || "—"}</td>
                  <td><strong className={g.estado === "ANULADO" ? "status-inactive" : undefined}>{g.concepto}</strong>{g.estado === "ANULADO" && <small className="status-inactive">{g.motivo_anulacion || "Sin motivo"}</small>}</td>
                  <td className={g.estado === "ANULADO" ? "status-inactive" : undefined}>{money(g.monto)}</td>
                  <td className={g.estado === "ANULADO" ? "status-inactive" : "status-active"}>{g.estado}</td>
                  <td>{g.estado === "EMITIDO" && <button type="button" className="button tiny secondary status-inactive" onClick={() => { setAnnulTarget(g); setAnnulReason(""); }}>ANULAR</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="empty">No hay gastos registrados.</div>}
        </div>
      </section>
      {modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title"><form className="confirm-modal product-modal stack" onSubmit={add}><p className="eyebrow">REGISTRO DE GASTOS</p><h2 id="expense-modal-title">Nuevo gasto</h2><label>Tipo<select required value={form.fk_idgasto_tipo} onChange={(e) => setForm({ ...form, fk_idgasto_tipo: e.target.value })}>{types.map((t) => <option key={t.idgasto_tipo} value={t.idgasto_tipo}>{t.nombre}</option>)}</select></label><label>Forma de pago<select required value={form.fk_idforma_pago} onChange={(e) => setForm({ ...form, fk_idforma_pago: e.target.value })}><option value="">Seleccione una forma de pago</option>{paymentMethods.map((method) => <option key={method.idforma_pago} value={method.idforma_pago}>{method.nombre}</option>)}</select></label><label>Fecha<input required type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label><label>Concepto<input required value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} /></label><label>Monto<input required min="0.01" step="0.01" inputMode="decimal" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></label><label>Observación<textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={closeModal} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : "Registrar egreso"}</button></div></form></div>}
      {annulTarget && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="annul-expense-title"><form className="confirm-modal product-modal stack" onSubmit={(e) => { e.preventDefault(); annul(); }}><p className="eyebrow">ANULACIÓN DE GASTO</p><h2 id="annul-expense-title">¿Está seguro de anular este gasto?</h2><p className="muted">El gasto y su movimiento de caja pasarán a monto cero, conservando el historial.</p><label>Motivo de anulación<textarea required autoFocus value={annulReason} onChange={(e) => setAnnulReason(e.target.value)} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => { setAnnulTarget(null); setAnnulReason(""); }} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving || !annulReason.trim()}>{saving ? "Anulando…" : "Aceptar"}</button></div></form></div>}
    </Page>
  );
}

function ExpenseTypes() {
  const [types, setTypes] = useState<any[]>([]);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const load = () => api<any[]>("/api/gasto-tipos?todos=1").then(setTypes).catch((e) => setNotice({ type: "error", text: (e as Error).message }));
  useEffect(() => { load(); }, []);
  function openNew() { setEditingId(null); setForm({ nombre: "", descripcion: "" }); setModalOpen(true); }
  function edit(type: any) { setEditingId(type.idgasto_tipo); setForm({ nombre: type.nombre, descripcion: type.descripcion || "" }); setModalOpen(true); }
  function reset() { setEditingId(null); setForm({ nombre: "", descripcion: "" }); setModalOpen(false); }
  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api(`/api/gasto-tipos/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
      else await api("/api/gasto-tipos", { method: "POST", body: JSON.stringify(form) });
      setNotice({ type: "ok", text: editingId ? "Tipo de gasto actualizado." : "Tipo de gasto creado." });
      reset();
      await load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    } finally { setSaving(false); }
  }
  async function toggleActive(type: any) {
    try {
      await api(`/api/gasto-tipos/${type.idgasto_tipo}`, { method: "PATCH", body: JSON.stringify({ activo: !type.activo }) });
      setNotice({ type: "ok", text: type.activo ? "Tipo de gasto desactivado." : "Tipo de gasto activado." });
      await load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  return (
    <Page title="Gasto tipo" subtitle="Categorías para clasificar los egresos" action={<button className="button primary" onClick={openNew}>Nuevo tipo de gasto</button>}>
      <NoticeBar notice={notice} />
      <section className="panel products-panel"><div className="security-table products-table"><table><thead><tr><th>Nombre</th><th>Descripción</th><th>Activo</th><th>Acciones</th></tr></thead><tbody>{types.map((type) => <tr key={type.idgasto_tipo} className={!type.activo ? "product-inactive" : undefined}><td><strong>{type.nombre}</strong></td><td>{type.descripcion || "Sin descripción"}</td><td><label className="product-active-toggle"><input type="checkbox" checked={Boolean(type.activo)} onChange={() => toggleActive(type)} aria-label={`${type.activo ? "Desactivar" : "Activar"} ${type.nombre}`} /><span>{type.activo ? "Activo" : "Inactivo"}</span></label></td><td><button className="button tiny secondary" onClick={() => edit(type)}>Editar</button></td></tr>)}</tbody></table>{!types.length && <div className="empty">No hay tipos de gasto registrados.</div>}</div></section>
      {modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="expense-type-modal-title"><form className="confirm-modal product-modal stack" onSubmit={save}><p className="eyebrow">CATÁLOGO DE GASTOS</p><h2 id="expense-type-modal-title">{editingId ? "Editar tipo de gasto" : "Nuevo tipo de gasto"}</h2><label>Nombre<input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label><label>Descripción<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={reset} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear tipo"}</button></div></form></div>}
    </Page>
  );
}

function PaymentMethods() {
  type PaymentMethod = { idforma_pago: number; codigo: string; nombre: string; requiere_comprobante: boolean; activo: boolean };
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [form, setForm] = useState({ codigo: "", nombre: "", requiere_comprobante: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const load = () => api<PaymentMethod[]>("/api/formas-pago?todos=1").then(setMethods).catch((e) => setNotice({ type: "error", text: (e as Error).message }));
  useEffect(() => { load(); }, []);
  function closeModal() { setModalOpen(false); setEditingId(null); }
  function openNew() { setEditingId(null); setForm({ codigo: "", nombre: "", requiere_comprobante: false }); setModalOpen(true); }
  function edit(method: PaymentMethod) { setEditingId(method.idforma_pago); setForm({ codigo: method.codigo, nombre: method.nombre, requiere_comprobante: method.requiere_comprobante }); setModalOpen(true); }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const url = editingId === null ? "/api/formas-pago" : `/api/formas-pago/${editingId}`;
      await api(url, { method: editingId === null ? "POST" : "PATCH", body: JSON.stringify({ ...form, codigo: form.codigo.trim(), nombre: form.nombre.trim() }) });
      setNotice({ type: "ok", text: editingId === null ? "Forma de pago creada." : "Forma de pago actualizada." });
      closeModal();
      await load();
    } catch (e) { setNotice({ type: "error", text: (e as Error).message }); }
    finally { setSaving(false); }
  }
  async function toggleActive(method: PaymentMethod) {
    try {
      await api(`/api/formas-pago/${method.idforma_pago}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !method.activo }) });
      setNotice({ type: "ok", text: method.activo ? "Forma de pago desactivada." : "Forma de pago activada." });
      await load();
    } catch (e) { setNotice({ type: "error", text: (e as Error).message }); }
  }
  return <Page title="Formas de pago" subtitle="Medios disponibles para registrar cobros" action={<button type="button" className="button primary" onClick={openNew}>Nueva forma de pago</button>}>
    <NoticeBar notice={notice} />
    <section className="panel products-panel"><div className="security-table products-table"><table><thead><tr><th>Código</th><th>Nombre</th><th>Requiere comprobante</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {methods.map((method) => <tr key={method.idforma_pago} className={!method.activo ? "product-inactive" : undefined}><td>{method.codigo}</td><td><strong>{method.nombre}</strong></td><td>{method.requiere_comprobante ? "Sí" : "No"}</td><td><label className="product-active-toggle"><input type="checkbox" checked={method.activo} onChange={() => toggleActive(method)} aria-label={`${method.activo ? "Desactivar" : "Activar"} ${method.nombre}`} /><span>{method.activo ? "Activo" : "Inactivo"}</span></label></td><td><button type="button" className="button tiny secondary" onClick={() => edit(method)}>Editar</button></td></tr>)}
    </tbody></table>{!methods.length && <div className="empty">No hay formas de pago registradas.</div>}</div></section>
    {modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="payment-method-modal-title"><form className="confirm-modal product-modal stack" onSubmit={save}><p className="eyebrow">CATÁLOGO DE FORMAS DE PAGO</p><h2 id="payment-method-modal-title">{editingId === null ? "Nueva forma de pago" : "Editar forma de pago"}</h2><label>Código<input required maxLength={30} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></label><label>Nombre<input required maxLength={100} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label><label className="product-active-toggle"><input type="checkbox" checked={form.requiere_comprobante} onChange={(e) => setForm({ ...form, requiere_comprobante: e.target.checked })} /><span>Requiere comprobante</span></label><div className="modal-actions"><button type="button" className="button secondary" onClick={closeModal} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : editingId === null ? "Crear forma de pago" : "Guardar cambios"}</button></div></form></div>}
  </Page>;
}

function SecurityTabs() {
  return <nav className="security-tabs" aria-label="Administración de seguridad">
    <NavLink to="/administracion/usuarios">Usuarios</NavLink>
    <NavLink to="/administracion/roles">Roles</NavLink>
    <NavLink to="/administracion/eventos">Eventos</NavLink>
  </nav>;
}

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ fk_idrol: "", login: "", password: "", nombres: "", apellidos: "", cedula: "", email: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const load = () => Promise.all([api<any[]>("/api/usuarios"), api<any[]>("/api/roles")]).then(([u, r]) => { setUsers(u); setRoles(r); if (!form.fk_idrol && r[0]) setForm((value: any) => ({ ...value, fk_idrol: String(r[0].idrol) })); });
  useEffect(() => { load().catch((e) => setNotice({ type: "error", text: e.message })); }, []);
  function editUser(user: any) { setEditingId(user.idusuario); setForm({ fk_idrol: String(user.fk_idrol), login: user.login, password: "", nombres: user.nombres, apellidos: user.apellidos, cedula: user.cedula, email: user.email || "" }); setModalOpen(true); }
  function openNew() { setEditingId(null); setForm({ fk_idrol: roles.find((role) => role.activo) ? String(roles.find((role) => role.activo).idrol) : "", login: "", password: "", nombres: "", apellidos: "", cedula: "", email: "" }); setModalOpen(true); }
  function reset() { setEditingId(null); setForm({ fk_idrol: roles.find((role) => role.activo) ? String(roles.find((role) => role.activo).idrol) : "", login: "", password: "", nombres: "", apellidos: "", cedula: "", email: "" }); setModalOpen(false); }
  async function save(e: FormEvent) { e.preventDefault(); setSaving(true); try { const payload = { ...form, fk_idrol: Number(form.fk_idrol) }; if (editingId) { delete payload.password; await api(`/api/usuarios/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) }); } else await api("/api/usuarios", { method: "POST", body: JSON.stringify(payload) }); setNotice({ type: "ok", text: editingId ? "Usuario actualizado." : "Usuario creado correctamente." }); reset(); await load(); } catch (e) { setNotice({ type: "error", text: (e as Error).message }); } finally { setSaving(false); } }
  async function toggle(user: any) { try { await api(`/api/usuarios/${user.idusuario}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !user.activo }) }); setNotice({ type: "ok", text: user.activo ? "Usuario desactivado." : "Usuario activado." }); await load(); } catch (e) { setNotice({ type: "error", text: (e as Error).message }); } }
  return <Page title="Usuarios" subtitle="Cuentas, roles y estado de acceso" action={<button className="button primary" onClick={openNew}>Nuevo usuario</button>}><SecurityTabs /><NoticeBar notice={notice} /><section className="panel products-panel"><div className="security-table products-table users-table"><table><thead><tr><th>Nombre</th><th>Login</th><th>Rol</th><th>Activo</th><th>Acciones</th></tr></thead><tbody>{users.map((u) => <tr key={u.idusuario} className={!u.activo ? "product-inactive" : undefined}><td><strong>{u.nombres} {u.apellidos}</strong><small>C.I. {u.cedula}</small></td><td>{u.login}</td><td>{u.rol}</td><td><label className="product-active-toggle"><input type="checkbox" checked={Boolean(u.activo)} onChange={() => toggle(u)} aria-label={`${u.activo ? "Desactivar" : "Activar"} ${u.nombres} ${u.apellidos}`} /><span>{u.activo ? "Activo" : "Inactivo"}</span></label></td><td><button className="button tiny secondary" onClick={() => editUser(u)}>Editar</button></td></tr>)}</tbody></table>{!users.length && <div className="empty">No hay usuarios registrados.</div>}</div></section>{modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="user-modal-title"><form className="confirm-modal product-modal stack" onSubmit={save}><p className="eyebrow">ADMINISTRACIÓN DE USUARIOS</p><h2 id="user-modal-title">{editingId ? "Editar usuario" : "Nuevo usuario"}</h2><label>Nombres<input required value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} /></label><label>Apellidos<input required value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} /></label><label>Login / email<input required type="email" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} /></label><label>Cédula<input required value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} /></label><label>Email opcional<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Contraseña<input required={!editingId} type="password" minLength={8} placeholder={editingId ? "Contraseña (sin cambios)" : "Contraseña"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><label>Rol<select required value={form.fk_idrol} onChange={(e) => setForm({ ...form, fk_idrol: e.target.value })}><option value="">Seleccione un rol</option>{roles.filter((r) => r.activo || String(r.idrol) === form.fk_idrol).map((r) => <option key={r.idrol} value={r.idrol}>{r.nombre}</option>)}</select></label><div className="modal-actions"><button type="button" className="button secondary" onClick={reset} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear usuario"}</button></div></form></div>}</Page>;
}

function AdminRoles() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const load = () => api<any[]>("/api/roles").then((r) => {
    setRoles(r);
    if (selectedId && !r.find((role) => role.idrol === selectedId)) {
      setSelectedId(null);
      setPermissions([]);
    }
  });
  useEffect(() => { load().catch((e) => setNotice({ type: "error", text: e.message })); }, []);
  async function selectRole(id: number) {
    setSelectedId(id);
    try {
      setPermissions(await api<any[]>(`/api/roles/${id}/permisos`));
    } catch (e) {
      setPermissions([]);
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  function openNewRole() {
    setEditingId(null);
    setForm({ nombre: "", descripcion: "" });
    setModalOpen(true);
  }
  function editRole(role: any) {
    setEditingId(role.idrol);
    setForm({ nombre: role.nombre, descripcion: role.descripcion || "" });
    setModalOpen(true);
  }
  function closeRoleModal() {
    setEditingId(null);
    setForm({ nombre: "", descripcion: "" });
    setModalOpen(false);
  }
  async function saveRole(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = editingId
        ? await api<any>(`/api/roles/${editingId}`, { method: "PATCH", body: JSON.stringify(form) })
        : await api<any>("/api/roles", { method: "POST", body: JSON.stringify(form) });
      const roleToKeep = editingId ? (selectedId ?? editingId) : saved.idrol;
      setNotice({ type: "ok", text: editingId ? "Rol actualizado." : "Rol creado." });
      closeRoleModal();
      await load();
      if (roleToKeep) await selectRole(roleToKeep);
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }
  async function toggle(role: any) {
    try {
      await api(`/api/roles/${role.idrol}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !role.activo }) });
      setNotice({ type: "ok", text: role.activo ? "Rol desactivado." : "Rol activado." });
      await load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  async function savePermissions() {
    if (!selectedId) return;
    try {
      await api(`/api/roles/${selectedId}/permisos`, { method: "PUT", body: JSON.stringify({ permisos: permissions.map((event) => ({ idevento: event.idevento, permitido: Boolean(event.permitido) })) }) });
      setNotice({ type: "ok", text: "Permisos actualizados." });
      await selectRole(selectedId);
      await load();
    } catch (e) {
      setNotice({ type: "error", text: (e as Error).message });
    }
  }
  const groups = permissions.reduce((result: Record<string, any[]>, event) => { (result[event.modulo] ||= []).push(event); return result; }, {});
  return (
    <Page title="Roles" subtitle="Perfiles y permisos del sistema" action={<button className="button primary" onClick={openNewRole}>Nuevo rol</button>}>
      <SecurityTabs />
      <NoticeBar notice={notice} />
      <section className="panel products-panel">
        <div className="security-table products-table roles-table">
          <table>
            <thead><tr><th>Rol</th><th>Usuarios</th><th>Permisos</th><th>Activo</th><th>Acciones</th></tr></thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.idrol} className={`${selectedId === role.idrol ? "selected-row " : ""}selectable-row${!role.activo ? " product-inactive" : ""}`} onClick={() => selectRole(role.idrol)}>
                  <td><strong>{role.nombre}</strong><small>{role.descripcion || "Sin descripción"}</small></td>
                  <td>{role.usuarios}</td>
                  <td>{role.permisos}</td>
                  <td><label className="product-active-toggle"><input type="checkbox" checked={Boolean(role.activo)} onChange={() => toggle(role)} onClick={(e) => e.stopPropagation()} aria-label={`${role.activo ? "Desactivar" : "Activar"} ${role.nombre}`} /><span>{role.activo ? "Activo" : "Inactivo"}</span></label></td>
                  <td><button className="button tiny secondary" onClick={(e) => { e.stopPropagation(); editRole(role); }}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!roles.length && <div className="empty">No hay roles registrados.</div>}
        </div>
      </section>
      <section className="panel roles-permissions-panel">
        <div className="section-head">
          <div><h2>Permisos del rol</h2><p className="muted">Seleccione un rol para asignar eventos permitidos.</p></div>
          <button className="button primary" disabled={!selectedId} onClick={savePermissions}>Guardar permisos</button>
        </div>
        {selectedId ? <div className="permission-grid">{Object.entries(groups).map(([module, events]) => <div className="permission-group" key={module}><h3>{module}</h3>{(events as any[]).map((event) => <label className="permission-option" key={event.idevento}><input type="checkbox" checked={Boolean(event.permitido)} onChange={() => setPermissions((items) => items.map((item) => item.idevento === event.idevento ? { ...item, permitido: !item.permitido } : item))} />{event.nombre}<small>{event.codigo}</small></label>)}</div>)}</div> : <div className="empty">Seleccione un rol para ver sus permisos.</div>}
      </section>
      {modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="role-modal-title"><form className="confirm-modal product-modal stack" onSubmit={saveRole}><p className="eyebrow">ADMINISTRACIÓN DE ROLES</p><h2 id="role-modal-title">{editingId ? "Editar rol" : "Nuevo rol"}</h2><label>Nombre<input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label><label>Descripción<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={closeRoleModal} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear rol"}</button></div></form></div>}
    </Page>
  );
}

function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]); const [editingId, setEditingId] = useState<number | null>(null); const [form, setForm] = useState({ codigo: "", modulo: "", nombre: "", descripcion: "" }); const [modalOpen, setModalOpen] = useState(false); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState<Notice>(null);
  const load = () => api<any[]>("/api/eventos").then(setEvents);
  useEffect(() => { load().catch((e) => setNotice({ type: "error", text: e.message })); }, []);
  function openNewEvent() { setEditingId(null); setForm({ codigo: "", modulo: "", nombre: "", descripcion: "" }); setModalOpen(true); }
  function editEvent(event: any) { setEditingId(event.idevento); setForm({ codigo: event.codigo, modulo: event.modulo, nombre: event.nombre, descripcion: event.descripcion || "" }); setModalOpen(true); }
  function closeEventModal() { setEditingId(null); setForm({ codigo: "", modulo: "", nombre: "", descripcion: "" }); setModalOpen(false); }
  async function save(e: FormEvent) { e.preventDefault(); setSaving(true); try { if (editingId) await api(`/api/eventos/${editingId}`, { method: "PATCH", body: JSON.stringify(form) }); else await api("/api/eventos", { method: "POST", body: JSON.stringify(form) }); setNotice({ type: "ok", text: editingId ? "Evento actualizado." : "Evento creado." }); closeEventModal(); await load(); } catch (e) { setNotice({ type: "error", text: (e as Error).message }); } finally { setSaving(false); } }
  async function toggle(event: any) { try { await api(`/api/eventos/${event.idevento}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !event.activo }) }); setNotice({ type: "ok", text: event.activo ? "Evento desactivado." : "Evento activado." }); await load(); } catch (e) { setNotice({ type: "error", text: (e as Error).message }); } }
  return <Page title="Eventos" subtitle="Catálogo de acciones y permisos" action={<button className="button primary" onClick={openNewEvent}>Nuevo evento</button>}><SecurityTabs /><NoticeBar notice={notice} /><section className="panel products-panel"><div className="security-table products-table events-table"><table><thead><tr><th>Código</th><th>Módulo</th><th>Evento</th><th>Roles</th><th>Activo</th><th>Acciones</th></tr></thead><tbody>{events.map((event) => <tr key={event.idevento} className={`selectable-row${!event.activo ? " product-inactive" : ""}`}><td>{event.codigo}</td><td>{event.modulo}</td><td><strong>{event.nombre}</strong><small>{event.descripcion || "Sin descripción"}</small></td><td>{event.roles}</td><td><label className="product-active-toggle"><input type="checkbox" checked={Boolean(event.activo)} onChange={() => toggle(event)} aria-label={`${event.activo ? "Desactivar" : "Activar"} ${event.nombre}`} /><span>{event.activo ? "Activo" : "Inactivo"}</span></label></td><td><button className="button tiny secondary" onClick={() => editEvent(event)}>Editar</button></td></tr>)}</tbody></table>{!events.length && <div className="empty">No hay eventos registrados.</div>}</div></section>{modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="event-modal-title"><form className="confirm-modal product-modal stack" onSubmit={save}><p className="eyebrow">CATÁLOGO DE EVENTOS</p><h2 id="event-modal-title">{editingId ? "Editar evento" : "Nuevo evento"}</h2><label>Código único<input required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></label><label>Módulo<input required value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} /></label><label>Nombre<input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label><label>Descripción<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={closeEventModal} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear evento"}</button></div></form></div>}</Page>;
}

function AdminBrokers() {
  const [brokers, setBrokers] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre_completo: "", cedula: "", telefono: "", email: "", porcentaje_comision: "0" });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const emptyForm = () => ({ nombre_completo: "", cedula: "", telefono: "", email: "", porcentaje_comision: "0" });
  const load = (preserveSelection = false) => api<any[]>("/api/corredores").then((items) => { setBrokers(items); if (!preserveSelection) { setSelectedId(null); setDetail(null); } });
  useEffect(() => { load().catch((e) => setNotice({ type: "error", text: e.message })); }, []);
  async function loadDetail(id: number) { setSelectedId(id); setDetail(null); setDetailError(""); setDetailLoading(true); try { setDetail(await api<any>(`/api/corredores/${id}/operaciones`)); } catch (e) { setDetailError((e as Error).message); } finally { setDetailLoading(false); } }
  function openNew() { setEditingId(null); setForm(emptyForm()); setModalOpen(true); }
  function edit(broker: any) { setEditingId(broker.idcorredor); setForm({ nombre_completo: broker.nombre_completo, cedula: broker.cedula, telefono: broker.telefono, email: broker.email || "", porcentaje_comision: String(broker.porcentaje_comision) }); setModalOpen(true); }
  function closeModal() { setEditingId(null); setForm(emptyForm()); setModalOpen(false); }
  async function save(e: FormEvent) { e.preventDefault(); setSaving(true); try { const payload = { ...form, porcentaje_comision: form.porcentaje_comision.replace(",", ".") }; const saved = editingId ? await api<any>(`/api/corredores/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) }) : await api<any>("/api/corredores", { method: "POST", body: JSON.stringify(payload) }); const nextId = selectedId ?? (!editingId ? saved.idcorredor : null); setNotice({ type: "ok", text: editingId ? "Corredor actualizado." : "Corredor creado." }); closeModal(); await load(true); if (nextId) await loadDetail(nextId); } catch (e) { setNotice({ type: "error", text: (e as Error).message }); } finally { setSaving(false); } }
  async function toggle(broker: any) { try { await api(`/api/corredores/${broker.idcorredor}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !broker.activo }) }); setNotice({ type: "ok", text: broker.activo ? "Corredor desactivado." : "Corredor activado." }); await load(true); if (selectedId) await loadDetail(selectedId); } catch (e) { setNotice({ type: "error", text: (e as Error).message }); } }
  async function selectBroker(id: number) { if (selectedId === id) { setSelectedId(null); setDetail(null); return; } await loadDetail(id); }
  return <Page title="Corredores" subtitle="Agentes y comisiones por operación" action={<button className="button primary" onClick={openNew}>Nuevo corredor</button>}><NoticeBar notice={notice} /><section className="panel products-panel"><div className="security-table products-table brokers-table"><table><thead><tr><th>Nombre</th><th>Contacto</th><th>Comisión</th><th>Operaciones</th><th>Activo</th><th>Acciones</th></tr></thead><tbody>{brokers.map((broker) => <tr key={broker.idcorredor} className={`${selectedId === broker.idcorredor ? "selected-row " : ""}selectable-row${!broker.activo ? " product-inactive" : ""}`} onClick={() => selectBroker(broker.idcorredor)}><td><strong>{broker.nombre_completo}</strong><small>C.I. {broker.cedula}</small></td><td>{broker.telefono}<small>{broker.email || "Sin email"}</small></td><td>{broker.porcentaje_comision}%</td><td>{broker.operaciones}</td><td><label className="product-active-toggle"><input type="checkbox" checked={Boolean(broker.activo)} onChange={() => toggle(broker)} onClick={(e) => e.stopPropagation()} aria-label={`${broker.activo ? "Desactivar" : "Activar"} ${broker.nombre_completo}`} /><span>{broker.activo ? "Activo" : "Inactivo"}</span></label></td><td><button className="button tiny secondary" onClick={(e) => { e.stopPropagation(); edit(broker); }}>Editar</button></td></tr>)}</tbody></table>{!brokers.length && <div className="empty">No hay corredores registrados.</div>}</div></section>{selectedId && <section className="panel broker-detail-panel">{detailLoading ? <div className="empty">Cargando operaciones…</div> : detailError ? <div className="alert error">{detailError}</div> : detail && <><div className="section-head"><div><p className="eyebrow">DETALLE DEL CORREDOR</p><h2>{detail.corredor.nombre_completo}</h2></div><span className="muted">{detail.corredor.activo ? "Activo" : "Inactivo"}</span></div><div className="metrics-grid four broker-summary"><Metric label="Comisión actual" value={`${detail.corredor.porcentaje_comision}%`} /><Metric label="Operaciones" value={String(detail.resumen.operaciones)} /><Metric label="Capital colocado" value={money(detail.resumen.capital_total)} /><Metric label="Comisión acumulada" value={money(detail.resumen.comision_total)} tone="green" /></div><div className="security-table broker-operations-table"><table><thead><tr><th>Tipo</th><th>Cliente</th><th>Fecha</th><th>Capital</th><th>Interés</th><th>Comisión %</th><th>Comisión</th><th>Estado</th></tr></thead><tbody>{detail.operaciones.map((operation: any) => <tr key={operation.idoperacion_financiera} className={operation.cancelada ? "cancelled-row" : ""}><td>{operation.tipo === "PRESTAMO" ? "Préstamo" : "Venta financiada"}</td><td>{operation.cliente}</td><td>{shortDate(operation.fecha_inicio)}</td><td>{money(operation.monto_capital)}</td><td>{money(operation.monto_interes)}</td><td>{operation.porcentaje_comision}%</td><td>{money(operation.monto_comision)}</td><td className={operation.cancelada ? "status-inactive" : "status-active"}>{operation.estado}</td></tr>)}</tbody></table>{!detail.operaciones.length && <div className="empty">Este corredor todavía no tiene operaciones relacionadas.</div>}</div></>}</section>}{modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="broker-modal-title"><form className="confirm-modal product-modal stack" onSubmit={save}><p className="eyebrow">ADMINISTRACIÓN DE CORREDORES</p><h2 id="broker-modal-title">{editingId ? "Editar corredor" : "Nuevo corredor"}</h2><label>Nombre completo<input required value={form.nombre_completo} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} /></label><label>Cédula<input required value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} /></label><label>Teléfono<input required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></label><label>Email opcional<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Comisión (%)<input required inputMode="decimal" value={form.porcentaje_comision} onChange={(e) => setForm({ ...form, porcentaje_comision: normalizeDecimalInput(e.target.value) })} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={closeModal} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear corredor"}</button></div></form></div>}</Page>;
}

function ReferenceTypes() {
  const [types, setTypes] = useState<any[]>([]);
  const [form, setForm] = useState({ nombre: "", descripcion: "", orden: "1" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const load = () => api<any[]>("/api/administracion/tipos-referencia").then(setTypes).catch((e) => setNotice({ type: "error", text: (e as Error).message }));
  useEffect(() => { load(); }, []);
  function closeModal() { setModalOpen(false); setEditingId(null); }
  function openNew() { setEditingId(null); setForm({ nombre: "", descripcion: "", orden: String(types.length + 1) }); setModalOpen(true); }
  function edit(type: any) { setEditingId(type.idtipo_referencia); setForm({ nombre: type.nombre, descripcion: type.descripcion || "", orden: String(type.orden) }); setModalOpen(true); }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const url = editingId === null ? "/api/administracion/tipos-referencia" : `/api/administracion/tipos-referencia/${editingId}`;
      await api(url, { method: editingId === null ? "POST" : "PATCH", body: JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, orden: Number(form.orden) }) });
      setNotice({ type: "ok", text: editingId === null ? "Tipo de referencia creado." : "Tipo de referencia actualizado." });
      closeModal();
      await load();
    } catch (e) { setNotice({ type: "error", text: (e as Error).message }); }
    finally { setSaving(false); }
  }
  async function toggleActive(type: any) {
    try {
      await api(`/api/administracion/tipos-referencia/${type.idtipo_referencia}`, { method: "PATCH", body: JSON.stringify({ activo: !type.activo }) });
      setNotice({ type: "ok", text: type.activo ? "Tipo de referencia desactivado." : "Tipo de referencia activado." });
      await load();
    } catch (e) { setNotice({ type: "error", text: (e as Error).message }); }
  }
  return <Page title="Tipos de referencia" subtitle="Catálogo de referencias para clientes" action={<button type="button" className="button primary" onClick={openNew}>Nuevo tipo de referencia</button>}>
    <NoticeBar notice={notice} />
    <section className="panel products-panel"><div className="security-table products-table"><table><thead><tr><th>Nombre</th><th>Descripción</th><th>Orden</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {types.map((type) => <tr key={type.idtipo_referencia} className={!type.activo ? "product-inactive" : undefined}><td><strong>{type.nombre}</strong></td><td>{type.descripcion || "Sin descripción"}</td><td>{type.orden}</td><td><label className="product-active-toggle"><input type="checkbox" checked={Boolean(type.activo)} onChange={() => toggleActive(type)} aria-label={`${type.activo ? "Desactivar" : "Activar"} ${type.nombre}`} /><span>{type.activo ? "Activo" : "Inactivo"}</span></label></td><td><button type="button" className="button tiny secondary" onClick={() => edit(type)}>Editar</button></td></tr>)}
    </tbody></table>{!types.length && <div className="empty">No hay tipos de referencia registrados.</div>}</div></section>
    {modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reference-type-modal-title"><form className="confirm-modal product-modal stack" onSubmit={save}><p className="eyebrow">CATÁLOGO DE REFERENCIAS</p><h2 id="reference-type-modal-title">{editingId === null ? "Nuevo tipo de referencia" : "Editar tipo de referencia"}</h2><label>Nombre<input required maxLength={100} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label><label>Descripción<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label><label>Orden<input required type="number" min="1" step="1" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={closeModal} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : editingId === null ? "Crear tipo" : "Guardar cambios"}</button></div></form></div>}
  </Page>;
}

function Banks() {
  const [banks, setBanks] = useState<any[]>([]);
  const [form, setForm] = useState({ codigo: "", nombre: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const load = () => api<any[]>("/api/bancos?todos=1").then(setBanks).catch((e) => setNotice({ type: "error", text: (e as Error).message }));
  useEffect(() => { load(); }, []);
  function closeModal() { setModalOpen(false); setEditingId(null); }
  function openNew() { setEditingId(null); setForm({ codigo: "", nombre: "" }); setModalOpen(true); }
  function edit(bank: any) { setEditingId(bank.idbanco); setForm({ codigo: bank.codigo, nombre: bank.nombre }); setModalOpen(true); }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const url = editingId === null ? "/api/bancos" : `/api/bancos/${editingId}`;
      await api(url, { method: editingId === null ? "POST" : "PATCH", body: JSON.stringify({ codigo: form.codigo.trim(), nombre: form.nombre.trim() }) });
      setNotice({ type: "ok", text: editingId === null ? "Banco creado." : "Banco actualizado." });
      closeModal();
      await load();
    } catch (e) { setNotice({ type: "error", text: (e as Error).message }); }
    finally { setSaving(false); }
  }
  async function toggleActive(bank: any) {
    try {
      await api(`/api/bancos/${bank.idbanco}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !bank.activo }) });
      setNotice({ type: "ok", text: bank.activo ? "Banco desactivado." : "Banco activado." });
      await load();
    } catch (e) { setNotice({ type: "error", text: (e as Error).message }); }
  }
  return <Page title="Bancos" subtitle="Catálogo de entidades financieras" action={<button type="button" className="button primary" onClick={openNew}>Nuevo banco</button>}>
    <NoticeBar notice={notice} />
    <section className="panel products-panel"><div className="security-table products-table"><table><thead><tr><th>Código</th><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {banks.map((bank) => <tr key={bank.idbanco} className={!bank.activo ? "product-inactive" : undefined}><td>{bank.codigo}</td><td><strong>{bank.nombre}</strong></td><td><label className="product-active-toggle"><input type="checkbox" checked={Boolean(bank.activo)} onChange={() => toggleActive(bank)} aria-label={`${bank.activo ? "Desactivar" : "Activar"} ${bank.nombre}`} /><span>{bank.activo ? "Activo" : "Inactivo"}</span></label></td><td><button type="button" className="button tiny secondary" onClick={() => edit(bank)}>Editar</button></td></tr>)}
    </tbody></table>{!banks.length && <div className="empty">No hay bancos registrados.</div>}</div></section>
    {modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="bank-modal-title"><form className="confirm-modal product-modal stack" onSubmit={save}><p className="eyebrow">CATÁLOGO DE BANCOS</p><h2 id="bank-modal-title">{editingId === null ? "Nuevo banco" : "Editar banco"}</h2><label>Código<input required maxLength={30} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></label><label>Nombre<input required maxLength={100} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={closeModal} disabled={saving}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : editingId === null ? "Crear banco" : "Guardar cambios"}</button></div></form></div>}
  </Page>;
}

function Admin() {
  const [settings, setSettings] = useState<any[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const load = () =>
    Promise.all([
      api<any[]>("/api/configuracion"),
    ]).then(([c]) => {
      setSettings(c);
    });
  useEffect(() => {
    load();
  }, []);
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
      subtitle="Bancos, referencias y configuración"
    >
      <NoticeBar notice={notice} />
      <section className="admin-grid">
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

function ClientFormComplete({ onDone, onCancel, clientId }: { onDone: () => void; onCancel?: () => void; clientId?: number }) {
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
    ingreso_promedio: "0",
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
    ],
  });
  const [error, setError] = useState("");
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [loadingClient, setLoadingClient] = useState(Boolean(clientId));
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
        if (!clientId && r[0]?.interes_minimo != null)
          setData((d: any) => ({
            ...d,
            tasa_interes_sugerida: String(r[0].interes_minimo),
          }));
      })
      .catch(() => {});
    api<any>("/api/mapa/config").then((r) => setMapKey(r.apiKey || ""));
    if (clientId) {
      api<any>(`/api/clientes/${clientId}`)
        .then((client) => setData((current: any) => ({
          ...current,
          ...client,
          fecha_nacimiento: client.fecha_nacimiento ? String(client.fecha_nacimiento).slice(0, 10) : "",
          ingreso_promedio: client.ingreso_promedio == null ? "" : String(client.ingreso_promedio),
          tasa_interes_sugerida: client.tasa_interes_sugerida == null ? "" : String(client.tasa_interes_sugerida),
          referencias: (client.referencias?.length ? client.referencias : current.referencias).slice(0, 1),
        })))
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoadingClient(false));
    }
  }, [clientId]);
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
      const targetId = clientId
        ? clientId
        : (await api<{ idcliente: number }>("/api/clientes", { method: "POST", body: JSON.stringify(data) })).idcliente;
      if (clientId) {
        await api(`/api/clientes/${clientId}`, { method: "PATCH", body: JSON.stringify({ ...data, cedula: undefined, referencias: undefined }) });
        await api(`/api/clientes/${clientId}/referencias`, { method: "PATCH", body: JSON.stringify({ referencias: [data.referencias[0]] }) });
      }
      if (cedulaFile) {
        const form = new FormData();
        form.append("cedula", cedulaFile);
        form.append("lado", "FRENTE");
        await api(`/api/clientes/${targetId}/cedula`, {
          method: "POST",
          body: form,
        });
      }
      if (cedulaBackFile) {
        const form = new FormData();
        form.append("cedula", cedulaBackFile);
        form.append("lado", "ATRAS");
        await api(`/api/clientes/${targetId}/cedula`, { method: "POST", body: form });
      }
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (clientId && loadingClient) return <div className="panel empty">Cargando cliente…</div>;
  if (clientId && error && !data) return <div className="panel alert error">{error}</div>;
  return (
    <form className="panel form-grid" onSubmit={submit}>
      <h2 className="full">{clientId ? "Editar cliente" : "Nuevo cliente"}</h2>
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
          disabled={Boolean(clientId)}
          value={data.cedula}
          onChange={(e) => set("cedula", e.target.value)}
        />
      </label>
      <label>
        Fecha de nacimiento
        <input
          required={!clientId}
          type="date"
          value={data.fecha_nacimiento}
          onChange={(e) => set("fecha_nacimiento", e.target.value)}
        />
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
        Interés sugerido (%)
        <input
          required={!clientId}
          inputMode="numeric"
          value={data.tasa_interes_sugerida}
          onChange={(e) => set("tasa_interes_sugerida", integer(e.target.value))}
        />
      </label>
      <button type="button" className="button secondary full additional-toggle" onClick={() => setAdditionalOpen((open) => !open)}>
        {additionalOpen ? "Ocultar datos adicional" : "Datos adicional"}
      </button>
      {additionalOpen && <div className="full additional-fields">
        <label>
          RUC
          <input value={data.ruc} onChange={(e) => set("ruc", e.target.value)} />
        </label>
        <label>
          Teléfono 2
          <input value={data.telefono2} onChange={(e) => set("telefono2", e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label>
          Profesión
          <input value={data.profesion} onChange={(e) => set("profesion", e.target.value)} />
        </label>
        <label>
          Dedicación
          <input value={data.dedicacion} onChange={(e) => set("dedicacion", e.target.value)} />
        </label>
        <label>
          Ingreso promedio
          <input inputMode="decimal" value={data.ingreso_promedio} onChange={(e) => set("ingreso_promedio", numeric(e.target.value))} />
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
      </div>}
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
      {data.referencias.slice(0, 1).map((r: any, i: number) => (
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
        {onCancel && <button type="button" className="button secondary" onClick={onCancel}>Cancelar</button>}
        <button className="button primary">{clientId ? "Guardar cambios" : "Guardar cliente"}</button>
      </div>
    </form>
  );
}
export default function App() {
  const location = useLocation();
  const publicMatch = location.pathname.match(/^\/carga-cliente\/([^/]+)$/);
  const isPublic = Boolean(publicMatch);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    if (isPublic) return;
    api<{ user: User }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
  }, [isPublic]);
  if (publicMatch) return <PublicClientForm token={decodeURIComponent(publicMatch[1])} />;
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  }
  if (user === undefined)
    return (
      <div className="splash">
        <Banknote />
        <span>NM CREDITOS</span>
      </div>
    );
  if (!user) return <Login onLogin={setUser} />;
  return (
    <Shell user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/prestamos"
          element={
            <Operations
              action={
                <NavLink className="button primary" to="/nueva-operacion">
                  Nuevo préstamo
                </NavLink>
              }
            />
          }
        />
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
        <Route path="/gastos/analisis" element={<ExpenseAnalysis />} />
        <Route path="/gasto-tipos" element={<ExpenseTypes />} />
        <Route path="/administracion" element={<Admin />} />
        <Route path="/administracion/usuarios" element={<AdminUsers />} />
        <Route path="/administracion/roles" element={<AdminRoles />} />
        <Route path="/administracion/eventos" element={<AdminEvents />} />
        <Route path="/administracion/formas-pago" element={<PaymentMethods />} />
        <Route path="/administracion/tipos-referencia" element={<ReferenceTypes />} />
        <Route path="/administracion/bancos" element={<Banks />} />
        <Route path="/administracion/corredores" element={<AdminBrokers />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Shell>
  );
}
