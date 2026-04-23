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
let hr010Paging = {
    page: 1,
    size: 20,
    total: 0
};
let hr010V2DashboardBaseRows = [];
let hr010V2GradeChartMode = "grade";
let hr010V2RecommendGradeFilter = "all";
let hr010V2DashboardFilters = {
    department: "",
    stack: "",
    timing: ""
};
let hr010V2DashboardCodeMaps = {
    mainFld: {},
    mainCust: {}
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
const HR010V2_ROLE_STAFF_COLOR = "var(--hr010v2-role-staff)";
const HR010V2_ROLE_FREELANCER_COLOR = "var(--hr010v2-role-freelancer)";
const HR010V2_AVAILABILITY_LATER_LABEL = "2주 이후 ~ 4주 이내";
const HR010_SUGGESTION_TRANSITION_MS = 220;
const HR010_SUGGESTION_INPUT_DEBOUNCE_MS = 260;
const HR010_LIST_ENTER_STAGGER_MS = 48;
const HR010_NAVIGATION_PRESET_STORAGE_KEY = "hr010-navigation-preset";
let hr010RuntimeFilters = {
    availability: "",
    profileCompleteness: "",
    scoreState: "",
    contractExpiry: ""
};
let hr010PendingNavigationPreset = null;

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
    initHr010V2Chrome();
    syncHr010ViewToggle();
    syncHr010V2GradeViewToggle();
    syncHr010FilterSidebar();
    hr010PendingNavigationPreset = shouldApplyHr010NavigationPreset() ? pullHr010NavigationPreset() : null;
    showLoading();

    // 스마트 필터 공통코드 초기화
    await Promise.all([
        initDropdownFilter("work_md"), // 근무가능형태
        initDropdownFilter("ctrt_typ"), // 계약형태
        initDropdownFilter("sido_cd"), // 거주지역
        initDropdownFilter("skl_grp"), // 주개발언어 - 스킬
        initDropdownFilter("grade"), // 등급 / KOSA
        initHr010V2DashboardCodeMaps()
    ]);

    await loadUserTableData();

    renderSelectedTags();
    refreshTagSuggestions();

    const tagSearchBox = document.querySelector(".hr010-tag-search-box");
    if (tagSearchBox) {
        tagSearchBox.classList.add("is-ready");
    }

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

    $(document).on("change", ".js-hr010v2-filter", function () {
        const key = String(this.getAttribute("data-filter") || "").trim();
        if (!key || !Object.prototype.hasOwnProperty.call(hr010V2DashboardFilters, key)) return;

        hr010V2DashboardFilters[key] = String(this.value || "").trim();
        if (document.getElementById("hr010v2Page")) {
            renderHr010V2Dashboard(hr010V2DashboardBaseRows);
        }
    });

    $(document).on("click", ".js-hr010v2-grade-view", function (e) {
        e.preventDefault();
        const nextMode = String(this.getAttribute("data-view") || "").trim();
        if (!nextMode || hr010V2GradeChartMode === nextMode) return;

        hr010V2GradeChartMode = nextMode === "kosa" ? "kosa" : "grade";
        syncHr010V2GradeViewToggle();
        if (document.getElementById("hr010v2Page")) {
            renderHr010V2Dashboard(hr010V2DashboardBaseRows);
        }
    });

    $(document).on("click", ".js-hr010v2-recommend-grade-filter", function () {
        const nextFilter = String(this.getAttribute("data-grade-filter") || "all").trim() || "all";
        if (hr010V2RecommendGradeFilter === nextFilter) return;

        hr010V2RecommendGradeFilter = nextFilter;
        renderHr010V2Dashboard(hr010V2DashboardBaseRows);
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

    $(document).on("click", ".js-hr010v2-nav", function (e) {
        const presetValue = this.getAttribute("data-hr010-preset");
        const preset = decodeHr010NavigationPreset(presetValue);
        if (!preset) return;

        e.preventDefault();
        navigateToHr010WithPreset(preset);
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

        if (tagType === "special") {
            if (key && Object.prototype.hasOwnProperty.call(hr010RuntimeFilters, key)) {
                hr010RuntimeFilters[key] = "";
            }

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

    // 검색창 클릭 시, 알아서 검색 영역으로 포커싱
    const tagSearchBox = document.querySelector('.hr010-tag-search-box');
    if (tagSearchBox) {
        tagSearchBox.addEventListener('click', function (e) {
            // 버튼 클릭 시 무시
            if (e.target.closest('.hr010-search-icon-btn')) return;

            // 이미 input 클릭한 경우도 무시
            if (e.target.classList.contains('hr010-search-input')) return;

            const input = document.getElementById('hr010TagKeywordInput');
            if (input) {
                input.focus();
            }
        });
    }
}

// 카드/리스트 토글 상태 동기화
function syncHr010ViewToggle() {
    $(".hr010-view-toggle-btn").removeClass("is-active").attr("aria-selected", "false");
    $(`.hr010-view-toggle-btn[data-view="${currentHr010ViewMode}"]`).addClass("is-active").attr("aria-selected", "true");
}

function syncHr010V2GradeViewToggle() {
    const activeMode = hr010V2GradeChartMode === "kosa" ? "kosa" : "grade";
    $(".js-hr010v2-grade-view").removeClass("is-active").attr("aria-pressed", "false");
    $(`.js-hr010v2-grade-view[data-view="${activeMode}"]`).addClass("is-active").attr("aria-pressed", "true");
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
            renderHr010V2Dashboard([]);
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

        if (hr010PendingNavigationPreset) {
            applyHr010NavigationPreset(hr010PendingNavigationPreset);
            hr010PendingNavigationPreset = null;
        }

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

    filtered = filterHr010RowsByRuntimePreset(filtered);

    renderHr010V2Dashboard(filtered);
    hr010Paging.page = 1;

    renderUserCards(filtered);
}

function shouldApplyHr010NavigationPreset() {
    return Boolean(document.getElementById("CARD_HR010_A")) && !document.getElementById("hr010v2Page");
}

function pullHr010NavigationPreset() {
    let preset = null;

    try {
        const raw = window.sessionStorage.getItem(HR010_NAVIGATION_PRESET_STORAGE_KEY);
        if (raw) {
            window.sessionStorage.removeItem(HR010_NAVIGATION_PRESET_STORAGE_KEY);
            preset = JSON.parse(raw);
        }
    } catch (error) {
        preset = null;
    }

    if (preset) {
        return preset;
    }

    try {
        const params = new URLSearchParams(window.location.search);
        const rawParam = params.get("hr010Preset");
        if (!rawParam) return null;

        const parsed = JSON.parse(decodeURIComponent(rawParam));
        params.delete("hr010Preset");
        const cleanQuery = params.toString();
        const cleanUrl = cleanQuery ? `${window.location.pathname}?${cleanQuery}` : window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return parsed;
    } catch (error) {
        return null;
    }
}

function encodeHr010NavigationPreset(preset) {
    if (!preset) return "";

    try {
        return encodeURIComponent(JSON.stringify(preset));
    } catch (error) {
        return "";
    }
}

function decodeHr010NavigationPreset(value) {
    if (!value) return null;

    try {
        return JSON.parse(decodeURIComponent(String(value)));
    } catch (error) {
        return null;
    }
}

function navigateToHr010WithPreset(preset) {
    if (!preset) {
        window.location.href = "/hr010";
        return;
    }

    const encoded = encodeHr010NavigationPreset(preset);

    try {
        window.sessionStorage.setItem(HR010_NAVIGATION_PRESET_STORAGE_KEY, JSON.stringify(preset));
        window.location.href = "/hr010";
        return;
    } catch (error) {
        window.location.href = encoded ? `/hr010?hr010Preset=${encoded}` : "/hr010";
    }
}

function clearHr010RuntimeFilters() {
    hr010RuntimeFilters = {
        availability: "",
        profileCompleteness: "",
        scoreState: "",
        contractExpiry: ""
    };
}

function syncHr010UserTypeTabs() {
    $(".toggle-filter-chip").removeClass("is-active");
    $(`.toggle-filter-chip[data-user-type="${currentHr010UserTypeTab}"]`).addClass("is-active");
}

function applyHr010NavigationPreset(preset) {
    if (!preset) return;

    currentHr010UserTypeTab = ["all", "staff", "freelancer"].includes(preset.userType) ? preset.userType : "all";
    clearHr010RuntimeFilters();
    keywordTags = Array.isArray(preset.keywordTags)
        ? Array.from(new Set(preset.keywordTags.map(value => String(value || "").trim()).filter(Boolean)))
        : [];

    Object.keys(selectedFilters).forEach(key => {
        selectedFilters[key] = [];
    });

    const presetFilters = preset.filters || {};
    Object.keys(presetFilters).forEach(key => {
        if (!selectedFilters[key]) return;

        const values = Array.isArray(presetFilters[key]) ? presetFilters[key] : [presetFilters[key]];
        selectedFilters[key] = values.map(value => String(value || "").trim()).filter(Boolean);
    });

    const runtimePreset = preset.runtimeFilters || {};
    if (runtimePreset.availability) {
        hr010RuntimeFilters.availability = String(runtimePreset.availability);
    }
    if (runtimePreset.profileCompleteness) {
        hr010RuntimeFilters.profileCompleteness = String(runtimePreset.profileCompleteness);
    }
    if (runtimePreset.scoreState) {
        hr010RuntimeFilters.scoreState = String(runtimePreset.scoreState);
    }
    if (runtimePreset.contractExpiry) {
        hr010RuntimeFilters.contractExpiry = String(runtimePreset.contractExpiry);
    }

    if (preset.viewMode) {
        currentHr010ViewMode = preset.viewMode === "list" ? "list" : "card";
    }

    syncHr010ViewToggle();
    syncHr010UserTypeTabs();
    renderSelectedTags();

    Object.keys(dropdownFilters).forEach(key => {
        if (key === "kosa_grd_cd") return;
        renderDropdown(key);
    });
}

function filterHr010RowsByRuntimePreset(list) {
    const currentList = Array.isArray(list) ? list : [];
    const today = getHr010Today();

    return currentList.filter(row => {
        if (hr010RuntimeFilters.availability && !matchesHr010AvailabilityPreset(row, hr010RuntimeFilters.availability, today)) {
            return false;
        }

        if (hr010RuntimeFilters.profileCompleteness === "low" && !hasHr010CoreFieldGap(row)) {
            return false;
        }

        if (hr010RuntimeFilters.scoreState === "ungraded" && Number(row.score) > 0) {
            return false;
        }

        if (hr010RuntimeFilters.contractExpiry && !matchesHr010ContractExpiryPreset(row, hr010RuntimeFilters.contractExpiry, today)) {
            return false;
        }

        return true;
    });
}

function matchesHr010AvailabilityPreset(row, presetValue, today) {
    const availabilityKey = String(presetValue || "").trim();
    if (!availabilityKey) return true;

    const parsed = parseHr010Date(row.avail_dt);
    if (!parsed) {
        return availabilityKey === "coord";
    }

    const diff = getHr010DiffDays(parsed, today);
    switch (availabilityKey) {
        case "available":
            return true;
        case "deployable":
            return diff <= 14;
        case "now":
            return diff <= 0;
        case "week1":
            return diff > 0 && diff <= 7;
        case "week2":
            return diff > 7 && diff <= 14;
        case "soon":
            return diff > 0 && diff <= 14;
        case "later":
            return diff > 14;
        case "coord":
            return false;
        default:
            return true;
    }
}

function matchesHr010ContractExpiryPreset(row, presetValue, today) {
    const contractKey = String(presetValue || "").trim();
    if (!contractKey) return true;

    const parsed = parseHr010Date(row.contract_end_dt);
    if (!parsed) return false;

    const diff = getHr010DiffDays(parsed, today);
    if (diff < 0) {
        return contractKey === "expired";
    }

    switch (contractKey) {
        case "expired":
            return false;
        case "30":
            return diff <= 30;
        case "60":
            return diff > 30 && diff <= 60;
        case "90":
            return diff > 60 && diff <= 90;
        default:
            return true;
    }
}

function initHr010V2Chrome() {
    const dateEl = document.getElementById("hr010v2TodayLabel");
    if (!dateEl) return;

    const today = new Date();
    dateEl.textContent = today.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short"
    });
}

function renderHr010V2Dashboard(list) {
    const dashboardRoot = document.getElementById("hr010v2Page");
    if (!dashboardRoot) return;

    const filteredList = Array.isArray(list) ? list : [];
    hr010V2DashboardBaseRows = filteredList.slice();
    syncHr010V2DashboardFilterControls(filteredList);

    const dashboardList = filterHr010V2DashboardRows(filteredList);
    const stats = getHr010V2DashboardStats(dashboardList);

    setHr010Html("hr010v2HealthComposition", renderHr010V2HealthComposition(stats));
    setHr010Html("hr010v2KpiGrid", renderHr010V2KpiCards(stats.kpis));
    setHr010Html("hr010v2HealthStats", renderHr010V2HealthStats(stats));
    setHr010Html("hr010v2SkillRows", renderHr010V2SkillRows(stats.skillRows));
    setHr010Html("hr010v2AlertList", renderHr010V2Alerts(stats.alerts));
    setHr010Html("hr010v2WeeklyBars", renderHr010V2WeeklyBars(stats.timeline, stats));
    setHr010Html("hr010v2GradeBars", renderHr010V2GradeBars(stats.gradeRows, stats.kosaRows));
    setHr010Html("hr010v2RecommendList", renderHr010V2RecommendList(stats.recommendRows));
}

function syncHr010V2DashboardFilterControls(list) {
    const rows = Array.isArray(list) ? list : [];
    const departmentOptions = Array.from(new Set(rows.map(row => getHr010DepartmentLabel(row)).filter(Boolean))).sort((left, right) => left.localeCompare(right, "ko"));
    const stackOptions = Array.from(new Set(rows.flatMap(row => getSkillNameList(row)).filter(Boolean))).sort((left, right) => left.localeCompare(right, "ko"));

    updateHr010V2FilterControl("hr010v2DepartmentFilter", "department", departmentOptions.map(value => ({ value, label: value })));
    updateHr010V2FilterControl("hr010v2StackFilter", "stack", stackOptions.map(value => ({ value, label: value })));
    updateHr010V2FilterControl("hr010v2TimingFilter", "timing", [
        { value: "now", label: "즉시 가능" },
        { value: "soon", label: "2주 내 가능" },
        { value: "coord", label: "가용일 미확정" },
        { value: "later", label: HR010V2_AVAILABILITY_LATER_LABEL }
    ]);
}

function updateHr010V2FilterControl(id, key, options) {
    const select = document.getElementById(id);
    if (!select) return;

    const normalizedOptions = Array.isArray(options) ? options : [];
    const currentValue = String(hr010V2DashboardFilters[key] || "");
    const validValues = new Set(normalizedOptions.map(option => String(option.value || "")));
    if (currentValue && !validValues.has(currentValue)) {
        hr010V2DashboardFilters[key] = "";
    }

    const value = String(hr010V2DashboardFilters[key] || "");
    const placeholderLabel = key === "department"
        ? "전체 주요 분야"
        : key === "stack"
            ? "전체 기술"
            : "전체 시기";

    select.innerHTML = [
        `<option value="">${escapeHtml(placeholderLabel)}</option>`,
        ...normalizedOptions.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    ].join("");
    select.value = value;
}

function filterHr010V2DashboardRows(list) {
    const rows = Array.isArray(list) ? list : [];
    const today = getHr010Today();

    return rows.filter(row => {
        if (hr010V2DashboardFilters.department && getHr010DepartmentLabel(row) !== hr010V2DashboardFilters.department) {
            return false;
        }

        if (hr010V2DashboardFilters.stack && !getSkillNameList(row).includes(hr010V2DashboardFilters.stack)) {
            return false;
        }

        if (hr010V2DashboardFilters.timing) {
            const availability = getHr010AvailabilityBucket(row, today);
            if (availability.key !== hr010V2DashboardFilters.timing) {
                return false;
            }
        }

        return true;
    });
}

function getHr010V2DashboardStats(list) {
    const total = list.length;
    const today = getHr010Today();
    const staffRows = list.filter(row => resolveUserType(row) === "staff");
    const freelancerRows = list.filter(row => resolveUserType(row) === "freelancer");
    const availabilityByType = {
        staff: { now: 0, soon: 0, later: 0, total: staffRows.length },
        freelancer: { now: 0, soon: 0, later: 0, total: freelancerRows.length }
    };
    const reliabilityScores = [];
    const availability = {
        now: { key: "now", label: "즉시 투입", tone: "good", count: 0 },
        soon: { key: "soon", label: "2주 내 전환", tone: "info", count: 0 },
        coord: { key: "coord", label: "가용일 미확정", tone: "warn", count: 0 },
        later: { key: "later", label: HR010V2_AVAILABILITY_LATER_LABEL, tone: "risk", count: 0 }
    };

    list.forEach(row => {
        const bucket = getHr010AvailabilityBucket(row, today);
        availability[bucket.key].count += 1;
        const typeKey = resolveUserType(row) === "staff" ? "staff" : "freelancer";
        const displayBucketKey = bucket.key === "coord" ? "later" : bucket.key;
        if (Object.prototype.hasOwnProperty.call(availabilityByType[typeKey], displayBucketKey)) {
            availabilityByType[typeKey][displayBucketKey] += 1;
        }
        reliabilityScores.push(getHr010ProfileCompleteness(row));
    });

    const lowDataCount = list.filter(row => hasHr010CoreFieldGap(row)).length;
    const ungradedCount = list.filter(row => !(Number(row.score) > 0)).length;

    const reliabilityScore = total
        ? Math.round(reliabilityScores.reduce((sum, value) => sum + value, 0) / total)
        : 0;
    const availablePoolCount = total - availability.coord.count;
    const deployableCount = availability.now.count + availability.soon.count;
    const unavailableCount = total - availablePoolCount;
    const seniorCount = list.filter(row => ["S", "A"].includes(String(row.grade || "").toUpperCase())).length;
    const seniorRatio = total
        ? Math.round((seniorCount / total) * 100)
        : 0;
    const contractRows = buildHr010V2ContractRows(list, today);
    const contractBaseCount = list.filter(row => parseHr010Date(row.contract_end_dt)).length;
    const contractMissingCount = total - contractBaseCount;
    const contractImminentCount = contractRows.reduce((sum, row) => sum + row.count, 0);
    const registrationTrend = buildHr010V2RegistrationTrend(list, today);
    const healthScore = availablePoolCount
        ? Math.round((deployableCount / availablePoolCount) * 100)
        : 0;

    const healthLabel = total
        ? "즉시·2주 내 비중"
        : "데이터 대기";

    return {
        total,
        staffCount: staffRows.length,
        freelancerCount: freelancerRows.length,
        lowDataCount,
        ungradedCount,
        reliabilityScore,
        healthScore,
        healthLabel,
        availablePoolCount,
        unavailableCount,
        deployableCount,
        availabilityByType,
        seniorCount,
        seniorRatio,
        contractBaseCount,
        contractMissingCount,
        contractImminentCount,
        availability,
        kpis: buildHr010V2KpiCards(list, {
            today,
            staffRows,
            freelancerRows,
            availability,
            total,
            availablePoolCount,
            deployableCount,
            unavailableCount,
            seniorCount,
            seniorRatio
            , registrationTrend
        }),
        skillRows: buildHr010V2SkillRows(list, today),
        alerts: buildHr010V2Alerts(list, availability, reliabilityScore, today, lowDataCount, ungradedCount, contractRows, contractMissingCount),
        timeline: contractRows,
        gradeRows: buildHr010V2GradeRows(list, today),
        kosaRows: buildHr010V2KosaRows(list, today),
        recommendRows: buildHr010V2RecommendRows(list, today)
    };
}

function renderHr010V2KpiCards(kpis) {
    if (!Array.isArray(kpis) || !kpis.length) {
        return `<div class="hr010v2-empty">표시할 KPI 데이터가 없습니다.</div>`;
    }

    const renderCard = item => {
        const isTrendCard = item.kind === "trend";
        return `
            <button type="button" class="hr010v2-kpi-card hr010v2-kpi-card--${item.tone} ${isTrendCard ? "hr010v2-kpi-card--trend" : ""} js-hr010v2-nav" data-hr010-preset="${escapeHtml(encodeHr010NavigationPreset(item.preset))}">
                <div class="hr010v2-kpi-card__main ${isTrendCard ? "hr010v2-kpi-card__main--trend" : ""}">
                    <div class="hr010v2-kpi-card__copy">
                        <span class="hr010v2-kpi-card__label">${escapeHtml(item.label)}</span>
                        <strong class="hr010v2-kpi-card__value">${escapeHtml(item.value)}</strong>
                    </div>
                    ${isTrendCard ? `
                        <div class="hr010v2-kpi-card__trend" aria-hidden="true">
                            ${item.chartMarkup || ""}
                        </div>
                    ` : `
                        <div class="hr010v2-kpi-card__visual" aria-hidden="true">
                            <div class="hr010v2-kpi-card__spark">
                                ${item.chartMarkup || ""}
                            </div>
                        </div>
                    `}
                </div>
            </button>
        `;
    };

    const groups = [
        { title: "인력 현황", items: kpis.slice(0, 2) },
        { title: "투입 가능성", items: kpis.slice(2, 4) }
    ].filter(group => group.items.length);

    return `
        <div class="hr010v2-kpi-groups">
            ${groups.map(group => `
                <section class="hr010v2-kpi-group">
                    <div class="hr010v2-kpi-group__title">${escapeHtml(group.title)}</div>
                    <div class="hr010v2-kpi-group__cards">
                        ${group.items.map(renderCard).join("")}
                    </div>
                </section>
            `).join("")}
        </div>
    `;
}

function buildHr010V2RegistrationTrend(list, today) {
    const days = 7;
    const series = Array.from({ length: days }, () => 0);

    (Array.isArray(list) ? list : []).forEach(row => {
        const parsed = parseHr010Date(row.crt_ts);
        if (!parsed) return;

        const diff = getHr010DiffDays(parsed, today);
        if (diff < 0 || diff >= days) return;
        series[days - diff - 1] += 1;
    });

    const todayCount = series[days - 1] || 0;
    const yesterdayCount = series[days - 2] || 0;
    const delta = todayCount - yesterdayCount;

    return {
        series,
        todayCount,
        yesterdayCount,
        delta,
        deltaTone: delta > 0 ? "good" : delta < 0 ? "risk" : "info",
        deltaLabel: delta > 0 ? `+${delta}명` : delta < 0 ? `${delta}명` : "없음"
    };
}

function renderHr010V2KpiTrend(series, options = {}) {
    const normalized = (Array.isArray(series) ? series : []).map(value => Number(value) || 0);
    const safeSeries = normalized.length ? normalized : [0, 0];
    const maxValue = Math.max(...safeSeries, 1);
    const width = 100;
    const height = 44;
    const paddingX = 4;
    const paddingY = 4;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;
    const step = safeSeries.length > 1 ? innerWidth / (safeSeries.length - 1) : innerWidth;

    const points = safeSeries.map((value, index) => {
        const x = paddingX + (step * index);
        const y = paddingY + innerHeight - ((value / maxValue) * innerHeight);
        return { x, y };
    });

    const pathD = points
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(" ");
    const lastPoint = points[points.length - 1] || { x: width - paddingX, y: height / 2 };
    const prevPoint = points[points.length - 2] || lastPoint;
    const deltaTone = options.deltaTone || "info";
    const deltaLabel = options.deltaLabel || "없음";
    const noteLabel = options.noteLabel || "최근 7일 등록";

    return `
        <div class="hr010v2-kpi-mini hr010v2-kpi-mini--trend hr010v2-kpi-mini--trend-${deltaTone}">
            <div class="hr010v2-kpi-mini__trend-head">
                <span class="hr010v2-kpi-mini__trend-note">${escapeHtml(noteLabel)}</span>
                <span class="hr010v2-kpi-mini__trend-chip hr010v2-kpi-mini__trend-chip--${deltaTone}">${escapeHtml(deltaLabel)}</span>
            </div>
            <svg class="hr010v2-kpi-trend hr010v2-kpi-trend--${options.tone || "blue"}" viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
                <path class="hr010v2-kpi-trend__path" d="${pathD}" />
                <path
                    class="hr010v2-kpi-trend__arrow"
                    d="M 0 0 L 6 0 L 6 6 L 0 6 Z"
                    transform="translate(${Math.min(Math.max(lastPoint.x - 3, 6), 94)}, ${Math.min(Math.max(lastPoint.y - 3, 6), 38)}) rotate(45)"
                />
                <circle cx="${prevPoint.x.toFixed(2)}" cy="${prevPoint.y.toFixed(2)}" r="1.8" fill="currentColor" opacity="0.24"></circle>
                <circle cx="${lastPoint.x.toFixed(2)}" cy="${lastPoint.y.toFixed(2)}" r="2.4" fill="currentColor"></circle>
            </svg>
        </div>
    `;
}

function renderHr010V2KpiMiniDonut(segments, options = {}) {
    const normalized = (Array.isArray(segments) ? segments : [])
        .map(segment => ({
            color: segment.color,
            value: Number(segment.value) || 0
        }))
        .filter(segment => segment.value > 0);

    if (!normalized.length) {
        return `<div class="hr010v2-kpi-mini hr010v2-kpi-mini--empty">-</div>`;
    }

    const total = normalized.reduce((sum, segment) => sum + segment.value, 0);
    let start = 0;
    const gradient = normalized.map(segment => {
        const share = total ? (segment.value / total) * 100 : 0;
        const end = start + share;
        const rule = `${segment.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
        start = end;
        return rule;
    }).join(", ");
    const legendItems = (Array.isArray(options.legendItems) ? options.legendItems : [])
        .map(item => ({
            color: item.color,
            label: item.label,
            value: item.value
        }))
        .filter(item => item.label || item.value);
    const isInline = options.layout === "inline";

    return `
        <div class="hr010v2-kpi-mini hr010v2-kpi-mini--donut ${isInline ? "hr010v2-kpi-mini--donut-inline" : ""}">
            <span class="hr010v2-kpi-mini__donut" style="background:conic-gradient(${gradient})">
                ${options.centerValue ? `
                    <span class="hr010v2-kpi-mini__donut-copy">
                        <strong>${escapeHtml(String(options.centerValue))}</strong>
                    </span>
                ` : ""}
            </span>
            ${options.centerLabel ? `<span class="hr010v2-kpi-mini__caption">${escapeHtml(String(options.centerLabel))}</span>` : ""}
            ${legendItems.length ? `
                <div class="hr010v2-kpi-mini__legend" role="list" aria-label="구성 항목">
                    ${legendItems.map(item => `
                        <div class="hr010v2-kpi-mini__legend-item" role="listitem">
                            <span class="hr010v2-kpi-mini__legend-dot" style="--legend-dot:${escapeHtml(String(item.color || HR010V2_ROLE_STAFF_COLOR))}"></span>
                            <span class="hr010v2-kpi-mini__legend-label">${escapeHtml(String(item.label || ""))}</span>
                            <strong class="hr010v2-kpi-mini__legend-value">${escapeHtml(String(item.value || ""))}</strong>
                        </div>
                    `).join("")}
                </div>
            ` : ""}
        </div>
    `;
}

function renderHr010V2KpiMiniCompare(rows) {
    const normalized = Array.isArray(rows) ? rows : [];
    const maxValue = Math.max(...normalized.map(row => Number(row.value) || 0), 1);

    return `
        <div class="hr010v2-kpi-mini hr010v2-kpi-mini--compare">
            ${normalized.map(row => `
                <div class="hr010v2-kpi-mini__compare-row hr010v2-kpi-mini__compare-row--${row.tone || "base"}">
                    <div class="hr010v2-kpi-mini__compare-head">
                        <span class="hr010v2-kpi-mini__compare-label">${escapeHtml(row.label)}</span>
                        <strong class="hr010v2-kpi-mini__compare-value">${escapeHtml(String(row.valueLabel ?? row.value ?? "-"))}</strong>
                    </div>
                    <span class="hr010v2-kpi-mini__compare-track">
                        <span class="hr010v2-kpi-mini__compare-fill" style="width:${((Number(row.value) || 0) / maxValue) * 100}%"></span>
                    </span>
                </div>
            `).join("")}
        </div>
    `;
}

function renderHr010V2KpiMiniStack(segments) {
    const normalized = (Array.isArray(segments) ? segments : [])
        .map(segment => ({
            tone: segment.tone,
            value: Number(segment.value) || 0
        }))
        .filter(segment => segment.value > 0);

    if (!normalized.length) {
        return `<div class="hr010v2-kpi-mini hr010v2-kpi-mini--empty">-</div>`;
    }

    const total = normalized.reduce((sum, segment) => sum + segment.value, 0);

    return `
        <div class="hr010v2-kpi-mini hr010v2-kpi-mini--stack">
            <span class="hr010v2-kpi-mini__stack">
                ${normalized.map(segment => `
                    <span class="hr010v2-kpi-mini__stack-segment hr010v2-kpi-mini__stack-segment--${segment.tone}" style="width:${(segment.value / total) * 100}%"></span>
                `).join("")}
            </span>
        </div>
    `;
}

function renderHr010V2HealthCompositionBuckets(stats) {
    if (!stats.total) {
        return `<span class="hr010v2-health-composition__empty">데이터 없음</span>`;
    }

    const bucketRows = [
        {
            key: "now",
            label: "즉시",
            fullLabel: "즉시 가능",
            tone: "now",
            preset: "now"
        },
        {
            key: "soon",
            label: "2주 내",
            fullLabel: "2주 내 가능",
            tone: "soon",
            preset: "soon"
        },
        {
            key: "later",
            label: "2~4주",
            fullLabel: HR010V2_AVAILABILITY_LATER_LABEL,
            tone: "later",
            preset: "later"
        }
    ].map(bucket => {
        const staffCount = Number(stats.availabilityByType?.staff?.[bucket.key]) || 0;
        const freelancerCount = Number(stats.availabilityByType?.freelancer?.[bucket.key]) || 0;
        const totalCount = staffCount + freelancerCount;
        const staffShare = totalCount ? (staffCount / totalCount) * 100 : 0;
        const freelancerShare = totalCount ? (freelancerCount / totalCount) * 100 : 0;
        const totalLabel = `${totalCount}명`;
        const staffLabel = `${staffCount}명`;
        const freelancerLabel = `${freelancerCount}명`;
        const legendLabel = totalCount
            ? `직원 ${staffLabel} · 프리랜서 ${freelancerLabel}`
            : "구성 없음";

        return {
            ...bucket,
            staffCount,
            freelancerCount,
            totalCount,
            staffShare,
            freelancerShare,
            totalLabel,
            staffLabel,
            freelancerLabel,
            legendLabel
        };
    });
    const compositionAriaLabel = bucketRows
        .map(bucket => bucket.fullLabel || bucket.label)
        .join(", ");

    return `
        <div class="hr010v2-health-composition__stack hr010v2-health-composition__stack--compact" role="img" aria-label="${escapeHtml(`${compositionAriaLabel} 투입 가능 분포`)}">
            <div class="hr010v2-health-buckets">
                ${bucketRows.map(bucket => `
                    <div class="hr010v2-health-bucket hr010v2-health-bucket--${bucket.tone}">
                        <div class="hr010v2-health-bucket__head">
                            <span class="hr010v2-health-bucket__label" title="${escapeHtml(bucket.fullLabel || bucket.label)}">
                                <span class="hr010v2-health-bucket__label-main">${escapeHtml(bucket.label)}</span>
                            </span>
                            <strong class="hr010v2-health-bucket__count">${escapeHtml(bucket.totalLabel)}</strong>
                        </div>
                        <div class="hr010v2-health-bucket__stack" aria-hidden="true">
                            <span class="hr010v2-health-bucket__segment hr010v2-health-bucket__segment--staff" style="width:${bucket.staffShare}%"></span>
                            <span class="hr010v2-health-bucket__segment hr010v2-health-bucket__segment--freelancer" style="width:${bucket.freelancerShare}%"></span>
                        </div>
                        <div class="hr010v2-health-bucket__legend ${bucket.totalCount ? "" : "hr010v2-health-bucket__legend--empty"}" title="${escapeHtml(bucket.legendLabel)}">
                            ${bucket.totalCount ? `
                                <span class="hr010v2-health-bucket__legend-item hr010v2-health-bucket__legend-item--staff">
                                    <span class="hr010v2-health-bucket__legend-dot" aria-hidden="true"></span>
                                    <span>직원 ${escapeHtml(bucket.staffLabel)}</span>
                                </span>
                                <span class="hr010v2-health-bucket__legend-item hr010v2-health-bucket__legend-item--freelancer">
                                    <span class="hr010v2-health-bucket__legend-dot" aria-hidden="true"></span>
                                    <span>프리랜서 ${escapeHtml(bucket.freelancerLabel)}</span>
                                </span>
                            ` : `
                                <span class="hr010v2-health-bucket__legend-empty">구성 없음</span>
                            `}
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

function renderHr010V2HealthStats(stats) {
    return "";
}

function renderHr010V2HealthComposition(stats) {
    return renderHr010V2HealthCompositionBuckets(stats);
}

function renderHr010V2SkillRows(rows) {
    if (!rows.length) {
        return `<div class="hr010v2-empty">표시할 기술 분포 데이터가 없습니다.</div>`;
    }

    const visibleRows = rows.filter(row => String(row.skill || "").trim() !== "미등록");
    if (!visibleRows.length) {
        return `<div class="hr010v2-empty">표시할 기술 분포 데이터가 없습니다.</div>`;
    }
    const sortByCountDesc = (left, right) => {
        const diff = (Number(right.totalCount) || 0) - (Number(left.totalCount) || 0);
        if (diff) return diff;
        return String(left.skill || "").localeCompare(String(right.skill || ""), "ko");
    };
    const sortByCountAsc = (left, right) => {
        const diff = (Number(left.totalCount) || 0) - (Number(right.totalCount) || 0);
        if (diff) return diff;
        return String(right.skill || "").localeCompare(String(left.skill || ""), "ko");
    };
    const topRows = visibleRows.slice().sort(sortByCountDesc).slice(0, 3);
    const bottomRows = visibleRows.slice().sort(sortByCountAsc).slice(0, 3);

    const renderColumn = (columnRows, tone) => `
        <div class="hr010v2-supply-column hr010v2-supply-column--${tone}">
            ${columnRows.map((row, index) => {
                return `
                <button type="button" class="hr010v2-supply-row hr010v2-supply-row--compact ${row.preset ? "js-hr010v2-nav" : ""}" ${row.preset ? `data-hr010-preset="${escapeHtml(encodeHr010NavigationPreset(row.preset))}"` : ""}>
                    <div class="hr010v2-supply-row__rank" aria-hidden="true">${String(index + 1).padStart(2, "0")}</div>
                    <div class="hr010v2-supply-row__body">
                        <div class="hr010v2-supply-row__head">
                            <div class="hr010v2-supply-row__skill">
                                <strong>${escapeHtml(row.skill)}</strong>
                            </div>
                        </div>
                    </div>
                    <strong class="hr010v2-supply-row__meta">${escapeHtml(row.metaLabel)}</strong>
                </button>
                `;
            }).join("")}
        </div>
    `;

    return `
        <div class="hr010v2-supply-columns__layout">
            ${renderColumn(topRows, "top")}
            ${renderColumn(bottomRows, "bottom")}
        </div>
    `;
}

function renderHr010V2Alerts(alerts) {
    if (!alerts.length) {
        return `<div class="hr010v2-empty">현재 조건에서 바로 확인할 운영 알림이 없습니다.</div>`;
    }

    return alerts.map((alert, index) => `
        <button type="button" class="hr010v2-alert-item hr010v2-alert-item--${alert.tone} ${alert.preset ? "js-hr010v2-nav" : ""}" ${alert.preset ? `data-hr010-preset="${escapeHtml(encodeHr010NavigationPreset(alert.preset))}"` : ""}>
            <div class="hr010v2-alert-item__icon hr010v2-alert-item__icon--${alert.tone}" aria-hidden="true">
                <span>${escapeHtml(alert.icon || "!")}</span>
            </div>
            <div class="hr010v2-alert-item__body">
                <div class="hr010v2-alert-item__head">
                    <strong class="hr010v2-alert-item__title">${escapeHtml(alert.title)}</strong>
                    <span class="hr010v2-alert-item__tone hr010v2-alert-item__tone--${alert.tone}">${escapeHtml(alert.badge)}</span>
                </div>
                <div class="hr010v2-alert-item__meta">${escapeHtml(alert.meta)}</div>
            </div>
        </button>
    `).join("");
}

function renderHr010V2WeeklyBars(rows, stats = {}) {
    if (!rows.length) {
        return `<div class="hr010v2-empty">계약 종료일 데이터를 계산할 수 없습니다.</div>`;
    }

    const maxCount = Math.max(...rows.map(row => row.count), 1);
    const managementCount = Number(stats.contractImminentCount) || rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
    const expiredCount = Number((rows.find(row => row.presetValue === "expired") || {}).count) || 0;
    const thirtyCount = Number((rows.find(row => row.presetValue === "30") || {}).count) || 0;
    const sixtyCount = Number((rows.find(row => row.presetValue === "60") || {}).count) || 0;
    const ninetyCount = Number((rows.find(row => row.presetValue === "90") || {}).count) || 0;
    const missingCount = Number(stats.contractMissingCount) || 0;
    const managementTitle = "재계약 대상";
    const managementNote = managementCount ? formatHr010CountLabel(managementCount) : "0명";

    const summaryItems = rows.map(row => ({
        tone: row.tone,
        label: row.presetValue === "expired"
            ? "초과"
            : row.presetValue === "30"
                ? "30일"
                : row.presetValue === "60"
                    ? "60일"
                    : "90일",
        title: row.label,
        detail: row.meta,
        count: row.count,
        preset: row.preset
    }));
    if (missingCount) {
        summaryItems.push({
            tone: "warn",
            label: "미등록",
            title: "계약 종료일 미등록",
            detail: "입력 보완 필요",
            count: missingCount,
            preset: null
        });
    }

    return `
        <div class="hr010v2-weekly-summary">
            <div class="hr010v2-weekly-summary__head">
                <strong>${escapeHtml(managementTitle)}</strong>
                <span class="hr010v2-weekly-summary__note">${escapeHtml(managementNote)}</span>
            </div>
            <div class="hr010v2-weekly-summary__legend" aria-label="재계약 대상 범례">
                ${summaryItems.filter(item => item.count > 0).map(item => `
                    <button
                        type="button"
                        class="hr010v2-weekly-summary__legend-item hr010v2-weekly-summary__legend-item--${item.tone} ${item.preset ? "js-hr010v2-nav" : ""}"
                        ${item.preset ? `data-hr010-preset="${escapeHtml(encodeHr010NavigationPreset(item.preset))}"` : ""}
                        title="${escapeHtml(`${item.title} · ${item.detail}`)}"
                        aria-label="${escapeHtml(`${item.title} ${formatHr010CountLabel(item.count)}. ${item.detail}`)}">
                        <span class="hr010v2-weekly-summary__legend-dot" aria-hidden="true"></span>
                        <span class="hr010v2-weekly-summary__legend-label">${escapeHtml(item.label)}</span>
                        <strong>${escapeHtml(formatHr010CountLabel(item.count))}</strong>
                    </button>
                `).join("")}
            </div>
        </div>
        <div class="hr010v2-weekly-bars__grid">
            ${rows.map(row => {
        const height = row.count ? Math.max(14, Math.round((row.count / maxCount) * 100)) : 0;
        return `
            <button type="button" class="hr010v2-weekbar hr010v2-weekbar--${row.tone} ${row.count === 0 ? "is-empty" : ""} js-hr010v2-nav" data-hr010-preset="${escapeHtml(encodeHr010NavigationPreset(row.preset))}" title="${escapeHtml(`${row.label} · ${row.meta}`)}" aria-label="${escapeHtml(`${row.label} ${formatHr010CountLabel(row.count)}. ${row.meta}`)}">
                <div class="hr010v2-weekbar__column">
                    <span class="hr010v2-weekbar__count">${escapeHtml(formatHr010CountLabel(row.count))}</span>
                    <span class="hr010v2-weekbar__fill" style="--value:${height}"></span>
                </div>
                <strong class="hr010v2-weekbar__label">${escapeHtml(row.label)}</strong>
            </button>
        `;
            }).join("")}
        </div>
    `;
}

function renderHr010V2GradeBars(gradeRows, kosaRows) {
    const activeMode = hr010V2GradeChartMode === "kosa" ? "kosa" : "grade";
    const activeRows = activeMode === "kosa"
        ? (Array.isArray(kosaRows) ? kosaRows : [])
        : (Array.isArray(gradeRows) ? gradeRows : []);

    if (!activeRows.length) {
        return `<div class="hr010v2-empty">비중 데이터를 계산할 수 없습니다.</div>`;
    }

    const totalCount = activeRows.reduce((sum, row) => sum + (Number(row.totalCount) || 0), 0);
    const formatShare = value => {
        const rounded = Math.round((Number(value) || 0) * 10) / 10;
        return `${rounded}`.replace(/\.0$/, "");
    };
    const summaryLabel = activeMode === "kosa" ? "KOSA 분포" : "S/A/B/C 분포";
    const stackMarkup = activeRows
        .filter(row => (Number(row.totalCount) || 0) > 0)
        .map(row => {
            const share = totalCount ? ((Number(row.totalCount) || 0) / totalCount) * 100 : 0;
            const shareLabel = `${formatShare(share)}%`;
            return `
                <button
                    type="button"
                    class="hr010v2-grade-stack__segment hr010v2-grade-stack__segment--${row.tone} js-hr010v2-nav"
                    data-hr010-preset="${escapeHtml(encodeHr010NavigationPreset(row.preset))}"
                    style="--segment:${share.toFixed(2)}"
                    aria-label="${escapeHtml(`${row.label} 비중 ${shareLabel}`)}">
                    <span>${escapeHtml(row.label)}</span>
                </button>
            `;
        })
        .join("");

    const legendMarkup = activeRows.map(row => {
        const share = totalCount ? ((Number(row.totalCount) || 0) / totalCount) * 100 : 0;
        const shareLabel = `${formatShare(share)}%`;
        return `
            <button type="button" class="hr010v2-grade-legend__item ${row.preset ? "js-hr010v2-nav" : ""}" ${row.preset ? `data-hr010-preset="${escapeHtml(encodeHr010NavigationPreset(row.preset))}"` : ""}>
                <div class="hr010v2-grade-legend__head">
                    <span class="hr010v2-grade-legend__chip hr010v2-grade-legend__chip--${row.tone}">${escapeHtml(row.label)}</span>
                    <strong>${escapeHtml(shareLabel)}</strong>
                </div>
                <div class="hr010v2-grade-legend__meta">
                    <span>직원 ${escapeHtml(formatHr010CountLabel(row.staffCount))} · 프리랜서 ${escapeHtml(formatHr010CountLabel(row.freelancerCount))}</span>
                </div>
            </button>
        `;
    }).join("");

    const overviewClass = activeMode === "kosa"
        ? "hr010v2-grade-overview hr010v2-grade-overview--kosa"
        : "hr010v2-grade-overview";

    return `
        <div class="${overviewClass}">
            <div class="hr010v2-grade-overview__summary">
                <div class="hr010v2-grade-overview__copy">
                    <strong>${escapeHtml(summaryLabel)}</strong>
                </div>
                <div class="hr010v2-grade-overview__aside">
                    <strong class="hr010v2-grade-overview__total">${escapeHtml(`전체 ${formatHr010CountLabel(totalCount)}`)}</strong>
                </div>
            </div>
            <div class="hr010v2-grade-stack" role="img" aria-label="${escapeHtml(summaryLabel)}">
                ${stackMarkup || `<span class="hr010v2-grade-stack__empty">등급 데이터 없음</span>`}
            </div>
            <div class="hr010v2-grade-legend">
                ${legendMarkup}
            </div>
        </div>
    `;
}

function buildHr010V2GradePieGradient(rows, totalCount) {
    const segments = [];
    let start = 0;

    rows.forEach(row => {
        const count = Number(row.totalCount) || 0;
        if (!count || !totalCount) return;

        const percent = (count / totalCount) * 100;
        const end = start + percent;
        const color = row.tone === "s"
            ? "var(--hr010v2-grade-s)"
            : row.tone === "a"
                ? "var(--hr010v2-grade-a)"
                : row.tone === "b"
                    ? "var(--hr010v2-grade-b)"
                    : "var(--hr010v2-grade-c)";

        segments.push(`${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
        start = end;
    });

    if (!segments.length) {
        return "conic-gradient(#e7edf5 0% 100%)";
    }

    return `conic-gradient(${segments.join(", ")})`;
}

function renderHr010V2RecommendList(rows) {
    const gradeFilters = [
        { value: "all", label: "전체" },
        { value: "S", label: "특급" },
        { value: "A", label: "고급" },
        { value: "B", label: "중급" },
        { value: "C", label: "초급" }
    ];
    const selectedRows = hr010V2RecommendGradeFilter === "all"
        ? rows
        : rows.filter(row => String(row.gradeCode || "").toUpperCase() === hr010V2RecommendGradeFilter);

    const filterMarkup = `
        <div class="hr010v2-recommend-filter" role="tablist" aria-label="추천 인력 등급 필터">
            ${gradeFilters.map(filter => `
                <button
                    type="button"
                    class="hr010v2-recommend-filter__btn js-hr010v2-recommend-grade-filter ${hr010V2RecommendGradeFilter === filter.value ? "is-active" : ""}"
                    data-grade-filter="${escapeHtml(filter.value)}"
                    aria-pressed="${hr010V2RecommendGradeFilter === filter.value ? "true" : "false"}">
                    ${escapeHtml(filter.label)}
                </button>
            `).join("")}
        </div>
    `;

    if (!selectedRows.length) {
        return `
            ${filterMarkup}
            <div class="hr010v2-empty-state">
                <div class="hr010v2-empty-state__icon" aria-hidden="true"></div>
                <strong>${hr010V2RecommendGradeFilter === "all" ? "적합한 추천 인력이 없습니다" : "선택한 등급의 추천 인력이 없습니다"}</strong>
            </div>
        `;
    }

    return `
        ${filterMarkup}
        ${selectedRows.map(row => `
        <a
            class="hr010v2-recommend-item"
            href="/hr011?dev_id=${encodeURIComponent(row.devId)}"
            aria-label="${escapeHtml([row.name, row.skillLabel, row.regionLabel, row.typeLabel, row.availabilityBadge, row.scoreLabel].filter(Boolean).join(" · ") + " 상세보기")}">
            <div class="hr010v2-recommend-item__avatar">${row.profileMarkup}</div>
            <div class="hr010v2-recommend-item__body">
                <div class="hr010v2-recommend-item__title">
                    <strong>${escapeHtml(row.name)}</strong>
                    <span class="hr010v2-recommend-item__type hr010v2-recommend-item__type--${row.typeTone}">${escapeHtml(row.typeLabel)}</span>
                </div>
                <div class="hr010v2-recommend-item__meta">${escapeHtml(row.skillLabel)} · ${escapeHtml(row.regionLabel)}</div>
                <div class="hr010v2-recommend-item__submeta hr010v2-recommend-item__submeta--${row.availabilityTone}">${escapeHtml(row.availabilityBadge)}</div>
            </div>
            <div class="hr010v2-recommend-item__score">
                <strong>${escapeHtml(row.scoreLabel)}</strong>
            </div>
        </a>
    `).join("")}
    `;
}

function buildHr010V2SkillRows(list, today) {
    const skillMap = new Map();
    const totalCount = Array.isArray(list) ? list.length : 0;

    list.forEach(row => {
        const skillCodes = getSkillCodes(row);
        const skillNames = getSkillNameList(row);
        const skillCode = skillCodes[0] || "";
        const skillLabel = skillNames[0] || getPrimarySkillLabel(row);
        const skill = !skillLabel || skillLabel === "주개발언어 미등록" ? "미등록" : skillLabel;
        const availability = getHr010AvailabilityBucket(row, today);
        const mapKey = skillCode || skill;
        const current = skillMap.get(mapKey) || {
            skill,
            skillCode,
            totalCount: 0,
            nowCount: 0,
            soonCount: 0
        };

        current.totalCount += 1;
        if (availability.key === "now") current.nowCount += 1;
        if (availability.key === "soon") current.soonCount += 1;
        skillMap.set(mapKey, current);
    });

    const sortedRows = Array.from(skillMap.values())
        .sort((left, right) => {
            if (left.skill === "미등록") return 1;
            if (right.skill === "미등록") return -1;
            return right.totalCount - left.totalCount;
        });

    return sortedRows.map(row => {
        const availableCount = row.nowCount + row.soonCount;
        const shareRatio = totalCount ? Math.round((row.totalCount / totalCount) * 100) : 0;

        return {
            ...row,
            availableCount,
            shareRatio,
            metaLabel: `${shareRatio}% · ${formatHr010CountLabel(row.totalCount)}`,
            preset: row.skillCode
                ? makeHr010NavigationPreset({ filters: { skl_grp: [row.skillCode] } })
                : null
        };
    });
}

function buildHr010V2Alerts(list, availability, reliabilityScore, today, lowDataCount, ungradedCount, contractRows, contractMissingCount) {
    const alerts = [];
    const skillRows = buildHr010V2SkillRows(list, today);
    const expiredRow = (Array.isArray(contractRows) ? contractRows : []).find(row => row.presetValue === "expired");
    const expiring30 = (Array.isArray(contractRows) ? contractRows : []).find(row => row.presetValue === "30");

    if (expiredRow?.count) {
        alerts.push({
            tone: "risk",
            badge: "계약 초과",
            icon: "!",
            title: `계약만료일 초과 ${expiredRow.count}건`,
            meta: "재계약이 먼저 필요한 인력입니다.",
            preset: expiredRow.preset
        });
    }

    if (expiring30?.count) {
        alerts.push({
            tone: expiring30.count >= 3 ? "risk" : "warn",
            badge: "재계약 임박",
            icon: "!",
            title: `30일 내 재계약 ${expiring30.count}건`,
            meta: "연장 여부를 먼저 확인하세요.",
            preset: expiring30.preset
        });
    }

    if (availability.coord.count) {
        alerts.push({
            tone: "info",
            badge: "일정 확인",
            icon: "i",
            title: `가용일 미확정 ${availability.coord.count}건`,
            meta: "배치 전 날짜 확인이 필요합니다.",
            preset: makeHr010NavigationPreset({ runtimeFilters: { availability: "coord" } })
        });
    }

    if (skillRows.length) {
        const topSkill = skillRows[0];
            if (topSkill.shareRatio >= 35) {
                alerts.push({
                    tone: "warn",
                    badge: "기술 편중",
                    icon: "!",
                    title: `${topSkill.skill} 비중 ${topSkill.shareRatio}%`,
                meta: "한 기술 쏠림이 높습니다.",
                preset: topSkill.preset
            });
        }
    }

    if (lowDataCount) {
        alerts.push({
            tone: "warn",
            badge: "데이터 품질",
            icon: "!",
            title: `데이터 보완 ${lowDataCount}건`,
            meta: "추천 정확도가 떨어집니다.",
            preset: makeHr010NavigationPreset({ runtimeFilters: { profileCompleteness: "low" } })
        });
    }

    if (ungradedCount) {
        alerts.push({
            tone: "risk",
            badge: "평가 미반영",
            icon: "!",
            title: `평가 미반영 ${ungradedCount}건`,
            meta: "우선순위 계산 전입니다.",
            preset: makeHr010NavigationPreset({ runtimeFilters: { scoreState: "ungraded" } })
        });
    }

    if (contractMissingCount) {
        alerts.push({
            tone: "warn",
            badge: "계약 정보",
            icon: "?",
            title: `계약 종료일 미등록 ${contractMissingCount}건`,
            meta: "재계약 판단을 위해 입력이 필요합니다.",
            preset: makeHr010NavigationPreset({ runtimeFilters: { contractExpiry: "30" } })
        });
    }

    if (!alerts.length && list.length) {
        alerts.push({
            tone: "good",
            badge: "상태 양호",
            icon: "✓",
            title: `즉시·단기 투입 가능 ${formatHr010CountLabel(availability.now.count + availability.soon.count)}`,
            meta: "현재 조건은 안정적입니다.",
            preset: makeHr010NavigationPreset({ runtimeFilters: { availability: "deployable" } })
        });
    }

    const tonePriority = { risk: 0, warn: 1, info: 2, good: 3 };

    return alerts
        .sort((left, right) => {
            const leftPriority = tonePriority[left.tone] ?? 9;
            const rightPriority = tonePriority[right.tone] ?? 9;
            return leftPriority - rightPriority;
        })
        .slice(0, 4);
}

function buildHr010V2ContractRows(list, today) {
    const rows = [
        {
            label: "계약만료일 초과",
            meta: "재계약 검토 필요",
            tone: "expired",
            count: 0,
            presetValue: "expired",
            preset: makeHr010NavigationPreset({ runtimeFilters: { contractExpiry: "expired" } })
        },
        {
            label: "30일 내",
            meta: "긴급 재계약",
            tone: "risk",
            count: 0,
            presetValue: "30",
            preset: makeHr010NavigationPreset({ runtimeFilters: { contractExpiry: "30" } })
        },
        {
            label: "60일 내",
            meta: "재계약 검토",
            tone: "warn",
            count: 0,
            presetValue: "60",
            preset: makeHr010NavigationPreset({ runtimeFilters: { contractExpiry: "60" } })
        },
        {
            label: "90일 내",
            meta: "사전 점검",
            tone: "info",
            count: 0,
            presetValue: "90",
            preset: makeHr010NavigationPreset({ runtimeFilters: { contractExpiry: "90" } })
        }
    ];

    (Array.isArray(list) ? list : []).forEach(row => {
        const parsed = parseHr010Date(row.contract_end_dt);
        if (!parsed) return;

        const diff = getHr010DiffDays(parsed, today);
        if (diff < 0) {
            rows[0].count += 1;
            return;
        }

        if (diff <= 30) {
            rows[1].count += 1;
        } else if (diff <= 60) {
            rows[2].count += 1;
        } else if (diff <= 90) {
            rows[3].count += 1;
        }
    });

    return rows;
}

function buildHr010V2GradeRows(list, today) {
    const grades = ["S", "A", "B", "C"];
    const gradeTones = {
        S: "s",
        A: "a",
        B: "b",
        C: "c"
    };

    return grades.map(grade => {
        const gradeRows = list.filter(row => String(row.grade || "").toUpperCase() === grade);
        const staffRows = gradeRows.filter(row => resolveUserType(row) === "staff");
        const freelancerRows = gradeRows.filter(row => resolveUserType(row) === "freelancer");
        const readyCount = gradeRows.filter(row => {
            const bucket = getHr010AvailabilityBucket(row, today);
            return bucket.key === "now" || bucket.key === "soon";
        }).length;
        const staffReadyCount = staffRows.filter(row => {
            const bucket = getHr010AvailabilityBucket(row, today);
            return bucket.key === "now" || bucket.key === "soon";
        }).length;
        const freelancerReadyCount = freelancerRows.filter(row => {
            const bucket = getHr010AvailabilityBucket(row, today);
            return bucket.key === "now" || bucket.key === "soon";
        }).length;

        return {
            label: grade,
            totalCount: gradeRows.length,
            readyCount,
            readyRatio: gradeRows.length ? Math.round((readyCount / gradeRows.length) * 100) : 0,
            staffCount: staffRows.length,
            freelancerCount: freelancerRows.length,
            staffReadyCount,
            freelancerReadyCount,
            tone: gradeTones[grade] || "c",
            preset: makeHr010NavigationPreset({ filters: { grade: [grade] } })
        };
    });
}

function buildHr010V2KosaRows(list, today) {
    const kosaOrder = (dropdownFilters.kosa_grd_cd.options || [])
        .map(option => String(option.cd || "").trim())
        .filter(Boolean);
    const groups = new Map();

    list.forEach(row => {
        const rawValue = String(row.kosa_grd_cd || "").trim();
        const key = rawValue || "__empty__";
        const type = resolveUserType(row);
        const current = groups.get(key) || {
            key,
            label: rawValue ? (getDropdownOptionLabel("kosa_grd_cd", rawValue) || rawValue) : "미등록",
            totalCount: 0,
            staffCount: 0,
            freelancerCount: 0,
            readyCount: 0,
            staffReadyCount: 0,
            freelancerReadyCount: 0
        };

        current.totalCount += 1;
        if (type === "staff") {
            current.staffCount += 1;
        } else {
            current.freelancerCount += 1;
        }

        const bucket = getHr010AvailabilityBucket(row, today);
        if (bucket.key === "now" || bucket.key === "soon") {
            current.readyCount += 1;
            if (type === "staff") {
                current.staffReadyCount += 1;
            } else {
                current.freelancerReadyCount += 1;
            }
        }

        groups.set(key, current);
    });

    const orderedKeys = [
        ...kosaOrder.filter(value => groups.has(value)),
        ...Array.from(groups.keys()).filter(value => value === "__empty__" || !kosaOrder.includes(value))
    ];
    const tones = ["s", "a", "b", "c"];
    const total = list.length;

    return orderedKeys.map((key, index) => {
        const row = groups.get(key);
        return {
            ...row,
            shareRatio: total ? Math.round((Number(row.totalCount) || 0) / total * 100) : 0,
            tone: tones[index % tones.length],
            preset: row.key === "__empty__"
                ? null
                : makeHr010NavigationPreset({ filters: { kosa_grd_cd: [row.key] } })
        };
    });
}

function buildHr010V2KpiCards(list, context) {
    const staffRows = context.staffRows || [];
    const freelancerRows = context.freelancerRows || [];
    const totalCount = list.length;
    const totalCountLabel = formatHr010CountLabel(totalCount);
    const staffCountLabel = formatHr010CountLabel(staffRows.length);
    const freelancerCountLabel = formatHr010CountLabel(freelancerRows.length);
    const availablePoolLabel = formatHr010CountLabel(context.availablePoolCount);
    const availableNowLabel = formatHr010CountLabel(context.availability.now.count);
    const availableSoonLabel = formatHr010CountLabel(context.availability.soon.count);

    return [
        {
            label: "전체 개발 인력",
            value: totalCountLabel,
            meta: totalCount ? "직원/프리랜서 구성" : "재직 인력 데이터 없음",
            tone: "coral",
            kind: "donut",
            chartMarkup: renderHr010V2KpiMiniDonut([
                { color: HR010V2_ROLE_STAFF_COLOR, value: staffRows.length },
                { color: HR010V2_ROLE_FREELANCER_COLOR, value: freelancerRows.length }
            ], {
                layout: "inline",
                centerValue: totalCountLabel,
                legendItems: [
                    { color: HR010V2_ROLE_STAFF_COLOR, label: "직원", value: staffCountLabel },
                    { color: HR010V2_ROLE_FREELANCER_COLOR, label: "프리랜서", value: freelancerCountLabel }
                ]
            }),
            preset: makeHr010NavigationPreset()
        },
        {
            label: "고용 형태 구성",
            value: `${staffCountLabel} / ${freelancerCountLabel}`,
            meta: totalCount ? "직원/프리랜서 분포" : "고용 형태 데이터 없음",
            tone: "mint",
            chartMarkup: renderHr010V2KpiMiniCompare([
                { label: "직원", value: staffRows.length, valueLabel: staffCountLabel, tone: "staff" },
                { label: "프리랜서", value: freelancerRows.length, valueLabel: freelancerCountLabel, tone: "freelancer" }
            ]),
            preset: makeHr010NavigationPreset()
        },
        {
            label: "가용 인력",
            value: availablePoolLabel,
            meta: totalCount ? "가용일 기준" : "가용 데이터 없음",
            tone: "blue",
            chartMarkup: renderHr010V2KpiMiniDonut([
                { color: "#2c80ff", value: context.availablePoolCount },
                { color: "#d6deea", value: context.unavailableCount }
            ], {
                layout: "inline",
                centerValue: availablePoolLabel,
                legendItems: [
                    { color: "#2c80ff", label: "가용", value: availablePoolLabel },
                    { color: "#d6deea", label: "비가용", value: formatHr010CountLabel(context.unavailableCount) }
                ]
            }),
            preset: makeHr010NavigationPreset({ runtimeFilters: { availability: "available" } })
        },
        {
            label: "즉시 투입 가능 인력",
            value: availableNowLabel,
            meta: context.availablePoolCount ? "즉시 기준" : "가용 인력 없음",
            tone: "violet",
            chartMarkup: renderHr010V2KpiMiniCompare([
                { label: "즉시", value: context.availability.now.count, valueLabel: availableNowLabel, tone: "base" },
                { label: "2주 내", value: context.availability.soon.count, valueLabel: availableSoonLabel, tone: "accent" }
            ]),
            preset: makeHr010NavigationPreset({ runtimeFilters: { availability: "now" } })
        }
    ];
}

function makeHr010NavigationPreset(options = {}) {
    return {
        userType: options.userType || "all",
        filters: options.filters || {},
        runtimeFilters: options.runtimeFilters || {},
        keywordTags: Array.isArray(options.keywordTags) ? options.keywordTags : [],
        viewMode: options.viewMode || currentHr010ViewMode || "card"
    };
}

function buildHr010V2RecommendRows(list, today) {
    return list
        .slice()
        .sort((left, right) => {
            const leftBucket = getHr010AvailabilityBucket(left, today).priority;
            const rightBucket = getHr010AvailabilityBucket(right, today).priority;
            if (leftBucket !== rightBucket) return leftBucket - rightBucket;

            const leftScore = Number(left.score) || 0;
            const rightScore = Number(right.score) || 0;
            if (leftScore !== rightScore) return rightScore - leftScore;

            return getHr010ProfileCompleteness(right) - getHr010ProfileCompleteness(left);
        })
        .slice(0, 3)
        .map(row => {
            const availability = getHr010AvailabilityBucket(row, today);
            const employment = getEmploymentMeta(row);
            const gradeCode = String(row.grade || "").toUpperCase();

            return {
                devId: row.dev_id,
                name: row.dev_nm || "-",
                gradeCode,
                gradeLabel: getHr010RecommendGradeTierLabel(gradeCode),
                skillLabel: getPrimarySkillLabel(row),
                regionLabel: `${getSidoLabel(row) || "-"} / ${getWorkModeLabel(row)}`,
                availabilityLabel: getAvailabilityLabel(row),
                availabilityBadge: availability.label,
                availabilityTone: availability.tone,
                scoreLabel: formatGradeLabel(row.grade, row.score) || "평가 대기",
                typeLabel: employment.label,
                typeTone: employment.className === "freelancer" ? "info" : "good",
                profileMarkup: getProfileMarkup(row)
            };
        });
}

function getHr010AvailabilityBucket(row, today) {
    const parsed = parseHr010Date(row.avail_dt);
    if (!parsed) {
        return { key: "coord", label: "가용일 미확정", tone: "warn", priority: 2 };
    }

    const diff = getHr010DiffDays(parsed, today);
    if (diff <= 0) {
        return { key: "now", label: "즉시 가능", tone: "good", priority: 0 };
    }
    if (diff <= 14) {
        return { key: "soon", label: "2주 내 가능", tone: "info", priority: 1 };
    }
    return { key: "later", label: HR010V2_AVAILABILITY_LATER_LABEL, tone: "risk", priority: 3 };
}

function getHr010ProfileCompleteness(row) {
    const fields = [
        row.dev_nm,
        row.main_lang_nm,
        row.work_md,
        row.ctrt_typ,
        row.sido_cd,
        row.avail_dt,
        row.hope_rate_amt,
        row.kosa_grd_cd,
        row.exp_yr
    ];
    const filled = fields.filter(value => value !== null && value !== undefined && String(value).trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
}

function hasHr010CoreFieldGap(row) {
    const coreFields = [
        row.main_lang_nm,
        row.work_md,
        row.sido_cd,
        row.avail_dt,
        row.hope_rate_amt
    ];

    return coreFields.some(value => value === null || value === undefined || String(value).trim() === "");
}

function parseHr010Date(value) {
    if (!value) return null;
    const date = new Date(String(value).trim());
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
}

function getHr010Today() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function getHr010DiffDays(target, base) {
    return Math.round((target.getTime() - base.getTime()) / 86400000);
}

function clampHr010Value(value) {
    const numeric = Number(value) || 0;
    if (numeric < 0) return 0;
    if (numeric > 100) return 100;
    return numeric;
}

function formatHr010CountLabel(value, unit = "명") {
    const numeric = Number(value) || 0;
    return numeric > 0 ? `${numeric}${unit}` : "없음";
}

function setHr010Text(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = value;
}

function setHr010Html(id, markup) {
    const element = document.getElementById(id);
    if (!element) return;
    element.innerHTML = markup;
}

function getHr010RuntimeFilterTagLabel(key, value) {
    switch (key) {
        case "availability":
            return `투입 가능: ${getHr010AvailabilityPresetLabel(value)}`;
        case "profileCompleteness":
            return value === "low" ? "추가 조건: 데이터 보완 필요" : `추가 조건: ${value}`;
        case "scoreState":
            return value === "ungraded" ? "추가 조건: 평가 미반영" : `추가 조건: ${value}`;
        case "contractExpiry":
            return `재계약: ${getHr010ContractExpiryPresetLabel(value)}`;
        default:
            return `${key}: ${value}`;
    }
}

function getHr010AvailabilityPresetLabel(value) {
    switch (String(value || "")) {
        case "available":
            return "가용 인력";
        case "deployable":
            return "투입 가능 인력";
        case "now":
            return "즉시 가능";
        case "week1":
            return "1주 이내";
        case "week2":
            return "2주 이내";
        case "soon":
            return "2주 내 가능";
        case "later":
            return HR010V2_AVAILABILITY_LATER_LABEL;
        case "coord":
            return "가용일 미확정";
        default:
            return String(value || "-");
    }
}

function getHr010ContractExpiryPresetLabel(value) {
    switch (String(value || "")) {
        case "expired":
            return "계약만료일 초과";
        case "30":
            return "30일 내";
        case "60":
            return "60일 내";
        case "90":
            return "90일 내";
        default:
            return String(value || "-");
    }
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

    Object.entries(hr010RuntimeFilters).forEach(([key, value]) => {
        if (!value) return;

        tags.push({
            type: "special",
            key,
            value,
            label: getHr010RuntimeFilterTagLabel(key, value)
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
            <span class="hr010-tag-remove" data-type="${tag.type}" data-key="${tag.key}" data-value="${escapeHtml(tag.value)}" aria-label="태그 삭제">✖</span>
        </button>
    `).join("");
}

// 태그 검색/스마트 필터 전체 초기화
function resetHr010Filters() {
    currentHr010UserTypeTab = "all";
    keywordTags = [];
    clearHr010RuntimeFilters();
    hr010V2DashboardFilters = {
        department: "",
        stack: "",
        timing: ""
    };
    hr010V2GradeChartMode = "grade";
    hr010V2RecommendGradeFilter = "all";

    Object.keys(selectedFilters).forEach(key => {
        selectedFilters[key] = [];
    });

    $("#hr010TagKeywordInput").val("");
    hideTagSuggestions();
    $(".dropdown").removeClass("open");
    $(".toggle-filter-chip").removeClass("is-active");
    $('.toggle-filter-chip[data-user-type="all"]').addClass("is-active");
    syncHr010V2GradeViewToggle();

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

// 전체 지역명 -> 짧은 표기명
function toShortRegionName(label) {
    const map = {
        "서울특별시": "서울",
        "부산광역시": "부산",
        "대구광역시": "대구",
        "인천광역시": "인천",
        "광주광역시": "광주",
        "대전광역시": "대전",
        "울산광역시": "울산",
        "세종특별자치시": "세종",
        "경기도": "경기",
        "강원특별자치도": "강원",
        "충청북도": "충북",
        "충청남도": "충남",
        "전북특별자치도": "전북",
        "전라남도": "전남",
        "경상북도": "경북",
        "경상남도": "경남",
        "제주특별자치도": "제주"
    };

    return map[label] || label;
}

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

function getHr010RecommendGradeTierLabel(gradeCode) {
    switch (String(gradeCode || "").toUpperCase()) {
        case "S":
            return "특급";
        case "A":
            return "고급";
        case "B":
            return "중급";
        case "C":
            return "초급";
        default:
            return "평가 대기";
    }
}

// 계약단가(,),(테이블표)
function amountFormatter(value) {
    if (!value) return "";

    const num = Number(value);
    if (isNaN(num)) return "";

    const man = Math.floor(num / 10000);

    return formatAmount(man) + "만원";
}

// 팝업에서도 마찬가지로 (,) 표시
function formatAmount(value) {
    if (value === null || value === undefined || value === "") return "";

    return value
        .toString()
        .replace(/[^0-9]/g, "")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

// 페이지 나누기
function getPagedList(list) {
    let size = hr010Paging.size;
    const start = (hr010Paging.page - 1) * size;
    return list.slice(start, start + size);
}

// 페이지 렌더링
function renderHr010Pager() {
    const pagerRoot = document.getElementById("HR010_PAGER");
    if (!pagerRoot) return;

    let pager = pagerRoot.querySelector(".hr010-pager");

    const size = hr010Paging.size;
    const totalPage = Math.ceil(hr010Paging.total / size);

    if (totalPage <= 1) {
        if (pager) pager.remove();
        return;
    }

    if (!pager) {
        pager = document.createElement("div");
        pager.className = "hr010-pager";
        pagerRoot.appendChild(pager);
    }

    let html = `
        <button data-page="first" ${hr010Paging.page === 1 ? "disabled" : ""}>«</button>
        <button data-page="prev" ${hr010Paging.page === 1 ? "disabled" : ""}>‹</button>
    `;

    for (let i = 1; i <= totalPage; i++) {
        html += `
            <button class="${i === hr010Paging.page ? "active" : ""}" data-page="${i}">
                ${i}
            </button>
        `;
    }

    html += `
        <button data-page="next" ${hr010Paging.page === totalPage ? "disabled" : ""}>›</button>
        <button data-page="last" ${hr010Paging.page === totalPage ? "disabled" : ""}>»</button>
    `;

    pager.innerHTML = html;

    pager.querySelectorAll("button").forEach(btn => {
        btn.onclick = function () {
            if (this.disabled) return;

            const type = this.dataset.page;

            if (type === "first") hr010Paging.page = 1;
            else if (type === "last") hr010Paging.page = totalPage;
            else if (type === "prev") hr010Paging.page = Math.max(1, hr010Paging.page - 1);
            else if (type === "next") hr010Paging.page = Math.min(totalPage, hr010Paging.page + 1);
            else hr010Paging.page = Number(type);

            renderUserCards(hr010LastRenderedRows);
        };
    });
}

// 카드 렌더링
function renderUserCards(list) {
    const container = document.getElementById("CARD_HR010_A");
    if (!container) return;

    hr010LastRenderedRows = Array.isArray(list) ? list.slice() : [];
    hr010Paging.total = hr010LastRenderedRows.length;

    // 페이지 범위 보정
    const totalPage = Math.ceil(hr010Paging.total / hr010Paging.size);
    if (hr010Paging.page > totalPage) {
        hr010Paging.page = totalPage || 1;
    }

    const pagedList = getPagedList(hr010LastRenderedRows);

    container.dataset.view = currentHr010ViewMode;
    updateHr010ResultCount(hr010LastRenderedRows.length);

    if (!pagedList || !pagedList.length) {
        container.innerHTML = `
            <div class="no-data-wrap">
                <div class="no-data-box">
                    <div class="no-data-icon">📭</div>
                    <div class="no-data-text">데이터 없음</div>
                </div>
            </div>
        `;
        renderHr010Pager();
        return;
    }

    const fragment = document.createDocumentFragment();

    if (currentHr010ViewMode === "list") {
        const wrapper = document.createElement("div");
        wrapper.className = "hr010-list-view";

        wrapper.innerHTML = `
            <div class="hr010-list-header list-view">
                <div>인력 정보</div>
                <div>구분</div>
                <div>주 개발언어</div>
                <div>등급 / KOSA</div>
                <div>지역 / 근무</div>
                <div>투입 가능</div>
                <div>희망 단가</div>
            </div>
            <div class="hr010-list-body">
                ${pagedList.map(row => createUserCard(row, "list")).join("")}
            </div>
        `;

        fragment.appendChild(wrapper);
    } else {
        pagedList.forEach(row => {
            const div = document.createElement("div");
            div.innerHTML = createUserCard(row, "card");
            fragment.appendChild(div.firstElementChild);
        });
    }

    container.innerHTML = "";
    container.appendChild(fragment);

    renderHr010Pager();

    animateHr010RenderedItems(container);
    bindCardEvents(container, pagedList);
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
    const countEl = document.getElementById("result-count-bold");
    if (!countEl) return;
    countEl.textContent = String(Number(count) || 0);
}
// ==============================
// 카드 / 리스트 생성
// ==============================
function createUserCard(row, viewType = "card") {

    // 공통 데이터 가공 (중복 제거 핵심)
    const vm = {
        id: row.dev_id,
        name: escapeHtml(row.dev_nm || "-"),
        profile: getProfileMarkup(row),
        employment: getEmploymentMeta(row),

        primarySkill: getPrimarySkillLabel(row),
        skills: getSkillChipMarkup(row),

        grade: escapeHtml(formatGradeLabel(row.grade, row.score) || "-"),
        kosa: escapeHtml(getKosaLabel(row)),
        kosaStars: getKosaStarMarkup(row, "user-kosa-stars--inline"),

        regionWork: getRegionWorkInlineMarkup(row),
        availability: escapeHtml(getAvailabilityLabel(row)),
        rate: escapeHtml(amountFormatter(row.hope_rate_amt) || "-"),
        career: escapeHtml(formatCareerYearMonth(row.exp_yr) || "-"),

        contractType: escapeHtml(getContractTypeLabel(row)),
        workMode: escapeHtml(getWorkModeLabel(row))
    };

    // ==============================
    // 리스트형
    // ==============================
    if (viewType === "list") {
        return `
        <article class="user-list-row" data-id="${vm.id}" tabindex="0" title="더블클릭하여 상세 보기">
            <div class="user-list-row__profile">
                <div class="user-list-row__avatar">${vm.profile}</div>
                <div class="user-list-row__text">
                    <div class="user-list-row__name">${vm.name}</div>
                    <div class="user-list-row__sub">${vm.career} · ${vm.contractType}</div>
                </div>
            </div>

            <div class="user-list-row__cell">
                <span class="user-card__badge user-card__badge--${vm.employment.className}">
                    ${vm.employment.label}
                </span>
            </div>

            <div class="user-list-row__cell user-list-row__skill-cell">
                ${getSkillSummaryMarkup(row, 5)}
            </div>

            <div class="user-list-row__cell user-list-row__grade-cell">
                <div class="user-list-row__grade-main">${vm.grade}</div>
                <div class="user-list-row__grade-sub">
                    <span>${vm.kosa}</span>
                    ${vm.kosaStars}
                </div>
            </div>

            <div class="user-list-row__cell user-list-row__region-cell">
                ${vm.regionWork}
            </div>

            <div class="user-list-row__cell">${vm.availability}</div>

            <div class="user-list-row__cell user-list-row__rate">${vm.rate}</div>
        </article>`;
    }

    // ==============================
    // 카드형
    // ==============================
    return `
    <article class="user-card" data-id="${vm.id}" tabindex="0" title="더블클릭하여 상세 보기">
        <div class="user-card__top">
            <span class="user-card__badge user-card__badge--${vm.employment.className}">
                ${vm.employment.label}
            </span>
        </div>

        <div class="user-card__profile">
            <div class="user-card__avatar">${vm.profile}</div>
            <div class="user-card__name">${vm.name}</div>
            <div class="user-list-row__sub">${vm.career} · ${vm.contractType} · ${vm.kosa} ${vm.kosaStars}</div>
            <div class="user-card__subtitle">
                ${vm.primarySkill ? `주개발언어 · ${vm.primarySkill}` : "주개발언어 미등록"}
            </div>
        </div>
        <div class="user-card__skills">${vm.skills}</div>
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

function getProfileMarkup(row) {
    const imgUrl = row.img_url || (row.dev_img_base64 ? `data:image/png;base64,${row.dev_img_base64}` : "");
    if (imgUrl) {
        return `<img src="${imgUrl}" class="profile-circle-icon" alt="${escapeHtml(row.dev_nm || "프로필")}"/>`;
    }
    return makeProfileCircle(row.dev_nm);
}

function getEmploymentMeta(row) {
    const type = resolveUserType(row);
    if (type === "freelancer") {
        return { label: "프리랜서", className: "freelancer" };
    }
    return { label: "직원", className: "staff" };
}

function getPrimarySkillLabel(row) {
    const skillParts = getSkillDisplayParts(row);
    if (!skillParts.primary) return "주개발언어 미등록";
    return skillParts.primary;
}

function getHr010DepartmentLabel(row) {
    const mainFldLabel = getHr010V2DashboardCodeLabel("mainFld", row?.main_fld_cd);
    const mainCustLabel = getHr010V2DashboardCodeLabel("mainCust", row?.main_cust_cd);
    const candidates = [
        row?.dept_nm,
        row?.org_nm,
        row?.team_nm,
        row?.part_nm,
        row?.blg_nm,
        row?.main_fld_nm,
        mainFldLabel,
        mainCustLabel,
        row?.main_fld_cd ? `주요 분야 ${String(row.main_fld_cd).trim()}` : "",
        row?.main_cust_cd ? `주요 고객 ${String(row.main_cust_cd).trim()}` : ""
    ].map(value => String(value || "").trim()).filter(Boolean);

    if (candidates.length) {
        return candidates[0];
    }

    return resolveUserType(row) === "staff" ? "직원 그룹" : "프리랜서 그룹";
}

function getHr010V2DashboardCodeLabel(groupKey, code) {
    const normalizedCode = String(code || "").trim();
    if (!normalizedCode) return "";

    const map = hr010V2DashboardCodeMaps[groupKey] || {};
    return String(map[normalizedCode] || "").trim();
}

function getSkillSummaryMarkup(row, maxChips = 3) {
    const skillParts = getSkillDisplayParts(row);
    if (!skillParts.skills.length) {
        return `<span class="user-card__skill-chip is-muted">미등록</span>`;
    }

    const hasMore = skillParts.skills.length > maxChips;
    const visibleSkills = skillParts.skills.slice(0, maxChips);
    const chips = visibleSkills.map((skill, idx) => `<span class="user-card__skill-chip ${idx === 0 ? "user-card__skill-chip--main" : ""}">${escapeHtml(skill)}</span>`).join("");
    const moreChip = hasMore ? `<span class="user-card__skill-chip is-muted">...</span>` : "";

    return `<div class="user-list-row__skill-stack"><div class="user-list-row__skill-line user-list-row__skill-line--main"><span class="user-list-row__skill-line-label">주개발언어</span><div class="user-list-row__skill-line-chips">${chips}${moreChip}</div></div></div>`;
}

function getSkillDisplayParts(row) {
    const skills = getSkillNameList(row);
    const primary = skills[0] || "";
    return { skills, primary };
}

function getSkillChipMarkup(row, maxChips = 5) {
    const skillParts = getSkillDisplayParts(row);
    if (!skillParts.skills.length) {
        const chips = `<span class="user-card__skill-chip is-muted">미등록</span>`;
        return `<div class="user-card__skill-group user-card__skill-group--main"><span class="user-card__skill-group-label">주개발언어</span><div class="user-card__skill-group-chips">${chips}</div></div>`;
    }

    const hasMore = skillParts.skills.length > maxChips;
    const visibleSkills = skillParts.skills.slice(0, maxChips);
    const chips = visibleSkills.map((skill, idx) => `<span class="user-card__skill-chip ${idx === 0 ? "user-card__skill-chip--main" : ""}">${escapeHtml(skill)}</span>`).join("");
    const moreChip = hasMore ? `<span class="user-card__skill-chip is-muted">...</span>` : "";

    return `<div class="user-card__skill-group user-card__skill-group--main"><span class="user-card__skill-group-label">주개발언어</span><div class="user-card__skill-group-chips">${chips}${moreChip}</div></div>`;
}

function getSkillNameList(row) {
    return String(row.main_lang_nm || "").split(",").map(skill => skill.trim()).filter(Boolean);
}

function getWorkModeLabel(row) {
    return getDropdownOptionLabel("work_md", row.work_md) || row.work_md || "근무형태 미정";
}

function getContractTypeLabel(row) {
    return getDropdownOptionLabel("ctrt_typ", row.ctrt_typ) || row.ctrt_typ || "계약형태 미정";
}

function getKosaLabel(row) {
    return getDropdownOptionLabel("kosa_grd_cd", row.kosa_grd_cd) || row.kosa_grd_cd || "-";
}

// 표기되는 별 갯수가 매칭이 안되는데...(최대 4개로 축소)
function getKosaStarCount(row) {
    const label = String(getKosaLabel(row) || "").replace(/\s/g, "");
    if (!label || label === "-") return 0;
    if (label.includes("특")) return 4;
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
        `<span class="user-card__info-inline-text">${escapeHtml(getSidoLabel(row) || "-")}</span>`,
        getWorkModeBadgeMarkup(row)
    ].join("");
}

// 투입 가능 표시명
function getAvailabilityLabel(row) {
    if (!row.avail_dt) return "가용일 미정";
    return row.avail_dt;
}

// 거주지역 표시명
function getSidoLabel(row) {
    const label = getDropdownOptionLabel("sido_cd", row.sido_cd) || row.sido_cd || "-";
    return toShortRegionName(label);
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

async function initHr010V2DashboardCodeMaps() {
    try {
        const [mainFldOptions, mainCustOptions] = await Promise.all([
            fetchComCodeOptions("MAIN_FLD_CD", ""),
            fetchComCodeOptions("MAIN_CUST_CD", "")
        ]);

        hr010V2DashboardCodeMaps.mainFld = buildMap(normalizeDropdownOptions(mainFldOptions));
        hr010V2DashboardCodeMaps.mainCust = buildMap(normalizeDropdownOptions(mainCustOptions));
    } catch (error) {
        console.warn("[hr010] 대시보드 코드맵 초기화 실패", error);
        hr010V2DashboardCodeMaps.mainFld = {};
        hr010V2DashboardCodeMaps.mainCust = {};
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

function renderHr010V2KpiCards(kpis) {
    if (!Array.isArray(kpis) || !kpis.length) {
        return `<div class="hr010v2-empty">표시할 KPI 데이터가 없습니다.</div>`;
    }

    const renderCard = item => {
        const isTrendCard = item.kind === "trend";
        return `
            <button type="button" class="hr010v2-kpi-card hr010v2-kpi-card--${item.tone} ${isTrendCard ? "hr010v2-kpi-card--trend" : ""} js-hr010v2-nav" data-hr010-preset="${escapeHtml(encodeHr010NavigationPreset(item.preset))}">
                <div class="hr010v2-kpi-card__main ${isTrendCard ? "hr010v2-kpi-card__main--trend" : ""}">
                    <div class="hr010v2-kpi-card__copy">
                        <span class="hr010v2-kpi-card__label">${escapeHtml(item.label)}</span>
                        <strong class="hr010v2-kpi-card__value">${escapeHtml(item.value)}</strong>
                    </div>
                    ${isTrendCard ? `
                        <div class="hr010v2-kpi-card__trend" aria-hidden="true">
                            ${item.chartMarkup || ""}
                        </div>
                    ` : `
                        <div class="hr010v2-kpi-card__visual" aria-hidden="true">
                            <div class="hr010v2-kpi-card__spark">
                                ${item.chartMarkup || ""}
                            </div>
                        </div>
                    `}
                </div>
            </button>
        `;
    };

    const groups = [
        { title: "인력 현황", items: kpis.slice(0, 2) },
        { title: "투입 가능성", items: kpis.slice(2, 4) }
    ].filter(group => group.items.length);

    return `
        <div class="hr010v2-kpi-groups">
            ${groups.map(group => `
                <section class="hr010v2-kpi-group">
                    <div class="hr010v2-kpi-group__title">${escapeHtml(group.title)}</div>
                    <div class="hr010v2-kpi-group__cards">
                        ${group.items.map(renderCard).join("")}
                    </div>
                </section>
            `).join("")}
        </div>
    `;
}

function renderHr010V2KpiTrend(series, options = {}) {
    const normalized = (Array.isArray(series) ? series : []).map(value => Number(value) || 0);
    const safeSeries = normalized.length ? normalized : [0, 0];
    const maxValue = Math.max(...safeSeries, 1);
    const width = 100;
    const height = 56;
    const paddingX = 5;
    const paddingY = 6;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;
    const slotWidth = innerWidth / safeSeries.length;
    const barWidth = Math.max(6, Math.min(10, slotWidth * 0.62));
    const deltaTone = options.deltaTone || "info";
    const deltaLabel = options.deltaLabel || "없음";
    const noteLabel = options.noteLabel || "최근 7일 등록";

    return `
        <div class="hr010v2-kpi-mini hr010v2-kpi-mini--trend hr010v2-kpi-mini--trend-${deltaTone}">
            <div class="hr010v2-kpi-mini__trend-head">
                <span class="hr010v2-kpi-mini__trend-note">${escapeHtml(noteLabel)}</span>
                <span class="hr010v2-kpi-mini__trend-chip hr010v2-kpi-mini__trend-chip--${deltaTone}">${escapeHtml(deltaLabel)}</span>
            </div>
            <svg class="hr010v2-kpi-trend hr010v2-kpi-trend--${options.tone || "blue"}" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true">
                <line class="hr010v2-kpi-trend__baseline" x1="5" y1="50" x2="95" y2="50"></line>
                ${safeSeries.map((value, index) => {
        const barHeight = Math.max(Math.round(((Number(value) || 0) / maxValue) * innerHeight), Number(value) > 0 ? 10 : 4);
        const x = paddingX + (slotWidth * index) + ((slotWidth - barWidth) / 2);
        const y = height - paddingY - barHeight;
        return `
                    <rect
                        class="hr010v2-kpi-trend__bar ${index === safeSeries.length - 1 ? "is-current" : ""}"
                        x="${x.toFixed(2)}"
                        y="${y.toFixed(2)}"
                        width="${barWidth.toFixed(2)}"
                        height="${barHeight.toFixed(2)}"
                        rx="3"
                    ></rect>
                `;
    }).join("")}
            </svg>
        </div>
    `;
}

function renderHr010V2HealthComposition(stats) {
    return renderHr010V2HealthCompositionBuckets(stats);
}
