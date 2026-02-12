// Replace with your actual GAS Web App URL
// Use local static JSON for GitHub Pages/Netlify hosting (Unlimited Traffic)
const GAS_API_URL = "./data.json";
// const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwx4Bee14DASyNTMz5CrYsb4C4TtNldAcWU3ccj1UJaV1uQAF3lYEJQGaAavfXwpVcJ/exec";

// Global State
let allData = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

async function fetchData() {
    const tbody = document.getElementById('tableBody');
    const updateTime = document.getElementById('lastUpdated');

    if (!tbody) { console.error("tbody not found"); return; }

    // Show loading state
    tbody.innerHTML = '<tr><td colspan="6" class="loading-text">데이터를 불러오는 중입니다...</td></tr>';
    if (updateTime) updateTime.textContent = '업데이트 중...';

    try {
        const response = await fetch(GAS_API_URL);
        const data = await response.json();

        console.log("Fetched Data:", data);

        if (Array.isArray(data)) {
            allData = data;
            renderTabs(allData);
            filterAndRenderTable();

            if (updateTime) {
                const now = new Date();
                const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
                updateTime.textContent = `최근 업데이트: ${formattedDate}`;
            }
        } else {
            throw new Error("Invalid data format");
        }

    } catch (error) {
        console.error('Error fetching data:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="loading-text" style="color: red;">데이터를 불러오지 못했습니다. <br> 잠시 후 다시 시도해주세요.</td></tr>';
        if (updateTime) updateTime.textContent = '업데이트 실패';
    }
}

function renderTabs(data) {
    const tabsContainer = document.getElementById('categoryTabs');
    if (!tabsContainer) return;

    // Get unique categories with robust trimming
    const rawCategories = data.map(item => item['구분'] ? String(item['구분']).trim() : 'Uncategorized');
    // Remove 'all', just get unique categories
    const categories = [...new Set(rawCategories)];

    tabsContainer.innerHTML = ''; // Clear existing

    // Set default category to the first one if currentCategory is 'all' or invalid
    if ((currentCategory === 'all' || !currentCategory) && categories.length > 0) {
        currentCategory = categories[0];
    }

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `tab-button ${cat === currentCategory ? 'active' : ''}`;
        btn.textContent = cat; // No 'All' translation needed
        btn.dataset.category = cat;

        btn.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentCategory = cat;
            filterAndRenderTable();
        });

        tabsContainer.appendChild(btn);
    });
}

function filterAndRenderTable() {
    let filteredData = allData;

    // Always filter by currentCategory (no 'all' option)
    if (currentCategory) {
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
        tbody.innerHTML = '<tr><td colspan="6" class="loading-text">표시할 데이터가 없습니다.</td></tr>';
        return;
    }

    // Sort by Total Cost (Real Cost) Ascending
    data.sort((a, b) => {
        const costA = parseFloat(a['실부담비용']) || 0;
        const costB = parseFloat(b['실부담비용']) || 0;
        return costA - costB;
    });

    data.forEach(item => {
        const row = document.createElement('tr');

        // Formatting numbers
        const formatPercent = (num) => {
            return (parseFloat(num) || 0).toFixed(4) + '%';
        };

        // Removed '구분' column
        const naverUrl = item['종목코드'] ? `https://finance.naver.com/item/main.naver?code=${item['종목코드']}` : '#';

        row.innerHTML = `
            <td class="clickable" data-label="종목코드" onclick="copyToClipboard('${item['종목코드']}')" title="클릭하여 종목코드 복사">${item['종목코드'] || '-'}</td>
            <td data-label="종목명" style="font-weight: 500;"><a href="${naverUrl}" target="_blank" rel="noopener noreferrer" class="stock-link" title="네이버 금융에서 보기">${item['종목명'] || '-'}</a></td>
            <td class="text-right" data-label="총보수">${formatPercent(item['총보수'])}</td>
            <td class="text-right" data-label="기타비용">${formatPercent(item['기타비용'])}</td>
            <td class="text-right" data-label="매매중계">${formatPercent(item['매매중계수수료'])}</td>
            <td class="text-right highlight" data-label="실부담비용(%)">${formatPercent(item['실부담비용'])}</td>
        `;

        tbody.appendChild(row);
    });
}

// Clipboard Copy Function
function copyToClipboard(text) {
    if (!text || text === '-') return;

    navigator.clipboard.writeText(text).then(() => {
        showToast(`복사되었습니다: ${text}`);
    }).catch(err => {
        console.error('복사 실패:', err);
    });
}

// Toast Message Function
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = 'toast show';

    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}
