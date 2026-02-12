/*****
 * 그리드 공통 페이징/건수 표시 - grid-pager.js (hcnc_hms)
 */
(function (window) {
    "use strict";

    if (!window || !window.Tabulator || window.__HCNC_GRID_PAGER_PATCHED__) {
        return;
    }

    var OriginalTabulator = window.Tabulator;
    var DEFAULT_PAGE_SIZE = 10;
    var DEFAULT_PAGE_SIZES = [10, 20, 50, 100];
    var COUNTER_CLASS = "hcnc-grid-count"; 
    var FOOTER_COMPACT_CLASS = "hcnc-grid-footer-compact";  // 공통코드 > 코드그룹은 폭이 좁아 건수 텍스트를 항상 페이지 버튼 아래로 배치
    var trackedTables = [];
    var viewTableId = null; // table의 id값을 임시 저장
    var resizeTimer = null;
    var PAGINATION_SYMBOL_LANG = {
        pagination: {
            first: "«",
            first_title: "첫 페이지",
            last: "»",
            last_title: "마지막 페이지",
            prev: "‹",
            prev_title: "이전 페이지",
            next: "›",
            next_title: "다음 페이지",
            all: "전체"
        }
    };
    var PAGINATION_TEXT_BY_PAGE = {
        first: "«",
        prev: "‹",
        next: "›",
        last: "»"
    };
    var CENTER_TITLE_REGEX = /^(코드|코드그룹|구분|연락처|생년월일|시작일|종료일|기간|투입 가능 시점|사용여부|활성화 여부|당사 여부|여부)$/i;
    var CENTER_FIELD_REGEX = /(^|_)(cd|yn|tel|phone|brdt|birth|st_dt|ed_dt|st_ed_dt|avail_dt)$/i;
    var RIGHT_TITLE_REGEX = /(금액|단가|점수|투입률|비율|건수|수량|정렬순서|합계|총액|가격)/i;
    var RIGHT_FIELD_REGEX = /(amt|amount|rate|score|pct|percent|cnt|count|qty|price|cost|sort_no|sortno|total|sum|_no$)/i;

    // null/undefined 안전 문자열 변환
    function toText(value) {
        return String(value || "").trim();
    }

    // 체크박스/선택 전용 컬럼인지 판별
    function isSelectionColumn(field, title, col) {
        if (field === "checkbox" || field === "_checked" || title === "선택") {
            return true;
        }
        if (!field && !title && (col.download === false || typeof col.cellClick === "function")) {
            return true;
        }
        return false;
    }

    // 제목이 숫자 인덱스형인지 판별(예: 1,2,3)
    function isNumericTitle(title) {
        return /^\d+$/.test(title);
    }

    // formatter 이름으로 숫자형 우측 정렬 후보 판별
    function isRightAlignedByFormatter(col) {
        if (!col || typeof col.formatter !== "function") {
            return false;
        }
        var name = toText(col.formatter.name).toLowerCase();
        return /(amount|percent|percentage|number|money|price)/.test(name);
    }

    // 컬럼 정렬 규칙(선택/날짜/연락처 center, 금액/점수 right, 나머지 left)
    function resolveColumnAlign(col) {
        var field = toText(col.field).toLowerCase();
        var title = toText(col.title);
        var titleLower = title.toLowerCase();

        if (isSelectionColumn(field, title, col)) {
            return "center";
        }
        if (isNumericTitle(title)) {
            return "center";
        }
        if (CENTER_TITLE_REGEX.test(titleLower) || CENTER_FIELD_REGEX.test(field)) {
            return "center";
        }
        if (RIGHT_TITLE_REGEX.test(title) || RIGHT_FIELD_REGEX.test(field) || isRightAlignedByFormatter(col)) {
            return "right";
        }
        return "left";
    }

    function normalizeColumnAlignments(columns) {
        if (!Array.isArray(columns)) {
            return;
        }
        columns.forEach(function (col) {
            if (!col || typeof col !== "object") {
                return;
            }

            if (Array.isArray(col.columns) && col.columns.length) {
                normalizeColumnAlignments(col.columns);
            }

            // 그룹 헤더(자식 컬럼만 보유)는 제외
            if (!col.field && Array.isArray(col.columns) && col.columns.length) {
                return;
            }
            // 컬럼에 명시된 정렬값이 있으면 공통 규칙보다 우선한다.
            var align = toText(col.hozAlign).toLowerCase();
            if (!align) {
                align = resolveColumnAlign(col);
                col.hozAlign = align;
            }
            var alignClass = "hcnc-align-" + align;
            var prevCssClass = toText(col.cssClass);
                                    if (!prevCssClass) {
                                        col.cssClass = alignClass;
            } else if ((" " + prevCssClass + " ").indexOf(" " + alignClass + " ") === -1) {
                col.cssClass = prevCssClass + " " + alignClass;
            }
        });
    }

    // 헤더 정렬은 화면별 커스텀 충돌 방지를 위해 제거
    function clearHeaderAlignments(columns) {
        if (!Array.isArray(columns)) {
            return;
        }
        columns.forEach(function (col) {
            if (!col || typeof col !== "object") {
                return;
            }
            if (Object.prototype.hasOwnProperty.call(col, "headerHozAlign")) {
                delete col.headerHozAlign;
            }
            if (Array.isArray(col.columns) && col.columns.length) {
                clearHeaderAlignments(col.columns);
            }
        });
    }

    function toNumber(value) {  // 숫자 변환 실패시 문자열이면 0으로 변환
        var num = Number(value);
        return Number.isFinite(num) ? num : 0;
    }

    function getGridCount(table) {  // 그리드 공통 페이징/건수 표시
        if (!table) {
            return 0;
        }

        try {
            if (typeof table.getDataCount === "function") {
                var activeCount = toNumber(table.getDataCount("active"));
                if (activeCount > 0) {
                    return activeCount;
                }
                var allCount = toNumber(table.getDataCount());
                if (allCount > 0) {
                    return allCount;
                }
            }
        } catch (e) {
            // noop
        }

        try {
            if (typeof table.getRows === "function") {
                var activeRows = table.getRows("active");
                if (Array.isArray(activeRows) && activeRows.length >= 0) {
                    return activeRows.length;
                }
            }
        } catch (e2) {
            // noop
        }

        try {
            if (typeof table.getData === "function") {
                var data = table.getData();
                return Array.isArray(data) ? data.length : 0;
            }
        } catch (e3) {
            // noop
        }

        return 0;
    }

    function getTableElement(table) {   // Tabulator 루트 DOM 찾기
        if (!table) {
            return null;
        }
        if (typeof table.getElement === "function") {
            return table.getElement();
        }
        return table.element || null;
    }

    function ensureCounterElement(table) {  // 건수 텍스트 span 생성/보장
        if (!table) return null;
        if (table.__hcncGridCounterEl && document.body.contains(table.__hcncGridCounterEl)) {
            return table.__hcncGridCounterEl;
        }
        var tableEl = getTableElement(table);
        if (!tableEl) return null;

        // tableId 기준으로만 counter를 찾음 => 동일한 id를 가진 테이블에서만 해당하는 counter 값 표시
        var counterEl = tableEl.id
            ? document.querySelector("." + COUNTER_CLASS + "[data-grid-for='" + tableEl.id + "']")
            : null;

        if (!counterEl) {
            counterEl = document.createElement("span");
            counterEl.className = COUNTER_CLASS;
            if (tableEl.id) {
                counterEl.setAttribute("data-grid-for", tableEl.id);
            }
        }

        table.__hcncGridCounterEl = counterEl;
        return counterEl;
    }

    // 현재 그리드와 짝이 되는 상단 content-title 블록 탐색
    function findRelatedTitle(tableEl) {
        if (!tableEl) {
            return null;
        }
        var walker = tableEl;
        while (walker && walker !== document.body) {
            var prev = walker.previousElementSibling;
            while (prev) {
                if (prev.classList && prev.classList.contains("content-title")) {
                    return prev;
                }
                prev = prev.previousElementSibling;
            }

            var parent = walker.parentElement;
            if (parent) {
                for (var i = 0; i < parent.children.length; i += 1) {
                    var child = parent.children[i];
                    if (child.classList && child.classList.contains("content-title")) {
                        return child;
                    }
                }
            }
            walker = parent;
        }
        return null;
    }

    // 제목 비교용 공백 제거 텍스트
    function getNormalizedTitleText(titleEl) {
        if (!titleEl) {
            return "";
        }
        var titleNode = titleEl.querySelector("h4") || titleEl;
        return toText(titleNode.textContent).replace(/\s+/g, "");
    }

    // 특정 화면(코드그룹)은 카운터를 타이틀이 아닌 푸터에 유지
    function shouldRenderCounterInTitle(tableEl, titleEl) {
        if (!tableEl || !titleEl) {
            return false;
        }
        if (tableEl.id === "TABLE_COMMON_MAIN") {
            return false;
        }
        var titleText = getNormalizedTitleText(titleEl);
        if (titleText.indexOf("코드그룹") > -1) {
            return false;
        }
        return true;
    }

    // 카운터를 타이틀 영역으로 이동
    function mountCounterToTitle(titleEl, counterEl) {
        if (!titleEl || !counterEl) {
            return;
        }
        var titleNode = titleEl.querySelector("h4") || titleEl;
        if (counterEl.parentElement !== titleNode) {
            titleNode.appendChild(counterEl);
        }
        counterEl.classList.add("hcnc-grid-count-title");
        titleNode.classList.add("hcnc-grid-title-with-count");
    }

    // 카운터를 푸터 영역으로 이동
    function mountCounterToFooter(tableEl, counterEl) {
        if (!tableEl || !counterEl) {
            return false;
        }
        var footerEl = tableEl.querySelector(".tabulator-footer");
        if (!footerEl) {
            return false;
        }
        if (counterEl.parentElement !== footerEl) {
            footerEl.appendChild(counterEl);
        }
        counterEl.classList.remove("hcnc-grid-count-title");
        var titleEl = findRelatedTitle(tableEl);
        if (titleEl) {
            var titleNode = titleEl.querySelector("h4") || titleEl;
            titleNode.classList.remove("hcnc-grid-title-with-count");
        }
        return true;
    }

    function applyResponsiveFooterLayout(table, counterEl) {    // 좁은 화면에서 compact모드 판단
        var tableEl = getTableElement(table);
        if (!tableEl || !counterEl) {
            return;
        }
        var footerEl = tableEl.querySelector(".tabulator-footer");
        var pagesEl = footerEl ? footerEl.querySelector(".tabulator-pages") : null;
        if (!footerEl || !pagesEl) {
            return;
        }

        footerEl.classList.remove(FOOTER_COMPACT_CLASS);

        var footerWidth = footerEl.clientWidth || 0;
        var pagesWidth = pagesEl.offsetWidth || 0;
        var counterWidth = counterEl.offsetWidth || 0;
        var reserved = 56; // 좌/우 여백 + 간격
        var requiredWidth = pagesWidth + counterWidth + reserved;

        if (requiredWidth > footerWidth) {  // 좌/우 여백 + 간격 + 건수 텍스트 + 간격
            footerEl.classList.add(FOOTER_COMPACT_CLASS);
        }
    }

    function enforcePaginatorSymbols(table) {   // 페이징버튼 강제 적용
        var tableEl = getTableElement(table);
        if (!tableEl) {
            return;
        }
        Object.keys(PAGINATION_TEXT_BY_PAGE).forEach(function (pageKey) {
            var btn = tableEl.querySelector(".tabulator-page[data-page='" + pageKey + "']");
            if (!btn) {
                return;
            }
            btn.textContent = PAGINATION_TEXT_BY_PAGE[pageKey];
        });
    }

    // 공통코드관리 메인/상세 그리드는 화면 요구사항에 따라 건수(총 n건)를 표시하지 x
    function shouldHideGridCounter(tableEl) {
        if (!tableEl || !tableEl.id) {
            return false;
        }
        return tableEl.id === "TABLE_COMMON_MAIN" || tableEl.id === "TABLE_COMMON_DETAIL";
    }

    // 이미 생성된 건수 엘리먼트가 남아 있으면 제거해 이후 렌더링에서 다시 나타나지 않게 하고, 화면에서는 제거
    function removeGridCounterElement(table, tableEl) {
        if (!tableEl || !tableEl.id) {
            return;
        }
        var counterEl = table && table.__hcncGridCounterEl
            ? table.__hcncGridCounterEl
            : document.querySelector("." + COUNTER_CLASS + "[data-grid-for='" + tableEl.id + "']");

        if (counterEl && counterEl.parentElement) {
            counterEl.parentElement.removeChild(counterEl);
        }

        if (table) {
            table.__hcncGridCounterEl = null;
        }
    }

    function updateGridCounter(table) { // 건수/아이콘/반응형 한번에 갱신
        var tableEl = getTableElement(table);
        if (!tableEl || tableEl.id !== viewTableId) return; // 현재 보고 있는 id의 테이블 아니면 무시

        // 공통코드 화면(코드그룹/상세코드)은 건수 렌더링과 반응형 푸터 계산을 생략한다.
        if (shouldHideGridCounter(tableEl)) {
            removeGridCounterElement(table, tableEl);
            var footerEl = tableEl.querySelector(".tabulator-footer");
            if (footerEl) {
                footerEl.classList.remove(FOOTER_COMPACT_CLASS);
            }
            return;
        }

        var counterEl = ensureCounterElement(table);
        if (!counterEl) return;

        enforcePaginatorSymbols(table);
        // counterEl.textContent = "총 데이터 수 " + getGridCount(table) + "건";
        var count = getGridCount(table);
        counterEl.innerHTML = '총 <span class="hcnc-grid-count-number">'
                                + count +
                              '</span>건';

        var titleEl = findRelatedTitle(tableEl);
        var inTitle = shouldRenderCounterInTitle(tableEl, titleEl);
        if (inTitle) {
            mountCounterToTitle(titleEl, counterEl);
            var footerForTitle = tableEl.querySelector(".tabulator-footer");
            if (footerForTitle) {
                footerForTitle.classList.remove(FOOTER_COMPACT_CLASS);
            }
            return;
        }

        if (mountCounterToFooter(tableEl, counterEl)) {
            applyResponsiveFooterLayout(table, counterEl);
        }
    }

    function clearGridSelectionOnPageLoaded(table) { // 페이지 이동시 이전 페이지 선택 해제
        if (!table || typeof table.getSelectedRows !== "function" || typeof table.deselectRow !== "function") {
            return;
        }
        var selectedRows = table.getSelectedRows();
        if (!Array.isArray(selectedRows) || selectedRows.length === 0) {
            return;
        }
        table.deselectRow();
    }

    function refreshAllGridCounters() { // 전체 테이블 재계산
        trackedTables = trackedTables.filter(function (table) {
            if (!table) {
                return false;
            }
            var tableEl = getTableElement(table);
            if (!tableEl || !document.body.contains(tableEl)) {
                return false;
            }
            updateGridCounter(table);
            return true;
        });
    }

    function wrapOptionCallback(options, key, afterFn) {    // 기존 콜백 보존하며 후처리 연결
        var original = options[key];
        options[key] = function () {
            if (typeof original === "function") {
                original.apply(this, arguments);
            }
            afterFn(this);
        };
    }

    function withDefaultPaging(options) {   // 옵션에 기본 페이징 주입
        var nextOptions = Object.assign({}, options || {});
        if (Object.prototype.hasOwnProperty.call(nextOptions, "headerHozAlign")) {
            delete nextOptions.headerHozAlign;
        }
        clearHeaderAlignments(nextOptions.columns);
        normalizeColumnAlignments(nextOptions.columns);

        if (nextOptions.pagination === undefined) {
            nextOptions.pagination = "local";
        }

        if (!nextOptions.pagination) {
            return nextOptions;
        }

        if (!nextOptions.paginationSize || Number(nextOptions.paginationSize) <= 0) {
            nextOptions.paginationSize = DEFAULT_PAGE_SIZE;
        }

        if (nextOptions.paginationSizeSelector === undefined) {
            nextOptions.paginationSizeSelector = DEFAULT_PAGE_SIZES.slice();
        }

        if (nextOptions.paginationButtonCount === undefined) {
            nextOptions.paginationButtonCount = 5;
        }

        var sourceLangs = (nextOptions.langs && typeof nextOptions.langs === "object")
            ? nextOptions.langs
            : {};
        nextOptions.langs = Object.assign({}, sourceLangs, {
            "default": Object.assign({}, sourceLangs["default"] || {}, PAGINATION_SYMBOL_LANG),
            "ko-kr": Object.assign({}, sourceLangs["ko-kr"] || {}, PAGINATION_SYMBOL_LANG)
        });
        if (nextOptions.locale === undefined) {
            nextOptions.locale = true;
        }

        wrapOptionCallback(nextOptions, "tableBuilt", updateGridCounter);
        wrapOptionCallback(nextOptions, "dataLoaded", updateGridCounter);
        wrapOptionCallback(nextOptions, "dataFiltered", updateGridCounter);
        wrapOptionCallback(nextOptions, "pageLoaded", function (table) {
            updateGridCounter(table);
            clearGridSelectionOnPageLoaded(table);
        });
        wrapOptionCallback(nextOptions, "renderComplete", updateGridCounter);

        return nextOptions;
    }

    function PatchedTabulator(element, options) {   // Tabulator 생성자 자체를 래핑
        var tableEl = (typeof element === "string") ? document.querySelector(element) : element;
        var tableId = tableEl ? tableEl.id : ""; // 테이블 id 저장

        if (viewTableId && viewTableId !== tableId) {
            console.log("조회 중인 테이블이 바뀌었습니다 : 기존 테이블 => " + viewTableId + ", 새 테이블 => " + tableId);
            return new OriginalTabulator(element, withDefaultPaging(options)); // 그냥 생성만
        }
        var instance = new OriginalTabulator(element, withDefaultPaging(options));
        trackedTables.push(instance);
        viewTableId = tableId;
        return instance;
    }

    Object.getOwnPropertyNames(OriginalTabulator).forEach(function (key) {  // 원본 정적 속성복사 + prototype 유지
        if (["prototype", "length", "name", "arguments", "caller"].indexOf(key) > -1) {
            return;
        }
        try {
            var descriptor = Object.getOwnPropertyDescriptor(OriginalTabulator, key);
            Object.defineProperty(PatchedTabulator, key, descriptor);
        } catch (e) {
            // noop
        }
    });

    PatchedTabulator.prototype = OriginalTabulator.prototype;

    window.Tabulator = PatchedTabulator;    // Tabulator 연결
    window.updateTabulatorGridCount = updateGridCounter;    // 건수 갱신
    window.__HCNC_GRID_PAGER_PATCHED__ = true;  // 패치 완료

    window.addEventListener("resize", function () { // 전체 테이블 재계산
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(refreshAllGridCounters, 80);
    });
})(window);
