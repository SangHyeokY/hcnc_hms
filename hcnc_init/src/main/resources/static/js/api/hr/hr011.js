// 사용자 관리 - 소속 및 계약 정보 hr011.js (hcnc_hms)

// view일 때는 수정 불가, update일 때는 수정 가능
$(document).on("tab:readonly.hr011", function (_, isReadOnly) {
    if (isReadOnly) {
        window.hr011EditUnlocked = false;
        setHr011Mode("view", { silent: true });
        return;
    }
    setHr011Mode(window.hr011EditUnlocked ? "update" : "view", { silent: true });
});

// mode 초기값 : view, 테이블 데이터 초기값 : null
let hr011Mode = "view";
window.hr011Data = null;
window.hr011EditUnlocked = false;

// const HR011_FIELDS = "#org_nm, #select_biz_typ, #st_dt, #ed_dt, #amt, #remark"; // 데이터 담을 상수

// 사업자 유형 공통코드
var bizTypMap = [];
var bizTypOptions = [];

// ============================================================================== //

// Tab1 초기값 설정
window.initTab1 = function () {
  return new Promise((resolve) => {

      setComCode("select_biz_typ", "BIZ_TYP", "", "cd", "cd_nm", async function () {

          bizTypOptions = $("#select_biz_typ option").map(function () {
              return { cd: this.value, cd_nm: $(this).text() };
          }).get();

          initSelectDefault("select_biz_typ", "개인/개인사업자/법인");
          bizTypMap = getBizTypMap();

          // AJAX 끝날 때까지 기다림
          await loadHr011TableData(window.currentDevId);

          resolve();
      });
  });
};

// 역할 코드 -> 라벨 맵 생성 (사업자 유형 : 개인/개인사업자/법인)
function getBizTypMap() {
    var map = {};
    if (bizTypOptions && bizTypOptions.length) {
        bizTypOptions.forEach(function (item) {
            if (item.cd) {
                map[item.cd] = item.cd_nm || item.cd;
            }
        });
        return map;
    }
    $("#select_biz_typ option").each(function () {
        var val = this.value;
        if (val) {
            map[val] = $(this).text();
        }
    });
    return map;
}

// 콤보 기본 옵션, 선택 처리
function initSelectDefault(selectId, placeholderText) {
    var $sel = $("#" + selectId);
    if ($sel.find("option[value='']").length === 0) {
        $sel.prepend("<option value=''>" + placeholderText + "</option>");
    }
    $sel.val("");
    if (!$sel.val()) {
        $sel.find("option:first").prop("selected", true);
    }
}

// 역할 값이 객체로 와도 문자열로 정규화
function normalizeJobValue(value) {
    if (value == null) {
        return "";
    }
    if (typeof value === "object") {
        var current = value;
        var guard = 0;
        while (current && typeof current === "object" && guard < 4) {
            var candidate = current.cd || current.value || current.label || current.cd_nm || current.name || current.nm || current.id;
            if (candidate && typeof candidate !== "object") {
                return String(candidate);
            }
            if (candidate && typeof candidate === "object") {
                current = candidate;
                guard += 1;
                continue;
            }
            break;
        }
        return "";
    }
    return String(value);
}

// ============================================================================== //

// 모드 제어 함수
function setHr011Mode(mode, options) {
    const silent = !!(options && options.silent);
    if ($(".hr011-page").length && mode !== "view" && !window.hr011EditUnlocked) {
        mode = "view";
    }
    hr011Mode = mode;
    const isView = mode === "view"; // view일 때는 수정불가능
    const isEditable = !isView && (mode === "insert" || mode === "update"); // insert와 update는 수정가능
    window.currentMode = mode;
    window.hr010ReadOnly = !isEditable;
    if (isView) {
        window.hr011EditUnlocked = false;
    }
    $(".hr011-page").toggleClass("is-view-mode", isView).toggleClass("is-edit-mode", isEditable);
    $("#hr011PageTitleText").text(isView ? "인적사항 상세" : "인적사항 수정");
    $("#modal-title").text(isView ? "상세" : mode === "insert" ? "등록" : "수정");
    $("#hr011EditBtn").toggle(isView);
    $("#hr011CancelBtn").toggle(!isView);
    $("#hr011SaveBtn").prop("hidden", isView).toggle(!isView);

    const readOnlySelectors = [
        "#dev_nm",
        "#select_dev_typ",
        "#brdt",
        "#tel",
        "#email",
        "#region",
        "#avail_dt",
        "#select_work_md",
        "#select_ctrt_typ",
        "#select_kosa_grd_cd",
        "#select_main_fld_cd",
        "#select_main_cust_cd",
        "#exp_yr",
        "#hope_rate_amt",
        "#edu_last",
        "#cert_txt",
        "#org_nm",
        "#select_biz_typ",
        "#st_dt",
        "#ed_dt",
        "#remark"
    ];

    readOnlySelectors.forEach(function (selector) {
        var $field = $(selector);
        if ($field.length === 0) {
            return;
        }
        if ($field.is("select")) {
            $field.prop("disabled", !isEditable).toggleClass("is-readonly", !isEditable);
        } else {
            $field.prop("readonly", !isEditable).toggleClass("is-readonly", !isEditable);
        }
    });

    // 직원/프리랜서 구분은 상세에서 수정하지 못하도록 항상 고정한다.
    $("#select_dev_typ")
        .prop("disabled", true)
        .addClass("is-readonly is-fixed-field");

    $("#main_lang_display").prop("readonly", true).addClass("is-readonly");

    if (!isEditable) {
        $("#amt").prop("readonly", true).addClass("is-readonly");
    } else {
        $("#amt").prop("readonly", false).removeClass("is-readonly");
    }

    if (!silent) {
        $(document).trigger("tab:readonly", [!isEditable]);
    }

    scheduleHr011ReadOnlyTextareas();
    scheduleHr011ReadOnlyFields();
    scheduleHr011LegacyReadonlyTable();

//    if (isEditable) { // insert, update mode일 때
//        $fields
//            .prop("disabled", false)
//            .prop("readonly", false)
//            .removeAttr("disabled")
//            .removeAttr("readonly")
//            .removeClass("is-readonly");
//    } else { // view mode일 때
//        $fields
//            .prop("disabled", true)
//            .prop("readonly", true)
//            .addClass("is-readonly");
//    }
}

