// 사용자 관리 - 소속 및 계약 정보 hr011.js (hcnc_hms)

// Tab1에 대한 유효성 검사 validateHr011Form만 존재함.

// 모달
var $modal = $("#view-user-area");

// 주 개발언어 태그 입력 공통 모듈
var mainLangTagInput = null;
var pendingMainLangValue = "";
var mainLangPicker = null;
var mainLangSkillOptions = [];
var mainLangGroupOptions = [];

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

    // 주개발 초기화
    initMainLangTags();

    // 프로필 이미지 표시
    if (hr011Mode === "insert" || hr011Mode === "update") {

        $("#fileProfile").off("change").on("change", function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // 이미지 파일만 허용
            if (!file.type.startsWith("image/")) {
                showAlert({
                    icon: 'info',
                    title: '알림',
                    html: `<strong>이미지 파일</strong>만 선택 가능합니다.`,
                });
                $(this).val(""); // 선택 초기화
            }
            $("#dev_img").show(); // 사진 표시
            $("#dev_img")[0].src = URL.createObjectURL(file);
        });
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
    $("#btn-excel").toggle(isView);
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
                resolve();
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
            console.log("[Tab1] 저장 완료");
            loadHr011TableData(window.currentDevId);
        },
        error: (err) => {
            console.error("[Tab1] 저장 실패", err);

            showAlert({
                icon: 'error',
                title: '오류',
                html: `<strong>소속 및 계약정보</strong>&nbsp;저장 중 오류가 발생했습니다.`
            });
        }
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

