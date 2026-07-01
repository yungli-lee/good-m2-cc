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
const calcError = document.querySelector("#calc-error");
const calcSummary = document.querySelector("#calc-summary");
const calcWarning = document.querySelector("#calc-warning");
const calcTableBody = document.querySelector("#calc-table tbody");
const consultForm = document.querySelector("#consult-form");
const consultFormMessage = document.querySelector("#consult-form-message");

const SERVICE_TYPE_LABELS = {
  buy: "買屋 / 買地",
  sell: "賣屋 / 賣地 / 委託銷售",
  loan_tax: "貸款 / 稅務提醒",
  factory_land: "廠房 / 土地需求",
  other: "其他諮詢",
};

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

function formatPropertyPrice(value) {
  const price = Number(value || 0);
  if (!price) return "洽詢";
  if (price >= 10000) return `${money.format(Math.round(price / 10000))} 萬`;
  return `${money.format(price)} 元`;
}

function formatPing(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 3 })} 坪`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function getCoverMedia(property) {
  const media = Array.isArray(property.property_media) ? property.property_media : [];
  return media.find((item) => item.is_cover && !item.deleted_at) || media.find((item) => !item.deleted_at) || null;
}

function getFeaturedPropertyElements() {
  return {
    empty: document.querySelector("[data-featured-property-empty]"),
    list: document.querySelector("[data-featured-property-list]"),
  };
}

function getPropertyListElements(kind) {
  if (kind === "featured") return getFeaturedPropertyElements();
  return {
    empty: document.querySelector("[data-latest-property-empty]"),
    list: document.querySelector(`[data-property-list="${kind}"]`),
  };
}

function propertyCardHtml(property) {
  const cover = getCoverMedia(property);
  const image = cover?.url
    ? `<img src="${escapeHtml(cover.url)}" alt="${escapeHtml(cover.alt_text || property.title)}" loading="lazy">`
    : `<div class="property-card-placeholder" aria-label="${escapeHtml(property.title)} 尚未設定封面照片"></div>`;
  const highlights = Array.isArray(property.highlights) ? property.highlights.slice(0, 2).join("、") : "";

  return `
    <article class="property-discovery-card">
      ${image}
      <div class="property-discovery-body">
        <h3>${escapeHtml(property.title)}</h3>
        <p><strong>${escapeHtml(formatPropertyPrice(property.price))}</strong></p>
        <p>${escapeHtml(property.address_public || "地址洽詢")}</p>
        <p>土地 ${escapeHtml(formatPing(property.land_area_ping))} / 建物 ${escapeHtml(formatPing(property.building_area_ping))}</p>
        <p>${escapeHtml(property.layout || "格局洽詢")}</p>
        ${highlights ? `<p>${escapeHtml(highlights)}</p>` : ""}
        <a class="button" href="/properties/${encodeURIComponent(property.slug)}">查看詳情</a>
      </div>
    </article>
  `;
}

function renderPropertyList(kind, properties) {
  const { empty, list } = getPropertyListElements(kind);
  if (!list || !empty) return;

  if (!Array.isArray(properties) || properties.length === 0) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  list.innerHTML = properties.map(propertyCardHtml).join("");
}

async function fetchPublicProperties(mode, q = "") {
  const params = new URLSearchParams({ mode, limit: mode === "search" ? "24" : "12" });
  if (q) params.set("q", q);
  const response = await fetch(`/api/public/properties?${params}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "properties_failed");
  return result.data || [];
}

async function loadPropertyList(kind) {
  const { list } = getPropertyListElements(kind);
  if (!list) return;

  try {
    renderPropertyList(kind, await fetchPublicProperties(kind));
  } catch {
    if (list.children.length > 0) return;
    renderPropertyList(kind, []);
  }
}

function scrollPropertyCarousel(kind, direction) {
  const carousel = document.querySelector(`[data-property-carousel="${kind}"]`);
  const card = carousel?.querySelector(".property-discovery-card");
  if (!carousel || !card) return;
  carousel.scrollBy({ left: direction * (card.getBoundingClientRect().width + 18), behavior: "smooth" });
}

function initPropertyDiscovery() {
  document.querySelectorAll("[data-property-carousel-prev]").forEach((button) => {
    button.addEventListener("click", () => scrollPropertyCarousel(button.dataset.propertyCarouselPrev, -1));
  });
  document.querySelectorAll("[data-property-carousel-next]").forEach((button) => {
    button.addEventListener("click", () => scrollPropertyCarousel(button.dataset.propertyCarouselNext, 1));
  });

  const load = () => {
    loadPropertyList("featured");
    loadPropertyList("latest");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load, { once: true });
    return;
  }

  load();
}

