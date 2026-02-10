// 사용자 관리 - 소속 및 계약 정보 hr011.js (hcnc_hms)

// view일 때는 수정 불가, update일 때는 수정 가능
$(document).on("tab:readonly", function (_, isReadOnly) {
    setHr011Mode(isReadOnly ? "view" : "update");
});

// mode 초기값 : view, 테이블 데이터 초기값 : null
let hr011Mode = "view";
window.hr011Data = null;

const HR011_FIELDS = "#org_nm, #select_biz_typ, #st_dt, #ed_dt, #amt, #remark"; // 데이터 담을 상수

// 사업자 유형 공통코드
var bizTypMap = [];
var bizTypOptions = [];

// ============================================================================== //

// Tab1 초기값 설정
window.initTab1 = function () {
    // 개인, 법인 셀렉트 공통콤보
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
function setHr011Mode(mode) {
    hr011Mode = mode;
    const isView = mode === "view"; // view일 때는 수정불가능
    const isEditable = mode === "insert" || mode === "update"; // insert와 update는 수정가능
    $("#modal-title").text(
        isView ? "상세" : mode === "insert" ? "등록" : "수정"
    );
    const $fields = $(HR011_FIELDS);

    if (isEditable) { // insert, update mode일 때
        $fields
            .prop("disabled", false)
            .prop("readonly", false)
            .removeAttr("disabled")
            .removeAttr("readonly")
            .removeClass("is-readonly");
    } else { // view mode일 때
        $fields
            .prop("disabled", true)
            .prop("readonly", true)
            .addClass("is-readonly");
    }
}

// Tab1 조회할 시, 데이터 표시
function openHr011(mode) {
    // 수정 mode
    if (mode === "update") {
        if (!window.hr011Data) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: `'소속 및 계약정보' 데이터가 존재하지 않습니다.`
            });
            return;
        }
        setHr011Mode("update");
        return;
    }

    // 신규 등록(insert) 시 최초 입력을 위한 초기화
    if (mode === "insert") {
        clearHr011Form();
        window.hr011Data = null;
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
    $("#amt").val(formatNumber(data.amt));
    $("#remark").val(data.remark || "");

    if ($("#select_biz_typ option").length > 0) {
        $("#select_biz_typ").val(data.biz_typ || "");
    }
}

// Tab1의 데이터 초기화
function clearHr011Form() {
    $(HR011_FIELDS).val("");
}

// Tab1에 '소속 및 계약정보' 테이블 불러오기
function loadHr011TableData(devId) {
    if (!devId) {
        clearHr011Form(); // 데이터 초기화
        setHr011Mode("insert");
        return;
    }

    // db로부터 데이터 조회하기
    $.ajax({
        url: "/hr011/tab1",
        type: "GET",
        data: { dev_id: devId },
        success: (res) => {
            const data = res?.res ?? null;
            window.hr011Data = data;
            clearHr011Form(); // 데이터 초기화
            if (data) {fillHr011Form(data);} // db로부터 받아온 데이터 채우기
          },
        error: () => {
            console.log("데이터 조회 실패");
            clearHr011Form();
            setHr011Mode("insert");
        }
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
        amt: unformatNumber($("#amt").val()),
        remark: $("#remark").val()
    };

    $.ajax({
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
                         text: `'소속 및 계약정보' 저장 중 오류가 발생했습니다.`
                     })
    });
}

// Tab1 데이터 삭제 (미사용 중)
async function deleteHr011() {
    if (!window.hr011Data?.ctrt_id) {
        await showAlert({
            icon: 'error',
            title: '오류',
            text: `'소속 및 계약정보' 데이터가 존재하지 않습니다.`
        });
        return;
    }

    const result = await showAlert({
        icon: 'warning',
        title: '경고',
        text: '정말로 삭제하시겠습니까?',
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
                text: `'소속 및 계약정보' 데이터가 삭제되었습니다.`
            });
            loadHr011TableData(window.currentDevId);
        },
        error: () => showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                                 icon: 'error',
                                 title: '오류',
                                 text: `'소속 및 계약정보' 데이터를 삭제하는 중 오류가 발생했습니다.`
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
    const amtRaw  = unformatNumber($("#amt").val());   // 계약 금액

    // 최대 입력 가능 숫자
    const MAX_AMT = 999999999;

    if (!orgNm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'소속사'를 입력해주세요.`
        });
        $("#org_nm").focus();
        return false;
    }

    if (!stDt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'계약 시작일'을 입력해주세요.`
        });
        $("#st_dt").focus();
        return false;
    }

    if (!edDt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'계약 종료일'을 입력해주세요.`
        });
        $("#ed_dt").focus();
        return false;
    }

    if (new Date(stDt) > new Date(edDt)) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'계약 종료일'은 '계약 시작일' 이후여야 합니다.`
        });
        $("#ed_dt").focus();
        return false;
    }

    if (!bizTyp || bizTyp == null) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'사업자 유형'을 선택해주세요.`
        });
        $("#select_biz_typ").focus();
        return false;
    }

    if (!amtRaw) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'계약 금액'을 입력해주세요.`
        });
        $("#amt").focus();
        return false;
    }

    if (isNaN(amtRaw) || Number(amtRaw) <= 0) {
         showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'계약 금액'은 0보다 큰 숫자여야 합니다.`
        });
        $("#amt").focus();
        return false;
    }

    if (Number(amtRaw) > MAX_AMT) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'계약 금액'은 최대 999,999,999원까지 입력 가능합니다.`
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
$("#amt").on("input", function () {
    let input_number = this.value.replace(/[^0-9]/g, "");
    this.value = formatNumber(input_number);
});

// 문자열 가공
function unformatNumber(str) {
    return str ? str.replace(/,/g, "") : "";
}