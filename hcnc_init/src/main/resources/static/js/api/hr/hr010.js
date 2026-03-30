// 사용자 관리 - hr010.js (hcnc_hms)

// 모드(insert: 등록 / update: 수정 / view: 상세조회)
var currentMode = "insert";
var currentHr010UserTypeTab = "staff";
var hr010SourceRows = [];

// 주 개발언어 태그 입력 공통 모듈
var mainLangTagInput = null;
var pendingMainLangValue = "";
var mainLangPicker = null;
var mainLangSkillOptions = [];
var mainLangGroupOptions = [];

// 조회조건 콤보에 들어갈 검색가능한 field 목록
var hr010SearchableFields = [];

// 저장된 탭 alert 표시하기 위한 리스트
var savedTabs = [];

// 저장/로딩중 팝업 표시 여부 플래그
let isSaving = false;

// 저장 성공 여부 플래그
let isSuccess = false;

// 개발자ID
window.currentDevId = null;

// ============================================================================== //

// 문서 첫 생성 시 실행
$(document).ready(async function () {
    initHr010SearchTypeOptions(); // 검색조건 콤보

    $(".search-btn-area .btn-search").text("조회");

    $(".toggle-filter-chip").on("click", function () {
        var nextType = String($(this).data("userType") || "staff");
        if (currentHr010UserTypeTab === nextType) {
            return;
        }

        currentHr010UserTypeTab = nextType;
        $(".toggle-filter-chip").removeClass("is-active");
        $(this).addClass("is-active");

        applyHr010UserTypeFilter();
    });

    // 테이블 로딩이 끝날 때 까지 로딩바 표시
    showLoading();
    await loadUserTableData();
    hideLoading();

    // ================================================ //

    // 프로필 이미지 표시
    $("#fileProfile").on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // 이미지 파일만 허용
        if (!file.type.startsWith("image/")) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                html: `<strong>이미지 파일</strong>만 선택 가능합니다.`,
            });
            return;
        }
        $("#dev_img").show();
        $("#dev_img")[0].src = URL.createObjectURL(file);
    });

    // ================================================ //

    // 검색 버튼 이벤트
    $(".btn-search").on("click", async function (event) {
        event.preventDefault();
        showLoading();
        await reloadHr010List();
        hideLoading();
    });

    // 검색어 이벤트 (Enter 입력)
    $("#searchConditionKeyword, #searchKeyword").on("keyup", async function (event) {
        if (event.key === "Enter") {
            showLoading();
            await loadUserTableData();
            hideLoading();
        }
    });

    // ESC 누르면 모달 닫힘
    $(document).on("keydown", function (event) {
        if (event.key === "Escape") {
            closeUserViewModal();
        }
    });

    // 조회 버튼이벤트
    $(".btn-main-view").on("click", function () {
        const rowData = btnEditView("상세정보를 조회할 ");
        if (!rowData) return;
        loadUserTableImgDataAsync(rowData);
        openUserModal("view", rowData);
    });

    // 등록 버튼 이벤트
    $(".btn-main-add").on("click", function () {
        openUserModal("insert");
    });

    // 수정 버튼 이벤트
    $(".btn-main-edit").on("click", function () {
        const rowData = btnEditView("수정할 ");
        if (!rowData) return;
        loadUserTableImgDataAsync(rowData);
        openUserModal("update", rowData);
    });

    // 삭제 버튼 이벤트
    $(".btn-main-del").on("click", function () {
        deleteUserRows();
    });

    // ================================================ //

    // ★ 팝업에서 인적사항 및 tab 정보 저장 (통합 저장)
    $(document).on("click", "#btn-user-save", async function () {
        savedTabs = [];
        if (isSaving) return;
        // 로딩 표시
        isSaving = true;
        showLoading();
    });
});

// ============================================================================== //

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

// 둥근 프로필 생성
function makeProfileCircle(name) {
    const text = getProfileText(name);
    const bgColor = stringToSoftColor(name);

    return `
        <div class="profile-circle-icon" style="background:${bgColor}">
            ${text}
        </div>
    `;
}

// ============================================================================== //

