import { describe, expect, it } from "vitest";
import { calculatePreviewInstallments } from "./loanPreview";

describe("vista previa de cuotas", () => {
  const sumInCents = (values: string[]) => Math.round(values.reduce((sum, value) => sum + Number(value), 0) * 100);

  it("distribuye capital e interés y conserva los totales", () => {
    const cuotas = calculatePreviewInstallments("1000000", "300000", 12);

    expect(cuotas).toHaveLength(12);
    expect(sumInCents(cuotas.map((cuota) => cuota.montoCapital))).toBe(100000000);
    expect(sumInCents(cuotas.map((cuota) => cuota.montoInteres))).toBe(30000000);
    expect(sumInCents(cuotas.map((cuota) => cuota.montoTotal))).toBe(130000000);
  });

  it("aplica la diferencia de redondeo a la última cuota", () => {
    const cuotas = calculatePreviewInstallments("100", "10", 3);

    expect(cuotas.map((cuota) => cuota.montoCapital)).toEqual(["33.33", "33.33", "33.34"]);
    expect(cuotas.map((cuota) => cuota.montoInteres)).toEqual(["3.33", "3.33", "3.34"]);
    expect(cuotas[2].montoTotal).toBe("36.68");
  });
});