const propertySearchForm = document.querySelector("[data-property-search-form]");
const propertySearchResults = document.querySelector("[data-property-search-results]");
const propertySearchList = document.querySelector("[data-property-search-list]");
const propertySearchEmpty = document.querySelector("[data-property-search-empty]");

propertySearchForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = propertySearchForm.querySelector("button[type='submit']");
  const formData = new FormData(propertySearchForm);
  const q = String(formData.get("q") || "").trim();
  if (!propertySearchResults || !propertySearchList || !propertySearchEmpty || !submitButton) return;

  propertySearchResults.hidden = false;
  propertySearchEmpty.hidden = true;
  propertySearchList.innerHTML = "";
  submitButton.disabled = true;
  submitButton.textContent = "搜尋中...";

  try {
    const properties = await fetchPublicProperties("search", q);
    propertySearchList.innerHTML = properties.map(propertyCardHtml).join("");
    propertySearchEmpty.hidden = properties.length > 0;
  } catch {
    propertySearchEmpty.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "搜尋物件";
  }
});

function readNumber(id) {
  return Number(document.querySelector(id)?.value || 0);
}

function readOptionalRate(index) {
  const rateValue = document.querySelector(`#rate-${index}`)?.value.trim() || "";
  const startValue = document.querySelector(`#start-${index}`)?.value.trim() || "";
  return {
    index,
    hasRate: rateValue !== "",
    hasStart: startValue !== "",
    rate: Number(rateValue),
    start: Number(startValue),
  };
}

function showCalcError(message) {
  if (calcError) {
    calcError.textContent = message;
    calcError.classList.add("is-visible");
  }
  calcSummary.innerHTML = "";
  calcTableBody.innerHTML = "";
  calcWarning?.classList.remove("is-visible");
}

function clearCalcError() {
  if (calcError) {
    calcError.textContent = "";
    calcError.classList.remove("is-visible");
  }
}

function validateMortgageInputs(totalMonths, graceMonths) {
  const amount = readNumber("#loan-amount");
  const years = readNumber("#loan-years");
  const firstRate = readOptionalRate(1);
  const secondRate = readOptionalRate(2);
  const thirdRate = readOptionalRate(3);

  if (amount <= 0) return "請輸入正確的貸款金額。";
  if (!Number.isInteger(years) || years < 1 || years > 40) return "貸款年限請輸入 1 到 40 年。";
  if (!Number.isInteger(graceMonths) || graceMonths < 0 || graceMonths > 84) return "寬限期請輸入 0 到 84 個月。";
  if (graceMonths >= totalMonths) return "寬限期不可大於或等於總貸款期數。";
  if (!firstRate.hasRate || !firstRate.hasStart) return "第一段利率與啟用月份必填。";
  if (firstRate.start !== 1) return "第一段啟用月份必須是 1。";
  if (firstRate.rate < 0) return "第一段利率不可小於 0。";

  const optionalRates = [secondRate, thirdRate];
  for (const segment of optionalRates) {
    if (segment.hasRate !== segment.hasStart) {
      return `第 ${segment.index} 段利率與啟用月份必須同時填寫，或同時留空。`;
    }
    if (segment.hasRate && segment.rate < 0) {
      return `第 ${segment.index} 段利率不可小於 0。`;
    }
    if (segment.hasStart && (!Number.isInteger(segment.start) || segment.start < 1 || segment.start > totalMonths)) {
      return `第 ${segment.index} 段啟用月份必須在 1 到 ${totalMonths} 之間。`;
    }
  }

  if (!secondRate.hasRate && thirdRate.hasRate) {
    return "第二段空白時，第三段不可填寫；請先填第二段，或清空第三段。";
  }

  const activeSegments = [firstRate, secondRate, thirdRate].filter((segment) => segment.hasRate);
  for (let index = 1; index < activeSegments.length; index += 1) {
    if (activeSegments[index].start <= activeSegments[index - 1].start) {
      return "各段利率的啟用月份必須由小到大，且不可相同。";
    }
  }

  return "";
}

function buildRateSegments(totalMonths) {
  const segments = [readOptionalRate(1), readOptionalRate(2), readOptionalRate(3)]
    .filter((segment) => segment.hasRate)
    .map((segment) => ({ rate: segment.rate, start: segment.start }));

  return segments.map((segment, index) => ({
    ...segment,
    end: (segments[index + 1]?.start || totalMonths + 1) - 1,
  }));
}