// Tab1 조회할 시, 데이터 표시
function openHr011(mode) {
    // 수정 mode
    if (mode === "update") {
        if (!window.hr011Data) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                html: `<strong>소속 및 계약정보</strong>&nbsp;데이터가 존재하지 않습니다.`
            });
            return;
        }
        window.hr011EditUnlocked = true;
        setHr011Mode("update");
        return;
    }

    // 신규 등록(insert) 시 최초 입력을 위한 초기화
    if (mode === "insert") {
        clearHr011Form();
        window.hr011Data = null;
        window.hr011EditUnlocked = true;
        setHr011Mode("insert");
        return;
    }

    // 해당 조건이 모두 아니라면 view mode
    setHr011Mode("view");
}

// Tab1에 데이터 채워넣기
function fillHr011Form(data) {
    $("#org_nm").val(data.org_nm || "");
    $("#st_dt").val(data.st_dt || "");
    $("#ed_dt").val(data.ed_dt || "");
    $("#remark").val(data.remark || "");
    $("#amt").val(formatAmount(data.amt));
    if ($("#select_biz_typ option").length > 0) {
        $("#select_biz_typ").val(data.biz_typ || "");
    }
    scheduleHr011LegacyReadonlyTable();
}

// Tab1의 데이터 초기화
function clearHr011Form() {
    $("#org_nm, #select_biz_typ, #st_dt, #ed_dt, #remark").val("");
    $("#amt").val("0원");
}

// Tab1에 '소속 및 계약정보' 테이블 불러오기
function loadHr011TableData(devId) {
    return new Promise((resolve) => {

        if (!devId) {
            clearHr011Form();
            setHr011Mode("insert");
            resolve();
            return;
        }

        $.ajax({
            url: "/hr011/tab1",
            type: "GET",
            data: { dev_id: devId },
            success: (res) => {
                const data = res?.res ?? null;
                window.hr011Data = data;

                clearHr011Form();

                if (data) {
                    fillHr011Form(data);
                }

                resolve();
            },
            error: () => {
                console.log("데이터 조회 실패");
                clearHr011Form();
                setHr011Mode("insert");
                resolve(); // 에러여도 resolve
            }
        });
    });
}

// '소속 및 계약정보' 테이블 데이터 수정, 저장
function saveHr011TableData() {
    // if (!validateHr011Form()) return; // hr010.js로 이관

    const param = {
        ctrtId: hr011Mode === "update" ? window.hr011Data?.ctrt_id : null,
        devId: window.currentDevId,
        orgNm: $("#org_nm").val(),
        bizTyp: $("#select_biz_typ").val(),
        stDt: $("#st_dt").val(),
        edDt: $("#ed_dt").val(),
        amt: normalizeAmountValue($("#amt").val()),
        remark: $("#remark").val()
    };

    return $.ajax({
        url: "/hr011/tab1_upsert",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(param),
        success: () => {
            // alert("저장되었습니다.");
            // setHr011Mode("view");
            loadHr011TableData(window.currentDevId);
        },
        error: () => showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                         icon: 'error',
                         title: '오류',
                         html: `<strong>소속 및 계약정보</strong>&nbsp;저장 중 오류가 발생했습니다.`
                     })
    });
}

// Tab1 데이터 삭제 (미사용 중)
async function deleteHr011() {
    if (!window.hr011Data?.ctrt_id) {
        await showAlert({
            icon: 'error',
            title: '오류',
            html: `<strong>소속 및 계약정보</strong>&nbsp;데이터가 존재하지 않습니다.`
        });
        return;
    }

    const result = await showAlert({
        icon: 'warning',
        title: '경고',
        text: '정말로 삭제하시겠습니까?',
        showCancelButton: true,
        cancelButtonText: '취소',
        cancelButtonColor: '#212E41'
    });

    if (!result.isConfirmed) return;

    $.ajax({
        url: "/hr011/tab1_delete",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            ctrtId: window.hr011Data.ctrt_id,
            devId: window.currentDevId
        }),
        success: () => {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'success',
                title: '완료',
                html: `<strong>소속 및 계약정보</strong>&nbsp;데이터가 삭제되었습니다.`
            });
            loadHr011TableData(window.currentDevId);
        },
        error: () => showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                                 icon: 'error',
                                 title: '오류',
                                 html: `<strong>소속 및 계약정보</strong>&nbsp;데이터를 삭제하는 중 오류가 발생했습니다.`
                             })
    });
}

