/* =========================
 * 공통 코드 조회 (콜백 방식)
 * ========================= */
function getComCode(strGrpCd, strTag, func) {
    $.ajax({
        url: "/common/getCm",
        type: "POST",
        data: {
            grp_cd: strGrpCd,
            tag: strTag
        },
        success: function (data) {
            func(data.res);
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: `'콤보박스' 데이터를 불러오는 중 오류가 발생했습니다.`
            });
            return null;
        }
    });

    return null;
}

/* =========================
 * 공통 코드 조회 + select 바인딩
 * ========================= */
function setComCode(strId, strGrpCd, strTag, id = "cd", name = "cd_nm", done, bTotal = false) {

    $.ajax({
        url: "/common/getCm",
        type: "POST",
        data: {
            grp_cd: strGrpCd,
            tag: strTag
        },
        success: function (data) {
            bindComCode(strId, data.res, bTotal, id, name);
            if (typeof done === "function") {
                done(data.res || []);
            }
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: `'콤보박스' 데이터를 불러오는 중 오류가 발생했습니다.`
            });
        }
    });
}

/* =========================
 * select option 바인딩
 * ========================= */
function bindComCode(strId, jsonData, bTotal, id, name) {
    const select = $("#" + strId)[0];

    if (select != null) {
        // 기존 옵션 제거
        select.innerHTML = "";

        if (bTotal) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "전체";
            select.appendChild(option);
        }

        jsonData.forEach((item) => {
            const option = document.createElement("option");
            option.value = eval("item." + id);
            option.textContent = eval("item." + name);
            select.appendChild(option);
        });
    }
}

/* =========================
 * Tabulator Select2 Multi Editor
 * ========================= */
function select2MultiEditor(cfg){
    cfg = Object.assign({
        data: [],
        placeholder: "입력하여 검색",
        id: "cd",
        value: "cd_nm"
    }, cfg || {});

    return function(cell, onRendered, success, cancel){
        const select = document.createElement("select");
        select.multiple = true;
        select.style.width = "100%";

        cfg.data.forEach(d => {
            const opt = document.createElement("option");
            opt.value = eval("d." + id);
            opt.textContent = eval("d." + value);
            select.appendChild(opt);
        });

        // 초기값
        const initVal = cell.getValue();
        if (Array.isArray(initVal)) {
            initVal.forEach(v => {
                const o = [...select.options].find(x => x.value == v);
                if (o) o.selected = true;
            });
        }

        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            try { if ($(select).data("select2")) $(select).select2("destroy"); } catch(e){}
            $(document).off(".tab_s2");
        };

        onRendered(() => {
            setTimeout(() => {
                $(select).select2({
                    width: "100%",
                    dropdownParent: $(document.body),
                    closeOnSelect: false,
                    placeholder: cfg.placeholder,

                    minimumResultsForSearch: 0, // ★ 검색창 항상 표시
                    minimumInputLength: 0,       // ★ 0글자부터 입력 가능

                    selectOnClose: true, // ★ 핵심: 닫힐 때 하이라이트된 항목 자동 선택
                });

                // 열고, 검색 input 포커스

                $(select).on("select2:open", function () {
                    const searchEl = document.querySelector(".select2-container--open .select2-search__field");
                    if (!searchEl) return;

                    // 이미 붙어있으면 중복 방지
                    if (searchEl.__tabS2Bound) return;
                    searchEl.__tabS2Bound = true;

                    // ★ 캡처 단계로 잡아서 Tabulator가 가로채도 무조건 받기
                    searchEl.addEventListener("keydown", function (e) {
                        // 한글 조합 중 Enter는 막으면 UX 깨짐
                        if (e.isComposing) return;

                        if (e.key === "Enter") {
                            lastKey = "enter";
                            e.preventDefault();
                            e.stopPropagation();

                            // Enter를 "선택" 대신 "닫기"로 바꾸고,
                            // selectOnClose가 하이라이트 항목을 선택하게 함
                            $(select).select2("close");
                        }

                        if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation?.();

                            // ✅ Select2 강제 종료
                            $(select).select2("destroy");

                            // ✅ Tabulator 편집 취소 (여기가 핵심)
                            cancel();

                            return false;
                        }
                    }, true);
                });

                // 값 변경 시 즉시 커밋
                $(select).on("change", () => {
                    const v = $(select).val() || [];
                    cleanup();
                    success(v);
                });

                // ESC 취소
                // $(document).on("keydown.tab_s2", (e) => {
                //     if (e.key === "Escape") {
                //         cleanup();
                //         cancel();
                //     }
                // });

                // 바깥 클릭 시 커밋(원치 않으면 제거)
                setTimeout(() => {
                    $(document).on("mousedown.tab_s2", (e) => {
                        if (!$(e.target).closest(".select2-container").length) {
                            const v = $(select).val() || [];
                            cleanup();
                            success(v);
                        }
                    });
                }, 0);

                let lastKey = null; // enter/esc 구분용
            }, 0);
        });

        return select;
    };
}


