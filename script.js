const GAS_API_URL = "/data.json";
const CHANGELOG_URL = "/changelog.json";
const UPDATE_META_URL = "/update-meta.json";
const FEE_HISTORY_URL = "/fee-history.json";
const FEE_HISTORY_FIELDS = {
    fee: { historyKey: "총보수", labelKey: "table_fee" },
    other: { historyKey: "기타비용", labelKey: "table_other" },
    trade: { historyKey: "매매중개수수료", labelKey: "table_trade" },
    real: { historyKey: "실부담비용", labelKey: "table_real" },
};
const I18N_DIR = "/i18n";

const SUPPORTED_LANGS = ["ko", "vi", "zh", "en", "ja", "th", "tl", "km"];
const DEFAULT_LANG = "ko";
const SITE_URL = "https://etfsave.life";

const LEGACY_HASH_ROUTES = {
    "#home": "/",
    "#isa": "/isa/",
    "#pension": "/pension/",
    "#guide": "/guide/",
    "#fomo": "/fomo/",
};

const LANGUAGE_META = {
    ko: { htmlLang: "ko-KR", ogLocale: "ko_KR", hreflang: "ko" },
    vi: { htmlLang: "vi-VN", ogLocale: "vi_VN", hreflang: "vi" },
    zh: { htmlLang: "zh-CN", ogLocale: "zh_CN", hreflang: "zh-CN" },
    en: { htmlLang: "en-US", ogLocale: "en_US", hreflang: "en" },
    ja: { htmlLang: "ja-JP", ogLocale: "ja_JP", hreflang: "ja" },
    th: { htmlLang: "th-TH", ogLocale: "th_TH", hreflang: "th" },
    tl: { htmlLang: "fil-PH", ogLocale: "tl_PH", hreflang: "fil-PH" },
    km: { htmlLang: "km-KH", ogLocale: "km_KH", hreflang: "km" },
};

const HREFLANG_TO_LANG = {
    "x-default": DEFAULT_LANG,
    "ko": "ko",
    "en": "en",
    "vi": "vi",
    "zh-CN": "zh",
    "ja": "ja",
    "th": "th",
    "fil-PH": "tl",
    "km": "km",
};

const i18nCache = new Map();

let allData = [];
let currentCategory = "";
let currentLanguage = DEFAULT_LANG;
let currentTranslations = {};
let lastFocusedBeforeModal = null;
let feeHistoryPromise = null;
let feeHistoryTarget = null;
let latestDataUpdatedAt = "";
let changelogLatestByCode = {};

let dataKeys = {
    category: "구분",
    code: "종목코드",
    name: "종목명",
    fee: "총보수",
    other: "기타비용",
    trade: "매매중개수수료",
    real: "실부담비용",
    aum: "AUM",
    volume: "거래량",
};

document.addEventListener("DOMContentLoaded", () => {
    void initApp();
});

async function initApp() {
    initLegacyHashRedirect();
    initNavigation();
    initSmartHeader();
    initModal();
    initFeeHistoryModal();
    initTrackedCtas();
    initShareButton();

    await initLanguage();
    highlightCurrentNav();

    if (hasDataTable()) {
        await fetchData();
    }

    if (isChangelogPage()) {
        await renderChangelog();
    }

    trackEvent("page_view_custom", {
        category: currentCategory || getCategoryPreset() || "all",
    });
}

function initLegacyHashRedirect() {
    const path = normalizePath(window.location.pathname);
    if (path !== "/") return;

    const hash = (window.location.hash || "").toLowerCase();
    const targetPath = LEGACY_HASH_ROUTES[hash];
    if (!targetPath) return;

    const url = new URL(window.location.href);
    url.pathname = targetPath;
    url.hash = "";

    window.location.replace(`${url.pathname}${url.search}`);
}

function initNavigation() {
    const nav = document.getElementById("primaryNav");
    const hamburger = document.querySelector(".hamburger-menu");
    const navLinks = document.querySelectorAll(".nav-link");

    if (!nav || !hamburger) return;

    const closeNav = () => {
        nav.classList.remove("active");
        hamburger.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
        hamburger.setAttribute("aria-label", getTranslation("aria_menu_open"));
        document.body.classList.remove("nav-open");
    };

    const openNav = () => {
        nav.classList.add("active");
        hamburger.classList.add("active");
        hamburger.setAttribute("aria-expanded", "true");
        hamburger.setAttribute("aria-label", getTranslation("aria_menu_close"));
        document.body.classList.add("nav-open");
    };

    hamburger.addEventListener("click", () => {
        if (nav.classList.contains("active")) {
            closeNav();
        } else {
            openNav();
        }
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            closeNav();
        });
    });

    document.addEventListener("click", (event) => {
        if (!nav.classList.contains("active")) return;
        if (nav.contains(event.target) || hamburger.contains(event.target)) return;
        closeNav();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;

        const openModalEl = document.querySelector(".modal-overlay:not([hidden])");
        if (openModalEl) {
            if (!event.defaultPrevented) {
                if (openModalEl.id === "feeHistoryModal") {
                    closeFeeHistoryModal();
                } else {
                    closeModal(openModalEl);
                }
            }
            return;
        }

        if (nav.classList.contains("active")) {
            closeNav();
        }
    });
}

function initSmartHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    let lastScroll = window.scrollY || document.documentElement.scrollTop;
    let rafPending = false;

    window.addEventListener("scroll", () => {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
            // BUG-01: skip scroll handling while mobile nav is open (D-04)
            if (document.body.classList.contains("nav-open")) {
                header.classList.remove("header-hidden");
                rafPending = false;
                return;
            }
            const currentScroll = window.scrollY || document.documentElement.scrollTop;
            if (currentScroll > lastScroll && currentScroll > 60) {
                header.classList.add("header-hidden");
            } else {
                header.classList.remove("header-hidden");
            }
            lastScroll = currentScroll <= 0 ? 0 : currentScroll;
            rafPending = false;
        });
    }, { passive: true });
}

