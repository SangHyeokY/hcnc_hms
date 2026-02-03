// 사용자 관리 - hr010.js (hcnc_hms)
var userTable;
var currentMode = "insert";
window.currentDevId = null;

// 주 개발언어 태그 입력 공통 모듈
var mainLangTagInput = null;
var pendingMainLangValue = "";

// ============================================================================== //

// 문서 첫 생성 시 실행
$(document).ready(function () {
    buildUserTable();
    loadUserTableData();

    $(".tab-panel").hide();

    $("#fileProfile").on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // 이미지 파일만 허용
        if (!file.type.startsWith("image/")) {
            alert("이미지 파일만 선택 가능합니다.");
            return;
        }

        $("#dev_img").show();
        $("#dev_img")[0].src = URL.createObjectURL(file);
    });

    // 탭 클릭 이벤트
    $(".tab-btn").on("click", function () {
        const tabId = $(this).data("tab");

        $(".tab-btn").removeClass("active");
        $(this).addClass("active");

        $(".tab-panel").hide();
        $("#" + tabId).show();
        updateTabActions(tabId);
        refreshTabLayout(tabId);
    });

    $(".btn-search").on("click", function (event) {
        event.preventDefault();
        loadUserTableData();
    });

    // 검색 기능 - 사용 안함
    $("#searchKeyword").on("keyup", function (event) {
        if (event.key === "Enter") {
            loadUserTableData();
        }
    });

    $(".btn-main-add").on("click", function () {
        openUserModal("insert");
    });

    $(".btn-main-edit").on("click", function () {
        const rowData = btnEditView("수정할 ");
        if (!rowData) return;
        loadUserTableImgData(rowData);
        openUserModal("update", rowData);
    });

    $(".btn-main-del").on("click", function () {
        deleteUserRows();
    });

    $(".btn-main-view").on("click", function () {
        const rowData = btnEditView("조회할 ");
        if (!rowData) return;
        loadUserTableImgData(rowData);
        openUserModal("view", rowData);
    });

    // 인적사항 및 tab 정보 저장 (통합 저장)
    $(document).on("click", "#btn-user-save", function () {
        const activeTab = $(".tab-btn.active").data("tab");
        console.log("현재 탭 :", activeTab);

    // ---------- Tab 마다 추가하기 ------------ //
        if (!validateUserForm()) {
            console.log("인적사항 유효성 검사 실패");
            return;
        }

        if (!validateHr011Form()) {
            console.log("Tab1 유효성 검사 실패");
            return;
        }

        // Tab2 ~ Tab4

    // ---------- Tab 마다 추가하기 ------------ //

        // 인적사항 정보 저장
        upsertUserBtn(function(success) {
            if (!success) {
                console.log("인적사항 저장 실패");
                return;
            }
            // Tab별로 저장
            if (activeTab === "tab1") {
                saveHr011TableData();
            } else if (activeTab === "tab2") {
                saveHr012TableData?.();
                saveHr012TableB?.();
            }
// else if (activeTab === "tab3") {
//                saveHr013TableData?.();
//            }
        });
    });
});

// ============================================================================== //

