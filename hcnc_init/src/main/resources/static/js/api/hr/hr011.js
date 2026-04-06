// 사용자 관리 - 소속 및 계약 정보 hr011.js (hcnc_hms)

// 모달
var $modal = $("#view-user-area");

// view일 때는 수정 불가, update일 때는 수정 가능
$(document).on("tab:readonly.hr011", function (_, isReadOnly) {
    if (isReadOnly) {
        window.hr011EditUnlocked = false;
        setHr011Mode("view", { silent: true });
        return;
    }
    const keepInsert = hr011Mode === "insert" || (window.hr011EditUnlocked && !$.trim(window.currentDevId || $("#dev_id").val()));
    if (keepInsert) {
        setHr011Mode("insert", { silent: true });
    } else {
        setHr011Mode(window.hr011EditUnlocked ? "update" : "view", { silent: true });
    }

    // ESC 누르면 모달 닫힘
    $(document).on("keydown", function (event) {
        if (event.key === "Escape") {
            closeUserViewModal();
        }
    });
});

// mode 초기값 : view, 테이블 데이터 초기값 : null
let hr011Mode = "view";
window.hr011Data = null;
window.hr011EditUnlocked = false;

// const HR011_FIELDS = "#org_nm, #select_biz_typ, #st_dt, #ed_dt, #amt, #remark"; // 데이터 담을 상수

// 사업자 유형 공통코드
let bizTypMap = [];
let bizTypOptions = [];

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

// ============================================================================== //