function highlightCurrentNav() {
    const navLinks = document.querySelectorAll(".nav-link");
    if (navLinks.length === 0) return;

    const currentPath = normalizePath(window.location.pathname);

    navLinks.forEach((link) => {
        const href = link.getAttribute("href") || "/";
        const hrefPath = normalizePath(new URL(href, window.location.origin).pathname);
        const isHomeLink = hrefPath === "/";
        const isActive = isHomeLink
            ? currentPath === "/"
            : currentPath === hrefPath || currentPath.startsWith(hrefPath);

        link.classList.toggle("active", isActive);
    });
}

async function initLanguage() {
    const selector = document.getElementById("languageSelect");
    const urlLang = getLanguageFromUrl();
    const savedLang = localStorage.getItem("site_language");
    const browserLang = (navigator.language || DEFAULT_LANG).slice(0, 2).toLowerCase();

    const initialLang = SUPPORTED_LANGS.includes(urlLang)
        ? urlLang
        : (SUPPORTED_LANGS.includes(savedLang)
            ? savedLang
            : (SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG));

    if (selector) {
        selector.value = initialLang;
        selector.addEventListener("change", async (event) => {
            const value = event.target.value;
            await updateLanguage(value, { rerender: true, syncUrl: true, historyMode: "replace" });
        });
    }

    // Keep English pack available as a fallback when a locale misses specific keys.
    if (!i18nCache.has("en")) {
        await loadLanguagePack("en");
    }

    await updateLanguage(initialLang, { rerender: false, syncUrl: true, historyMode: "replace" });
}

