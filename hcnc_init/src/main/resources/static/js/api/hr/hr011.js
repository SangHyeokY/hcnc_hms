// 사용자 관리 - 소속 및 계약 정보 hr011.js (hcnc_hms)

// Tab1에 대한 유효성 검사 validateHr011Form만 존재함.

// 모달
var $modal = $("#view-user-area");
const HR011_PROJECT_EVAL_MODAL_MOTION_MS = 800;

// 주 개발언어 태그 입력 공통 모듈
var mainLangTagInput = null;
var pendingMainLangValue = "";
var mainLangPicker = null;
var mainLangSkillOptions = [];
var mainLangGroupOptions = [];

let hr011StepInputTimer = null;

// 수정, 등록 시에 네비게이션 바 반응 이벤트
$(document).on(
    "input change",
    ".hr011-edit-flow input, .hr011-edit-flow select, .hr011-edit-flow textarea",
    function () {

        updateStepperUI();

        const stepEl = this.closest(".hr011-section[data-edit-step]");
        if (!stepEl) return;

        const step = stepEl.getAttribute("data-edit-step");
        if (!step) return;

        clearTimeout(hr011StepInputTimer);

        hr011StepInputTimer = setTimeout(() => {
            setHr011ActiveEditStep(step);
        }, 120);
    });

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
        updateStepperUI(); // 1번만
        updateStepNumbers(); // 1번만

        $("#fileProfile").off("change").on("change", function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // 이미지 파일만 허용
            if (!file.type.startsWith("image/")) {
                showAlert({
                    icon: 'info',
                    title: '알림',
                    html: `<div><strong>이미지 파일</strong>만 선택 가능합니다.</div>`,
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

    // textarea 자동으로 커지기
    $("textarea").on("input", function () {
        if (!this.value.trim()) {
            this.style.height = "45px";
            return;
        }
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";
    });
});

// mode 초기값 : view, 테이블 데이터 초기값 : null
let hr011Mode = "view";
window.hr011Data = null;
window.hr011EditUnlocked = false;

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

            initSelectDefault("select_biz_typ", "개인 / 개인사업자 / 법인");
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
    $("#upsert-header").text(isView ? "상세" : mode === "insert" ? "등록" : "수정");
    // $("#hr011CancelBtn, #hr011CancelBtnView").text(isInsert ? "등록취소" : "수정취소");
    $("#hr011SaveBtn, #hr011SaveBtnView").text(isInsert ? "등록하기" : "저장하기");
    // $("#hr011EditBtn").toggle(isView);
    // $("#hr011CancelBtn").toggle(!isView);
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
    if (hr011ProjectEvalModalProjectKey) {
        renderHr011ProjectEvaluationContent(hr011ProjectEvalModalProjectKey);
    }

    // 일부 탭 초기화가 버튼 라벨을 덮는 경우가 있어 모드 기준으로 한 번 더 보정한다.
    setTimeout(function () {
        const isInsertMode = hr011Mode === "insert";
        // $("#hr011CancelBtn, #hr011CancelBtnView").text(isInsertMode ? "등록취소" : "수정취소");
        $("#hr011SaveBtn, #hr011SaveBtnView").text(isInsertMode ? "등록하기" : "저장하기");
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

// Tab1에 '소속 및 계약' 테이블 불러오기
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

// '소속 및 계약' 테이블 데이터 수정, 저장
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
                html: `<div><strong>소속 및 계약</strong>&nbsp;저장 중 오류가 발생했습니다.</div>`
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
            html: `<div><strong>소속 및 계약</strong>&nbsp;데이터가 존재하지 않습니다.</div>`
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
                html: `<div><strong>소속 및 계약</strong>&nbsp;데이터가 삭제되었습니다.</div>`
            });
            loadHr011TableData(window.currentDevId);
        },
        error: () =>
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                html: `<div><strong>소속 및 계약</strong>&nbsp;데이터를 삭제하는 중 오류가 발생했습니다.</div>`
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
            html: `<div><strong>성명</strong>을(를) 입력하세요.</div>`
        });
        $("#dev_nm").focus();
        return false;
    }

    // 소속 구분
    if (!devTyp || devTyp === "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>소속구분</strong>을(를) 선택해주세요.</div>`
        });
        $("#select_dev_typ").focus();
        return false;
    }

    // 생년월일
    if (!brdt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>생년월일</strong>을(를) 입력하세요.</div>`
        });
        $("#brdt").focus();
        return false;
    }

    // 전화번호
    if (!tel) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>연락처</strong>을(를) 입력하세요./div>`
        });
        $("#tel").focus();
        return false;
    }

    // 전화번호 (숫자만 입력)
    if (!/^[0-9\-]+$/.test(tel)) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>연락처</strong>&nbsp;형식이 올바르지 않습니다.</div>`
        });
        $("#tel").focus();
        return false;
    }

    // 이메일
    if (!email) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>이메일</strong>을(를) 입력하세요.</div>`
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
            html: `<div><strong>이메일</strong>&nbsp;형식이 올바르지 않습니다.</div>`
        });
        $("#email").focus();
        return false;
    }

    // 근무 가능 형태
    if (!workMd || workMd === "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>근무가능형태</strong>을(를) 선택해주세요.</div>`
        });
        $("#select_work_md").focus();
        return false;
    }

    // 최종학력
    if (!eduLast) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>최종학력</strong>을(를) 입력하세요.</div>`
        });
        $("#edu_last").focus();
        return false;
    }

    // 희망단가
    if (!hopeRaw) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>단가</strong>을(를) 입력해주세요.</div>`
        });
        $("#hope_rate_amt").focus();
        return false;
    }

    // KOSA등급
    if (!kosaGrd || kosaGrd === "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>KOSA등급</strong>을(를) 선택해주세요.</div>`
        });
        $("#select_kosa_grd_cd").focus();
        return false;
    }

    // 경력연차
    if (expYrYear === "" || expYrMonth === "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>경력연차(년/개월)</strong>을(를) 입력하세요.</div>`
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
            html: `<div><strong>경력연차(년/개월)</strong>을(를) 입력하세요.</div>`
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
            html: `<div><strong>경력연차</strong>은(는) 년(0~99), 개월(0~12) 범위 내에서 입력해주세요.</div>`
        });
        $("#exp_yr_year").focus();
        return false;
    }
    syncCareerExpValue();

    // 주요분야
    if (!mainFld || mainFld === "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>주요분야</strong>을(를) 선택해주세요.</div>`
        });
        $("#select_main_fld_cd").focus();
        return false;
    }

    // 계약 형태
    if (!ctrtTyp || ctrtTyp === "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>계약형태</strong>을(를) 선택해주세요.</div>`
        });
        $("#select_ctrt_typ").focus();
        return false;
    }

    // 주요고객사
    if (!mainCust || mainCust === "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>주요고객사</strong>을(를) 선택해주세요.</div>`
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

    if (!orgNm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>소속사</strong>을(를) 입력해주세요.</div>`
        });
        $("#org_nm").focus();
        return false;
    }

    if (!stDt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>계약시작일</strong>을(를) 입력해주세요.</div>`
        });
        $("#st_dt").focus();
        return false;
    }

    if (!edDt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>계약종료일</strong>을(를) 입력해주세요.</div>`
        });
        $("#ed_dt").focus();
        return false;
    }

    if (new Date(stDt) > new Date(edDt)) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>계약종료일</strong>은(는)&nbsp;<strong>계약시작일</strong>&nbsp;이후여야 합니다.</div>`
        });
        $("#ed_dt").focus();
        return false;
    }

    if (!bizTyp) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>사업자유형</strong>을(를) 선택해주세요.</div>`
        });
        $("#select_biz_typ").focus();
        return false;
    }

    if (!amtRaw) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>계약금액</strong>을(를) 입력해주세요.</div>`
        });
        $("#amt").focus();
        return false;
    }

    if (isNaN(amtRaw) || Number(amtRaw) <= 0) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<div><strong>계약금액</strong>은(는) 0보다 큰 숫자여야 합니다.</div>`
        });
        $("#amt").focus();
        return false;
    }

    return true;
}

// ============================================================================== //
bindAmountInput("#amt");

// 금액 입력 공통함수
function bindAmountInput(selector) {
    let isDeleting = false;

    $(selector)
        .on("keydown", function (e) {
            const input = this;
            const allowKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];

            isDeleting = (e.key === "Backspace" || e.key === "Delete");

            // 0원이면 → "원"으로 초기화
            if (clearZeroKeepWon(input)) return;

            if (allowKeys.includes(e.key)) return;

            if (!/^\d$/.test(e.key)) {
                e.preventDefault();
            }
        })

        .on("input", function () {
            const input = this;

            if (clearZeroKeepWon(input)) return;

            let raw = (input.value || "").replace(/[^\d]/g, "");

            const caret = input.selectionStart ?? raw.length;
            const digitsBeforeCaret = countAmountDigitsBeforeCaret(raw, caret);

            let inputNumber = isDeleting ? raw : clampAmount(raw);

            input.value = formatAmount(inputNumber);

            setAmountCaretByDigitIndex(input, digitsBeforeCaret);
            clampAmountCaretToEditableRange(input);

            isDeleting = false;
        })

        .on("focus click", function () {
            const input = this;
            if (clearZeroKeepWon(input)) return;

            setTimeout(() => clampAmountCaretToEditableRange(input), 0);
        })

        .on("blur", function () {
            const input = this;

            let raw = (input.value || "").replace(/[^\d]/g, "");

            // 값 없거나 "원" 상태면 → 0원으로 복구
            if (!raw || raw === "0") {
                input.value = "0원";
                return;
            }

            input.value = formatAmount(clampAmount(raw));
        });
}

// 문자열 가공
function normalizeAmountValue(str) {
    if (!str) return "0.00";
    const num = Number(str.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(num)) return "0.00";
    const clamped = Math.min(num, 999999999999.99);
    return clamped.toFixed(2); // 문자열로 반환
}

// 숫자에 콤마
function formatNumber(num) {
    if (!num) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatAmount(num) {
    if (num === "" || num == null) return "0원";
    return formatNumber(num) + "원";
}

// "원"만 남기기
function clearZeroKeepWon(input) {
    const raw = (input.value || "").replace(/[^\d]/g, "");

    if (raw === "0") {
        input.value = "원";

        const pos = input.value.indexOf("원");
        input.setSelectionRange(pos, pos);

        return true;
    }
    return false;
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

// 날짜 (시작일 ~ 종료일) 표시
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
let hr011RefCurrentView = "overview";
let hr011RefProjectEvalCache = new Map();
let hr011RefProjectRadarCharts = new Map();
let hr011RefProjectExpandedKeys = null;
let hr011RefProjectAnimateOpenKey = "";
let hr011ProjectEvalModalExpandedKeysSnapshot = null;
let hr011ProjectEvalModalProjectKey = "";
let hr011ProjectEvalModalLastFocus = null;
let hr011ProjectEvalModalClosing = false;
let hr011ProjectRadarResizeTimer = null;
let hr011ProjectDetailRevealTimer = null;
const HR011_SKILL_CHART_PALETTE = ["#24b4e3", "#4d8dff", "#57d7c8", "#7a6dff", "#95d95c", "#ff9f43", "#ff6b6b"];

if (!window.hr011ProjectEvalModalEscBound) {
    window.hr011ProjectEvalModalEscBound = true;
    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        const modalEl = document.getElementById("hr011ProjectEvalModal");
        if (!modalEl || modalEl.hidden || !modalEl.classList.contains("is-open")) return;
        event.preventDefault();
        event.stopPropagation();
        closeHr011ProjectEvaluationModal();
    }, true);
}

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
    $("#hr011BackBtn").on("click", async function () {
        const isInsert = hr011Mode === "insert";
        const result = await showAlert({
            icon: "question",
            title: isInsert ? "등록 취소" : "수정 취소",
            text: isInsert ? "등록을 취소하고 목록으로 돌아가시겠습니까?" : "수정을 취소하고 목록으로 돌아가시겠습니까?",
            confirmText: isInsert ? "등록취소" : "취소하기",
            showCancelButton: true,
            cancelText: isInsert ? "계속 등록" : "계속 수정"
        });
        if (!result.isConfirmed) return;
        window.location.href = "/hr010";
    });

    // 수정 모드 진입
    $("#hr011EditBtnView").on("click", async function () {
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

    bindAmountInput("#hope_rate_amt");

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

    $(".hr011-edit-flow").on("input change", "input, select, textarea", function () {
        updateStepperUI();
    });

    // $("#hr011RefDetailEditBtn").on("click", function () {
    //     $("#hr011EditBtn").trigger("click");
    // });
    $("#hr011BackBtnView").on("click", function () {
        if (hr011Mode !== "view"){
            $("#hr011BackBtn").trigger("click");
        }
        window.location.href = "/hr010";
    });
    // $("#hr011EditBtnView").on("click", function () {
    //     $("#hr011EditBtn").trigger("click");
    // });
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
        await openHr011ProjectEvaluationModal(projectKey);
    });

    $(document).on("click", ".hr011-ref-project-detail-summary[data-project-key]", function () {
        const projectKey = String($(this).data("projectKey") || "");
        toggleHr011ProjectDetailExpanded(projectKey, this);
    });

    $(document).on("keydown", ".hr011-ref-project-detail-summary[data-project-key]", function (event) {
        const key = String(event.key || "").toLowerCase();
        if (key !== "enter" && key !== " ") return;
        event.preventDefault();
        const projectKey = String($(this).data("projectKey") || "");
        toggleHr011ProjectDetailExpanded(projectKey, this);
    });

    $(document).on("click", "[data-hr011-project-eval-close]", function () {
        closeHr011ProjectEvaluationModal();
    });

    $(document)
        .off("hr013:focusEvaluation.hr011")
        .on("hr013:focusEvaluation.hr011", function () {
            requestAnimationFrame(() => {
                goHr011EditStep("eval-risk");
            });
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
        // syncHr011EditStepStatus();
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
        loadHr011MainSelect("select_dev_typ", "DEV_TYP", hr011MainSelectMaps.devTyp, "프리랜서 / 직원"),
        loadHr011MainSelect("select_work_md", "WORK_MD", hr011MainSelectMaps.workMd, "근무 가능 형태"),
        loadHr011MainSelect("select_ctrt_typ", "CTRT_TYP", hr011MainSelectMaps.ctrtTyp, "계약 형태"),
        loadHr011MainSelect("select_kosa_grd_cd", "KOSA_GRD_CD", hr011MainSelectMaps.kosa, "KOSA 등급"),
        loadHr011MainSelect("select_main_fld_cd", "MAIN_FLD_CD", hr011MainSelectMaps.mainFld, "주요 분야"),
        loadHr011MainSelect("select_main_cust_cd", "MAIN_CUST_CD", hr011MainSelectMaps.mainCust, "주요 고객사"),
        loadHr011MainSelect("select_sido_cd", "SIDO_CD", hr011MainSelectMaps.sido, "거주지역")
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
        // scheduleHr011StepStatusSync();
        setTimeout(updateStepperUI, 0);
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
    // $("#select_dev_typ").val(defaultDevTyp);
    $("#select_dev_typ").val("");
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
    $("#hr011SaveBtn, #hr011SaveBtnView").text("등록하기");

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
function loadHr011MainSelect(selectId, grpCd, mapRef, placeholder) {
    return new Promise((resolve) => {
        setComCode(selectId, grpCd, "", "cd", "cd_nm", function () {
            const $select = $("#" + selectId);
            // placeholder 추가
            if (placeholder) {
                $select.prepend(`<option value="">${placeholder} 선택</option>`);
            }
            // map 세팅
            $select.find("option").each(function () {
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
    // var $form = $(".hr011-dashboard-grid");
    // const $reUploadProfile = $form.find(".re-upload-image");
    const hasImage = row && row.img_url;

    // 프로필 이미지 처리
    if (hasImage) {
        $img.attr("src", row.img_url).addClass("has-img").show();
        // $reUploadProfile.show();
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
    ]).then(function (res) {
        
        hideLoading();
    });
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

    const layoutEl = document.getElementById("hr011RefLayout");
    const overviewEl = document.getElementById("hr011RefOverview");
    const detailEl = document.getElementById("hr011RefDetail");
    const detailTitleEl = document.getElementById("hr011RefDetailTitle");
    const detailBodyEl = document.getElementById("hr011RefDetailBody");
    const pageEl = detailEl ? detailEl.closest(".hr011-page") : null;
    const detailActionsEl = detailEl ? detailEl.querySelector(".hr011-ref-detail-actions") : null;
    const leftProfileHeadEl = document.querySelector('.hr011-ref-left-head');
    const leftProfileLinkEl = document.querySelector('.hr011-ref-left-head .hr011-ref-link-btn[data-ref-view="profile"]');
    if (!overviewEl || !detailEl || !detailTitleEl || !detailBodyEl) return;

    if (layoutEl) {
        layoutEl.dataset.refView = normalized;
    }
    if (pageEl) {
        pageEl.dataset.refView = normalized;
    }
    detailEl.dataset.detailView = normalized;
    if (detailActionsEl) {
        detailActionsEl.hidden = normalized !== "overview";
    }
    setHr011SkillsDetailGridMode(detailBodyEl, normalized === "skills");

    if (leftProfileLinkEl) {
        // 프로필/스킬/프로젝트 상세에서는 좌측 >상세보기 버튼을 숨긴다.
        leftProfileLinkEl.hidden = normalized === "skills" || normalized === "project";
    }

    if (leftProfileHeadEl) {
        leftProfileHeadEl.hidden = false;
        leftProfileHeadEl.setAttribute("aria-hidden", normalized === "profile" ? "true" : "false");
    }

    if (normalized === "overview") {
        detailTitleEl.textContent = "상세";
        overviewEl.hidden = false;
        detailEl.hidden = true;
        if (detailActionsEl) {
            detailActionsEl.hidden = false;
        }
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
        const skillCardRows = buildHr011SkillCardRows(hr011CurrentRow || {});
        detailTitleEl.innerHTML = buildHr011DetailHeaderMarkup("보유 기술 상세", {
            rightLabel: "보유기술",
            rightValue: `${skillCardRows.length}개`
        });
        detailBodyEl.innerHTML = "";
        renderHr011RefSkillCards("hr011RefDetailBody");
        requestAnimationFrame(function () {
            animateHr011RefEntrance(detailEl);
            animateHr011SkillSection(detailEl);
        });
        return;
    }

    if (normalized === "project") {
        resetHr011ProjectEvaluationState();
        detailTitleEl.innerHTML = buildHr011DetailHeaderMarkup("프로젝트 이력", {
            rightLabel: "참여회수",
            rightValue: `${hr011RefProjectRows.length || 0}회`
        });
        detailBodyEl.innerHTML = buildHr011ProjectDetailMarkup();
        initializeHr011ProjectDetailEvaluations();
        requestAnimationFrame(function () {
            animateHr011RefEntrance(detailEl);
        });
        return;
    }

    detailTitleEl.innerHTML = buildHr011DetailHeaderMarkup("프로필");
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
        ".hr011-ref-project-eval-side"
    ].join(","));

    targets.forEach(function (el, idx) {
        const hasChartHost = !!el.querySelector(".hr011-ref-skill-card-grid, .hr011-ref-radar, .hr011-ref-project-eval-radar");
        const allowChartCardMotion = el.matches(".hr011-ref-project-detail-item, .hr011-ref-project-eval-side, .hr011-ref-radar-card, .hr011-ref-skill-card");
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
    const chartWraps = rootEl.querySelectorAll(".hr011-ref-skill-grid-wrap, .hr011-ref-skill-card-grid--detail");
    chartWraps.forEach(function (el) {
        el.classList.remove("is-skill-animated");
        void el.offsetWidth;
        el.classList.add("is-skill-animated");
    });

    const items = rootEl.querySelectorAll(".hr011-skill-stagger-item, .hr011-skill-score-row");
    items.forEach(function (el, idx) {
        const delay = idx * 48;
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
        // scheduleHr011StepStatusSync();
        setTimeout(updateStepperUI, 0);
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
    setTimeout(updateStepperUI, 0);
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

// 인적사항 정보 > 상세보기
function buildHr011ProfileDetailMarkup() {
    const row = hr011CurrentRow || {};
    const contract = window.hr011Data || {};
    const profileRemark = $.trim(String(row.remark || contract.remark || "-")) || "-";
    const contractRemark = $.trim(String(contract.remark || row.remark || "-")) || "-";
    const contractAmount = contract.amt
        ? $.trim(formatAmount(contract.amt).replace(/원$/, " 원")) || "-"
        : "-";

    return [
        `<div class="hr011-ref-profile-detail-wrap">`,
        `<article class="hr011-ref-detail-card hr011-ref-profile-detail-card hr011-ref-profile-detail-card--info">`,
        `<h6>상세 정보</h6>`,
        `<table class="hr011-ref-profile-table hr011-ref-profile-table--info">`,
        `<colgroup>`,
        `<col style="width:170px">`,
        `<col style="width:458px">`,
        `<col style="width:170px">`,
        `<col style="width:457px">`,
        `</colgroup>`,
        `<tbody>`,
        `<tr class="hr011-ref-profile-table-row"><th>개발자 ID</th><td>${escapeHr011(row.dev_id || "-")}</td><th>계약형태</th><td>${escapeHr011(hr011MainSelectMaps.ctrtTyp[row.ctrt_typ] || row.ctrt_typ || "-")}</td></tr>`,
        `<tr class="hr011-ref-profile-table-row"><th>주요 고객사</th><td>${escapeHr011(hr011MainSelectMaps.mainCust[row.main_cust_cd] || row.main_cust_cd || "-")}</td><th>투입 가능일</th><td>${escapeHr011(formatHr011Date(row.avail_dt))}</td></tr>`,
        `<tr class="hr011-ref-profile-table-row"><th>거주 지역</th><td>${escapeHr011(hr011MainSelectMaps.sido[row.sido_cd] || row.sido_cd || "-")}</td><th>생년월일</th><td>${escapeHr011(formatHr011Date(row.brdt))}</td></tr>`,
        `<tr class="hr011-ref-profile-table-row"><th>최종학력</th><td>${escapeHr011(row.edu_last || "-")}</td><th>경력</th><td>${escapeHr011(row.exp_yr ? formatCareerYearMonth(row.exp_yr) : "-")}</td></tr>`,
        `<tr class="hr011-ref-profile-table-row hr011-ref-profile-table-row--note hr011-ref-profile-table-row--note-short"><th>비고</th><td colspan="3">${escapeHr011(profileRemark)}</td></tr>`,
        `</tbody>`,
        `</table>`,
        `</article>`,
        `<article class="hr011-ref-detail-card hr011-ref-profile-detail-card hr011-ref-profile-detail-card--contract">`,
        `<h6>소속 및 계약 정보</h6>`,
        `<table class="hr011-ref-profile-table hr011-ref-profile-table--contract">`,
        `<colgroup>`,
        `<col style="width:170px">`,
        `<col style="width:458px">`,
        `<col style="width:170px">`,
        `<col style="width:457px">`,
        `</colgroup>`,
        `<tbody>`,
        `<tr class="hr011-ref-profile-table-row"><th>소속사</th><td>${escapeHr011(contract.org_nm || "-")}</td><th>사업자 유형</th><td>${escapeHr011(bizTypMap[contract.biz_typ] || contract.biz_typ || "-")}</td></tr>`,
        `<tr class="hr011-ref-profile-table-row"><th>계약 시작일</th><td>${escapeHr011(formatHr011Date(contract.st_dt))}</td><th>계약 종료일</th><td>${escapeHr011(formatHr011Date(contract.ed_dt))}</td></tr>`,
        `<tr class="hr011-ref-profile-table-row hr011-ref-profile-table-row--wide"><th>계약 금액</th><td class="hr011-ref-profile-table-value--amount" colspan="3">${escapeHr011(contractAmount)}</td></tr>`,
        `<tr class="hr011-ref-profile-table-row hr011-ref-profile-table-row--note hr011-ref-profile-table-row--note-tall"><th>비고</th><td colspan="3">${escapeHr011(contractRemark)}</td></tr>`,
        `</tbody>`,
        `</table>`,
        `</article>`,
        `</div>`
    ].join("");
}

function buildHr011DetailHeaderMarkup(titleText, options) {
    const meta = options || {};
    const rightLabel = $.trim(String(meta.rightLabel || ""));
    const rightValue = $.trim(String(meta.rightValue || ""));
    const rightMarkup = rightLabel && rightValue
        ? [
            `<span class="hr011-ref-detail-stat">`,
            `<span class="hr011-ref-detail-stat__label">${escapeHr011(rightLabel)}</span>`,
            `<strong class="hr011-ref-detail-stat__value">${escapeHr011(rightValue)}</strong>`,
            `</span>`
        ].join("")
        : "";

    return [
        `<button type="button" class="hr011-ref-detail-btn hr011-ref-detail-back" data-ref-view="overview" aria-label="메인으로">`,
        `<span class="hr011-visually-hidden">메인으로</span>`,
        `</button>`,
        `<span class="hr011-ref-detail-title">${escapeHr011(titleText || "")}</span>`,
        rightMarkup
    ].join("");
}

function getHr011ProjectDetailItemKey(item, idx) {
    const raw = item && (item.dev_prj_id || item.prj_nm || item.org_nm || item.cust_nm || item.cli_nm || "");
    return String(raw || `row-${idx}`).trim();
}

function getHr011ProjectDetailDefaultExpandedKey(rows) {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return "";
    const internalRow = list.find(function (item) {
        return isHr011InternalProject(item);
    });
    const target = internalRow || list[0];
    const targetIndex = list.indexOf(target);
    return getHr011ProjectDetailItemKey(target, targetIndex < 0 ? 0 : targetIndex);
}

function formatHr011ProjectDateText(value) {
    const formatted = formatHr011Date(value);
    if (!formatted || formatted === "-") return "-";
    return formatted.replace(/-/g, ".");
}

function formatHr011ProjectPeriodText(stDt, edDt) {
    return `${formatHr011ProjectDateText(stDt)} ~ ${formatHr011ProjectDateText(edDt)}`;
}

function formatHr011ProjectAmountText(value) {
    const raw = $.trim(String(value == null ? "" : value)).replace(/[^\d.]/g, "");
    if (!raw) return "-";
    const num = Number(raw);
    if (!Number.isFinite(num)) return "-";
    const rounded = Math.round(num);
    return `${rounded === 0 ? "0" : formatNumber(rounded)} 원`;
}

function formatHr011ProjectPercentText(value) {
    const raw = $.trim(String(value == null ? "" : value)).replace(/[^\d.]/g, "");
    if (!raw) return "-";
    return `${raw} %`;
}

function buildHr011ProjectDetailStarsMarkup(score) {
    const count = Math.max(0, Math.min(5, Number(score) || 0));
    return Array.from({ length: 5 }, function (_item, idx) {
        return `<span class="hr011-ref-project-detail-star ${idx < count ? "is-on" : ""}" aria-hidden="true">★</span>`;
    }).join("");
}

function buildHr011ProjectDetailRowMarkup(label, value, className) {
    return [
        `<div class="hr011-ref-project-detail-row ${className || ""}">`,
        `<span class="label">${escapeHr011(label)}</span>`,
        `<strong>${escapeHr011(value)}</strong>`,
        `</div>`
    ].join("");
}

function buildHr011ProjectDetailOpenBodyMarkup(item, state, projectKey, domId, isInternal) {
    const avgScore = getHr011ProjectEvalAverageScore(state);
    const avgRounded = avgScore == null ? null : Math.round(avgScore);
    const avgValueText = avgRounded == null ? "-" : `${avgRounded}점`;
    const avgStarsMarkup = avgRounded == null ? "" : buildHr011ProjectDetailStarsMarkup(avgRounded);
    const evalRadarId = `hr011RefProjectEvalRadar-${domId}`;
    const summaryValueId = `hr011RefProjectEvalSummaryValue-${domId}`;
    const summaryStarsId = `hr011RefProjectEvalSummaryStars-${domId}`;

    return [
        `<div class="hr011-ref-project-detail-open-wrap">`,
        `<div class="hr011-ref-project-detail-open-grid">`,
        `<section class="hr011-ref-project-detail-panel hr011-ref-project-detail-panel--info">`,
        `<div class="hr011-ref-project-detail-rows">`,
        buildHr011ProjectDetailRowMarkup("역할", item.role_nm || "-", ""),
        buildHr011ProjectDetailRowMarkup("기간", formatHr011ProjectPeriodText(item.st_dt, item.ed_dt), ""),
        buildHr011ProjectDetailRowMarkup("단가", formatHr011ProjectAmountText(item.rate_amt), ""),
        buildHr011ProjectDetailRowMarkup("투입률", formatHr011ProjectPercentText(item.alloc_pct), ""),
        `<div class="hr011-ref-project-detail-row hr011-ref-project-detail-row--score">`,
        `<span class="label">프로젝트 개인평가 평균 점수</span>`,
        `<div class="hr011-ref-project-detail-score" id="hr011RefProjectEvalSummary-${domId}">`,
        `<span class="hr011-ref-project-detail-stars" id="${summaryStarsId}">${avgStarsMarkup}</span>`,
        `<strong class="hr011-ref-project-detail-score-value" id="${summaryValueId}">${escapeHr011(avgValueText)}</strong>`,
        `</div>`,
        `</div>`,
        `</div>`,
        `</section>`,
        isInternal
            ? [
                `<aside class="hr011-ref-project-eval-side hr011-ref-project-detail-panel hr011-ref-project-detail-panel--chart">`,
                `<div class="hr011-ref-project-eval-radar" id="${evalRadarId}"></div>`,
                `<button type="button" class="hr011-ref-project-eval-toggle" data-project-key="${escapeHr011(projectKey)}">평가 상세 보기</button>`,
                `</aside>`
            ].join("")
            : [
                `<aside class="hr011-ref-project-eval-side hr011-ref-project-detail-panel hr011-ref-project-detail-panel--chart hr011-ref-project-eval-side--readonly">`,
                `<div class="hr011-ref-project-eval-external">외부 프로젝트</div>`,
                `</aside>`
            ].join(""),
        `</div>`,
        `</div>`
    ].join("");
}

function activateHr011ProjectDetailOpenAnimation(rootEl) {
    const animateKey = String(hr011RefProjectAnimateOpenKey || "");
    hr011RefProjectAnimateOpenKey = "";
    if (!rootEl || !animateKey) return;

    const openItem = Array.from(rootEl.querySelectorAll(".hr011-ref-project-detail-item.is-open.is-opening")).find(function (itemEl) {
        return String(itemEl.dataset.projectKey || "") === animateKey;
    });
    if (!openItem) return;

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            openItem.classList.add("is-open-active");
            window.setTimeout(function () {
                openItem.classList.remove("is-opening", "is-open-active");
            }, 560);
        });
    });
}

function findHr011ProjectDetailSummaryByKey(rootEl, projectKey) {
    const scopeEl = rootEl || document;
    return Array.from(scopeEl.querySelectorAll(".hr011-ref-project-detail-summary[data-project-key]")).find(function (itemEl) {
        return String(itemEl.dataset.projectKey || "") === String(projectKey || "");
    }) || null;
}

function findHr011ProjectDetailItemByKey(rootEl, projectKey) {
    const scopeEl = rootEl || document;
    return Array.from(scopeEl.querySelectorAll(".hr011-ref-project-detail-item[data-project-key]")).find(function (itemEl) {
        return String(itemEl.dataset.projectKey || "") === String(projectKey || "");
    }) || null;
}

function cancelHr011ProjectDetailScrollAnimation(listEl) {
    if (!listEl) return;
    if (listEl.__hr011ProjectDetailScrollRafId) {
        cancelAnimationFrame(listEl.__hr011ProjectDetailScrollRafId);
        listEl.__hr011ProjectDetailScrollRafId = 0;
    }
}

function animateHr011ProjectDetailScroll(listEl, targetTop, durationMs) {
    if (!listEl) return;

    cancelHr011ProjectDetailScrollAnimation(listEl);

    const startTop = Number(listEl.scrollTop) || 0;
    const nextTop = Math.max(0, Number(targetTop) || 0);
    const delta = nextTop - startTop;
    if (Math.abs(delta) < 1) {
        listEl.scrollTop = nextTop;
        return;
    }

    const duration = Math.max(220, Math.min(520, Number(durationMs) || (240 + Math.min(220, Math.abs(delta) * 0.14))));
    const startTime = (typeof performance !== "undefined" && typeof performance.now === "function")
        ? performance.now()
        : Date.now();
    const easeOutCubic = function (t) {
        const p = 1 - Math.max(0, Math.min(1, t));
        return 1 - (p * p * p);
    };

    const tick = function (now) {
        if (!listEl.isConnected) {
            cancelHr011ProjectDetailScrollAnimation(listEl);
            return;
        }

        const elapsed = now - startTime;
        const progress = Math.max(0, Math.min(1, elapsed / duration));
        const eased = easeOutCubic(progress);
        listEl.scrollTop = startTop + (delta * eased);

        if (progress < 1) {
            listEl.__hr011ProjectDetailScrollRafId = requestAnimationFrame(tick);
        } else {
            listEl.scrollTop = nextTop;
            listEl.__hr011ProjectDetailScrollRafId = 0;
        }
    };

    listEl.__hr011ProjectDetailScrollRafId = requestAnimationFrame(tick);
}

function captureHr011ProjectDetailScrollState(projectKey, triggerEl) {
    const detailBodyEl = document.getElementById("hr011RefDetailBody");
    const listEl = detailBodyEl ? detailBodyEl.querySelector(".hr011-ref-project-detail-list") : null;
    const anchorEl = triggerEl || findHr011ProjectDetailSummaryByKey(detailBodyEl, projectKey);
    if (!listEl || !anchorEl) {
        return null;
    }

    return {
        projectKey: String(projectKey || ""),
        scrollTop: listEl.scrollTop,
        anchorOffset: anchorEl.getBoundingClientRect().top - listEl.getBoundingClientRect().top,
        restoreFocus: document.activeElement === anchorEl
    };
}

function restoreHr011ProjectDetailScrollState(scrollState) {
    if (!scrollState || !scrollState.projectKey) {
        return;
    }

    const detailBodyEl = document.getElementById("hr011RefDetailBody");
    const listEl = detailBodyEl ? detailBodyEl.querySelector(".hr011-ref-project-detail-list") : null;
    const anchorEl = findHr011ProjectDetailSummaryByKey(detailBodyEl, scrollState.projectKey);
    if (!listEl || !anchorEl) {
        return;
    }

    if (scrollState.restoreFocus && typeof anchorEl.focus === "function") {
        try {
            anchorEl.focus({ preventScroll: true });
        } catch (error) {
            anchorEl.focus();
        }
    }

    // Re-rendering the list changes item heights above the click target, so keep the clicked row anchored.
    listEl.scrollTop = scrollState.scrollTop;
    const nextAnchorOffset = anchorEl.getBoundingClientRect().top - listEl.getBoundingClientRect().top;
    listEl.scrollTop += nextAnchorOffset - scrollState.anchorOffset;
}

function revealHr011ProjectDetailItem(projectKey) {
    const detailBodyEl = document.getElementById("hr011RefDetailBody");
    const listEl = detailBodyEl ? detailBodyEl.querySelector(".hr011-ref-project-detail-list") : null;
    const itemEl = findHr011ProjectDetailItemByKey(detailBodyEl, projectKey);
    if (!listEl || !itemEl) {
        return;
    }

    const listRect = listEl.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();
    const itemTop = listEl.scrollTop + (itemRect.top - listRect.top);
    const maxScrollTop = Math.max(0, (listEl.scrollHeight || 0) - (listEl.clientHeight || 0));
    const nextScrollTop = Math.min(maxScrollTop, Math.max(0, itemTop - 16));
    animateHr011ProjectDetailScroll(listEl, nextScrollTop);
}

function syncHr011ProjectExpandedKeys(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const availableKeys = new Set(list.map(function (item, idx) {
        return getHr011ProjectDetailItemKey(item, idx);
    }));

    if (!(hr011RefProjectExpandedKeys instanceof Set)) {
        hr011RefProjectExpandedKeys = new Set();
        return;
    }

    hr011RefProjectExpandedKeys.forEach(function (key) {
        if (!availableKeys.has(key)) {
            hr011RefProjectExpandedKeys.delete(key);
        }
    });
}

function cloneHr011ProjectExpandedKeys(keys) {
    if (!(keys instanceof Set)) {
        return null;
    }
    return new Set(Array.from(keys));
}

function setHr011ProjectExpandedKeysOnly(projectKey) {
    const key = String(projectKey || "");
    hr011RefProjectExpandedKeys = key ? new Set([key]) : new Set();
    hr011RefProjectAnimateOpenKey = "";
    syncHr011ProjectExpandedKeys(hr011RefProjectRows || []);
}

function renderHr011ProjectDetailView(options) {
    const detailBodyEl = document.getElementById("hr011RefDetailBody");
    if (!detailBodyEl) return;
    cancelHr011ProjectDetailScrollAnimation(detailBodyEl.querySelector(".hr011-ref-project-detail-list"));
    if (hr011ProjectDetailRevealTimer) {
        clearTimeout(hr011ProjectDetailRevealTimer);
        hr011ProjectDetailRevealTimer = null;
    }
    const renderOptions = options || {};
    const scrollState = captureHr011ProjectDetailScrollState(renderOptions.anchorProjectKey, renderOptions.triggerEl);
    detailBodyEl.innerHTML = buildHr011ProjectDetailMarkup();
    initializeHr011ProjectDetailEvaluations();
    activateHr011ProjectDetailOpenAnimation(detailBodyEl);
    if (scrollState) {
        requestAnimationFrame(function () {
            restoreHr011ProjectDetailScrollState(scrollState);
            if (renderOptions.revealProjectKey) {
                requestAnimationFrame(function () {
                    revealHr011ProjectDetailItem(renderOptions.revealProjectKey);
                });
                hr011ProjectDetailRevealTimer = window.setTimeout(function () {
                    hr011ProjectDetailRevealTimer = null;
                    revealHr011ProjectDetailItem(renderOptions.revealProjectKey);
                }, 460);
            }
        });
    }
}

function toggleHr011ProjectDetailExpanded(projectKey, triggerEl) {
    const key = String(projectKey || "");
    if (!key) return;

    syncHr011ProjectExpandedKeys(hr011RefProjectRows || []);

    if (!(hr011RefProjectExpandedKeys instanceof Set)) {
        hr011RefProjectExpandedKeys = new Set();
    }

    if (hr011RefProjectExpandedKeys.has(key)) {
        hr011RefProjectExpandedKeys.delete(key);
        hr011RefProjectAnimateOpenKey = "";
    } else {
        hr011RefProjectExpandedKeys.add(key);
        hr011RefProjectAnimateOpenKey = key;
    }

    if (hr011RefCurrentView !== "project") return;
    renderHr011ProjectDetailView({
        anchorProjectKey: key,
        triggerEl: triggerEl || null,
        revealProjectKey: hr011RefProjectExpandedKeys.has(key) ? key : ""
    });
}

function setHr011SkillsDetailGridMode(detailBodyEl, enabled) {
    if (!detailBodyEl) return;
    detailBodyEl.classList.toggle("hr011-ref-skill-card-grid", !!enabled);
    detailBodyEl.classList.toggle("hr011-ref-skill-card-grid--detail", !!enabled);
}

function buildHr011ProjectDetailMarkup() {
    const rows = hr011RefProjectRows || [];
    if (!rows.length) {
        return `<article class="hr011-ref-detail-card hr011-ref-project-detail-empty"><h6>프로젝트 이력</h6><p>등록된 프로젝트가 없습니다.</p></article>`;
    }

    syncHr011ProjectExpandedKeys(rows);

    return [
        `<div class="hr011-ref-project-detail-list">`,
        rows.map(function (item, idx) {
            const stacks = parseHr011SkillList(item.stack_txt_nm || item.stack_txt);
            const projectKey = getHr011ProjectDetailItemKey(item, idx);
            const projectDomId = makeHr011SafeDomId(projectKey);
            const isInternal = isHr011InternalProject(item);
            if (!hr011RefProjectEvalCache.has(projectKey)) {
                hr011RefProjectEvalCache.set(projectKey, createHr011ProjectEvalState(item, projectKey, projectDomId));
            }
            const state = hr011RefProjectEvalCache.get(projectKey);
            const isExpanded = hr011RefProjectExpandedKeys instanceof Set && hr011RefProjectExpandedKeys.has(projectKey);
            const isAnimatingOpen = isExpanded && hr011RefProjectAnimateOpenKey === projectKey;
            const stackMarkup = (stacks.length ? stacks : ["-"]).slice(0, 4).map(function (stack) {
                return `<span class="chip">${escapeHr011(stack)}</span>`;
            }).join("");
            return [
                `<article class="hr011-ref-project-detail-item ${isExpanded ? "is-open" : "is-closed"} ${isAnimatingOpen ? "is-opening" : ""}" data-project-key="${escapeHr011(projectKey)}" data-internal="${isInternal ? "Y" : "N"}">`,
                `<div class="hr011-ref-project-detail-summary" role="button" tabindex="0" aria-expanded="${isExpanded ? "true" : "false"}" data-project-key="${escapeHr011(projectKey)}">`,
                `<div class="hr011-ref-project-detail-summary-main">`,
                buildHr011ProjectBadgeMarkup(item.org_nm || item.cust_nm || item.cli_nm || "-", isInternal),
                `<div class="hr011-ref-project-detail-summary-copy">`,
                `<div class="hr011-ref-project-detail-title">${escapeHr011(item.prj_nm || "-")}</div>`,
                `<div class="hr011-ref-project-detail-stack-row">`,
                `<span class="label">주 개발언어</span>`,
                `<div class="stack">${stackMarkup || `<span class="chip chip--empty">-</span>`}</div>`,
                `</div>`,
                `</div>`,
                `</div>`,
                `<span class="hr011-ref-project-detail-chevron" aria-hidden="true"></span>`,
                `</div>`,
                isExpanded ? buildHr011ProjectDetailOpenBodyMarkup(item, state || createHr011ProjectEvalState(item, projectKey, projectDomId), projectKey, projectDomId, isInternal) : "",
                `</article>`
            ].join("");
        }).join(""),
        `</div>`
    ].join("");
}

function resetHr011ProjectEvaluationState() {
    hr011RefProjectEvalCache = new Map();
    hr011RefProjectExpandedKeys = null;
    hr011RefProjectAnimateOpenKey = "";
    hr011ProjectEvalModalExpandedKeysSnapshot = null;
    if (hr011ProjectDetailRevealTimer) {
        clearTimeout(hr011ProjectDetailRevealTimer);
        hr011ProjectDetailRevealTimer = null;
    }
    if (hr011ProjectRadarResizeTimer) {
        clearTimeout(hr011ProjectRadarResizeTimer);
        hr011ProjectRadarResizeTimer = null;
    }
    if (hr011RefProjectRadarCharts && typeof hr011RefProjectRadarCharts.forEach === "function") {
        hr011RefProjectRadarCharts.forEach(function (chart) {
            if (chart && typeof chart.getDom === "function") {
                cleanupHr011RadarResizeObserver(chart.getDom());
            }
            if (chart && typeof chart.dispose === "function") chart.dispose();
        });
    }
    const modalRadarEl = document.querySelector('[id^="hr011ProjectEvalModalRadar-"]');
    if (modalRadarEl) {
        cleanupHr011RadarResizeObserver(modalRadarEl);
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
            hasRow: false,
            leave_txt: "",
            claim_txt: "",
            sec_txt: "",
            re_in_yn: "",
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
            hasRow: !!(Array.isArray(riskResponse?.list) && riskResponse.list.length),
            leave_txt: riskRow.leave_txt || "",
            claim_txt: riskRow.claim_txt || "",
            sec_txt: riskRow.sec_txt || "",
            re_in_yn: riskRow.re_in_yn || "",
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
    const summaryValueEl = document.getElementById(`hr011RefProjectEvalSummaryValue-${state.domId}`);
    const summaryStarsEl = document.getElementById(`hr011RefProjectEvalSummaryStars-${state.domId}`);
    if (metaEl) {
        const scores = state.evalRows.map(function (row) { return resolveHr011EvalLevelFromRow(row); }).filter(function (v) { return v > 0; });
        if (!scores.length) {
            metaEl.textContent = "개인평가 데이터가 없습니다.";
        } else {
            const avg = scores.reduce(function (sum, v) { return sum + v; }, 0) / scores.length;
            metaEl.textContent = `개인평가 평균 ${avg.toFixed(1)}점 (5점 만점)`;
        }
    }
    if (summaryValueEl || summaryStarsEl) {
        const avg = getHr011ProjectEvalAverageScore(state);
        const avgRounded = avg == null ? null : Math.round(avg);
        if (summaryStarsEl) {
            summaryStarsEl.innerHTML = avgRounded == null ? "" : buildHr011ProjectDetailStarsMarkup(avgRounded);
        }
        if (summaryValueEl) {
            summaryValueEl.textContent = avgRounded == null ? "-" : `${avgRounded}점`;
        }
    }
    renderHr011ProjectEvalRadar(projectKey);
}

function resizeHr011ProjectRadarCharts() {
    if (!hr011RefProjectRadarCharts || typeof hr011RefProjectRadarCharts.forEach !== "function") {
        return;
    }

    hr011RefProjectRadarCharts.forEach(function (chart) {
        if (chart && typeof chart.resize === "function") {
            chart.resize();
        }
    });
}

function scheduleHr011ProjectRadarResize(delayMs) {
    const delay = Math.max(0, Number(delayMs) || 0);
    if (hr011ProjectRadarResizeTimer) {
        clearTimeout(hr011ProjectRadarResizeTimer);
        hr011ProjectRadarResizeTimer = null;
    }

    hr011ProjectRadarResizeTimer = setTimeout(function () {
        hr011ProjectRadarResizeTimer = null;
        requestAnimationFrame(function () {
            resizeHr011ProjectRadarCharts();
            requestAnimationFrame(function () {
                resizeHr011ProjectRadarCharts();
            });
        });
    }, delay);
}

function cleanupHr011RadarResizeObserver(chartEl) {
    if (!chartEl) return;
    if (typeof chartEl.__hr011RadarResizeCleanup === "function") {
        chartEl.__hr011RadarResizeCleanup();
        return;
    }
    if (chartEl.__hr011RadarResizeObserver && typeof chartEl.__hr011RadarResizeObserver.disconnect === "function") {
        chartEl.__hr011RadarResizeObserver.disconnect();
    }
    chartEl.__hr011RadarResizeObserver = null;
    chartEl.__hr011RadarResizeCleanup = null;
    chartEl.__hr011RadarResizeRafId = 0;
}

function bindHr011RadarResizeObserver(chartEl, resizeFn) {
    if (!chartEl || typeof ResizeObserver !== "function" || typeof resizeFn !== "function") return;

    cleanupHr011RadarResizeObserver(chartEl);

    let rafId = 0;
    const observer = new ResizeObserver(function (entries) {
        if (!entries || !entries.length) return;
        const entry = entries[0];
        const width = Number(entry && entry.contentRect && entry.contentRect.width) || 0;
        const height = Number(entry && entry.contentRect && entry.contentRect.height) || 0;
        if (width <= 0 || height <= 0) return;
        if (rafId) return;
        rafId = requestAnimationFrame(function () {
            rafId = 0;
            if (!chartEl.isConnected) return;
            resizeFn();
        });
    });

    observer.observe(chartEl);
    chartEl.__hr011RadarResizeObserver = observer;
    chartEl.__hr011RadarResizeCleanup = function () {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        observer.disconnect();
        chartEl.__hr011RadarResizeObserver = null;
        chartEl.__hr011RadarResizeCleanup = null;
        chartEl.__hr011RadarResizeRafId = 0;
    };
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
        cleanupHr011RadarResizeObserver(chartEl);
        if (chart && typeof chart.dispose === "function") {
            chart.dispose();
        }
        hr011RefProjectRadarCharts.delete(projectKey);
        chartEl.innerHTML = `<div class="hr011-ref-project-eval-empty">평가 없음</div>`;
        return;
    }

    if (!chart || (typeof chart.getDom === "function" && chart.getDom() !== chartEl)) {
        // 기존 인스턴스가 없을 때만 placeholder를 정리한다.
        if (chart && typeof chart.getDom === "function") {
            cleanupHr011RadarResizeObserver(chart.getDom());
        }
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

    const sanitizeRadarLabel = function (text) {
        return $.trim(String(text == null ? "" : text)).replace(/\s+/g, " ") || "-";
    };
    const formatRadarAxisLabel = function (text) {
        const label = sanitizeRadarLabel(text);
        if (label === "문제해결능력") return "문제해결력";
        if (label.length <= 7) return label;
        const midpoint = Math.ceil(label.length / 2);
        return `${label.slice(0, midpoint)}\n${label.slice(midpoint)}`;
    };
    const formatRadarScoreText = function (value) {
        const num = Number(value);
        if (!Number.isFinite(num) || num <= 0) return "0 점";
        return `${Math.round(num)} 점`;
    };
    const radarScoreMap = {};
    const indicators = rows.map(function (row) {
        const label = sanitizeRadarLabel(row.cd_nm || row.eval_id || "-");
        radarScoreMap[label] = formatRadarScoreText(resolveHr011EvalLevelFromRow(row));
        return {
            name: label,
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
        textStyle: {
            fontFamily: "Inter, sans-serif"
        },
        radar: {
            center: ["50%", "56%"],
            radius: "60%",
            splitNumber: 4,
            indicator: indicators,
            axisName: {
                color: "#727272",
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                fontWeight: 400,
                lineHeight: 15,
                distance: 0,
                formatter: function (name) {
                    return `{label|${formatRadarAxisLabel(name)}}\n{value|${radarScoreMap[name] || "0 점"}}`;
                },
                rich: {
                    label: {
                        color: "#727272",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        fontWeight: 400,
                        lineHeight: 15,
                        align: "center",
                        padding: [0, 0, 5, 0]
                    },
                    value: {
                        color: "#000000",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        lineHeight: 18,
                        align: "center",
                        padding: [0, 0, 0, 0]
                    }
                }
            },
            splitArea: {
                areaStyle: {
                    color: ["#ffffff", "#f8fafd"]
                }
            },
            splitLine: {
                lineStyle: {
                    color: "#b0b7c4",
                    width: 1,
                    type: "dashed"
                }
            },
            axisLine: {
                lineStyle: {
                    color: "#b0b7c4",
                    width: 1,
                    type: "dashed"
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
            lineStyle: { width: 2, color: "#4f6ff7" },
            itemStyle: { color: "#4f6ff7" },
            areaStyle: { color: "rgba(79, 111, 247, 0.16)" },
            data: [{ value: values, name: "개인평가" }]
        }]
    }, true);

    bindHr011RadarResizeObserver(chartEl, function () {
        const currentChart = hr011RefProjectRadarCharts.get(projectKey);
        if (currentChart && typeof currentChart.resize === "function") {
            currentChart.resize();
        }
    });

    if (typeof chart.resize === "function") {
        requestAnimationFrame(function () {
            chart.resize();
            requestAnimationFrame(function () {
                chart.resize();
            });
        });
    }
}

function getHr011ProjectEvalModalEl() {
    return document.getElementById("hr011ProjectEvalModal");
}

function getHr011ProjectEvalModalBodyEl() {
    return document.getElementById("hr011ProjectEvalModalBody");
}

function getHr011ProjectEvalAverageScore(state) {
    const scores = (state && Array.isArray(state.evalRows) ? state.evalRows : [])
        .map(function (row) { return resolveHr011EvalLevelFromRow(row); })
        .filter(function (value) { return value > 0; });
    if (!scores.length) return null;
    return scores.reduce(function (sum, value) { return sum + value; }, 0) / scores.length;
}

function buildHr011ProjectEvalPopupMemoText(rows) {
    const items = (Array.isArray(rows) ? rows : [])
        .map(function (row) {
            return {
                label: $.trim(String(row && row.cd_nm ? row.cd_nm : "")),
                memo: $.trim(String(row && row.cmt ? row.cmt : ""))
            };
        })
        .filter(function (item) { return item.memo; });

    if (!items.length) {
        return "등록된 평가 메모가 없습니다.";
    }

    if (items.length === 1) {
        return items[0].memo;
    }

    return items.map(function (item) {
        return `${item.label || "-"}: ${item.memo}`;
    }).join("\n");
}

function hasHr011ProjectRiskText(value) {
    return !!$.trim(String(value || ""));
}

function getHr011ProjectEvalPopupRiskItems(state) {
    const risk = state && state.risk ? state.risk : {};
    const items = [];
    const addTextItem = function (label, tone, text) {
        const value = $.trim(String(text || ""));
        if (!value) {
            return;
        }

        items.push({
            label: label,
            tone: tone,
            body: value
        });
    };

    addTextItem("이탈이력", "info", risk.leave_txt);
    addTextItem("클레임", "danger", risk.claim_txt);
    addTextItem("보안이슈", "info", risk.sec_txt);
    addTextItem("관리메모", "danger", risk.memo);

    if (risk.hasRow && $.trim(String(risk.re_in_yn || ""))) {
        items.push({
            label: "재투입 가능 여부",
            tone: String(risk.re_in_yn || "").toUpperCase() === "Y" ? "success" : "neutral",
            badgeText: String(risk.re_in_yn || "").toUpperCase() === "Y" ? "가능" : "불가",
            body: ""
        });
    }

    return items;
}

function buildHr011ProjectEvalPopupRiskCardMarkup(item) {
    if (!item) {
        return "";
    }

    const bodyMarkup = item.body
        ? `<p class="hr011-ref-project-eval-popup-risk-card__body">${escapeHr011(item.body)}</p>`
        : "";
    const badgeMarkup = item.badgeText
        ? `<strong class="hr011-ref-project-eval-popup-risk-card__badge">${escapeHr011(item.badgeText)}</strong>`
        : "";

    return [
        `<article class="hr011-ref-project-eval-popup-risk-card hr011-ref-project-eval-popup-risk-card--${escapeHr011(item.tone || "info")}">`,
        `<div class="hr011-ref-project-eval-popup-risk-card__head">`,
        `<span class="hr011-ref-project-eval-popup-risk-card__label">${escapeHr011(item.label || "-")}</span>`,
        badgeMarkup,
        `</div>`,
        bodyMarkup,
        `</article>`
    ].join("");
}

function buildHr011ProjectEvalPopupViewMarkup(projectKey, state) {
    const rows = Array.isArray(state.evalRows) && state.evalRows.length
        ? state.evalRows
        : [{ eval_id: "", cd_nm: "평가 항목 미등록", lv1: "N", lv2: "N", lv3: "N", lv4: "N", lv5: "N", cmt: "" }];
    const avg = getHr011ProjectEvalAverageScore(state);
    const avgText = avg == null ? "-" : avg.toFixed(1);
    const avgMaxText = "5점 만점";
    const memoText = buildHr011ProjectEvalPopupMemoText(rows);
    const riskItems = getHr011ProjectEvalPopupRiskItems(state);
    return [
        `<div class="hr011-ref-project-eval-popup-view">`,
        `<div class="hr011-ref-project-eval-popup-section hr011-ref-project-eval-popup-section--capability">`,
        `<div class="hr011-ref-project-eval-popup-section-head">`,
        `<h6>역량 평가</h6>`,
        `<div class="hr011-ref-project-eval-popup-average"><span>평균 점수</span><strong>${escapeHr011(avgText)}</strong><span class="hr011-ref-project-eval-popup-average-max">${escapeHr011(avgMaxText)}</span></div>`,
        `</div>`,
        `<div class="hr011-ref-project-eval-popup-radar-box">`,
        `<div class="hr011-ref-project-eval-popup-radar" id="hr011ProjectEvalModalRadar-${makeHr011SafeDomId(projectKey)}"></div>`,
        `</div>`,
        `</div>`,
        `<div class="hr011-ref-project-eval-popup-section hr011-ref-project-eval-popup-section--memo">`,
        `<div class="hr011-ref-project-eval-popup-field-label">평가 메모</div>`,
        `<div class="hr011-ref-project-eval-popup-textfield">${escapeHr011(memoText)}</div>`,
        `</div>`,
        riskItems.length ? [
            `<div class="hr011-ref-project-eval-popup-section hr011-ref-project-eval-popup-section--risk">`,
            `<h6>리스크 평가</h6>`,
            `<div class="hr011-ref-project-eval-popup-risk-list">`,
            riskItems.map(function (item) {
                return buildHr011ProjectEvalPopupRiskCardMarkup(item);
            }).join(""),
            `</div>`,
            `</div>`
        ].join("") : "",
        `</div>`
    ].join("");
}

function renderHr011ProjectEvalPopupRadar(projectKey) {
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state) return;
    const chartEl = document.getElementById(`hr011ProjectEvalModalRadar-${makeHr011SafeDomId(projectKey)}`);
    if (!chartEl || typeof echarts !== "object" || typeof echarts.init !== "function") return;
    if ((chartEl.clientWidth <= 0 || chartEl.clientHeight <= 0)) {
        const retry = Number(chartEl.dataset.animRetry || 0);
        if (retry < 10) {
            chartEl.dataset.animRetry = String(retry + 1);
            requestAnimationFrame(function () {
                setTimeout(function () {
                    renderHr011ProjectEvalPopupRadar(projectKey);
                }, 60);
            });
        }
        return;
    }
    delete chartEl.dataset.animRetry;

    const rows = Array.isArray(state.evalRows) ? state.evalRows : [];
    const hasData = rows.some(function (row) { return resolveHr011EvalLevelFromRow(row) > 0; });
    let chart = echarts.getInstanceByDom(chartEl);

    if (!hasData) {
        cleanupHr011RadarResizeObserver(chartEl);
        if (chart && typeof chart.dispose === "function") {
            chart.dispose();
        }
        chartEl.innerHTML = `<div class="hr011-ref-project-eval-empty">평가 없음</div>`;
        return;
    }

    if (!chart) {
        chart = echarts.init(chartEl, null, { renderer: "svg" });
    }
    if (typeof chart.clear === "function") {
        chart.clear();
    }

    const sanitizeRadarLabel = function (text) {
        return String(text || "").replace(/[{}|]/g, "");
    };
    const formatRadarAxisLabel = function (text) {
        const label = sanitizeRadarLabel(text);
        const chars = Array.from(label);
        if (chars.length <= 5) {
            return label;
        }
        const splitIndex = Math.ceil(chars.length / 2);
        return `${chars.slice(0, splitIndex).join("")}\n${chars.slice(splitIndex).join("")}`;
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
    const indicators = rows.map(function (row) {
        const label = sanitizeRadarLabel(row.cd_nm || row.eval_id || "-");
        radarScoreMap[label] = formatRadarScoreText(resolveHr011EvalLevelFromRow(row));
        return {
            name: label,
            max: 5
        };
    });
    const values = rows.map(function (row) { return resolveHr011EvalLevelFromRow(row); });

    chart.setOption({
        animation: true,
        animationDuration: 880,
        animationEasing: "quarticOut",
        animationDurationUpdate: 560,
        animationEasingUpdate: "cubicInOut",
        animationDelay: function (idx) { return idx * 48; },
        textStyle: {
            fontFamily: "Inter, sans-serif"
        },
        radar: {
            center: ["50%", "60%"],
            radius: "62%",
            startAngle: 90,
            splitNumber: 5,
            indicator: indicators,
            axisName: {
                color: "#727272",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 14,
                distance: 0,
                formatter: function (name) {
                    return `{label|${formatRadarAxisLabel(name)}}\n{value|${radarScoreMap[name] || "0점"}}`;
                },
                rich: {
                    label: {
                        color: "#727272",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        fontWeight: 400,
                        lineHeight: 14,
                        align: "center",
                        padding: [0, 0, 8, 0]
                    },
                    value: {
                        color: "#000000",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        lineHeight: 20,
                        align: "center",
                        padding: [0, 0, 0, 0]
                    }
                }
            },
            axisLine: {
                lineStyle: {
                    color: "#d7dfeb",
                    width: 1
                }
            },
            splitLine: {
                lineStyle: {
                    color: "#d7dfeb",
                    width: 1,
                    type: "dashed"
                }
            },
            splitArea: {
                areaStyle: {
                    color: ["#ffffff", "#f7faff"]
                }
            }
        },
        series: [{
            type: "radar",
            symbol: "circle",
            symbolSize: 6,
            animation: true,
            animationDuration: 880,
            animationEasing: "quarticOut",
            lineStyle: { width: 2, color: "#2c80ff" },
            itemStyle: { color: "#2c80ff" },
            areaStyle: { color: "rgba(44, 128, 255, 0.22)" },
            data: [{ value: values }]
        }]
    }, true);

    bindHr011RadarResizeObserver(chartEl, function () {
        const currentChart = echarts.getInstanceByDom(chartEl);
        if (currentChart && typeof currentChart.resize === "function") {
            currentChart.resize();
        }
    });

    if (typeof chart.resize === "function") {
        requestAnimationFrame(function () {
            chart.resize();
            requestAnimationFrame(function () {
                chart.resize();
            });
        });
    }
}

async function openHr011ProjectEvaluationModal(projectKey) {
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state) return;
    const modalEl = getHr011ProjectEvalModalEl();
    const bodyEl = getHr011ProjectEvalModalBodyEl();
    if (!modalEl || !bodyEl) return;

    const detailBodyEl = document.getElementById("hr011RefDetailBody");
    const summaryEl = findHr011ProjectDetailSummaryByKey(detailBodyEl, projectKey);
    hr011ProjectEvalModalExpandedKeysSnapshot = cloneHr011ProjectExpandedKeys(hr011RefProjectExpandedKeys);
    setHr011ProjectExpandedKeysOnly(projectKey);
    if (hr011RefCurrentView === "project") {
        renderHr011ProjectDetailView({
            anchorProjectKey: projectKey,
            triggerEl: summaryEl || null
        });
    }

    hr011ProjectEvalModalProjectKey = projectKey;
    hr011ProjectEvalModalLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    hr011ProjectEvalModalClosing = false;
    modalEl.hidden = false;
    bodyEl.innerHTML = `<div class="hr011-ref-project-eval-loading">평가 데이터를 불러오는 중입니다.</div>`;
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            document.body.classList.add("hr011-project-eval-modal-open");
            modalEl.classList.add("is-open");
        });
    });

    const loadPromise = loadHr011ProjectEvaluationState(projectKey);
    renderHr011ProjectEvaluationContent(projectKey);
    await loadPromise;
    renderHr011ProjectEvalSummary(projectKey);
    scheduleHr011ProjectRadarResize(0);
    requestAnimationFrame(function () {
        renderHr011ProjectEvaluationContent(projectKey);
        renderHr011ProjectEvalPopupRadar(projectKey);
    });
}

function closeHr011ProjectEvaluationModal() {
    if (hr011ProjectEvalModalClosing) return;
    const modalEl = getHr011ProjectEvalModalEl();
    if (!modalEl) return;
    hr011ProjectEvalModalClosing = true;
    const restoreProjectKey = hr011ProjectEvalModalProjectKey;
    const restoreExpandedKeys = cloneHr011ProjectExpandedKeys(hr011ProjectEvalModalExpandedKeysSnapshot);
    hr011ProjectEvalModalProjectKey = "";
    modalEl.classList.remove("is-open");
    document.body.classList.remove("hr011-project-eval-modal-open");
    scheduleHr011ProjectRadarResize(0);

    const focusEl = hr011ProjectEvalModalLastFocus;
    hr011ProjectEvalModalLastFocus = null;

    setTimeout(function () {
        if (modalEl.classList.contains("is-open")) {
            hr011ProjectEvalModalClosing = false;
            return;
        }
        modalEl.hidden = true;
        const bodyEl = getHr011ProjectEvalModalBodyEl();
        const chartEl = bodyEl ? bodyEl.querySelector('[id^="hr011ProjectEvalModalRadar-"]') : null;
        if (chartEl) {
            cleanupHr011RadarResizeObserver(chartEl);
        }
        if (chartEl && typeof echarts === "object" && typeof echarts.getInstanceByDom === "function") {
            const chart = echarts.getInstanceByDom(chartEl);
            if (chart && typeof chart.dispose === "function") {
                chart.dispose();
            }
        }
        if (bodyEl) {
            bodyEl.innerHTML = "";
        }
        scheduleHr011ProjectRadarResize(0);
        if (hr011RefCurrentView === "project" && restoreExpandedKeys instanceof Set) {
            hr011RefProjectExpandedKeys = new Set(restoreExpandedKeys);
            hr011RefProjectAnimateOpenKey = "";
            syncHr011ProjectExpandedKeys(hr011RefProjectRows || []);
            const detailBodyEl = document.getElementById("hr011RefDetailBody");
            const summaryEl = findHr011ProjectDetailSummaryByKey(detailBodyEl, restoreProjectKey);
            renderHr011ProjectDetailView({
                anchorProjectKey: restoreProjectKey,
                triggerEl: summaryEl || null
            });
        }
        hr011ProjectEvalModalExpandedKeysSnapshot = null;
        hr011ProjectEvalModalClosing = false;
    }, HR011_PROJECT_EVAL_MODAL_MOTION_MS);

    if (focusEl && typeof focusEl.focus === "function") {
        try {
            focusEl.focus({ preventScroll: true });
        } catch (error) {
            focusEl.focus();
        }
    }
}

function renderHr011ProjectEvaluationContent(projectKey) {
    const state = hr011RefProjectEvalCache.get(projectKey);
    if (!state) return;
    const contentEl = getHr011ProjectEvalModalBodyEl();
    if (!contentEl) return;

    const prevChartEl = contentEl.querySelector('[id^="hr011ProjectEvalModalRadar-"]');
    if (prevChartEl) {
        cleanupHr011RadarResizeObserver(prevChartEl);
    }
    if (prevChartEl && typeof echarts === "object" && typeof echarts.getInstanceByDom === "function") {
        const prevChart = echarts.getInstanceByDom(prevChartEl);
        if (prevChart && typeof prevChart.dispose === "function") {
            prevChart.dispose();
        }
    }

    if (state.loading && !state.loaded) {
        contentEl.innerHTML = `<div class="hr011-ref-project-eval-loading">평가 데이터를 불러오는 중입니다.</div>`;
        return;
    }

    if (hr011Mode === "update") {
        const capabilityPane = buildHr011ProjectCapabilityPane(projectKey, state, true);
        const riskPane = buildHr011ProjectRiskPane(projectKey, state, true);
        contentEl.innerHTML = `<div class="hr011-ref-project-eval-split">${capabilityPane}${riskPane}</div>`;
        return;
    }

    contentEl.innerHTML = buildHr011ProjectEvalPopupViewMarkup(projectKey, state);
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
        const riskItems = getHr011ProjectEvalPopupRiskItems(state);
        if (!riskItems.length) {
            return "";
        }
        return [
            `<section class="hr011-ref-project-eval-pane-card" data-tab="risk">`,
            `<h6>리스크 평가</h6>`,
            `<div class="hr011-ref-project-risk-inline-list">`,
            riskItems.map(function (item) {
                return `<div class="row"><span>${escapeHr011(item.label)}</span><p>${escapeHr011(item.body || item.badgeText || "-")}</p></div>`;
            }).join(""),
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
    if (field === "re_in_yn" || hasHr011ProjectRiskText(state.risk[field])) {
        state.risk.hasRow = true;
    }
}

async function saveHr011ProjectEvaluationAll() {
    const keys = Array.from(hr011RefProjectEvalCache.keys());
    for (let i = 0; i < keys.length; i += 1) {
        const projectKey = keys[i];
        const state = hr011RefProjectEvalCache.get(projectKey);
        if (!state || !state.isInternal || !state.projectId || !state.loaded);
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
    const formatRadarAxisLabel = function (text) {
        const label = sanitizeRadarLabel(text);
        const chars = Array.from(label);
        if (chars.length <= 5) {
            return label;
        }
        const splitIndex = Math.ceil(chars.length / 2);
        return `${chars.slice(0, splitIndex).join("")}\n${chars.slice(splitIndex).join("")}`;
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
            left: 0,
            top: 3,
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
            center: ["50%", "58%"],
            radius: "78%",
            bottom: 0,
            splitNumber: 5,
            startAngle: 90,
            indicator: indicators,
            axisName: { color: "#727272", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, lineHeight: 14, distance: 0, formatter: function (name) { return `{label|${formatRadarAxisLabel(name)}}\n{value|${radarScoreMap[name] || "0점"}}`; }, rich: { label: { color: "#727272", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, lineHeight: 14, align: "center", padding: [0, 0, 15, 0] }, value: { color: "#000000", fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 600, lineHeight: 18, align: "center", padding: [0, 0, 0, 0] } } },
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

    const raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
    raf(function () {
        if (hr011RefRadarChart && typeof hr011RefRadarChart.resize === "function") {
            hr011RefRadarChart.resize();
        }
    });
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
        resizeHr011ProjectRadarCharts();
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

    const name = $.trim(String(row.dev_nm || ""));
    const fallbackText = typeof getProfileText === "function"
        ? getProfileText(name)
        : (name.length >= 2 ? name.slice(-2) : (name || "신규"));
    const fallbackColor = typeof stringToSoftColor === "function"
        ? stringToSoftColor(name || "신규")
        : "#7a8ca4";

    return [
        `<div class="profile-circle-icon profile-circle-icon--fallback"`,
        `     style="background:${escapeHr011(fallbackColor)};color:#fff"`,
        `     aria-label="${escapeHr011(name ? `${name} 프로필` : "기본 프로필")}">`,
        `${escapeHr011(fallbackText || "신규")}`,
        `</div>`
    ].join("");
}

// 미니 프로필 생성 & 등록 or 수정 알림
function renderHr011EditMiniProfile() {
    // const root = document.getElementById("hr011EditMiniProfile");
    // const avatarEl = document.getElementById("hr011EditMiniAvatar");
    // const nameEl = document.getElementById("hr011EditMiniName");
    const subEl = document.getElementById("hr011EditMiniSub");
    // if (!root || !avatarEl || !nameEl || !subEl) return;
    if (!subEl) return;

    // const row = hr011CurrentRow || {};
    // const name = $.trim($("#dev_nm").val()) || row.dev_nm || "신규 인력";
    // const avatarRow = Object.assign({}, row, { dev_nm: name });
    // avatarEl.innerHTML = getHr011AvatarMarkup(avatarRow);
    // nameEl.textContent = name;
    subEl.textContent = hr011Mode === "insert" ? "등록하기" : "수정하기";
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
    const availDt = ($("#avail_dt").val() || "").trim();
    if (availDt) {
        formData.append("avail_dt", availDt);
    }
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
        normalizeCareerSpinInputs();
        return;
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
        $("#exp_yr_year").val(0);
        $("#exp_yr_month").val(0);
        syncCareerExpValue();
        normalizeCareerSpinInputs();
        return;
    }

    const years = Math.floor(num);
    const months = Math.round((num - years) * 12);

    $("#exp_yr_year").val(years);
    $("#exp_yr_month").val(months);

    syncCareerExpValue(); // hidden 값 동기화
    normalizeCareerSpinInputs();
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

function syncCareerExpText() {
    var value = $("#exp_yr").val();
    var text = formatCareerYearMonth(value);
    $("#exp_yr_text").text(text ? "(" + text + ")" : "");
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

function clampAmount(raw) {
    const max = 99999999999999; // 최대값
    let num = Number(raw);
    if (!num) return "";
    return String(Math.min(num, max));
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
                html: `<div><strong>개발자ID</strong>가 없습니다.</div>`
            });
            return;
        }
        location.href =
            `/common/getExcel?dev_id=${encodeURIComponent(devId)}&dev_nm=${encodeURIComponent(devNm)}`;
    });
}


// =============================================================================================================
/*********************************************************
 * 네비게이션 STEP 기본 설정
 *********************************************************/
// 네비게이션 바
const HR011_STEP_CONFIG = [
    { key: "profile", label: "기본 프로필", className: "hr011-edit-step-btn--profile" },
    { key: "skill", label: "조건 및 역량", className: "hr011-edit-step-btn--skill" },
    { key: "contract", label: "소속 및 계약", className: "hr011-edit-step-btn--contract" },
    { key: "project", label: "프로젝트 평가", className: "hr011-edit-step-btn--project" },
    // { key: "eval-risk", label: "평가 및 리스크", className: "hr011-edit-step-btn--eval" }
];
let hr011CurrentEditStepKey = HR011_STEP_CONFIG[0].key;
let hr011EditStepRafId = null;
const HR011_EDIT_STEP_ACTIVE_OFFSET = 96;
let IsScrolling = false;
let hr011NavRaf = null;
/*********************************************************
 * STEP 진행도 계산
 *********************************************************/
const stepFields = {

    // 1. 기본 프로필
    profile: [
        "#dev_nm" // 성명
        , "#email" // 이메일
        , "#select_dev_typ" // 구분
        , "#select_sido_cd" // 거주지역
        , "#brdt" // 생년월일
        , "#tel" // 연락처
    ],

    // 2. 조건 및 역량
    skill: {
        fields: [
            // "#avail_dt", // 투입가능시점
            "#select_main_cust_cd" // 주요고객사
            , "#select_work_md" // 근무 가능 형태
            , "#select_ctrt_typ" // 계약 형태
            , "#hope_rate_amt" // 희망 단가
            , "#select_kosa_grd_cd" // KOSA 등급
            , "#edu_last" // 최종 학력
            , "#select_main_fld_cd" // 주요 분야
            // , "#cert_txt" // 보유 자격증
        ],
        extraCheck: () => {
            const hasMainLang = $("#mainLangTagList li").length > 0;

            const year = $.trim($("#exp_yr_year").val());
            const month = $.trim($("#exp_yr_month").val());
            const hasExp = (year && year !== "0") || (month && month !== "0");

            return {
                mainLang: hasMainLang,
                exp: hasExp
            };
        }
    },

    // 3. 소속 및 계약
    contract: [
        "#org_nm" // 소속사
        , "#select_biz_typ" // 사업자 유형
        , "#st_dt" // 계약 시작일
        , "#ed_dt" // 계약 종료일
        , "#amt" // 계약 금액
        // , "#remark" // 비고
    ],

    // 4. 프로젝트 평가
    // project: () => window.hr013Table ? window.hr013Table.getData().length : 0,
    project: () => {
        const data = window.hr013Table?.getData?.() || [];
        const projectCount = data.length;
        const evalRiskCount = data.filter(row => row?.cust_nm === "HCNC").length;
        return {
            projectCount,
            evalRiskCount
        };
    }

    // 5. 평가 및 리스크
    // "eval-risk": () => {
    //     const data = window.hr013Table?.getData?.() || [];
    //     return data.filter(row => row?.cust_nm === "HCNC").length;
    // }
};

// 완료된 단계 카운팅
function calculateStepProgress(step) {
    const config = stepFields[step];

    // 금액 필드 공통
    const amountFields = ["#hope_rate_amt", "#amt"];

    if (!config) return { filled: 0, total: 0 };

    // 1. 함수형 step
    if (typeof config === "function") {
        const result = config();

        // 숫자 반환 (기존 step 호환)
        if (typeof result === "number") {
            return { filled: result, total: Math.max(result, 1) };
        }

        // project (객체 반환)
        if (typeof result === "object") {
            const projectCount = result.projectCount ?? 0;
            const evalRiskCount = result.evalRiskCount ?? 0;

            const evalRiskBonus = evalRiskCount > 0 ? 1 : 0;

            return {
                filled: projectCount + evalRiskBonus,
                total: projectCount + 1 // eval-risk 1칸
            };
        }

        return { filled: 0, total: 0 };
    }

    // 2. 객체형 STEP (skill)
    if (typeof config === "object" && config.fields) {
        let filled = 0;

        config.fields.forEach(selector => {
            const $el = $(selector);
            if (!$el.length) return;

            let isFilled = false;
            let val = $.trim($el.val());

            if (amountFields.includes(selector)) {
                const numeric = Number(val.replace(/[^\d]/g, ""));
                isFilled = numeric > 0;
            } else if ($el.is(":checkbox, :radio")) {
                isFilled = $el.is(":checked");
            } else {
                isFilled = val !== "" && val !== "0" && Number(val) !== 0;
            }

            if (isFilled) filled++;
        });

        let extraFilled = 0;
        let extraTotal = 0;

        if (config.extraCheck) {
            const extra = config.extraCheck();

            Object.values(extra).forEach(v => {
                extraTotal++;
                if (v) extraFilled++;
            });
        }

        return {
            filled: filled + extraFilled,
            total: config.fields.length + extraTotal
        };
    }

    // 3. 배열형 STEP
    let filled = 0;

    config.forEach(selector => {
        const $el = $(selector);
        if (!$el.length) return;

        let isFilled = false;
        let val = $.trim($el.val());

        if (amountFields.includes(selector)) {
            const numeric = Number(val.replace(/[^\d]/g, ""));
            isFilled = numeric > 0;
        } else if ($el.is(":checkbox, :radio")) {
            isFilled = $el.is(":checked");
        } else {
            isFilled = val !== "" && val !== "0" && Number(val) !== 0;
        }

        if (isFilled) filled++;
    });

    return {
        filled,
        total: config.length
    };
}

/*********************************************************
 * STEP UI 업데이트
 *********************************************************/
function updateStepperUI() {
    const activeKeys = getActiveStepKeys();

    $(".hr011-edit-step-btn").each(function () {
        const step = $(this).data("step-target");
        const idx = activeKeys.indexOf(step);

        const isVisible = activeKeys.includes(step);
        $(this).toggle(isVisible);

        if (!isVisible) return;

        const { filled, total } = calculateStepProgress(step);

        // 수치 표시
        $(this).find(".cnt").html(`
            <span class="filled">${filled}</span>&nbsp;/&nbsp;<span class="total-filled">${total}</span>
        `);

        // 초기화
        const currentIndex = activeKeys.indexOf(hr011CurrentEditStepKey);
        const isComplete = filled === total && total > 0;

        const isPast = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        $(this)
            .toggleClass("is-not-progress", isComplete && (isPast || isCurrent))
            .toggleClass("is-empty", filled === 0)
            .toggleClass("is-progress", !isComplete && filled > 0);

        // 위치 상태
        $(this).removeClass("is-active is-done");

        if (idx < currentIndex) {
            $(this).addClass("is-done");
        }
        else if (idx === currentIndex) {
            $(this).addClass("is-active");
        }
    });
    updateStepConnectorLine();
}

function updateStepConnectorLine() {
    const activeKeys = getActiveStepKeys();

    const $visibleBtns = $(".hr011-edit-step-btn").filter(function () {
        return activeKeys.includes($(this).data("step-target")) && $(this).is(":visible");
    });

    $(".hr011-edit-step-btn").removeClass("is-last-visible");
    $visibleBtns.last().addClass("is-last-visible");
}

/*********************************************************
 * STEP 활성화
 *********************************************************/

// 네비게이션바 세팅
function setHr011ActiveEditStep(stepKey) {
    const activeKeys = getActiveStepKeys();
    if (!activeKeys.includes(stepKey)) {
        stepKey = activeKeys[0];
    }

    const currentIndex = activeKeys.indexOf(stepKey);
    hr011CurrentEditStepKey = stepKey;

    if (hr011NavRaf) cancelAnimationFrame(hr011NavRaf);

    hr011NavRaf = requestAnimationFrame(() => {
        document.querySelectorAll(".hr011-edit-step-btn").forEach(btn => {
            const key = btn.getAttribute("data-step-target");
            const idx = activeKeys.indexOf(key);

            const isVisible = activeKeys.includes(key);
            btn.hidden = !isVisible;

            btn.classList.remove("is-active", "is-done");

            if (idx < currentIndex) {
                btn.classList.add("is-done");      // 이전 단계
            }
            if (idx === currentIndex) {
                btn.classList.add("is-active");    // 현재 단계
            }
        });

        document.querySelectorAll(".hr011-section[data-edit-step]").forEach(section => {
            const key = section.getAttribute("data-edit-step");
            section.style.display = activeKeys.includes(key) ? "" : "none";
        });
        // 현재 step 표기
        updateCurrentStepUI();
    });
}

// 신규 등록일 때 안보일 STEP은 빼놓기 (보유역량 평가 & 프로젝트 평가 제외)
function getActiveStepKeys() {
    const isInsert = hr011Mode === "insert";
    $("#3-step-end, #4-step-end, #5-step-end").toggle(!isInsert);
    // $("#3-step-end").toggle(!isInsert);

    if (isInsert) {
        return HR011_STEP_CONFIG
            .filter(step => ["profile", "skill", "contract"].includes(step.key))
            .map(step => step.key);
    }
    return HR011_STEP_CONFIG.map(step => step.key);
}

/*********************************************************
 * STEP 이동 (클릭)
 *********************************************************/
function goHr011EditStep(stepKey) {
    const activeKeys = getActiveStepKeys();
    if (!activeKeys.includes(stepKey)) return;

    // 진행 중 스크롤 강제 종료 (키 씹힘 방지)
    IsScrolling = false;

    setHr011ActiveEditStep(stepKey);
    updateStepperUI();

    const scrollEl = document.querySelector(".hr011-edit-flow");
    const section = document.querySelector(`.hr011-section[data-edit-step="${stepKey}"]`);
    if (!scrollEl || !section) return;

    smoothScrollTo(scrollEl, section.offsetTop - HR011_EDIT_STEP_ACTIVE_OFFSET, 450);
}

function smoothScrollTo(container, target, duration = 500) {
    const start = container.scrollTop;
    const change = target - start;
    const startTime = performance.now();

    IsScrolling = true;

    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        container.scrollTop = start + change * eased;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // 끝나고 약간 딜레이 후 해제
            setTimeout(() => {
                IsScrolling = false;
            }, 80);
        }
    }
    requestAnimationFrame(animate);
}

/*********************************************************
 * 스크롤 → STEP 동기화
 *********************************************************/
let lastScrollTop = 0;
let scrollVelocity = 0;

function syncHr011ActiveStepByScroll() {
    const scrollEl = document.querySelector(".hr011-edit-flow");
    if (!scrollEl) return;

    const current = scrollEl.scrollTop;
    scrollVelocity = current - lastScrollTop;
    lastScrollTop = current;

    const activeKeys = getActiveStepKeys();

    const sections = activeKeys
        .map(k => document.querySelector(`.hr011-section[data-edit-step="${k}"]`))
        .filter(Boolean);

    const anchor = scrollEl.scrollTop + scrollEl.clientHeight * 0.35;

    let activeKey = hr011CurrentEditStepKey;

    for (const section of sections) {
        const top = section.offsetTop;

        if (scrollVelocity >= 0) {
            // 내려갈 때
            if (top <= anchor) activeKey = section.dataset.editStep;
        } else {
            // 올라갈 때
            if (top < anchor) activeKey = section.dataset.editStep;
        }
    }

    if (activeKey !== hr011CurrentEditStepKey) {
        setHr011ActiveEditStep(activeKey);
        updateStepperUI();
    }
}

/*********************************************************
 * scroll → RAF 최적화
 *********************************************************/
function requestHr011ActiveStepSync() {
    // if (IsScrolling) return;
    if (hr011EditStepRafId) return;

    hr011EditStepRafId = requestAnimationFrame(() => {
        hr011EditStepRafId = null;
        syncHr011ActiveStepByScroll();
    });
}

/*********************************************************
 * 초기화
 *********************************************************/
function initHr011EditStepNavigation(isEditable) {
    const flow = document.querySelector(".hr011-edit-flow");
    if (!flow) return;

    if (!isEditable) {
        flow.style.display = "none";
        return;
    }

    flow.style.display = "";
    renderHr011Steps();

    const scrollEl = document.querySelector(".hr011-detail-wrap .hr011-edit-flow");

    // 하나의 scroll 이벤트만 사용
    if (scrollEl && !scrollEl.dataset.bound) {
        scrollEl.dataset.bound = "Y";
        scrollEl.addEventListener("scroll", requestHr011ActiveStepSync, { passive: true });
    }

    // 클릭 이동
    document.querySelectorAll(".hr011-edit-step-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            const key = this.getAttribute("data-step-target");
            if (key) goHr011EditStep(key);
        });
    });

    // 최초 동기화
    requestHr011ActiveStepSync();
    updateStepperUI();
    updateCurrentStepUI();
}

// 넘버링 개선
function updateStepNumbers() {
    let idx = 1;

    $(".hr011-edit-step-btn").each(function () {
        const step = $(this).data("step-target");
        $(this).find(".step-num").text(idx++);
    });
}

/*********************************************************
 * 상단 STEP 표시
 *********************************************************/
function getCurrentStepProgress() {
    const activeKeys = getActiveStepKeys();
    const index = activeKeys.indexOf(hr011CurrentEditStepKey);

    return {
        current: index !== -1 ? index + 1 : 1,
        total: activeKeys.length
    };
}

function updateCurrentStepUI() {
    const { current, total } = getCurrentStepProgress();
    $(".step-display .step-cnt").text(current);
    $(".step-display .tot-cnt").text(total);
}

// STEP 렌더링
function renderHr011Steps() {
    const activeKeys = getActiveStepKeys();
    const $wrap = $(".hr011-edit-step");

    $wrap.empty();

    let idx = 1;

    HR011_STEP_CONFIG.forEach(step => {
        if (!activeKeys.includes(step.key)) return;

        $wrap.append(`
            <button type="button"
                class="hr011-edit-step-btn ${step.className} ${idx === 1 ? "is-active" : ""}"
                data-step-target="${step.key}">
                <span class="wrap">
                    <span class="num">${idx}</span>
                    <span class="txt">${step.label}</span>
                </span>
                <span class="cnt"></span>
            </button>
            <span class="step-arrow"></span>
        `);

        idx++;
    });
}