// 모드 제어 함수
function setHr011Mode(mode, options) {
    const silent = !!(options && options.silent);
    const wasEditable = $(".hr011-page").hasClass("is-edit-mode");
    if ($(".hr011-page").length && mode !== "view" && !window.hr011EditUnlocked) {
        mode = "view";
    }
    hr011Mode = mode;
    const isView = mode === "view"; // view일 때는 수정불가능
    const isEditable = !isView && (mode === "insert" || mode === "update"); // insert와 update는 수정가능
    const isInsert = mode === "insert";
    const isUpdate = mode === "update";
    window.currentMode = mode;
    window.hr010ReadOnly = !isEditable;
    if (isView) {
        window.hr011EditUnlocked = false;
    }
    $(".hr011-page")
        .toggleClass("is-edit-mode", isEditable)
        .toggleClass("is-view-mode", isView)
        .toggleClass("is-insert-mode", isInsert)
        .toggleClass("is-update-mode", isUpdate);
    $("#hr011PageTitleText").text(isView ? "인적사항 상세" : isInsert ? "인적사항 등록" : "인적사항 수정");
    $("#modal-title").text(isView ? "상세" : mode === "insert" ? "등록" : "수정");
    $("#hr011CancelBtn, #hr011CancelBtnView").text(isInsert ? "등록취소" : "수정취소");
    $("#hr011SaveBtn, #hr011SaveBtnView").text(isInsert ? "등록" : "저장");
    $("#hr011EditBtn").toggle(isView);
    $("#hr011CancelBtn").toggle(!isView);
    $("#hr011SaveBtn").prop("hidden", isView).toggle(!isView);
    $("#hr011BackBtnView").toggle(isView);
    $("#hr011EditBtnView").toggle(isView);
    $("#hr011CancelBtnView").toggle(!isView);
    $("#hr011SaveBtnView").prop("hidden", isView).toggle(!isView);
    if (isEditable && !wasEditable) {
        requestAnimationFrame(function () {
            animateHr011EditDashboard();
        });
    }

    const readOnlySelectors = [
        "#dev_nm",
        "#select_dev_typ",
        "#brdt",
        "#tel",
        "#email",
        "#select_sido_cd",
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
        .prop("disabled", !isInsert)
        .toggleClass("is-readonly", !isInsert)
        .toggleClass("is-fixed-field", !isInsert);

    $("#main_lang_display").prop("readonly", true).addClass("is-readonly");

    if (!isEditable) {
        $("#amt").prop("readonly", true).addClass("is-readonly");
    } else {
        $("#amt").prop("readonly", false).removeClass("is-readonly");
    }

    if (!silent) {
        $(document).trigger("tab:readonly", [!isEditable]);
    }
    syncHr011EditIntegrations(isEditable, wasEditable);

    scheduleHr011ReadOnlyTextareas();
    scheduleHr011ReadOnlyFields();
    scheduleHr011LegacyReadonlyTable();
    hr011RefProjectEvalCache.forEach(function (state, projectKey) {
        if (!state || !state.expanded) return;
        renderHr011ProjectEvaluationContent(projectKey);
    });

    // 일부 탭 초기화가 버튼 라벨을 덮는 경우가 있어 모드 기준으로 한 번 더 보정한다.
    setTimeout(function () {
        const isInsertMode = hr011Mode === "insert";
        $("#hr011CancelBtn, #hr011CancelBtnView").text(isInsertMode ? "등록취소" : "수정취소");
        $("#hr011SaveBtn, #hr011SaveBtnView").text(isInsertMode ? "등록" : "저장");
        renderHr011EditMiniProfile();
    }, 0);
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
    if (!validateHr011Form()) {
        return Promise.reject("validation fail"); // 프로미스로 반환해야 유효성 검사 제대로 진행됨
    }

    changedTabs.tab1 = true;

    // 문자열에서 숫자로 가공
    const rawAmt = $("#amt").val();
    const amtNumber = normalizeAmountValue(rawAmt);

    const param = {
        ctrtId: hr011Mode === "update" ? window.hr011Data?.ctrt_id : null,
        devId: window.currentDevId,
        orgNm: $("#org_nm").val(),
        bizTyp: $("#select_biz_typ").val(),
        stDt: $("#st_dt").val(),
        edDt: $("#ed_dt").val(),
        amt: amtNumber,
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
        error: () =>
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
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
        error: () =>
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
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
    // const MAX_AMT = 999999999999.99;

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

    if (!bizTyp) {
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

    // if (Number(amtRaw) > MAX_AMT) {
    //     showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
    //         icon: 'warning',
    //         title: '경고',
    //         html: `<strong>계약금액</strong>은(는) 최대 ${MAX_AMT}원까지 입력 가능합니다.`
    //     });
    //     $("#amt").focus();
    //     return false;
    // }

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
    .on("keydown", function (e) {
        const allowKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
        if (allowKeys.includes(e.key)) return;

        // 숫자만 허용
        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
            return;
        }

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
        }
    })

    .on("input", function () {
        const raw = (this.value || "").replace(/[^\d]/g, ""); // 숫자만 추출
        const caret = Number.isFinite(this.selectionStart) ? this.selectionStart : raw.length;

        const digitsBeforeCaret = countAmountDigitsBeforeCaret(raw, caret);

        // clamp 추가
        let inputNumber = clampAmount(raw);

        this.value = formatAmount(inputNumber);

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

// 문자열 가공
function normalizeAmountValue(str) {
    if (!str) return "0.00";
    const num = Number(str.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(num)) return "0.00";
    const clamped = Math.min(num, 999999999999.99);
    return clamped.toFixed(2); // 문자열로 반환
}

function formatAmount(num) {
    if (!num) return "0원";
    return formatNumber(num) + "원";
}

function formatHr011Date(value) {
    const raw = $.trim(value == null ? "" : String(value));
    if (!raw) return "-";

    if (/^\d{8}$/.test(raw)) {
        return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        return raw.slice(0, 10);
    }

    if (/^\d{10,13}$/.test(raw)) {
        const epoch = raw.length === 10 ? Number(raw) * 1000 : Number(raw);
        const date = new Date(epoch);
        if (!Number.isNaN(date.getTime())) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, "0");
            const d = String(date.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        }
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    return raw;
}

function formatHr011Period(stDt, edDt) {
    return `${formatHr011Date(stDt)} ~ ${formatHr011Date(edDt)}`;
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
window.changedTabs = window.changedTabs || { tab1: false, tab2: false, tab3: false, tab4: false };

const hr011MainSelectMaps = {
    devTyp: {},
    workMd: {},
    ctrtTyp: {},
    kosa: {},
    mainFld: {},
    mainCust: {},
    sido: {}
};

let hr011CurrentRow = null;
let hr011SummarySkillRows = [];
let hr011SummaryRadarRows = [];
let hr011SummaryRadarProjectCount = 0;
let hr011SummaryRadarChart = null;
let hr011SummaryRadarResizeBound = false;
let hr011RefSkillCategoryRows = [];
let hr011RefProjectRows = [];
let hr011RefSkillGaugeChart = null;
let hr011RefSkillGaugeDetailChart = null;
let hr011RefRadarChart = null;
const HR011_EDIT_STEP_KEYS = ["profile", "contract", "skill", "project", "eval-risk"];
let hr011CurrentEditStepKey = HR011_EDIT_STEP_KEYS[0];
let hr011EditStepScrollBound = false;
let hr011EditStepRafId = null;
let hr011EditStepExtraScrollBound = false;
const HR011_EDIT_STEP_ACTIVE_OFFSET = 56;
let hr011RefCurrentView = "overview";
let hr011RefProjectEvalCache = new Map();
let hr011RefProjectRadarCharts = new Map();
const HR011_SKILL_CHART_PALETTE = ["#24b4e3", "#4d8dff", "#57d7c8", "#7a6dff", "#95d95c", "#ff9f43", "#ff6b6b"];

function getHr011SkillCategoryColor(index) {
    const idx = Math.max(0, Number(index) || 0);
    return HR011_SKILL_CHART_PALETTE[idx % HR011_SKILL_CHART_PALETTE.length];
}

function syncHr011ReadOnlyTextareas() {
    const isViewMode = hr011Mode === "view";
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
    const isViewMode = hr011Mode === "view";

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
    const isViewMode = hr011Mode === "view";
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

    // 목록으로
    $("#hr011BackBtn").on("click", function () {
        window.location.href = "/hr010";
    });

    // 수정 모드 진입
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

    // 수정 취소
    $("#hr011CancelBtn").on("click", async function () {
        const isInsert = hr011Mode === "insert";
        const result = await showAlert({
            icon: "question",
            title: isInsert ? "등록 취소" : "수정 취소",
            text: isInsert ? "등록을 취소하고 목록으로 돌아가시겠습니까?" : "수정을 취소하고 상세 모드로 돌아가시겠습니까?",
            confirmText: isInsert ? "등록취소" : "취소하기",
            showCancelButton: true,
            cancelText: isInsert ? "계속 등록" : "계속 수정"
        });
        if (!result.isConfirmed) return;
        const devId = window.currentDevId || getHr011TargetDevId();
        if (!devId) {
            window.location.href = "/hr010";
            return;
        }
        window.location.href = "/hr011?dev_id=" + encodeURIComponent(devId);
    });

    // 저장
    $("#hr011SaveBtn").on("click", async function () {
        const isInsert = hr011Mode === "insert";
        const result = await showAlert({
            icon: "question",
            title: isInsert ? "등록 확인" : "저장 확인",
            text: isInsert ? "입력한 내용을 등록하시겠습니까?" : "수정 내용을 저장하시겠습니까?",
            confirmText: isInsert ? "등록" : "저장",
            showCancelButton: true,
            cancelText: "취소"
        });
        if (!result.isConfirmed) return;
        await saveHr011DetailPage();
    });

    $("#hope_rate_amt")
        .on("keydown", function (e) {
            const allowKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
            if (allowKeys.includes(e.key)) return;
            if (!/^\d$/.test(e.key)) e.preventDefault();
        })
        .on("input", function () {
            const raw = (this.value || "").replace(/[^\d]/g, "");
            const caret = Number.isFinite(this.selectionStart) ? this.selectionStart : raw.length;

            const digitsBeforeCaret = countAmountDigitsBeforeCaret(raw, caret);

            // 숫자 변환 + 최대값 제한
            let inputNumber = clampAmount(raw);

            this.value = formatAmount(inputNumber);
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

    $(document).on("click", ".hr011-ref-link-btn, .hr011-ref-detail-btn[data-ref-view]", function () {
        const view = String($(this).data("refView") || "overview");
        switchHr011RefView(view);
    });

    $("#hr011RefDetailEditBtn").on("click", function () {
        $("#hr011EditBtn").trigger("click");
    });

    $("#hr011BackBtnView").on("click", function () {
        $("#hr011BackBtn").trigger("click");
    });
    $("#hr011EditBtnView").on("click", function () {
        $("#hr011EditBtn").trigger("click");
    });
    $("#hr011CancelBtnView").on("click", function () {
        $("#hr011CancelBtn").trigger("click");
    });
    $("#hr011SaveBtnView").on("click", function () {
        $("#hr011SaveBtn").trigger("click");
    });

    $("#hr011QuickAddProjectBtn").on("click", function () {
        if (!$(".hr011-page").hasClass("is-edit-mode")) return;
        goHr011EditStep("project");
        if (typeof window.addHr013Row === "function") {
            window.addHr013Row();
            if (window.hr013Table && typeof window.hr013Table.redraw === "function") {
                window.hr013Table.redraw(true);
            }
            return;
        }
        const addBtn = document.querySelector(".tab3-content .btn-tab3-add");
        if (addBtn) addBtn.click();
    });
    $("#hr011QuickRemoveProjectBtn").on("click", function () {
        if (!$(".hr011-page").hasClass("is-edit-mode")) return;
        goHr011EditStep("project");
        if (typeof window.removeHr013SelectedRows === "function") {
            window.removeHr013SelectedRows();
            return;
        }
        const removeBtn = document.querySelector(".tab3-content .btn-tab3-remove");
        if (removeBtn) removeBtn.click();
    });

    $(document).on("click", ".hr011-ref-project-eval-toggle", async function () {
        const projectKey = String($(this).data("projectKey") || "");
        if (!projectKey) return;
        await toggleHr011ProjectEvaluationPanel(projectKey);
    });

    $(document).off("hr013:focusEvaluation.hr011").on("hr013:focusEvaluation.hr011", function (_e, selectedProjectId) {
        scrollHr011ToEvalRiskSection(selectedProjectId);
    });

    $(document).on("click", ".hr011-ref-eval-score-btn", function () {
        const projectKey = String($(this).data("projectKey") || "");
        const rowIndex = Number($(this).data("rowIndex"));
        const level = Number($(this).data("level"));
        if (!projectKey || !Number.isFinite(rowIndex) || !Number.isFinite(level)) return;
        updateHr011ProjectEvalLevel(projectKey, rowIndex, level);
    });

    $(document).on("input", ".hr011-ref-eval-comment-input", function () {
        const projectKey = String($(this).data("projectKey") || "");
        const rowIndex = Number($(this).data("rowIndex"));
        if (!projectKey || !Number.isFinite(rowIndex)) return;
        updateHr011ProjectEvalComment(projectKey, rowIndex, $(this).val());
    });

    $(document).on("input", ".hr011-ref-risk-input", function () {
        const projectKey = String($(this).data("projectKey") || "");
        const field = String($(this).data("field") || "");
        if (!projectKey || !field) return;
        updateHr011ProjectRiskField(projectKey, field, $(this).val());
    });

    $(document).on("change", ".hr011-ref-risk-rein-check", function () {
        const projectKey = String($(this).data("projectKey") || "");
        if (!projectKey) return;
        updateHr011ProjectRiskField(projectKey, "re_in_yn", $(this).is(":checked") ? "Y" : "N");
    });

    $(document).on("input change", ".hr011-page input, .hr011-page select, .hr011-page textarea", function () {
        if (!$(".hr011-page").hasClass("is-edit-mode")) return;
        syncHr011EditStepStatus();
        renderHr011EditMiniProfile();
    });

}

// 상세 페이지의 메인 정보와 하위 섹션을 함께 초기화한다.
async function initHr011DetailPage() {
    const devId = getHr011TargetDevId();
    const isInsertRequest = isHr011InsertModeRequest();
    if (!devId && !isInsertRequest) {
        await showAlert({ icon: "warning", title: "안내", text: "선택된 인력 정보가 없습니다." });
        window.location.href = "/hr010";
        return;
    }

    window.currentDevId = devId || "";
    $("#dev_id").val(devId || "");
    window.hr011EditUnlocked = false;
    setHr011Mode("view", { silent: true });

    await Promise.all([
        loadHr011MainSelect("select_dev_typ", "DEV_TYP", hr011MainSelectMaps.devTyp),
        loadHr011MainSelect("select_work_md", "WORK_MD", hr011MainSelectMaps.workMd),
        loadHr011MainSelect("select_ctrt_typ", "CTRT_TYP", hr011MainSelectMaps.ctrtTyp),
        loadHr011MainSelect("select_kosa_grd_cd", "KOSA_GRD_CD", hr011MainSelectMaps.kosa),
        loadHr011MainSelect("select_main_fld_cd", "MAIN_FLD_CD", hr011MainSelectMaps.mainFld),
        loadHr011MainSelect("select_main_cust_cd", "MAIN_CUST_CD", hr011MainSelectMaps.mainCust),
        loadHr011MainSelect("select_sido_cd", "SIDO_CD", hr011MainSelectMaps.sido)
    ]);

    if (!devId && isInsertRequest) {
        applyHr011InsertDefaults();
        await window.initTab1();
        window.initTab2();
        window.initTab3();
        if (typeof window.initTab4 === "function") {
            window.initTab4();
        }

        window.hr011EditUnlocked = true;
        setHr011Mode("insert");
        scheduleHr011ReadOnlyTextareas();
        scheduleHr011ReadOnlyFields();
        scheduleHr011LegacyReadonlyTable();
        scheduleHr011StepStatusSync();
        return;
    }

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

function isHr011InsertModeRequest() {
    const params = new URLSearchParams(window.location.search || "");
    const mode = String(params.get("mode") || "").trim().toLowerCase();
    const isNew = String(params.get("new") || "").trim().toUpperCase();
    return mode === "insert" || isNew === "Y";
}

function applyHr011InsertDefaults() {
    const defaultDevTyp = $("#select_dev_typ option").filter(function () {
        return !!String(this.value || "").trim();
    }).first().val() || "";

    $("#dev_id").val("");
    $("#dev_nm").val("");
    $("#select_dev_typ").val(defaultDevTyp);
    $("#brdt").val("");
    $("#tel").val("");
    $("#email").val("");
    $("#select_sido_cd").val("");
    $("#avail_dt").val("");
    $("#select_work_md").val("");
    $("#select_ctrt_typ").val("");
    $("#select_kosa_grd_cd").val("");
    $("#select_main_fld_cd").val("");
    $("#select_main_cust_cd").val("");
    $("#edu_last").val("");
    $("#exp_yr").val("");
    $("#hope_rate_amt").val(formatAmount(""));
    $("#cert_txt").val("");
    $("#main_lang").val("");
    $("#hr011CancelBtn, #hr011CancelBtnView").text("등록취소");
    $("#hr011SaveBtn, #hr011SaveBtnView").text("등록");

    hr011CurrentRow = null;
    window.hr011Data = null;
    hr011SummarySkillRows = [];
    hr011SummaryRadarRows = [];
    hr011SummaryRadarProjectCount = 0;
    hr011RefSkillCategoryRows = [];
    hr011RefProjectRows = [];
    hr011RefProjectEvalCache.clear();
    clearHr011Form();

    scheduleHr011ReadOnlyFields();
    renderHr011EditMiniProfile();
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
        loadHr011RadarSummary(row.dev_id),
        loadHr011SkillCategorySummary(row.dev_id),
        loadHr011ProjectSummary(row.dev_id)
    ]);
    renderHr011Summary(row);
    renderHr011RadarChart();
    renderHr011ReferenceDashboard(row);
    renderHr011RefSkillGaugeChart("hr011RefSkillGauge");
    renderHr011RefRadarChart();
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
    $("#select_sido_cd").val(row.sido_cd || ""); // 거주지역
    $("#avail_dt").val(row.avail_dt || "");
    $("#select_work_md").val(row.work_md || "");
    $("#select_ctrt_typ").val(row.ctrt_typ || "");
    $("#select_kosa_grd_cd").val(row.kosa_grd_cd || "");
    $("#select_main_fld_cd").val(row.main_fld_cd || ""); // 주요분야
    $("#select_main_cust_cd").val(row.main_cust_cd || "");
    $("#edu_last").val(row.edu_last || "");
    setCareerSpinInputs(row.exp_yr);
    $("#hope_rate_amt").val(formatAmount(row.hope_rate_amt));
    $("#cert_txt").val(row.cert_txt || "");
    $("#main_lang").val(row.main_lang || "");
    scheduleHr011ReadOnlyFields();
    renderHr011EditMiniProfile();
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
    $("#hr011SummaryRegion").text(row.sido_cd || "-");
    $("#hr011SummaryRate").text(formatAmount(row.hope_rate_amt));
    $("#hr011SummaryCareer").text(formatCareerYearMonth(row.exp_yr) || "-");

    $("#hr011SummarySkills").html(buildHr011SkillSummaryMarkup(row));

    $("#hr011SummaryAvatar").html(getHr011AvatarMarkup(row));
}

async function loadHr011SkillCategorySummary(devId) {
    hr011RefSkillCategoryRows = [];
    if (!devId) return;

    try {
        const response = await $.ajax({
            url: "/hr012/tab2",
            type: "GET",
            data: { dev_id: devId }
        });
        const rows = Array.isArray(response) ? response : response?.res;
        if (!Array.isArray(rows)) return;

        hr011RefSkillCategoryRows = rows.map(function (row) {
            const values = parseHr011SkillList(row.skl_id_lst);
            return {
                name: row.cd_nm || row.cd || "-",
                value: normalizeHr011SkillCategoryValue(row.skl_id_lst),
                valueList: values
            };
        });
    } catch (error) {
        console.warn("hr011 skill category summary load failed", error);
    }
}

async function loadHr011ProjectSummary(devId) {
    hr011RefProjectRows = [];
    if (!devId) return;

    try {
        const response = await $.ajax({
            url: "/hr013/tab3",
            type: "GET",
            data: { dev_id: devId }
        });
        const rows = Array.isArray(response?.list) ? response.list : [];
        hr011RefProjectRows = rows;
    } catch (error) {
        console.warn("hr011 project summary load failed", error);
    }
}

function normalizeHr011SkillCategoryValue(raw) {
    const parsed = parseHr011SkillList(raw);
    if (parsed.length) {
        return parsed.join(", ");
    }

    if (Array.isArray(raw)) {
        const values = raw.map(function (item) {
            if (typeof item === "string") return item.trim();
            if (item && typeof item === "object") {
                return String(item.cd_nm || item.label || item.value || item.cd || "").trim();
            }
            return "";
        }).filter(Boolean);
        return values.length ? values.join(", ") : "-";
    }
    const text = $.trim(String(raw || ""));
    return text || "-";
}

function parseHr011SkillList(raw) {
    if (Array.isArray(raw)) {
        return raw.map(function (item) {
            if (typeof item === "string") return $.trim(item);
            if (item && typeof item === "object") {
                return $.trim(String(item.label || item.cd_nm || item.value || item.cd || ""));
            }
            return "";
        }).filter(Boolean);
    }

    const text = $.trim(String(raw || ""));
    if (!text) return [];

    if (text.charAt(0) === "[" && text.charAt(text.length - 1) === "]") {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                return parsed.map(function (item) {
                    if (typeof item === "string") return $.trim(item);
                    if (item && typeof item === "object") {
                        return $.trim(String(item.label || item.cd_nm || item.value || item.cd || ""));
                    }
                    return "";
                }).filter(Boolean);
            }
        } catch (e) {
            // ignore parse error and fallback to plain text split
        }
    }

    return text.split(",").map(function (item) { return $.trim(item); }).filter(Boolean);
}

function buildHr011ChipListMarkup(raw, emptyLabel) {
    const values = parseHr011SkillList(raw);
    const items = values.length ? values : [emptyLabel || "-"];
    return items.map(function (item) {
        return `<span class="chip">${escapeHr011(item)}</span>`;
    }).join("");
}

function renderHr011ReferenceDashboard(row) {
    if (!row) return;

    const devTypeValue = resolveHr011DevTypeValue(row);
    const devTypeLabel = devTypeValue === "HCNC_F" ? "프리랜서" : "직원";
    const mainLangParts = splitHr011MainLang(row);
    const gradeText = $.trim($("#grade").text() || "-");
    const scoreText = $.trim($("#score").text() || "");
    const projectCountText = `${hr011RefProjectRows.length || 0}회`;
    const mainLangSkills = mainLangParts.skills.slice(0, 6);
    const hasMoreMainLang = mainLangParts.skills.length > 6;

    $("#hr011RefAvatar").html(getHr011AvatarMarkup(row));
    $("#hr011RefName").text(row.dev_nm || "-");
    $("#hr011RefMainLang").html(
        (mainLangSkills.length ? mainLangSkills : ["미등록"]).map(function (skill) {
            return `<span class="chip">${escapeHr011(skill)}</span>`;
        }).join("") + (hasMoreMainLang ? `<span class="chip">...</span>` : "")
    );
    $("#hr011RefCertTxt").html(buildHr011ChipListMarkup(row.cert_txt, "미등록"));

    $("#hr011RefDevType").text(devTypeLabel);
    $("#hr011RefBrdt").text($.trim(row.brdt || "") || "-");
    $("#hr011RefTel").text($.trim(row.tel || "") || "-");
    $("#hr011RefEmail").text($.trim(row.email || "") || "-");
    $("#hr011RefEdu").text($.trim(row.edu_last || "") || "-");

    // 공통코드 데이터
    $("#hr011RefKosa").text(hr011MainSelectMaps.kosa[row.kosa_grd_cd] || row.kosa_grd_cd || "-");
    $("#hr011RefMainFld").text(hr011MainSelectMaps.mainFld[row.main_fld_cd] || row.main_fld_cd || "-");
    $("#hr011RefWorkMd").text(hr011MainSelectMaps.workMd[row.work_md] || row.work_md || "-");
    $("#hr011RefCtrtTyp").text(hr011MainSelectMaps.ctrtTyp[row.ctrt_typ] || row.ctrt_typ || "-");
    $("#hr011RefRegion").text(hr011MainSelectMaps.sido[row.sido_cd] || row.sido_cd || "-");
    $("#hr011RefKosaTop").text(hr011MainSelectMaps.kosa[row.kosa_grd_cd] || row.kosa_grd_cd || "-");

    $("#hr011RefGrade").text(`${gradeText}${scoreText ? ` ${scoreText}` : ""}`);
    $("#hr011RefProjectCount").text(projectCountText);

    const categoryList = hr011RefSkillCategoryRows.length
        ? hr011RefSkillCategoryRows
        : [{ name: "기타", value: "보유역량 미등록" }];
    $("#hr011RefSkillCategoryList").html(categoryList.map(function (item, idx) {
        const values = Array.isArray(item.valueList) && item.valueList.length
            ? item.valueList
            : parseHr011SkillList(item.value || "");
        const renderedValues = values.length
            ? values.join(", ")
            : (item.value || "-");
        const color = getHr011SkillCategoryColor(idx);
        return `<div class="hr011-ref-skill-row hr011-skill-stagger-item" style="--hr011-skill-cat-color:${color};"><div class="cat">${escapeHr011(item.name)}</div><div class="val">${escapeHr011(renderedValues)}</div></div>`;
    }).join(""));

    const projects = (hr011RefProjectRows || []).slice(0, 3);
    $("#hr011RefProjectList").html(projects.length ? projects.map(function (item) {
        const company = item.org_nm || item.cust_nm || item.cli_nm || "-";
        const isInternal = isHr011InternalProject(item);
        const stacks = parseHr011SkillList(item.stack_txt_nm || item.stack_txt);
        const stackMarkup = (stacks.length ? stacks.slice(0, 5) : ["미등록"]).map(function (stack) {
            return `<span class="chip">${escapeHr011(stack)}</span>`;
        }).join("");
        return [
            `<article class="hr011-ref-project-item">`,
            `<div class="hr011-ref-project-item-badge">${buildHr011ProjectBadgeMarkup(company, isInternal)}</div>`,
            `<div class="hr011-ref-project-item-body">`,
            `<div class="hr011-ref-project-item-field">`,
            `<span class="label">프로젝트명</span>`,
            `<div class="value">${escapeHr011(item.prj_nm || "-")}</div>`,
            `</div>`,
            `<div class="hr011-ref-project-item-field">`,
            `<span class="label">주개발언어</span>`,
            `<div class="stack">${stackMarkup}</div>`,
            `</div>`,
            `</div>`,
            `</article>`
        ].join("");
    }).join("") : `<article class="hr011-ref-project-item hr011-ref-project-item--empty"><div class="name">프로젝트 이력이 없습니다.</div></article>`);

    switchHr011RefView(hr011RefCurrentView, { force: true });
}

function switchHr011RefView(view, options) {
    const normalized = ["overview", "skills", "project", "profile"].includes(view) ? view : "overview";
    const force = !!(options && options.force);
    if (!force && hr011RefCurrentView === normalized) return;
    hr011RefCurrentView = normalized;

    const overviewEl = document.getElementById("hr011RefOverview");
    const detailEl = document.getElementById("hr011RefDetail");
    const detailTitleEl = document.getElementById("hr011RefDetailTitle");
    const detailBodyEl = document.getElementById("hr011RefDetailBody");
    const leftProfileLinkEl = document.querySelector('.hr011-ref-left-head .hr011-ref-link-btn[data-ref-view="profile"]');
    if (!overviewEl || !detailEl || !detailTitleEl || !detailBodyEl) return;

    if (leftProfileLinkEl) {
        // 프로필/스킬/프로젝트 상세에서는 좌측 >상세보기 버튼을 숨긴다.
        leftProfileLinkEl.hidden = normalized === "skills" || normalized === "project" || normalized === "profile";
    }

    if (normalized === "overview") {
        overviewEl.hidden = false;
        detailEl.hidden = true;
        requestAnimationFrame(function () {
            animateHr011RefEntrance(document.getElementById("hr011RefLayout"));
            // 상세 -> 메인 복귀 시 개요 차트 애니메이션을 다시 재생한다.
            renderHr011RefSkillGaugeChart("hr011RefSkillGauge");
            renderHr011RefRadarChart();
            animateHr011SkillSection(overviewEl);
        });
        return;
    }

    overviewEl.hidden = true;
    detailEl.hidden = false;

    if (normalized === "skills") {
        detailTitleEl.textContent = "보유 역량 및 숙련도";
        detailBodyEl.innerHTML = buildHr011SkillsDetailMarkup();
        renderHr011RefSkillGaugeChart("hr011RefSkillGaugeDetail");
        requestAnimationFrame(function () {
            animateHr011RefEntrance(detailEl);
            animateHr011SkillSection(detailEl);
        });
        return;
    }

    if (normalized === "project") {
        detailTitleEl.textContent = "프로젝트 이력";
        detailBodyEl.innerHTML = buildHr011ProjectDetailMarkup();
        initializeHr011ProjectDetailEvaluations();
        requestAnimationFrame(function () {
            animateHr011RefEntrance(detailEl);
        });
        return;
    }

    detailTitleEl.textContent = "인적사항";
    detailBodyEl.innerHTML = buildHr011ProfileDetailMarkup();
    requestAnimationFrame(function () {
        animateHr011RefEntrance(detailEl);
    });
}

function animateHr011RefEntrance(rootEl) {
    if (!rootEl) return;
    const targets = rootEl.querySelectorAll([
        ".hr011-ref-left-card",
        ".hr011-ref-kpi",
        ".hr011-ref-skill-card",
        ".hr011-ref-radar-card",
        ".hr011-ref-project-card",
        ".hr011-ref-project-item",
        ".hr011-ref-detail-card",
        ".hr011-ref-project-detail-item",
        ".hr011-ref-project-eval-side",
        ".hr011-ref-project-eval-panel"
    ].join(","));

    targets.forEach(function (el, idx) {
        const hasChartHost = !!el.querySelector(".hr011-ref-skill-gauge, .hr011-ref-radar, .hr011-ref-project-eval-radar");
        const allowChartCardMotion = el.matches(".hr011-ref-project-detail-item, .hr011-ref-project-eval-side");
        const delay = Math.min(idx * 42, 360);
        el.style.setProperty("--hr011-enter-delay", `${delay}ms`);
        el.classList.remove("hr011-enter-motion");
        el.classList.remove("hr011-enter-motion-soft");
        void el.offsetWidth;
        if (hasChartHost && !allowChartCardMotion) {
            return;
        }
        el.classList.add(hasChartHost ? "hr011-enter-motion-soft" : "hr011-enter-motion");
    });
}

function animateHr011SkillSection(rootEl) {
    if (!rootEl) return;
    const chartWraps = rootEl.querySelectorAll(".hr011-ref-skill-gauge-wrap");
    chartWraps.forEach(function (el) {
        el.classList.remove("is-skill-animated");
        void el.offsetWidth;
        el.classList.add("is-skill-animated");
    });

    const items = rootEl.querySelectorAll(".hr011-skill-stagger-item, .hr011-skill-score-row");
    items.forEach(function (el, idx) {
        const delay = Math.min(idx * 52, 420);
        el.style.setProperty("--hr011-skill-delay", `${delay}ms`);
        el.classList.remove("is-skill-animated");
        void el.offsetWidth;
        el.classList.add("is-skill-animated");
    });
}

function animateHr011EditDashboard() {
    const rootEl = document.querySelector(".hr011-page.is-edit-mode .hr011-dashboard-grid");
    if (!rootEl) return;
    const sections = rootEl.querySelectorAll(".hr011-section");
    sections.forEach(function (el, idx) {
        const delay = Math.min(idx * 55, 300);
        el.style.setProperty("--hr011-edit-delay", `${delay}ms`);
        el.classList.remove("hr011-edit-enter");
        void el.offsetWidth;
        el.classList.add("hr011-edit-enter");
    });
}

function setHr011ActiveEditStep(stepKey) {
    const visibleStepKeys = getHr011VisibleStepKeys();
    const normalized = visibleStepKeys.includes(stepKey) ? stepKey : (visibleStepKeys[0] || HR011_EDIT_STEP_KEYS[0]);
    hr011CurrentEditStepKey = normalized;
    const buttons = document.querySelectorAll(".hr011-edit-stepper .hr011-edit-step-btn");

    buttons.forEach(function (btn) {
        const key = String(btn.getAttribute("data-step-target") || "");
        const isVisible = visibleStepKeys.includes(key);
        btn.classList.toggle("is-active", key === normalized);
        btn.toggleAttribute("hidden", !isVisible);
    });

    const idx = Math.max(0, visibleStepKeys.indexOf(normalized));
    const currentEl = document.getElementById("hr011EditStepCurrent");
    const totalEl = document.getElementById("hr011EditStepTotal");
    if (currentEl) currentEl.textContent = String(idx + 1);
    if (totalEl) totalEl.textContent = String(visibleStepKeys.length || HR011_EDIT_STEP_KEYS.length);

    syncHr011EditStepStatus();
}

// function getHr011StepIndex(stepKey) {
//     const idx = getHr011VisibleStepKeys().indexOf(String(stepKey || ""));
//     return idx < 0 ? 0 : idx;
// }

// function getHr011CurrentStepIndex() {
//     return getHr011StepIndex(hr011CurrentEditStepKey);
// }

function goHr011EditStep(stepKey) {
    setHr011ActiveEditStep(stepKey);
    const section = document.querySelector(`.hr011-page.is-edit-mode .hr011-dashboard-grid .hr011-section[data-edit-step="${stepKey}"]`);
    if (section) {
        scrollHr011SectionIntoView(section);
    }
    refreshHr011StepContent(stepKey);
}

function scrollHr011SectionIntoView(section) {
    if (!section) return;
    const header = document.querySelector(".hr011-page.is-edit-mode .hr011-page-actions--bottom");
    const headerRect = header ? header.getBoundingClientRect() : null;
    const headerHeight = headerRect ? Math.max(headerRect.height, 64) : 64;
    const offset = headerHeight + 18;
    const currentY = window.pageYOffset || window.scrollY || 0;
    const targetY = Math.max(0, section.getBoundingClientRect().top + currentY - offset);
    window.scrollTo({ top: targetY, behavior: "smooth" });
}

function getHr011VisibleStepKeys() {
    if (hr011Mode === "insert") {
        return HR011_EDIT_STEP_KEYS.filter(function (key) {
            return key !== "eval-risk";
        });
    }
    return HR011_EDIT_STEP_KEYS.slice();
}

function syncHr011ActiveStepByScroll() {
    const visibleStepKeys = getHr011VisibleStepKeys();
    const sections = Array.from(document.querySelectorAll(".hr011-page.is-edit-mode .hr011-dashboard-grid .hr011-section[data-edit-step]"))
        .filter(function (section) {
            const key = String(section.getAttribute("data-edit-step") || "");
            return visibleStepKeys.includes(key) && section.offsetParent !== null;
        });
    if (!sections.length) return;
    const header = document.querySelector(".hr011-page.is-edit-mode .hr011-page-actions--bottom");
    const headerRect = header ? header.getBoundingClientRect() : null;
    const anchorY = (headerRect ? headerRect.bottom : 0) + HR011_EDIT_STEP_ACTIVE_OFFSET;
    let active = sections[0];
    sections.forEach(function (section) {
        const top = section.getBoundingClientRect().top;
        if (top <= anchorY) {
            active = section;
        }
    });
    const key = String(active.getAttribute("data-edit-step") || visibleStepKeys[0] || HR011_EDIT_STEP_KEYS[0]);
    setHr011ActiveEditStep(key);
}

function requestHr011ActiveStepSync() {
    if (hr011EditStepRafId != null) return;
    const raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
    hr011EditStepRafId = raf(function () {
        hr011EditStepRafId = null;
        syncHr011ActiveStepByScroll();
    });
}

// function isHr011ProfileStepFilled() {
//     return !!($.trim($("#dev_nm").val()) && $.trim($("#select_dev_typ").val()));
// }

// function isHr011ContractStepFilled() {
//     const amt = normalizeAmountValue($("#amt").val());
//     return !!(
//         $.trim($("#org_nm").val()) &&
//         $.trim($("#st_dt").val()) &&
//         $.trim($("#ed_dt").val()) &&
//         $.trim($("#select_biz_typ").val()) &&
//         Number(amt) > 0
//     );
// }

// function isHr011SkillStepFilled() {
//     if (!window.hr012TableA || typeof window.hr012TableA.getData !== "function") return false;
//     const rows = window.hr012TableA.getData() || [];
//     return rows.some(function (row) {
//         const list = parseHr011SkillList(row && row.skl_id_lst);
//         return list.length > 0;
//     });
// }

// function isHr011ProjectStepFilled() {
//     if (!window.hr013Table || typeof window.hr013Table.getData !== "function") return false;
//     const rows = window.hr013Table.getData() || [];
//     return rows.some(function (row) {
//         return !!($.trim(String((row && (row.prj_nm || row.dev_prj_id)) || "")));
//     });
// }

// function isHr011EvalRiskStepFilled() {
//     if (!Array.isArray(hr011RefProjectRows) || hr011RefProjectRows.length === 0) return true;
//     if (!(hr011RefProjectEvalCache instanceof Map) || !hr011RefProjectEvalCache.size) return false;
//     let hasValue = false;
//     hr011RefProjectEvalCache.forEach(function (state) {
//         if (hasValue || !state) return;
//         const evalRows = Array.isArray(state.evalRows) ? state.evalRows : [];
//         const risk = state.risk || {};
//         if (evalRows.length) {
//             hasValue = true;
//             return;
//         }
//         const keys = ["leave_txt", "claim_txt", "sec_txt", "memo"];
//         hasValue = keys.some(function (k) { return !!$.trim(String(risk[k] || "")); }) || String(risk.re_in_yn || "N") === "Y";
//     });
//     return hasValue;
// }

function scheduleHr011StepStatusSync() {
    const delays = [0, 180, 480, 900];
    delays.forEach(function (delay) {
        setTimeout(function () {
            if (!$(".hr011-page").hasClass("is-edit-mode")) return;
            syncHr011EditStepStatus();
            requestHr011ActiveStepSync();
        }, delay);
    });
}

// function getHr011StepState(stepKey) {
//     if (stepKey === "profile") return isHr011ProfileStepFilled() ? "done" : "pending";
//     if (stepKey === "contract") return isHr011ContractStepFilled() ? "done" : "pending";
//     if (stepKey === "skill") return isHr011SkillStepFilled() ? "done" : "pending";
//     if (stepKey === "project") return isHr011ProjectStepFilled() ? "done" : "pending";
//     if (stepKey === "eval-risk") return isHr011EvalRiskStepFilled() ? "done" : "pending";
//     return "pending";
// }

function syncHr011EditStepStatus() {
    const buttons = document.querySelectorAll(".hr011-edit-stepper .hr011-edit-step-btn");
    const visibleStepKeys = getHr011VisibleStepKeys();
    buttons.forEach(function (btn) {
        const key = String(btn.getAttribute("data-step-target") || "");
        if (!visibleStepKeys.includes(key)) {
            btn.setAttribute("hidden", "hidden");
            return;
        }
        btn.removeAttribute("hidden");
        btn.removeAttribute("data-step-state");
    });
}

// function markHr011StepError(stepKey) {
//     return;
// }

// function syncHr011EditWizardButtons() {
//     const prevBtn = document.getElementById("hr011StepPrevBtn");
//     const nextBtn = document.getElementById("hr011StepNextBtn");
//     if (!prevBtn || !nextBtn) return;
//     const idx = getHr011CurrentStepIndex();
//     const isLast = idx >= HR011_EDIT_STEP_KEYS.length - 1;
//     prevBtn.disabled = idx <= 0;
//     nextBtn.textContent = isLast ? (hr011Mode === "insert" ? "등록" : "저장") : "다음";
// }

// function validateHr011StepBeforeNext(stepKey) {
//     if (stepKey === "profile") {
//         const devNm = $.trim($("#dev_nm").val());
//         const devTyp = $.trim($("#select_dev_typ").val());
//         if (!devNm) {
//             showAlert({ icon: "warning", title: "경고", html: "<strong>성명</strong>을(를) 입력해주세요." });
//             $("#dev_nm").focus();
//             markHr011StepError("profile");
//             return false;
//         }
//         if (!devTyp) {
//             showAlert({ icon: "warning", title: "경고", html: "<strong>구분</strong>을(를) 선택해주세요." });
//             $("#select_dev_typ").focus();
//             markHr011StepError("profile");
//             return false;
//         }
//         return true;
//     }
//     if (stepKey === "contract") {
//         const ok = validateHr011Form();
//         if (!ok) {
//             markHr011StepError("contract");
//         }
//         return ok;
//     }
//     return true;
// }

function refreshHr011StepContent(stepKey) {
    setTimeout(function () {
        if (stepKey === "skill") {
            if (window.hr012TableA && typeof window.hr012TableA.redraw === "function") window.hr012TableA.redraw(true);
            if (window.hr012TableB && typeof window.hr012TableB.redraw === "function") window.hr012TableB.redraw(true);
            applyHr011Tab2DualPane(true);
        } else if (stepKey === "project") {
            if (window.hr013Table && typeof window.hr013Table.redraw === "function") window.hr013Table.redraw(true);
        } else if (stepKey === "eval-risk") {
            if (window.hr014TableA && typeof window.hr014TableA.redraw === "function") window.hr014TableA.redraw(true);
            applyHr011Tab4DualPane(true);
        }
    }, 30);
}

function initHr011EditStepNavigation(isEditable) {
    const flow = document.querySelector(".hr011-page .hr011-edit-flow");
    if (!flow) return;

    if (!isEditable) {
        setHr011ActiveEditStep("");
        return;
    }

    const stepper = document.querySelector(".hr011-page.is-edit-mode .hr011-edit-stepper");
    if (!stepper) return;

    if (!stepper.dataset.bound) {
        stepper.dataset.bound = "Y";
        stepper.addEventListener("click", function (e) {
            const btn = e.target.closest(".hr011-edit-step-btn");
            if (!btn) return;
            const targetKey = String(btn.getAttribute("data-step-target") || "");
            if (!targetKey) return;
            goHr011EditStep(targetKey);
        });
    }

    if (!hr011EditStepScrollBound) {
        hr011EditStepScrollBound = true;
        window.addEventListener("scroll", requestHr011ActiveStepSync, { passive: true });
        window.addEventListener("resize", requestHr011ActiveStepSync);
    }
    if (!hr011EditStepExtraScrollBound) {
        hr011EditStepExtraScrollBound = true;
        const candidates = [
            document.querySelector(".contents-wrap.hr011-detail-wrap"),
            document.querySelector(".container-wrap .container")
        ].filter(Boolean);
        candidates.forEach(function (el) {
            el.addEventListener("scroll", requestHr011ActiveStepSync, { passive: true });
        });
    }

    const totalEl = document.getElementById("hr011EditStepTotal");
    const visibleStepKeys = getHr011VisibleStepKeys();
    if (totalEl) totalEl.textContent = String(visibleStepKeys.length || HR011_EDIT_STEP_KEYS.length);
    setTimeout(syncHr011ActiveStepByScroll, 0);
    setTimeout(syncHr011ActiveStepByScroll, 180);
    scheduleHr011StepStatusSync();
}

function syncHr011EditIntegrations(isEditable, wasEditable) {
    applyHr011Tab2DualPane(isEditable);
    applyHr011Tab4DualPane(isEditable);
    initHr011EditStepNavigation(isEditable);
    if (!isEditable) {
        return;
    }
    if (wasEditable) {
        if (typeof window.applyTab2Readonly === "function") window.applyTab2Readonly(false);
        if (typeof window.applyTab4Readonly === "function") window.applyTab4Readonly(false);
        scheduleHr011StepStatusSync();
        return;
    }

    // 수정모드 진입 직후 탭별 이벤트/편집 상태를 다시 동기화한다.

    // tab2
    if (typeof window.initTab2 === "function") window.initTab2();
    if (typeof window.applyTab2Readonly === "function") window.applyTab2Readonly(false);
    applyHr011Tab2DualPane(true);

    // tab3
    if (typeof window.initTab3 === "function") window.initTab3();
    if (typeof window.applyTab3Readonly === "function") window.applyTab3Readonly(false);
    if (window.hr013Table && typeof window.hr013Table.redraw === "function") {
        window.hr013Table.redraw(true);
    }

    // tab4
    if (typeof window.initTab4 === "function") window.initTab4();
    if (typeof window.applyTab4Readonly === "function") window.applyTab4Readonly(false);
    applyHr011Tab4DualPane(true);
    const quickProjectBtn = document.getElementById("hr011QuickAddProjectBtn");
    if (quickProjectBtn) {
        quickProjectBtn.disabled = !isEditable;
    }
    const quickProjectRemoveBtn = document.getElementById("hr011QuickRemoveProjectBtn");
    if (quickProjectRemoveBtn) {
        quickProjectRemoveBtn.disabled = !isEditable;
    }
    scheduleHr011StepStatusSync();
}

function applyHr011Tab2DualPane(enable) {
    const shell = document.querySelector(".hr011-page .hr011-section-body .tab2-content .hr014-shell");
    if (!shell) return;
    const tableA = shell.querySelector("#TABLE_HR012_A");
    const tableB = shell.querySelector("#TABLE_HR012_B");
    const tabs = shell.querySelectorAll(".hr012-tab-btn");
    const toolbar1 = shell.querySelector(".hr012-toolbar-01");
    const toolbar2 = shell.querySelector(".hr012-toolbar-02");

    if (enable) {
        shell.classList.add("hr011-dual-pane-tab2");
        tabs.forEach(function (tab) { tab.classList.remove("active"); });
        if (toolbar1) toolbar1.style.display = "";
        if (toolbar2) toolbar2.style.display = "";
        if (tableA) tableA.style.display = "";
        if (tableB) tableB.style.display = "";
        if (window.hr012TableA && typeof window.hr012TableA.redraw === "function") window.hr012TableA.redraw(true);
        if (window.hr012TableB && typeof window.hr012TableB.redraw === "function") window.hr012TableB.redraw(true);
        return;
    }

    shell.classList.remove("hr011-dual-pane-tab2");
}

function applyHr011Tab4DualPane(enable) {
    const shell = document.querySelector(".hr011-page .hr011-section-body .tab4-content .hr014-shell");
    if (!shell) return;

    if (enable) {
        shell.classList.add("hr011-dual-pane");
        const panelA = shell.querySelector("#HR014_TAB_A");
        const panelB = shell.querySelector("#HR014_TAB_B");
        if (panelA) panelA.classList.add("active");
        if (panelB) panelB.classList.add("active");
        return;
    }

    shell.classList.remove("hr011-dual-pane");
}

function scrollHr011ToEvalRiskSection(selectedProjectId) {
    const projectId = String(selectedProjectId || "").trim();
    if ($(".hr011-page").hasClass("is-edit-mode")) {
        goHr011EditStep("eval-risk");
        if (projectId) {
            setTimeout(function () {
                window.hr013_prj_nm = projectId;
                const $select = $(".tab4-content .select_prj_cd");
                if ($select.length) {
                    $select.val(projectId);
                }
                if (typeof window.reloadTab4 === "function") {
                    window.reloadTab4(projectId).catch(function () {});
                }
            }, 220);
        }
        return;
    }
    const targetPanel = document.getElementById("HR014_TAB_A");
    if (!targetPanel) return;
    const section = targetPanel.closest(".hr011-section");
    if (!section) return;
    scrollHr011SectionIntoView(section);
    if (projectId && typeof window.reloadTab4 === "function") {
        window.hr013_prj_nm = projectId;
        setTimeout(function () {
            window.reloadTab4(projectId).catch(function () {});
        }, 220);
    }
}

// 인적사항 정보 > 상세보기
function buildHr011ProfileDetailMarkup() {
    const row = hr011CurrentRow || {};
    const contract = window.hr011Data || {};
    const sideRows = [
        ["투입 가능", row.avail_dt || "-"],
        ["희망단가", row.hope_rate_amt ? formatAmount(row.hope_rate_amt) : "-"],
        ["경력", row.exp_yr ? formatCareerYearMonth(row.exp_yr) : "-"]
    ];
    const basicRows = [
        ["성명", row.dev_nm || "-"],
        ["구분", resolveHr011DevTypeValue(row) === "HCNC_F" ? "프리랜서" : "직원"],
        ["생년월일", row.brdt || "-"],
        ["연락처", row.tel || "-"],
        ["이메일", row.email || "-"],
        ["근무가능형태", hr011MainSelectMaps.workMd[row.work_md] || row.work_md || "-"],
        ["계약형태", hr011MainSelectMaps.ctrtTyp[row.ctrt_typ] || row.ctrt_typ || "-"],
        ["KOSA 등급", hr011MainSelectMaps.kosa[row.kosa_grd_cd] || row.kosa_grd_cd || "-"],
        ["주요 분야", hr011MainSelectMaps.mainFld[row.main_fld_cd] || row.main_fld_cd || "-"],
        ["주요 고객사", hr011MainSelectMaps.mainCust[row.main_cust_cd] || row.main_cust_cd || "-"],
        ["보유 자격증", row.cert_txt || "-"],
        ["등급", `${$.trim($("#grade").text() || "-")} ${$.trim($("#score").text() || "")}`.trim()]
    ];

    return [
        `<div class="hr011-ref-profile-detail-wrap">`,
        `<article class="hr011-ref-detail-card">`,
        // `<h6>인적정보</h6>`,
        `<div class="hr011-ref-profile-layout">`,
        `<div class="hr011-ref-simple-grid hr011-ref-simple-grid--profile">`,
        basicRows.map(function (item) {
            return `<div class="hr011-ref-simple-item"><span>${escapeHr011(item[0])}</span><strong>${escapeHr011(item[1])}</strong></div>`;
        }).join(""),
        `</div>`,
        `<aside class="hr011-ref-profile-side">`,
        sideRows.map(function (item) {
            return `<div class="hr011-ref-profile-side-item"><span>${escapeHr011(item[0])}</span><strong>${escapeHr011(item[1])}</strong></div>`;
        }).join(""),
        `</aside>`,
        `</div>`,
        `</article>`,
        `<article class="hr011-ref-detail-card">`,
        `<h6>소속 및 계약정보</h6>`,
        `<table class="hr011-ref-contract-table">`,
        `<tbody>`,
        `<tr><th>소속사</th><td>${escapeHr011(contract.org_nm || "-")}</td><th>사업자유형</th><td>${escapeHr011(bizTypMap[contract.biz_typ] || contract.biz_typ || "-")}</td></tr>`,
        `<tr><th>계약시작일</th><td>${escapeHr011(formatHr011Date(contract.st_dt))}</td><th>계약종료일</th><td>${escapeHr011(formatHr011Date(contract.ed_dt))}</td></tr>`,
        `<tr><th>계약금액</th><td>${escapeHr011(formatAmount(contract.amt))}</td><th>비고</th><td>${escapeHr011(contract.remark || "-")}</td></tr>`,
        `</tbody>`,
        `</table>`,
        `</article>`,
        `</div>`
    ].join("");
}

function buildHr011SkillsDetailMarkup() {
    const rows = hr011SummarySkillRows || [];
    const categoryRows = (hr011RefSkillCategoryRows || []).map(function (row, idx) {
        const values = parseHr011SkillList(row.value);
        return {
            name: row.name || "-",
            text: values.length ? values.join(", ") : "-",
            color: getHr011SkillCategoryColor(idx)
        };
    });
    return [
        `<article class="hr011-ref-detail-card hr011-ref-skill-detail">`,
        `<div class="hr011-ref-skill-detail-left">`,
        `<div class="hr011-ref-skill-gauge-wrap"><div class="hr011-ref-skill-gauge" id="hr011RefSkillGaugeDetail"></div></div>`,
        `<div class="hr011-ref-skill-list hr011-ref-skill-list--detail">`,
        (categoryRows.length ? categoryRows : [{ name: "미등록", text: "-", color: getHr011SkillCategoryColor(0) }]).map(function (item) {
            return `<div class="hr011-ref-skill-row hr011-skill-stagger-item" style="--hr011-skill-cat-color:${item.color};"><div class="cat">${escapeHr011(item.name)}</div><div class="val">${escapeHr011(item.text)}</div></div>`;
        }).join(""),
        `</div>`,
        `</div>`,
        `<div class="hr011-ref-skill-detail-right">`,
        `<table class="hr011-ref-score-table">`,
        `<thead><tr><th>기술</th><th>숙련도</th></tr></thead>`,
        `<tbody>`,
        (rows.length ? rows : [{ name: "미등록", level: 0 }]).map(function (item) {
            const level = Number(item.level) || 0;
            const stars = [1, 2, 3, 4, 5].map(function (idx) {
                return `<span class="hr011-star ${idx <= level ? "is-on" : ""}">★</span>`;
            }).join("");
            return [
                `<tr class="hr011-skill-score-row">`,
                `<td class="label">${escapeHr011(item.name)}</td>`,
                `<td><div class="hr011-stars-wrap">${stars}<span class="hr011-stars-score">${level}/5</span></div></td>`,
                `</tr>`
            ].join("");
        }).join(""),
        `</tbody>`,
        `</table>`,
        `</div>`,
        `</article>`
    ].join("");
}

function buildHr011ProjectDetailMarkup() {
    resetHr011ProjectEvaluationState();
    const rows = hr011RefProjectRows || [];
    if (!rows.length) {
        return `<article class="hr011-ref-detail-card"><h6>프로젝트이력</h6><p>등록된 프로젝트가 없습니다.</p></article>`;
    }

    return [
        `<div class="hr011-ref-project-detail-list">`,
        rows.map(function (item, idx) {
            const stacks = parseHr011SkillList(item.stack_txt_nm || item.stack_txt);
            const company = item.org_nm || item.cust_nm || item.cli_nm || "-";
            const period = formatHr011Period(item.st_dt, item.ed_dt);
            const projectKey = String(item.dev_prj_id || `row-${idx}`);
            const projectDomId = makeHr011SafeDomId(projectKey);
            const isInternal = isHr011InternalProject(item);
            hr011RefProjectEvalCache.set(projectKey, createHr011ProjectEvalState(item, projectKey, projectDomId));
            return [
                `<article class="hr011-ref-project-detail-item" data-project-key="${escapeHr011(projectKey)}" data-internal="${isInternal ? "Y" : "N"}">`,
                `<div class="hr011-ref-project-detail-summary">`,
                `<div class="hr011-ref-project-detail-main">`,
                `<div class="hr011-ref-project-detail-headline">`,
                buildHr011ProjectCompanyBadge(item, company, isInternal),
                `<div class="hr011-ref-project-detail-role">${escapeHr011(item.role_nm || "-")}</div>`,
                `</div>`,
                `<div class="hr011-ref-project-detail-title">${escapeHr011(item.prj_nm || "-")}</div>`,
                `<div class="hr011-ref-project-detail-meta">`,
                `<span class="meta-pill meta-pill--period"><i class="meta-ico meta-ico--period" aria-hidden="true"></i><em class="meta-key">기간</em><strong>${escapeHr011(period)}</strong></span>`,
                `<span class="meta-pill"><i class="meta-ico meta-ico--amount" aria-hidden="true"></i><em class="meta-key">단가</em><strong>${escapeHr011(item.rate_amt ? formatAmount(item.rate_amt) : "-")}</strong></span>`,
                `<span class="meta-pill"><i class="meta-ico meta-ico--alloc" aria-hidden="true"></i><em class="meta-key">투입률</em><strong>${escapeHr011(item.alloc_pct ? `${item.alloc_pct}%` : "-")}</strong></span>`,
                `</div>`,
                `<div class="hr011-ref-project-detail-stack">${(stacks.length ? stacks : ["-"]).slice(0, 10).map(function (stack) { return `<span class="chip">${escapeHr011(stack)}</span>`; }).join("")}</div>`,
                `</div>`,
                isInternal
                    ? [
                        `<aside class="hr011-ref-project-eval-side">`,
                        `<div class="hr011-ref-project-eval-side-title">프로젝트 개인 평가</div>`,
                        `<div class="hr011-ref-project-eval-radar" id="hr011RefProjectEvalRadar-${projectDomId}"></div>`,
                        `<div class="hr011-ref-project-eval-meta" id="hr011RefProjectEvalMeta-${projectDomId}">평가 데이터 확인 중...</div>`,
                        `<button type="button" class="hr011-ref-project-eval-toggle" data-project-key="${escapeHr011(projectKey)}">평가 보기</button>`,
                        `</aside>`
                    ].join("")
                    : [
                        `<aside class="hr011-ref-project-eval-side hr011-ref-project-eval-side--readonly">`,
                        `<div class="hr011-ref-project-eval-external">외부 프로젝트</div>`,
                        `</aside>`
                    ].join(""),
                `</div>`,
                isInternal
                    ? [
                        `<section class="hr011-ref-project-eval-panel" id="hr011RefProjectEvalPanel-${projectDomId}" hidden>`,
                        `<div class="hr011-ref-project-eval-content" id="hr011RefProjectEvalContent-${projectDomId}">`,
                        `<div class="hr011-ref-project-eval-loading">평가 데이터를 불러오는 중입니다.</div>`,
                        `</div>`,
                        `</section>`
                    ].join("")
                    : "",
                `</article>`
            ].join("");
        }).join(""),
        `</div>`
    ].join("");
}

function resetHr011ProjectEvaluationState() {
    hr011RefProjectEvalCache = new Map();
    if (hr011RefProjectRadarCharts && typeof hr011RefProjectRadarCharts.forEach === "function") {
        hr011RefProjectRadarCharts.forEach(function (chart) {
            if (chart && typeof chart.dispose === "function") chart.dispose();
        });
    }
    hr011RefProjectRadarCharts = new Map();
}

function createHr011ProjectEvalState(item, projectKey, domId) {
    return {
        projectKey: projectKey,
        domId: domId,
        projectId: String(item?.dev_prj_id || ""),
        isInternal: isHr011InternalProject(item),
        expanded: false,
        loaded: false,
        loading: false,
        evalRows: [],
        risk: {
            leave_txt: "",
            claim_txt: "",
            sec_txt: "",
            re_in_yn: "N",
            memo: ""
        }
    };
}

function makeHr011SafeDomId(raw) {
    const text = String(raw == null ? "" : raw);
    return text.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getHr011ExternalCompanyBadgeText(companyName) {
    const text = String(companyName || "").replace(/\s+/g, "").trim();
    if (!text) return "외부";
    return text.slice(0, 6);
}

function buildHr011ProjectCompanyBadge(item, companyName, isInternal) {
    const company = companyName || "-";
    if (isInternal) {
        return [
            `<div class="hr011-ref-project-company-wrap">`,
            buildHr011ProjectBadgeMarkup(company, true),
            `<span class="hr011-ref-project-detail-company">${escapeHr011(company)}</span>`,
            `</div>`
        ].join("");
    }

    return [
        `<div class="hr011-ref-project-company-wrap">`,
        buildHr011ProjectBadgeMarkup(company, false),
        `<span class="hr011-ref-project-detail-company">${escapeHr011(company)}</span>`,
        `</div>`
    ].join("");
}

function buildHr011ProjectBadgeMarkup(companyName, isInternal) {
    if (isInternal) {
        return [
            `<span class="hr011-ref-project-company-badge hr011-ref-project-company-badge--internal" aria-hidden="true">`,
            `<img src="/images/common/header-logo.png" alt="HCNC 로고">`,
            `</span>`
        ].join("");
    }

    return `<span class="hr011-ref-project-company-badge hr011-ref-project-company-badge--external" aria-hidden="true">${escapeHr011(getHr011ExternalCompanyBadgeText(companyName))}</span>`;
}

function isHr011InternalProject(item) {
    const inprjYn = String(item?.inprj_yn || "").toUpperCase();
    if (inprjYn === "Y") return true;
    const company = `${item?.org_nm || ""} ${item?.cust_nm || ""}`.toUpperCase();
    return company.includes("HCNC");
}

function resolveHr011EvalLevelFromRow(row) {
    if (row.lv5 === "Y" || row.lv5 === true) return 5;
    if (row.lv4 === "Y" || row.lv4 === true) return 4;
    if (row.lv3 === "Y" || row.lv3 === true) return 3;
    if (row.lv2 === "Y" || row.lv2 === true) return 2;
    if (row.lv1 === "Y" || row.lv1 === true) return 1;
    return 0;
}

function applyHr011EvalLevel(row, level) {
    row.lv1 = level === 1 ? "Y" : "N";
    row.lv2 = level === 2 ? "Y" : "N";
    row.lv3 = level === 3 ? "Y" : "N";
    row.lv4 = level === 4 ? "Y" : "N";
    row.lv5 = level === 5 ? "Y" : "N";
}

function initializeHr011ProjectDetailEvaluations() {
    hr011RefProjectEvalCache.forEach(function (state, projectKey) {
        if (!state || !state.isInternal) return;
        loadHr011ProjectEvaluationState(projectKey).then(function () {
            renderHr011ProjectEvalSummary(projectKey);
        });
    });
}

async function loadHr011ProjectEvaluationState(projectKey) {
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state || !state.isInternal || !state.projectId) return state;
    if (state.loading || state.loaded) return state;

    state.loading = true;
    try {
        const devId = window.currentDevId || (hr011CurrentRow && hr011CurrentRow.dev_id) || $("#dev_id").val();
        const [evalResponse, riskResponse] = await Promise.all([
            $.ajax({
                url: "/hr014/a/list",
                type: "GET",
                data: {
                    dev_id: devId,
                    dev_prj_id: state.projectId
                }
            }).then(function (response) {
                return response;
            }, function () {
                return { list: [] };
            }),
            $.ajax({
                url: "/hr014/b/list",
                type: "GET",
                data: {
                    dev_id: devId,
                    dev_prj_id: state.projectId
                }
            }).then(function (response) {
                return response;
            }, function () {
                return { list: [] };
            })
        ]);

        const evalRows = Array.isArray(evalResponse?.list) ? evalResponse.list : [];
        state.evalRows = evalRows.map(function (row) {
            return {
                eval_id: String(row.eval_id || ""),
                cd_nm: row.cd_nm || row.eval_id || "-",
                lv1: row.lv1 === "Y" ? "Y" : "N",
                lv2: row.lv2 === "Y" ? "Y" : "N",
                lv3: row.lv3 === "Y" ? "Y" : "N",
                lv4: row.lv4 === "Y" ? "Y" : "N",
                lv5: row.lv5 === "Y" ? "Y" : "N",
                cmt: row.cmt || ""
            };
        });

        const riskRow = Array.isArray(riskResponse?.list) && riskResponse.list.length
            ? riskResponse.list[0]
            : {};
        state.risk = {
            leave_txt: riskRow.leave_txt || "",
            claim_txt: riskRow.claim_txt || "",
            sec_txt: riskRow.sec_txt || "",
            re_in_yn: riskRow.re_in_yn || "N",
            memo: riskRow.memo || ""
        };
        state.loaded = true;
    } finally {
        state.loading = false;
    }
    return state;
}

function renderHr011ProjectEvalSummary(projectKey) {
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state) return;

    const metaEl = document.getElementById(`hr011RefProjectEvalMeta-${state.domId}`);
    if (metaEl) {
        const scores = state.evalRows.map(function (row) { return resolveHr011EvalLevelFromRow(row); }).filter(function (v) { return v > 0; });
        if (!scores.length) {
            metaEl.textContent = "개인평가 데이터가 없습니다.";
        } else {
            const avg = scores.reduce(function (sum, v) { return sum + v; }, 0) / scores.length;
            metaEl.textContent = `개인평가 평균 ${avg.toFixed(1)}점 (5점 만점)`;
        }
    }
    renderHr011ProjectEvalRadar(projectKey);
}

function renderHr011ProjectEvalRadar(projectKey) {
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state) return;
    const chartEl = document.getElementById(`hr011RefProjectEvalRadar-${state.domId}`);
    if (!chartEl || typeof echarts !== "object" || typeof echarts.init !== "function") return;
    if ((chartEl.clientWidth <= 0 || chartEl.clientHeight <= 0)) {
        const retry = Number(chartEl.dataset.animRetry || 0);
        if (retry < 10) {
            chartEl.dataset.animRetry = String(retry + 1);
            requestAnimationFrame(function () {
                setTimeout(function () {
                    renderHr011ProjectEvalRadar(projectKey);
                }, 90);
            });
        }
        return;
    }
    delete chartEl.dataset.animRetry;

    const rows = state.evalRows || [];
    const hasData = rows.some(function (row) { return resolveHr011EvalLevelFromRow(row) > 0; });
    let chart = hr011RefProjectRadarCharts.get(projectKey);

    if (!hasData) {
        if (chart && typeof chart.dispose === "function") {
            chart.dispose();
        }
        hr011RefProjectRadarCharts.delete(projectKey);
        chartEl.innerHTML = `<div class="hr011-ref-project-eval-empty">평가 없음</div>`;
        return;
    }

    if (!chart || (typeof chart.getDom === "function" && chart.getDom() !== chartEl)) {
        // 기존 인스턴스가 없을 때만 placeholder를 정리한다.
        if (chartEl.querySelector(".hr011-ref-project-eval-empty")) {
            chartEl.innerHTML = "";
        }
        if (chart && typeof chart.dispose === "function") {
            chart.dispose();
        }
        chart = typeof echarts.getInstanceByDom === "function"
            ? echarts.getInstanceByDom(chartEl)
            : null;
        if (!chart) {
            chart = echarts.init(chartEl, null, { renderer: "svg" });
        }
        hr011RefProjectRadarCharts.set(projectKey, chart);
    }
    if (typeof chart.clear === "function") {
        chart.clear();
    }

    const indicators = rows.map(function (row) {
        const scoreText = Number(resolveHr011EvalLevelFromRow(row) || 0).toFixed(1);
        return {
            name: `${row.cd_nm || row.eval_id || "-"} ${scoreText}점`,
            max: 5
        };
    });
    const values = rows.map(function (row) { return resolveHr011EvalLevelFromRow(row); });

    chart.setOption({
        animation: true,
        animationDuration: 920,
        animationEasing: "quarticOut",
        animationDurationUpdate: 560,
        animationEasingUpdate: "cubicInOut",
        animationDelay: function (idx) { return idx * 54; },
        graphic: [{
            type: "text",
            left: 8,
            top: 6,
            style: {
                text: "5점 만점",
                fill: "#6f84a3",
                fontSize: 11,
                fontWeight: 700
            }
        }],
        radar: {
            center: ["50%", "54%"],
            radius: "66%",
            splitNumber: 5,
            indicator: indicators,
            axisName: { color: "#6b84a7", fontSize: 12, fontWeight: 700 },
            splitArea: { areaStyle: { color: ["#ffffff", "#f7faff"] } },
            splitLine: { lineStyle: { color: "#dfE7f4" } },
            axisLine: { lineStyle: { color: "#dfE7f4" } }
        },
        series: [{
            type: "radar",
            symbol: "circle",
            symbolSize: 6,
            animation: true,
            animationDuration: 920,
            animationEasing: "quarticOut",
            lineStyle: { width: 2, color: "#4f6ff7" },
            itemStyle: { color: "#4f6ff7" },
            areaStyle: { color: "rgba(79, 111, 247, 0.16)" },
            data: [{ value: values, name: "개인평가" }]
        }]
    }, true);

    if (typeof chart.resize === "function") {
        requestAnimationFrame(function () {
            chart.resize();
            setTimeout(function () {
                chart.resize();
            }, 120);
        });
    }
}

async function toggleHr011ProjectEvaluationPanel(projectKey) {
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state) return;
    const panelEl = document.getElementById(`hr011RefProjectEvalPanel-${state.domId}`);
    const toggleBtn = Array.from(document.querySelectorAll(".hr011-ref-project-eval-toggle")).find(function (el) {
        return String(el.getAttribute("data-project-key") || "") === projectKey;
    });
    if (!panelEl) return;

    state.expanded = !state.expanded;
    if (toggleBtn) {
        toggleBtn.textContent = state.expanded ? "평가 닫기" : "평가 보기";
    }
    if (state.expanded) {
        panelEl.hidden = false;
        requestAnimationFrame(function () {
            panelEl.classList.add("is-open");
        });
        const contentEl = document.getElementById(`hr011RefProjectEvalContent-${state.domId}`);
        if (contentEl && !state.loaded) {
            contentEl.innerHTML = `<div class="hr011-ref-project-eval-loading">평가 데이터를 불러오는 중입니다.</div>`;
        }
        await loadHr011ProjectEvaluationState(projectKey);
        renderHr011ProjectEvaluationContent(projectKey);
        // 패널 확장 애니메이션 완료 이후(높이 확보 후) 레이더를 한 번 더 렌더한다.
        setTimeout(function () {
            renderHr011ProjectEvalSummary(projectKey);
        }, 360);
    } else {
        panelEl.classList.remove("is-open");
        setTimeout(function () {
            if (!state.expanded) panelEl.hidden = true;
        }, 280);
    }

    renderHr011ProjectEvalSummary(projectKey);
    requestAnimationFrame(function () {
        const chart = hr011RefProjectRadarCharts.get(projectKey);
        if (chart && typeof chart.resize === "function") {
            chart.resize();
        }
    });
}

function renderHr011ProjectEvaluationContent(projectKey) {
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state) return;
    const contentEl = document.getElementById(`hr011RefProjectEvalContent-${state.domId}`);
    if (!contentEl) return;
    const isEditable = hr011Mode === "update";

    const capabilityPane = buildHr011ProjectCapabilityPane(projectKey, state, isEditable);
    const riskPane = buildHr011ProjectRiskPane(projectKey, state, isEditable);
    contentEl.innerHTML = `<div class="hr011-ref-project-eval-split">${capabilityPane}${riskPane}</div>`;
}

