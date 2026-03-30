// ==============================
// 사용자 관리 - hr010.js
// ==============================

// 상태
let currentHr010UserTypeTab = "all";
let hr010SourceRows = [];
const selectedFilters = {};

// ==============================
// 초기화
// ==============================
$(document).ready(async function () {
    bindEvents();
    showLoading();

    initDropdownFilter("work_md");
    initDropdownFilter("ctrt_typ");

    await loadUserTableData();
    hideLoading();
});

// ==============================
// 이벤트 바인딩
// ==============================
function bindEvents() {

    // 직원 / 프리랜서 토글
    $(".toggle-filter-chip").on("click", function () {
        const nextType = String($(this).data("userType") || "staff");
        if (currentHr010UserTypeTab === nextType) return;

        currentHr010UserTypeTab = nextType;
        $(".toggle-filter-chip").removeClass("is-active");
        $(this).addClass("is-active");

        applyFiltersAndRender();
    });

    // 검색 버튼
    $(".btn-search").on("click", async function (e) {
        e.preventDefault();
        showLoading();
        await loadUserTableData();
        hideLoading();
    });

    // 엔터 검색
    $("#searchConditionKeyword, #searchKeyword").on("keyup", async function (e) {
        if (e.key === "Enter") {
            showLoading();
            await loadUserTableData();
            hideLoading();
        }
    });
}

// ==============================
// 메인 데이터 로드 (핵심)
// ==============================
async function loadUserTableData() {

    const searchType = $("#searchType").val() || "";
    const keyword = $.trim($("#searchConditionKeyword").val());
    let tagKeyword = $.trim($("#searchKeyword").val());

    tagKeyword = tagKeyword
        ? tagKeyword.split(/[\s,]+/).filter(Boolean).join(" ")
        : null;

    try {
        const response = await $.ajax({
            url: "/hr010/list",
            type: "GET",
            data: { searchKeyword: tagKeyword }
        });

        let list = response?.res || [];

        if (!list.length) {
            hr010SourceRows = [];
            renderUserCards([]);
            return;
        }

        // 점수 병렬 조회
        const scoreMap = await fetchAllScores(list);

        list = list.map(row => ({
            ...row,
            grade: scoreMap[row.dev_id]?.rank || "",
            score: scoreMap[row.dev_id]?.score || 0
        }));

        // 이미지 preload
        await preloadImages(list);

        // 조건 필터
        hr010SourceRows = applyHr010ConditionFilter(list, searchType, keyword);

        applyFiltersAndRender();

    } catch (e) {
        console.error(e);
        showAlert({
            icon: 'error',
            title: '오류',
            text: '데이터 로딩 실패'
        });
    }
}

// ==============================
// 필터 + 렌더 (단일 진입점)
// ==============================
function applyFiltersAndRender() {
    let filtered = filterHr010RowsByType(hr010SourceRows);
    Object.keys(selectedFilters).forEach(key => {
        const value = selectedFilters[key];
        if (!value) return;
        filtered = filtered.filter(row =>
            row[key] && row[key] === value
        );
    });
    renderUserCards(filtered);
}

// 조회조건 + 검색어 필터
function applyHr010ConditionFilter(list, searchType, rawKeyword) {
    // 안전 가드
    if (!Array.isArray(list)) return [];
    // 검색어 없으면 그대로 반환
    if (!rawKeyword || !String(rawKeyword).trim()) {
        return list;
    }
    const keyword = String(rawKeyword).toLowerCase();
    const keywordDigits = normalizeHr010Digits(rawKeyword);
    // 전체 검색
    if (!searchType) {
        return list.filter(function (row) {
            return hr010SearchableFields.some(function (field) {
                return matchHr010FieldKeyword(row, field, keyword, keywordDigits);
            });
        });
    }
    // 특정 필드 검색
    return list.filter(function (row) {
        return matchHr010FieldKeyword(row, searchType, keyword, keywordDigits);
    });
}

