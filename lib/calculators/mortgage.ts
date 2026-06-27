export type MortgageRateInput = {
  rate: number | null;
  startMonth: number | null;
};

export type MortgageInput = {
  amountWan: number;
  years: number;
  graceMonths: number;
  rates: [MortgageRateInput, MortgageRateInput, MortgageRateInput];
};

export type MortgageRow = {
  startMonth: number;
  endMonth: number;
  label: string;
  rate: number;
  firstPayment: number;
  firstPrincipal: number;
  firstInterest: number;
  periodPrincipal: number;
  periodInterest: number;
};

export type MortgageResult = {
  principal: number;
  totalMonths: number;
  maxPayment: number;
  totalInterest: number;
  rows: MortgageRow[];
  warning: string | null;
};

type RateSegment = {
  rate: number;
  startMonth: number;
  endMonth: number;
};

export function monthlyPayment(principal: number, annualRate: number, months: number) {
  if (months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * factor / (factor - 1);
}

export function validateMortgageInput(input: MortgageInput) {
  const totalMonths = Math.floor(input.years * 12);
  const graceMonths = Math.floor(input.graceMonths);
  const firstRate = input.rates[0];
  const secondRate = input.rates[1];
  const thirdRate = input.rates[2];

  if (input.amountWan <= 0) return "請輸入正確的貸款金額。";
  if (!Number.isInteger(input.years) || input.years < 1 || input.years > 40) return "貸款年限請輸入 1 到 40 年。";
  if (!Number.isInteger(graceMonths) || graceMonths < 0 || graceMonths > 84) return "寬限期請輸入 0 到 84 個月。";
  if (graceMonths >= totalMonths) return "寬限期不可大於或等於總貸款期數。";
  if (firstRate.rate == null || firstRate.startMonth == null) return "第一段利率與啟用月份必填。";
  if (firstRate.startMonth !== 1) return "第一段啟用月份必須是 1。";
  if (firstRate.rate < 0) return "第一段利率不可小於 0。";

  const optionalRates = [secondRate, thirdRate];
  for (const [index, segment] of optionalRates.entries()) {
    const number = index + 2;
    const hasRate = segment.rate != null;
    const hasStart = segment.startMonth != null;
    if (hasRate !== hasStart) return `第 ${number} 段利率與啟用月份必須同時填寫，或同時留空。`;
    if (segment.rate != null && segment.rate < 0) return `第 ${number} 段利率不可小於 0。`;
    if (segment.startMonth != null && (!Number.isInteger(segment.startMonth) || segment.startMonth < 1 || segment.startMonth > totalMonths)) {
      return `第 ${number} 段啟用月份必須在 1 到 ${totalMonths} 之間。`;
    }
  }

  if (secondRate.rate == null && thirdRate.rate != null) return "第二段空白時，第三段不可填寫；請先填第二段，或清空第三段。";

  const activeSegments = input.rates.filter((segment): segment is { rate: number; startMonth: number } => (
    segment.rate != null && segment.startMonth != null
  ));

  for (let index = 1; index < activeSegments.length; index += 1) {
    if (activeSegments[index].startMonth <= activeSegments[index - 1].startMonth) {
      return "各段利率的啟用月份必須由小到大，且不可相同。";
    }
  }

  return "";
}

function buildRateSegments(input: MortgageInput): RateSegment[] {
  const totalMonths = Math.floor(input.years * 12);
  const activeSegments = input.rates
    .filter((segment): segment is { rate: number; startMonth: number } => segment.rate != null && segment.startMonth != null)
    .map((segment) => ({ rate: segment.rate, startMonth: segment.startMonth }));

  return activeSegments.map((segment, index) => ({
    ...segment,
    endMonth: (activeSegments[index + 1]?.startMonth || totalMonths + 1) - 1
  }));
}

function splitSegmentsAtGracePeriod(input: MortgageInput) {
  const graceMonths = Math.floor(input.graceMonths);
  return buildRateSegments(input).flatMap((segment) => {
    if (graceMonths > 0 && segment.startMonth <= graceMonths && segment.endMonth > graceMonths) {
      return [
        { ...segment, endMonth: graceMonths },
        { ...segment, startMonth: graceMonths + 1 }
      ];
    }
    return [segment];
  });
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const validationMessage = validateMortgageInput(input);
  if (validationMessage) throw new Error(validationMessage);

  const principal = input.amountWan * 10000;
  const totalMonths = Math.floor(input.years * 12);
  const graceMonths = Math.floor(input.graceMonths);
  let balance = principal;
  let totalInterest = 0;
  let maxPayment = 0;
  const rows: MortgageRow[] = [];

  splitSegmentsAtGracePeriod(input).forEach((segment) => {
    let periodPrincipal = 0;
    let periodInterest = 0;
    let firstPrincipal = 0;
    let firstInterest = 0;
    let firstPayment = 0;
    const monthlyRate = segment.rate / 100 / 12;

    for (let month = segment.startMonth; month <= segment.endMonth; month += 1) {
      const inGrace = month <= graceMonths;
      const remainingMonths = totalMonths - month + 1;
      const interest = balance * monthlyRate;
      const payment = inGrace ? interest : monthlyPayment(balance, segment.rate, remainingMonths);
      const monthPrincipal = inGrace ? 0 : Math.min(balance, Math.max(0, payment - interest));

      if (month === segment.startMonth) {
        firstPayment = payment;
        firstPrincipal = monthPrincipal;
        firstInterest = interest;
      }

      balance = Math.max(0, balance - monthPrincipal);
      periodPrincipal += monthPrincipal;
      periodInterest += interest;
      totalInterest += interest;
      maxPayment = Math.max(maxPayment, payment);
    }

    rows.push({
      startMonth: segment.startMonth,
      endMonth: segment.endMonth,
      label: `${segment.startMonth} - ${segment.endMonth} 月${segment.endMonth <= graceMonths ? "（寬限期）" : "（本息攤還）"}`,
      rate: segment.rate,
      firstPayment,
      firstPrincipal,
      firstInterest,
      periodPrincipal,
      periodInterest
    });
  });

  const paymentJump = rows.slice(1).reduce(
    (largest, row, index) => {
      const previous = rows[index];
      const increase = row.firstPayment - previous.firstPayment;
      return increase > largest.increase ? { month: row.startMonth, before: previous.firstPayment, after: row.firstPayment, increase } : largest;
    },
    { month: 0, before: 0, after: 0, increase: 0 }
  );

  const warning = paymentJump.increase > 1000
    ? `第 ${paymentJump.month} 個月起${paymentJump.month === graceMonths + 1 ? "寬限期結束" : "利率或還款條件變更"}，月付金將明顯提高。`
    : null;

  return {
    principal,
    totalMonths,
    maxPayment,
    totalInterest,
    rows,
    warning
  };
}