function buildHr011ProjectCapabilityPane(projectKey, state) {
    const rows = state.evalRows && state.evalRows.length
        ? state.evalRows
        : [{ eval_id: "", cd_nm: "평가 항목 미등록", lv1: "N", lv2: "N", lv3: "N", lv4: "N", lv5: "N", cmt: "" }];
    const isEditable = hr011Mode === "update";
    if (!isEditable) {
        return [
            `<section class="hr011-ref-project-eval-pane-card" data-tab="capability">`,
            `<h6>역량 평가 <em class="hr011-ref-project-capability-max">5점 만점</em></h6>`,
            `<div class="hr011-ref-project-capability-view-grid">`,
            `<div class="hr011-ref-project-capability-view-list">`,
            rows.map(function (row) {
                const level = resolveHr011EvalLevelFromRow(row);
                const scoreText = level > 0 ? `${level}점` : "없음";
                return `<span class="hr011-ref-project-capability-chip">${escapeHr011(row.cd_nm || "-")} ${escapeHr011(scoreText)}</span>`;
            }).join(""),
            `</div>`,
            `<div class="hr011-ref-project-capability-memo-box">`,
            `<strong>평가 메모</strong>`,
            `<div class="hr011-ref-project-capability-memo-list">`,
            rows.map(function (row) {
                const memo = $.trim(String(row.cmt || ""));
                return `<p><span>${escapeHr011(row.cd_nm || "-")}</span><em>${escapeHr011(memo || "없음")}</em></p>`;
            }).join(""),
            `</div>`,
            `</div>`,
            `</div>`,
            `</section>`
        ].join("");
    }

    return [
        `<section class="hr011-ref-project-eval-pane-card" data-tab="capability">`,
        `<h6>역량 평가 <em class="hr011-ref-project-capability-max">5점 만점</em></h6>`,
        `<div class="hr011-ref-project-capability-list ${isEditable ? "is-edit" : "is-view"}">`,
        rows.map(function (row, rowIndex) {
            const level = resolveHr011EvalLevelFromRow(row);
            const isPlaceholder = !row.eval_id;
            return [
                `<article class="hr011-ref-project-capability-item ${isPlaceholder ? "is-placeholder" : ""} ${isEditable ? "is-edit" : "is-view"}">`,
                `<div class="hr011-ref-project-capability-head">`,
                `<strong class="title">${escapeHr011(row.cd_nm || "-")}</strong>`,
                `</div>`,
                `<div class="hr011-ref-project-capability-scale">`,
                [1, 2, 3, 4, 5].map(function (score) {
                    return `<button type="button" class="hr011-ref-eval-score-btn ${score === level ? "is-on" : ""}" data-project-key="${escapeHr011(projectKey)}" data-row-index="${rowIndex}" data-level="${score}" ${isPlaceholder || !isEditable ? "disabled" : ""}>${score}</button>`;
                }).join(""),
                `</div>`,
                isEditable
                    ? `<input type="text" class="hr011-ref-eval-comment-input" data-project-key="${escapeHr011(projectKey)}" data-row-index="${rowIndex}" value="${escapeHr011(row.cmt || "")}" ${isPlaceholder ? "disabled" : ""} placeholder="평가의견을 입력하세요.">`
                    : ``,
                `</article>`
            ].join("");
        }).join(""),
        `</div>`,
        `</section>`
    ].join("");
}