// ============================================================================== //

// 유효성 검사
function validateHr011Form() {

    // 값 가져오기
    const orgNm   = $("#org_nm").val().trim();         // 소속사
    const stDt    = $("#st_dt").val();                 // 계약 시작일
    const edDt    = $("#ed_dt").val();                 // 계약 종료일
    const bizTyp  = $("#select_biz_typ").val().trim(); // 사업자 유형
    const amtRaw  = normalizeAmountValue($("#amt").val());   // 계약 금액

    // 최대 입력 가능 숫자
    const MAX_AMT = 999999999;

    if (!orgNm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>소속사</strong>을(를) 입력해주세요.`
        });
        $("#org_nm").focus();
        return false;
    }

    if (!stDt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>계약시작일</strong>을(를) 입력해주세요.`
        });
        $("#st_dt").focus();
        return false;
    }

    if (!edDt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>계약종료일</strong>을(를) 입력해주세요.`
        });
        $("#ed_dt").focus();
        return false;
    }

    if (new Date(stDt) > new Date(edDt)) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>계약종료일</strong>은(는)&nbsp;<strong>계약시작일</strong>&nbsp;이후여야 합니다.`
        });
        $("#ed_dt").focus();
        return false;
    }

    if (!bizTyp || bizTyp == null) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>사업자유형</strong>을(를) 선택해주세요.`
        });
        $("#select_biz_typ").focus();
        return false;
    }

    if (!amtRaw) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>계약금액</strong>을(를) 입력해주세요.`
        });
        $("#amt").focus();
        return false;
    }

    if (isNaN(amtRaw) || Number(amtRaw) <= 0) {
         showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>계약금액</strong>은(는) 0보다 큰 숫자여야 합니다.`
        });
        $("#amt").focus();
        return false;
    }

    if (Number(amtRaw) > MAX_AMT) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>계약금액</strong>은(는) 최대 999,999,999원까지 입력 가능합니다.`
        });
        $("#amt").focus();
        return false;
    }

    return true;
}

// ============================================================================== //