// ============================================================================== //
// 타입 판별/필터 함수
function resolveHr010UserType(row) {
    if (!row || typeof row !== "object") {
        return "staff";
    }

    var devTyp = String(row.select_dev_typ || "").toUpperCase();

    if (devTyp === "HCNC_F" || devTyp === "F") {
        return "freelancer";
    }
    if (devTyp === "HCNC_S" || devTyp === "S") {
        return "staff";
    }

    var devId = String(row.dev_id || "").toUpperCase();
    if (devId.indexOf("HCNC_F") === 0) {
        return "freelancer";
    }
    if (devId.indexOf("HCNC_S") === 0) {
        return "staff";
    }

    return "staff";
}

// 직원, 프리랜서 토글 => 클래스 변경
function filterHr010RowsByType(list) {
    if (!Array.isArray(list)) {
        return [];
    }

    if (currentHr010UserTypeTab === "freelancer") {
        return list.filter(function (row) {
            return resolveHr010UserType(row) === "freelancer";
        });
    }

    return list.filter(function (row) {
        return resolveHr010UserType(row) !== "freelancer";
    });
}

// 직원, 프리랜서 토글 => 표시 카드 변경
function applyHr010UserTypeFilter() {
    const filtered = filterHr010RowsByType(hr010SourceRows);
    renderUserCards(filtered);
}

// db로부터 리스트 불러와서 인적사항 테이블에 넣기
async function loadUserTableData() {

    // 키워드 검색
    const searchType = String($("#searchType").val() || ""); // 조회조건 선택값
    const conditionKeyword = $.trim($("#searchConditionKeyword").val()); // 새 '검색어' 입력값
    let tagKeyword = $.trim($("#searchKeyword").val()); // 기존 검색어(현재 Tag 검색) 입력값

    if (tagKeyword) { // Tag 검색: 다중 입력 시 OR 검색되도록 공백 토큰으로 전달
        tagKeyword = tagKeyword
            .split(/[\s,]+/)
            .filter(w => w)
            .join(" ");
    } else {
        tagKeyword = null;
    }

    // console.log("키워드 :", keyword);

    try {
        // 리스트 불러오기
        const response = await $.ajax({
            url: "/hr010/list",
            type: "GET",
            data: {
                dev_nm: "",
                searchKeyword: tagKeyword // Tag 검색은 서버 조회 파라미터 전달
            }
        });

        const list = response.res || [];
        if (!list.length) {
            hr010SourceRows = [];
            applyHr010UserTypeFilter();
            return;
        }

        // 점수 불러오기
        const scorePromises = list.map(row =>
            fetchUserScore(row.dev_id)
                .then(res => ({
                    dev_id: row.dev_id,
                    ...(res.res || {})
                }))
                .catch(() => ({
                    dev_id: row.dev_id
                }))
        );

        const scores = await Promise.all(scorePromises);

        const scoreMap = {};
        scores.forEach(s => {
            scoreMap[s.dev_id] = s;
        });

        list.forEach(row => {
            const s = scoreMap[row.dev_id] || {};
            row.grade = s.rank || "";
            row.score = s.score || 0;
        });

        await Promise.all(
            list.map(row => {
                if (row.has_img === 1 || row.has_img === "1") {
                    return new Promise(resolve => {
                        const img = new Image();
                        img.src = row.img_url;
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                }
                return Promise.resolve();
            })
        );

        const filteredList = applyHr010ConditionFilter(list, searchType, conditionKeyword); // 조회조건 필터 적용
        hr010SourceRows = filteredList; // 필터 결과를 그리드 소스로 반영
        applyHr010UserTypeFilter(); // 직원/프리랜서 탭 필터 적용

        // [Card View] ====================================================================
        const finalList = filterHr010RowsByType(hr010SourceRows);
        renderUserCards(finalList);
    } catch (e) {
        console.error(e);
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'error',
            title: '오류',
            text: '사용자 데이터를 불러오는 중 오류가 발생했습니다.',
        });
    }
}

// 프로필 이미지 가져오기
function loadUserTableImgDataAsync(data) {
    return new Promise((resolve) => {
        const $img = $("#dev_img");

        // row에 img_url이 있는지 확인
        const imgUrl = data.img_url; // /list에서 내려준 Base64 URL
        const hasImage = !!imgUrl;

        if (hasImage) {
            $img.attr("src", imgUrl).show();
        } else {
            $img.attr("src", "").hide();
        }

        $img.toggleClass("has-img", hasImage);
        resolve();
    });
}

// ============================================================================== //