function bindEnterSelectFirst(selectEl, {keepOpen = true} = {}) {
    // Select2가 열려 있을 때만 동작하도록 (open 후에 호출 권장)
    const $search = $(".select2-container--open .select2-search__field");

    $search.off("keydown.enterPick").on("keydown.enterPick", function (e) {
        if (e.key !== "Enter") return;

        // IME(한글 조합) 입력 중 Enter는 확정키라서 막으면 안됨
        if (e.isComposing) return;

        // 기본 Enter 동작(폼 submit/닫힘/Tabulator 전파)을 막음
        e.preventDefault();
        e.stopPropagation();

        // 1) 하이라이트된 항목이 있으면 그걸 선택
        let $target = $(".select2-results__option--highlighted[aria-selected='false']");

        // 2) 없으면, 현재 결과의 첫 번째 선택 가능한 항목
        if (!$target.length) {
            $target = $(".select2-results__option[aria-selected='false']:first");
        }
        if (!$target.length) return; // 선택할 게 없으면 종료

        // Select2 내부 id를 가져와서 option을 선택 처리
        const data = $target.data("data");
        if (!data || data.disabled) return;

        // 멀티: 선택 + 입력창 비우기
        const $sel = $(selectEl);
        const cur = $sel.val() || [];
        if (!cur.includes(String(data.id))) {
            cur.push(String(data.id));
            $sel.val(cur).trigger("change"); // Tabulator success는 기존 change 핸들러에서 처리
        }

        // 선택 후 동작
        if (keepOpen) {
            // 계속 입력하도록 다시 열고 포커스 유지
            setTimeout(() => {
                $sel.select2("open");
                $(".select2-container--open .select2-search__field").trigger("focus");
            }, 0);
        } else {
            $sel.select2("close");
        }
    });
}


function attachSelect2KeyCapture(selectEl, { onEnter, onEsc } = {}) {
    // 캡처 단계에서 먼저 받는다
    function handler(e) {
        // Select2 열려 있을 때만
        if (!$(selectEl).data("select2")) return;
        if (!$(".select2-container--open").length) return;

        // 한글 조합 중 Enter는 막으면 UX 깨짐
        if (e.isComposing) return;

        if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            onEsc?.(e);
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            onEnter?.(e);
            return;
        }
    }

    window.addEventListener("keydown", handler, true); // ★ true = capture

    // 해제 함수 반환
    return () => window.removeEventListener("keydown", handler, true);
}


function selectHighlightedOrFirst() {
    let $opt = $(".select2-results__option--highlighted[aria-selected='false']");
    if (!$opt.length) {
        $opt = $(".select2-results__option[aria-selected='false']:first");
    }
    if ($opt.length) {
        $opt.trigger("mouseup"); // click보다 mouseup이 더 잘 먹는 경우 많음
    }
}

/* =========================
 * 태그 에디터 (Tabulator)
 * ========================= */
function tagEditor(cell, onRendered, success, cancel, test) {
    // id 동적 생성용 (타뷸레이터 id)
    let key = cell.getTable().element.id;
    let cdvalue = cell.getRow().getCell("cd")._cell?.value;

    const container = document.createElement("div");
    container.className = "tag-input";

    const div = document.createElement("div");
    div.className = "tag-input-box";

    const ul = document.createElement("ul");
    ul.className = "tag-list";
    ul.id = key + "-" + cdvalue + "-tags";

    const datalist = document.createElement("datalist");
    datalist.id = key + "-" + cdvalue + "-datalist";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "기술 입력/선택 후 Enter";
    input.id = key + "-" + cdvalue + "-input";
    input.setAttribute("list", datalist.id);

    const hid = document.createElement("input");
    hid.type = "hidden";
    hid.id = key + "-" + cdvalue + "-hid";

    div.appendChild(ul);
    div.appendChild(input);
    container.appendChild(div);
    container.appendChild(datalist);
    container.appendChild(hid);

    // 기존 값 로드
    let tags = [...(cell.getValue() || [])];
    let vals = [...(cell.getValue() || [])];

    function render() {
        ul.innerHTML = "";
        tags.forEach(tag => {
            const li = document.createElement("li");
            li.className = "tag-item";
            li.dataset.code = tag.code;
            li.innerHTML = `
        ${tag.label}
        <button type="button" class="tag-remove">x</button>
      `;
            ul.appendChild(li);
        });

        let teamSkillTag = createTagInput({
            inputSelector: "#" + input.id,
            listSelector: "#" + ul.id,
            hiddenSelector: "#" + hid.id,
            datalistSelector: "#" + datalist.id,
            tags: tags,
            getValue: function (item) { return item.cd; },
            getLabel: function (item) { return item.cd_nm; },
            onTagChange: function (updatedTags) {
                try {
                    container.dispatchEvent(new CustomEvent("tagEditor:change", {
                        bubbles: true,  // 이벤트가 상위 요소 전파 설정
                        detail: {   // 이벤트에 실어 보낼 데이터
                            tags: updatedTags || [],
                            field: cell.getField ? cell.getField() : null,  // 어떤 컬럼
                            rowData: cell.getRow ? cell.getRow().getData() : null   // 어떤 행
                        }
                    }));
                } catch (e) {
                    // ignore event errors
                }
            }
        });

        setComCode(null, "skl_id", cell.getData().cd_nm, "cd", "cd_nm", function (res) {
            teamSkillTag.setOptions(res || []);
        });
    }

    onRendered(() => {
        render();
        input.focus();
    });

    // 포커스 아웃 → 값 확정
    container.addEventListener("focusout", (e) => {

        // 다음 포커스 대상이 container 내부라면 무시
        if (container.contains(e.relatedTarget)) {
            return;
        }

        tags = [];
        $(ul.children).each(function () {
            const code = $(this).data("code");     // BE001
            const label = $(this).clone()           // 버튼 제거용
                .children()
                .remove()
                .end()
                .text()
                .trim();               // Java

            tags.push({
                code: code,
                label: label
            });
        });

        success(tags);
    }, true);

    return container;
}