// 숫자에 콤마
function formatNumber(num) {
    if (!num) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 숫자만 입력
$("#amt")
    .on("input", function () {
        const raw = this.value || "";
        const caret = Number.isFinite(this.selectionStart) ? this.selectionStart : raw.length;
        const digitsBeforeCaret = countAmountDigitsBeforeCaret(raw, caret);
        const inputNumber = normalizeAmountValue(raw);
        const formatted = formatAmount(inputNumber);
        this.value = formatted;
        setAmountCaretByDigitIndex(this, digitsBeforeCaret);
    })
    .on("focus", function () {
        moveAmountCaretToEditableEnd(this);
    })
    .on("click", function () {
        const input = this;
        setTimeout(function () {
            clampAmountCaretToEditableRange(input);
        }, 0);
    })
    .on("keydown", function (e) {
        const value = this.value || "";
        const suffixIndex = getAmountEditableEndIndex(value);
        const start = Number.isFinite(this.selectionStart) ? this.selectionStart : suffixIndex;
        const end = Number.isFinite(this.selectionEnd) ? this.selectionEnd : suffixIndex;

        if ((e.key === "ArrowRight" || e.key === "End") && start >= suffixIndex && end >= suffixIndex) {
            e.preventDefault();
            this.setSelectionRange(suffixIndex, suffixIndex);
            return;
        }

        if (e.key === "Backspace" && start === end && start > suffixIndex) {
            e.preventDefault();
            this.setSelectionRange(suffixIndex, suffixIndex);
            return;
        }

        if (e.key === "Delete" && start === end && start >= suffixIndex) {
            e.preventDefault();
            return;
        }
    });

// 문자열 가공
function normalizeAmountValue(str) {
    return str ? str.replace(/,/g, "") : "";
}

function formatAmount(num) {
    if (!num) return "0원";
    return formatNumber(num) + "원";
}

// caret 위치 계산: 숫자 기준
function countAmountDigitsBeforeCaret(value, caret) {
    let count = 0;
    for (let i = 0; i < caret; i++) {
        if (/\d/.test(value[i])) count++;
    }
    return count;
}

// caret 위치 재설정
function setAmountCaretByDigitIndex(input, digitIndex) {
    const value = input.value || "";
    let digitsSeen = 0;
    let pos = 0;
    while (pos < value.length && digitsSeen < digitIndex) {
        if (/\d/.test(value[pos])) digitsSeen++;
        pos++;
    }
    input.setSelectionRange(pos, pos);
}

// caret를 항상 "원" 앞 끝으로 이동
function moveAmountCaretToEditableEnd(input) {
    const suffixIndex = getAmountEditableEndIndex(input.value);
    input.setSelectionRange(suffixIndex, suffixIndex);
}

// "원" 바로 뒤로 커서 못 가게 제한
function clampAmountCaretToEditableRange(input) {
    const suffixIndex = getAmountEditableEndIndex(input.value);
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (start > suffixIndex || end > suffixIndex) {
        input.setSelectionRange(suffixIndex, suffixIndex);
    }
}

// editable 끝 인덱스 계산
function getAmountEditableEndIndex(value) {
    return value ? value.length - (value.endsWith("원") ? 1 : 0) : 0;
}

// 상세 페이지 공통 상태를 초기화한다.
window.currentMode = "view";
window.hr010ReadOnly = true;
window.changedTabs = window.changedTabs || { tab2: false, tab3: false, tab4: false };

const hr011MainSelectMaps = {
    devTyp: {},
    workMd: {},
    ctrtTyp: {},
    kosa: {},
    mainFld: {},
    mainCust: {}
};

let hr011CurrentRow = null;
let hr011SummarySkillRows = [];
let hr011SummaryRadarRows = [];
let hr011SummaryRadarProjectCount = 0;
let hr011SummaryRadarChart = null;
let hr011SummaryRadarResizeBound = false;

function syncHr011ReadOnlyTextareas() {
    const isViewMode = $(".hr011-page").hasClass("is-view-mode");
    const selectors = ["#cert_txt", "#remark", "#HR014_RISK_TEXT"];

    selectors.forEach(function (selector) {
        const el = document.querySelector(selector);
        if (!el) {
            return;
        }

        el.style.overflow = isViewMode ? "hidden" : "";
        el.style.resize = isViewMode ? "none" : "";
        el.style.height = "";

        if (isViewMode) {
            el.style.height = Math.max((el.scrollHeight || 0) + 8, 56) + "px";
        }
    });
}

// 상세 보기에서는 입력 컨트롤을 숨기고 텍스트만 보여준다.
function syncHr011ReadOnlyFields() {
    const isViewMode = $(".hr011-page").hasClass("is-view-mode");

    $(".hr011-field-card").not(".hr011-field-card--readonly").each(function () {
        const $card = $(this);
        const $control = $card.find("input, select, textarea").first();
        if (!$control.length) {
            return;
        }

        let $display = $card.children(".hr011-field-readonly-value");
        if ($display.length === 0) {
            $display = $(`
                <div class="hr011-field-readonly-value" aria-hidden="true">
                    <span class="hr011-field-readonly-value__text"></span>
                </div>
            `);
            $card.append($display);
        }

        const value = normalizeHr011ReadonlyFieldValue($control);
        $display.find(".hr011-field-readonly-value__text").text(value || "-");
        $display.toggle(isViewMode);
        $control.toggle(!isViewMode);
    });
}

function syncHr011LegacyReadonlyTable() {
    const isViewMode = $(".hr011-page").hasClass("is-view-mode");
    const $table = $("#TABLE_HR011_A");
    if ($table.length === 0) {
        return;
    }

    $table.find("td").each(function () {
        const $cell = $(this);
        const $control = $cell.find("input, select, textarea").first();
        if (!$control.length) {
            return;
        }

        let $display = $cell.children(".hr011-legacy-readonly-value");
        if ($display.length === 0) {
            $display = $(`
                <div class="hr011-legacy-readonly-value" aria-hidden="true">
                    <span class="hr011-legacy-readonly-value__text"></span>
                </div>
            `);
            $cell.append($display);
        }

        const value = normalizeHr011ReadonlyFieldValue($control);
        $display.find(".hr011-legacy-readonly-value__text").text(value || "-");
        $display.toggle(isViewMode);
        $control.toggle(!isViewMode);
    });
}

function normalizeHr011ReadonlyFieldValue($control) {
    if (!$control || !$control.length) {
        return "";
    }

    if ($control.is("select")) {
        const value = $.trim($control.val() || "");
        if (!value) {
            return "";
        }
        return $.trim($control.find("option:selected").text() || value);
    }

    return $.trim($control.val() || "");
}

function scheduleHr011ReadOnlyTextareas() {
    if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(syncHr011ReadOnlyTextareas);
        return;
    }
    setTimeout(syncHr011ReadOnlyTextareas, 0);
}

window.hr011SyncReadOnlyTextareas = scheduleHr011ReadOnlyTextareas;

function scheduleHr011ReadOnlyFields() {
    if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(syncHr011ReadOnlyFields);
        return;
    }
    setTimeout(syncHr011ReadOnlyFields, 0);
}

function scheduleHr011LegacyReadonlyTable() {
    if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(syncHr011LegacyReadonlyTable);
        return;
    }
    setTimeout(syncHr011LegacyReadonlyTable, 0);
}

// hr011 상세 페이지를 초기화한다.
$(document).ready(async function () {
    if (!$(".hr011-page").length) {
        return;
    }

    bindHr011PageEvents();
    $("#write_user_id").val($.trim($(".header-user__id, .header-user__meta-id").first().text() || ""));

    try {
        showLoading();
        await initHr011DetailPage();
    } finally {
        hideLoading();
    }
});