// 인적사항 데이터 신규 등록/수정 이벤트
function upsertUserBtn() {
    return new Promise((resolve, reject) => {

        var payload = {
            dev_id: $("#dev_id").val(),
            dev_nm: $("#dev_nm").val(),
            brdt: $("#brdt").val(),
            tel: $("#tel").val(),
            email: $("#email").val(),
            region: $("#region").val(),
            main_lang: $("#main_lang").val(),
            exp_yr: composeCareerExpValue(),
            edu_last: $("#edu_last").val(),
            cert_txt: $("#cert_txt").val(),
            hope_rate_amt: normalizeAmountValue($("#hope_rate_amt").val()),
            avail_dt: $("#avail_dt").val(),
            ctrt_typ: $("#select_ctrt_typ").val(),
            work_md: $("#select_work_md").val(),
            dev_typ: $("#select_dev_typ").val(),
            crt_by: "",
            kosa_grd_cd: $("#select_kosa_grd_cd").val(),
            main_fld_cd: $("#select_main_fld_cd").val(),
            main_cust_cd: $("#select_main_cust_cd").val()
        };

        const activeTab = $(".tab-btn.active").data("tab");
        const file = $("#fileProfile")[0].files[0];
        const fd = new FormData();

        // 1) 텍스트 필드들 추가
        Object.keys(payload).forEach(k => {
            if (k === "dev_img") return;
            if (payload[k] == null) return;
            fd.append(k, payload[k]);
        });

        // 2) 파일 추가 (컨트롤러 @RequestPart 이름과 동일해야 함)
        if (file) fd.append("dev_img", file);

        $.ajax({
            url: "/hr010/upsert",
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            dataType: "json",

            success: function (response) {
                if (!response || response.success === false) {
                    console.log(response?.message || "저장에 실패했습니다.");
                    showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                        icon: 'error',
                        title: '오류',
                        text: '저장 중 오류가 발생했습니다.'
                    });
                    resolve(false);
                    return;
                }
                if (response.dev_id) {
                    window.currentDevId = response.dev_id;
                    $("#dev_id").val(response.dev_id);
                }
                resolve(true);
            },
            error: function (xhr) {
                console.log("저장 중 오류가 발생했습니다.");
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: '저장 중 오류가 발생했습니다.'
                });
                reject(xhr);
            }
        });
    });
}

// ============================================================================== //

// 데이터 삭제 요청
async function deleteUserRows() {

}

// ============================================================================== //

async function reloadHr010List() {
    showLoading(); // 로딩바 표시
    await loadUserTableData();
    if (window.userTable) updateTabulatorGridCount(window.userTable);
    hideLoading();
}

// ============================================================================== //

// 모달(팝업) 열리는 이벤트 처리
openUserModal = async function (mode, data) {
    window.hr013_prj_nm = null;

    currentMode = mode;
    initTabs = true;
    // const $modal = $("#view-user-area");

    showLoading(); // 로딩바 표시
    $modal.removeClass("show").hide();

    if (mode === "insert") clearUserForm();

    setModalMode(mode);
    applyHr014TabPermission(); // tab4(권한 검증후 표시) 활성화

    // 인력 관리 등록 시, 정해진 탭에 따라 자동으로 선택
    if (mode === "insert") {
        const activeTabBtn = document.querySelector(".toggle-filter-chip.active");
        const devTyp = activeTabBtn?.dataset.userType === "freelancer" ? "HCNC_F" : "HCNC_S";
        $("#select_dev_typ").val(devTyp).trigger("change");
    }

    window.hr014TabInitialized = false;
    initMainLangTags();

    // 조회, 수정할 때, 여기서 모든 비동기 작업 대기
    if (mode !== "insert" && data?.dev_id) {
        // console.log("Promise로 팝업에 띄울 데이터 호출 중...");
        updateTabActions("tab1");
        refreshTabLayout("tab1");

        await Promise.all([
            initAllTabs(),
            loadUserTableImgDataAsync(data)
        ]);
    }

    // 프로필 사진 추가하기 아이콘 보이기
    const $reUploadProfile = $modal.find(".re-upload-image");
    const hasImage = $("#dev_img").hasClass("has-img");
    if (mode === "update" && hasImage && data.dev_id) {
        $reUploadProfile.show();
    } else {
        $reUploadProfile.hide();
    }
};

// ============================================================================== //

