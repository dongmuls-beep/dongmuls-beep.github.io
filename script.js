// Replace with your actual GAS Web App URL
// Use local static JSON for GitHub Pages/Netlify hosting (Unlimited Traffic)
const GAS_API_URL = "./data.json";

// Global State
let allData = [];
let currentCategory = '';
let currentLanguage = 'ko'; // Default language

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Language
    initLanguage();

    // 2. Fetch Data
    fetchData();

    // 3. Init UI
    initNavigation();
    handleRouting();
});

function initLanguage() {
    const savedLang = localStorage.getItem('site_language');
    const browserLang = navigator.language.slice(0, 2);

    // Supported languages
    const supportedLangs = ['ko', 'vi', 'zh', 'en', 'ja', 'th', 'tl', 'km'];

    if (savedLang && supportedLangs.includes(savedLang)) {
        currentLanguage = savedLang;
    } else if (supportedLangs.includes(browserLang)) {
        currentLanguage = browserLang;
    }

    // Set Selector Value
    const selector = document.getElementById('languageSelect');
    if (selector) {
        selector.value = currentLanguage;
        selector.addEventListener('change', (e) => {
            updateLanguage(e.target.value);
        });
    }

    // Apply translations
    updateLanguage(currentLanguage);
}

function updateLanguage(lang) {
    if (!translations[lang]) return;

    currentLanguage = lang;
    localStorage.setItem('site_language', lang);
    document.documentElement.lang = lang;

    // Update simple text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            // Using innerHTML to support keys with HTML tags (like <br> or <strong>)
            el.innerHTML = translations[lang][key];
        }
    });

    // Update Page Title and Meta Description if keys exist
    if (translations[lang]['seo_title']) {
        document.title = translations[lang]['seo_title'];
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && translations[lang]['seo_description']) {
        metaDesc.setAttribute('content', translations[lang]['seo_description']);
    }

    // Re-render table to update data-labels used in Mobile View
    if (allData.length > 0) {
        renderTabs(allData); // Update tabs and re-render table
        filterAndRenderTable();
    }
}

function getTranslation(key) {
    return (translations[currentLanguage] && translations[currentLanguage][key])
        ? translations[currentLanguage][key]
        : key;
}

function initNavigation() {
    // Hamburger Menu Toggle
    const hamburger = document.querySelector('.hamburger-menu');
    const nav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburger && nav) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            nav.classList.toggle('active');
        });
    }

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            nav.classList.remove('active');
        });
    });

    // Handle Hash Change
    window.addEventListener('hashchange', handleRouting);
}

function handleRouting() {
    const hash = window.location.hash || '#home';
    const cleanHash = hash.replace('#', '');
    const viewId = cleanHash === 'home' ? 'home-view' : `${cleanHash}-view`;

    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
        setTimeout(() => targetView.classList.add('active'), 10);
    } else {
        const homeView = document.getElementById('home-view');
        if (homeView) {
            homeView.style.display = 'block';
            homeView.classList.add('active');
        }
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === hash || (hash === '#home' && link.getAttribute('href') === '#home')) {
            link.classList.add('active');
        }
    });

    window.scrollTo(0, 0);
}

async function fetchData() {
    const tbody = document.getElementById('tableBody');
    const updateTime = document.getElementById('lastUpdated');

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="loading-text">${getTranslation('table_loading')}</td></tr>`;
    if (updateTime) updateTime.textContent = getTranslation('last_updated') + '...';

    try {
        const response = await fetch(GAS_API_URL);
        const data = await response.json();

        // console.log("Fetched Data:", data);

        if (Array.isArray(data)) {
            allData = data;
            renderTabs(allData);
            filterAndRenderTable();

            if (updateTime) {
                const now = new Date();
                const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
                updateTime.textContent = `${getTranslation('last_updated')} ${formattedDate}`;
            }
        } else {
            throw new Error("Invalid data format");
        }

    } catch (error) {
        console.error('Error fetching data:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="loading-text" style="color: red;">${getTranslation('table_error')}</td></tr>`;
        if (updateTime) updateTime.textContent = 'Update Failed';
    }
}

function renderTabs(data) {
    const tabsContainer = document.getElementById('categoryTabs');
    if (!tabsContainer) return;

    const rawCategories = data.map(item => item['구분'] ? String(item['구분']).trim() : 'Uncategorized');
    const categories = [...new Set(rawCategories)];

    tabsContainer.innerHTML = '';

    if (categories.length > 0 && (!currentCategory || !categories.includes(currentCategory))) {
        currentCategory = categories[0];
    }

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `tab-button ${cat === currentCategory ? 'active' : ''}`;
        btn.textContent = cat;
        btn.dataset.category = cat;

        btn.addEventListener('click', () => {
            setCategory(cat, btn);
        });

        tabsContainer.appendChild(btn);
    });
}

function setCategory(cat, btnElement) {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    currentCategory = cat;
    filterAndRenderTable();
}

function filterAndRenderTable() {
    let filteredData = allData;
    if (currentCategory && currentCategory !== 'all') {
        filteredData = allData.filter(item => {
            const cat = item['구분'] ? String(item['구분']).trim() : 'Uncategorized';
            return cat === currentCategory;
        });
    }
    renderTable(filteredData);
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="loading-text">${getTranslation('table_empty')}</td></tr>`;
        return;
    }

    data.sort((a, b) => {
        const costA = parseFloat(a['실부담비용']) || 0;
        const costB = parseFloat(b['실부담비용']) || 0;
        return costA - costB;
    });

    data.forEach(item => {
        const row = document.createElement('tr');
        const formatPercent = (num) => parseFloat((parseFloat(num) || 0).toFixed(4)) + '%';
        const naverUrl = item['종목코드'] ? `https://finance.naver.com/item/main.naver?code=${item['종목코드']}` : '#';

        // Use localized labels for mobile view
        row.innerHTML = `
            <td class="clickable" data-label="${getTranslation('table_code')}" onclick="copyToClipboard('${item['종목코드']}')" title="Copy Code">${item['종목코드'] || '-'}</td>
            <td data-label="${getTranslation('table_name')}" style="font-weight: 500;">
                <a href="${naverUrl}" target="_blank" rel="noopener noreferrer" class="stock-link">${item['종목명'] || '-'}</a>
            </td>
            <td class="text-right" data-label="${getTranslation('table_fee')}">${formatPercent(item['총보수'])}</td>
            <td class="text-right" data-label="${getTranslation('table_other')}">${formatPercent(item['기타비용'])}</td>
            <td class="text-right" data-label="${getTranslation('table_trade')}">${formatPercent(item['매매중개수수료'])}</td>
            <td class="text-right highlight" data-label="${getTranslation('table_real')}">${formatPercent(item['실부담비용'])}</td>
        `;

        tbody.appendChild(row);
    });
}

function copyToClipboard(text) {
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text).then(() => {
        showToast(`Copied: ${text}`);
    }).catch(err => console.error('Copy failed:', err));
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast show';
    setTimeout(() => toast.className = toast.className.replace('show', ''), 3000);
}