async function loadLanguagePack(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
        return loadLanguagePack(DEFAULT_LANG);
    }

    if (i18nCache.has(lang)) {
        return i18nCache.get(lang);
    }

    try {
        const response = await fetch(`${I18N_DIR}/${lang}.json`, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Failed to load language pack: ${lang}`);
        }

        const pack = await response.json();
        i18nCache.set(lang, pack);
        return pack;
    } catch (error) {
        if (lang !== DEFAULT_LANG) {
            return loadLanguagePack(DEFAULT_LANG);
        }

        console.error("Language pack loading failed:", error);
        return {};
    }
}

async function updateLanguage(lang, options = {}) {
    const { rerender = true, syncUrl = false, historyMode = "replace" } = options;
    const normalized = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;

    if (!i18nCache.has(DEFAULT_LANG)) {
        await loadLanguagePack(DEFAULT_LANG);
    }

    const pack = await loadLanguagePack(normalized);
    const langMeta = getLanguageMeta(normalized);

    currentLanguage = normalized;
    currentTranslations = pack;

    localStorage.setItem("site_language", currentLanguage);
    document.documentElement.lang = langMeta.htmlLang;

    if (syncUrl) {
        syncLanguageParam(currentLanguage, historyMode);
    }

    applyTranslations();
    applySeoTranslations();
    updateHomeCoverageMetric();

    const selector = document.getElementById("languageSelect");
    if (selector && selector.value !== currentLanguage) {
        selector.value = currentLanguage;
    }

    if (rerender && hasDataTable() && allData.length > 0) {
        renderTabs(allData);
        filterAndRenderTable();
        updateLastUpdated(false);
    }

    if (rerender && feeHistoryTarget) {
        const feeModal = document.getElementById("feeHistoryModal");
        if (feeModal && !feeModal.hasAttribute("hidden")) {
            void renderFeeHistoryModal();
        }
    }

    if (rerender && isChangelogPage()) {
        await renderChangelog();
    }
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const translated = getTranslation(key);
        if (translated && translated !== key) {
            // SECURITY: innerHTML is intentional — i18n JSON contains deliberate HTML
            // (e.g., <br>, <strong>) that must render as markup. Source is
            // system-controlled (local i18n/*.json files), not user input. (D-01)
            el.innerHTML = translated;
        }
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        const key = el.getAttribute("data-i18n-aria");
        const translated = getTranslation(key);
        if (translated && translated !== key) {
            el.setAttribute("aria-label", translated);
        }
    });
}
function applySeoTranslations() {
    const pageKey = normalizeSeoKey(getPageType());
    const seoTitle = pickTranslation([`seo_${pageKey}_title`, "seo_title"]);
    const seoDescription = pickTranslation([`seo_${pageKey}_description`, "seo_description"]);
    const seoKeywords = pickTranslation([`seo_${pageKey}_keywords`, "seo_keywords"]);
    const seoJsonldName = pickTranslation([`seo_${pageKey}_jsonld_name`, "seo_jsonld_name"]);
    const seoJsonldDescription = pickTranslation([`seo_${pageKey}_jsonld_description`, "seo_jsonld_description", `seo_${pageKey}_description`, "seo_description"]);

    const langMeta = getLanguageMeta(currentLanguage);
    const canonicalUrl = buildCanonicalUrlForLanguage(currentLanguage);

    if (seoTitle) {
        document.title = seoTitle;

        const ogTitle = document.querySelector('meta[property="og:title"]');
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (ogTitle) ogTitle.setAttribute("content", seoTitle);
        if (twitterTitle) twitterTitle.setAttribute("content", seoTitle);
    }

    if (seoDescription) {
        const desc = document.querySelector('meta[name="description"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const twDesc = document.querySelector('meta[name="twitter:description"]');

        if (desc) desc.setAttribute("content", seoDescription);
        if (ogDesc) ogDesc.setAttribute("content", seoDescription);
        if (twDesc) twDesc.setAttribute("content", seoDescription);
    }

    if (seoKeywords) {
        const keywords = document.querySelector('meta[name="keywords"]');
        if (keywords) keywords.setAttribute("content", seoKeywords);
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const twUrl = document.querySelector('meta[name="twitter:url"]');
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    const contentLanguage = document.querySelector('meta[name="content-language"]');

    if (canonical) canonical.setAttribute("href", canonicalUrl);
    if (ogUrl) ogUrl.setAttribute("content", canonicalUrl);
    if (twUrl) twUrl.setAttribute("content", canonicalUrl);
    if (ogLocale) ogLocale.setAttribute("content", langMeta.ogLocale);
    if (contentLanguage) contentLanguage.setAttribute("content", langMeta.htmlLang);

    updateAlternateLinks();

    updateStructuredData({
        language: langMeta.htmlLang,
        url: canonicalUrl,
        pageName: seoJsonldName || seoTitle || document.title,
        description: seoJsonldDescription || seoDescription || "",
    });
}

function pickTranslation(keys) {
    for (const key of keys) {
        const translated = getTranslation(key);
        if (translated && translated !== key) {
            return translated;
        }
    }
    return "";
}

function getLanguageFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("lang");

    if (!lang) return null;
    return SUPPORTED_LANGS.includes(lang) ? lang : null;
}

function getLanguageMeta(lang) {
    return LANGUAGE_META[lang] || LANGUAGE_META[DEFAULT_LANG];
}

function buildCanonicalUrlForLanguage(lang) {
    const path = normalizePath(window.location.pathname);
    const url = new URL(path, `${SITE_URL}/`);

    if (lang && lang !== DEFAULT_LANG) {
        url.searchParams.set("lang", lang);
    }

    return url.toString();
}

function updateAlternateLinks() {
    const links = document.querySelectorAll('link[rel="alternate"][hreflang]');
    if (links.length === 0) return;

    links.forEach((link) => {
        const hreflang = link.getAttribute("hreflang");
        const lang = HREFLANG_TO_LANG[hreflang];
        if (!lang) return;

        const href = buildCanonicalUrlForLanguage(lang);
        link.setAttribute("href", href);
    });
}

function syncLanguageParam(lang, historyMode = "replace") {
    const url = new URL(window.location.href);

    if (lang && lang !== DEFAULT_LANG) {
        url.searchParams.set("lang", lang);
    } else {
        url.searchParams.delete("lang");
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    if (historyMode === "push") {
        window.history.pushState({}, "", nextUrl);
    } else {
        window.history.replaceState({}, "", nextUrl);
    }
}

function updateStructuredData({ language, url, pageName, description }) {
    const structuredDataScript = document.getElementById("structuredData");
    if (!structuredDataScript) return;

    const structuredData = [
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "ETFSAVE",
            "url": `${SITE_URL}/`,
            "inLanguage": language,
            "description": description,
        },
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": pageName,
            "url": url,
            "inLanguage": language,
            "description": description,
        },
    ];

    const breadcrumbData = buildBreadcrumbStructuredData();
    if (breadcrumbData) {
        structuredData.push(breadcrumbData);
    }

    const faqData = buildHomeFaqStructuredData(language);
    if (faqData) {
        structuredData.push(faqData);
    }

    const howToData = buildHomeHowToStructuredData(language, url);
    if (howToData) {
        structuredData.push(howToData);
    }

    structuredDataScript.textContent = JSON.stringify(structuredData);
}

function buildHomeFaqStructuredData(language) {
    if (getPageType() !== "home") return null;

    const faqPairs = [
        { question: getTranslation("home_faq_q1"), answer: getTranslation("home_faq_a1") },
        { question: getTranslation("home_faq_q2"), answer: getTranslation("home_faq_a2") },
        { question: getTranslation("home_faq_q3"), answer: getTranslation("home_faq_a3") },
    ];

    const mainEntity = faqPairs
        .map(({ question, answer }) => ({
            question: stripHtmlTags(question),
            answer: stripHtmlTags(answer),
        }))
        .filter(({ question, answer }) => question && answer)
        .map(({ question, answer }) => ({
            "@type": "Question",
            "name": question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": answer,
            },
        }));

    if (mainEntity.length === 0) return null;

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "inLanguage": language,
        "mainEntity": mainEntity,
    };
}

function buildHomeHowToStructuredData(language, url) {
    if (getPageType() !== "home") return null;

    const steps = [
        {
            name: getTranslation("home_howto_schema_step1_name"),
            text: getTranslation("home_howto_schema_step1_text"),
        },
        {
            name: getTranslation("home_howto_schema_step2_name"),
            text: getTranslation("home_howto_schema_step2_text"),
        },
        {
            name: getTranslation("home_howto_schema_step3_name"),
            text: getTranslation("home_howto_schema_step3_text"),
        },
        {
            name: getTranslation("home_howto_schema_step4_name"),
            text: getTranslation("home_howto_schema_step4_text"),
        },
    ]
        .map((step) => ({
            name: stripHtmlTags(step.name),
            text: stripHtmlTags(step.text),
        }))
        .filter((step) => step.name && step.text)
        .map((step, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "name": step.name,
            "text": step.text,
            "url": `${url}#etf-fees-howto`,
        }));

    if (steps.length === 0) return null;

    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "inLanguage": language,
        "name": stripHtmlTags(getTranslation("home_howto_schema_name")),
        "description": stripHtmlTags(getTranslation("home_howto_schema_description")),
        "step": steps,
    };
}

function buildBreadcrumbStructuredData() {
    const nodes = document.querySelectorAll(".breadcrumbs a, .breadcrumbs span[aria-current='page']");
    if (nodes.length < 2) return null;

    const items = [];
    nodes.forEach((node, index) => {
        const label = (node.textContent || "").trim();
        if (!label) return;

        let itemUrl = buildCanonicalUrlForLanguage(DEFAULT_LANG);
        if (node.tagName === "A") {
            const href = node.getAttribute("href") || "/";
            itemUrl = new URL(href, `${SITE_URL}/`).toString();
        }

        items.push({
            "@type": "ListItem",
            "position": index + 1,
            "name": label,
            "item": itemUrl,
        });
    });

    if (items.length < 2) return null;

    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items,
    };
}