function tagFormatter(cell, formatterParams, onRendered) {
    try {
        const val = cell.getValue();

        // val이 배열이 아닐 수도 있으니 안전 처리
        const tags = Array.isArray(val)
            ? val
            : (typeof val === "string" && val.length ? val.split(",") : []);

        // HTML 이스케이프(태그 값에 < > 들어가면 깨질 수 있음)
        const esc = (s) => String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        return `
      <div class="tag-input-box">
        <ul class="tag-list">
          ${tags.map(t => `<li class="tag-item" data-code="${esc(t.code)}"><span class="tag-text">${esc(t.label)}</span></li>`).join("")}
        </ul>
      </div>
    `;
    } catch (e) {
        console.error("tagFormatter error:", e);
        return ""; // 에러 나도 테이블은 떠야 함
    }
}

// 태그 입력 공통 유틸 (입력 + datalist + 태그 목록 + hidden 동기화)
function createTagInput(config) {
    var $input = $(config.inputSelector);
    var $list = $(config.listSelector);
    var $hidden = $(config.hiddenSelector);
    var $help = config.helpSelector ? $(config.helpSelector) : $list.closest(".tag-input-box").find(".tag-help");
    var $datalist = config.datalistSelector ? $(config.datalistSelector) : null;
    var getValue = config.getValue;
    var getLabel = config.getLabel;
    var matchMode = config.matchMode || "prefix";
    // removable=false면 태그의 개별 x 삭제 버튼을 렌더링하지 않는다.
    var removable = config.removable !== false;
    var onTagChange = config.onTagChange;
    var options = [];
    var map = {};
    var tags = config.tags || [];

    $input.addClass("tag-input-field");

    // 코드/라벨 매핑 생성
    function buildMap() {
        map = {};
        options.forEach(function (item) {
            var key = getValue(item);
            if (key != null) {
                map[String(key)] = getLabel(item) || key;
            }
        });
    }

    // 옵션을 렌더링해서 자동완성 목록 생성
    function renderDatalist() {
        if (!$datalist) return;
        $datalist.empty();

        // 기 등록된 항목에 대해서 list에 출력 안함.
        options.filter(a => !tags.some(b => b.code === a.cd)).forEach(function (item) {
            var label = getLabel(item);
            if (label == null) return;
            var opt = document.createElement("option");
            opt.value = label;
            $datalist.append(opt);
        });
    }

    // hidden 필드랑 태그 동기화
    function syncHidden() {
        var codes = tags.map(function (t) {
            return t.code;
        }).join(",");
        $hidden.val(codes);
    }

    // 태그 리스트 렌더링
    function renderTags() {
        $list.empty();
        tags.forEach(function (tag) {
            var $item = $("<li class=\"tag-item\"></li>");
            $item.attr("data-code", tag.code);
            $item.append(document.createTextNode(tag.label));
            if (removable) {
                var $remove = $("<button type=\"button\" class=\"tag-remove\" aria-label=\"태그 삭제\">x</button>");
                $item.append($remove);
            }
            $list.append($item);
        });
        if ($help && $help.length) {
            $help.toggle(tags.length === 0);
        }
        syncHidden();
        if (typeof onTagChange === "function") {    // 콜백이 있으면 실행준비
            onTagChange(tags.slice());  // 태그 배열의 복사본을 전달
        }
    }

    // 코드로 태그 추가
    function addByCode(code) {
        if (!code) return;
        if (tags.some(function (t) {
            return t.code === code;
        })) return;
        var label = map[code] || code;
        tags.push({code: code, label: label});
        renderTags();
    }

    // 라벨 입력으로 태그 추가
    function addByLabel(raw) {
        var label = $.trim(raw || "");
        if (!label) return;
        var code = null;
        var lowered = label.toLowerCase();
        options.some(function (item) {
            var name = String(getLabel(item) || "");
            if (!name) return false;
            if (name.toLowerCase() === lowered) {
                code = String(getValue(item));
                return true;
            }
            return false;
        });
        if (!code && matchMode === "prefix") {
            options.some(function (item) {
                var name = String(getLabel(item) || "");
                if (!name) return false;
                if (name.toLowerCase().startsWith(lowered)) {
                    code = String(getValue(item));
                    return true;
                }
                return false;
            });
        }
        if (!code) return;
        addByCode(code);
    }

    // 코드로 태그 삭제
    function removeByCode(code) {
        tags = tags.filter(function (t) {
            return t.code !== code;
        });
        renderTags();
    }

    // 저장된 CSV에서 태그 재구성
    function setFromValue(value) {
        tags = [];
        var raw = String(value || "").trim();
        if (!raw) {
            renderTags();
            return;
        }
        raw.split(",").forEach(function (code) {
            var trimmed = $.trim(code);
            if (trimmed) {
                addByCode(trimmed);
            }
        });
    }

    $list.on("mousedown", ".tag-remove", function (e) {
        if (!removable) {
            return;
        }
        e.preventDefault(); // 포커스 이동 차단
        var code = $(this).closest(".tag-item").data("code");
        removeByCode(code);
        renderDatalist();   // list 리로드
    });

    $input.on("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            addByLabel($(this).val());
            $(this).val("").focus();
            renderDatalist();   // list 리로드
        }
    });

    // 외부에서 쓰는 API
    return {
        setOptions: function (list) {
            options = list || [];
            buildMap();
            renderDatalist();
        },
        setFromValue: setFromValue,
        clear: function () {
            setFromValue("");
        },
        addByCode: addByCode,
        addByLabel: addByLabel
    };
}