function buildHr011ProjectRiskPane(projectKey, state) {
    const risk = state.risk || {};
    const isEditable = hr011Mode === "update";
    if (!isEditable) {
        return [
            `<section class="hr011-ref-project-eval-pane-card" data-tab="risk">`,
            `<h6>리스크 평가</h6>`,
            `<div class="hr011-ref-project-risk-inline-list">`,
            `<div class="row"><span>이탈이력</span><p>${escapeHr011(risk.leave_txt || "없음")}</p></div>`,
            `<div class="row"><span>클레임</span><p>${escapeHr011(risk.claim_txt || "없음")}</p></div>`,
            `<div class="row"><span>보안이슈</span><p>${escapeHr011(risk.sec_txt || "없음")}</p></div>`,
            `<div class="row"><span>관리메모</span><p>${escapeHr011(risk.memo || "없음")}</p></div>`,
            `<div class="row"><span>재투입</span><p>${String(risk.re_in_yn || "N") === "Y" ? "가능" : "불가"}</p></div>`,
            `</div>`,
            `</section>`
        ].join("");
    }

    return [
        `<section class="hr011-ref-project-eval-pane-card" data-tab="risk">`,
        `<h6>리스크 평가</h6>`,
        `<div class="hr011-ref-project-risk-grid">`,
        `<label><span>이탈이력</span><textarea class="hr011-ref-risk-input" data-project-key="${escapeHr011(projectKey)}" data-field="leave_txt" ${isEditable ? "" : "readonly"} placeholder="${isEditable ? "이탈 관련 이슈를 입력하세요." : ""}">${escapeHr011(risk.leave_txt || "")}</textarea></label>`,
        `<label><span>클레임</span><textarea class="hr011-ref-risk-input" data-project-key="${escapeHr011(projectKey)}" data-field="claim_txt" ${isEditable ? "" : "readonly"} placeholder="${isEditable ? "클레임 이슈를 입력하세요." : ""}">${escapeHr011(risk.claim_txt || "")}</textarea></label>`,
        `<label><span>보안이슈</span><textarea class="hr011-ref-risk-input" data-project-key="${escapeHr011(projectKey)}" data-field="sec_txt" ${isEditable ? "" : "readonly"} placeholder="${isEditable ? "보안 이슈를 입력하세요." : ""}">${escapeHr011(risk.sec_txt || "")}</textarea></label>`,
        `<label><span>관리메모</span><textarea class="hr011-ref-risk-input" data-project-key="${escapeHr011(projectKey)}" data-field="memo" ${isEditable ? "" : "readonly"} placeholder="${isEditable ? "관리 메모를 입력하세요." : ""}">${escapeHr011(risk.memo || "")}</textarea></label>`,
        `</div>`,
        `<label class="hr011-ref-project-risk-check"><input type="checkbox" class="hr011-ref-risk-rein-check" data-project-key="${escapeHr011(projectKey)}" ${String(risk.re_in_yn || "N") === "Y" ? "checked" : ""} ${isEditable ? "" : "disabled"}> 재투입 가능</label>`,
        `</section>`
    ].join("");
}