// 테이블 생성 정의
function buildUserTable() {
    if (!window.Tabulator) {
        console.error("Tabulator가 로드되지 않았습니다.");
        return;
    }

    if (!document.getElementById("TABLE_HR010_A")) {
        return;
    }

    function syncRowCheckbox(row, checked) {
        var rowElement = row.getElement();
        if (!rowElement) {
            return;
        }
        var checkbox = rowElement.querySelector(".row-check");
        if (checkbox) {
            checkbox.checked = checked;
        }
    }

    function syncTableCheckboxes(table) {
        if (!table || typeof table.getRows !== "function") {
            return;
        }
        table.getRows().forEach(function (row) {
            syncRowCheckbox(row, row.isSelected());
        });
    }

    function toggleRowSelection(row) {
        if (row.isSelected()) {
            row.deselect();
        } else {
            row.select();
        }
    }

    userTable = new Tabulator("#TABLE_HR010_A", {
        layout: "fitColumns",
        headerSort: true,
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        selectable: 1,
        columnDefaults: {
            resizable: true,
            cellClick: function (e, cell) {
                toggleRowSelection(cell.getRow());
                e.stopPropagation();
            }
        },
        columns: [
            {
                title: "",
                field: "checkBox",
                formatter: function (cell) {
                    var checked = cell.getRow().isSelected() ? " checked" : "";
                    return "<input type='checkbox' class='row-check'" + checked + " />";
                },
                cellClick: function (e, cell) {
                    toggleRowSelection(cell.getRow());
                    e.stopPropagation();
                    e.preventDefault();
                },
                width: 50,
                headerSort: false,
                download: false
            },
            { title: "dev_id", field: "dev_id", visible: false },
            { title: "crt_ts", field: "crt_ts", visible: false},
            { title: "성명", field: "dev_nm", hozAlign: "center", headerSort: true , widthgrow:1},
            { title: "생년월일", field: "brdt", headerSort: true, widthgrow: 1},
            { title: "연락처", field: "tel", widthgrow: 3},
            { title: "이메일", field: "email", widthgrow:3},
            { title: "거주지역", field: "region", widthgrow:1 },
            { title: "주 개발언어", field: "main_lang_nm", widthgrow: 3},
            { title: "경력연차", field: "exp_yr", hozAlign: "center" , widthgrow:1},
            { title: "최종학력", field: "edu_last", widthgrow:1},
            { title: "보유자격증", field: "cert_txt" , widthgrow:1},
            { title: "희망단가", field: "hope_rate_amt", hozAlign: "right", formatter: amountFormatter, widthgrow:1 },
            { title: "투입가능시점", field: "avail_dt", widthgrow:1 },
            { title: "계약형태",
                  field: "ctrt_typ", widthgrow:1,
                  formatter: function(cell, formatterParams, onRendered){
                      var val = cell.getValue();
                      if(val === "01") return "개인";
                      if(val === "02") return "법인";
                      return "";
                  }
            }
        ],
        data: [],
        rowSelected: function (row) {
            syncRowCheckbox(row, true);
        },
        rowDeselected: function (row) {
            syncRowCheckbox(row, false);
        },
        rowSelectionChanged: function () {
            syncTableCheckboxes(userTable);
        },
        rowDblClick: function (e, row) {
            var rowData = row.getData();
            loadUserTableImgData(rowData);
            openUserModal("view", rowData);
        }
    });
}

