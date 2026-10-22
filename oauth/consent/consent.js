import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2?bundle";

const PROJECT_URL = "https://hkzzpfrifcbvgvzmrwvr.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_ioyEqPGBHJAvgq1B7Z3slA_D8wK1UvM";
const sb = createClient(PROJECT_URL, PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
const el = id => document.getElementById(id);
const authorizationId = new URL(window.location.href).searchParams.get("authorization_id");

function show(name) {
  for (const section of ["loading", "login", "consent"]) el(section).hidden = section !== name;
}
function fail(message) { el("error").textContent = String(message ?? "Неизвестная ошибка"); }
function safeReturn(url) {
  const target = new URL(url);
  if (target.protocol !== "https:" ||
      target.hostname !== "chatgpt.com" ||
      !target.pathname.startsWith("/connector/oauth/")) {
    throw Error("Заблокирован неподтверждённый адрес возврата. Разрешён только chatgpt.com.");
  }
  window.location.assign(target.href);
}
async function loadDetails() {
  const {data, error} = await sb.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error) throw error;
  if (!data) throw Error("Запрос авторизации не найден или истёк.");
  if (!("authorization_id" in data)) {
    safeReturn(data.redirect_url);
    return;
  }
  const redirect = new URL(data.redirect_uri);
  if (redirect.hostname !== "chatgpt.com" ||
      redirect.protocol !== "https:" ||
      !redirect.pathname.startsWith("/connector/oauth/")) {
    throw Error("Запрос пришёл не от официального адреса ChatGPT. Доступ не разрешён.");
  }
  el("app-name").textContent = data.client?.name || "Неизвестный клиент";
  el("redirect-uri").textContent = data.redirect_uri || "";
  el("scopes").textContent = data.scope || "По умолчанию";
  show("consent");
}
el("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  fail("");
  el("signin").disabled = true;
  try {
    const email = el("email").value.trim();
    const password = el("password").value;
    const {data, error} = await sb.auth.signInWithPassword({email,password});
    el("password").value = "";
    if (error) throw error;
    if (!data?.user) throw Error("Вход не подтверждён.");
    await loadDetails();
  } catch(err) {
    show("login");
    fail(err.message);
  } finally {
    el("signin").disabled = false;
  }
});
async function decide(approve) {
  fail("");
  el("approve").disabled = true;
  el("deny").disabled = true;
  try {
    const {data, error} = approve
      ? await sb.auth.oauth.approveAuthorization(authorizationId)
      : await sb.auth.oauth.denyAuthorization(authorizationId);
    if (error) throw error;
    safeReturn(data.redirect_url);
  } catch(err) {
    fail(err.message);
    el("approve").disabled = false;
    el("deny").disabled = false;
  }
}
el("approve").addEventListener("click", () => decide(true));
el("deny").addEventListener("click", () => decide(false));

if (!authorizationId || !/^[a-zA-Z0-9_-]{8,128}$/.test(authorizationId)) {
  show("loading");
  el("loading").textContent = "Открой подключение MyNow Mail через ChatGPT.";
} else {
  show("login");
}
