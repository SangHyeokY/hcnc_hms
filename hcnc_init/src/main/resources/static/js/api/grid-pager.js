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
        var tableEl = getTableElement(table);
        if (!tableEl) {
            return null;
        }
        var footerEl = tableEl.querySelector(".tabulator-footer");
        if (!footerEl) {
            return null;
        }

        var counterEl = footerEl.querySelector("." + COUNTER_CLASS);
        if (counterEl) {
            if (counterEl.parentElement !== footerEl) {
                footerEl.appendChild(counterEl);
            }
            return counterEl;
        }

        counterEl = document.createElement("span");
        counterEl.className = COUNTER_CLASS;
        footerEl.appendChild(counterEl);

        return counterEl;
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

    function updateGridCounter(table) { // 건수/아이콘/반응형 한번에 갱신
        var counterEl = ensureCounterElement(table);
        if (!counterEl) {
            return;
        }
        enforcePaginatorSymbols(table);
        counterEl.textContent = "총 데이터 수 " + getGridCount(table) + "건";
        applyResponsiveFooterLayout(table, counterEl);
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
        wrapOptionCallback(nextOptions, "pageLoaded", updateGridCounter);
        wrapOptionCallback(nextOptions, "renderComplete", updateGridCounter);

        return nextOptions;
    }

    function PatchedTabulator(element, options) {   // Tabulator 생성자 자체를 래핑
        var instance = new OriginalTabulator(element, withDefaultPaging(options));
        trackedTables.push(instance);
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
