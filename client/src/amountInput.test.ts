import { describe, expect, it } from "vitest";
import { formatIntegerAmount, formatIntegerAmountInput } from "./amountInput";

describe("importes con separador de miles", () => {
  it("formatea importes enteros con puntos", () => {
    expect(formatIntegerAmount("1500000")).toBe("1.500.000");
    expect(formatIntegerAmount("1.500.000")).toBe("1.500.000");
    expect(formatIntegerAmount("300000.00")).toBe("300.000");
    expect(formatIntegerAmount("1.0000")).toBe("10.000");
  });

  it("normaliza pegado y conserva la posición del cursor", () => {
    expect(formatIntegerAmountInput("1,500 000", 9)).toEqual({ value: "1.500.000", caret: 9 });
    expect(formatIntegerAmountInput("1.500.000", 5)).toEqual({ value: "1.500.000", caret: 5 });
  });
});