function getTranslation(key) {
    if (!key) return "";

    if (currentTranslations && key in currentTranslations) {
        return currentTranslations[key];
    }

    const enPack = i18nCache.get("en");
    if (enPack && key in enPack) {
        return enPack[key];
    }

    const koPack = i18nCache.get(DEFAULT_LANG);
    if (koPack && key in koPack) {
        return koPack[key];
    }

    return key;
}

async function fetchData() {
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" class="loading-text">${getTranslation("table_loading")}</td></tr>`;
    updateLastUpdated(true);

    try {
        const [response, changelogResponse] = await Promise.all([
            fetch(GAS_API_URL, { cache: "no-store" }),
            fetch(CHANGELOG_URL, { cache: "no-store" }).catch(() => null),
            loadUpdateMeta(),
        ]);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        // changelog 파싱: 가장 최신 월의 실부담비용 변동을 종목코드별로 매핑
        changelogLatestByCode = {};
        if (changelogResponse && changelogResponse.ok) {
            try {
                const changelogData = await changelogResponse.json();
                if (Array.isArray(changelogData) && changelogData.length > 0) {
                    const latest = [...changelogData].sort((a, b) => b.month.localeCompare(a.month))[0];
                    if (latest && Array.isArray(latest.changes)) {
                        latest.changes.forEach((change) => {
                            if (change.field === "실부담비용") {
                                changelogLatestByCode[change.code] = {
                                    before: change.before,
                                    after: change.after,
                                    diff: Number((change.after - change.before).toFixed(4)),
                                };
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn("Changelog parse error:", e);
            }
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error("Invalid data format");
        }

        allData = data;
        if (allData[0]) {
            resolveDataKeys(allData[0]);
        }

        updateHomeCoverageMetric();

        renderTabs(allData);
        filterAndRenderTable();
        updateLastUpdated(false);
    } catch (error) {
        console.error("Error fetching data:", error);
        tbody.innerHTML = `<tr><td colspan="8" class="loading-text error-text">${getTranslation("table_error")}</td></tr>`;
        updateLastUpdated(true);
    }
}

async function loadUpdateMeta() {
    try {
        const response = await fetch(UPDATE_META_URL, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const metadata = await response.json();
        const formattedDate = normalizeUpdatedDate(metadata ? metadata.updatedAt : "");
        if (formattedDate) {
            latestDataUpdatedAt = formattedDate;
        }
    } catch (error) {
        console.warn("Failed to load update metadata:", error);
    }
}

function resolveDataKeys(sample) {
    const keys = Object.keys(sample || {});
    if (keys.length === 0) return;

    const pick = (preferred, candidates, index) => {
        const exact = keys.find((key) => key === preferred);
        if (exact) return exact;

        const partial = keys.find((key) => candidates.some((candidate) => String(key).includes(candidate)));
        if (partial) return partial;

        return keys[index] || preferred;
    };

    dataKeys = {
        category: pick("구분", ["구분", "category"], 0),
        code: pick("종목코드", ["종목코드", "코드", "code"], 1),
        name: pick("종목명", ["종목명", "name"], 2),
        fee: pick("총보수", ["총보수", "fee"], 3),
        other: pick("기타비용", ["기타비용", "other"], 4),
        trade: pick("매매중개수수료", ["매매", "중개", "trade"], 5),
        real: pick("실부담비용", ["실부담", "real"], 6),
        aum: pick("AUM", ["AUM", "순자산", "aum"], 7),
        volume: pick("거래량", ["거래량", "volume"], 8),
    };
}

function updateHomeCoverageMetric() {
    if (getPageType() !== "home") return;

    const metric = document.getElementById("homeCoverageMetric");
    if (!metric || allData.length === 0) return;

    const template = getTranslation("home_kpi_coverage_dynamic");
    const year = String(new Date().getFullYear());
    const count = String(allData.length);

    if (template && template !== "home_kpi_coverage_dynamic") {
        metric.textContent = template
            .replace("{year}", year)
            .replace("{count}", count);
        return;
    }

    metric.textContent = `${year}년 기준 ${count}개 ETF 실부담비용 데이터를 분석합니다.`;
}

function renderTabs(data) {
    const tabsContainer = document.getElementById("categoryTabs");
    if (!tabsContainer) return;

    const categories = getDistinctCategories(data);
    const presetCategory = getCategoryPreset();

    if (presetCategory) {
        currentCategory = presetCategory;
        tabsContainer.innerHTML = "";
        tabsContainer.hidden = true;
        return;
    }

    tabsContainer.hidden = false;
    tabsContainer.innerHTML = "";

    const categoryFromUrl = getCategoryFromUrl();

    if (categoryFromUrl && categories.includes(categoryFromUrl)) {
        currentCategory = categoryFromUrl;
    }

    if (!currentCategory || !categories.includes(currentCategory)) {
        currentCategory = categories[0] || "";
    }

    const options = categories;

    options.forEach((category) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `tab-button ${category === currentCategory ? "active" : ""}`;
        button.dataset.category = category;
        button.textContent = category;

        button.addEventListener("click", () => {
            currentCategory = category;

            document.querySelectorAll(".tab-button").forEach((el) => {
                el.classList.toggle("active", el === button);
            });

            syncCategoryParam(currentCategory);
            filterAndRenderTable();

            trackEvent("table_filter_change", {
                category: currentCategory,
            });

            button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        });

        tabsContainer.appendChild(button);
    });
}

function filterAndRenderTable() {
    const presetCategory = getCategoryPreset();
    if (presetCategory) {
        currentCategory = presetCategory;
    }

    const normalizedCurrent = String(currentCategory || "").trim();
    const filtered = (normalizedCurrent === "")
        ? allData
        : allData.filter((item) => String(item[dataKeys.category] || "").trim() === normalizedCurrent);

    renderTable(filtered);
}

function formatAUM(value) {
    if (value == null || value === "" || isNaN(Number(value))) return "-";
    const aum = Number(value);
    if (aum <= 0) return "-";
    if (aum >= 10000) return (aum / 10000).toFixed(1) + "조";
    return aum.toLocaleString("ko-KR") + "억";
}

function formatVolume(value) {
    if (value == null || value === "" || isNaN(Number(value))) return "-";
    const vol = Number(value);
    if (vol <= 0) return "-";
    if (vol >= 100000000) return (vol / 100000000).toFixed(1) + "억";
    if (vol >= 10000) return Math.round(vol / 10000) + "만";
    return vol.toLocaleString("ko-KR");
}

function renderTable(rows) {
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="loading-text">${getTranslation("table_empty")}</td></tr>`;
        return;
    }

    const sorted = [...rows].sort((a, b) => {
        const aValue = toNumber(a[dataKeys.real]);
        const bValue = toNumber(b[dataKeys.real]);
        return aValue - bValue;
    });

    trackEvent("table_sort", {
        sort_field: "real_cost",
        sort_direction: "asc",
        result_count: sorted.length,
    });

    sorted.forEach((item) => {
        const row = document.createElement("tr");

        const code = valueOrDash(item[dataKeys.code]);
        const name = valueOrDash(item[dataKeys.name]);
        const naverCode = code === "-" ? "" : String(code);
        const naverUrl = naverCode
            ? `https://finance.naver.com/item/main.naver?code=${encodeURIComponent(naverCode)}`
            : "#";

        const changeData = changelogLatestByCode[String(code)] || null;
        let changeHtml = "";
        if (changeData) {
            const diff = changeData.diff;
            const sign = diff > 0 ? "+" : "";
            const cls = diff > 0 ? "fee-change up" : "fee-change down";
            const arrow = diff > 0 ? "▲" : "▼";
            changeHtml = `<span class="${cls}">${arrow}${sign}${Math.abs(diff).toFixed(4)}%p</span>`;
        }

        row.innerHTML = `
            <td class="clickable code-cell" data-label="${escapeHtml(getTranslation("table_code"))}" title="${escapeHtml(getTranslation("aria_copy_code"))}">${escapeHtml(code)}</td>
            <td data-label="${escapeHtml(getTranslation("table_name"))}" class="name-cell">
                <a href="${naverUrl}" target="_blank" rel="noopener noreferrer" class="stock-link">${escapeHtml(name)}</a>
            </td>
            <td class="text-right" data-label="${escapeHtml(getTranslation("table_fee"))}">${feeCellHtml(item[dataKeys.fee], code, name, "fee")}</td>
            <td class="text-right" data-label="${escapeHtml(getTranslation("table_other"))}">${feeCellHtml(item[dataKeys.other], code, name, "other")}</td>
            <td class="text-right" data-label="${escapeHtml(getTranslation("table_trade"))}">${feeCellHtml(item[dataKeys.trade], code, name, "trade")}</td>
            <td class="text-right highlight" data-label="${escapeHtml(getTranslation("table_real"))}">${feeCellHtml(item[dataKeys.real], code, name, "real")}${changeHtml}</td>
            <td class="text-right" data-label="${escapeHtml(getTranslation("table_aum"))}">${formatAUM(item[dataKeys.aum])}</td>
            <td class="text-right" data-label="${escapeHtml(getTranslation("table_volume"))}">${formatVolume(item[dataKeys.volume])}</td>
        `;

        const codeCell = row.querySelector(".code-cell");
        if (codeCell && code !== "-") {
            codeCell.addEventListener("click", () => {
                void copyCodeValue(String(code));
            });

            codeCell.setAttribute("role", "button");
            codeCell.setAttribute("tabindex", "0");
            codeCell.setAttribute("aria-label", `${getTranslation("aria_copy_code")}: ${code}`);

            codeCell.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void copyCodeValue(String(code));
                }
            });
        }

        tbody.appendChild(row);
    });
}

