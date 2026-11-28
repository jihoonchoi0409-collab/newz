// newz admin: preview drafts before they go public at 08:45 KST.
// Local mode (python -m newz serve): live data + approve/hold buttons via 127.0.0.1 API.
// Hosted mode: drafts are AES-256-GCM encrypted in bundle.json; decrypt with the admin passphrase.
import { el, mountDeck, getLang, setLang, fmtDate, langToggle, themeToggle } from "../app.js";

const A = {
  ko: {
    tagline: "admin · 게시 전 검토", local: "로컬 · 실시간", hosted: "호스팅 · 암호화",
    unlockTitle: "관리자 미리보기", unlockSub: "매일 07:00에 생성된 초안을 08:45 게시 전에 확인합니다.",
    passPh: "관리자 패스프레이즈", open: "열기", show: "보기", hide: "숨기기",
    wrongPass: "패스프레이즈가 맞지 않습니다. PC의 .env 파일에 있는 NEWZ_ADMIN_PASSPHRASE= 뒤의 값을 그대로 입력하세요 (대소문자 구분).",
    noBundle: "아직 미리볼 초안 파일이 없습니다. 다음 07:00 생성 후 다시 열어 보세요.",
    failed: "실패", passed: "지남", until: (h, m) => `게시까지 ${h}시간 ${m}분`, past: "게시 시각 지남",
    none: "검토할 카드가 없습니다.", queue: "업데이트 대기열", status: "상태", publishAt: "게시 예정", created: "생성",
    reviewNote: "자동 검증을 통과하지 못해 자동 게시되지 않습니다. 내용을 확인한 뒤 승인하면 게시됩니다.",
    keep: "승인 유지", approve: "승인 → 08:45 게시", hold: "보류 (게시 안 함)", now: "지금 게시", unpub: "게시 취소",
    confirmNow: "지금 바로 게시할까요?", confirmUnpub: "게시를 내릴까요?",
    remote: "승인/보류: ", remoteFallback: "GitHub Actions의 newz-admin 워크플로",
    fcPass: "✓ 팩트체크 통과", fcFail: "! 팩트체크 미통과", facts: "검증된 사실 / 거부된 사실",
    srcs: "사용 출처 / 수집 출처", rounds: "작성 라운드", sources: "출처", reasons: "실패 사유", slide: "슬라이드",
    st: { scheduled: "게시 예정", needs_review: "검토 필요", held: "보류", published: "게시됨", failed: "실패" },
  },
  en: {
    tagline: "admin · pre-publish review", local: "local · live", hosted: "hosted · encrypted",
    unlockTitle: "Admin preview", unlockSub: "Review the draft generated at 07:00 before it goes live at 08:45 KST.",
    passPh: "admin passphrase", open: "Open", show: "Show", hide: "Hide",
    wrongPass: "Wrong passphrase. Enter the value after NEWZ_ADMIN_PASSPHRASE= in the .env file on your PC (case-sensitive).",
    noBundle: "There is no draft file to preview yet. Try again after the next 07:00 run.",
    failed: "failed", passed: "past", until: (h, m) => `${h}h ${m}m until publish`, past: "publish time passed",
    none: "No decks to review.", queue: "Update queue", status: "Status", publishAt: "Publishes at", created: "Generated",
    reviewNote: "This deck failed automatic verification, so it will not auto-publish. It goes live only if you approve it.",
    keep: "Keep approved", approve: "Approve → publish 08:45", hold: "Hold (don't publish)", now: "Publish now", unpub: "Unpublish",
    confirmNow: "Publish this deck right now?", confirmUnpub: "Take this deck offline?",
    remote: "Approve / hold: ", remoteFallback: "the newz-admin workflow in GitHub Actions",
    fcPass: "✓ Fact-check passed", fcFail: "! Fact-check failed", facts: "Verified / rejected facts",
    srcs: "Sources used / fetched", rounds: "Writing rounds", sources: "Sources", reasons: "Failure reasons", slide: "slide",
    st: { scheduled: "scheduled", needs_review: "needs review", held: "held", published: "published", failed: "failed" },
  },
};