// 상세 페이지 버튼 동작을 묶는다.
function bindHr011PageEvents() {
    $("#hr011BackBtn").on("click", function () {
        window.location.href = "/hr010";
    });

    $("#hr011EditBtn").on("click", async function () {
        const result = await showAlert({
            icon: "question",
            title: "수정 모드 진입",
            text: "수정 모드로 들어가시겠습니까?",
            confirmText: "진입",
            showCancelButton: true,
            cancelText: "취소"
        });
        if (!result.isConfirmed) return;
        window.hr011EditUnlocked = true;
        setHr011Mode("update");
    });

    $("#hr011CancelBtn").on("click", async function () {
        const result = await showAlert({
            icon: "question",
            title: "수정 취소",
            text: "수정을 취소하고 상세 모드로 돌아가시겠습니까?",
            confirmText: "취소하기",
            showCancelButton: true,
            cancelText: "계속 수정"
        });
        if (!result.isConfirmed) return;
        const devId = window.currentDevId || getHr011TargetDevId();
        if (!devId) {
            window.location.href = "/hr010";
            return;
        }
        window.location.href = "/hr011?dev_id=" + encodeURIComponent(devId);
    });

    $("#hr011SaveBtn").on("click", async function () {
        const result = await showAlert({
            icon: "question",
            title: "저장 확인",
            text: "수정 내용을 저장하시겠습니까?",
            confirmText: "저장",
            showCancelButton: true,
            cancelText: "취소"
        });
        if (!result.isConfirmed) return;
        await saveHr011DetailPage();
    });

    $("#hope_rate_amt")
        .on("input", function () {
            const raw = this.value || "";
            const caret = Number.isFinite(this.selectionStart) ? this.selectionStart : raw.length;
            const digitsBeforeCaret = countAmountDigitsBeforeCaret(raw, caret);
            const inputNumber = normalizeAmountValue(raw);
            const formatted = formatAmount(inputNumber);
            this.value = formatted;
            setAmountCaretByDigitIndex(this, digitsBeforeCaret);
        })
        .on("focus", function () {
            moveAmountCaretToEditableEnd(this);
        })
        .on("click", function () {
            const input = this;
            setTimeout(function () {
                clampAmountCaretToEditableRange(input);
            }, 0);
        });
}

// 상세 페이지의 메인 정보와 하위 섹션을 함께 초기화한다.
async function initHr011DetailPage() {
    const devId = getHr011TargetDevId();
    if (!devId) {
        await showAlert({ icon: "warning", title: "안내", text: "선택된 인력 정보가 없습니다." });
        window.location.href = "/hr010";
        return;
    }

    window.currentDevId = devId;
    $("#dev_id").val(devId);
    window.hr011EditUnlocked = false;
    setHr011Mode("view", { silent: true });

    await Promise.all([
        loadHr011MainSelect("select_dev_typ", "DEV_TYP", hr011MainSelectMaps.devTyp),
        loadHr011MainSelect("select_work_md", "WORK_MD", hr011MainSelectMaps.workMd),
        loadHr011MainSelect("select_ctrt_typ", "CTRT_TYP", hr011MainSelectMaps.ctrtTyp),
        loadHr011MainSelect("select_kosa_grd_cd", "KOSA_GRD_CD", hr011MainSelectMaps.kosa),
        loadHr011MainSelect("select_main_fld_cd", "MAIN_FLD_CD", hr011MainSelectMaps.mainFld),
        loadHr011MainSelect("select_main_cust_cd", "MAIN_CUST_CD", hr011MainSelectMaps.mainCust)
    ]);

    await loadHr011MainDetail(devId);
    await window.initTab1();
    window.initTab2();
    window.initTab3();
    if (typeof window.initTab4 === "function") {
        window.initTab4();
    }

    scheduleHr011ReadOnlyTextareas();
    scheduleHr011ReadOnlyFields();
    scheduleHr011LegacyReadonlyTable();
    window.hr011EditUnlocked = false;
    setHr011Mode("view");
}

// 현재 상세 페이지 대상 인력 ID를 구한다.
function getHr011TargetDevId() {
    const fromInput = $.trim($("#dev_id").val());
    if (fromInput) return fromInput;

    const params = new URLSearchParams(window.location.search || "");
    return $.trim(params.get("dev_id") || "");
}

// 메인 폼용 공통코드 select를 불러온다.
function loadHr011MainSelect(selectId, grpCd, mapRef) {
    return new Promise((resolve) => {
        setComCode(selectId, grpCd, "", "cd", "cd_nm", function () {
            $("#" + selectId).find("option").each(function () {
                if (this.value) {
                    mapRef[this.value] = $(this).text();
                }
            });
            resolve();
        });
    });
}

// 인적사항 메인 데이터를 한 건 불러온다.
async function loadHr011MainDetail(devId) {
    const response = await $.ajax({
        url: "/hr010/list",
        type: "GET",
        data: { dev_id: devId }
    });

    const row = Array.isArray(response?.res) && response.res.length ? response.res[0] : null;
    if (!row) {
        throw new Error("상세 데이터를 찾을 수 없습니다.");
    }

    hr011CurrentRow = row;
    fillHr011MainForm(row);
    await Promise.all([
        fillHr011Grade(row.dev_id),
        loadHr011SkillSummary(row.dev_id),
        loadHr011RadarSummary(row.dev_id)
    ]);
    renderHr011Summary(row);
    renderHr011RadarChart();
    scheduleHr011ReadOnlyTextareas();
}

// 메인 폼 입력값을 채운다.
function fillHr011MainForm(row) {
    const devTypeValue = resolveHr011DevTypeValue(row);
    $("#dev_nm").val(row.dev_nm || "");
    $("#select_dev_typ").val(devTypeValue);
    $("#brdt").val(row.brdt || "");
    $("#tel").val(row.tel || "");
    $("#email").val(row.email || "");
    $("#region").val(row.region || "");
    $("#avail_dt").val(row.avail_dt || "");
    $("#select_work_md").val(row.work_md || "");
    $("#select_ctrt_typ").val(row.ctrt_typ || "");
    $("#select_kosa_grd_cd").val(row.kosa_grd_cd || "");
    $("#select_main_fld_cd").val(row.main_fld_cd || "");
    $("#select_main_cust_cd").val(row.main_cust_cd || "");
    $("#edu_last").val(row.edu_last || "");
    $("#exp_yr").val(formatCareerYearMonth(row.exp_yr) || "");
    $("#hope_rate_amt").val(formatAmount(row.hope_rate_amt));
    $("#cert_txt").val(row.cert_txt || "");
    $("#main_lang").val(row.main_lang || "");
    scheduleHr011ReadOnlyFields();
}