function initShareButton() {
    const button = document.getElementById("shareLinkBtn");
    if (!button) return;

    button.addEventListener("click", async () => {
        const shareUrl = buildShareUrl();

        try {
            await copyText(shareUrl);
            showToast(getTranslation("share_link_copied"));

            trackEvent("share_link_copy", {
                category: currentCategory || getCategoryPreset() || "all",
            });
        } catch (error) {
            console.error("Share link copy failed:", error);
            showToast(getTranslation("share_link_copy_failed"));
        }
    });
}

function buildShareUrl() {
    const url = new URL(window.location.href);

    if (hasDataTable() && !getCategoryPreset()) {
        if (currentCategory) {
            url.searchParams.set("category", currentCategory);
        } else {
            url.searchParams.delete("category");
        }
    }

    if (currentLanguage && currentLanguage !== DEFAULT_LANG) {
        url.searchParams.set("lang", currentLanguage);
    } else {
        url.searchParams.delete("lang");
    }

    url.hash = "";

    const path = normalizePath(url.pathname);
    return `${url.origin}${path}${url.search}`;
}

async function copyCodeValue(code) {
    try {
        await copyText(code);
        const message = getTranslation("copy_success_code").replace("{code}", code);
        showToast(message);

        trackEvent("code_copy", {
            copied_code: code,
        });
    } catch (error) {
        console.error("Copy failed:", error);
    }
}

async function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";

    document.body.appendChild(textarea);
    textarea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!successful) {
        throw new Error("Fallback copy command failed");
    }
}