// db로부터 리스트 불러와서 테이블에 넣기
function loadUserTableData() {
    if (!userTable || typeof userTable.setData !== "function") {
        return;
    }

    // 키워드 검색
    let keyword = $("#searchKeyword").val().trim();
    if (keyword) {
        // 공백이나 콤마를 기준으로 단어 나눔
        keyword = keyword
            .split(/[\s,]+/)
            .filter(w => w)
            .map(w => "+" + w)
            .join(" ");
    } else {
        keyword = null;
    }
    console.log("키워드 : " + keyword);

    $.ajax({
        url: "/hr010/list",
        type: "GET",
        // xhrFields: { responseType: "arraybuffer" }, // ★ 핵심
        data: {
            dev_nm: $("#insertNM").val(),
            searchKeyword: keyword
        },
        success: function (response) {
            userTable.setData(response.res || []);
        },
        error: function (e) {
            alert("사용자 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

// db로부터 리스트 불러오기
function loadUserTableImgData(data) {
    if (!userTable || typeof userTable.setData !== "function") {
        return;
    }
    $.ajax({
        url: "/hr010/list/img",
        type: "GET",
        xhrFields: { responseType: "arraybuffer" }, // ★ 핵심
        data: data,
        success: function (response) {
            const blob = new Blob([response], { type: "image/jpeg" });
            const imgUrl = URL.createObjectURL(blob);

            if (response.byteLength > 0)
                $("#dev_img").show();
            else
                $("#dev_img").hide();

            $("#dev_img")[0].src = imgUrl;
        },
        error: function (e) {
            alert("사용자 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

// ============================================================================== //

// 데이터 신규 등록/수정 이벤트
function upsertUserBtn(callback)
{
     if (!validateUserForm()) {
         if (callback) callback(false);
         return;
     }

     var payload = {
        dev_id: $("#dev_id").val(),
        dev_nm: $("#dev_nm").val(),
        brdt: $("#brdt").val(),
        tel: $("#tel").val(),
        email: $("#email").val(),
        region: $("#region").val(),
        main_lang: $("#main_lang").val(),
        exp_yr: $("#exp_yr").val(),
        edu_last: $("#edu_last").val(),
        cert_txt: $("#cert_txt").val(),
        hope_rate_amt: $("#hope_rate_amt").val().replace(/,/g, ""),
        avail_dt: $("#avail_dt").val(),
        ctrt_typ: $("#ctrt_typ").val(),
        work_md: $("#work_md").val(),
        dev_type: $("#dev_type").val(),
        crt_by: ""
    };

    const file = $("#fileProfile")[0].files[0]; // 또는 payload.dev_img
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
            if (response && response.dev_id) {
                window.currentDevId = response.dev_id;
                $("#dev_id").val(response.dev_id);
            }
            if (typeof window.saveTab4All === "function") {
                window.saveTab4All();
            }
            alert("저장되었습니다.");
            if (callback) callback(true);

            closeUserViewModal();
            loadUserTableData();
        },
        error: function () {
            alert("저장 중 오류가 발생했습니다.");
            if (callback) callback(false);
        }
    });
}

// 데이터 삭제 이벤트
function deleteUserRows() {
    var selectedRows = userTable.getSelectedRows();
    if (selectedRows.length === 0) {
        alert("삭제할 사용자를 선택해주세요.");
        return;
    }
    if (!confirm("선택한 사용자를 삭제하시겠습니까?")) {
        return;
    }
    var pending = selectedRows.length;
    selectedRows.forEach(function (row) {
        $.ajax({
            url: "/hr010/delete",
            type: "POST",
            data: { dev_id: row.getData().dev_id },
            complete: function () {
                pending -= 1;
                if (pending === 0) {
                    loadUserTableData();
                    alert("삭제되었습니다.");
                }
            },
            error: function () {
                alert("삭제 중 오류가 발생했습니다.");
            }
        });
    });
}

// ============================================================================== //

// 모달(팝업) 열리는 이벤트 처리
openUserModal = function(mode, data) {
    currentMode = mode;
    if(mode === "insert") clearUserForm();
    else fillUserForm(data || userTable.getSelectedRows()[0].getData());

    setModalMode(mode);
    $("#view-user-area").show();

    initAllTabs(); // 모든 tab 초기화

    // 항상 tab1 활성화
    $(".tab-btn").removeClass("active");
    $(".tab-btn[data-tab='tab1']").addClass("active");
    $(".tab-panel").hide();
    $("#tab1").show();

    window.hr014TabInitialized = false;

    updateTabActions("tab1");
    refreshTabLayout("tab1");

    initMainLangTags();

    if (mode !== "insert" && data?.dev_id) {
        requestAnimationFrame(() => {
            loadUserScore(data.dev_id);
        });
    }
};

// 모든 tab 초기화
function initAllTabs() {
    initTab1();
    if (currentMode !== "insert") {
        initTab2();
        initTab3();
        initTab4();
    }
}

// 팝업에 데이터 채워넣기
function fillUserForm(d) {
    window.currentDevId = d.dev_id;
    $("#dev_id").val(d.dev_id || "");
    $("#dev_nm").val(d.dev_nm || "");
    $("#brdt").val(d.brdt || "");
    $("#tel").val(d.tel || "");
    $("#email").val(d.email || "");
    $("#region").val(d.region || "");
    $("#main_lang").val(d.main_lang || "");
    pendingMainLangValue = d.main_lang || "";   // main_lang 채워넣기 전용
    if (mainLangTagInput) {
        mainLangTagInput.setFromValue(pendingMainLangValue);
    }
    $("#exp_yr").val(d.exp_yr || "");
    $("#edu_last").val(d.edu_last || "");
    $("#cert_txt").val(d.cert_txt || "");
    $("#avail_dt").val(d.avail_dt || "");
    $("#crt_ts").text(d.crt_ts || "");

    $("#hope_rate_amt").val(
        formatAmount(d.hope_rate_amt)
    );

    $("#dev_type").val(d.dev_type || "");
    $("#work_md").val(d.work_md || "");
    $("#ctrt_typ").val(d.ctrt_typ || "");

    $("#show_devId").text(
        window.currentDevId
            ? "[" + window.currentDevId + "]"
            : ""
    );

    // dev_id 값 가져와서 sub-title에 붙이기
    if (d.dev_id) {
        if (d.dev_id.startsWith("HCNC_F")) {
            $("#dev_type").val("HCNC_F");
            $("#dev_type2").text("프리랜서");
            $("#devTypeWrap").show();
        } else if (d.dev_id.startsWith("HCNC_S")) {
            $("#dev_type").val("HCNC_S");
            $("#dev_type2").text("사원");
            $("#devTypeWrap").show();
        } else {
            // console.log("dev_id 값이 잘못 되었습니다.")
            $("#dev_type").val("");
            $("#dev_type2").text("");
        }
    } else {
        // console.log("dev_id 값이 존재하지 않습니다.")
        $("#dev_type").val("");
        $("#dev_type2").text("");
    }
}

// 팝업 닫히면 값 초기화하기
function clearUserForm() {
    window.currentDevId = null;
    $("#dev_img").hide();
    $("#dev_img")[0].src = "";
    $("#dev_id").val("");
    $("#dev_nm").val("");
    $("#brdt").val("");
    $("#tel").val("");
    $("#email").val("");
    $("#region").val("");
    $("#main_lang").val("");
    pendingMainLangValue = "";
    if (mainLangTagInput) {
        mainLangTagInput.clear();
    }
    $("#exp_yr").val("");
    $("#edu_last").val("");
    $("#cert_txt").val("");
    $("#avail_dt").val("");
    $("#hope_rate_amt").val("");
    $("#crt_ts").text("");

    $("#grade").text("");
    $("#score").text("");
    $("#dev_type").val("");
    $("#work_md").val("");
    $("#ctrt_typ").val("");

    $("#show_devId").text("");
    $("#dev_type2").text("");
    $("#devTypeWrap").hide();

    $("#view-user-area").hide();
}

// 팝업의 역할에 따라 sub-title 변경 되기
function setModalMode(mode) { // 간략화
    console.log("Mode 구분 :", mode);

    const isView   = mode === "view";
    const isInsert = mode === "insert";
    const isUpdate = mode === "update";

    var $modal = $("#view-user-area");
    var $title = $modal.find("#modal-title");

    // title 표시
    if (isView) $title.text("상세");
    else if (isInsert) $title.text("등록");
    else if (isUpdate) $title.text("수정");

    if (isView) {
        // 조회 => 수정불가
        $modal.find("input, textarea")
              .prop("readonly", true)
              .prop("disabled", true);

        $modal.find("select").prop("disabled", true);
    } else {
        // 등록/수정할 때 수정 가능하도록 변경
        $modal.find("input, textarea")
              .prop("readonly", false)
              .prop("disabled", false)
              .removeAttr("readonly")
              .removeAttr("disabled");
        $modal.find("select")
              .prop("disabled", false)
              .removeAttr("disabled");
    }

    $("#btn-user-save").toggle(isInsert || isUpdate);
    $(".tab-article").toggle(!isInsert);
    $("#main_lang_input").toggle(!isView);

    const $tagBox = $("#mainLangTagList").closest(".tag-input-box");
    $tagBox.toggleClass("is-readonly", isView);
    $tagBox.find(".tag-help").toggle(!isView);

    window.hr010ReadOnly = isView;

    updateTabActions($(".tab-btn.active").data("tab"));

    // Tab 연동
    window.hr010ReadOnly = isView;
    broadcastTabReadonly(isView);

    if (isView) {
        $(".showingbtn").hide();  // 조회일때 숨김
    } else if (isUpdate || isInsert) {
        $(".showingbtn").show();  // 수정/등록일때 보이기
    }
}

// Tab의 readonly 제어
function broadcastTabReadonly(isReadOnly) {
    $(document).trigger("tab:readonly", [isReadOnly]);
}

// ============================================================================== //

//function setModalMode(mode) {
//    var $modal = $("#view-user-area");
//    var $inputs = $modal.find("input, select");
//    var $title = $modal.find(".modal-title");
//
//    if (mode === "view") {
//        $title.text("상세");
//        $inputs.prop("disabled", true);
//        $(".btn-save").hide();
//        $("#main_lang_input").hide();
//        $("#mainLangTagList").closest(".tag-input-box").find(".tag-help").hide();
//        $("#mainLangTagList").closest(".tag-input-box").addClass("is-readonly");
//    } else if (mode === "insert") {
//        $title.text("등록");
//        $inputs.prop("disabled", false);
//        $(".btn-save").show();
//        $(".tab-article").hide();
//        $("#main_lang_input").show();
//        $("#mainLangTagList").closest(".tag-input-box").find(".tag-help").show();
//        $("#mainLangTagList").closest(".tag-input-box").removeClass("is-readonly");
//    } else {
//        $title.text("수정"); // edit
//        $inputs.prop("disabled", false);
//        $(".btn-save").show();
//        $(".tab-article").show();
//        $("#main_lang_input").show();
//        $("#mainLangTagList").closest(".tag-input-box").find(".tag-help").show();
//        $("#mainLangTagList").closest(".tag-input-box").removeClass("is-readonly");
//    }
//
//    window.hr010ReadOnly = mode === "view";
//    updateTabActions($(".tab-btn.active").data("tab"));
//    if (typeof window.applyTab3Readonly === "function") {
//        window.applyTab3Readonly(window.hr010ReadOnly);
//    }
//    if (typeof window.applyTab4Readonly === "function") {
//        window.applyTab4Readonly(window.hr010ReadOnly);
//    }
//}

// ============================================================================== //

// 모달 닫히면 영역 사라지게 하기
function closeUserViewModal() {
    document.getElementById("view-user-area").style.display = "none";
    clearUserForm()
}

// 탭별 버튼 표시
function updateTabActions(tabId) {
    if (window.hr010ReadOnly) {
        $(".tab-actions").removeClass("active");
        $(".tab-action-bar").hide();
        return;
    }
    $(".tab-action-bar").show();
    $(".tab-actions").removeClass("active");
    $(".tab-actions[data-tab='" + tabId + "']").addClass("active");
}

// 탭 표시 후 레이아웃 재계산
function refreshTabLayout(tabId) {
    setTimeout(function () {
        if (tabId === "tab2" && window.hr012TableA) {
            window.hr012TableA.redraw(true);
        }
        if (tabId === "tab2" && window.hr012TableB) {
            window.hr012TableB.redraw(true);
        }
        if (tabId === "tab3" && window.hr013Table) {
            window.hr013Table.redraw(true);
        }
        if (tabId === "tab4" && window.hr014TableA) {
            window.hr014TableA.redraw(true);
        }
    }, 0);
}

// ============================================================================== //

// 데이터 유효성 검사
function validateUserForm() {

    // 값 가져오기
    const dev_nm = $("#dev_nm").val().trim();
    const brdt = $("#brdt").val().trim();
    const tel = $("#tel").val().trim();
    const email = $("#email").val().trim();
    const hopeRaw = $("#hope_rate_amt").val().replace(/,/g, "");
    const expYr = $("#exp_yr").val().trim();

    // 최대 입력 가능 숫자
    const MAX_AMT = 999999999;

    // 개발자 이름
    if (!dev_nm) {
        alert("성명을 입력하세요.");
        $("#dev_nm").focus();
        return false;
    }

    // 생년월일
    if (!brdt) {
        alert("생년월일을 입력하세요.");
        $("#brdt").focus();
        return false;
    }

    // 전화번호
    if (!tel) {
        alert("연락처를 입력하세요.");
        $("#tel").focus();
        return false;
    }

    // 전화번호 (숫자만 입력)
    if (!/^[0-9\-]+$/.test(tel)) {
        alert("연락처 형식이 올바르지 않습니다.");
        $("#tel").focus();
        return false;
    }

    // 이메일
    if (!email) {
        alert("이메일을 입력하세요.");
        $("#email").focus();
        return false;
    }

    const emailRegex =
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(email)) {
        alert("이메일 형식이 올바르지 않습니다.");
        $("#email").focus();
        return false;
    }

    // 경력연차
    if (!expYr) {
        alert("경력연차를 입력하세요.");
        $("#exp_yr").focus();
        return false;
    }
    if (!/^\d+(\.\d+)?$/.test(expYr)) {
        alert("경력연차는 숫자(소수점 포함)만 입력 가능합니다.");
        $("#exp_yr").focus();
        return false;
    }

    // 희망단가
    if (!hopeRaw) {
        alert("희망단가를 입력해주세요.");
        $("#hope_rate_amt").focus();
        return false;
    }
    if (Number(hopeRaw) > MAX_AMT) {
        alert("희망단가는 최대 999,999,999원까지 입력 가능합니다.");
        $("#hope_rate_amt").focus();
        return false;
    }

    return true;
}

// ============================================================================== //

// 주 개발언어 태그 공통화 초기화
function initMainLangTags() {
    if (mainLangTagInput) {
        return;
    }
    mainLangTagInput = createTagInput({
        inputSelector: "#main_lang_input",
        listSelector: "#mainLangTagList",
        hiddenSelector: "#main_lang",
        datalistSelector: "#main_lang_datalist",
        getValue: function (item) { return item.cd; },
        getLabel: function (item) { return item.cd_nm; },
        matchMode: "prefix"
    });

    setComCode("main_lang_select", "skl_id", "", "cd", "cd_nm", function (res) {
        mainLangTagInput.setOptions(res || []);
        mainLangTagInput.setFromValue(pendingMainLangValue || $("#main_lang").val());
    });
}

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

// 경력연차 자동 변환
$("#exp_yr").on("input", function () {
    let val = this.value;

    // 숫자와 소수점만 허용
    val = val.replace(/[^0-9.]/g, "");

    // 소수점은 하나만 허용
    const parts = val.split(".");
    if (parts.length > 2) {
        val = parts[0] + "." + parts.slice(1).join("");
    }
    this.value = val;
});

// 희망단가는 숫자만 입력 가능
$("#hope_rate_amt").on("input", function () {
    let input_number = this.value.replace(/[^0-9]/g, "");
    this.value = formatNumber(input_number);
});

// 숫자에 콤마
function formatNumber(num) {
    if (!num) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 문자열 가공
//function unformatNumber(str) {
//    return str ? str.replace(/,/g, "") : "";
//}

// 점수 계산
function loadUserScore(devId) {
    // 최초값
    $("#grade").text("계산중...");
    $("#score").text("");

    $.ajax({
        url: "/hr010/getScore",
        type: "GET",
        data: { dev_id: devId },
        success: function(res) {
            const data = res.res || {};
            $("#grade").text(data.rank || "-");
            $("#score").text(`(${data.score || 0}점)`);
        }
    });
}

// alert 문자 가공
function btnEditView(alertPrefix = "") {
    if (!userTable) return null;
    const rows = userTable.getSelectedRows();
    if (rows.length === 0) {
        alert(alertPrefix + "대상을 선택하세요.");
        return null;
    }
    if (rows.length > 1) {
        alert(alertPrefix + "한 명만 선택해주세요.");
        return null;
    }
    return rows[0].getData();
}

// 계약단가(,),(테이블표)
function amountFormatter(cell) {
    if (cell.getValue() === null || cell.getValue() === undefined || cell.getValue() === "") {
        return "";
    }
    return formatNumber(cell.getValue());
}

// 팝업에서도 마찬가지로 (,) 표시
function formatAmount(value) {
    if (value === null || value === undefined || value === "") return "";

    return value
        .toString()
        .replace(/[^0-9]/g, "")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
