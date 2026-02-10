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
            alert("콤보박스 데이터를 불러오는 중 오류가 발생했습니다.");
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
            alert("콤보박스 데이터를 불러오는 중 오류가 발생했습니다.");
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
            var $remove = $("<button type=\"button\" class=\"tag-remove\" aria-label=\"태그 삭제\">x</button>");
            $item.append($remove);
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
 * 공통 Swal 토스트(toast) 함수
 * ========================= */
function showAlert({ icon = 'info', title = '', text = '', confirmText = '확인' } = {}) {
    return Swal.fire({
        icon: icon,
        title: title,
        text: text,
        showClass: { popup: '', backdrop: '' },
        hideClass: { popup: '', backdrop: '' },
        backdrop: true,
        allowOutsideClick: false,
        confirmButtonText: confirmText,
        confirmButtonColor: icon === 'error' ? '#d33' : '#3085d6',
//        showCancelButton: icon === 'warning', // 경고일 때만 취소 버튼
//        cancelButtonText: '취소',
//        cancelButtonColor: '#aaa',
        scrollbarPadding: false
    });
}

/* =========================
 * 로딩바 표시 / 숨김
 * ========================= */
function showLoading() {
    const $overlay = $("#loading-overlay");
    const $text = $overlay.find("p");
    if (isSaving){
        $text.text("저장 중입니다...");
    } else {
        $text.text("로딩 중입니다...");
    }
    $overlay.addClass("active");
}
function hideLoading() {
    $("#loading-overlay").removeClass("active");
}