function showToast(message) {
    let toast = document.getElementById("toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    window.setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

function updateLastUpdated(isPending = false) {
    const lastUpdated = document.getElementById("lastUpdated");
    if (!lastUpdated) return;

    if (isPending) {
        lastUpdated.textContent = `${getTranslation("last_updated")}...`;
        return;
    }

    if (latestDataUpdatedAt) {
        lastUpdated.textContent = `${getTranslation("last_updated")}${latestDataUpdatedAt}`;
        return;
    }

    lastUpdated.textContent = `${getTranslation("last_updated")}-`;
}

function normalizeUpdatedDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (dateMatch) {
        return `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    return `${parsed.getFullYear()}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(parsed.getDate()).padStart(2, "0")}`;
}

async function renderChangelog() {
    const container = document.getElementById("changelogList");
    if (!container) return;

    container.innerHTML = `<p class="loading-text">${getTranslation("changelog_loading")}</p>`;

    try {
        const response = await fetch(CHANGELOG_URL, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = `<p class="loading-text">${getTranslation("changelog_empty")}</p>`;
            return;
        }

        const sorted = [...data].sort((a, b) => {
            const aMonth = String(a.month || "");
            const bMonth = String(b.month || "");
            if (bMonth !== aMonth) return bMonth.localeCompare(aMonth);
            return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
        });

        container.innerHTML = "";

        sorted.forEach((entry) => {
            const card = document.createElement("article");
            card.className = "changelog-card";

            const month = escapeHtml(String(entry.month || ""));
            const updatedAt = escapeHtml(String(entry.updatedAt || ""));
            const changes = Array.isArray(entry.changes) ? entry.changes : [];

            if (changes.length === 0) {
                // BUG-02: skip table entirely when no changes — avoids orphaned thead (D-06, D-07)
                card.innerHTML = `
                    <header class="changelog-head">
                        <h3>${month}</h3>
                        <p>${getTranslation("changelog_updated_at")} ${updatedAt}</p>
                    </header>
                    <p class="changelog-no-changes">${escapeHtml(getTranslation("changelog_no_changes"))}</p>
                `;
            } else {
                const rowsHtml = changes.map((change) => {
                    const beforeValue = formatChangeValue(change.before);
                    const afterValue = formatChangeValue(change.after);

                    return `
                        <tr>
                            <td>${escapeHtml(String(change.code || "-"))}</td>
                            <td>${escapeHtml(String(change.name || "-"))}</td>
                            <td>${escapeHtml(String(change.field || "-"))}</td>
                            <td class="text-right">${beforeValue}</td>
                            <td class="text-right">${afterValue}</td>
                        </tr>
                    `;
                }).join("");

                card.innerHTML = `
                    <header class="changelog-head">
                        <h3>${month}</h3>
                        <p>${getTranslation("changelog_updated_at")} ${updatedAt}</p>
                    </header>
                    <div class="table-container">
                        <table class="data-table changelog-table">
                            <thead>
                                <tr>
                                    <th>${getTranslation("table_code")}</th>
                                    <th>${getTranslation("table_name")}</th>
                                    <th>${getTranslation("changelog_field")}</th>
                                    <th>${getTranslation("changelog_before")}</th>
                                    <th>${getTranslation("changelog_after")}</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                    </div>
                `;
            }

            container.appendChild(card);
        });
    } catch (error) {
        console.error("Failed to render changelog:", error);
        container.innerHTML = `<p class="loading-text error-text">${getTranslation("changelog_error")}</p>`;
    }
}

function formatChangeValue(value) {
    const number = toNumber(value);
    return Number.isFinite(number) ? `${number.toFixed(4)}%` : "-";
}

function initTrackedCtas() {
    document.addEventListener("click", (event) => {
        const target = event.target.closest("[data-track-cta]");
        if (!target) return;

        const ctaId = target.getAttribute("data-track-cta") || "unknown";
        const ctaText = (target.textContent || "").trim().slice(0, 80);

        trackEvent("cta_click", {
            cta_id: ctaId,
            cta_text: ctaText,
        });
    });
}

function trackEvent(eventName, params = {}) {
    const payload = {
        page_type: getPageType(),
        lang: currentLanguage || DEFAULT_LANG,
        category: currentCategory || getCategoryPreset() || "all",
        route: normalizePath(window.location.pathname),
        device_type: getDeviceType(),
        ...params,
    };

    if (typeof window.gtag === "function") {
        window.gtag("event", eventName, payload);
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: eventName,
        ...payload,
    });
}

function initModal() {
    const openLink = document.getElementById("privacyPolicyLink");
    const modal = document.getElementById("privacyModal");
    const closeBtn = document.getElementById("privacyModalClose");

    if (!openLink || !modal || !closeBtn) return;

    openLink.addEventListener("click", (event) => {
        event.preventDefault();
        openModal(modal);
    });

    closeBtn.addEventListener("click", () => {
        closeModal(modal);
    });

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal(modal);
        }
    });

    modal.addEventListener("keydown", handleModalFocusTrap);
}

function openModal(modal) {
    const content = modal ? modal.querySelector(".modal-content") : null;
    if (!modal || !content) return;

    lastFocusedBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    modal.removeAttribute("hidden");
    document.body.classList.add("modal-open");

    window.setTimeout(() => {
        content.focus();
    }, 0);
}

function closeModal(modal, fallbackFocus) {
    if (!modal) return;

    modal.setAttribute("hidden", "hidden");
    if (!document.querySelector(".modal-overlay:not([hidden])")) {
        document.body.classList.remove("modal-open");
    }

    if (lastFocusedBeforeModal && lastFocusedBeforeModal.isConnected) {
        lastFocusedBeforeModal.focus();
    } else if (fallbackFocus && fallbackFocus.isConnected) {
        fallbackFocus.focus();
    }
}

function handleModalFocusTrap(event) {
    const modal = event.currentTarget;
    if (!modal) return;

    if (event.key === "Escape") {
        event.preventDefault();
        if (modal.id === "feeHistoryModal") {
            closeFeeHistoryModal();
        } else {
            closeModal(modal);
        }
        return;
    }

    if (event.key !== "Tab") return;

    if (modal.hasAttribute("hidden")) return;

    const focusable = modal.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) {
        event.preventDefault();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
    }
}

function getFeeFieldLabel(field) {
    const def = FEE_HISTORY_FIELDS[field];
    if (!def) return "";
    return stripHtmlTags(getTranslation(def.labelKey)).replace(/\s*\(%\)\s*$/, "");
}

function feeCellHtml(value, code, name, field) {
    const text = formatPercent(value);
    if (code === "-") return text;

    const label = formatFeeTemplate(getTranslation("fee_history_open_label"), {
        name,
        field: getFeeFieldLabel(field),
    });
    return `<button type="button" class="fee-history-btn" data-code="${escapeHtml(code)}" data-field="${field}" aria-label="${escapeHtml(label)}">${text}</button>`;
}

function loadFeeHistory() {
    if (feeHistoryPromise) return feeHistoryPromise;

    feeHistoryPromise = (async () => {
        const response = await fetch(FEE_HISTORY_URL, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`fee-history fetch failed: ${response.status}`);
        }
        const data = await response.json();
        if (!data || typeof data.series !== "object" || data.series === null || Array.isArray(data.series)) {
            throw new Error("fee-history invalid schema");
        }
        return data;
    })().catch((error) => {
        feeHistoryPromise = null;
        throw error;
    });

    return feeHistoryPromise;
}

function initFeeHistoryModal() {
    const modal = document.getElementById("feeHistoryModal");
    const tbody = document.getElementById("tableBody");
    if (!modal || !tbody) return;

    const closeBtn = document.getElementById("feeHistoryClose");

    tbody.addEventListener("click", (event) => {
        const target = event.target;
        const btn = target instanceof Element ? target.closest(".fee-history-btn") : null;
        if (!btn) return;
        openFeeHistoryModal(btn.dataset.code, btn.dataset.field);
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            closeFeeHistoryModal();
        });
    }

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeFeeHistoryModal();
        }
    });

    modal.addEventListener("keydown", handleModalFocusTrap);
}

function openFeeHistoryModal(code, field) {
    const modal = document.getElementById("feeHistoryModal");
    if (!modal || !code || !FEE_HISTORY_FIELDS[field]) return;

    feeHistoryTarget = { code: String(code), field };
    openModal(modal);
    void renderFeeHistoryModal();
}

function closeFeeHistoryModal() {
    const modal = document.getElementById("feeHistoryModal");
    if (!modal) return;

    let fallback = null;
    if (feeHistoryTarget) {
        const selector = `#tableBody .fee-history-btn[data-code="${CSS.escape(feeHistoryTarget.code)}"][data-field="${feeHistoryTarget.field}"]`;
        fallback = document.querySelector(selector);
    }
    if (!fallback) {
        fallback = document.getElementById("feeHistoryHint");
    }

    closeModal(modal, fallback);
    feeHistoryTarget = null;
}