// ==============================
// 점수 조회
// ==============================
async function fetchAllScores(list) {
    const results = await Promise.allSettled(
        list.map(row => fetchUserScore(row.dev_id))
    );

    const map = {};

    results.forEach((res, idx) => {
        const devId = list[idx].dev_id;
        map[devId] = res.status === "fulfilled"
            ? (res.value?.res || {})
            : {};
    });

    return map;
}
// 사용자 점수 조회 (안정성 + 예외처리 + 기본값 포함)
function fetchUserScore(devId) {
    // devId 없으면 바로 기본값 반환
    if (!devId) {
        return Promise.resolve({
            res: {
                rank: "",
                score: 0
            }
        });
    }

    return $.ajax({
        url: "/hr010/getScore",
        type: "GET",
        data: { dev_id: devId },
        dataType: "json",
        timeout: 5000 // 네트워크 지연 방지
    })
        .then(function (response) {
            // 정상 응답인데 값이 없는 경우 대비
            if (!response || !response.res) {
                return {
                    res: {
                        rank: "",
                        score: 0
                    }
                };
            }

            return response;
        })
        .catch(function (error) {
            console.warn(`점수 조회 실패 (devId: ${devId})`, error);

            // 실패해도 전체 로직 안 깨지도록 기본값 반환
            return {
                res: {
                    rank: "",
                    score: 0
                }
            };
        });
}

// ==============================
// 포매터
// ==============================
function formatGradeLabel(rank, score) {
    if (!rank) return "";
    return `${rank}등급 (${score || 0}점)`;
}

// 계약단가(,),(테이블표)
function amountFormatter(value, data, cell, row, options) {
    if (value === null || value === undefined || value === "") {
        return "";
    }
    return formatAmount(value);
}

// 팝업에서도 마찬가지로 (,) 표시
function formatAmount(value) {
    if (value === null || value === undefined || value === "") return "";

    const numeric = value
        .toString()
        .replace(/[^0-9]/g, "")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return numeric ? numeric + "원" : "";
}

// 경력 표시
function formatCareerYearMonth(value) {
    if (value === null || value === undefined || value === "") {
        return "";
    }

    var raw = String(value).trim();
    if (!raw) {
        return "";
    }

    if (!/^\d+(\.\d+)?$/.test(raw)) {
        return raw;
    }

    var parts = raw.split(".");
    var years = parseInt(parts[0], 10) || 0;
    if (parts.length === 1) {
        if (years === 0) {
            return "0개월";
        }
        return years + "년";
    }

    var monthsRaw = String(parts[1] || "");
    if (!monthsRaw || /^0+$/.test(monthsRaw)) {
        if (years === 0) {
            return "0개월";
        }
        return years + "년";
    }

    var months = parseInt(monthsRaw, 10);
    if (!months) {
        if (years === 0) {
            return "0개월";
        }
        return years + "년";
    }
    return years + "년 " + months + "개월";
}

// 엑셀 다운로드 처리
const excelBtn = document.getElementById("btn-excel");
if (excelBtn) {
    excelBtn.addEventListener("click", function () {
        const devId = document.getElementById("dev_id").value;
        const devNm = document.getElementById("dev_nm").value;
        if (!devId) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                html: `<strong>개발자ID</strong>가 없습니다.`
            });
            return;
        }
        location.href =
            `/common/getExcel?dev_id=${encodeURIComponent(devId)}&dev_nm=${encodeURIComponent(devNm)}`;
    });
}
// 둥근 프로필 생성
function makeProfileCircle(name) {
    const text = getProfileText(name);
    const bgColor = stringToSoftColor(name);

    return `
        <div class="profile-circle-icon" style="background:${bgColor}">
            ${text}
        </div>
    `;
}

