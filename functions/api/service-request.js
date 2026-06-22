const SERVICE_TYPES = new Set(["buy", "sell", "loan_tax", "factory_land", "other"]);

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

  return jsonResponse({
    ok: true,
    id: result.meta?.last_row_id || null,
    message: "已收到您的需求。",
  });
}

export function onRequestGet() {
  return jsonResponse({ message: "請由網站表單送出服務需求。" }, 405);
}