function setFeeHistoryState(body, text, isError) {
    const p = document.createElement("p");
    p.className = isError ? "fee-history-state is-error" : "fee-history-state";
    p.setAttribute("role", isError ? "alert" : "status");
    if (!isError) p.setAttribute("aria-live", "polite");
    p.textContent = text;
    body.replaceChildren(p);
}

async function renderFeeHistoryModal() {
    const modal = document.getElementById("feeHistoryModal");
    const title = document.getElementById("feeHistoryTitle");
    const body = document.getElementById("feeHistoryBody");
    const target = feeHistoryTarget;
    if (!modal || !title || !body || !target) return;

    const { code, field } = target;
    const fieldLabel = getFeeFieldLabel(field);
    const row = allData.find((item) => String(item[dataKeys.code]) === code);
    const rowName = row ? valueOrDash(row[dataKeys.name]) : "-";

    title.textContent = `${rowName !== "-" ? rowName : code} (${code}) · ${fieldLabel}`;
    setFeeHistoryState(body, getTranslation("fee_history_loading"), false);

    let history;
    try {
        history = await loadFeeHistory();
    } catch (error) {
        if (feeHistoryTarget !== target || modal.hasAttribute("hidden")) return;
        setFeeHistoryState(body, getTranslation("fee_history_error"), true);
        return;
    }

    if (feeHistoryTarget !== target || modal.hasAttribute("hidden")) return;

    if (rowName === "-") {
        const historyName = history.names && typeof history.names[code] === "string" ? history.names[code] : "";
        if (historyName) {
            title.textContent = `${historyName} (${code}) · ${fieldLabel}`;
        }
    }

    const series = history.series && history.series[code];
    const raw = series ? series[FEE_HISTORY_FIELDS[field].historyKey] : null;
    const currentValue = row ? toNumber(row[dataKeys[field]]) : NaN;
    const points = buildFeeHistoryPoints(raw, currentValue, getKstToday());

    if (points.length === 0) {
        setFeeHistoryState(body, getTranslation("fee_history_empty"), false);
        return;
    }

    body.replaceChildren(renderFeeHistoryList(points));
}

function renderFeeHistoryList(points) {
    const section = document.createElement("section");

    const heading = document.createElement("h4");
    heading.className = "fee-history-list-title";
    heading.textContent = getTranslation("fee_history_list_title");
    section.appendChild(heading);

    const list = document.createElement("ol");
    list.className = "fee-history-list";

    for (let i = points.length - 1; i >= 0; i -= 1) {
        const point = points[i];
        const li = document.createElement("li");

        const date = document.createElement("span");
        date.className = "fee-history-date";
        date.textContent = point.date;
        li.appendChild(date);

        const value = document.createElement("span");
        value.className = "fee-history-value";
        value.textContent = formatPercent(point.value);
        li.appendChild(value);

        if (i > 0) {
            const diff = Math.round((point.value - points[i - 1].value) * 10000) / 10000;
            const delta = document.createElement("span");
            delta.className = diff > 0 ? "fee-history-delta up" : "fee-history-delta down";
            delta.textContent = `${diff > 0 ? "▲ " : "▼ "}${formatPercent(Math.abs(diff))}p`;
            li.appendChild(delta);
        } else {
            const start = document.createElement("span");
            start.className = "fee-history-start";
            start.textContent = getTranslation("fee_history_start");
            li.appendChild(start);
        }

        list.appendChild(li);
    }

    section.appendChild(list);
    return section;
}