// 팝업의 역할에 따라 sub-title 변경 되기
function setModalMode(mode) {
    console.log("Mode 구분 :", mode);

    const isView = mode === "view"; // 상세(조회)
    const isInsert = mode === "insert"; // 등록
    const isUpdate = mode === "update"; // 수정

    var $title = $modal.find("#modal-title");
    $modal.toggleClass("is-view-mode", isView);

    if (mode) {
        $title.text(
            mode === "view" ? "상세" :
                mode === "insert" ? "등록" :
                    "수정"
        );
        $modal
            .removeClass("view insert update")
            .addClass(mode);
    }

    // ================================
    // 공통 입력 제어 (조회 기준)
    // ================================
    const isReadOnly = isView;

    $modal.find("input, textarea")
        .prop("readonly", isReadOnly)
        .prop("disabled", isReadOnly);

    $modal.find("select")
        .not("#select_dev_typ")
        .prop("disabled", isReadOnly);

    const $profile = $modal.find(".modal-human-area .pic-area .profile-area");
    $profile.toggleClass("view", isView);
    $profile.toggleClass("edit", !isView);
    // ================================
    // select_dev_typ 전용 제어
    // ================================
    $modal.find("#select_dev_typ")
        .toggleClass("selectedDevTyp", isInsert) // 등록만 셀렉트 추가
        .prop("disabled", !isInsert); // 등록이 아니면 모두 disabled
    // ================================
    // career-exp 전용 제어
    // ================================
    $(".career-spin-wrap").toggle(!isView); // 조회가 아니면 모두 hide
    $(".career-exp-text").toggle(isView);
    // ================================
    // select_kosa_grd_cd 전용 제어
    // ================================
    var $select = $modal.find("#select_kosa_grd_cd");
    var $text = $modal.find("#kosa_grd_cd_text");

    if (isView) {
        var selectedText = $select.find("option:selected").text();
        $text.text(selectedText).show();   // 텍스트 표시
        $select.hide();                    // select 숨김
    } else {
        $text.hide();
        $select.show();
    }
    // ================================
    // 등록 전용 처리
    // ================================
    if (isInsert) {
        $("#grade").text("");
        $("#score").text("-");
    }

    // 주 개발언어 입력창은 팝업 트리거 전용으로 항상 readonly 유지
    $("#main_lang_input").prop("readonly", true);
    $(".career-spin-btn").prop("disabled", isView);
    syncCareerExpText();

    // Mode에 따른 버튼 숨김/표시
    $("#btn-user-save").toggle(isInsert || isUpdate);
    $("#btn-excel").toggle(isView);
    $(".tab-article").toggle(!isInsert);
    $("#main_lang_input, #btn_main_lang_picker").toggle(!isView);
    $(".showingbtn").toggle(isUpdate || isInsert);
    if (isView) {
        closeMainLangPicker(true);
        if (typeof closeHr012SkillPicker === "function") {
            closeHr012SkillPicker(true);
        }
        if (typeof closeHr013SkillPicker === "function") {
            closeHr013SkillPicker(true);
        }
    }

    const $tagBox = $("#mainLangTagList").closest(".tag-input-box");
    $tagBox.toggleClass("is-readonly", isView);
    $tagBox.find(".tag-help").toggle(!isView);

    updateTabActions($(".tab-btn.active").data("tab"));

    // Tab 연동
    window.hr010ReadOnly = isView;
    broadcastTabReadonly(isView);
}

// Tab의 readonly 제어
function broadcastTabReadonly(isReadOnly) {
    $(document).trigger("tab:readonly", [isReadOnly]);
}

// ============================================================================== //