function buildPaymentSegments(totalMonths, graceMonths) {
  return buildRateSegments(totalMonths).flatMap((segment) => {
    if (graceMonths > 0 && segment.start <= graceMonths && segment.end > graceMonths) {
      return [
        { ...segment, end: graceMonths },
        { ...segment, start: graceMonths + 1 },
      ];
    }
    return [segment];
  });
}

function calculateMortgage() {
  const principalStart = readNumber("#loan-amount") * 10000;
  const totalMonths = Math.floor(readNumber("#loan-years") * 12);
  const graceMonths = Math.floor(readNumber("#grace-months"));

  const validationMessage = validateMortgageInputs(totalMonths, graceMonths);
  if (validationMessage) {
    showCalcError(validationMessage);
    return;
  }
  clearCalcError();

  const rateSegments = buildPaymentSegments(totalMonths, graceMonths);
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
      label: `${segment.start} - ${segment.end} 月${segment.end <= graceMonths ? "（寬限期）" : "（本息攤還）"}`,
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

initPropertyDiscovery();

function showConsultMessage(message, type) {
  if (!consultFormMessage) return;
  consultFormMessage.textContent = message;
  consultFormMessage.classList.remove("is-success", "is-error");
  consultFormMessage.classList.add("is-visible", type === "success" ? "is-success" : "is-error");
}

function clearConsultFieldErrors() {
  if (!consultForm) return;
  consultForm.querySelectorAll("[data-field-error]").forEach((element) => {
    element.textContent = "";
    element.classList.remove("is-visible");
  });
  consultForm.querySelectorAll("[aria-invalid='true']").forEach((element) => {
    element.removeAttribute("aria-invalid");
  });
}

function showConsultFieldErrors(fieldErrors) {
  if (!consultForm || !fieldErrors) return false;
  let hasFieldError = false;

  Object.entries(fieldErrors).forEach(([field, message]) => {
    if (!message) return;
    const errorElement = consultForm.querySelector(`[data-field-error="${field}"]`);
    const inputElement = consultForm.querySelector(`[name="${field}"]`);

    if (errorElement) {
      errorElement.textContent = String(message);
      errorElement.classList.add("is-visible");
      hasFieldError = true;
    }

    if (inputElement) {
      inputElement.setAttribute("aria-invalid", "true");
    }
  });

  return hasFieldError;
}

function readPayloadValue(payload, key) {
  return String(payload[key] || "").trim();
}

function buildInquiryMessage(payload) {
  const serviceType = readPayloadValue(payload, "service_type");
  const serviceLabel = SERVICE_TYPE_LABELS[serviceType] || serviceType || "未選擇";
  const originalMessage =
    readPayloadValue(payload, "message") ||
    readPayloadValue(payload, "notes") ||
    readPayloadValue(payload, "requirement");

  return [
    `服務需求：${serviceLabel}`,
    `需求地區：${readPayloadValue(payload, "area") || "未填寫"}`,
    `預算或委售金額：${readPayloadValue(payload, "budget") || "未填寫"}`,
    `方便聯絡時段：${readPayloadValue(payload, "contact_time") || "未填寫"}`,
    `Line ID：${readPayloadValue(payload, "line_id") || "未填寫"}`,
    `需求說明：${originalMessage || "使用者由首頁服務表單送出諮詢需求。"}`,
  ].join("\n");
}

function buildInquiryPayload(formData) {
  const rawPayload = Object.fromEntries(formData.entries());

  return {
    form_type: "service-form",
    name: readPayloadValue(rawPayload, "name"),
    phone: readPayloadValue(rawPayload, "phone"),
    email: readPayloadValue(rawPayload, "email"),
    source_page: `${window.location.pathname}${window.location.hash}`,
    website: readPayloadValue(rawPayload, "website"),
    turnstile_token: readPayloadValue(rawPayload, "turnstile_token"),
    message: buildInquiryMessage(rawPayload),
  };
}

consultForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = consultForm.querySelector("button[type='submit']");
  const formData = new FormData(consultForm);
  const payload = buildInquiryPayload(formData);

  clearConsultFieldErrors();
  submitButton.disabled = true;
  submitButton.textContent = "送出中...";

  try {
    const response = await fetch("/api/public/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (showConsultFieldErrors(result.field_errors)) {
        showConsultMessage(result.error || "請確認欄位內容後再送出。", "error");
        return;
      }
      throw new Error(result.error || result.message || "送出失敗，請稍後再試。");
    }

    consultForm.reset();
    clearConsultFieldErrors();
    showConsultMessage("已收到您的需求，我們會盡快與您聯絡。", "success");
  } catch (error) {
    showConsultMessage(error.message || "送出失敗，請稍後再試。", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "送出服務需求";
  }
});
