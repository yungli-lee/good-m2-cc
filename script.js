const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");

menuButton?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll(".article-card").forEach((card, index) => {
  const button = card.querySelector(".article-toggle");
  if (index === 0) {
    card.classList.add("is-open");
    button?.querySelector("b")?.replaceChildren("收合");
  }

  button?.addEventListener("click", () => {
    const isOpen = card.classList.toggle("is-open");
    const label = button.querySelector("b");
    if (label) {
      label.textContent = isOpen ? "收合" : "展開";
    }
  });
});

const mortgageForm = document.querySelector("#mortgage-form");
const calcSummary = document.querySelector("#calc-summary");
const calcWarning = document.querySelector("#calc-warning");
const calcTableBody = document.querySelector("#calc-table tbody");

const money = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0,
});

function monthlyPayment(principal, annualRate, months) {
  if (months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * factor / (factor - 1);
}

function formatMoney(value) {
  return `$${money.format(Math.round(value))}`;
}

function readNumber(id) {
  return Number(document.querySelector(id)?.value || 0);
}

function buildRateSegments(totalMonths) {
  const segments = [
    { rate: readNumber("#rate-1"), start: Math.max(1, Math.floor(readNumber("#start-1"))) },
    { rate: readNumber("#rate-2"), start: Math.max(1, Math.floor(readNumber("#start-2"))) },
    { rate: readNumber("#rate-3"), start: Math.max(1, Math.floor(readNumber("#start-3"))) },
  ]
    .filter((segment) => segment.start <= totalMonths)
    .sort((a, b) => a.start - b.start);

  if (!segments.some((segment) => segment.start === 1)) {
    segments.unshift({ rate: segments[0]?.rate || 0, start: 1 });
  }

  return segments.map((segment, index) => ({
    ...segment,
    end: (segments[index + 1]?.start || totalMonths + 1) - 1,
  }));
}

function calculateMortgage() {
  const principalStart = readNumber("#loan-amount") * 10000;
  const totalMonths = Math.floor(readNumber("#loan-years") * 12);
  const graceMonths = Math.min(84, Math.max(0, Math.floor(readNumber("#grace-months"))));

  if (principalStart <= 0 || totalMonths <= 0 || graceMonths >= totalMonths) {
    calcSummary.innerHTML = "<article><strong>請確認貸款金額、年限與寬限期設定。</strong></article>";
    calcTableBody.innerHTML = "";
    return;
  }

  const rateSegments = buildRateSegments(totalMonths);
  let balance = principalStart;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let maxPayment = 0;
  const rows = [];

  rateSegments.forEach((segment) => {
    let periodPrincipal = 0;
    let periodInterest = 0;
    let firstPrincipal = 0;
    let firstInterest = 0;
    let firstPayment = 0;
    const monthlyRate = segment.rate / 100 / 12;

    for (let month = segment.start; month <= segment.end; month += 1) {
      const inGrace = month <= graceMonths;
      const remainingMonths = totalMonths - month + 1;
      const interest = balance * monthlyRate;
      const payment = inGrace
        ? interest
        : monthlyPayment(balance, segment.rate, remainingMonths);
      const principal = inGrace ? 0 : Math.min(balance, Math.max(0, payment - interest));

      if (month === segment.start) {
        firstPayment = payment;
        firstPrincipal = principal;
        firstInterest = interest;
      }

      balance = Math.max(0, balance - principal);
      periodPrincipal += principal;
      periodInterest += interest;
      totalPrincipal += principal;
      totalInterest += interest;
      maxPayment = Math.max(maxPayment, payment);
    }

    rows.push({
      start: segment.start,
      label: `${segment.start} - ${segment.end} 月`,
      rate: `${segment.rate.toFixed(3)}%`,
      firstPayment,
      firstPrincipal,
      firstInterest,
      periodPrincipal,
      periodInterest,
    });
  });

  calcSummary.innerHTML = [
    ["貸款金額", formatMoney(principalStart)],
    ["貸款期數", `${totalMonths} 個月`],
    ["最高月繳", formatMoney(maxPayment)],
    ["預估總利息", formatMoney(totalInterest)],
  ].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");

  calcTableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.label}</td>
      <td>${row.rate}</td>
      <td>${formatMoney(row.firstPayment)}</td>
      <td>${formatMoney(row.firstPrincipal)}</td>
      <td>${formatMoney(row.firstInterest)}</td>
      <td>${formatMoney(row.periodPrincipal)}</td>
      <td>${formatMoney(row.periodInterest)}</td>
    </tr>
  `).join("");

  if (calcWarning) {
    const paymentJump = rows.slice(1).reduce((largest, row, index) => {
      const previous = rows[index];
      const increase = row.firstPayment - previous.firstPayment;
      return increase > largest.increase
        ? { month: row.start, before: previous.firstPayment, after: row.firstPayment, increase }
        : largest;
    }, { month: 0, before: 0, after: 0, increase: 0 });

    if (paymentJump.increase > 1000) {
      const reason = paymentJump.month === graceMonths + 1
        ? "寬限期結束"
        : "利率或還款條件變更";
      calcWarning.textContent = `⚠️ 第 ${paymentJump.month} 個月起${reason}，月付金將由 ${formatMoney(paymentJump.before)} 提高至 ${formatMoney(paymentJump.after)}。`;
      calcWarning.classList.add("is-visible");
    } else {
      calcWarning.textContent = "";
      calcWarning.classList.remove("is-visible");
    }
  }
}

mortgageForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  calculateMortgage();
});

if (mortgageForm) {
  calculateMortgage();
}