const root = document.getElementById("admin");
const modeChip = document.getElementById("mode");
const H = { "X-Newz-Admin": "1" };
let lang = getLang();
let local = false;
let unlocked = false;
let repo = "";
let state = { decks: [], queue: [], sel: null };
const t = () => A[lang];

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function decrypt(bundle, pass) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(bundle.salt), iterations: bundle.iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(bundle.iv) }, key, b64(bundle.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

function header() {
  document.documentElement.lang = lang;
  document.getElementById("tagline").textContent = t().tagline;
  modeChip.textContent = local ? t().local : t().hosted;
}

function rerender() {
  header();
  if (local || unlocked) draw(); else unlockForm();
}

async function init() {
  setLang(lang);
  document.getElementById("controls").replaceChildren(langToggle((l) => { lang = l; rerender(); }), themeToggle());
  try {
    const r = await fetch("/api/admin/decks", { headers: H, cache: "no-store" });
    if (r.ok) { local = true; const j = await r.json(); state.decks = j.decks; state.queue = j.queue || []; }
  } catch { /* hosted */ }
  try { const idx = await (await fetch("../data/index.json", { cache: "no-cache" })).json(); repo = idx.site?.repo || ""; } catch { /* none */ }
  rerender();
}

function cleanPass(v) {
  // tolerate pasted whitespace / the whole .env line
  return v.trim().replace(/^NEWZ_ADMIN_PASSPHRASE\s*=\s*/, "").replace(/^["']|["']$/g, "").trim();
}

function unlockForm() {
  const input = el("input", { type: "password", placeholder: t().passPh, autocomplete: "current-password",
    autocapitalize: "off", autocorrect: "off", spellcheck: "false" });
  const eye = el("button", { class: "btn", type: "button", text: t().show, onclick: () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    eye.textContent = showing ? t().show : t().hide;
  } });
  const err = el("div", { class: "err" });
  const form = el("form", { class: "unlock", onsubmit: async (e) => {
    e.preventDefault();
    err.textContent = "";
    let bundle;
    try {
      const r = await fetch("bundle.json", { cache: "no-store" });
      if (!r.ok) throw new Error("missing");
      bundle = await r.json();
    } catch { err.textContent = t().noBundle; return; }
    const pass = cleanPass(input.value);
    try {
      const data = await decrypt(bundle, pass);
      state.decks = data.decks || [];
      unlocked = true;
      try { sessionStorage.setItem("newz.pass", pass); } catch { /* ignore */ }
      draw();
    } catch {
      try { sessionStorage.removeItem("newz.pass"); } catch { /* ignore */ }
      err.textContent = t().wrongPass;
    }
  } }, el("h2", { text: t().unlockTitle }),
    el("p", { class: "sub", text: t().unlockSub }),
    el("div", { class: "passrow" }, input, eye),
    el("button", { class: "btn primary", type: "submit", text: t().open }), err);
  root.replaceChildren(form);
  try { const p = sessionStorage.getItem("newz.pass"); if (p) { input.value = p; form.requestSubmit(); } } catch { /* ignore */ }
}

async function act(id, action) {
  const r = await fetch(`/api/admin/${id}/${action}`, { method: "POST", headers: H });
  if (!r.ok) { alert(`${t().failed}: ${r.status}`); return; }
  const j = await (await fetch("/api/admin/decks", { headers: H, cache: "no-store" })).json();
  state.decks = j.decks; draw();
}

function countdown(iso) {
  const ms = new Date(iso) - new Date();
  if (ms <= 0) return t().past;
  return t().until(Math.floor(ms / 3.6e6), Math.floor((ms % 3.6e6) / 6e4));
}

const stLabel = (s) => t().st[s] || s;

function draw() {
  const decks = state.decks;
  if (!decks.length) { root.replaceChildren(el("div", { class: "empty", style: "margin-top:40px", text: t().none })); return; }
  if (!state.sel || !decks.find((d) => d.id === state.sel)) state.sel = (decks.find((d) => d.status !== "published") || decks[0]).id;
  const list = el("div", { class: "list" }, ...decks.map((d) => el("button", { class: "item", type: "button", "aria-current": String(d.id === state.sel),
    onclick: () => { state.sel = d.id; draw(); } },
    el("div", { class: "d" }, el("span", { text: fmtDate(d.date, lang) }), el("span", { class: `st ${d.status}`, text: stLabel(d.status) })),
    el("div", { class: "t", text: d.title?.[lang] || d.title?.ko || "" }))));
  if (state.queue.length) list.append(el("div", { class: "panel" }, el("h3", { text: `${t().queue} (${state.queue.length})` }),
    ...state.queue.map((q) => el("div", { class: "row" }, el("span", { text: q.company }), el("span", { text: q.priority })))));
  const d = decks.find((x) => x.id === state.sel);
  root.replaceChildren(el("div", { class: "adm" }, list, detail(d)));
}

function detail(d) {
  const T = t();
  const holder = el("div");
  const fc = d.factcheck || {};
  const side = el("div");
  const statusPanel = el("div", { class: "panel" }, el("h3", { text: T.status }),
    el("div", { class: "row" }, el("span", { text: "status" }), el("span", { class: `st ${d.status}`, text: stLabel(d.status) })),
    el("div", { class: "row" }, el("span", { text: T.publishAt }), el("span", { text: `${(d.publish_at || "").replace("T", " ").slice(0, 16)} · ${countdown(d.publish_at)}` })),
    el("div", { class: "row" }, el("span", { text: T.created }), el("span", { text: `${(d.created_at || "").replace("T", " ").slice(0, 16)} · ${d.generator?.model || ""} (${d.generator?.backend || ""})` })));
  if (d.status === "needs_review") statusPanel.append(el("p", { class: "sub", style: "font-size:14px;margin:10px 0 0", text: T.reviewNote }));
  const acts = el("div", { class: "actions" });
  if (local) {
    if (d.status !== "published" && d.status !== "failed") acts.append(el("button", { class: "btn primary", type: "button", onclick: () => act(d.id, "approve"), text: d.status === "scheduled" ? T.keep : T.approve }));
    if (["scheduled", "needs_review"].includes(d.status)) acts.append(el("button", { class: "btn", type: "button", onclick: () => act(d.id, "hold"), text: T.hold }));
    if (["scheduled", "needs_review", "held"].includes(d.status)) acts.append(el("button", { class: "btn", type: "button", onclick: () => { if (confirm(T.confirmNow)) act(d.id, "publish-now"); }, text: T.now }));
    if (d.status === "published") acts.append(el("button", { class: "btn", type: "button", onclick: () => { if (confirm(T.confirmUnpub)) act(d.id, "unpublish"); }, text: T.unpub }));
  } else {
    const url = repo ? `https://github.com/${repo}/actions/workflows/newz-admin.yml` : null;
    acts.append(el("p", { class: "sub", style: "font-size:14px;margin:0" }, T.remote,
      url ? el("a", { href: url, target: "_blank", rel: "noopener", text: "GitHub Actions → newz-admin → Run workflow" }) : T.remoteFallback,
      ` (date: ${d.id}, action: approve | hold | unpublish | publish-now)`));
  }
  statusPanel.append(acts);
  const fcPanel = el("div", { class: "panel" }, el("h3", { text: fc.passed ? T.fcPass : T.fcFail }),
    el("div", { class: "row" }, el("span", { text: T.facts }), el("span", { text: `${fc.facts_verified ?? "-"} / ${fc.facts_rejected ?? "-"}` })),
    el("div", { class: "row" }, el("span", { text: T.srcs }), el("span", { text: `${fc.sources_used ?? "-"} / ${fc.sources_fetched ?? "-"}` })),
    el("div", { class: "row" }, el("span", { text: T.rounds }), el("span", { text: String(fc.rounds ?? "-") })),
    fc.summary ? el("p", { class: "sub", style: "font-size:14px;margin:10px 0 0", text: fc.summary }) : null,
    ...(fc.deterministic_issues || []).map((i) => el("div", { class: "issue blocker" }, el("b", { text: `code · ${T.slide} ${i.slide} · ${i.problem}` }), el("div", { text: i.explanation }))),
    ...(fc.issues || []).map((i) => el("div", { class: `issue ${i.severity}` }, el("b", { text: `${i.severity} · ${T.slide} ${i.slide} · ${i.problem}` }),
      el("div", { text: i.text }), el("div", { class: "sub", style: "font-size:13px;margin:4px 0 0", text: `${i.explanation} → ${i.fix}` }))));
  const srcPanel = el("div", { class: "panel" }, el("h3", { text: `${T.sources} (${(d.sources || []).length})` }),
    ...(d.sources || []).map((s) => el("div", { class: "row" }, el("span", { text: `[${s.n}] ${s.publisher}` }), el("span", { text: s.tier }))));
  side.append(statusPanel, fcPanel, srcPanel);
  if (d.status === "failed") side.append(el("div", { class: "panel" }, el("h3", { text: T.reasons }), ...(d.reason || []).map((r) => el("div", { class: "issue blocker", text: r || "" }))));
  const wrap = el("div", { class: "detail" }, holder, side);
  if ((d.slides || []).length) queueMicrotask(() => mountDeck(holder, d, { lang }));
  return wrap;
}

init();