// ==============================
// 이미지 preload
// ==============================
function preloadImages(list) {
    return Promise.all(
        list.map(row => {
            if (row.has_img && row.img_url) {
                return new Promise(resolve => {
                    const img = new Image();
                    img.src = row.img_url;
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }
            return Promise.resolve();
        })
    );
}
// ==============================
// 타입 필터
// ==============================
function resolveUserType(row) {
    const type = row.select_dev_typ;

    if (type) {
        const upper = String(type).toUpperCase();
        if (upper === "HCNC_F" || upper === "F") return "freelancer";
        if (upper === "HCNC_S" || upper === "S") return "staff";
    }
    if (row.dev_id?.startsWith("HCNC_F")) return "freelancer";
    return "staff";
}

function filterHr010RowsByType(list) {
    if (currentHr010UserTypeTab === "all") return list;

    return list.filter(row =>
        currentHr010UserTypeTab === "freelancer"
            ? resolveUserType(row) === "freelancer"
            : resolveUserType(row) === "staff"
    );
}

// ==============================
// 카드 렌더링
// ==============================
function renderUserCards(list) {

    const container = document.getElementById("CARD_HR010_A");
    if (!container) return;

    if (!list || !list.length) {
        container.innerHTML = `
            <div class="no-data-wrap">
                <div class="no-data-box">
                    <div class="no-data-icon">📭</div>
                    <div class="no-data-text">데이터 없음</div>
                </div>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach(row => {
        const div = document.createElement("div");
        div.innerHTML = createUserCard(row);
        fragment.appendChild(div.firstElementChild);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
    bindCardEvents(container, list);
}

// ==============================
// 카드 생성
// ==============================
function createUserCard(row) {

    const profile = (row.has_img && row.img_url)
        ? `<img src="${row.img_url}" class="profile-circle-icon" alt=""/>`
        : makeProfileCircle(row.dev_nm);

    return `
    <div class="user-card" data-id="${row.dev_id}">
        <div class="card-header">
            <input type="checkbox" class="card-check"/>
        </div>
        <div class="card-body">
            <div class="profile-circle-wrap">
                ${profile}
                <span class="name">${row.dev_nm}</span>
            </div>
            <div class="card-info">
                <div>등급: ${formatGradeLabel(row.grade, row.score) || "-"}</div>
                <div>언어: ${(row.main_lang_nm || "-").replace(/,/g, ", ")}</div>
                <div>단가: ${amountFormatter(row.hope_rate_amt)}</div>
                <div>경력: ${formatCareerYearMonth(row.exp_yr)}</div>
                <div>지역: ${row.region || "-"}</div>
            </div>
        </div>
    </div>`;
}

// ==============================
// 이벤트 위임 (핵심)
// ==============================
function bindCardEvents(container, list) {
    container.onclick = function (e) {
        const card = e.target.closest(".user-card");
        if (!card) return;
        const checkbox = card.querySelector(".card-check");

        // 모든 카드 선택 해제
        const selected = container.querySelector(".user-card.selected");
        if (selected) {
            selected.classList.remove("selected");
            selected.querySelector(".card-check").checked = false;
        }

        // 현재 카드만 선택
        if (e.target.classList.contains("card-check")) {
            card.classList.add("selected");
            checkbox.checked = true;
            return;
        }
        card.classList.add("selected");
        checkbox.checked = true;
    };

    container.ondblclick = function (e) {
        const card = e.target.closest(".user-card");
        if (!card) return;
        const devId = card.dataset.id;
        const row = list.find(r => r.dev_id === devId);
        console.log(row);
        alert(JSON.stringify(row, null, 2));
    };
}

// ==============================
// 아코디언 기능
// ==============================
$(document).on("click", ".dropdown-btn", function () {
    const dropdown = this.parentElement;
    $(".dropdown").not(dropdown).removeClass("open");
    $(dropdown).toggleClass("open");
});

// 아코디언 메뉴 클릭 시
document.querySelectorAll(".dropdown-menu li").forEach(item => {
    item.addEventListener("click", function () {
        const dropdown = this.closest(".dropdown");
        dropdown.classList.remove("open");
    });
});

// 아코디언 클릭 시
$(document).on("click", ".dropdown-menu li", function () {
    const key = $(this).data("key");
    const cd = $(this).data("cd");
    selectedFilters[key] = cd;
    // 선택 표시
    $(this).siblings().removeClass("active");
    $(this).addClass("active");
    applyFiltersAndRender();
});

// ==============================
// 공통코드 불러오기
// ==============================
const dropdownFilters = {
    work_md: {
        selectId: "select_work_md",
        code: "WORK_MD",
        options: [],
        map: {},
        container: ".dropdown-work-md"
    },
    ctrt_typ: {
        selectId: "select_ctrt_typ",
        code: "CTRT_TYP",
        options: [],
        map: {},
        container: ".dropdown-ctrt-typ"
    }
};

// 공통 초기화 함수
function initDropdownFilter(key) {
    const config = dropdownFilters[key];

    setComCode(config.selectId, config.code, "", "cd", "cd_nm", function () {

        config.options = $("#" + config.selectId + " option").map(function () {
            return { cd: this.value, cd_nm: $(this).text() };
        }).get();

        config.map = buildMap(config.options);

        renderDropdown(key);
    });
}

// 공통 map 생성
function buildMap(options) {
    const map = {};
    options.forEach(opt => {
        if (opt.cd) map[opt.cd] = opt.cd_nm;
    });
    return map;
}

// 공통 dropdown 렌더링
function renderDropdown(key) {
    const config = dropdownFilters[key];
    const $menu = $(config.container).find(".dropdown-menu");

    if (!$menu.length) return;

    $menu.empty();

    $menu.append(`
        <li data-key="${key}" data-cd="" class="active">
            전체
        </li>
    `);

    config.options.forEach(opt => {
        if (!opt.cd) return;

        $menu.append(`
            <li data-key="${key}" data-cd="${opt.cd}">
                ${opt.cd_nm}
            </li>
        `);
    });
}