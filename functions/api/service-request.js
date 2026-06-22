const SERVICE_TYPES = new Set(["buy", "sell", "loan_tax", "factory_land", "other"]);
const SERVICE_TYPE_LABELS = {
  buy: "買屋 / 買地",
  sell: "賣屋 / 賣地 / 委託銷售",
  loan_tax: "貸款 / 稅務提醒",
  factory_land: "廠房 / 土地需求",
  other: "其他諮詢",
};

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fieldValue(value) {
  return value || "未填寫";
}

function buildEmailContent(data, createdAt, requestMeta, d1Id) {
  const serviceLabel = SERVICE_TYPE_LABELS[data.service_type] || data.service_type;
  const fields = [
    ["姓名", data.name],
    ["電話", data.phone],
    ["LINE ID", data.line_id],
    ["Email", data.email],
    ["服務項目", serviceLabel],
    ["區域", data.area],
    ["預算", data.budget],
    ["方便聯絡時段", data.contact_time],
    ["需求說明", data.message],
    ["建立時間", createdAt],
    ["user_agent", requestMeta.userAgent],
    ["ip_address", requestMeta.ip],
    ["D1 新增 id", d1Id],
  ];

  const text = [
    "阿勇服務表單收到新需求：",
    "",
    ...fields.map(([label, value]) => `${label}：${fieldValue(value)}`),
  ].join("\n");

  const rows = fields.map(([label, value]) => `
    <tr>
      <th style="width: 140px; padding: 10px 12px; text-align: left; background: #f6f0e7; border: 1px solid #e5d8c8;">${escapeHtml(label)}</th>
      <td style="padding: 10px 12px; border: 1px solid #e5d8c8; white-space: pre-wrap;">${escapeHtml(fieldValue(value))}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #15233b; line-height: 1.7;">
      <h2 style="margin: 0 0 16px;">阿勇服務表單收到新需求</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 760px; font-size: 16px;">
        ${rows}
      </table>
    </div>
  `;

  return { html, text };
}

async function sendNotificationEmail(env, data, createdAt, requestMeta, d1Id) {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  if (!env.NOTIFY_EMAIL_FROM) {
    throw new Error("NOTIFY_EMAIL_FROM is not configured.");
  }

  if (!env.NOTIFY_EMAIL_TO) {
    throw new Error("NOTIFY_EMAIL_TO is not configured.");
  }

  const { html, text } = buildEmailContent(data, createdAt, requestMeta, d1Id);
  const payload = {
    from: env.NOTIFY_EMAIL_FROM,
    to: [env.NOTIFY_EMAIL_TO],
    subject: "【阿勇不動產顧問】新服務需求",
    html,
    text,
  };

  if (data.email) {
    payload.reply_to = data.email;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${detail}`);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return jsonResponse({ message: "資料庫尚未設定完成，請稍後再試。" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "表單格式不正確，請重新送出。" }, 400);
  }

  const data = {
    name: cleanText(body.name, 80),
    phone: cleanText(body.phone, 40),
    line_id: cleanText(body.line_id, 80),
    email: cleanText(body.email, 120),
    service_type: cleanText(body.service_type, 40),
    area: cleanText(body.area, 120),
    budget: cleanText(body.budget, 120),
    contact_time: cleanText(body.contact_time, 120),
    message: cleanText(body.message, 1200),
  };

  if (!data.name || !data.phone || !data.service_type) {
    return jsonResponse({ message: "請填寫姓名、手機與服務需求。" }, 400);
  }

  if (!body.consent) {
    return jsonResponse({ message: "請先勾選同意聯絡與服務使用資料。" }, 400);
  }

  if (!SERVICE_TYPES.has(data.service_type)) {
    return jsonResponse({ message: "服務需求選項不正確，請重新選擇。" }, 400);
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return jsonResponse({ message: "Email 格式不正確。" }, 400);
  }

  const userAgent = request.headers.get("user-agent") || "";
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "";
  const createdAt = new Date().toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
  });

  const result = await env.DB.prepare(`
    INSERT INTO service_requests (
      name,
      phone,
      line_id,
      email,
      service_type,
      area,
      budget,
      contact_time,
      message,
      source,
      status,
      user_agent,
      ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'good.m2.cc', 'new', ?, ?)
  `).bind(
    data.name,
    data.phone,
    data.line_id,
    data.email,
    data.service_type,
    data.area,
    data.budget,
    data.contact_time,
    data.message,
    userAgent.slice(0, 300),
    ip.slice(0, 80)
  ).run();

  const d1Id = result.meta?.last_row_id || null;
  let emailSent = false;
  try {
    await sendNotificationEmail(env, data, createdAt, { userAgent, ip }, d1Id);
    emailSent = true;
  } catch (error) {
    console.error("Service form notification failed", error);
  }

  return jsonResponse({
    ok: true,
    id: d1Id,
    emailSent,
    message: "已收到您的需求。",
  });
}

export function onRequestGet() {
  return jsonResponse({ message: "請由網站表單送出服務需求。" }, 405);
}