function updateHr011ProjectEvalLevel(projectKey, rowIndex, level) {
    if (hr011Mode !== "update") return;
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state || !Array.isArray(state.evalRows) || !state.evalRows[rowIndex]) return;
    applyHr011EvalLevel(state.evalRows[rowIndex], level);
    renderHr011ProjectEvaluationContent(projectKey);
    renderHr011ProjectEvalSummary(projectKey);
}

function updateHr011ProjectEvalComment(projectKey, rowIndex, comment) {
    if (hr011Mode !== "update") return;
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state || !Array.isArray(state.evalRows) || !state.evalRows[rowIndex]) return;
    state.evalRows[rowIndex].cmt = String(comment || "");
}

function updateHr011ProjectRiskField(projectKey, field, value) {
    if (hr011Mode !== "update") return;
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state || !state.risk) return;
    state.risk[field] = String(value || "");
}

// async function saveHr011ProjectEvaluation(projectKey) {
//     const state = hr011RefProjectEvalCache.get(projectKey);
//     if (!state || !state.projectId) return;
//     const devId = window.currentDevId || (hr011CurrentRow && hr011CurrentRow.dev_id) || $("#dev_id").val();
//     if (!devId) {
//         await showAlert({ icon: "warning", title: "안내", text: "평가 저장 대상 인력 정보가 없습니다." });
//         return;
//     }
//
//     const evalRows = (state.evalRows || [])
//         .map(function (row) {
//             return {
//                 dev_prj_id: state.projectId,
//                 eval_id: row.eval_id,
//                 lvl: resolveHr011EvalLevelFromRow(row),
//                 cmt: row.cmt || ""
//             };
//         })
//         .filter(function (row) {
//             return row.eval_id && row.lvl > 0;
//         });
//
//     const riskRow = [{
//         dev_prj_id: state.projectId,
//         leave_txt: state.risk.leave_txt || "",
//         claim_txt: state.risk.claim_txt || "",
//         sec_txt: state.risk.sec_txt || "",
//         re_in_yn: state.risk.re_in_yn || "N",
//         memo: state.risk.memo || ""
//     }];
//
//     try {
//         await $.ajax({
//             url: "/hr014/a/save",
//             type: "POST",
//             data: {
//                 dev_id: devId,
//                 rows: JSON.stringify(evalRows)
//             }
//         });
//         await $.ajax({
//             url: "/hr014/b/save",
//             type: "POST",
//             data: {
//                 dev_id: devId,
//                 rows: JSON.stringify(riskRow)
//             }
//         });
//         renderHr011ProjectEvalSummary(projectKey);
//     } catch (error) {
//         throw error;
//     }
// }

