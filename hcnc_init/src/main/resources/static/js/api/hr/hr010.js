// ==============================
// 사용자 관리 - hr010.js
// ==============================

// 상태
let currentHr010UserTypeTab = "all";
let currentHr010ViewMode = "card";
let hr010SourceRows = [];
let hr010LastRenderedRows = [];
let keywordTags = [];
let hr010TagSuggestions = [];
let hr010ActiveSuggestionIndex = -1;
let hr010SuggestionHideTimer = null;
let hr010SuggestionInputTimer = null;
let hr010DropdownSectionState = {
    skl_grp: {},
    grade: {}
};
const selectedFilters = {
    skl_grp: [],
    ctrt_typ: [],
    work_md: [],
    grade: [],
    kosa_grd_cd: [],
    sido_cd: []
};
const hr010FilterOrder = ["skl_grp", "ctrt_typ", "work_md", "grade", "kosa_grd_cd", "sido_cd"];
const hr010GradeOrder = ["S", "A", "B", "C"];
const HR010_SUGGESTION_TRANSITION_MS = 220;
const HR010_SUGGESTION_INPUT_DEBOUNCE_MS = 260;
const HR010_LIST_ENTER_STAGGER_MS = 48;

try {
    currentHr010ViewMode = window.localStorage.getItem("hr010ViewMode") || "card";
} catch (error) {
    currentHr010ViewMode = "card";
}

// ==============================
// 초기화
// ==============================
$(document).ready(async function () {
    bindEvents();
    syncHr010ViewToggle();
    syncHr010FilterSidebar();
    showLoading();

    // 스마트 필터 공통코드 초기화
    await Promise.all([
        initDropdownFilter("work_md"), // 근무가능형태
        initDropdownFilter("ctrt_typ"), // 계약형태
        initDropdownFilter("sido_cd"), // 거주지역
        initDropdownFilter("skl_grp"), // 주개발언어 - 스킬
        initDropdownFilter("grade") // 등급 / KOSA
    ]);

    await loadUserTableData();
    renderSelectedTags();
    refreshTagSuggestions();
    hideLoading();

    // console.log(hr010SourceRows[0]);
});

// ==============================
// 이벤트 바인딩
// ==============================
function bindEvents() {
    $("#hr010CreateBtn").on("click", function () {
        window.location.href = "/hr011?mode=insert";
    });

    $("#hr010FilterRefreshBtn").on("click", function () {
        resetHr010Filters();
    });

    // 직원 / 프리랜서 토글
    $(".toggle-filter-chip").on("click", function () {
        const nextType = String($(this).data("userType") || "staff");
        if (currentHr010UserTypeTab === nextType) return;

        currentHr010UserTypeTab = nextType;
        $(".toggle-filter-chip").removeClass("is-active");
        $(this).addClass("is-active");

        applyFiltersAndRender();
    });

    // 카드 / 리스트 보기 토글
    $(".hr010-view-toggle-btn").on("click", function () {
        const nextMode = String($(this).data("view") || "card");
        if (currentHr010ViewMode === nextMode) return;
        setHr010ViewMode(nextMode);
    });

    // 검색/필터 초기화
    $(".hr010-main .btn-search").on("click", function (e) {
        e.preventDefault();
        resetHr010Filters();
    });

    $("#hr010SearchTrigger").on("click", function (e) {
        e.preventDefault();
        const committed = commitSuggestionFromInput();
        if (!committed) {
            refreshTagSuggestions($("#hr010TagKeywordInput").val());
            $("#hr010TagKeywordInput").trigger("focus");
        }
    });

    // 검색어 추천/선택
    $("#hr010TagKeywordInput").on("input", function () {
        scheduleHr010TagSuggestions(this.value);
    });

    $("#hr010TagKeywordInput").on("focus", function () {
        scheduleHr010TagSuggestions(this.value, 120);
    });

    $("#hr010TagKeywordInput").on("keydown", function (e) {
        const value = this.value.trim();

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                flushHr010TagSuggestions(this.value);
                moveTagSuggestion(1);
                break;

            case "ArrowUp":
                e.preventDefault();
                flushHr010TagSuggestions(this.value);
                moveTagSuggestion(-1);
                break;

            case "Enter":
            case ",":
                e.preventDefault();
                flushHr010TagSuggestions(this.value);
                commitSuggestionFromInput();
                break;

            case "Escape":
                window.clearTimeout(hr010SuggestionInputTimer);
                hideTagSuggestions();
                break;

            case "Backspace":
                if (!value && keywordTags.length) {
                    e.preventDefault();
                    keywordTags.pop();
                    renderSelectedTags();
                    applyFiltersAndRender();
                }
                break;
        }
    });

    // 태그 삭제
    $(document).on("click", ".hr010-tag-remove", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const tagType = $(this).data("type");
        const key = $(this).data("key");
        const value = String($(this).data("value") || "");

        if (tagType === "keyword") {
            keywordTags = keywordTags.filter(tag => tag !== value);
            renderSelectedTags();
            applyFiltersAndRender();
            return;
        }

        if (!key) return;

        if (key === "grade" || key === "kosa_grd_cd") {
            selectedFilters[key] = selectedFilters[key].filter(item => item !== value);
            renderDropdown("grade");
        } else if (selectedFilters[key]) {
            selectedFilters[key] = selectedFilters[key].filter(item => item !== value);
            renderDropdown(key);
        }

        renderSelectedTags();
        applyFiltersAndRender();
    });

    // 추천어 선택
    $(document).on("mousedown", ".hr010-tag-suggestion-item", function (e) {
        e.preventDefault();
        window.clearTimeout(hr010SuggestionInputTimer);
        const index = Number($(this).data("index"));
        const suggestion = hr010TagSuggestions[index];
        if (!suggestion) return;
        commitTagSuggestion(suggestion);
    });

    // 아코디언 버튼
    $(document).on("click", ".dropdown-btn", function (e) {
        e.stopPropagation();
        const dropdown = this.parentElement;
        $(".dropdown").not(dropdown).removeClass("open");
        $(dropdown).toggleClass("open");
    });

    // 아코디언 항목 선택
    $(document).on("click", ".dropdown-menu__section", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const $dropdown = $(this).closest(".dropdown");
        const sectionKey = String($(this).data("sectionKey") || "").trim();
        if (!$dropdown.length || !sectionKey) return;

        if ($dropdown.hasClass("dropdown-skl-grp")) {
            toggleHr010DropdownSection("skl_grp", sectionKey);
            return;
        }

        if ($dropdown.hasClass("dropdown-grade")) {
            toggleHr010DropdownSection("grade", sectionKey);
        }
    });

    // 아코디언 항목 선택
    $(document).on("click", ".dropdown-menu li", function (e) {
        e.stopPropagation();
        const dropdown = $(this).closest(".dropdown");
        const key = $(this).data("key");
        const cd = String($(this).data("cd") || "");
        const isSection = $(this).hasClass("dropdown-menu__section") || $(this).hasClass("is-disabled");

        if (!key || isSection) return;

        // 같은 필터 내 다중 선택이 가능하도록 선택 후에도 현재 드롭다운은 유지
        $(".dropdown").not(dropdown).removeClass("open");

        if (key === "grade_all") {
            selectedFilters.grade = [];
            selectedFilters.kosa_grd_cd = [];
            renderDropdown("grade");
            dropdown.addClass("open");
            renderSelectedTags();
            applyFiltersAndRender();
            return;
        }

        updateSelectedFilter(key, cd);
        renderRelatedDropdown(key);
        dropdown.addClass("open");
        renderSelectedTags();
        applyFiltersAndRender();
    });

    // 외부 클릭 시 드롭다운 닫기
    $(document).on("click", function (e) {
        if (!$(e.target).closest(".dropdown").length) {
            $(".dropdown").removeClass("open");
        }

        if (!$(e.target).closest(".hr010-search-tag-wrap").length) {
            hideTagSuggestions();
        }
    });
}