// 등급 점수 정보를 별도로 채운다.
async function fillHr011Grade(devId) {
    try {
        const response = await $.ajax({
            url: "/hr010/getScore",
            type: "GET",
            data: { dev_id: devId }
        });
        const score = response?.res || {};
        const rank = score.rank || "";
        const total = score.score || 0;
        $("#grade").text(rank ? rank + "등급" : "-");
        $("#score").text(rank ? "(" + total + "점)" : "0점");
        $("#hr011SummaryGrade").text(rank ? rank + "등급" : "등급 미정");
    } catch (error) {
        $("#grade").text("-");
        $("#score").text("0점");
        $("#hr011SummaryGrade").text("등급 미정");
    }
}

// 상단 요약 영역을 렌더링한다.
function renderHr011Summary(row) {
    const mainLangParts = splitHr011MainLang(row);
    const employment = resolveHr011DevTypeValue(row) === "HCNC_F"
        ? { label: "프리랜서", className: "freelancer" }
        : { label: "직원", className: "staff" };

    $("#hr011SummaryBadge")
        .text(employment.label)
        .removeClass("hr011-summary-badge--staff hr011-summary-badge--freelancer")
        .addClass("hr011-summary-badge--" + employment.className);

    $("#hr011SummaryName").text(row.dev_nm || "인력 정보");
    $("#hr011SummarySub").text(mainLangParts.skills.length ? "주개발언어" : "주개발언어 미등록");
    $("#hr011SummaryAvail").text(row.avail_dt || "협의");
    $("#hr011SummaryRegion").text(row.region || "-");
    $("#hr011SummaryRate").text(formatAmount(row.hope_rate_amt));
    $("#hr011SummaryCareer").text(formatCareerYearMonth(row.exp_yr) || "-");

    $("#hr011SummarySkills").html(buildHr011SkillSummaryMarkup(row));

    $("#imgUrl").html(getHr011AvatarMarkup(row));
}

// 주개발언어 문자열을 분해해 요약에 사용할 값을 만든다.
function splitHr011MainLang(row) {
    const skills = String(row?.main_lang_nm || "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
    return {
        skills,
        primary: skills[0] || ""
    };
}

// 상단 보유 스킬 요약 태그를 만든다.
function buildHr011SkillSummaryMarkup(row) {
    const mainLangParts = splitHr011MainLang(row);

    if (Array.isArray(hr011SummarySkillRows) && hr011SummarySkillRows.length) {
        return hr011SummarySkillRows.map(function (skill) {
            const level = resolveHr011SkillLevelMeta(skill.level);
            return [
                `<span class="hr011-summary-skill hr011-summary-skill--${level.className}">`,
                `<span class="hr011-summary-skill__label">${escapeHr011(skill.name)}</span>`,
                `<span class="hr011-summary-skill__level">${escapeHr011(level.label)}</span>`,
                `</span>`
            ].join("");
        }).join("");
    }

    const skillNames = mainLangParts.skills.length
        ? mainLangParts.skills
        : String(row.main_lang_nm || "")
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean);

    return (skillNames.length ? skillNames : ["보유역량 미등록"])
        .map((skill) => `<span class="hr011-summary-skill"><span class="hr011-summary-skill__label">${escapeHr011(skill)}</span></span>`)
        .join("");
}

// 숙련도 데이터를 읽어 상단 보유 스킬 요약으로 변환한다.
async function loadHr011SkillSummary(devId) {
    hr011SummarySkillRows = [];
    if (!devId) {
        return;
    }

    try {
        const response = await $.ajax({
            url: "/hr012/tab2_2",
            type: "GET",
            data: { dev_id: devId }
        });
        const rows = Array.isArray(response) ? response : response?.res;
        if (!Array.isArray(rows)) {
            return;
        }

        hr011SummarySkillRows = rows
            .map(function (row) {
                return {
                    name: row.cd_nm || row.skl_id || "",
                    level: resolveHr011SkillLevelValue(row)
                };
            })
            .filter(function (row) {
                return row.name;
            })
            .sort(function (a, b) {
                if (b.level !== a.level) return b.level - a.level;
                return a.name.localeCompare(b.name, "ko");
            })
            .slice(0, 10);
    } catch (error) {
        console.warn("hr011 skill summary load failed", error);
    }
}