async function saveHr011ProjectEvaluationAll() {
    const keys = Array.from(hr011RefProjectEvalCache.keys());
    for (let i = 0; i < keys.length; i += 1) {
        const projectKey = keys[i];
        const state = hr011RefProjectEvalCache.get(projectKey);
        if (!state || !state.isInternal || !state.projectId || !state.loaded) continue;
        // await saveHr011ProjectEvaluation(projectKey);
    }
}

function renderHr011RefSkillGaugeChart(targetId) {
    const gaugeEl = document.getElementById(targetId || "hr011RefSkillGauge");
    if (!gaugeEl || typeof echarts !== "object" || typeof echarts.init !== "function") return;
    if ((gaugeEl.clientWidth <= 0 || gaugeEl.clientHeight <= 0)) {
        const retry = Number(gaugeEl.dataset.animRetry || 0);
        if (retry < 3) {
            gaugeEl.dataset.animRetry = String(retry + 1);
            requestAnimationFrame(function () {
                setTimeout(function () {
                    renderHr011RefSkillGaugeChart(targetId);
                }, 60);
            });
        }
        return;
    }
    delete gaugeEl.dataset.animRetry;
    const isDetailChart = String(targetId || "").toLowerCase().includes("detail");
    const showSideLegend = !isDetailChart;

    const pieRows = (hr011RefSkillCategoryRows || []).map(function (row, idx) {
        const count = parseHr011SkillList(row.value).length;
        return {
            name: row.name || `역량${idx + 1}`,
            value: count,
            itemStyle: { color: getHr011SkillCategoryColor(idx) }
        };
    }).filter(function (row) { return row.value > 0; });
    const pieData = pieRows.length ? pieRows : [{ name: "미등록", value: 1, itemStyle: { color: "#d7e2f2" } }];
    const totalValue = pieData.reduce(function (sum, row) { return sum + (Number(row.value) || 0); }, 0) || 1;

    let chartInstance = isDetailChart ? hr011RefSkillGaugeDetailChart : hr011RefSkillGaugeChart;
    if (!chartInstance || (typeof chartInstance.getDom === "function" && chartInstance.getDom() !== gaugeEl)) {
        if (chartInstance && typeof chartInstance.dispose === "function") {
            chartInstance.dispose();
        }
        chartInstance = typeof echarts.getInstanceByDom === "function"
            ? echarts.getInstanceByDom(gaugeEl)
            : null;
        if (!chartInstance) {
            chartInstance = echarts.init(gaugeEl, null, { renderer: "svg" });
        }
    }
    if (isDetailChart) {
        hr011RefSkillGaugeDetailChart = chartInstance;
    } else {
        hr011RefSkillGaugeChart = chartInstance;
    }
    if (typeof chartInstance.clear === "function") {
        chartInstance.clear();
    }

    chartInstance.setOption({
        animation: true,
        animationType: "expansion",
        animationDuration: 920,
        animationEasing: "quarticOut",
        animationDurationUpdate: 560,
        animationEasingUpdate: "cubicInOut",
        animationDelay: function (idx) { return idx * 54; },
        tooltip: {
            trigger: "item",
            formatter: function (params) {
                const ratio = Math.round(((Number(params.value) || 0) / totalValue) * 100);
                return `${escapeHr011(params.name)}: ${params.value} (${ratio}%)`;
            }
        },
        legend: {
            show: showSideLegend,
            type: "scroll",
            orient: "vertical",
            right: 4,
            top: "middle",
            bottom: 12,
            itemWidth: 16,
            itemHeight: 12,
            icon: "roundRect",
            pageIconColor: "#4f78d2",
            pageIconInactiveColor: "#b6c6df",
            pageTextStyle: {
                color: "#6d86a8",
                fontSize: 12,
                fontWeight: 700
            },
            textStyle: {
                color: "#2e466c",
                fontSize: 14,
                fontWeight: 700
            },
            formatter: function (name) {
                return escapeHr011(name);
            }
        },
        series: [{
            type: "pie",
            animation: true,
            animationType: "expansion",
            animationDuration: 920,
            animationEasing: "quarticOut",
            animationDurationUpdate: 560,
            animationEasingUpdate: "cubicInOut",
            animationDelay: function (idx) { return idx * 54; },
            radius: showSideLegend ? ["48%", "73%"] : ["48%", "74%"],
            center: showSideLegend ? ["32%", "53%"] : ["50%", "53%"],
            avoidLabelOverlap: false,
            padAngle: 3,
            itemStyle: {
                borderRadius: 10,
                borderColor: "#f5f8fc",
                borderWidth: 3
            },
            label: {
                show: true,
                position: "outside",
                color: "#2c4469",
                fontSize: showSideLegend ? 12 : 14,
                fontWeight: 700,
                formatter: function (params) {
                    return `${params.name} ${Math.round(params.percent)}%`;
                }
            },
            labelLine: {
                show: true,
                length: showSideLegend ? 10 : 14,
                length2: showSideLegend ? 8 : 10,
                smooth: 0.25
            },
            data: pieData
        }]
    }, true);

    if (typeof chartInstance.resize === "function") {
        requestAnimationFrame(function () {
            chartInstance.resize();
        });
    }
}

