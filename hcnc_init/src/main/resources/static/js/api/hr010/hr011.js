// hr011.js
// 통합 저장 (Tab1)
$(document).on("tab:readonly", function (_, isReadOnly) {
    setHr011Mode(isReadOnly ? "view" : "update");
});

let hr011Mode = "view";
window.hr011Data = null;

const HR011_FIELDS = "#org_nm, #select_biz_typ, #st_dt, #ed_dt, #amt, #remark"; // 데이터 담을 상수

// 사업자 유형 공통코드
var bizTypMap = [];
var bizTypOptions = [];

// ============================================================================== //

window.initTab1 = function () {
    // 개인/법인 셀렉트 공통콤보
    setComCode("select_biz_typ", "BIZ_TYP", "", "cd", "cd_nm", function () {
        bizTypOptions = $("#select_biz_typ option").map(function () {
            return { cd: this.value, cd_nm: $(this).text() };
        }).get();
        initSelectDefault("select_biz_typ", "개인/개인사업자/법인");
        bizTypMap = getBizTypMap();

        // 지금 데이터 로드
        loadHr011TableData(window.currentDevId);
    });
};

// 역할 코드 -> 라벨 맵 생성
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

// 콤보 기본 옵션/선택 처리
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
function setHr011Mode(mode) {

    hr011Mode = mode;
    const isView = mode === "view";
    const isEditable = mode === "insert" || mode === "update";
    $("#modal-title").text(
        isView ? "상세" : mode === "insert" ? "등록" : "수정"
    );
    const $fields = $(HR011_FIELDS);

    if (isEditable) {
        $fields
            .prop("disabled", false)
            .prop("readonly", false)
            .removeAttr("disabled")
            .removeAttr("readonly")
            .removeClass("is-readonly");
    } else {
        $fields
            .prop("disabled", true)
            .prop("readonly", true)
            .addClass("is-readonly");
    }
}

function openHr011(mode) {
    if (mode === "update") {
        if (!window.hr011Data) {
            alert("수정할 데이터가 없습니다.");
            return;
        }
        setHr011Mode("update");
        return;
    }

    // 신규 등록 시 최초 입력용
    if (mode === "insert") {
        clearHr011Form();
        window.hr011Data = null;
        setHr011Mode("insert");
        return;
    }

    setHr011Mode("view");
}

function fillHr011Form(data) {
    $("#org_nm").val(data.org_nm || "");
    $("#st_dt").val(data.st_dt || "");
    $("#ed_dt").val(data.ed_dt || "");
    $("#amt").val(formatNumber(data.amt));
    $("#remark").val(data.remark || "");

    if ($("#select_biz_typ option").length > 0) {
        $("#select_biz_typ").val(data.biz_typ || "");
    }
}

function clearHr011Form() {
    $(HR011_FIELDS).val("");
}

function loadHr011TableData(devId) {
    if (!devId) {
        clearHr011Form();
        setHr011Mode("insert");
        return;
    }

    $.ajax({
        url: "/hr010/tab1",
        type: "GET",
        data: { dev_id: devId },
        success: (res) => {
            const data = res?.res ?? null;
            window.hr011Data = data;
            clearHr011Form();
            if (data) {fillHr011Form(data);}
          },
        error: () => {
            alert("데이터 조회 실패");
            clearHr011Form();
            setHr011Mode("insert");
        }
    });
}

function saveHr011TableData() {
    // if (!validateHr011Form()) return; // hr010.js로 이관

    const param = {
        ctrtId: hr011Mode === "update" ? window.hr011Data?.ctrt_id : null,
        devId: window.currentDevId,
        orgNm: $("#org_nm").val(),
        bizTyp: $("#select_biz_typ").val(),
        stDt: $("#st_dt").val(),
        edDt: $("#ed_dt").val(),
        amt: unformatNumber($("#amt").val()),
        remark: $("#remark").val()
    };

    $.ajax({
        url: "/hr010/tab1_upsert",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(param),
        success: () => {
            // alert("저장되었습니다.");
            // setHr011Mode("view");
            loadHr011TableData(window.currentDevId);
        },
        error: () => alert("저장 실패")
    });
}

function deleteHr011() {
    if (!window.hr011Data?.ctrt_id) {
        alert("삭제할 데이터가 없습니다.");
        return;
    }
    if (!confirm("정말로 삭제하시겠습니까?")) return;

    $.ajax({
        url: "/hr010/tab1_delete",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            ctrtId: window.hr011Data.ctrt_id,
            devId: window.currentDevId
        }),
        success: () => {
            alert("삭제되었습니다.");
            loadHr011TableData(window.currentDevId);
        },
        error: () => alert("삭제 실패")
    });
}

// ============================================================================== //

// 유효성 검사
function validateHr011Form() {
    const orgNm   = $("#org_nm").val().trim();
    const bizTyp  = $("#select_biz_typ").val().trim();
    const stDt    = $("#st_dt").val();
    const edDt    = $("#ed_dt").val();
    const amtRaw  = unformatNumber($("#amt").val());

    const MAX_AMT = 999999999;

    if (!orgNm) {
        alert("소속사를 입력해주세요.");
        $("#org_nm").focus();
        return false;
    }

    if (!stDt) {
        alert("계약 시작일을 입력해주세요.");
        $("#st_dt").focus();
        return false;
    }

    if (!edDt) {
        alert("계약 종료일을 입력해주세요.");
        $("#ed_dt").focus();
        return false;
    }

    if (new Date(stDt) > new Date(edDt)) {
        alert("계약 종료일은 시작일 이후여야 합니다.");
        $("#ed_dt").focus();
        return false;
    }

    if (!bizTyp || bizTyp == null) {
        alert("사업자 유형을 선택해주세요.");
        $("#select_biz_typ").focus();
        return false;
    }

    if (!amtRaw) {
        alert("계약 금액을 입력해주세요.");
        $("#amt").focus();
        return false;
    }

    if (isNaN(amtRaw) || Number(amtRaw) <= 0) {
        alert("계약 금액은 0보다 큰 숫자여야 합니다.");
        $("#amt").focus();
        return false;
    }

    if (Number(amtRaw) > MAX_AMT) {
        alert("계약 금액은 최대 999,999,999원까지 입력 가능합니다.");
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
$("#amt").on("input", function () {
    let input_number = this.value.replace(/[^0-9]/g, "");
    this.value = formatNumber(input_number);
});

// 문자열 가공
function unformatNumber(str) {
    return str ? str.replace(/,/g, "") : "";
}