function getDistinctCategories(data) {
    return [...new Set(
        data
            .map((item) => String(item[dataKeys.category] || "").trim())
            .filter(Boolean)
    )];
}

function getCategoryPreset() {
    const preset = document.body.getAttribute("data-category-preset");
    return preset ? preset.trim() : "";
}

function getCategoryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    return category ? category.trim() : "";
}

function syncCategoryParam(category) {
    if (getCategoryPreset()) return;

    const url = new URL(window.location.href);

    if (category) {
        url.searchParams.set("category", category);
    } else {
        url.searchParams.delete("category");
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", nextUrl);
}

function hasDataTable() {
    return Boolean(document.getElementById("tableBody"));
}

function isChangelogPage() {
    return getPageType() === "changelog";
}

function getPageType() {
    return document.body.dataset.page || "home";
}

function normalizeSeoKey(pageType) {
    return String(pageType || "home").replaceAll("-", "_");
}

function getDeviceType() {
    const width = window.innerWidth || document.documentElement.clientWidth || 1200;

    if (width <= 767) return "mobile";
    if (width <= 1023) return "tablet";
    return "desktop";
}

function normalizePath(path) {
    let normalized = String(path || "/");

    normalized = normalized.replace(/\\/g, "/");
    normalized = normalized.replace(/index\.html$/i, "");

    if (!normalized.startsWith("/")) {
        normalized = `/${normalized}`;
    }

    if (!normalized.endsWith("/")) {
        normalized = `${normalized}/`;
    }

    normalized = normalized.replace(/\/+/g, "/");

    return normalized === "//" ? "/" : normalized;
}

function toNumber(value) {
    if (value === null || value === undefined) return NaN;

    const parsed = Number.parseFloat(String(value).replaceAll(",", "").replace("%", ""));
    return Number.isFinite(parsed) ? parsed : NaN;
}

function formatPercent(value) {
    const number = toNumber(value);
    if (!Number.isFinite(number)) return "-";
    return `${number.toFixed(4)}%`;
}

function getKstToday() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function formatFeeTemplate(template, vars) {
    return String(template).replace(/\{([a-z]+)\}/g, (match, key) =>
        Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
    );
}

function buildFeeHistoryPoints(raw, currentValue, today) {
    if (!Array.isArray(raw)) return [];

    const points = [];
    raw.forEach((entry) => {
        if (!Array.isArray(entry)) return;
        const date = entry[0];
        const value = typeof entry[1] === "number" ? entry[1] : NaN;
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        if (!Number.isFinite(value)) return;
        points.push({ date, value });
    });

    if (points.length === 0) return [];

    points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    if (Number.isFinite(currentValue)) {
        const last = points[points.length - 1];
        if (currentValue.toFixed(4) !== last.value.toFixed(4)) {
            if (last.date === today) {
                last.value = currentValue;
            } else {
                points.push({ date: today, value: currentValue });
            }
        }
    }

    return points;
}

const FEE_CHART = { width: 320, height: 180, left: 48, right: 308, top: 12, bottom: 152 };

function computeFeeChartScale(values) {
    const finite = values.filter((v) => Number.isFinite(v));
    const min = finite.length ? Math.min(...finite) : 0;
    const max = finite.length ? Math.max(...finite) : 0;
    let lo;
    let hi;
    if (max > min) {
        const pad = (max - min) * 0.1;
        lo = Math.max(0, min - pad);
        hi = max + pad;
    } else if (max > 0) {
        lo = max * 0.5;
        hi = max * 1.5;
    } else {
        lo = 0;
        hi = 0.01;
    }
    return { min: lo, max: hi, ticks: [lo, (lo + hi) / 2, hi] };
}

function feeChartDayNumber(date) {
    const parts = String(date).split("-");
    return Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) / 86400000;
}

function feeChartX(date, startDate, today) {
    const span = Math.max(1, feeChartDayNumber(today) - feeChartDayNumber(startDate));
    const elapsed = Math.min(span, Math.max(0, feeChartDayNumber(date) - feeChartDayNumber(startDate)));
    return FEE_CHART.left + (elapsed / span) * (FEE_CHART.right - FEE_CHART.left);
}

function feeChartY(value, scale) {
    const range = scale.max - scale.min;
    const ratio = range > 0 ? (value - scale.min) / range : 0.5;
    return FEE_CHART.bottom - ratio * (FEE_CHART.bottom - FEE_CHART.top);
}

function feeChartRound(n) {
    return Math.round(n * 100) / 100;
}

function buildFeeStepPath(points, scale, today) {
    const start = points[0].date;
    let d = `M${feeChartRound(feeChartX(start, start, today))} ${feeChartRound(feeChartY(points[0].value, scale))}`;
    for (let i = 1; i < points.length; i += 1) {
        d += `H${feeChartRound(feeChartX(points[i].date, start, today))}`;
        d += `V${feeChartRound(feeChartY(points[i].value, scale))}`;
    }
    d += `H${FEE_CHART.right}`;
    return d;
}

function valueOrDash(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return "-";
    }

    return String(value);
}

function escapeHtml(raw) {
    return String(raw)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function stripHtmlTags(raw) {
    if (raw === null || raw === undefined) return "";

    return String(raw)
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