function renderHr011RefRadarChart() {
    const chartEl = document.getElementById("hr011RefRadarChart");
    if (!chartEl || typeof echarts !== "object" || typeof echarts.init !== "function") return;
    if (!Array.isArray(hr011SummaryRadarRows) || !hr011SummaryRadarRows.length) return;

    if (!hr011RefRadarChart) {
        hr011RefRadarChart = typeof echarts.getInstanceByDom === "function"
            ? echarts.getInstanceByDom(chartEl)
            : null;
        if (!hr011RefRadarChart) {
            hr011RefRadarChart = echarts.init(chartEl, null, { renderer: "svg" });
        }
    }

    if (typeof hr011RefRadarChart.clear === "function") {
        hr011RefRadarChart.clear();
    }

    hr011RefRadarChart.setOption({
        animation: true,
        animationDuration: 900,
        animationEasing: "quarticOut",
        animationDurationUpdate: 520,
        animationEasingUpdate: "cubicInOut",
        animationDelay: function (idx) { return idx * 52; },
        graphic: [{
            type: "text",
            left: 10,
            top: 8,
            style: {
                text: "5점 만점",
                fill: "#7188a7",
                fontSize: 12,
                fontWeight: 700
            }
        }],
        radar: {
            center: ["50%", "54%"],
            radius: "74%",
            splitNumber: 5,
            indicator: hr011SummaryRadarRows.map(function (row) {
                const valueText = Number(row.value || 0).toFixed(1);
                return { name: `${row.label} ${valueText}점`, max: 5 };
            }),
            axisName: { color: "#6f86a4", fontSize: 14, fontWeight: 700 }
        },
        series: [{
            type: "radar",
            symbol: "circle",
            symbolSize: 6,
            animation: true,
            animationDuration: 900,
            animationEasing: "quarticOut",
            lineStyle: { width: 2, color: "#cf64ff" },
            itemStyle: { color: "#cf64ff" },
            areaStyle: { color: "rgba(207, 100, 255, 0.2)" },
            data: [{ value: hr011SummaryRadarRows.map(function (row) { return row.value; }) }]
        }]
    }, true);
}