// 데이터 유효성 검사
function validateUserForm() {

    // 값 가져오기
    const dev_nm = ($("#dev_nm").val() || "").trim();            // 성명
    const devTyp = ($("#select_dev_typ").val() || "").trim();    // 소속 구분 (dev_id에서 S: 직원, F: 프리랜서)
    const brdt = ($("#brdt").val() || "").trim();                // 생년월일
    const tel = ($("#tel").val() || "").trim();                  // 연락처
    const email = ($("#email").val() || "").trim();              // 이메일
    const workMd = ($("#select_work_md").val() || "").trim();    // 근무 가능형태 (01: 상주, 02: 재택, 03: 혼합)
    const availDt = ($("#avail_dt").val() || "").trim();         // 투입 가능일
    const eduLast = ($("#edu_last").val() || "").trim();         // 최종학력
    const hopeRaw = normalizeAmountValue($("#hope_rate_amt").val()); // 희망단가 금액
    const kosaGrd = ($("#select_kosa_grd_cd").val() || "").trim(); // KOSA등급 (01: 초급, 02: 중급, 03: 고급, 04: 특급)
    const expYrYear = ($("#exp_yr_year").val() || "").trim();    // 경력연차(년)
    const expYrMonth = ($("#exp_yr_month").val() || "").trim();  // 경력연차(개월)
    const mainFld = ($("#select_main_fld_cd").val() || "").trim() // 주요분야 (01: 공공, 02: 공공/금융, 03: 제조, 04: 공공/제조)
    const ctrtTyp = ($("#select_ctrt_typ").val() || "").trim();  // 계약 형태 (01: 개인, 02: 법인)
    const mainCust = ($("#select_main_cust_cd").val() || "").trim(); // 주요고객사

    // ↓ 데이터 입력 순서대로 작성할 것

    // 개발자 이름(성명)
    if (!dev_nm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>성명</strong>을(를) 입력하세요.`
        });
        $("#dev_nm").focus();
        return false;
    }

    // 소속 구분
    if (!devTyp || devTyp == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>소속구분</strong>을(를) 선택해주세요.`
        });
        $("#select_dev_typ").focus();
        return false;
    }

    // 생년월일
    if (!brdt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>생년월일</strong>을(를) 입력하세요.`
        });
        $("#brdt").focus();
        return false;
    }

    // 전화번호
    if (!tel) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>연락처</strong>을(를) 입력하세요.`
        });
        $("#tel").focus();
        return false;
    }

    // 전화번호 (숫자만 입력)
    if (!/^[0-9\-]+$/.test(tel)) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>연락처</strong>&nbsp;형식이 올바르지 않습니다.`
        });
        $("#tel").focus();
        return false;
    }

    // 이메일
    if (!email) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>이메일</strong>을(를) 입력하세요.`
        });
        $("#email").focus();
        return false;
    }

    const emailRegex =
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(email)) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>이메일</strong>&nbsp;형식이 올바르지 않습니다.`
        });
        $("#email").focus();
        return false;
    }

    // 근무 가능 형태
    if (!workMd || workMd === "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>근무가능형태</strong>을(를) 선택해주세요.`
        });
        $("#select_work_md").focus();
        return false;
    }

    // 투입 가능일
    if (!availDt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>투입가능시점</strong>을(를) 입력하세요.`
        });
        $("#avail_dt").focus();
        return false;
    }

    // 최종학력
    if (!eduLast) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>최종학력</strong>을(를) 입력하세요.`
        });
        $("#edu_last").focus();
        return false;
    }

    // 희망단가
    if (!hopeRaw) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>단가</strong>을(를) 입력해주세요.`
        });
        $("#hope_rate_amt").focus();
        return false;
    }

    // KOSA등급
    if (!kosaGrd || kosaGrd == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>KOSA등급</strong>을(를) 선택해주세요.`
        });
        $("#select_kosa_grd_cd").focus();
        return false;
    }

    // 경력연차
    if (expYrYear === "" || expYrMonth === "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>경력연차(년/개월)</strong>을(를) 입력하세요.`
        });
        if (expYrYear === "") {
            $("#exp_yr_year").focus();
        } else {
            $("#exp_yr_month").focus();
        }
        return false;
    }
    if (!/^\d+$/.test(expYrYear) || !/^\d+$/.test(expYrMonth)) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>경력연차(년/개월)</strong>을(를) 입력하세요.`
        });
        $("#exp_yr_year").focus();
        return false;
    }
    var expYearNum = Number(expYrYear);
    var expMonthNum = Number(expYrMonth);
    if (expYearNum < 0 || expYearNum > 99 || expMonthNum < 0 || expMonthNum > 12) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>경력연차</strong>은(는) 년(0~99), 개월(0~12) 범위 내에서 입력해주세요.`
        });
        $("#exp_yr_year").focus();
        return false;
    }
    syncCareerExpValue();

    // 주요분야
    if (!mainFld || mainFld == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>주요분야</strong>을(를) 선택해주세요.`
        });
        $("#select_main_fld_cd").focus();
        return false;
    }

    // 계약 형태
    if (!ctrtTyp || ctrtTyp == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>계약형태</strong>을(를) 선택해주세요.`
        });
        $("#select_ctrt_typ").focus();
        return false;
    }

    // 주요고객사
    if (!mainCust || mainCust == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>주요고객사</strong>을(를) 선택해주세요.`
        });
        $("#select_main_cust_cd").focus();
        return false;
    }
    return true;
}

// Tab1 유효성 검사
function validateHr011Form() {

    // 값 가져오기
    const orgNm = $("#org_nm").val().trim();         // 소속사
    const stDt = $("#st_dt").val();                 // 계약 시작일
    const edDt = $("#ed_dt").val();                 // 계약 종료일
    const bizTyp = $("#select_biz_typ").val().trim(); // 사업자 유형
    const amtRaw = normalizeAmountValue($("#amt").val());   // 계약 금액

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
const HR011_EDIT_STEP_ACTIVE_OFFSET = 96;
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

    $(document).on("click", ".hr011-ref-link-btn, .hr011-ref-detail-btn[data-ref-view], .hr011-ref-skill-mini-card[data-ref-view]", function () {
        const view = String($(this).data("refView") || "overview");
        switchHr011RefView(view);
    });

    $(document).on("keydown", ".hr011-ref-skill-mini-card[data-ref-view]", function (event) {
        const key = String(event.key || "").toLowerCase();
        if (key !== "enter" && key !== " ") return;
        event.preventDefault();
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

    console.log("조회된 데이터 : ", response.res);
    hr011CurrentRow = row;

    // 수정/등록 폼에 프로필 이미지 표시
    const $img = $("#dev_img");
    var $form = $(".hr011-dashboard-grid");
    const $reUploadProfile = $form.find(".re-upload-image");
    const hasImage = row && row.img_url;

    // 프로필 이미지 처리
    if (hasImage) {
        $img.attr("src", row.img_url).addClass("has-img").show();
        $reUploadProfile.show();
    }
    else {
        $img.attr("src", "").removeClass("has-img");
    }

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
    renderHr011RefSkillCards("hr011RefSkillGauge");
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

function isHr011PlaceholderSkillName(rawSkill) {
    const text = $.trim(String(rawSkill || ""));
    if (!text) return true;
    const normalized = text.replace(/\s+/g, "").toLowerCase();
    return normalized === "-" || normalized === "미등록" || normalized === "미평가" || normalized === "없음" || normalized === "none" || normalized === "null" || normalized === "na" || normalized === "n/a" || normalized === "sk";
}

function collectHr011OwnedSkills(row) {
    const ownedSkills = [];
    const seen = new Set();

    function pushSkill(rawSkill) {
        const skill = $.trim(String(rawSkill || ""));
        if (!skill || isHr011PlaceholderSkillName(skill)) return;
        const key = skill.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        ownedSkills.push(skill);
    }

    (hr011SummarySkillRows || []).forEach(function (item) {
        pushSkill(item && item.name);
    });

    splitHr011MainLang(row).skills.forEach(pushSkill);

    (hr011RefSkillCategoryRows || []).forEach(function (item) {
        const values = Array.isArray(item?.valueList) && item.valueList.length
            ? item.valueList
            : parseHr011SkillList(item && item.value);
        values.forEach(pushSkill);
    });

    return ownedSkills;
}

function normalizeHr011SkillKey(rawSkill) {
    return $.trim(String(rawSkill || "")).toLowerCase();
}

function resolveHr011SkillCategoryClass(rawCategory) {
    const category = $.trim(String(rawCategory || "")).toLowerCase();
    if (!category) return "neutral";
    if (category.includes("backend") || category.includes("백엔드")) return "backend";
    if (category.includes("frontend") || category.includes("프론트")) return "frontend";
    if (category.includes("devops")) return "devops";
    if (category.includes("infra") || category.includes("인프라")) return "infra";
    if (category.includes("mobile") || category.includes("모바일")) return "mobile";
    if (category.includes("db")) return "db";
    if (category.includes("erp") || category.includes("mes")) return "erp";
    return "neutral";
}

function resolveHr011KosaStarCount(rawLabel) {
    const label = $.trim(String(rawLabel || "")).replace(/\s+/g, "");
    if (!label || label === "-") return 0;
    if (label.includes("특")) return 4;
    if (label.includes("고")) return 3;
    if (label.includes("중")) return 2;
    if (label.includes("초")) return 1;
    return 0;
}

function buildHr011KosaStarsMarkup(rawLabel) {
    const count = resolveHr011KosaStarCount(rawLabel);
    if (!count) return "";
    return Array.from({ length: count }, function () {
        return `<span class="hr011-ref-kosa-stars__star is-on" aria-hidden="true"></span>`;
    }).join("");
}

function resolveHr011WorkModeBadgeMeta(rawLabel) {
    const label = $.trim(String(rawLabel || "")) || "-";
    const normalized = label.replace(/\s+/g, "");
    if (normalized.includes("상주")) return { label, className: "is-onsite" };
    if (normalized.includes("재택") || normalized.includes("원격")) return { label, className: "is-remote" };
    if (normalized.includes("혼합") || normalized.includes("병행")) return { label, className: "is-hybrid" };
    return { label, className: "is-default" };
}

function buildHr011SkillToken(name) {
    const source = $.trim(String(name || ""));
    if (!source) return "SK";
    const compact = source.replace(/[^0-9A-Za-z가-힣]+/g, " ").trim();
    if (!compact) return "SK";
    const parts = compact.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    const plain = parts[0] || compact;
    if (/^[A-Za-z0-9]+$/.test(plain)) {
        return plain.slice(0, Math.min(2, plain.length)).toUpperCase();
    }
    return plain.slice(0, Math.min(2, plain.length));
}

const HR011_SKILL_ICON_IMAGE_MAP = {
    oracle: "/icons/" + encodeURIComponent("skil (4).png"),
    kubernetes: "/icons/" + encodeURIComponent("skil (1).png"),
    react: "/icons/" + encodeURIComponent("skil (2).png"),
    qliksense: "/icons/" + encodeURIComponent("skil (3).png")
};

const HR011_SKILL_ICON_PALETTE = [
    { bg: "#4F46E5", fg: "#FFFFFF" },
    { bg: "#0EA5E9", fg: "#FFFFFF" },
    { bg: "#10B981", fg: "#FFFFFF" },
    { bg: "#F97316", fg: "#FFFFFF" },
    { bg: "#DB2777", fg: "#FFFFFF" },
    { bg: "#8B5CF6", fg: "#FFFFFF" },
    { bg: "#EF4444", fg: "#FFFFFF" },
    { bg: "#14B8A6", fg: "#FFFFFF" }
];

function normalizeHr011SkillIconKey(rawSkill) {
    return $.trim(String(rawSkill || "")).toLowerCase().replace(/[\s\-_./()]+/g, "");
}

function hashHr011SkillIconKey(rawSkill) {
    const text = normalizeHr011SkillIconKey(rawSkill) || "skill";
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash +=
            (hash << 1) +
            (hash << 4) +
            (hash << 7) +
            (hash << 8) +
            (hash << 24);
    }
    return hash >>> 0;
}

function resolveHr011SkillIconSource(rawSkill) {
    const iconKey = normalizeHr011SkillIconKey(rawSkill);
    if (iconKey.includes("oracle")) return HR011_SKILL_ICON_IMAGE_MAP.oracle;
    if (iconKey.includes("kubernetes") || iconKey.includes("kubmetes") || iconKey.includes("k8s")) return HR011_SKILL_ICON_IMAGE_MAP.kubernetes;
    if (iconKey.includes("react")) return HR011_SKILL_ICON_IMAGE_MAP.react;
    if (iconKey.includes("qlik")) return HR011_SKILL_ICON_IMAGE_MAP.qliksense;
    return HR011_SKILL_ICON_IMAGE_MAP[iconKey] || "";
}

function resolveHr011SkillIconMeta(name) {
    const iconSrc = resolveHr011SkillIconSource(name);
    if (iconSrc) {
        return {
            type: "image",
            src: iconSrc
        };
    }

    const palette = HR011_SKILL_ICON_PALETTE[hashHr011SkillIconKey(name) % HR011_SKILL_ICON_PALETTE.length];
    return {
        type: "token",
        bg: palette.bg,
        fg: palette.fg
    };
}

function buildHr011SkillIconMarkup(name) {
    const meta = resolveHr011SkillIconMeta(name);
    if (meta.type === "image") {
        return [
            `<span class="hr011-ref-skill-mini-card__icon-token hr011-ref-skill-mini-card__icon-token--image">`,
            `<img src="${escapeHr011(meta.src)}" alt="" aria-hidden="true">`,
            `</span>`
        ].join("");
    }

    return [
        `<span class="hr011-ref-skill-mini-card__icon-token hr011-ref-skill-mini-card__icon-token--color" style="--hr011-skill-icon-bg:${meta.bg};--hr011-skill-icon-fg:${meta.fg};">`,
        `${escapeHr011(buildHr011SkillToken(name))}`,
        `</span>`
    ].join("");
}

function buildHr011ProjectBadgePlaceholderMarkup() {
    return [
        `<span class="hr011-ref-project-company-badge__placeholder" aria-hidden="true">`,
        `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">`,
        `<rect x="4" y="5" width="16" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>`,
        `<circle cx="9" cy="9" r="1.4" fill="currentColor"/>`,
        `<path d="M5.2 16.7 9.3 12.7 12.4 15.7 15 13.8 18.8 16.7" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
        `</svg>`,
        `</span>`
    ].join("");
}

function buildHr011SkillCardRows(row) {
    const skillMap = new Map();
    const categoryMap = new Map();
    const projectCountMap = new Map();

    function upsertSkill(rawSkill, level) {
        const skill = $.trim(String(rawSkill || ""));
        if (!skill || isHr011PlaceholderSkillName(skill)) return;
        const key = normalizeHr011SkillKey(skill);
        if (!key) return;

        const current = skillMap.get(key) || {
            key,
            name: skill,
            level: 0
        };

        current.name = current.name || skill;
        current.level = Math.max(current.level, Math.max(0, Math.min(5, Number(level) || 0)));
        skillMap.set(key, current);
    }

    (hr011SummarySkillRows || []).forEach(function (item) {
        upsertSkill(item && item.name, item && item.level);
    });

    collectHr011OwnedSkills(row).forEach(function (skill) {
        upsertSkill(skill, 0);
    });

    (hr011RefSkillCategoryRows || []).forEach(function (item) {
        const categoryName = $.trim(String(item && item.name || "")) || "기타";
        const values = Array.isArray(item && item.valueList) && item.valueList.length
            ? item.valueList
            : parseHr011SkillList(item && item.value);

        values.forEach(function (skill) {
            const key = normalizeHr011SkillKey(skill);
            if (!key) return;
            const current = categoryMap.get(key) || [];
            if (!current.includes(categoryName)) {
                current.push(categoryName);
                categoryMap.set(key, current);
            }
        });
    });

    (hr011RefProjectRows || []).forEach(function (project) {
        const seen = new Set();
        parseHr011SkillList(project && (project.stack_txt_nm || project.stack_txt)).forEach(function (skill) {
            const key = normalizeHr011SkillKey(skill);
            if (!key || seen.has(key)) return;
            seen.add(key);
            projectCountMap.set(key, (projectCountMap.get(key) || 0) + 1);
        });
    });

    return Array.from(skillMap.values())
        .map(function (item) {
            const categories = (categoryMap.get(item.key) || []).slice(0, 2);
            const projectCount = projectCountMap.get(item.key) || 0;
            return {
                key: item.key,
                name: item.name,
                level: item.level,
                meta: resolveHr011SkillLevelMeta(item.level),
                categories,
                projectCount
            };
        })
        .sort(function (a, b) {
            if (b.level !== a.level) return b.level - a.level;
            if (b.projectCount !== a.projectCount) return b.projectCount - a.projectCount;
            return a.name.localeCompare(b.name, "ko");
        });
}

function buildHr011SkillCardsMarkup(row, options) {
    const opts = options || {};
    const emptyLabel = opts.emptyLabel || "보유 기술 정보가 없습니다.";
    const limit = Number(opts.limit) || 0;
    const sourceRows = buildHr011SkillCardRows(row);
    const visibleRows = limit > 0 ? sourceRows.slice(0, limit) : sourceRows;
    const moreCount = limit > 0 && sourceRows.length > visibleRows.length
        ? sourceRows.length - visibleRows.length
        : 0;

    if (!visibleRows.length) {
        return `<article class="hr011-ref-skill-mini-card hr011-ref-skill-mini-card--empty">${escapeHr011(emptyLabel)}</article>`;
    }

    return visibleRows.map(function (item) {
        const stars = Array.from({ length: 5 }, function (_, idx) {
            return `<span class="hr011-ref-skill-mini-card__star ${idx < item.level ? "is-on" : ""}" aria-hidden="true"></span>`;
        }).join("");
        const categoryMarkup = item.categories.length
            ? item.categories.map(function (category) {
                const tone = resolveHr011SkillCategoryClass(category);
                return `<span class="hr011-ref-skill-mini-card__tag hr011-ref-skill-mini-card__tag--${tone}">${escapeHr011(category)}</span>`;
            }).join("")
            : `<span class="hr011-ref-skill-mini-card__tag hr011-ref-skill-mini-card__tag--neutral">미분류</span>`;

        return [
            `<article class="hr011-ref-skill-mini-card hr011-ref-skill-mini-card--${item.meta.className} hr011-skill-stagger-item">`,
            `<div class="hr011-ref-skill-mini-card__identity">`,
            `<div class="hr011-ref-skill-mini-card__icon" aria-hidden="true">${buildHr011SkillIconMarkup(item.name)}</div>`,
            `<div class="hr011-ref-skill-mini-card__title">`,
            `<strong>${escapeHr011(item.name)}</strong>`,
            `<div class="hr011-ref-skill-mini-card__tags">${categoryMarkup}</div>`,
            `</div>`,
            `</div>`,
            `<div class="hr011-ref-skill-mini-card__info-row">`,
            `<span class="hr011-ref-skill-mini-card__label">스킬</span>`,
            `<div class="hr011-ref-skill-mini-card__value">`,
            `<div class="hr011-ref-skill-mini-card__stars" title="${escapeHr011(item.name)} ${escapeHr011(item.meta.label)}">${stars}</div>`,
            `<span class="hr011-ref-skill-mini-card__score">${escapeHr011(item.meta.label)}</span>`,
            `</div>`,
            `</div>`,
            `<div class="hr011-ref-skill-mini-card__info-row hr011-ref-skill-mini-card__info-row--project">`,
            `<span class="hr011-ref-skill-mini-card__label">프로젝트</span>`,
            `<strong class="hr011-ref-skill-mini-card__count">${item.projectCount > 0 ? `${escapeHr011(String(item.projectCount))}건` : "0건"}</strong>`,
            `</div>`,
            `</article>`
        ].join("");
    }).join("") + (moreCount > 0
        ? `<article class="hr011-ref-skill-mini-card hr011-ref-skill-mini-card--more hr011-skill-stagger-item" data-ref-view="skills" role="button" tabindex="0" aria-label="보유 기술 상세보기"><strong>+${moreCount}</strong><span>추가 기술 더보기</span></article>`
        : "");
}

function renderHr011ReferenceDashboard(row) {
    if (!row) return;

    const devTypeValue = resolveHr011DevTypeValue(row);
    const devTypeLabel = devTypeValue === "HCNC_F" ? "프리랜서" : "직원";
    const mainLangParts = splitHr011MainLang(row);
    const careerText = formatCareerYearMonth(row.exp_yr) || "0개월";
    const gradeText = $.trim($("#grade").text() || "-");
    const scoreText = $.trim($("#score").text() || "");
    const projectCountText = `${hr011RefProjectRows.length || 0}회`;
    const skillCardRows = buildHr011SkillCardRows(row);
    const mainLangSkills = mainLangParts.skills.slice(0, 6);
    const hasMoreMainLang = mainLangParts.skills.length > 6;
    const kosaLabel = hr011MainSelectMaps.kosa[row.kosa_grd_cd] || row.kosa_grd_cd || "-";
    const workModeLabel = hr011MainSelectMaps.workMd[row.work_md] || row.work_md || "-";
    const regionLabel = hr011MainSelectMaps.sido[row.sido_cd] || row.sido_cd || "-";
    const workModeMeta = resolveHr011WorkModeBadgeMeta(workModeLabel);
    const radarScores = (hr011SummaryRadarRows || []).map(function (item) {
        return Number(item && item.value || 0);
    }).filter(function (value) {
        return value > 0;
    });
    const formatRadarAverageText = function (value) {
        const rounded = Math.round(value);
        return `${Math.abs(value - rounded) < 0.001 ? rounded : value.toFixed(1)}점`;
    };
    const radarAverageText = radarScores.length
        ? formatRadarAverageText(radarScores.reduce(function (sum, value) {
            return sum + value;
        }, 0) / radarScores.length)
        : "-";

    $("#hr011RefAvatar").html(getHr011AvatarMarkup(row));
    $("#hr011RefName").text(row.dev_nm || "-");
    $("#hr011RefCareer").text(careerText);
    $("#hr011RefDevTypeMeta").text(devTypeLabel);
    $("#hr011RefKosaMeta").text(kosaLabel);
    $("#hr011RefKosaStars").html(buildHr011KosaStarsMarkup(kosaLabel));
    $("#hr011RefMainLang").html(
        (mainLangSkills.length ? mainLangSkills : ["미등록"]).map(function (skill) {
            return `<span class="chip">${escapeHr011(skill)}</span>`;
        }).join("") + (hasMoreMainLang ? `<span class="chip">...</span>` : "")
    );
    $("#hr011RefCertTxt").html(buildHr011ChipListMarkup(row.cert_txt, "미등록"));

    $("#hr011RefDevType")
        .text(devTypeLabel)
        .removeClass("is-staff is-freelancer")
        .addClass(devTypeValue === "HCNC_F" ? "is-freelancer" : "is-staff");
    $("#hr011RefBrdt").text($.trim(row.brdt || "") || "-");
    $("#hr011RefTel").text($.trim(row.tel || "") || "-");
    $("#hr011RefEmail").text($.trim(row.email || "") || "-");

    // 공통코드 데이터
    $("#hr011RefKosa").text(kosaLabel);
    $("#hr011RefMainFld").text(hr011MainSelectMaps.mainFld[row.main_fld_cd] || row.main_fld_cd || "-");
    $("#hr011RefWorkMd")
        .text(workModeMeta.label)
        .removeClass("is-onsite is-remote is-hybrid is-default")
        .addClass(workModeMeta.className);
    $("#hr011RefRegion").text(regionLabel);
    $("#hr011RefGradeInfo").text(`${gradeText}${scoreText ? ` ${scoreText}` : ""}`);
    $("#hr011RefProjectInfo").text(projectCountText);
    $("#hr011RefProjectInfoHead").text(projectCountText);
    $("#hr011RefSkillCardMeta").text(skillCardRows.length ? `${skillCardRows.length}개` : "0개");
    $("#hr011RefRadarAverage").text(radarAverageText);

    const projects = (hr011RefProjectRows || []).slice(0, 4);
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
            `<div class="hr011-ref-project-item-title">${escapeHr011(item.prj_nm || "-")}</div>`,
            `<div class="hr011-ref-project-item-stack-row">`,
            `<span class="label">주 개발언어</span>`,
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
            // 상세 -> 메인 복귀 시 스킬 카드/레이더 애니메이션을 다시 재생한다.
            renderHr011RefSkillCards("hr011RefSkillGauge");
            renderHr011RefRadarChart();
            animateHr011SkillSection(overviewEl);
        });
        return;
    }

    overviewEl.hidden = true;
    detailEl.hidden = false;

    if (normalized === "skills") {
        detailTitleEl.textContent = "보유 기술 상세";
        detailBodyEl.innerHTML = buildHr011SkillsDetailMarkup();
        renderHr011RefSkillCards("hr011RefSkillGaugeDetail");
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
        ".hr011-ref-actions-row",
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
        const hasChartHost = !!el.querySelector(".hr011-ref-skill-card-grid, .hr011-ref-radar, .hr011-ref-project-eval-radar");
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
    const chartWraps = rootEl.querySelectorAll(".hr011-ref-skill-grid-wrap");
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
    ensureHr011ActiveStepButtonVisible(normalized);
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
    const headerBottom = headerRect ? headerRect.bottom : 0;
    const offset = Math.max(headerBottom + 24, 148);
    const currentY = window.pageYOffset || window.scrollY || 0;
    const targetY = Math.max(0, section.getBoundingClientRect().top + currentY - offset);
    window.scrollTo({ top: targetY, behavior: "smooth" });
}

function ensureHr011ActiveStepButtonVisible(stepKey) {
    const stepper = document.querySelector(".hr011-page.is-edit-mode .hr011-edit-stepper");
    if (!stepper) return;
    const btn = stepper.querySelector(`.hr011-edit-step-btn[data-step-target="${stepKey}"]`);
    if (!btn || btn.hidden) return;

    const btnTop = btn.offsetTop;
    const btnBottom = btnTop + btn.offsetHeight;
    const viewTop = stepper.scrollTop;
    const viewBottom = viewTop + stepper.clientHeight;
    const pad = 12;

    if (btnTop < viewTop + pad) {
        stepper.scrollTo({ top: Math.max(0, btnTop - pad), behavior: "smooth" });
    } else if (btnBottom > viewBottom - pad) {
        stepper.scrollTo({ top: Math.max(0, btnBottom - stepper.clientHeight + pad), behavior: "smooth" });
    }
}

function getHr011EditScrollRoots(stepper) {
    const roots = [];
    const seen = new Set();
    const pushRoot = function (root) {
        if (!root || seen.has(root)) return;
        seen.add(root);
        roots.push(root);
    };

    pushRoot(window);
    pushRoot(document.scrollingElement || document.documentElement);

    let node = stepper ? stepper.parentElement : null;
    while (node && node !== document.body && node !== document.documentElement) {
        const style = window.getComputedStyle(node);
        const overflowY = String(style.overflowY || style.overflow || "");
        const canScroll = /(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 4;
        if (canScroll) {
            pushRoot(node);
        }
        node = node.parentElement;
    }

    const extras = [
        document.querySelector(".contents-wrap.hr011-detail-wrap"),
        document.querySelector(".container-wrap .container")
    ];
    extras.forEach(function (el) {
        if (!el) return;
        const style = window.getComputedStyle(el);
        const overflowY = String(style.overflowY || style.overflow || "");
        if (/(auto|scroll|overlay)/.test(overflowY) || el.scrollHeight > el.clientHeight + 4) {
            pushRoot(el);
        }
    });

    return roots;
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
    const anchorY = Math.max(
        (headerRect ? headerRect.bottom : 0) + HR011_EDIT_STEP_ACTIVE_OFFSET,
        Math.round(window.innerHeight * 0.30)
    );

    if (hr011Mode === "insert") {
        const skillSection = sections.find(function (section) {
            return String(section.getAttribute("data-edit-step") || "") === "skill";
        });
        const projectSection = sections.find(function (section) {
            return String(section.getAttribute("data-edit-step") || "") === "project";
        });
        if (skillSection && projectSection) {
            const skillHead = skillSection.querySelector(".hr011-section-head") || skillSection;
            const skillHeadRect = skillHead.getBoundingClientRect();
            if (skillHeadRect.bottom <= anchorY) {
                setHr011ActiveEditStep("project");
                return;
            }
        }
    }

    let active = sections[0];
    sections.forEach(function (section) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= anchorY) {
            active = section;
        }
    });

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;

    const isBottom = scrollTop + clientHeight >= scrollHeight - 2;

    if (isBottom) {
        const lastSection = sections[sections.length - 1];
        if (lastSection) {
            const lastKey = lastSection.getAttribute("data-edit-step");
            setHr011ActiveEditStep(lastKey);
            return; // 기존 로직 막기
        }
    }

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
        flow.hidden = true;
        flow.style.display = "none";
        setHr011ActiveEditStep("");
        return;
    }

    flow.hidden = false;
    flow.style.display = "";

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
        const scrollRoots = getHr011EditScrollRoots(stepper);
        scrollRoots.forEach(function (root) {
            if (root === window) {
                window.addEventListener("scroll", requestHr011ActiveStepSync, { passive: true });
                return;
            }
            root.addEventListener("scroll", requestHr011ActiveStepSync, { passive: true });
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
                    window.reloadTab4(projectId).catch(function () { });
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
            window.reloadTab4(projectId).catch(function () { });
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
        // ["성명", row.dev_nm || "-"],
        // ["구분", resolveHr011DevTypeValue(row) === "HCNC_F" ? "프리랜서" : "직원"],
        // ["연락처", row.tel || "-"],
        // ["이메일", row.email || "-"],
        // ["근무가능형태", hr011MainSelectMaps.workMd[row.work_md] || row.work_md || "-"],
        ["개발자 ID", row.dev_id],
        ["계약형태", hr011MainSelectMaps.ctrtTyp[row.ctrt_typ] || row.ctrt_typ || "-"],
        // ["KOSA 등급", hr011MainSelectMaps.kosa[row.kosa_grd_cd] || row.kosa_grd_cd || "-"],
        // ["주요 분야", hr011MainSelectMaps.mainFld[row.main_fld_cd] || row.main_fld_cd || "-"],
        ["주요 고객사", hr011MainSelectMaps.mainCust[row.main_cust_cd] || row.main_cust_cd || "-"],
        // ["보유 자격증", row.cert_txt || "-"],
        // ["등급", `${$.trim($("#grade").text() || "-")} ${$.trim($("#score").text() || "")}`.trim()]
        ["거주지역", hr011MainSelectMaps.sido[row.sido_cd] || row.sido_cd || "-"],
        ["생년월일", row.brdt || "-"],
        ["최종학력", row.edu_last || "-"]
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
    const row = hr011CurrentRow || {};
    const skillCardRows = buildHr011SkillCardRows(row);
    return [
        `<article class="hr011-ref-detail-card hr011-ref-skill-detail-card">`,
        `<div class="hr011-ref-skill-detail-head">`,
        `<div class="hr011-ref-card-headline">`,
        `<div class="hr011-ref-card-headline-row">`,
        `<h6>보유 기술 상세</h6>`,
        `<span class="hr011-ref-skill-card-meta">총 ${skillCardRows.length}개 스킬</span>`,
        `</div>`,
        // `<p>숙련도와 프로젝트 활용 이력을 한눈에 봅니다.</p>`,
        `</div>`,
        `</div>`,
        `<div class="hr011-ref-skill-grid-wrap hr011-ref-skill-grid-wrap--detail"><div class="hr011-ref-skill-card-grid hr011-ref-skill-card-grid--detail" id="hr011RefSkillGaugeDetail"></div></div>`,
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

    return [
        `<span class="hr011-ref-project-company-badge hr011-ref-project-company-badge--external" aria-hidden="true">`,
        buildHr011ProjectBadgePlaceholderMarkup(),
        `</span>`
    ].join("");
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

function renderHr011RefSkillCards(targetId) {
    const gaugeEl = document.getElementById(targetId || "hr011RefSkillGauge");
    if (!gaugeEl) return;

    if (typeof echarts === "object" && typeof echarts.getInstanceByDom === "function") {
        const prevInstance = echarts.getInstanceByDom(gaugeEl);
        if (prevInstance && typeof prevInstance.dispose === "function") {
            prevInstance.dispose();
        }
    }

    const isDetailChart = String(targetId || "").toLowerCase().includes("detail");
    const markup = buildHr011SkillCardsMarkup(hr011CurrentRow || {}, {
        limit: isDetailChart ? 0 : 7,
        emptyLabel: "보유 기술 정보가 없습니다."
    });

    gaugeEl.innerHTML = markup;

    if (isDetailChart) {
        hr011RefSkillGaugeDetailChart = null;
    } else {
        hr011RefSkillGaugeChart = null;
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

    const sanitizeRadarLabel = function (text) {
        return String(text || "").replace(/[{}|]/g, "");
    };
    const formatRadarScoreText = function (value) {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric)) {
            return "0점";
        }
        const rounded = Math.round(numeric);
        const scoreText = Math.abs(numeric - rounded) < 0.001
            ? String(rounded)
            : numeric.toFixed(1);
        return `${scoreText}점`;
    };
    const radarScoreMap = {};
    const indicators = hr011SummaryRadarRows.map(function (row) {
        const label = sanitizeRadarLabel(row.label);
        radarScoreMap[label] = formatRadarScoreText(row.value);
        return {
            name: label,
            max: 5
        };
    });

    hr011RefRadarChart.setOption({
        animation: true,
        animationDuration: 900,
        animationEasing: "quarticOut",
        animationDurationUpdate: 520,
        animationEasingUpdate: "cubicInOut",
        animationDelay: function (idx) { return idx * 52; },
        textStyle: {
            fontFamily: "Inter, sans-serif"
        },
        graphic: [{
            type: "text",
            left: 14,
            top: 0,
            style: {
                text: "5점 만점",
                fill: "#727272",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 16
            }
        }],
        radar: {
            center: ["50%", "55%"],
            radius: "78%",
            bottom: 0,
            splitNumber: 5,
            startAngle: 90,
            indicator: indicators,
            axisName: {
                color: "#727272",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 16,
                formatter: function (name) {
                    return `{label|${name}}\n{value|${radarScoreMap[name] || "0점"}}`;
                },
                rich: {
                    label: {
                        color: "#727272",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        fontWeight: 400,
                        lineHeight: 16,
                        align: "center"
                    },
                    value: {
                        color: "#000000",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 18,
                        fontWeight: 600,
                        lineHeight: 22,
                        align: "center"
                    }
                }
            },
            axisLine: {
                lineStyle: {
                    color: "#cfd7e4",
                    width: 1
                }
            },
            splitLine: {
                lineStyle: {
                    color: "#cfd7e4",
                    width: 1,
                    type: "dashed"
                }
            },
            splitArea: {
                areaStyle: {
                    color: ["#ffffff", "#f8fafd"]
                }
            }
        },
        series: [{
            type: "radar",
            symbol: "circle",
            symbolSize: 6,
            animation: true,
            animationDuration: 900,
            animationEasing: "quarticOut",
            lineStyle: { width: 2, color: "#2c80ff" },
            itemStyle: { color: "#2c80ff" },
            areaStyle: { color: "rgba(44, 128, 255, 0.22)" },
            data: [{ value: hr011SummaryRadarRows.map(function (row) { return row.value; }) }]
        }]
    }, true);
}

// 주 개발언어 태그/팝업 초기화
function initMainLangTags() {
    if (!mainLangTagInput) {
        mainLangTagInput = createTagInput({
            inputSelector: "#main_lang_input",
            listSelector: "#mainLangTagList",
            hiddenSelector: "#main_lang",
            getValue: function (item) { return item.cd; },
            getLabel: function (item) { return item.cd_nm; },
            matchMode: "prefix",
            // 주개발언어는 x 삭제가 아닌 기술선택 팝업에서만 변경한다.
            removable: false,
            onTagChange: function () {
                syncMainLangPickerUi();
            }
        });
        initMainLangPicker();
        bindMainLangPickerEvents();
    }

    setComCode("main_lang_select", "skl_id", "", "cd", "cd_nm", function (res) {
        mainLangSkillOptions = Array.isArray(res) ? res : [];
        mainLangTagInput.setOptions(mainLangSkillOptions);
        mainLangTagInput.setFromValue(pendingMainLangValue || $("#main_lang").val());
        pendingMainLangValue = $("#main_lang").val() || pendingMainLangValue;
        syncMainLangPickerUi(true);
    });

    getComCode("skl_grp", "", function (res) {
        mainLangGroupOptions = Array.isArray(res) ? res : [];
        syncMainLangPickerUi(true);
    });
}

// 공통 팩토리 기반 주개발언어 선택 팝업 초기화
function initMainLangPicker() {
    if (mainLangPicker || typeof createGroupedSkillPicker !== "function") {
        return;
    }
    mainLangPicker = createGroupedSkillPicker({
        namespace: "main_lang",
        pickerAreaSelector: "#main-lang-picker-area",
        openTriggerSelector: "#main_lang_input, #btn_main_lang_picker",
        applyTriggerSelector: "#btn_main_lang_picker_apply",
        closeTriggerSelector: "#btn_main_lang_picker_close_x",
        tableSelector: "#TABLE_MAIN_LANG_PICKER",
        searchInputSelector: "#main-lang-picker-search",
        searchWrapSelector: ".main-lang-picker-search-wrap",
        suggestListSelector: "#main-lang-picker-suggest",
        metaSelector: "#main-lang-picker-meta",
        chipClass: "main-lang-skill-chip",
        chipWrapClass: "main-lang-skill-chip-wrap",
        suggestItemClass: "main-lang-suggest-item",
        flashClass: "is-flash",
        groupColumnWidth: 180,
        getSkillOptions: function () {
            return mainLangSkillOptions || [];
        },
        getGroupOptions: function () {
            return mainLangGroupOptions || [];
        },
        getSelectedCodes: function () {
            var set = new Set();
            String($("#main_lang").val() || "")
                .split(",")
                .forEach(function (item) {
                    var code = $.trim(item);
                    if (code) {
                        set.add(code);
                    }
                });
            return set;
        },
        isReadonly: function () {
            return currentMode === "view";
        },
        onApply: function (payload) {
            if (mainLangTagInput) {
                mainLangTagInput.setFromValue(payload.csv || "");
            }
            pendingMainLangValue = payload.csv || "";
        }
    });
}

// 팝업 이벤트는 공통 유틸이 네임스페이스로 1회만 등록한다.
function bindMainLangPickerEvents() {
    initMainLangPicker();
    if (mainLangPicker) {
        mainLangPicker.bindEvents();
    }
}

function syncMainLangPickerUi(forceRebuild) {
    if (!mainLangPicker) {
        return;
    }
    mainLangPicker.sync(forceRebuild);
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
        const previewRows = hr011SummarySkillRows.slice(0, 6);
        const moreCount = Math.max(0, hr011SummarySkillRows.length - previewRows.length);

        return previewRows.map(function (skill) {
            const level = resolveHr011SkillLevelMeta(skill.level);
            return [
                `<span class="hr011-summary-skill hr011-summary-skill--${level.className}">`,
                `<span class="hr011-summary-skill__label">${escapeHr011(skill.name)}</span>`,
                `<span class="hr011-summary-skill__level">${escapeHr011(level.label)} · ${escapeHr011(level.scoreText)}</span>`,
                `</span>`
            ].join("");
        }).join("") + (moreCount > 0
            ? `<span class="hr011-summary-skill hr011-summary-skill--more"><span class="hr011-summary-skill__label">+${moreCount}</span></span>`
            : "");
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
                return row.name && !isHr011PlaceholderSkillName(row.name);
            })
            .filter(function (row) {
                return row.name;
            })
            .sort(function (a, b) {
                if (b.level !== a.level) return b.level - a.level;
                return a.name.localeCompare(b.name, "ko");
            });
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
    const score = Math.max(0, Math.min(5, Number(level) || 0));
    return {
        label: score === 0 ? "미평가" : String(score),
        className: score === 0 ? "pending" : `lv-${score}`,
        scoreText: `${score}/5`
    };
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

    // Main 유효성 검사
    if (!validateUserForm()) {
        console.log("[Main] 유효성 실패 → [Skip]");
        return;
    }

    // Tab1 유효성 검사
    if (changedTabs.tab1) {
        if (!validateHr011Form()) {
            console.log("[Tab1] 유효성 실패 → [Skip]");
            return;
        }
    }

    const wasInsertMode = hr011Mode === "insert";

    try {
        showLoading();

        // =========================
        // 저장 로직
        // =========================

        // Main 저장
        await saveHr011MainProfile();

        // Tab1 저장
        if (changedTabs.tab1 && typeof saveHr011TableData === "function") {
            await saveHr011TableData();
        } else {
            console.log("[Tab1] 저장할 계약 데이터 없음 → [Skip]");
        }

        // Tab2 저장
        if (typeof window.saveHr012TableData === "function") {
            await window.saveHr012TableData();
        }

        // Tab3 저장
        if (typeof window.saveHr013TableData === "function") {
            await window.saveHr013TableData();
        }

        // Tab4 저장
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

        if (error === "validation failed") {
            hideLoading();
            return;
        }

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
    const file = $("#fileProfile")[0].files[0];
    if (file) {
        formData.append("dev_img", file);
    }

    try {
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

        console.log("[Main] 저장 완료", response);

        return response; // (상위 await용)
    } catch (error) {
        console.error("[Main] 저장 실패", error); // 실패 로그

        throw error; // (상위에서 catch 가능하게)
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