async function closeUserViewModal() {
    console.log("changedTabs:", changedTabs);
    console.log("currentMode:", currentMode);

    const isViewMode = currentMode === "view";

    if (isViewMode) {
        // 상태 초기화만 하고 바로 닫기
        closeMainLangPicker(true);
        if (typeof closeHr012SkillPicker === "function") closeHr012SkillPicker(true);
        if (typeof closeHr013SkillPicker === "function") closeHr013SkillPicker(true);

        clearTab4Popup();

        $modal.removeClass("show");

        setTimeout(() => {
            $modal.hide();
            clearUserForm();
            savedTabs = [];
            Object.keys(changedTabs).forEach(k => changedTabs[k] = false);
        }, 250);

        return; // 여기서 끝
    }

    // 수정된 탭 목록 구하기 (view 모드일 때, tab4의 변경 유무는 무시)
    const modifiedTabs = Object.keys(changedTabs).filter(tab => changedTabs[tab]);

    if (modifiedTabs.length > 0) {
        const devNm = $("#dev_nm").val() || "";

        // 탭 이름을 읽기 쉽게 변환
        const tabNamesHtml = modifiedTabs
            .map((tab, i) => {
                const nameHtml = `<span><strong>${tabNameMap[tab]}</strong></span>`;
                return i < modifiedTabs.length - 1 ? `${nameHtml}<span>&nbsp;,&nbsp;</span>` : nameHtml;
            }).join('');

        const modeText = currentMode === "insert" ? "등록" :
                         currentMode === "update" ? "수정" :
                         currentMode === "view" ? "조회" :
                         currentMode; // 알 수 없는 경우 그대로

        // 신규 등록이면 이름 제외, 탭과 모드 안내만 표시
        const htmlContent = currentMode === "insert"
            ? `<span>${tabNamesHtml} 항목을 ${modeText}하고 있습니다.</span>
               <span>${modeText} 작업을 취소하고 닫으시겠습니까?</span>`
            : `<span><strong>${devNm}</strong>님의</span>&nbsp;
               <span>${tabNamesHtml}</span>&nbsp;
               <span>항목이 ${modeText}되었습니다.</span>
               <span>${modeText} 작업을 취소하고 닫으시겠습니까?</span>`;

        const result = await showAlert({
            title: '경고',
            html: htmlContent,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '예',
            cancelButtonText: '취소',
            cancelButtonColor: '#212E41'
        });

        // 사용자가 취소했으면 모달 닫기 중단
        if (!result.isConfirmed) return;
    }

    closeMainLangPicker(true);
    if (typeof closeHr012SkillPicker === "function") closeHr012SkillPicker(true);
    if (typeof closeHr013SkillPicker === "function") closeHr013SkillPicker(true);
    $modal.removeClass("show");

    setTimeout(() => {
        $modal.hide();
        clearUserForm();
        savedTabs = [];
        Object.keys(changedTabs).forEach(k => changedTabs[k] = false);
    }, 250);
}

// ============================================================================== //

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

// ============================================================================== //

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

// 읽기 전용이 아닐 때만 팝업을 열고, 선택 원본은 hidden(#main_lang) 기준으로 로드한다.
function openMainLangPicker() {
    if (currentMode === "view") {
        return;
    }
    initMainLangPicker();
    if (mainLangPicker) {
        mainLangPicker.open();
    }
}

function closeMainLangPicker(immediate) {
    if (!mainLangPicker) {
        return;
    }
    mainLangPicker.close(immediate);
}

// "적용" 클릭 시에만 draft 선택값이 태그/hidden 값으로 확정 반영된다.
function applyMainLangPickerSelection() {
    if (!mainLangPicker) {
        closeMainLangPicker();
        return;
    }
    mainLangPicker.apply();
}

function syncMainLangPickerUi(forceRebuild) {
    if (!mainLangPicker) {
        return;
    }
    mainLangPicker.sync(forceRebuild);
}

// ============================================================================== //