// 프로젝트 평가 데이터를 평균 내어 레이더 차트용 데이터로 만든다.
async function loadHr011RadarSummary(devId) {
    hr011SummaryRadarRows = [];
    hr011SummaryRadarProjectCount = 0;
    if (!devId) {
        return;
    }

    try {
        const baseResponse = await $.ajax({
            url: "/hr014/a/list",
            type: "GET",
            data: { dev_id: devId }
        });
        const baseRows = Array.isArray(baseResponse?.list) ? baseResponse.list : [];
        const projectList = Array.isArray(baseResponse?.projectList) ? baseResponse.projectList : [];
        const indicators = baseRows
            .map(function (row) {
                return {
                    evalId: String(row.eval_id || ""),
                    label: row.cd_nm || row.eval_id || ""
                };
            })
            .filter(function (row) {
                return row.evalId && row.label;
            });

        if (!indicators.length) {
            return;
        }

        const buckets = {};
        indicators.forEach(function (item) {
            buckets[item.evalId] = {
                evalId: item.evalId,
                label: item.label,
                total: 0,
                count: 0
            };
        });

        let sourceLists = [baseRows];
        if (projectList.length) {
            hr011SummaryRadarProjectCount = projectList.length;
            const projectResponses = await Promise.all(projectList.map(function (project) {
                return $.ajax({
                    url: "/hr014/a/list",
                    type: "GET",
                    data: {
                        dev_id: devId,
                        dev_prj_id: project.dev_prj_id
                    }
                }).then(function (response) {
                    return response;
                }, function () {
                    return { list: [] };
                });
            }));

            sourceLists = projectResponses.map(function (response) {
                return Array.isArray(response?.list) ? response.list : [];
            });
        }

        sourceLists.forEach(function (rows) {
            rows.forEach(function (row) {
                const evalId = String(row.eval_id || "");
                const score = resolveHr011EvalLevelValue(row);
                if (!evalId || !buckets[evalId] || score <= 0) {
                    return;
                }
                buckets[evalId].total += score;
                buckets[evalId].count += 1;
            });
        });

        hr011SummaryRadarRows = indicators.map(function (item) {
            const bucket = buckets[item.evalId];
            return {
                evalId: item.evalId,
                label: item.label,
                value: bucket.count ? Number((bucket.total / bucket.count).toFixed(1)) : 0
            };
        });
    } catch (error) {
        console.warn("hr011 radar summary load failed", error);
    }
}

// 프로젝트 평가 레이더 차트를 그린다.
function renderHr011RadarChart() {
    const chartEl = document.getElementById("hr011SummaryRadarChart");
    const metaEl = document.getElementById("hr011SummaryRadarMeta");
    if (!chartEl || !metaEl) {
        return;
    }

    const hasData = Array.isArray(hr011SummaryRadarRows)
        && hr011SummaryRadarRows.length
        && hr011SummaryRadarRows.some(function (row) { return row.value > 0; });

    if (!hasData) {
        if (hr011SummaryRadarChart && typeof hr011SummaryRadarChart.clear === "function") {
            hr011SummaryRadarChart.clear();
        }
        chartEl.hidden = true;
        metaEl.textContent = "프로젝트 평가 데이터가 아직 없습니다.";
        return;
    }

    chartEl.hidden = false;
    metaEl.textContent = hr011SummaryRadarProjectCount
        ? `프로젝트 ${hr011SummaryRadarProjectCount}건 기준 평균 평가`
        : "프로젝트 평가 평균";

    if (typeof echarts !== "object" || typeof echarts.init !== "function") {
        return;
    }

    if (!hr011SummaryRadarChart) {
        hr011SummaryRadarChart = typeof echarts.getInstanceByDom === "function"
            ? echarts.getInstanceByDom(chartEl)
            : null;
        if (!hr011SummaryRadarChart) {
            hr011SummaryRadarChart = echarts.init(chartEl, null, { renderer: "svg" });
        }
    }

    hr011SummaryRadarChart.setOption({
        animationDuration: 640,
        animationEasing: "cubicOut",
        tooltip: {
            trigger: "item",
            backgroundColor: "rgba(17, 27, 44, 0.92)",
            borderWidth: 0,
            padding: [10, 12],
            textStyle: {
                color: "#ffffff",
                fontFamily: "Pretendard, sans-serif",
                fontSize: 12
            },
            formatter: function (params) {
                const values = Array.isArray(params?.value) ? params.value : [];
                return hr011SummaryRadarRows.map(function (row, idx) {
                    const value = values[idx] != null ? values[idx] : row.value;
                    return `${escapeHr011(row.label)}: ${value}점`;
                }).join("<br>");
            }
        },
        radar: {
            center: ["50%", "54%"],
            radius: "78%",
            splitNumber: 5,
            indicator: hr011SummaryRadarRows.map(function (row) {
                return { name: row.label, max: 5 };
            }),
            axisName: {
                color: "#6f86a4",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "Pretendard, sans-serif"
            },
            splitArea: {
                areaStyle: {
                    color: ["#ffffff", "#f6f9ff"]
                }
            },
            splitLine: {
                lineStyle: {
                    color: "#dfe7f4"
                }
            },
            axisLine: {
                lineStyle: {
                    color: "#dfe7f4"
                }
            }
        },
        series: [{
            type: "radar",
            symbol: "circle",
            symbolSize: 6,
            lineStyle: {
                width: 2,
                color: "#4f6ff7"
            },
            itemStyle: {
                color: "#4f6ff7"
            },
            areaStyle: {
                color: "rgba(79, 111, 247, 0.18)"
            },
            data: [{
                value: hr011SummaryRadarRows.map(function (row) { return row.value; }),
                name: "평균 평가"
            }]
        }]
    }, true);

    bindHr011RadarResize();
}

