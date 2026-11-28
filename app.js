// newz dashboard - deck renderer + public site.
// All model-written text is inserted with textContent (never innerHTML); links come only
// from deck.sources / deck.media and are checked to be http(s).

const T = {
  ko: {
    today: "오늘의 카드", archive: "지난 카드뉴스", all: "전체", ai: "AI", defense: "방산", kr: "국내", global: "해외",
    update: "업데이트", search: "회사 · 키워드 검색", cards: "카드", scroll: "스크롤",
    open: "크게 보기", back: "← 전체 목록", prev: "← 이전", next: "다음 →", swipe: "옆으로 넘겨보세요",
    sources: "출처", evidence: "이 카드의 근거", evidenceHint: "카드 속 사실은 아래 원문 문장과 대조해 검증했습니다.",
    verified: "팩트체크 통과", pending: "검토 대기 중", facts: "검증된 사실", srcs: "출처", checked: "원문 대조 완료",
    credits: "이미지 · 영상", disclaimer: "newz는 AI 에이전트가 공개된 신뢰 출처만으로 작성하며, 모든 수치와 인용을 원문과 대조해 검증한 뒤 게시합니다. 투자 권유가 아닙니다.",
    noDeck: "아직 게시된 카드뉴스가 없어요. 매일 오전 8:45에 새 카드가 올라옵니다.", noMatch: "조건에 맞는 카드가 없어요.",
    nextAt: "다음 카드: 매일 오전 8:45", watch: "영상 보기", related: "이전 카드", tiers: { official: "공식", tier1: "주요 매체", tier2: "매체", tier3: "기타" },
    kinds: { hook: "왜 지금?", story: "스토리", people: "창업자", stats: "숫자로 보기", timeline: "타임라인", lesson: "배울 점",
      vision: "다음 이야기", video: "영상", takeaway: "한 줄 정리", compare: "비교", quote: "" },
    types: { company_story: "기업 스토리", founder_story: "창업자 스토리", funding: "투자 · 펀딩", lessons: "배울 점", update: "업데이트", theme: "테마" },
    loading: "불러오는 중…", about: "newz 소개", aboutText: "국내외 AI · 방산 스타트업의 창업 스토리, 투자, 배울 점, 근황과 비전을 하루 한 장의 카드뉴스로 전합니다.",
    method: "검증 방식", methodText: "에이전트가 원문을 직접 수집해 사실마다 원문 문장을 붙이고, 코드와 별도의 검증 모델이 이중으로 대조합니다. 근거가 부족한 문장은 게시되지 않습니다.",
    rss: "RSS 구독", source: "원문",
  },
  en: {
    today: "Today's deck", archive: "Archive", all: "All", ai: "AI", defense: "Defense", kr: "Korea", global: "Global",
    update: "Updates", search: "Search companies or keywords", cards: "Cards", scroll: "Scroll",
    open: "Open", back: "← All decks", prev: "← Previous", next: "Next →", swipe: "Swipe to read",
    sources: "Sources", evidence: "Evidence for this card", evidenceHint: "Every fact on this card was checked against these exact source sentences.",
    verified: "Fact-checked", pending: "Awaiting review", facts: "verified facts", srcs: "sources", checked: "matched to originals",
    credits: "Images & video", disclaimer: "newz is written by an AI agent from public, credible sources. Every figure and quote is matched against the original text before publishing. Not investment advice.",
    noDeck: "No decks published yet. A new deck goes live every day at 8:45 KST.", noMatch: "No decks match these filters.",
    nextAt: "Next deck: daily at 8:45 KST", watch: "Watch", related: "Earlier deck", tiers: { official: "official", tier1: "major outlet", tier2: "outlet", tier3: "other" },
    kinds: { hook: "Why now", story: "Story", people: "Founders", stats: "By the numbers", timeline: "Timeline", lesson: "Lessons",
      vision: "What's next", video: "Watch", takeaway: "Takeaway", compare: "Compare", quote: "" },
    types: { company_story: "Company story", founder_story: "Founder story", funding: "Funding", lessons: "Lessons", update: "Update", theme: "Theme" },
    loading: "Loading…", about: "About newz", aboutText: "One card-news deck a day on AI and defense-tech startups in Korea and worldwide: founding stories, funding, lessons, latest moves and vision.",
    method: "How we verify", methodText: "The agent collects the original articles itself, attaches the exact source sentence to every fact, and code plus an independent checker model verify each card. Unsupported sentences are never published.",
    rss: "RSS", source: "Source",
  },
};

