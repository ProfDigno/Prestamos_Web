import { describe, expect, it } from "vitest";
import { displayDateToIso, isoDateToDisplay } from "./dateUtils";

describe("fechas de operaciones", () => {
  it("convierte entre ISO y dd/mm/yyyy", () => {
    expect(isoDateToDisplay("2026-09-25")).toBe("25/09/2026");
    expect(displayDateToIso("25/09/2026")).toBe("2026-09-25");
  });

  it("rechaza fechas incompletas o imposibles", () => {
    expect(displayDateToIso("2026-09-25")).toBeNull();
    expect(displayDateToIso("31/02/2026")).toBeNull();
  });
});