// 레이더 차트 리사이즈를 1회만 바인딩한다.
function bindHr011RadarResize() {
    if (hr011SummaryRadarResizeBound) {
        return;
    }
    hr011SummaryRadarResizeBound = true;
    $(window).on("resize.hr011Radar", function () {
        if (hr011SummaryRadarChart && typeof hr011SummaryRadarChart.resize === "function") {
            hr011SummaryRadarChart.resize();
        }
    });
}

// 숙련도 원본 값을 점수 표기와 스타일 단계로 변환한다.
function resolveHr011SkillLevelMeta(level) {
    if (level >= 4) {
        return { label: `${level}점`, className: "advanced" };
    }
    if (level === 3) {
        return { label: `${level}점`, className: "mid" };
    }
    if (level > 0) {
        return { label: `${level}점`, className: "basic" };
    }
    return { label: "0점", className: "basic" };
}

// 숙련도 조회 응답의 lv1~lv5 플래그를 숫자 단계로 정규화한다.
function resolveHr011SkillLevelValue(row) {
    if (row.lv5 === "Y" || row.lv5 === true) return 5;
    if (row.lv4 === "Y" || row.lv4 === true) return 4;
    if (row.lv3 === "Y" || row.lv3 === true) return 3;
    if (row.lv2 === "Y" || row.lv2 === true) return 2;
    if (row.lv1 === "Y" || row.lv1 === true) return 1;
    return 0;
}

// 평가 데이터의 lv1~lv5 플래그를 레이더 차트 점수로 정규화한다.
function resolveHr011EvalLevelValue(row) {
    if (row.lv5 === "Y" || row.lv5 === true) return 5;
    if (row.lv4 === "Y" || row.lv4 === true) return 4;
    if (row.lv3 === "Y" || row.lv3 === true) return 3;
    if (row.lv2 === "Y" || row.lv2 === true) return 2;
    if (row.lv1 === "Y" || row.lv1 === true) return 1;
    return 0;
}

// 프로필 이미지/이니셜 마크업을 만든다.
function getHr011AvatarMarkup(row) {
    const imgUrl = row.img_url || (row.dev_img_base64 ? `data:image/png;base64,${row.dev_img_base64}` : "");
    if (imgUrl) {
        return `<img src="${imgUrl}" class="profile-circle-icon" alt="${escapeHr011(row.dev_nm || "프로필")}">`;
    }

    const name = String(row.dev_nm || "?").trim();
    const seed = name.slice(-2) || "?";
    return `<div class="profile-circle-icon">${escapeHr011(seed)}</div>`;
}

// 직원/프리랜서 코드를 정규화한다.
function resolveHr011DevTypeValue(row) {
    if (String(row.dev_id || "").startsWith("HCNC_F")) return "HCNC_F";
    if (String(row.dev_id || "").startsWith("HCNC_S")) return "HCNC_S";
    return "";
}

// 메인 정보와 하위 섹션 저장을 한 번에 실행한다.
async function saveHr011DetailPage() {
    if (window.hr010ReadOnly) {
        return;
    }

    try {
        showLoading();
        await saveHr011MainProfile();
        if (typeof saveHr011TableData === "function") await saveHr011TableData();
        if (typeof saveHr012TableData === "function") await saveHr012TableData();
        if (typeof window.saveHr013TableData === "function") window.saveHr013TableData();
        if (typeof window.saveTab4All === "function") window.saveTab4All();

        showAlert({ icon: "success", title: "완료", text: "인적사항 상세 정보가 저장되었습니다." });
        window.hr011EditUnlocked = false;
        setHr011Mode("view");
    } catch (error) {
        console.error(error);
        showAlert({ icon: "error", title: "오류", text: "상세 정보 저장 중 오류가 발생했습니다." });
    } finally {
        hideLoading();
    }
}

// 메인 인적사항 폼을 저장한다.
async function saveHr011MainProfile() {
    const formData = new FormData();
    formData.append("dev_id", $("#dev_id").val());
    formData.append("dev_typ", $("#select_dev_typ").val());
    formData.append("dev_nm", $("#dev_nm").val());
    formData.append("brdt", $("#brdt").val());
    formData.append("tel", $("#tel").val());
    formData.append("email", $("#email").val());
    formData.append("region", $("#region").val());
    formData.append("main_lang", $("#main_lang").val());
    formData.append("exp_yr", $("#exp_yr").val());
    formData.append("edu_last", $("#edu_last").val());
    formData.append("cert_txt", $("#cert_txt").val());
    formData.append("work_md", $("#select_work_md").val());
    formData.append("avail_dt", $("#avail_dt").val());
    formData.append("ctrt_typ", $("#select_ctrt_typ").val());
    formData.append("hope_rate_amt", normalizeAmountValue($("#hope_rate_amt").val()));
    formData.append("kosa_grd_cd", $("#select_kosa_grd_cd").val());
    formData.append("main_fld_cd", $("#select_main_fld_cd").val());
    formData.append("main_cust_cd", $("#select_main_cust_cd").val());

    await $.ajax({
        url: "/hr010/upsert",
        type: "POST",
        processData: false,
        contentType: false,
        data: formData
    });
}

// 경력 표기 문자열을 화면용으로 정리한다.
function formatCareerYearMonth(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/[년월]/.test(raw)) return raw;
    return raw + "년";
}

// 특수문자 이스케이프.
function escapeHr011(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
