// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const api = vi.hoisted(() => vi.fn());
vi.mock("./api", () => ({
  api,
  money: (value: string | number) => `Gs. ${value}`,
  shortDate: (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  },
}));

import OperationDetailSelectable from "./OperationDetailSelectable";

afterEach(() => { cleanup(); api.mockReset(); });

describe("edición de fecha en el detalle visible", () => {
  it.each(["PRESTAMO", "VENTA_FINANCIADA"])('muestra el botón y refresca las cuotas de %s', async (tipo) => {
    let updated = false;
    api.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === "/api/formas-pago") return [];
      if (url === "/api/operaciones/42/fecha-inicio" && options?.method === "PATCH") {
        expect(JSON.parse(String(options.body))).toEqual({ fecha_inicio: "25/09/2026" });
        updated = true;
        return { cuotas_reajustadas: 1 };
      }
      if (url === "/api/operaciones/42") return {
        tipo, nombre_completo: "Cliente prueba", cedula: "123", frecuencia: "MENSUAL",
        fecha_inicio: updated ? "2026-09-25" : "2026-09-24", porcentaje_interes: 10,
        monto_capital: 100, monto_interes: 10, monto_total: 110, total_pagado: 0, saldo: 110,
        estado: "ACTIVA", cuotas: [{ idcuota: 1, numero: 1, fecha_vencimiento: updated ? "2026-10-10" : "2026-09-25", monto_interes: 10, monto_capital: 100, monto_total: 110, monto_pagado: 0, saldo_pendiente: 110, estado: "PENDIENTE" }],
        pagos: [],
      };
      throw new Error(`API inesperada: ${url}`);
    });
    render(<MemoryRouter initialEntries={["/operaciones/42"]}><Routes><Route path="/operaciones/:id" element={<OperationDetailSelectable />} /></Routes></MemoryRouter>);
    const button = await screen.findByRole("button", { name: "Editar fecha" });
    expect(button.closest("dd")?.textContent).toContain("24/09/2026");
    fireEvent.click(button);
    const input = screen.getByPlaceholderText("dd/mm/yyyy");
    fireEvent.change(input, { target: { value: "25/09/2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar y reajustar" }));
    await waitFor(() => expect(button.closest("dd")?.textContent).toContain("25/09/2026"));
    expect(screen.getByRole("status").textContent).toContain("1 cuota(s) reajustada(s)");
    expect(screen.getByText("10/10/2026")).toBeTruthy();
  });
});