/* =========================
 * 그룹형 기술 선택 팝업 공통 유틸
 * - 분야/기술 그리드
 * - 검색 자동완성 + 방향키 선택
 * - draft 선택 후 적용 버튼 반영
 * [핵심 흐름]
 * 1) open(context): 원본 선택값을 draftSet으로 복사해서 팝업 편집 시작
 * 2) select/toggle: draftSet만 변경(원본 미변경)
 * 3) apply(): draftSet -> CSV 변환 후 onApply(payload)로 최종 반영
 * 4) close(): draft/context 초기화
 * ========================= */
function createGroupedSkillPicker(config) {
    // cfg: 화면별 selector/callback 주입용 계약 객체
    // - getSelectedCodes(context): 현재 원본 선택값(Set/Array/CSV) 반환
    // - getContextFromOpenEvent(e, el): openTrigger 클릭 시 context 구성
    // - onApply({codes,csv,context}): "적용" 클릭 시 최종 반영 처리
    var cfg = Object.assign({   // 기본 설정 + 외부 설정 병합
        namespace: "default", // 이벤트 네임스페이스 suffix (중복 바인딩 분리용)
        pickerAreaSelector: "", // 팝업 루트 엘리먼트 selector
        openTriggerSelector: "", // 팝업 열기 트리거 selector
        applyTriggerSelector: "", // 적용 버튼 selector
        closeTriggerSelector: "", // 닫기 버튼 selector
        tableSelector: "", // Tabulator를 붙일 selector
        searchInputSelector: "", // 검색 input selector
        searchWrapSelector: "", // 검색영역 wrapper selector (외부 클릭 판별용)
        suggestListSelector: "", // 자동완성 목록 ul selector
        metaSelector: "", // "전체/선택 개수" 출력 selector
        chipClass: "hcnc-skill-chip", // 기술 칩 버튼 class
        chipWrapClass: "hcnc-skill-chip-wrap", // 칩 목록 wrapper class
        flashClass: "is-flash", // 선택된 칩 강조 애니메이션 class
        suggestItemClass: "hcnc-skill-suggest-item", // 자동완성 item class
        tableHeight: "360px", // 기술 테이블 높이
        groupColumnTitle: "분야", // 좌측 그룹 컬럼 title
        skillColumnTitle: "기술", // 우측 기술 컬럼 title
        groupColumnWidth: 170, // 그룹 컬럼 고정 폭
        skillColumnWidthGrow: 3, // 기술 컬럼 widthGrow
        emptyText: "등록된 기술이 없습니다.", // 테이블 빈 상태 문구
        getSkillOptions: function () { return []; }, // 기술 목록 공급자
        getGroupOptions: function () { return []; }, // 그룹 목록 공급자
        getSelectedCodes: function () { return []; }, // 현재 선택 코드 공급자
        getGroupCode: function (skillCode) {    // 기술코드 -> 그룹코드 변환
            var code = String(skillCode || "").trim();
            return code ? code.substring(0, 2).toUpperCase() : "";  // 앞 2자가 그룹코드
        },
        isReadonly: function () { return false; }, // readonly 여부 판단자
        getContextFromOpenEvent: null, // 트리거 클릭 시 context 생성 콜백
        metaTextBuilder: null, // 메타 문구 커스텀 콜백
        onApply: null // 적용 버튼 클릭 시 최종 반영 핸들러
    }, config || {});   // 외부 전달 config로 기본값 덮어쓰기

    var ns = ".hcncSkillPicker_" + cfg.namespace; // 모든 문서 이벤트에 붙일 namespace
    var state = {   // 내부 상태 저장소
        table: null, // Tabulator 인스턴스 (최초 1회 생성)
        tableReady: false, // setData + 렌더 완료 여부
        draftSet: null, //  팝업 내부 임시 상태(취소/닫기 시 폐기, 적용 시에만 원본 반영)
        suggestActiveIndex: -1, // 검색 추천 목록에서 현재 키보드 선택된 항목 index
        eventBound: false, // 이벤트 바인딩 완료 여부
        context: null // context: 어떤 소스(modal/grid row)에서 열렸는지 식별하기 위한 실행 컨텍스트
    };

    function escapeHtml(value) {
        // HTML 문자열 출력 전 escape 해서 XSS/마크업 깨짐 방지
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getSkillOptions() {    // 기술 옵션 조회 래퍼
        // 화면별 콜백이 무엇을 반환하든 최종적으로는 배열만 보장
        var list = cfg.getSkillOptions ? cfg.getSkillOptions() : [];
        return Array.isArray(list) ? list : [];
    }

    function getGroupOptions() {    // 그룹 옵션 조회 래퍼
        // 그룹 목록도 동일하게 배열 형태로 정규화
        var list = cfg.getGroupOptions ? cfg.getGroupOptions() : [];
        return Array.isArray(list) ? list : [];
    }

    function normalizeSet(value) {  // 화면별로 값 형식이 달라도(Set/Array/CSV) 내부 처리는 Set 하나로 통일
        var set = new Set();
        if (!value) {
            return set;
        }
        if (value instanceof Set) { // 이미  Set이면
            value.forEach(function (v) {
                var code = String(v || "").trim();
                if (code) { // 빈값 제외
                    set.add(code);  // Set에 추가
                }
            });
            return set;
        }
        if (Array.isArray(value)) { // 배열이면
            value.forEach(function (v) {
                var code = String(v || "").trim();
                if (code) {
                    set.add(code);
                }
            });
            return set;
        }
        if (typeof value === "string") {    // 문자열(csv)이면
            value.split(",").forEach(function (v) {
                var code = String(v || "").trim();
                if (code) {
                    set.add(code);
                }
            });
        }
        return set;
    }

    function getSelectedSet() { // 현재 선택 Set 가져오기
        // 팝업이 열려 draft 편집 중이면 draft 우선 사용
        if (state.draftSet instanceof Set) {
            return state.draftSet;
        }
        // 아직 팝업을 열지 않은 상태면 실제 원본 데이터에서 현재 선택값을 계산한다.
        return normalizeSet(cfg.getSelectedCodes ? cfg.getSelectedCodes(state.context) : []);
    }

    function ensureCounterMeta() {  // 메타 텍스트 (전체/선택 개수) 갱신
        // metaSelector가 없으면 카운트 텍스트 출력 기능은 스킵
        if (!cfg.metaSelector) {
            return;
        }
        var totalCount = getSkillOptions().length;
        var selectedCount = getSelectedSet().size;
        var text = typeof cfg.metaTextBuilder === "function"
            ? cfg.metaTextBuilder(totalCount, selectedCount)
            : ("전체 기술 " + totalCount + "개 / 선택 " + selectedCount + "개");
        $(cfg.metaSelector).text(text);
    }

    function buildGroupNameMap() {  // 그룹코드 -> 그룹명 맵 생성
        // 자동완성 표시에서 그룹명을 빠르게 찾기 위한 lookup map 생성
        var groupNameMap = {};
        getGroupOptions().forEach(function (group) {
            var groupCode = String(group.cd || "").toUpperCase();
            if (!groupCode) {
                return;
            }
            groupNameMap[groupCode] = group.cd_nm || groupCode;
        });
        return groupNameMap;
    }

    function buildRows() {  // Tabulator 행 데이터 생성
        // 그리드 데이터는 "분야 1행 + 분야별 기술칩 묶음" 구조로 생성한다.
        var groupRows = [];
        var groupMap = {};

        getGroupOptions().forEach(function (group, idx) {
            var groupCode = String(group.cd || "").toUpperCase();
            if (!groupCode) {
                return;
            }
            var row = {
                groupCode: groupCode,
                groupName: group.cd_nm || groupCode,
                sortOrder: idx,
                skills: []
            };
            groupMap[groupCode] = row;
            groupRows.push(row);
        });

        getSkillOptions().forEach(function (skill) {
            var code = String(skill.cd || "");
            if (!code) {
                return;
            }
            var groupCode = cfg.getGroupCode(code); // 기술코드에서 그룹코드 추출
            if (!groupMap[groupCode]) {
                groupMap[groupCode] = {
                    groupCode: groupCode,
                    groupName: groupCode || "기타",
                    sortOrder: 9999,
                    skills: []
                };
                groupRows.push(groupMap[groupCode]);
            }
            groupMap[groupCode].skills.push({   // 해당 그룹에 기술 추가
                code: code,
                label: String(skill.cd_nm || code)
            });
        });

        groupRows.forEach(function (row) {  // 각 그룹의 기술 목록 정렬
            row.skills.sort(function (a, b) {
                return a.label.localeCompare(b.label, "ko");
            });
        });

        return groupRows
            .filter(function (row) { return row.skills.length > 0; })   // 기술 없는 그룹 제외
            .sort(function (a, b) {
                if (a.sortOrder !== b.sortOrder) {  // sortOrder 다르면
                    return a.sortOrder - b.sortOrder;   // sortOrder 우선
                }
                return a.groupName.localeCompare(b.groupName, "ko");    // 이름으로 2차 정렬
            });
    }

    function skillFormatter(cell) { // 기술 칩 컬럼 formatter
        // 각 그룹 행의 기술 목록을 "칩 버튼 묶음" HTML로 렌더링
        var skills = cell.getValue() || [];
        if (!skills.length) {
            return "";
        }
        var selected = getSelectedSet();
        var html = skills.map(function (skill) {
            var code = String(skill.code || "");
            var label = String(skill.label || code);
            var selectedClass = selected.has(code) ? " is-selected" : "";
            return "<button type='button' class='" + cfg.chipClass + selectedClass + "' data-code='" +
                escapeHtml(code) + "'>" + escapeHtml(label) + "</button>";
        }).join("");
        return "<div class='" + cfg.chipWrapClass + "'>" + html + "</div>";
    }

    function buildTableIfNeeded() {
        // Tabulator 인스턴스는 최초 1회만 생성하고 이후 데이터만 교체한다.
        if (state.table || !window.Tabulator || !document.querySelector(cfg.tableSelector)) {
            return;
        }
        state.table = new Tabulator(cfg.tableSelector, {
            layout: "fitColumns",
            height: cfg.tableHeight,
            placeholder: cfg.emptyText,
            headerHozAlign: "center",
            columnDefaults: {
                headerSort: false,
                resizable: false
            },
            columns: [
                { title: cfg.groupColumnTitle, field: "groupName", width: cfg.groupColumnWidth, hozAlign: "left" },
                { title: cfg.skillColumnTitle, field: "skills", hozAlign: "left", formatter: skillFormatter, widthGrow: cfg.skillColumnWidthGrow }
            ],
            data: []
        });
        state.tableReady = false;   // 아직 데이터 sync 전 상태
    }

    function syncChipState() {
        // 재렌더 없이 현재 DOM 칩의 선택 class만 빠르게 동기화
        var selected = getSelectedSet();
        $(cfg.tableSelector + " ." + cfg.chipClass).each(function () {
            var code = String($(this).data("code") || "");
            $(this).toggleClass("is-selected", selected.has(code));
        });
    }

    function sync(forceRebuild) {
        // sync(false): 칩 선택상태만 빠르게 반영
        // sync(true): 행 데이터(setData)까지 재구성
        ensureCounterMeta(); // 메타 텍스트 (전체/선택 개수) 갱신
        if (!state.table) {
            return;
        }
        if (!forceRebuild && state.tableReady) {    // 재빌드 불필요 + 준비완료면
            syncChipState();    // 칩 class만 빠르게 갱신
            return;
        }

        var tableEl = state.table.getElement ? state.table.getElement() : null;
        var holder = tableEl ? tableEl.querySelector(".tabulator-tableHolder") : null;
        var prevTop = holder ? holder.scrollTop : 0;    // 기존 세로 스크롤
        var prevLeft = holder ? holder.scrollLeft : 0;  // 기존 가로 스크롤

        // setData 이후에도 스크롤이 튀지 않도록 이전 위치를 복원한다.
        var afterRender = function () { // setData 이후 즉시 처리
            state.tableReady = true;
            syncChipState();
            var currentEl = state.table.getElement ? state.table.getElement() : null;
            var currentHolder = currentEl ? currentEl.querySelector(".tabulator-tableHolder") : null;
            if (currentHolder) {
                currentHolder.scrollTop = prevTop;
                currentHolder.scrollLeft = prevLeft;
            }
        };

        var setResult = state.table.setData(buildRows()); // 그룹/기술 행 데이터 교체
        if (setResult && typeof setResult.then === "function") {    // Promise 반환이면
            setResult.then(afterRender);    // 비동기 완료 후 후처리
        } else {
            setTimeout(afterRender, 0); // 다음 tick에서 후처리
        }
    }

    function close(immediate) { // immediate=false: 애니메이션 이용
        // immediate=true: 애니메이션 없이 즉시 종료(모달 닫힘/초기화 시 사용)
        var $picker = $(cfg.pickerAreaSelector);    // 팝업 jQuery 객체
        if (!$picker.length) {
            state.draftSet = null;
            state.context = null;
            return;
        }
        $picker.removeClass("show");    // 표시 class 제거(애니 시작)
        $(cfg.suggestListSelector).hide().empty();  // 자동완성 목록 숨김/비움
        state.suggestActiveIndex = -1;  // 자동완성 인덱스 초기화
        if (immediate) {    // 즉시 종료 옵션이면
            state.draftSet = null;
            state.context = null;
            $picker.hide();
            return;
        }
        setTimeout(function () {    // 애니메이션 후 hide
            if (!$picker.hasClass("show")) {
                $picker.hide();
            }
        }, 180);
        state.draftSet = null;
        state.context = null;
    }

    function open(context) {
        // open 시점에 항상 원본 -> draft 복사본을 만든다.
        // 이후 편집은 draft에서만 진행되므로 취소가 안전하다.
        if (cfg.isReadonly && cfg.isReadonly(context)) {    // readonly 모드인 경우 열지 않음
            return;
        }
        state.context = context || null;    // context 저장
        buildTableIfNeeded();   // 테이블 생성
        state.draftSet = normalizeSet(cfg.getSelectedCodes ? cfg.getSelectedCodes(state.context) : []); // draft Set 생성(원본 생성값을 복사)
        sync(true);

        var $picker = $(cfg.pickerAreaSelector);    // 팝업 객체
        $picker.show(); // 먼저 display:block
        setTimeout(function () {
            $picker.addClass("show");
        }, 0);

        $(cfg.searchInputSelector).val(""); // 검색창 초기화
        renderSuggestions("");  // 추천 목록 초기화
        setTimeout(function () {
            $(cfg.searchInputSelector).trigger("focus");    // 검색창 포커스
        }, 40);
    }

    function applySelection() { // 적용버튼 처리 
        // 적용 시점에만 최종 CSV를 만들고 화면별 저장 책임은 onApply 콜백으로 위임
        if (!(state.draftSet instanceof Set)) { // draft 없으면 닫기
            close();
            return;
        }
        var codes = Array.from(state.draftSet); // Set -> Array
        var csv = codes.join(",");  // CSV 만들기
        if (typeof cfg.onApply === "function") {    // 콜백 있으면
            cfg.onApply({   // 화면별 반영 책임 위임
                codes: codes,
                csv: csv,
                context: state.context
            });
        }
        close();
    }

    function focusSkill(code) {
        // 선택 직후 칩을 짧게 강조해 사용자 시선 유도
        setTimeout(function () {
            var $chip = $(cfg.tableSelector + " ." + cfg.chipClass).filter(function () {   // 해당 코드칩 찾기
                return String($(this).data("code") || "") === String(code || "");   // 코드 일치 비교
            }).first();
            if (!$chip.length) {
                return;
            }
            $chip.addClass(cfg.flashClass);
            setTimeout(function () {
                $chip.removeClass(cfg.flashClass);
            }, 450);
        }, 30);
    }

    function selectSkill(code, fromSearch) {    // 기술 강제 선택(추가)
        // 검색 추천에서 선택한 경우(fromSearch=true) 입력/추천 상태를 초기화
        var normalized = String(code || "").trim();
        if (!normalized) {
            return;
        }
        if (!(state.draftSet instanceof Set)) { // draft 비어있으면
            state.draftSet = normalizeSet(cfg.getSelectedCodes ? cfg.getSelectedCodes(state.context) : []); // 원본으로 draft 생성
        }
        state.draftSet.add(normalized); // 선택 Set에 추가
        sync();
        focusSkill(normalized);
        if (fromSearch) {
            $(cfg.searchInputSelector).val("");
            $(cfg.suggestListSelector).hide().empty();
            state.suggestActiveIndex = -1;
        }
    }

    function toggleSkill(code) {    // 기술 선택 토글
        // 칩 클릭 시 선택/해제를 토글 (draftSet만 변경)
        var normalized = String(code || "").trim();
        if (!normalized) {
            return;
        }
        if (!(state.draftSet instanceof Set)) {
            state.draftSet = normalizeSet(cfg.getSelectedCodes ? cfg.getSelectedCodes(state.context) : []);
        }
        if (state.draftSet.has(normalized)) {
            state.draftSet.delete(normalized);
        } else {
            state.draftSet.add(normalized);
        }
        sync();
        focusSkill(normalized);
    }

    function findMatches(keyword, limit) {  // 검색어 매칭 목록 생성
        // 검색 대상: 기술코드(cd) + 기술명(cd_nm)
        var query = String(keyword || "").trim().toLowerCase();
        if (!query) {
            return [];
        }
        var max = limit || 20;
        var groupNameMap = buildGroupNameMap();

        return getSkillOptions()
            .map(function (skill) {
                var code = String(skill.cd || "");
                var label = String(skill.cd_nm || code);
                var groupCode = cfg.getGroupCode(code);
                return {
                    code: code,
                    label: label,
                    groupName: groupNameMap[groupCode] || groupCode || "기타"
                };
            })
            .filter(function (item) {
                return item.code.toLowerCase().indexOf(query) > -1 || item.label.toLowerCase().indexOf(query) > -1;
            })
            .sort(function (a, b) {
                return a.label.localeCompare(b.label, "ko");
            })
            .slice(0, max);
    }

    function renderSuggestions(keyword) {   // 자동완성 목록 렌더
        // 검색어가 있으면 자동완성 목록 생성/표시, 없으면 숨김
        var $suggest = $(cfg.suggestListSelector);
        var query = String(keyword || "").trim();
        if (!query) {
            state.suggestActiveIndex = -1;
            $suggest.hide().empty();
            return;
        }
        var matches = findMatches(query, 20);
        if (!matches.length) {
            state.suggestActiveIndex = -1;
            $suggest.hide().empty();
            return;
        }
        var html = matches.map(function (item) {
            return "<li class='" + cfg.suggestItemClass + "' data-code='" + escapeHtml(item.code) + "'>" +
                "<span class='name'>" + escapeHtml(item.label) + "</span>" +
                "<span class='group'>" + escapeHtml(item.groupName) + "</span>" +
                "</li>";
        }).join("");
        $suggest.html(html).show();
        state.suggestActiveIndex = -1;
        syncSuggestionActive();
    }

    function moveSuggestionSelection(step) {
        // 방향키 이동은 리스트 범위를 벗어나지 않도록 clamp 처리
        var $items = $(cfg.suggestListSelector + " ." + cfg.suggestItemClass);  // 목록 아이템
        if (!$items.length || !$(cfg.suggestListSelector).is(":visible")) { // 목록 없거나 숨김이면 종료
            return;
        }
        var max = $items.length - 1;    // 최대 인덱스
        if (state.suggestActiveIndex < 0) {
            state.suggestActiveIndex = step > 0 ? 0 : max;  // 방향에 따라 처음 / 끝
        } else {
            state.suggestActiveIndex += step;
            if (state.suggestActiveIndex < 0) {
                state.suggestActiveIndex = 0;
            }
            if (state.suggestActiveIndex > max) {
                state.suggestActiveIndex = max;
            }
        }
        syncSuggestionActive();
    }

    function syncSuggestionActive() {
        // suggestActiveIndex 기준으로 is-active 클래스를 1개만 유지
        var $items = $(cfg.suggestListSelector + " ." + cfg.suggestItemClass);
        $items.removeClass("is-active");
        if (!$items.length || state.suggestActiveIndex < 0) {
            return;
        }
        var $active = $items.eq(state.suggestActiveIndex);
        $active.addClass("is-active");
        var container = $(cfg.suggestListSelector).get(0);
        var element = $active.get(0);
        if (container && element && typeof element.scrollIntoView === "function") {
            element.scrollIntoView({ block: "nearest" });
        }
    }

    function getActiveSuggestItem() {
        // Enter 처리용: 현재 키보드로 활성화된 자동완성 항목 반환
        var $items = $(cfg.suggestListSelector + " ." + cfg.suggestItemClass);
        if (!$items.length || state.suggestActiveIndex < 0) {
            return $();
        }
        return $items.eq(state.suggestActiveIndex);
    }

    function bindEvents() {
        if (state.eventBound) {
            return;
        }
        state.eventBound = true;
        // 모든 이벤트는 namespace 기반으로 1회 등록(중복 바인딩/메모리 누수 방지)

        if (cfg.openTriggerSelector) {
            $(document).on("click" + ns, cfg.openTriggerSelector, function (e) {
                e.preventDefault();
                var context = typeof cfg.getContextFromOpenEvent === "function"
                    ? cfg.getContextFromOpenEvent(e, this)
                    : null;
                if (cfg.isReadonly && cfg.isReadonly(context)) {
                    return;
                }
                open(context);
            });
        }

        if (cfg.applyTriggerSelector) {
            // "적용" 클릭 시 draftSet을 onApply로 넘기고 닫기
            $(document).on("click" + ns, cfg.applyTriggerSelector, function (e) {
                e.preventDefault();
                applySelection();
            });
        }

        if (cfg.closeTriggerSelector) {
            // "닫기" 클릭 시 draft 폐기하고 팝업 종료
            $(document).on("click" + ns, cfg.closeTriggerSelector, function (e) {
                e.preventDefault();
                close();
            });
        }

        $(document).on("click" + ns, cfg.pickerAreaSelector, function (e) {
            // 팝업 내부가 아닌 배경 클릭 시 닫기
            if (e.target === this) {
                close();
            }
        });

        $(document).on("click" + ns, cfg.tableSelector + " ." + cfg.chipClass, function (e) {
            // 기술 칩 클릭 시 선택 토글
            e.preventDefault();
            var code = String($(this).data("code") || "");
            if (!code) {
                return;
            }
            toggleSkill(code);
        });

        $(document).on("input" + ns, cfg.searchInputSelector, function () {
            // 검색어 입력마다 자동완성 목록 재생성
            renderSuggestions($(this).val());
        });

        $(document).on("keydown" + ns, cfg.searchInputSelector, function (e) {
            // 검색 input 키보드 UX:
            // ArrowUp/Down 이동, Enter 선택, Escape 닫기
            if (e.key === "ArrowDown") {    // 아래 화살표
                e.preventDefault();
                moveSuggestionSelection(1); // 다음 항목 이동
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                moveSuggestionSelection(-1);    // 이전 항목 이동
            } else if (e.key === "Enter") {
                e.preventDefault();
                var $active = getActiveSuggestItem();
                if ($active.length) {
                    selectSkill(String($active.data("code") || ""), true);
                    return;
                }
                var $first = $(cfg.suggestListSelector + " ." + cfg.suggestItemClass).first();
                if ($first.length) {
                    selectSkill(String($first.data("code") || ""), true);
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                close();
            }
        });

        $(document).on("click" + ns, cfg.suggestListSelector + " ." + cfg.suggestItemClass, function (e) {
            // 자동완성 클릭 선택
            e.preventDefault();
            var code = String($(this).data("code") || "");
            if (!code) {
                return;
            }
            selectSkill(code, true);
        });

        $(document).on("mouseenter" + ns, cfg.suggestListSelector + " ." + cfg.suggestItemClass, function () {
            // 마우스 hover 시 키보드 활성 인덱스도 동기화
            var $items = $(cfg.suggestListSelector + " ." + cfg.suggestItemClass);
            state.suggestActiveIndex = $items.index(this);
            syncSuggestionActive();
        });

        $(document).on("mousedown" + ns, function (e) { // 문서 전체 mousedown
            // 검색 영역 밖 클릭 시 자동완성 목록만 닫기
            if (!cfg.searchWrapSelector || !$(e.target).closest(cfg.searchWrapSelector).length) {
                $(cfg.suggestListSelector).hide();
            }
        });
    }

    return {    // 외부에 노출할 api
        bindEvents: bindEvents, // 문서 이벤트 1회 바인딩
        open: open, // 팝업 열기 (원본 -> draft 복사)
        close: close, // 팝업 닫기 (draft 폐기)
        apply: applySelection, // draft를 onApply로 반영
        sync: sync, // 테이블/칩/메타 상태 동기화
        getSelectedSet: getSelectedSet, // 현재 선택 Set 조회
        escapeHtml: escapeHtml // 외부 재사용 가능한 escape 유틸
    };
}

/* =========================
 * 공통 Swal 토스트(toast) 함수
 * ========================= */
function showAlert({
    icon = 'info',
    title = '',
    text = '',
    confirmText = '확인',
    showCancelButton = false,
    cancelText = '취소',
    cancelButtonColor = '#212E41'
} = {}) {
    return Swal.fire({
        icon,
        title,
        text,

        // showClass: { popup: '', backdrop: '' },
        // hideClass: { popup: '', backdrop: '' },
        backdrop: true,
        allowOutsideClick: false,

        showCancelButton,
        confirmButtonText: confirmText,
        confirmButtonColor: icon === 'error' ? '#212E41' : '#E50019',
        cancelButtonText: cancelText,
        cancelButtonColor,

        customClass: {
            popup: 'swal2-radius',
            confirmButton: 'swal2-btn-radius',
            cancelButton: 'swal2-btn-radius'
        },

        scrollbarPadding: false
    });
}

/* =========================
 * 로딩바 표시 / 숨김
 * ========================= */
function showLoading() {
    const $overlay = $("#loading-overlay");
    const $text = $overlay.find("p");

    if (typeof isSaving !== "undefined" && isSaving) {
        $text.text("저장 중입니다...");
    } else {
        $text.text("로딩 중입니다...");
    }
    $overlay.addClass("active");
}
function hideLoading() {
    $("#loading-overlay").removeClass("active");
}