// function buildHr011StarSuffix(skillName) {
//     const normalized = String(skillName || "").trim().toLowerCase();
//     if (!normalized) return "";
//
//     const skill = (hr011SummarySkillRows || []).find(function (item) {
//         return String(item.name || "").trim().toLowerCase() === normalized;
//     });
//     const level = Math.max(0, Math.min(5, Number(skill?.level || 0)));
//     if (!level) return "";
//     return `(${buildHr011Stars(level)})`;
// }

// function buildHr011Stars(level) {
//     const clamped = Math.max(0, Math.min(5, Number(level) || 0));
//     let text = "";
//     for (let i = 1; i <= 5; i += 1) {
//         text += i <= clamped ? "★" : "☆";
//     }
//     return text;
// }

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
        ? `프로젝트 ${hr011SummaryRadarProjectCount}건 기준 평균 평가 (5점 만점)`
        : "프로젝트 평가 평균 (5점 만점)";

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

    if (typeof hr011SummaryRadarChart.clear === "function") {
        hr011SummaryRadarChart.clear();
    }

    hr011SummaryRadarChart.setOption({
        animation: true,
        animationDuration: 920,
        animationEasing: "quarticOut",
        animationDurationUpdate: 560,
        animationEasingUpdate: "cubicInOut",
        animationDelay: function (idx) { return idx * 54; },
        tooltip: {
            trigger: "item",
            backgroundColor: "rgba(17, 27, 44, 0.92)",
            borderWidth: 0,
            padding: [10, 12],
            textStyle: {
                color: "#ffffff",
                fontFamily: "Pretendard, sans-serif",
                fontSize: 14
            },
            formatter: function (params) {
                const values = Array.isArray(params?.value) ? params.value : [];
                return hr011SummaryRadarRows.map(function (row, idx) {
                    const value = values[idx] != null ? values[idx] : row.value;
                    return `${escapeHr011(row.label)}: ${value}점 / 5점`;
                }).join("<br>");
            }
        },
        graphic: [{
            type: "text",
            left: 10,
            top: 8,
            style: {
                text: "5점 만점",
                fill: "#7188a7",
                fontSize: 12,
                fontWeight: 700
            }
        }],
        radar: {
            center: ["50%", "54%"],
            radius: "78%",
            splitNumber: 5,
            indicator: hr011SummaryRadarRows.map(function (row) {
                const valueText = Number(row.value || 0).toFixed(1);
                return { name: `${row.label} ${valueText}점`, max: 5 };
            }),
            axisName: {
                color: "#6f86a4",
                fontSize: 14,
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
            animation: true,
            animationDuration: 920,
            animationEasing: "quarticOut",
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
        if (hr011RefRadarChart && typeof hr011RefRadarChart.resize === "function") {
            hr011RefRadarChart.resize();
        }
        if (hr011RefSkillGaugeChart && typeof hr011RefSkillGaugeChart.resize === "function") {
            hr011RefSkillGaugeChart.resize();
        }
        if (hr011RefSkillGaugeDetailChart && typeof hr011RefSkillGaugeDetailChart.resize === "function") {
            hr011RefSkillGaugeDetailChart.resize();
        }
        if (hr011RefProjectRadarCharts && typeof hr011RefProjectRadarCharts.forEach === "function") {
            hr011RefProjectRadarCharts.forEach(function (chart) {
                if (chart && typeof chart.resize === "function") {
                    chart.resize();
                }
            });
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

    return [
        `<div class="profile-circle-icon profile-circle-icon--fallback" aria-label="기본 프로필">`,
        `<svg viewBox="0 0 64 64" role="img" aria-hidden="true">`,
        `<circle cx="32" cy="24" r="12"></circle>`,
        `<path d="M12 56c0-11 9-20 20-20s20 9 20 20"></path>`,
        `</svg>`,
        `</div>`
    ].join("");
}

function renderHr011EditMiniProfile() {
    const root = document.getElementById("hr011EditMiniProfile");
    const avatarEl = document.getElementById("hr011EditMiniAvatar");
    const nameEl = document.getElementById("hr011EditMiniName");
    const subEl = document.getElementById("hr011EditMiniSub");
    if (!root || !avatarEl || !nameEl || !subEl) return;

    const row = hr011CurrentRow || {};
    const name = $.trim($("#dev_nm").val()) || row.dev_nm || "신규 인력";
    const avatarRow = Object.assign({}, row, { dev_nm: name });
    avatarEl.innerHTML = getHr011AvatarMarkup(avatarRow);
    nameEl.textContent = name;
    subEl.textContent = hr011Mode === "insert" ? "인적사항 정보 등록" : "인적사항 정보 수정";
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

    if (!validateHr011Form()) return;

    const wasInsertMode = hr011Mode === "insert";
    try {
        showLoading();

        // main 저장
        await saveHr011MainProfile();

        // tab1 저장
        if (typeof saveHr011TableData === "function") {
            await saveHr011TableData();
        }

        // tab2 저장
        if (typeof saveHr012TableData === "function") {
            await saveHr012TableData();
        }

        // tab3 저장
        if (typeof window.saveHr013TableData === "function") {
            window.saveHr013TableData();
        }

        // tab4 저장
        if (typeof window.saveTab4All === "function") {
            await window.saveTab4All();
        }

        // 평가 저장
        await saveHr011ProjectEvaluationAll();

        const savedDevId = $.trim(window.currentDevId || $("#dev_id").val());
        if (wasInsertMode && savedDevId) {
            window.hr011EditUnlocked = false;
            window.location.href = "/hr011?dev_id=" + encodeURIComponent(savedDevId);
            return;
        }
        window.hr011EditUnlocked = false;
        setHr011Mode("view");

        // 최신 데이터 다시 조회
        await loadHr011MainDetail(savedDevId);

        hideLoading(); // 먼저 로딩 끝

        showAlert({
            icon: "success",
            title: "완료",
            text: "인적사항 상세 정보가 저장되었습니다."
        });

    } catch (error) {
        console.error(error);
        hideLoading();

        showAlert({
            icon: "error",
            title: "오류",
            text: "상세 정보 저장 중 오류가 발생했습니다."
        });
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
    formData.append("sido_cd", $("#select_sido_cd").val());
    formData.append("main_lang", $("#main_lang").val());
    formData.append("exp_yr", String(composeCareerExpValue()));
    formData.append("edu_last", $("#edu_last").val());
    formData.append("cert_txt", $("#cert_txt").val());
    formData.append("work_md", $("#select_work_md").val());
    formData.append("avail_dt", $("#avail_dt").val());
    formData.append("ctrt_typ", $("#select_ctrt_typ").val());
    let numeric = normalizeAmountValue($("#hope_rate_amt").val());
    formData.append("hope_rate_amt", numeric);
    formData.append("kosa_grd_cd", $("#select_kosa_grd_cd").val());
    formData.append("main_fld_cd", $("#select_main_fld_cd").val());
    formData.append("main_cust_cd", $("#select_main_cust_cd").val());

    const response = await $.ajax({
        url: "/hr010/upsert",
        type: "POST",
        processData: false,
        contentType: false,
        data: formData
    });

    const savedDevId = $.trim(response?.dev_id || "");
    if (savedDevId) {
        window.currentDevId = savedDevId;
        $("#dev_id").val(savedDevId);
    }
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

// 전화번호 자동변환
$(document).on("input", "#tel", function () {
    let val = $(this).val().replace(/[^0-9]/g, "");

    if (val.length < 4) {
        $(this).val(val);
    } else if (val.length < 8) {
        $(this).val(val.replace(/(\d{3})(\d+)/, "$1-$2"));
    } else {
        $(this).val(val.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3"));
    }
});

// 모달 닫기
async function closeUserViewModal() {
    console.log("changedTabs:", changedTabs);
    console.log("currentMode:", currentMode);

    // 공통 닫기 처리
    const closeAll = () => {
        // mainLangPicker?.close(true);
        closeHr012SkillPicker?.(true);
        closeHr013SkillPicker?.(true);

        $modal.removeClass("show");

        setTimeout(() => {
            $modal.hide();
            savedTabs = [];
            Object.keys(changedTabs).forEach(k => changedTabs[k] = false);
        }, 250);
    };

    // view 모드는 바로 종료
    if (currentMode === "view") {
        closeAll();
        return;
    }

    // (여기 나중에 confirm 필요하면 추가)
    closeAll();
}

// 경력연차 커스텀 스핀 버튼(+/-)
$(document).on("click", ".career-spin-btn", function () {
    var targetSelector = $(this).data("target");
    var step = parseInt($(this).data("step"), 10) || 0;
    if (!targetSelector || step === 0) {
        return;
    }

    var $target = $(targetSelector);
    if (!$target.length || $target.prop("disabled")) {
        return;
    }

    var currentYear = clampCareerYearValue($("#exp_yr_year").val());
    var currentMonth = clampCareerMonthValue($("#exp_yr_month").val());

    if (targetSelector === "#exp_yr_month") {
        if (step > 0) {
            if (currentYear >= 99 && currentMonth >= 12) {
                currentYear = 0;
                currentMonth = 0;
            } else
            if (currentMonth >= 12) {
                currentMonth = 0;
                currentYear = clampCareerYearValue(currentYear + 1);
            } else {
                currentMonth = clampCareerMonthValue(currentMonth + 1);
            }
        } else {
            if (currentMonth <= 0 && currentYear > 0) {
                currentYear = clampCareerYearValue(currentYear - 1);
                currentMonth = 12;
            } else {
                currentMonth = clampCareerMonthValue(currentMonth - 1);
            }
        }
    } else {
        if (step > 0 && currentYear >= 99 && currentMonth >= 12) {
            currentYear = 0;
            currentMonth = 0;
        } else {
            currentYear = clampCareerYearValue(currentYear + step);
        }
    }

    $("#exp_yr_year").val(currentYear);
    $("#exp_yr_month").val(currentMonth);
    normalizeCareerSpinInputs();
});

// 경력 타입 형태 맞추기 (년도)
function clampCareerYearValue(value) {
    var num = parseInt(value, 10);
    if (!Number.isFinite(num) || isNaN(num)) {
        return 0;
    }
    if (num < 0) return 0;
    if (num > 99) return 99;
    return num;
}

// 경력 타입 형태 맞추기 (월)
function clampCareerMonthValue(value) {
    var num = parseInt(value, 10);
    if (!Number.isFinite(num) || isNaN(num)) {
        return 0;
    }
    if (num < 0) return 0;
    if (num > 12) return 12;
    return num;
}

function normalizeCareerSpinInputs() {
    var years = clampCareerYearValue($("#exp_yr_year").val());
    var monthsRaw = parseInt($("#exp_yr_month").val(), 10);
    var months = Number.isFinite(monthsRaw) && !isNaN(monthsRaw) ? monthsRaw : 0;

    if (months < 0) {
        months = 0;
    }
    if (months > 12) {
        years = clampCareerYearValue(years + Math.floor(months / 12));
        months = months % 12;
    }
    if (years >= 99 && months > 12) {
        months = 12;
    }

    months = clampCareerMonthValue(months);

    $("#exp_yr_year").val(years);
    $("#exp_yr_month").val(months);
    syncCareerExpValue();
}

function setCareerSpinInputs(value) {
    if (!value) {
        $("#exp_yr_year").val(0);
        $("#exp_yr_month").val(0);
        syncCareerExpValue();
        return;
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
        $("#exp_yr_year").val(0);
        $("#exp_yr_month").val(0);
        syncCareerExpValue();
        return;
    }

    const years = Math.floor(num);
    const months = Math.round((num - years) * 12);

    $("#exp_yr_year").val(years);
    $("#exp_yr_month").val(months);

    syncCareerExpValue(); // hidden 값 동기화
}

function composeCareerExpValue() {
    var years = clampCareerYearValue($("#exp_yr_year").val());
    var months = clampCareerMonthValue($("#exp_yr_month").val());
    if (months === 0) {
        return String(years);
    }
    return years + "." + months;
}

function syncCareerExpValue() {
    $("#exp_yr").val(composeCareerExpValue());
    syncCareerExpText();
}

function syncCareerExpText(value) {
    var source = value;
    if (source === undefined || source === 0) {
        source = $("#exp_yr").val();
    }
    // $("#exp_yr_text").text(formatCareerYearMonth(source));
}

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

function clampAmount(value) {
    if (!value) return 0;
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.min(num, 999999999999.99);
}