// ------------------------------------------------------------ helpers
export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}
const safeUrl = (u) => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : null);
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
export function getLang() {
  const q = new URLSearchParams(location.search).get("lang");  // ?lang=en share links
  if (q === "ko" || q === "en") return q;
  const l = store.get("newz.lang", (navigator.language || "ko").startsWith("ko") ? "ko" : "en");
  return l === "en" ? "en" : "ko";
}
export function setLang(l) {
  const u = new URL(location.href);
  if (u.searchParams.has("lang")) { u.searchParams.delete("lang"); history.replaceState(null, "", u); }
  store.set("newz.lang", l); document.documentElement.lang = l; document.dispatchEvent(new Event("newz:lang")); }
const fmtDate = (iso, lang) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return lang === "ko" ? `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} (${"일월화수목금토"[dt.getUTCDay()]})`
    : dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", weekday: "short", timeZone: "UTC" });
};
const sectorClass = (deck) => ((deck.sector || [])[0] === "defense" ? "defense" : "ai");

// ------------------------------------------------------------ deck viewer
export function mountDeck(root, deck, opts = {}) {
  let lang = opts.lang || getLang();
  const qv = new URLSearchParams(location.search).get("view");
  let mode = qv === "scroll" || qv === "cards" ? qv : store.get("newz.view", "cards");
  let index = 0;
  const factById = Object.fromEntries((deck.facts || []).map((f) => [f.id, f]));
  const srcById = Object.fromEntries((deck.sources || []).map((s) => [s.id, s]));
  const mediaById = Object.fromEntries((deck.media || []).map((m) => [m.id, m]));
  const slides = deck.slides || [];

  const viewer = el("div", { class: "viewer" });
  const track = el("div", { class: "track", tabindex: "0", "aria-roledescription": "carousel", "aria-label": deck.title?.[lang] || "deck" });
  const count = el("span", { class: "count" });
  const seg = el("div", { class: "seg", role: "group", "aria-label": "view" });
  const bCards = el("button", { type: "button", onclick: () => setMode("cards") });
  const bScroll = el("button", { type: "button", onclick: () => setMode("scroll") });
  seg.append(bCards, bScroll);
  const bar = el("div", { class: "viewer-bar" }, count, el("span", { class: "spacer" }), seg);
  const prev = el("button", { class: "nav prev", type: "button", "aria-label": "previous", onclick: () => go(index - 1) }, "‹");
  const next = el("button", { class: "nav next", type: "button", "aria-label": "next", onclick: () => go(index + 1) }, "›");
  const dots = el("div", { class: "dots" });
  viewer.append(bar, el("div", { style: "position:relative" }, track, prev, next), dots);
  root.replaceChildren(viewer);

  function sourceNums(cites) {
    const ns = new Set();
    for (const c of cites || []) { const f = factById[c]; const s = f && srcById[f.source_id]; if (s) ns.add(s.n); }
    return [...ns].sort((a, b) => a - b);
  }

  function openEvidence(cites) {
    const t = T[lang];
    const list = (cites || []).map((c) => factById[c]).filter(Boolean);
    const back = el("div", { class: "sheet-back", onclick: (e) => { if (e.target === back) back.remove(); } });
    const close = el("button", { class: "close", type: "button", "aria-label": "close", onclick: () => back.remove() }, "✕");
    const sheet = el("div", { class: "sheet", role: "dialog", "aria-modal": "true" }, close,
      el("h4", { text: t.evidence }), el("p", { class: "hint", text: t.evidenceHint }),
      ...list.map((f) => {
        const s = srcById[f.source_id] || {};
        const href = safeUrl(s.url);
        return el("div", { class: "ev" },
          el("div", { class: "claim", text: f.claim }),
          el("blockquote", { text: f.quote }),
          el("div", { class: "src" }, `[${s.n ?? "?"}] `, href ? el("a", { href, target: "_blank", rel: "noopener noreferrer", text: s.publisher || href }) : (s.publisher || ""),
            s.published ? ` · ${String(s.published).slice(0, 10)}` : "", s.tier ? ` · ${t.tiers[s.tier] || s.tier}` : ""));
      }));
    back.append(sheet);
    document.body.append(back);
    close.focus();
    const onKey = (e) => { if (e.key === "Escape") { back.remove(); document.removeEventListener("keydown", onKey); } };
    document.addEventListener("keydown", onKey);
  }

  function foot(i, s) {
    const t = T[lang];
    const nums = sourceNums(s.cites);
    return el("div", { class: "foot" }, el("span", { class: "brand", text: "newz" }), `${i + 1} / ${slides.length}`,
      el("span", { class: "spacer" }),
      nums.length ? el("button", { class: "cite", type: "button", onclick: () => openEvidence(s.cites), text: `${t.sources} ${nums.join("·")}` }) : null);
  }

  function imageBlock(mid, cls = "media") {
    const m = mediaById[mid];
    if (!m || m.kind !== "image") return null;
    return el("div", { class: cls }, el("img", { src: m.src, alt: m.alt || "", loading: "lazy", decoding: "async" }),
      el("span", { class: "credit", text: m.credit }));
  }

  function renderSlide(s, i) {
    const t = T[lang];
    const L = s[lang] || {};
    const card = el("section", { class: `card ${sectorClass(deck)} ${s.kind}`, "aria-roledescription": "slide", "aria-label": `${i + 1} / ${slides.length}` });
    if (s.kind === "cover") {
      const m = mediaById[s.media_id];
      const bg = m && m.kind === "image" ? el("div", { class: "bg" }, el("img", { src: m.src, alt: m.alt || "" })) : el("div", { class: "bg none" });
      const tags = el("div", { class: "tags" },
        ...(deck.sector || []).map((x) => el("span", { text: t[x] || x })),
        ...(deck.region || []).map((x) => el("span", { class: "alt", text: t[x] || x })),
        deck.type ? el("span", { class: "alt", text: t.types[deck.type] || deck.type }) : null);
      card.append(bg, el("div", { class: "top-row" }, el("span", { class: "brand", text: "newz" }), el("span", { class: "date", text: fmtDate(deck.date, lang) })),
        m && m.kind === "image" ? el("span", { class: "credit", text: m.credit }) : null,
        el("div", { class: "pad" }, tags, el("h2", { text: L.heading || deck.title?.[lang] || "" }),
          el("p", { class: "subtitle", text: L.body || deck.subtitle?.[lang] || "" }),
          el("div", { class: "swipe", text: `${t.swipe}  →` })), foot(i, s));
      return card;
    }
    if (s.kind === "sources") return renderSources(card, i);
    const pad = el("div", { class: "pad" });
    const kicker = t.kinds[s.kind];
    if (s.kind === "quote") {
      const q = L.quote || {};
      const other = (s[lang === "ko" ? "en" : "ko"] || {}).quote || {};
      pad.append(el("div", { class: "mark", text: "“" }), el("blockquote", { text: q.text || "" }),
        other.text && other.text !== q.text ? el("div", { class: "orig", text: other.text }) : null,
        el("div", { class: "who" }, el("b", { text: q.speaker || "" })));
      card.append(pad, foot(i, s));
      return card;
    }
    if (s.kind === "video") {
      const m = mediaById[s.media_id];
      const player = el("div", { class: "player" });
      if (m && m.kind === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(m.src)) {
        const play = el("button", { type: "button", "aria-label": t.watch, onclick: () => {
          player.replaceChildren(el("iframe", { src: `https://www.youtube-nocookie.com/embed/${m.src}?autoplay=1&rel=0`, title: m.title || "video",
            allow: "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture", allowfullscreen: true, referrerpolicy: "strict-origin-when-cross-origin" }));
        } }, el("span", { text: "▶" }));
        player.append(el("img", { src: `https://i.ytimg.com/vi/${m.src}/hqdefault.jpg`, alt: m.title || "", loading: "lazy" }), play);
      }
      pad.append(el("div", { class: "kicker", text: kicker }), el("h3", { text: L.heading || "" }), player,
        L.body ? el("p", { text: L.body }) : null,
        m ? el("div", { class: "vt", text: `${m.title} · ${m.credit.replace(/^Video: /, "")}` }) : null);
      card.append(pad, foot(i, s));
      return card;
    }
    const hasData = (L.stats || []).length || (L.timeline || []).length;
    const img = !hasData && s.kind !== "lesson" ? imageBlock(s.media_id) : null;
    if (img) pad.append(img);
    if (kicker) pad.append(el("div", { class: "kicker", text: kicker }));
    if (L.heading) pad.append(el("h3", { text: L.heading }));
    if ((L.stats || []).length) {
      const n = L.stats.length;
      pad.append(el("div", { class: `statgrid ${n === 1 ? "one" : n === 3 ? "three" : ""}` },
        ...L.stats.slice(0, 4).map((x) => el("div", { class: "stat" }, el("div", { class: "v", text: x.value }), el("div", { class: "l", text: x.label })))));
      if (L.body) pad.append(el("p", { style: "margin-top:4cqw;font-size:3.6cqw;color:var(--card-muted)", text: L.body }));
    } else if ((L.timeline || []).length) {
      pad.append(el("ol", { class: "tl" }, ...L.timeline.slice(0, 6).map((x) => el("li", {}, el("span", { class: "when", text: x.when }), el("span", { class: "what", text: x.what })))));
    } else {
      if (L.body) pad.append(el("p", { text: L.body }));
      if ((L.bullets || []).length) pad.append(el(s.kind === "lesson" ? "ol" : "ul", {}, ...L.bullets.map((b) => el("li", { text: b }))));
    }
    card.append(pad, foot(i, s));
    return card;
  }

  function renderSources(card, i) {
    const t = T[lang];
    const fc = deck.factcheck || {};
    const pad = el("div", { class: "pad" });
    pad.append(el("div", { class: "kicker", text: t.sources }),
      el("div", { class: `fc ${fc.passed ? "" : "warn"}` }, el("span", { style: "font-size:7cqw", text: fc.passed ? "✓" : "!" }),
        el("div", {}, el("b", { text: fc.passed ? t.verified : t.pending }),
          `${t.facts} ${fc.facts_verified ?? (deck.facts || []).length} · ${t.srcs} ${(deck.sources || []).length} · ${t.checked}`)),
      el("ol", {}, ...(deck.sources || []).map((s) => {
        const href = safeUrl(s.url);
        return el("li", { "data-n": s.n }, href ? el("a", { href, target: "_blank", rel: "noopener noreferrer", text: s.title || s.publisher }) : (s.title || ""),
          el("br"), `${s.publisher || ""}${s.published ? " · " + String(s.published).slice(0, 10) : ""}`,
          el("span", { class: "tier", text: t.tiers[s.tier] || s.tier }));
      })));
    const media = deck.media || [];
    if (media.length) {
      pad.append(el("h4", { text: t.credits }), el("div", { class: "credits" }, ...media.map((m) => {
        const href = safeUrl(m.source_url);
        return el("div", {}, "· ", href ? el("a", { href, target: "_blank", rel: "noopener noreferrer", style: "color:inherit", text: m.credit }) : m.credit,
          m.license && m.kind === "image" && m.origin === "commons" ? ` (${m.license})` : "");
      })));
    }
    pad.append(el("p", { style: "font-size:2.7cqw;color:var(--card-muted);margin-top:4cqw;line-height:1.55", text: t.disclaimer }));
    card.append(pad, el("div", { class: "foot" }, el("span", { class: "brand", text: "newz" }), `${i + 1} / ${slides.length}`));
    return card;
  }

  function render() {
    const keep = index;
    track.replaceChildren(...slides.map(renderSlide));
    dots.replaceChildren(...slides.map((_, i) => el("button", { type: "button", "aria-label": `${i + 1}`, onclick: () => go(i) })));
    bCards.textContent = T[lang].cards; bScroll.textContent = T[lang].scroll;
    viewer.classList.toggle("scroll", mode === "scroll");
    bCards.setAttribute("aria-pressed", String(mode === "cards"));
    bScroll.setAttribute("aria-pressed", String(mode === "scroll"));
    requestAnimationFrame(() => { fit(); if (mode === "cards") track.scrollTo({ left: keep * track.clientWidth, behavior: "instant" }); update(keep); });
  }
  // shrink text on dense cards until the content fits (never clip facts)
  function fit() {
    for (const card of track.children) {
      const pad = card.querySelector(".pad");
      if (!pad || card.classList.contains("sources")) continue;
      let k = 1;
      card.style.setProperty("--k", "1");
      while (pad.scrollHeight > pad.clientHeight + 1 && k > 0.66) {
        k = Math.round((k - 0.04) * 100) / 100;
        card.style.setProperty("--k", String(k));
      }
    }
  }
  function update(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    count.textContent = mode === "cards" ? `${index + 1} / ${slides.length}` : `${slides.length}`;
    prev.disabled = index === 0; next.disabled = index === slides.length - 1;
    [...dots.children].forEach((d, k) => d.setAttribute("aria-current", String(k === index)));
  }
  function go(i) {
    if (mode !== "cards") return;
    const j = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: j * track.clientWidth });
    update(j);
  }
  function setMode(m) { mode = m; store.set("newz.view", m); render(); }
  let raf = 0;
  track.addEventListener("scroll", () => {
    if (mode !== "cards") return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => update(Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
  }, { passive: true });
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
  });
  if (document.fonts?.ready) document.fonts.ready.then(fit);
  window.addEventListener("resize", () => { fit(); if (mode === "cards") track.scrollTo({ left: index * track.clientWidth, behavior: "instant" }); });
  render();
  return { setLang(l) { lang = l; render(); }, go };
}

