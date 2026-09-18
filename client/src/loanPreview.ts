export type PreviewInstallment = {
  numero: number;
  montoInteres: string;
  montoCapital: string;
  montoTotal: string;
};

function moneyAmount(value: number) {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

export function calculatePreviewInstallments(
  capitalValue: string | number,
  interestValue: string | number,
  countValue: string | number,
): PreviewInstallment[] {
  const capital = Math.max(0, Number(capitalValue) || 0);
  const interest = Math.max(0, Number(interestValue) || 0);
  const count = Math.max(1, Math.floor(Number(countValue) || 1));
  const regularCapital = Math.floor((capital / count) * 100) / 100;
  const regularInterest = Math.floor((interest / count) * 100) / 100;

  return Array.from({ length: count }, (_, index) => {
    const last = index === count - 1;
    const montoCapital = last ? capital - regularCapital * (count - 1) : regularCapital;
    const montoInteres = last ? interest - regularInterest * (count - 1) : regularInterest;
    return {
      numero: index + 1,
      montoCapital: moneyAmount(montoCapital),
      montoInteres: moneyAmount(montoInteres),
      montoTotal: moneyAmount(montoCapital + montoInteres),
    };
  });
}