// 카드/리스트 토글 상태 동기화
function syncHr010ViewToggle() {
    $(".hr010-view-toggle-btn").removeClass("is-active").attr("aria-selected", "false");
    $(`.hr010-view-toggle-btn[data-view="${currentHr010ViewMode}"]`).addClass("is-active").attr("aria-selected", "true");
}

function syncHr010FilterSidebar() {
    const shell = document.querySelector(".contents-wrap.hr010-dashboard-wrap");
    const filterEl = document.getElementById("hr010SmartFilter");
    if (!filterEl) return;

    if (shell) {
        shell.classList.remove("is-filter-collapsed");
    }
    filterEl.classList.remove("is-collapsed");
}

// 카드/리스트 보기 전환
function setHr010ViewMode(nextMode) {
    currentHr010ViewMode = nextMode === "list" ? "list" : "card";

    try {
        window.localStorage.setItem("hr010ViewMode", currentHr010ViewMode);
    } catch (error) {
        // localStorage 사용 불가 시 무시
    }

    syncHr010ViewToggle();
    renderUserCards(hr010LastRenderedRows);
}

// ==============================
// 메인 데이터 로드 (핵심)
// ==============================
async function loadUserTableData() {
    try {
        const response = await $.ajax({
            url: "/hr010/list",
            type: "GET"
        });

        let list = response?.res || [];

        if (!list.length) {
            hr010SourceRows = [];
            refreshDynamicFilterOptions([]);
            renderUserCards([]);
            return;
        }

        // 점수 병렬 조회
        const scoreMap = await fetchAllScores(list);

        list = list.map(row => {
            const imgUrl = row.img_url || (row.dev_img_base64 ? `data:image/png;base64,${row.dev_img_base64}` : "");
            const hasImg = Boolean(imgUrl);

            return {
                ...row,
                grade: scoreMap[row.dev_id]?.rank || "",
                score: scoreMap[row.dev_id]?.score || 0,
                img_url: imgUrl,
                has_img: hasImg
            };
        });

        // 이미지 preload
        await preloadImages(list);

        hr010SourceRows = list;
        refreshDynamicFilterOptions(list);
        applyFiltersAndRender();
        refreshTagSuggestions($("#hr010TagKeywordInput").val());

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

    if (keywordTags.length) {
        filtered = filtered.filter(row =>
            keywordTags.some(tag => String(row.dev_nm || "").includes(tag))
        );
    }

    hr010FilterOrder.forEach(key => {
        const values = selectedFilters[key] || [];
        if (!values.length) return;

        filtered = filtered.filter(row =>
            values.some(value => matchesHr010Filter(row, key, value))
        );
    });

    renderUserCards(filtered);
}

// 검색창 입력값 기준 추천어 적용
function commitSuggestionFromInput() {
    const inputValue = $.trim($("#hr010TagKeywordInput").val());
    if (!inputValue) return false;

    const activeSuggestion = hr010TagSuggestions[hr010ActiveSuggestionIndex];
    if (activeSuggestion) {
        commitTagSuggestion(activeSuggestion);
        return true;
    }

    const exactSuggestion = hr010TagSuggestions.find(suggestion =>
        String(suggestion.matchText || suggestion.label || "").toLowerCase() === inputValue.toLowerCase()
        || String(suggestion.label || "").toLowerCase() === inputValue.toLowerCase()
    );

    if (exactSuggestion) {
        commitTagSuggestion(exactSuggestion);
        return true;
    }

    refreshTagSuggestions(inputValue);
    return false;
}

// 추천어 선택 내용을 태그/필터 상태에 반영
function commitTagSuggestion(suggestion) {
    if (!suggestion) return;

    if (suggestion.type === "name") {
        if (!keywordTags.includes(suggestion.value)) {
            keywordTags = [...keywordTags, suggestion.value];
        }
    } else if (suggestion.type === "filter" && selectedFilters[suggestion.key]) {
        updateSelectedFilter(suggestion.key, suggestion.value);
        renderRelatedDropdown(suggestion.key);
    }

    $("#hr010TagKeywordInput").val("");
    hideTagSuggestions();
    renderSelectedTags();
    applyFiltersAndRender();
}

// 현재 선택된 검색/필터 태그 렌더링
function renderSelectedTags() {
    const area = document.getElementById("hr010TagArea");
    if (!area) return;

    const tags = [];

    keywordTags.forEach(keyword => {
        tags.push({
            type: "keyword",
            key: "keyword",
            value: keyword,
            label: `이름: ${keyword}`
        });
    });

    hr010FilterOrder.forEach(key => {
        const values = selectedFilters[key] || [];
        values.forEach(value => {
            const config = dropdownFilters[key];
            tags.push({
                type: "filter",
                key,
                value,
                label: `${config ? config.label : key}: ${getDropdownOptionLabel(key, value)}`
            });
        });
    });

    if (!tags.length) {
        area.innerHTML = "";
        area.classList.add("is-empty");
        return;
    }

    area.classList.remove("is-empty");
    area.innerHTML = tags.map(tag => `
        <button type="button" class="hr010-tag-chip" data-type="${tag.type}" data-key="${tag.key}" data-value="${escapeHtml(tag.value)}">
            <span class="hr010-tag-chip__label">${escapeHtml(tag.label)}</span>
            <span class="hr010-tag-remove" data-type="${tag.type}" data-key="${tag.key}" data-value="${escapeHtml(tag.value)}" aria-label="태그 삭제">×</span>
        </button>
    `).join("");
}

// 태그 검색/스마트 필터 전체 초기화
function resetHr010Filters() {
    currentHr010UserTypeTab = "all";
    keywordTags = [];

    Object.keys(selectedFilters).forEach(key => {
        selectedFilters[key] = [];
    });

    $("#hr010TagKeywordInput").val("");
    hideTagSuggestions();
    $(".dropdown").removeClass("open");
    $(".toggle-filter-chip").removeClass("is-active");
    $('.toggle-filter-chip[data-user-type="all"]').addClass("is-active");

    hr010DropdownSectionState = {
        skl_grp: {},
        grade: {}
    };

    renderSelectedTags();
    Object.keys(dropdownFilters).forEach(key => {
        if (key === "kosa_grd_cd") return;
        renderDropdown(key);
    });
    $(".dropdown-skl-grp").addClass("open");
    applyFiltersAndRender();
}

// 선택된 스마트 필터를 토글/초기화
function updateSelectedFilter(key, cd) {
    if (!selectedFilters[key]) {
        selectedFilters[key] = [];
    }

    if (!cd) {
        selectedFilters[key] = [];
        return;
    }

    if (selectedFilters[key].includes(cd)) {
        selectedFilters[key] = selectedFilters[key].filter(value => value !== cd);
        return;
    }

    selectedFilters[key] = [...selectedFilters[key], cd];
}

// 행 단위 스마트 필터 매칭
function matchesHr010Filter(row, key, value) {
    if (!row || !value) return false;

    switch (key) {
        case "skl_grp":
            return getSkillCodes(row).includes(String(value).toUpperCase());
        case "sido_cd":
            return matchesRegionCode(row, value);
        case "grade":
            return String(row.grade || "").toUpperCase() === String(value).toUpperCase();
        default:
            return String(row[key] || "") === String(value);
    }
}

// 주개발언어 코드 목록 추출
function getSkillCodes(row) {
    return String(row.main_lang || "")
        .split(",")
        .map(code => code.trim().toUpperCase())
        .filter(Boolean);
}

// 거주지역 문자열을 시도코드 기준으로 비교
function matchesRegionCode(row, code) {
    const value = row.sido_cd;
    return String(value) === String(code);
}

// 시도 코드에 대응되는 비교용 지역명 후보
// function getRegionTextCandidates(code) {
//     const label = getDropdownOptionLabel("sido_cd", code);
//     const normalizedLabel = normalizeRegionText(label);
//     const shortLabel = normalizeRegionText(toShortRegionName(label));
//
//     return [...new Set([normalizedLabel, shortLabel].filter(Boolean))];
// }

// 지역명 비교용 정규화
// function normalizeRegionText(value) {
//     return String(value || "")
//         .replace(/\s+/g, "")
//         .replace(/특별자치도|특별자치시|특별시|광역시|자치도|도|시/g, "")
//         .trim();
// }

// 전체 지역명 -> 짧은 표기명
// function toShortRegionName(label) {
//     const map = {
//         "서울특별시": "서울",
//         "부산광역시": "부산",
//         "대구광역시": "대구",
//         "인천광역시": "인천",
//         "광주광역시": "광주",
//         "대전광역시": "대전",
//         "울산광역시": "울산",
//         "세종특별자치시": "세종",
//         "경기도": "경기",
//         "강원특별자치도": "강원",
//         "충청북도": "충북",
//         "충청남도": "충남",
//         "전북특별자치도": "전북",
//         "전라남도": "전남",
//         "경상북도": "경북",
//         "경상남도": "경남",
//         "제주특별자치도": "제주"
//     };
//
//     return map[label] || label;
// }

// 선택값에 맞는 드롭다운 표시명 조회
function getDropdownOptionLabel(key, code) {
    const config = dropdownFilters[key];
    if (!config || !config.map) return code;
    return config.map[code] || code;
}

// 동적 옵션(등급) 갱신
function refreshDynamicFilterOptions(list) {
    const gradeConfig = dropdownFilters.grade;
    const gradeSet = new Set();

    (Array.isArray(list) ? list : []).forEach(row => {
        const grade = String(row.grade || "").trim().toUpperCase();
        if (grade) {
            gradeSet.add(grade);
        }
    });

    gradeConfig.options = Array.from(gradeSet)
        .sort((a, b) => {
            const left = hr010GradeOrder.indexOf(a);
            const right = hr010GradeOrder.indexOf(b);
            return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
        })
        .map(code => ({ cd: code, cd_nm: `${code}등급` }));

    gradeConfig.map = buildMap(gradeConfig.options);
    selectedFilters.grade = selectedFilters.grade.filter(code => gradeConfig.map[code]);
    renderDropdown("grade");
    renderSelectedTags();
    refreshTagSuggestions($("#hr010TagKeywordInput").val());
}

// 태그/버튼에 들어가는 문자열 escape
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// 추천어 목록 갱신
function refreshTagSuggestions(rawKeyword = "") {
    const keyword = String(rawKeyword || "").trim();
    if (!keyword) {
        hideTagSuggestions();
        return;
    }

    hr010TagSuggestions = buildTagSuggestions(keyword).slice(0, 12);
    hr010ActiveSuggestionIndex = hr010TagSuggestions.length ? 0 : -1;
    renderTagSuggestions();
}

function scheduleHr010TagSuggestions(rawKeyword = "", delay = HR010_SUGGESTION_INPUT_DEBOUNCE_MS) {
    window.clearTimeout(hr010SuggestionInputTimer);

    const keyword = String(rawKeyword || "");
    if (!keyword.trim()) {
        hideTagSuggestions();
        return;
    }

    hr010SuggestionInputTimer = window.setTimeout(() => {
        refreshTagSuggestions(keyword);
    }, Math.max(0, Number(delay) || 0));
}

function flushHr010TagSuggestions(rawKeyword = "") {
    window.clearTimeout(hr010SuggestionInputTimer);
    refreshTagSuggestions(rawKeyword);
}

// 추천어 목록 렌더링
function renderTagSuggestions() {
    const box = document.getElementById("hr010TagSuggestionBox");
    if (!box) return;

    if (!hr010TagSuggestions.length) {
        hideTagSuggestions();
        return;
    }

    window.clearTimeout(hr010SuggestionHideTimer);
    box.hidden = false;
    box.innerHTML = hr010TagSuggestions.map((suggestion, index) => `
        <button type="button" class="hr010-tag-suggestion-item ${index === hr010ActiveSuggestionIndex ? "is-active" : ""}" data-index="${index}">
            <span class="hr010-tag-suggestion-main">
                <span class="hr010-tag-suggestion-label">${escapeHtml(suggestion.label)}</span>
                <span class="hr010-tag-suggestion-meta">${escapeHtml(suggestion.meta || "")}</span>
            </span>
            <span class="hr010-tag-suggestion-kind">${escapeHtml(suggestion.kind)}</span>
        </button>
    `).join("");

    window.requestAnimationFrame(() => {
        box.classList.add("is-visible");
        syncTagSuggestionLayout();
    });
}

// 추천어 이동
function moveTagSuggestion(step) {
    if (!hr010TagSuggestions.length) return;

    const nextIndex = hr010ActiveSuggestionIndex + step;
    if (nextIndex < 0) {
        hr010ActiveSuggestionIndex = hr010TagSuggestions.length - 1;
    } else if (nextIndex >= hr010TagSuggestions.length) {
        hr010ActiveSuggestionIndex = 0;
    } else {
        hr010ActiveSuggestionIndex = nextIndex;
    }

    renderTagSuggestions();
    scrollActiveSuggestionIntoView();
}

// 현재 활성 추천어를 박스 안으로 스크롤
function scrollActiveSuggestionIntoView() {
    const box = document.getElementById("hr010TagSuggestionBox");
    if (!box || box.hidden || hr010ActiveSuggestionIndex < 0) return;

    const activeElement = box.querySelector(`.hr010-tag-suggestion-item[data-index="${hr010ActiveSuggestionIndex}"]`);
    if (!activeElement) return;
    activeElement.scrollIntoView({ block: "nearest" });
}

// 추천어 숨김
function hideTagSuggestions() {
    hr010TagSuggestions = [];
    hr010ActiveSuggestionIndex = -1;
    window.clearTimeout(hr010SuggestionInputTimer);

    const box = document.getElementById("hr010TagSuggestionBox");
    if (!box) return;

    window.clearTimeout(hr010SuggestionHideTimer);
    box.classList.remove("is-visible");
    syncTagSuggestionLayout();

    hr010SuggestionHideTimer = window.setTimeout(() => {
        if (box.classList.contains("is-visible")) return;
        box.hidden = true;
        box.innerHTML = "";
    }, HR010_SUGGESTION_TRANSITION_MS);
}

function syncTagSuggestionLayout() {
    const searchArea = document.querySelector(".hr010-search-area");
    const box = document.getElementById("hr010TagSuggestionBox");

    if (!searchArea || !box || box.hidden || !box.childElementCount || !box.classList.contains("is-visible")) {
        if (searchArea) {
            searchArea.classList.remove("is-suggesting");
            searchArea.style.removeProperty("--hr010-suggestion-space");
        }
        return;
    }

    window.requestAnimationFrame(() => {
        const maxSuggestionHeight = 240;
        const suggestionHeight = Math.min(box.scrollHeight, maxSuggestionHeight);
        searchArea.classList.add("is-suggesting");
        searchArea.style.setProperty("--hr010-suggestion-space", `${suggestionHeight + 18}px`);
    });
}

// 입력값 기준 추천어 생성
function buildTagSuggestions(keyword) {
    const normalizedKeyword = normalizeSuggestionText(keyword);
    if (!normalizedKeyword) return [];

    const suggestions = [];
    const seen = new Set();

    hr010SourceRows.forEach(row => {
        const name = String(row.dev_nm || "").trim();
        if (!name || keywordTags.includes(name)) return;
        addSuggestionIfMatched(suggestions, seen, {
            type: "name",
            key: "keyword",
            value: name,
            label: name,
            meta: "이름",
            kind: "이름",
            matchText: name
        }, normalizedKeyword);
    });

    buildFilterSuggestionSource().forEach(suggestion => {
        if (selectedFilters[suggestion.key]?.includes(suggestion.value)) return;
        addSuggestionIfMatched(suggestions, seen, suggestion, normalizedKeyword);
    });

    return suggestions.sort((left, right) => {
        if (left.rank !== right.rank) return left.rank - right.rank;
        return left.label.localeCompare(right.label, "ko");
    });
}

// 필터 추천어 원본 생성
function buildFilterSuggestionSource() {
    const sources = [];

    ["ctrt_typ", "work_md", "sido_cd"].forEach(key => {
        const config = dropdownFilters[key];
        (config.options || []).forEach(option => {
            sources.push({
                type: "filter",
                key,
                value: option.cd,
                label: option.cd_nm,
                meta: config.label,
                kind: "필터",
                matchText: `${config.label} ${option.cd_nm}`
            });
        });
    });

    (dropdownFilters.skl_grp.sections || []).forEach(section => {
        section.items.forEach(item => {
            sources.push({
                type: "filter",
                key: "skl_grp",
                value: item.cd,
                label: item.cd_nm,
                meta: `주개발언어 · ${section.cd_nm}`,
                kind: "필터",
                matchText: `${section.cd_nm} ${item.cd_nm} 주개발언어`
            });
        });
    });

    (dropdownFilters.grade.options || []).forEach(option => {
        sources.push({
            type: "filter",
            key: "grade",
            value: option.cd,
            label: option.cd_nm,
            meta: "등급",
            kind: "필터",
            matchText: `${option.cd_nm} 등급`
        });
    });

    (dropdownFilters.kosa_grd_cd.options || []).forEach(option => {
        sources.push({
            type: "filter",
            key: "kosa_grd_cd",
            value: option.cd,
            label: option.cd_nm,
            meta: "등급 · KOSA",
            kind: "필터",
            matchText: `${option.cd_nm} KOSA 등급`
        });
    });

    (dropdownFilters.sido_cd.options || []).forEach(option => {
        sources.push({
            type: "filter",
            key: "sido_cd",
            value: option.cd,
            label: option.cd_nm,
            meta: "거주지역",
            kind: "필터",
            matchText: `${option.cd_nm} 거주지역`
        });
    });

    return sources;
}

// 추천어 매칭 후 추가
function addSuggestionIfMatched(target, seen, suggestion, normalizedKeyword) {
    const matchText = normalizeSuggestionText(suggestion.matchText || suggestion.label || "");
    if (!matchText || !matchText.includes(normalizedKeyword)) return;

    const dedupeKey = `${suggestion.type}:${suggestion.key}:${suggestion.value}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    target.push({
        ...suggestion,
        rank: getSuggestionRank(matchText, normalizedKeyword)
    });
}

// 추천어 우선순위 계산
function getSuggestionRank(matchText, normalizedKeyword) {
    if (matchText === normalizedKeyword) return 0;
    if (matchText.startsWith(normalizedKeyword)) return 1;
    return 2;
}

// 추천어 비교용 정규화
function normalizeSuggestionText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .trim();
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
    hr010LastRenderedRows = Array.isArray(list) ? list.slice() : [];
    container.dataset.view = currentHr010ViewMode;
    updateHr010ResultCount(hr010LastRenderedRows.length);

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

    if (currentHr010ViewMode === "list") {
        const wrapper = document.createElement("div");
        wrapper.className = "hr010-list-view";
        wrapper.innerHTML = `
            <div class="hr010-list-header">
                <div>인력 정보</div>
                <div>구분</div>
                <div>주개발언어</div>
                <div>등급 / KOSA</div>
                <div>지역 / 근무</div>
                <div>투입 가능</div>
                <div>희망단가</div>
            </div>
            <div class="hr010-list-body">
                ${list.map(row => createUserListRow(row)).join("")}
            </div>
        `;
        fragment.appendChild(wrapper);
    } else {
        list.forEach(row => {
            const div = document.createElement("div");
            div.innerHTML = createUserCard(row);
            fragment.appendChild(div.firstElementChild);
        });
    }

    container.innerHTML = "";
    container.appendChild(fragment);
    animateHr010RenderedItems(container);
    bindCardEvents(container, list);
}

function animateHr010RenderedItems(container) {
    if (!container) return;

    const items = Array.from(container.querySelectorAll(".hr010-list-header, .user-card, .user-list-row"));
    if (!items.length) return;

    items.forEach((item, index) => {
        item.classList.remove("is-visible");
        item.classList.add("hr010-enter-item");
        item.style.setProperty("--hr010-enter-delay", `${Math.min(index, 10) * HR010_LIST_ENTER_STAGGER_MS}ms`);
    });

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            items.forEach(item => item.classList.add("is-visible"));
        });
    });
}

function updateHr010ResultCount(count) {
    const countEl = document.getElementById("hr010ResultCount");
    if (!countEl) return;
    countEl.textContent = String(Number(count) || 0);
}

// ==============================
    // 카드 생성
    // ==============================
    function createUserCard(row) {
    const employment = getEmploymentMeta(row);
    const profile = getProfileMarkup(row);
    const skillChips = getSkillChipMarkup(row);

    return `
    <article class="user-card" data-id="${row.dev_id}" tabindex="0" title="더블클릭하여 상세 보기">
        <div class="user-card__top">
            <span class="user-card__badge user-card__badge--${employment.className}">${employment.label}</span>
        </div>
        <div class="user-card__profile">
            <div class="user-card__avatar">${profile}</div>
            <div class="user-card__name">${escapeHtml(row.dev_nm || "-")}</div>
            <div class="user-card__meta-summary">
                <span class="user-card__meta-summary-text">${getProfileMetaSummary(row)}</span>
                ${getKosaStarMarkup(row)}
            </div>
            <div class="user-card__skills">${skillChips}</div>
        </div>
        <div class="user-card__info-panel user-card__info-panel--summary">
            <div class="user-card__info-grid user-card__info-grid--summary">
                <div class="user-card__info-item">
                    <span class="user-card__info-label">등급</span>
                    <strong class="user-card__info-value">${escapeHtml(formatGradeLabel(row.grade, row.score) || "-")}</strong>
                </div>
                <div class="user-card__info-item">
                    <span class="user-card__info-label">지역 / 근무</span>
                    <div class="user-card__info-inline-value">${getRegionWorkInlineMarkup(row)}</div>
                </div>
                <div class="user-card__info-item">
                    <span class="user-card__info-label">투입 가능일</span>
                    <strong class="user-card__info-value">${escapeHtml(getAvailabilityLabel(row))}</strong>
                </div>
                <div class="user-card__info-item">
                    <span class="user-card__info-label">희망 단가</span>
                    <strong class="user-card__info-value">${escapeHtml(amountFormatter(row.hope_rate_amt) || "-")}</strong>
                </div>
            </div>
        </div>
    </article>`;
}
function createUserCard(row) {
    const employment = getEmploymentMeta(row);
    const profile = getProfileMarkup(row);
    const primarySkill = getPrimarySkillLabel(row);
    const skillChips = getSkillChipMarkup(row);

    return `
    <article class="user-card" data-id="${row.dev_id}" tabindex="0" title="더블클릭하여 상세 보기">
        <div class="user-card__top">
            <span class="user-card__badge user-card__badge--${employment.className}">${employment.label}</span>
        </div>
        <div class="user-card__profile">
            <div class="user-card__avatar">${profile}</div>
            <div class="user-card__name">${escapeHtml(row.dev_nm || "-")}</div>
            <div class="user-card__subtitle">${escapeHtml(primarySkill ? `주개발언어 · ${primarySkill}` : "주개발언어 미등록")}</div>
            <div class="user-card__skills">${skillChips}</div>
        </div>
        <div class="user-card__info-panel">
            <div class="user-card__info-grid">
                <div class="user-card__info-item">
                    <span class="user-card__info-label">등급</span>
                    <strong class="user-card__info-value">${escapeHtml(formatGradeLabel(row.grade, row.score) || "-")}</strong>
                </div>
                <div class="user-card__info-item">
                    <span class="user-card__info-label">KOSA</span>
                    <strong class="user-card__info-value">${escapeHtml(getKosaLabel(row))}</strong>
                </div>
                <div class="user-card__info-item">
                    <span class="user-card__info-label">거주지역</span>
                    <strong class="user-card__info-value">${escapeHtml(getSidoLabel(row))}</strong>
                </div>
                <div class="user-card__info-item">
                    <span class="user-card__info-label">투입 가능</span>
                    <strong class="user-card__info-value">${escapeHtml(getAvailabilityLabel(row))}</strong>
                </div>
            </div>
            <div class="user-card__meta-row">
                <span class="user-card__meta-pill">${escapeHtml(getWorkModeLabel(row))}</span>
                <span class="user-card__meta-pill">${escapeHtml(getContractTypeLabel(row))}</span>
            </div>
        </div>
        <div class="user-card__footer">
            <div class="user-card__footer-item">
                <span class="user-card__footer-label">희망단가</span>
                <strong class="user-card__footer-value">${escapeHtml(amountFormatter(row.hope_rate_amt) || "-")}</strong>
            </div>
            <div class="user-card__footer-item">
                <span class="user-card__footer-label">경력</span>
                <strong class="user-card__footer-value">${escapeHtml(formatCareerYearMonth(row.exp_yr) || "-")}</strong>
            </div>
        </div>
    </article>`;
}

    // 리스트형 행 생성
    function createUserListRow(row) {
    const employment = getEmploymentMeta(row);
    const profile = getProfileMarkup(row);

    return `
        <article class="user-list-row" data-id="${row.dev_id}" tabindex="0" title="더블클릭하여 상세 보기">
            <div class="user-list-row__profile">
                <div class="user-list-row__avatar">${profile}</div>
                <div class="user-list-row__text">
                    <div class="user-list-row__name">${escapeHtml(row.dev_nm || "-")}</div>
                    <div class="user-list-row__sub">${escapeHtml(formatCareerYearMonth(row.exp_yr) || "-")} · ${escapeHtml(getContractTypeLabel(row))}</div>
                </div>
            </div>
            <div class="user-list-row__cell">
                <span class="user-card__badge user-card__badge--${employment.className}">${employment.label}</span>
            </div>
            <div class="user-list-row__cell user-list-row__skill-cell">${getSkillSummaryMarkup(row, 3)}</div>
            <div class="user-list-row__cell user-list-row__grade-cell">
                <div class="user-list-row__grade-main">${escapeHtml(formatGradeLabel(row.grade, row.score) || "-")}</div>
                <div class="user-list-row__grade-sub">
                    <span>${escapeHtml(getKosaLabel(row))}</span>
                    ${getKosaStarMarkup(row, "user-kosa-stars--inline")}
                </div>
            </div>
            <div class="user-list-row__cell user-list-row__region-cell">
                ${getRegionWorkInlineMarkup(row)}
            </div>
            <div class="user-list-row__cell">${escapeHtml(getAvailabilityLabel(row))}</div>
            <div class="user-list-row__cell user-list-row__rate">${escapeHtml(amountFormatter(row.hope_rate_amt) || "-")}</div>
        </article>
    `;
}

// 프로필 이미지/이니셜 마크업
function getProfileMarkup(row) {
    const imgUrl = row.img_url || (row.dev_img_base64 ? `data:image/png;base64,${row.dev_img_base64}` : "");
    if (imgUrl) {
        return `<img src="${imgUrl}" class="profile-circle-icon" alt="${escapeHtml(row.dev_nm || "프로필")}"/>`;
    }
    return makeProfileCircle(row.dev_nm);
}

// 직원/프리랜서 배지 메타
function getEmploymentMeta(row) {
    const type = resolveUserType(row);

    if (type === "freelancer") {
        return { label: "프리랜서", className: "freelancer" };
    }

    return { label: "직원", className: "staff" };
}

// 주개발언어 대표 라벨
function getPrimarySkillLabel(row) {
    const skillParts = getSkillDisplayParts(row);
    if (!skillParts.primary) return "주개발언어 미등록";
    return skillParts.primary;
}

// 주개발언어 표시용 요약
// function getSkillSummaryLabel(row) {
//     const skillParts = getSkillDisplayParts(row);
//     if (!skillParts.skills.length) return "-";
//     return `주개발언어: ${skillParts.skills.join(", ")}`;
// }

// 리스트형 기술 요약 마크업
function getSkillSummaryMarkup(row, maxChips = 3) {
    const skillParts = getSkillDisplayParts(row);
    if (!skillParts.skills.length) {
        return `<span class="user-list-row__skill-empty">-</span>`;
    }

    const hasMore = skillParts.skills.length > maxChips;
    const visibleSkills = skillParts.skills.slice(0, maxChips);

    const chips = visibleSkills.map((skill, idx) => `
        <span class="user-card__skill-chip ${idx === 0 ? "user-card__skill-chip--main" : ""}">${escapeHtml(skill)}</span>
    `).join("");

    const moreChip = hasMore ? `<span class="user-card__skill-chip is-muted">...</span>` : "";

    return `
        <div class="user-list-row__skill-stack">
            <div class="user-list-row__skill-line user-list-row__skill-line--main">
                <span class="user-list-row__skill-line-label">주개발언어</span>
                <div class="user-list-row__skill-line-chips">${chips}${moreChip}</div>
            </div>
        </div>
    `;
}

// 주개발언어 표시용 파싱
function getSkillDisplayParts(row) {
    const skills = getSkillNameList(row);
    const primary = skills[0] || "";
    return {
        skills,
        primary
    };
}

// 카드형 기술 칩
function getSkillChipMarkup(row, maxChips = 6) {
    const skillParts = getSkillDisplayParts(row);

    if (!skillParts.skills.length) {
        const chips = `<span class="user-card__skill-chip is-muted">미등록</span>`;
        return [
            `<div class="user-card__skill-group user-card__skill-group--main">`,
            `<span class="user-card__skill-group-label">주개발언어</span>`,
            `<div class="user-card__skill-group-chips">${chips}</div>`,
            `</div>`
        ].join("");
    }

    const hasMore = skillParts.skills.length > maxChips;
    const visibleSkills = skillParts.skills.slice(0, maxChips);
    const chips = visibleSkills.map((skill, idx) => `
        <span class="user-card__skill-chip ${idx === 0 ? "user-card__skill-chip--main" : ""}">${escapeHtml(skill)}</span>
    `).join("");

    const moreChip = hasMore ? `<span class="user-card__skill-chip is-muted">...</span>` : "";

    return [
        `<div class="user-card__skill-group user-card__skill-group--main">`,
        `<span class="user-card__skill-group-label">주개발언어</span>`,
        `<div class="user-card__skill-group-chips">${chips}${moreChip}</div>`,
        `</div>`
    ].join("");
}

// main_lang_nm 문자열 분해
function getSkillNameList(row) {
    return String(row.main_lang_nm || "")
        .split(",")
        .map(skill => skill.trim())
        .filter(Boolean);
}

// 근무형태 표시명
function getWorkModeLabel(row) {
    return getDropdownOptionLabel("work_md", row.work_md) || row.work_md || "근무형태 미정";
}

// 계약형태 표시명
function getContractTypeLabel(row) {
    return getDropdownOptionLabel("ctrt_typ", row.ctrt_typ) || row.ctrt_typ || "계약형태 미정";
}

// KOSA 표시명
function getKosaLabel(row) {
    return getDropdownOptionLabel("kosa_grd_cd", row.kosa_grd_cd) || row.kosa_grd_cd || "-";
}

function getProfileMetaSummary(row) {
    const career = formatCareerYearMonth(row.exp_yr) || "-";
    const contract = getContractTypeLabel(row);
    const kosa = getKosaLabel(row);
    return `${escapeHtml(career)} · ${escapeHtml(contract)} · ${escapeHtml(kosa)}`;
}

function getKosaStarCount(row) {
    const label = String(getKosaLabel(row) || "").replace(/\s/g, "");
    if (!label || label === "-") return 0;
    if (label.includes("특")) return 5;
    if (label.includes("고")) return 3;
    if (label.includes("중")) return 2;
    if (label.includes("초")) return 1;
    return 0;
}

function getKosaStarMarkup(row, extraClass = "") {
    const count = getKosaStarCount(row);
    if (!count) return "";
    const className = ["user-kosa-stars", extraClass].filter(Boolean).join(" ");
    const stars = Array.from({ length: count }, () => `<span class="user-kosa-stars__star">★</span>`).join("");
    return `<span class="${className}">${stars}</span>`;
}

function getWorkModeBadgeMeta(row) {
    const label = getWorkModeLabel(row);
    const normalized = String(label || "").replace(/\s/g, "");

    if (normalized.includes("상주")) return { label, className: "onsite" };
    if (normalized.includes("재택") || normalized.includes("원격")) return { label, className: "remote" };
    if (normalized.includes("병행") || normalized.includes("혼합")) return { label, className: "hybrid" };
    return { label, className: "default" };
}

function getWorkModeBadgeMarkup(row) {
    const meta = getWorkModeBadgeMeta(row);
    return `<span class="work-mode-badge work-mode-badge--${meta.className}">${escapeHtml(meta.label || "-")}</span>`;
}

function getRegionWorkInlineMarkup(row) {
    return [
        `<span class="user-card__info-inline-text">${escapeHtml(row.region || "-")}</span>`,
        getWorkModeBadgeMarkup(row)
    ].join("");
}

// 투입 가능 표시명
function getAvailabilityLabel(row) {
    if (!row.avail_dt) return "협의";
    return row.avail_dt;
}

// 거주지역 표시명
function getSidoLabel(row) {
    return getDropdownOptionLabel("sido_cd", row.sido_cd) || row.sido_cd || "-";
}

// ==============================
// 이벤트 위임 (핵심)
// ==============================
function bindCardEvents(container, list) {
    container.onclick = function (e) {
        const card = e.target.closest(".user-card, .user-list-row");
        if (!card) return;

        // 모든 카드 선택 해제
        container.querySelectorAll(".selected").forEach(selected => {
            selected.classList.remove("selected");
        });

        // 현재 카드만 선택
        card.classList.add("selected");
    };

    container.ondblclick = function (e) {
        const card = e.target.closest(".user-card, .user-list-row");
        if (!card) return;
        const devId = card.dataset.id;
        if (!devId) return;
        window.location.href = `/hr011?dev_id=${encodeURIComponent(devId)}`;
    };

    container.onkeydown = function (e) {
        if (e.key !== "Enter") return;
        const card = e.target.closest(".user-card, .user-list-row");
        if (!card) return;
        const devId = card.dataset.id;
        if (!devId) return;
        window.location.href = `/hr011?dev_id=${encodeURIComponent(devId)}`;
    };
}

// ==============================
// 공통코드 불러오기
// ==============================
const dropdownFilters = {
    work_md: { // 근무가능형태
        selectId: "select_work_md",
        code: "WORK_MD",
        options: [],
        map: {},
        container: ".dropdown-work-md",
        label: "근무가능형태"
    },
    ctrt_typ: { // 계약형태
        selectId: "select_ctrt_typ",
        code: "CTRT_TYP",
        options: [],
        map: {},
        container: ".dropdown-ctrt-typ",
        label: "계약형태"
    },
    sido_cd: { // 거주지역
        selectId: "select_sido_cd",
        code: "SIDO_CD",
        options: [],
        map: {},
        container: ".dropdown-sido-cd",
        label: "거주지역"
    },
    skl_grp: { // 주개발언어 - 스킬
        selectId: "select_skl_grp",
        code: "SKL_GRP",
        options: [],
        map: {},
        sections: [],
        container: ".dropdown-skl-grp",
        label: "주개발언어"
    },
    grade: { // 등급
        selectId: "",
        code: "",
        options: [],
        map: {},
        container: ".dropdown-grade",
        label: "등급"
    },
    kosa_grd_cd: { // KOSA 등급
        selectId: "",
        code: "KOSA_GRD_CD",
        options: [],
        map: {},
        container: ".dropdown-grade",
        label: "KOSA"
    }
};

// 공통 초기화 함수
async function initDropdownFilter(key) {
    const config = dropdownFilters[key];
    if (!config) return;

    if (key === "skl_grp") {
        await initSkillDropdown();
        return;
    }

    if (key === "grade") {
        await initGradeDropdown();
        return;
    }

    if (!config.code) {
        renderDropdown(key);
        return;
    }

    const options = await fetchComCodeOptions(config.code, "");
    config.options = normalizeDropdownOptions(options);
    config.map = buildMap(config.options);
    renderDropdown(key);
}

// 공통코드 옵션 직접 조회
async function fetchComCodeOptions(grpCd, tag = "") {
    try {
        const response = await $.ajax({
            url: "/common/getCm",
            type: "POST",
            data: {
                grp_cd: grpCd,
                tag
            }
        });

        return Array.isArray(response?.res) ? response.res : [];
    } catch (error) {
        console.warn(`[hr010] 공통코드 조회 실패: ${grpCd}`, error);
        return [];
    }
}

// 공통 옵션 표준화
function normalizeDropdownOptions(list) {
    return (Array.isArray(list) ? list : [])
        .map(item => ({
            ...item,
            cd: String(item.cd || "").trim(),
            cd_nm: String(item.cd_nm || item.cd || "").trim()
        }))
        .filter(item => item.cd);
}

// 주개발언어 계층형 드롭다운 초기화
async function initSkillDropdown() {
    const config = dropdownFilters.skl_grp;
    const groups = normalizeDropdownOptions(await fetchComCodeOptions(config.code, ""));
    const sections = [];

    for (const group of groups) {
        const childOptions = normalizeDropdownOptions(await fetchComCodeOptions("SKL_ID", group.cd_nm));
        if (!childOptions.length) continue;

        sections.push({
            cd: group.cd,
            cd_nm: group.cd_nm,
            items: childOptions.map(item => ({
                ...item,
                parent_cd: group.cd,
                parent_nm: group.cd_nm
            }))
        });
    }

    config.sections = sections;
    config.options = sections.flatMap(section => section.items);
    config.map = buildMap(config.options);
    selectedFilters.skl_grp = selectedFilters.skl_grp.filter(code => config.map[code]);
    renderDropdown("skl_grp");
}

// 등급/KOSA 묶음 드롭다운 초기화
async function initGradeDropdown() {
    const kosaConfig = dropdownFilters.kosa_grd_cd;
    kosaConfig.options = normalizeDropdownOptions(await fetchComCodeOptions(kosaConfig.code, ""));
    kosaConfig.map = buildMap(kosaConfig.options);
    selectedFilters.kosa_grd_cd = selectedFilters.kosa_grd_cd.filter(code => kosaConfig.map[code]);
    renderDropdown("grade");
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

    if (key === "skl_grp") {
        renderSkillDropdown($menu);
    } else if (key === "grade") {
        renderGradeDropdown($menu);
    } else {
        renderFlatDropdown($menu, key);
    }

    updateDropdownButtonLabel(key);
}

function ensureHr010DropdownSectionState(groupKey, sectionKeys) {
    if (!groupKey) return;

    const groupState = hr010DropdownSectionState[groupKey] || (hr010DropdownSectionState[groupKey] = {});
    const nextKeys = new Set((Array.isArray(sectionKeys) ? sectionKeys : []).map(value => String(value)));

    Object.keys(groupState).forEach(existingKey => {
        if (!nextKeys.has(existingKey)) {
            delete groupState[existingKey];
        }
    });

    nextKeys.forEach(sectionKey => {
        if (typeof groupState[sectionKey] === "undefined") {
            groupState[sectionKey] = true;
        }
    });
}

function isHr010DropdownSectionOpen(groupKey, sectionKey) {
    const groupState = hr010DropdownSectionState[groupKey] || {};
    return groupState[String(sectionKey)] !== false;
}

function toggleHr010DropdownSection(groupKey, sectionKey) {
    if (!groupKey || !sectionKey) return;

    const groupState = hr010DropdownSectionState[groupKey] || (hr010DropdownSectionState[groupKey] = {});
    const normalizedKey = String(sectionKey);
    groupState[normalizedKey] = !isHr010DropdownSectionOpen(groupKey, normalizedKey);
    renderDropdown(groupKey);
}

// 일반 단일 레벨 드롭다운 렌더링
function renderFlatDropdown($menu, key) {
    const config = dropdownFilters[key];
    const selectedValues = selectedFilters[key] || [];

    $menu.append(`
        <li data-key="${key}" data-cd="" class="${selectedValues.length ? "" : "active"}">
            전체
        </li>
    `);

    config.options.forEach(opt => {
        if (!opt.cd) return;

        $menu.append(`
            <li data-key="${key}" data-cd="${opt.cd}" class="${selectedValues.includes(opt.cd) ? "active" : ""}">
                ${opt.cd_nm}
            </li>
        `);
    });
}

// 주개발언어 계층형 렌더링
function renderSkillDropdown($menu) {
    const config = dropdownFilters.skl_grp;
    const selectedValues = selectedFilters.skl_grp || [];
    const sectionKeys = (config.sections || []).map(section => String(section.cd || section.cd_nm || ""));

    ensureHr010DropdownSectionState("skl_grp", sectionKeys);

    $menu.append(`
        <li data-key="skl_grp" data-cd="" class="${selectedValues.length ? "" : "active"}">
            전체
        </li>
    `);

    config.sections.forEach(section => {
        const sectionKey = String(section.cd || section.cd_nm || "");
        if (!sectionKey) return;
        const isOpen = isHr010DropdownSectionOpen("skl_grp", sectionKey);
        const itemMarkup = section.items.map(item => `
            <li data-key="skl_grp" data-cd="${item.cd}" class="dropdown-menu__child ${selectedValues.includes(item.cd) ? "active" : ""}">
                <span class="dropdown-menu__indent">ㄴ</span>
                <span>${escapeHtml(item.cd_nm || "")}</span>
            </li>
        `).join("");

        $menu.append(`
            <li class="dropdown-menu__section-group ${isOpen ? "is-open" : "is-collapsed"}" data-section-key="${escapeHtml(sectionKey)}">
                <button type="button" class="dropdown-menu__section" data-section-key="${escapeHtml(sectionKey)}" aria-expanded="${isOpen ? "true" : "false"}">
                    <span class="dropdown-menu__section-label">${escapeHtml(section.cd_nm || "")}</span>
                    <span class="dropdown-menu__section-arrow" aria-hidden="true"></span>
                </button>
                <ul class="dropdown-menu__section-list" aria-hidden="${isOpen ? "false" : "true"}">
                    ${itemMarkup}
                </ul>
            </li>
        `);
    });
}

// 등급/KOSA 묶음 렌더링
function renderGradeDropdown($menu) {
    const gradeValues = selectedFilters.grade || [];
    const kosaValues = selectedFilters.kosa_grd_cd || [];
    const totalSelected = gradeValues.length + kosaValues.length;
    const sectionKeys = ["grade", "kosa"];

    ensureHr010DropdownSectionState("grade", sectionKeys);

    $menu.append(`
        <li data-key="grade_all" data-cd="" class="${totalSelected ? "" : "active"}">
            전체
        </li>
    `);

    const gradeOpen = isHr010DropdownSectionOpen("grade", "grade");
    const kosaOpen = isHr010DropdownSectionOpen("grade", "kosa");

    const gradeMarkup = (dropdownFilters.grade.options || []).map(option => `
        <li data-key="grade" data-cd="${option.cd}" class="dropdown-menu__child ${gradeValues.includes(option.cd) ? "active" : ""}">
            <span class="dropdown-menu__indent">ㄴ</span>
            <span>${escapeHtml(option.cd_nm || "")}</span>
        </li>
    `).join("");

    const kosaMarkup = (dropdownFilters.kosa_grd_cd.options || []).map(option => `
        <li data-key="kosa_grd_cd" data-cd="${option.cd}" class="dropdown-menu__child ${kosaValues.includes(option.cd) ? "active" : ""}">
            <span class="dropdown-menu__indent">ㄴ</span>
            <span>${escapeHtml(option.cd_nm || "")}</span>
        </li>
    `).join("");

    $menu.append(`
        <li class="dropdown-menu__section-group ${gradeOpen ? "is-open" : "is-collapsed"}" data-section-key="grade">
            <button type="button" class="dropdown-menu__section" data-section-key="grade" aria-expanded="${gradeOpen ? "true" : "false"}">
                <span class="dropdown-menu__section-label">등급</span>
                <span class="dropdown-menu__section-arrow" aria-hidden="true"></span>
            </button>
            <ul class="dropdown-menu__section-list" aria-hidden="${gradeOpen ? "false" : "true"}">
                ${gradeMarkup}
            </ul>
        </li>
    `);

    $menu.append(`
        <li class="dropdown-menu__section-group ${kosaOpen ? "is-open" : "is-collapsed"}" data-section-key="kosa">
            <button type="button" class="dropdown-menu__section" data-section-key="kosa" aria-expanded="${kosaOpen ? "true" : "false"}">
                <span class="dropdown-menu__section-label">KOSA</span>
                <span class="dropdown-menu__section-arrow" aria-hidden="true"></span>
            </button>
            <ul class="dropdown-menu__section-list" aria-hidden="${kosaOpen ? "false" : "true"}">
                ${kosaMarkup}
            </ul>
        </li>
    `);
}

// 선택 개수에 맞춰 드롭다운 버튼 문구 갱신
function updateDropdownButtonLabel(key) {
    const config = dropdownFilters[key === "kosa_grd_cd" ? "grade" : key];
    const $button = $(config.container).find(".dropdown-btn");
    if (!$button.length) return;

    const selectedValues = key === "grade"
        ? [...(selectedFilters.grade || []), ...(selectedFilters.kosa_grd_cd || [])]
        : (selectedFilters[key] || []);

    const label = selectedValues.length
        ? `${config.label} (${selectedValues.length})`
        : config.label;

    $button.html(`
        <span class="dropdown-btn__label">${label}</span>
        <span class="dropdown-btn__arrow" aria-hidden="true"></span>
    `);
}

// 연관된 드롭다운 렌더링 갱신
function renderRelatedDropdown(key) {
    if (key === "grade" || key === "kosa_grd_cd") {
        renderDropdown("grade");
        return;
    }

    renderDropdown(key);
}