// ------------------------------------------------------------ public site
async function getJSON(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// Light/dark toggle. Stored per viewer; without a stored choice the OS setting is used.
function effectiveTheme() {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
export function themeToggle() {
  const btn = el("button", { class: "iconbtn", type: "button" });
  const paint = () => {
    const dark = effectiveTheme() === "dark";
    btn.textContent = dark ? "☀" : "☾";
    const label = getLang() === "ko" ? (dark ? "라이트 모드로 전환" : "다크 모드로 전환") : (dark ? "Switch to light mode" : "Switch to dark mode");
    btn.setAttribute("aria-label", label);
    btn.title = label;
  };
  btn.addEventListener("click", () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("newz.theme", next);
    paint();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", paint);
  document.addEventListener("newz:lang", paint);
  paint();
  return btn;
}

export function langToggle(onChange) {
  const seg = el("div", { class: "seg", role: "group", "aria-label": "language" });
  const mk = (l, label) => el("button", { type: "button", "aria-pressed": String(getLang() === l), onclick: () => {
    setLang(l); [...seg.children].forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.l === l))); onChange(l);
  }, "data-l": l }, label);
  seg.append(mk("ko", "한국어"), mk("en", "EN"));
  return seg;
}

function deckMeta(d, lang, { showOpen = true } = {}) {
  const t = T[lang];
  const fc = d.factcheck || {};
  return el("div", { class: "deck-meta" },
    el("div", { class: "eyebrow" }, el("span", { class: "live" }), fmtDate(d.date, lang)),
    el("h1", { text: d.title[lang] }), el("p", { class: "sub", text: d.subtitle[lang] }),
    el("div", { class: "chips" },
      ...(d.sector || []).map((x) => el("span", { class: `chip ${x}`, text: t[x] })),
      ...(d.region || []).map((x) => el("span", { class: "chip", text: t[x] })),
      d.type ? el("span", { class: "chip", text: t.types[d.type] || d.type }) : null,
      ...(d.companies || []).map((c) => el("span", { class: "chip", text: lang === "ko" && c.name_ko ? c.name_ko : c.name }))),
    fc.passed ? el("div", { class: "verify" }, el("span", { class: "badge", text: "✓" }),
      el("div", {}, el("b", { text: t.verified }), el("br"),
        `${t.facts} ${fc.facts_verified ?? (d.facts || []).length} · ${t.srcs} ${(d.sources || []).length} · ${t.checked}`)) : null,
    d.summary?.[lang] ? el("p", { class: "summary", text: d.summary[lang] }) : null,
    (d.hashtags || []).length ? el("div", { class: "tags" }, ...d.hashtags.map((h) => el("span", { text: "#" + h.replace(/^#/, "") }))) : null,
    (d.related || []).length ? el("p", { class: "sub", style: "font-size:14px;margin-top:14px" }, `${t.related}: `,
      ...d.related.map((r) => el("a", { href: `#/d/${r}`, text: r + " " }))) : null,
    showOpen ? el("div", { class: "actions" }, el("a", { class: "btn", href: `#/d/${d.id}`, text: t.open })) : null);
}

function tile(d, lang) {
  const t = T[lang];
  const color = (d.sector || [])[0] === "defense" ? "var(--defense)" : "var(--ai)";
  return el("a", { class: "tile", href: `#/d/${d.id}` },
    el("div", { class: "thumb" }, el("div", { class: "bar", style: `background:${color}` }),
      d.cover ? el("img", { src: d.cover, alt: "", loading: "lazy" }) : null, el("div", { class: "t", text: d.title[lang] })),
    el("div", { class: "meta" }, el("span", { text: d.date.slice(5).replace("-", ".") }),
      el("span", { text: (d.companies || []).map((c) => (lang === "ko" && c.name_ko ? c.name_ko : c.name)).join(", ") || t.types[d.type] })));
}

function siteFooter(lang) {
  const t = T[lang];
  return el("footer", { class: "foot-site" }, el("div", { class: "wrap cols" },
    el("div", {}, el("h5", { text: t.about }), el("p", { text: t.aboutText })),
    el("div", {}, el("h5", { text: t.method }), el("p", { text: t.methodText })),
    el("div", {}, el("h5", { text: "newz" }), el("p", {}, t.nextAt, el("br"), el("a", { href: "feed.xml", text: t.rss })))));
}

async function startPublic() {
  const app = document.getElementById("app");
  const header = document.getElementById("hdr");
  let lang = getLang();
  setLang(lang);
  let index;
  try { index = await getJSON("data/index.json"); } catch { index = { decks: [], site: {} }; }
  const decks = index.decks || [];
  const cache = new Map();
  const loadDeck = async (id) => { if (!cache.has(id)) cache.set(id, await getJSON(`data/decks/${id}.json`)); return cache.get(id); };
  const filters = { f: "all", q: "" };
  let active = null;

  header.querySelector(".tagline").textContent = index.site?.tagline?.[lang] || "";
  header.querySelector(".slot").replaceChildren(langToggle((l) => { lang = l; route(); }), themeToggle());

  function archive() {
    const t = T[lang];
    const wrap = el("section", { class: "archive wrap" }, el("h2", { text: t.archive }));
    const opts = ["all", "ai", "defense", "kr", "global", "update"];
    const grid = el("div");
    const chips = el("div", { class: "filters" }, ...opts.map((o) => el("button", { class: "chipbtn", type: "button", "aria-pressed": String(filters.f === o),
      onclick: (e) => { filters.f = o; [...chips.querySelectorAll(".chipbtn")].forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); draw(); } }, t[o])),
      el("input", { class: "search", type: "search", placeholder: t.search, value: filters.q, "aria-label": t.search, oninput: (e) => { filters.q = e.target.value; draw(); } }));
    function draw() {
      const q = filters.q.trim().toLowerCase();
      const list = decks.filter((d) => {
        const f = filters.f;
        if (f === "ai" || f === "defense") { if (!(d.sector || []).includes(f)) return false; }
        else if (f === "kr" || f === "global") { if (!(d.region || []).includes(f)) return false; }
        else if (f === "update" && d.type !== "update") return false;
        if (!q) return true;
        const hay = [d.title.ko, d.title.en, d.summary.ko, d.summary.en, ...(d.hashtags || []), ...(d.companies || []).flatMap((c) => [c.name, c.name_ko])].join(" ").toLowerCase();
        return hay.includes(q);
      });
      if (!list.length) { grid.replaceChildren(el("div", { class: "empty", text: decks.length ? t.noMatch : t.noDeck })); return; }
      const byMonth = new Map();
      for (const d of list) { const k = d.date.slice(0, 7); if (!byMonth.has(k)) byMonth.set(k, []); byMonth.get(k).push(d); }
      grid.replaceChildren(...[...byMonth].flatMap(([k, ds]) => [
        el("div", { class: "month", text: lang === "ko" ? `${k.slice(0, 4)}년 ${Number(k.slice(5))}월` : new Date(k + "-01T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" }) }),
        el("div", { class: "grid" }, ...ds.map((d) => tile(d, lang)))]));
    }
    draw();
    wrap.append(chips, grid);
    return wrap;
  }

  async function home() {
    const t = T[lang];
    const hero = el("section", { class: "hero wrap" });
    if (!decks.length) {
      hero.append(el("div", { class: "empty", text: t.noDeck }));
    } else {
      const d = await loadDeck(decks[0].id);
      const holder = el("div");
      hero.append(el("div", { class: "eyebrow", style: "margin-bottom:12px", text: t.today }),
        el("div", { class: "hero-grid" }, holder, deckMeta(d, lang)));
      active = mountDeck(holder, d, { lang });
    }
    app.replaceChildren(hero, archive(), siteFooter(lang));
  }

  async function deckPage(id) {
    const t = T[lang];
    const i = decks.findIndex((d) => d.id === id);
    let d;
    try { d = await loadDeck(id); } catch { location.hash = "#/"; return; }
    const holder = el("div");
    const newer = decks[i - 1], older = decks[i + 1];
    const page = el("section", { class: "page wrap" },
      el("div", { class: "crumbs" }, el("a", { href: "#/", text: t.back }),
        el("span", { class: "pager" }, older ? el("a", { class: "btn", href: `#/d/${older.id}`, text: t.prev }) : null,
          newer ? el("a", { class: "btn", href: `#/d/${newer.id}`, text: t.next }) : null)),
      el("div", { class: "hero-grid" }, holder, deckMeta(d, lang, { showOpen: false })));
    app.replaceChildren(page, siteFooter(lang));
    active = mountDeck(holder, d, { lang });
    document.title = `${d.title[lang]} | newz`;
    holder.querySelector(".track")?.focus({ preventScroll: true });
  }

  async function route() {
    header.querySelector(".tagline").textContent = index.site?.tagline?.[lang] || "";
    const m = location.hash.match(/^#\/d\/(\d{4}-\d{2}-\d{2})$/);
    if (m) await deckPage(m[1]);
    else { document.title = "newz"; await home(); }
    window.scrollTo({ top: 0 });
  }
  window.addEventListener("hashchange", route);
  route();
}

export { T, fmtDate, deckMeta };
if (document.body.dataset.page === "public") startPublic();