// 전화번호 자동 변환
$("#tel").on("input", function () {
    let val = $(this).val().replace(/[^0-9]/g, "");

    if (val.length < 4) {
        $(this).val(val);
    } else if (val.length < 8) {
        $(this).val(val.replace(/(\d{3})(\d+)/, "$1-$2"));
    } else {
        $(this).val(val.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3"));
    }
});

// 경력연차(년/개월) 스핀 보정
$("#exp_yr_year, #exp_yr_month").on("input change", function () {
    normalizeCareerSpinInputs();
});

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

// 희망단가 입력: 숫자만 허용하고 "원" 접미사 앞에서만 커서가 움직이도록 제어한다.
$("#hope_rate_amt")
    .on("input", function () {
        var raw = this.value || "";
        var caret = Number.isFinite(this.selectionStart) ? this.selectionStart : raw.length;
        var digitsBeforeCaret = countAmountDigitsBeforeCaret(raw, caret);
        var inputNumber = normalizeAmountValue(raw);
        var formatted = formatAmount(inputNumber);
        this.value = formatted;
        setAmountCaretByDigitIndex(this, digitsBeforeCaret);
    })
    .on("focus", function () {
        moveAmountCaretToEditableEnd(this);
    })
    .on("click", function () {
        var input = this;
        setTimeout(function () {
            clampAmountCaretToEditableRange(input);
        }, 0);
    })
    .on("keydown", function (e) {
        var value = this.value || "";
        var suffixIndex = getAmountEditableEndIndex(value);
        var start = Number.isFinite(this.selectionStart) ? this.selectionStart : suffixIndex;
        var end = Number.isFinite(this.selectionEnd) ? this.selectionEnd : suffixIndex;

        // 커서가 "원" 뒤로 가지 않도록 제한
        if ((e.key === "ArrowRight" || e.key === "End") && start >= suffixIndex && end >= suffixIndex) {
            e.preventDefault();
            this.setSelectionRange(suffixIndex, suffixIndex);
            return;
        }

        // 커서가 "원" 뒤에 있으면 우선 "원" 앞으로 이동
        if (e.key === "Backspace" && start === end && start > suffixIndex) {
            e.preventDefault();
            this.setSelectionRange(suffixIndex, suffixIndex);
            return;
        }

        // Delete로 "원" 자체를 지우는 동작은 막음
        if (e.key === "Delete" && start === end && start >= suffixIndex) {
            e.preventDefault();
            return;
        }
    });

// 숫자에 콤마 표시
function formatNumber(num) {
    if (!num) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 테이블에 점수 등급 표시
function fetchUserScore(devId) {
    return $.ajax({
        url: "/hr010/getScore",
        type: "GET",
        data: { dev_id: devId }
    });
}

// 계약단가(,),(테이블표)
function amountFormatter(value, data, cell, row, options) {
    if (value === null || value === undefined || value === "") {
        return "";
    }
    return formatAmount(value);
}

// 팝업에서도 마찬가지로 (,) 표시
function formatAmount(value) {
    if (value === null || value === undefined || value === "") return "";

    const numeric = value
        .toString()
        .replace(/[^0-9]/g, "")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return numeric ? numeric + "원" : "";
}

function normalizeAmountValue(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[^0-9]/g, "");
}

// "원" 접미사를 제외한 마지막 편집 가능 인덱스를 반환한다.
function getAmountEditableEndIndex(value) {
    var text = String(value || "");
    return text.endsWith("원") ? text.length - 1 : text.length;
}

// 클릭/포커스 후 커서가 "원" 뒤로 나가지 않도록 강제로 보정한다.
function clampAmountCaretToEditableRange(input) {
    if (!input) return;
    var end = getAmountEditableEndIndex(input.value);
    var start = Number.isFinite(input.selectionStart) ? input.selectionStart : end;
    var finish = Number.isFinite(input.selectionEnd) ? input.selectionEnd : end;
    var nextStart = Math.min(Math.max(start, 0), end);
    var nextEnd = Math.min(Math.max(finish, 0), end);
    if (nextStart !== start || nextEnd !== finish) {
        input.setSelectionRange(nextStart, nextEnd);
    }
}

// 초기 포커스 시 커서를 항상 숫자 마지막으로 보낸다.
function moveAmountCaretToEditableEnd(input) {
    if (!input) return;
    var end = getAmountEditableEndIndex(input.value);
    input.setSelectionRange(end, end);
}

// 포맷팅 전/후 커서 위치를 유지하기 위해 커서 앞 숫자 개수를 센다.
function countAmountDigitsBeforeCaret(value, caret) {
    var text = String(value || "");
    var cursor = Math.max(0, Math.min(Number.isFinite(caret) ? caret : text.length, text.length));
    return text.slice(0, cursor).replace(/[^0-9]/g, "").length;
}

// 숫자 개수 기준으로 포맷팅 이후 커서 위치를 복원한다.
function setAmountCaretByDigitIndex(input, digitCount) {
    if (!input) return;
    var text = String(input.value || "");
    var editableEnd = getAmountEditableEndIndex(text);

    if (!digitCount || digitCount <= 0) {
        input.setSelectionRange(0, 0);
        return;
    }

    var seen = 0;
    var pos = editableEnd;
    for (var i = 0; i < editableEnd; i += 1) {
        if (/[0-9]/.test(text.charAt(i))) {
            seen += 1;
        }
        if (seen >= digitCount) {
            pos = i + 1;
            break;
        }
    }
    pos = Math.min(pos, editableEnd);
    input.setSelectionRange(pos, pos);
}

function formatGradeLabel(rank, score) {
    if (!rank) return "";
    return `${rank}등급 (${score || 0}점)`;
}

function clampCareerYearValue(value) {
    var num = parseInt(value, 10);
    if (!Number.isFinite(num) || isNaN(num)) {
        return 0;
    }
    if (num < 0) return 0;
    if (num > 99) return 99;
    return num;
}

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

function parseCareerExpValue(value) {
    if (value === null || value === undefined || value === "") {
        return { years: 0, months: 0 };
    }

    var raw = String(value).trim();
    if (!raw) {
        return { years: 0, months: 0 };
    }

    if (/^\d+(\.\d+)?$/.test(raw)) {
        var parts = raw.split(".");
        var years = clampCareerYearValue(parts[0]);
        var months = 0;
        if (parts.length > 1) {
            var monthText = String(parts[1] || "").replace(/[^\d]/g, "");
            months = clampCareerMonthValue(monthText || 0);
        }
        return { years: years, months: months };
    }

    var yearMatch = raw.match(/(\d+)\s*년/);
    var monthMatch = raw.match(/(\d+)\s*개?월/);
    return {
        years: clampCareerYearValue(yearMatch ? yearMatch[1] : 0),
        months: clampCareerMonthValue(monthMatch ? monthMatch[1] : 0)
    };
}

function setCareerSpinInputs(value) {
    var parsed = parseCareerExpValue(value);
    $("#exp_yr_year").val(parsed.years);
    $("#exp_yr_month").val(parsed.months);
    normalizeCareerSpinInputs();
    syncCareerExpText(composeCareerExpValue());
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
    $("#exp_yr_text").text(formatCareerYearMonth(source));
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



// tab4(평가/리스크) 접근 허용 role
const HR014_ALLOWED_ROLE_SET = new Set(["01", "02"]);

// hr010 등록 / 수정 접근 허용
const HR010_EDITOR_ROLE_SET = new Set(["01", "02", "03"]);

// layout.html hidden input(#LOGIN_AUTH)에서 현재 로그인 role 코드 읽기
function getLoginRoleCd() {
    return String($("#LOGIN_AUTH").val() || "").trim();
}

// 현재 사용자가 hr010 등록/수정을 볼 수 있는지 판단
function canAccessHr010Editor() {
    return HR010_EDITOR_ROLE_SET.has(getLoginRoleCd());
}

// hr010 등록/수정 버튼/패널 표시 제어
function applyHr010EditorPermission() {
    const editAllowed = canAccessHr010Editor();
    const $btnAdd = $(".btn-main-add");
    const $btnEdit = $(".btn-main-edit");
    const $btnDel = $(".btn-main-del");    // hr010 등록/수정 버튼/패널 표시 제어
    $btnAdd.toggle(editAllowed);
    $btnEdit.toggle(editAllowed);
    $btnDel.toggle(editAllowed);
}

// 조회조건 콤보 동적 구성
function initHr010SearchTypeOptions() {
    const $searchType = $("#searchType"); // 콤보 엘리먼트
    if (!$searchType.length) return; // 화면에 없으면 종료
    if (!userTable || typeof userTable.getColumns !== "function") return; // 테이블 준비 안됐으면 종료

    const columnDefs = userTable.getColumns() // 테이블 컬럼 객체 목록
        .map(function (col) { return col.getDefinition(); }) // 정의 객체 추출
        .filter(function (def) { // 검색 가능한 컬럼만 남김
            if (!def || !def.field || !def.title) return false; // 필수 정보 없으면 제외
            if (def.visible === false) return false; // 숨김 컬럼 제외
            if (HR010_SEARCH_EXCLUDE_FIELDS.has(def.field)) return false; // 제외 대상 컬럼 제외
            return true; // 통과
        });

    hr010SearchableFields = columnDefs.map(function (def) { return def.field; }); // field 캐시

    $searchType.empty(); // 기존 옵션 제거
    $searchType.append($("<option>", { value: "", text: "전체" })); // 기본 '전체' 옵션

    columnDefs.forEach(function (def) { // 컬럼별 옵션 생성
        $searchType.append($("<option>", { value: def.field, text: def.title })); // value=field, text=컬럼명
    });
}

// 조건검색용 텍스트 변환/필터 함수 추가
function getHr010SearchTextByField(row, field) { // field별 검색 텍스트 표준화
    if (!row || !field) return "";
    if (field === "ctrt_typ") return String((ctrtTypMap && ctrtTypMap[row.ctrt_typ]) || row.ctrt_typ || ""); // 코드->라벨 변환
    if (field === "exp_yr") return String(formatCareerYearMonth(row.exp_yr) || ""); // 경력연차 포맷 반영
    if (field === "hope_rate_amt") return String(amountFormatter(row.hope_rate_amt) || ""); // 금액 포맷 반영
    return String(row[field] == null ? "" : row[field]); // 일반 필드 문자열화
}

function normalizeHr010Digits(value) { // 숫자 검색 보조: 콤마/원/공백 제거
    return String(value == null ? "" : value).replace(/\D/g, "");
}

function matchHr010FieldKeyword(row, field, keyword, keywordDigits) { // 필드별 검색 일치 여부
    const text = getHr010SearchTextByField(row, field);
    if (text.toLowerCase().includes(keyword)) {
        return true;
    }

    // 희망단가는 숫자만 입력해도 매칭되도록 추가 비교
    if (field === "hope_rate_amt" && keywordDigits) {
        return normalizeHr010Digits(text).includes(keywordDigits);
    }

    return false;
}

// 조회조건 + 검색어 필터
function applyHr010ConditionFilter(list, searchType, rawKeyword) {
    if (!Array.isArray(list)) return []; // 안전가드
    if (!rawKeyword) return list; // 검색어 없으면 원본 반환
    const keyword = String(rawKeyword).toLowerCase(); // 대소문자 무시
    const keywordDigits = normalizeHr010Digits(rawKeyword);

    if (!searchType) { // '전체' 선택 시 전체 검색 가능 필드 대상
        return list.filter(function (row) {
            return hr010SearchableFields.some(function (field) {
                return matchHr010FieldKeyword(row, field, keyword, keywordDigits); // 어느 한 필드라도 포함되면 통과
            });
        });
    }

    return list.filter(function (row) { // 특정 필드 선택 시 해당 필드만 검색
        return matchHr010FieldKeyword(row, searchType, keyword, keywordDigits); // 부분일치
    });
}

// [Card View] ====================================================================
function renderUserCards(list) {
    const container = document.getElementById("CARD_HR010_A");
    if (!container) return;

    container.innerHTML = "";

    if (!list.length) {
        container.innerHTML = `<div class="no-data">데이터 없음</div>`;
        return;
    }

    const html = list.map(row => createUserCard(row)).join("");
    container.innerHTML = html;

    bindCardEvents(container, list);
}

function createUserCard(row) {
    const name = row.dev_nm || "";
    const imgUrl = row.img_url;

    let profileHtml = "";

    if (row.has_img && imgUrl) {
        profileHtml = `
            <img src="${imgUrl}" class="profile-circle-icon"
                 onerror="this.style.display='none'"/>
        `;
    } else {
        profileHtml = makeProfileCircle(name);
    }

    return `
        <div class="user-card" data-id="${row.dev_id}">
            
            <div class="card-header">
                <input type="checkbox" class="card-check" />
            </div>

            <div class="card-body">
                
                <div class="profile-circle-wrap">
                    ${profileHtml}
                    <span class="name">${name}</span>
                </div>

                <div class="card-info">
                    <div>등급: ${row.grade ? formatGradeLabel(row.grade, row.score) : "-"}</div>
                    <div>언어: ${row.main_lang_nm || "-"}</div>
                    <div>단가: ${amountFormatter(row.hope_rate_amt)}</div>
                    <div>경력: ${formatCareerYearMonth(row.exp_yr)}</div>
                    <div>지역: ${row.region || "-"}</div>
                </div>

            </div>
        </div>
    `;
}
function bindCardEvents(container, list) {
    const cards = container.querySelectorAll(".user-card");

    cards.forEach(card => {
        const devId = card.dataset.id;
        const rowData = list.find(r => r.dev_id == devId);

        // 클릭 → 선택
        card.addEventListener("click", (e) => {
            if (e.target.classList.contains("card-check")) return;

            card.classList.toggle("selected");

            const checkbox = card.querySelector(".card-check");
            checkbox.checked = card.classList.contains("selected");
        });

        // 체크박스 클릭
        const checkbox = card.querySelector(".card-check");
        checkbox.addEventListener("click", (e) => {
            e.stopPropagation();
            card.classList.toggle("selected", checkbox.checked);
        });

        // 더블클릭 → 상세
        card.addEventListener("dblclick", () => {
            loadUserTableImgDataAsync(rowData).then(() => {
                openUserModal("view", rowData);
            });
        });
    });
}