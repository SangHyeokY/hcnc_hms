/*****
 * 사용자 관리 - hr010.js (hcnc_hms)
 */
var userTable;
// var tab1Table, tab2Table, tab3Table, tab4Table;
var currentMode = "insert";
window.currentDevId = null;

const tabInitState = {
    tab1: false,
    tab2: false,
    tab3: false,
    tab4: false
};

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
        initTab(tabId);
        updateTabActions(tabId);
        refreshTabLayout(tabId);
    });

    $(".btn-search").on("click", function (event) {
        event.preventDefault();
        loadUserTableData();
    });

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

    $(".btn-user-save").on("click", function () {
        upsertUserBtn();
    });

    $(".btn-main-view").on("click", function () {
        const rowData = btnEditView("조회할 ");
        if (!rowData) return;
        loadUserTableImgData(rowData);
        openUserModal("view", rowData);
    });
});

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
            { title: "성명", field: "dev_nm", hozAlign: "center", headerSort: true },
            { title: "생년월일", field: "brdt", headerSort: true },
            { title: "연락처", field: "tel" },
            { title: "이메일", field: "email" },
            { title: "거주지역", field: "region" },
            { title: "주 개발언어", field: "main_lang" },
            { title: "경력연차", field: "exp_yr", hozAlign: "center" },
            { title: "최종학력", field: "edu_last" },
            { title: "보유자격증", field: "cert_txt" },
            { title: "희망단가", field: "hope_rate_amt", hozAlign: "right", formatter: amountFormatter },
            { title: "투입가능시점", field: "avail_dt" },
            { title: "계약형태",
                  field: "ctrt_typ",
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

// db로부터 리스트 불러오기
function loadUserTableData() {
    if (!userTable || typeof userTable.setData !== "function") {
        return;
    }
    $.ajax({
        url: "/hr010/list",
        type: "GET",
        // xhrFields: { responseType: "arraybuffer" }, // ★ 핵심
        data: {
            dev_nm: $("#insertNM").val(),
            searchKeyword: $("#searchKeyword").val()
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

// 데이터 신규 등록/수정 이벤트
function upsertUserBtn()
{
     // 유효성 검사
     if (!validateUserForm()) {
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
        cert_txt: $("#cert_txt").val(),
        dev_type: $("#dev_type").val(),
        crt_by: ""
    };

    const file = $("#fileProfile")[0].files[0]; // 또는 payload.dev_img
    const fd = new FormData();

    // 1) 텍스트 필드들 추가
    Object.keys(payload).forEach(k => {
        if (k === "dev_img") return;          // ✅ File은 제외
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
            closeUserViewModal();
            loadUserTableData();
        },
        error: function () {
            alert("저장 중 오류가 발생했습니다.");
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

    if (mode !== "insert" && data?.dev_id) {
        requestAnimationFrame(() => {
            loadUserScore(data.dev_id);
        });
    }
};

// 모든 tab 초기화
function initAllTabs() {
    initTab1();
    initTab2();
    initTab3();
    initTab4();
}

// 팝업 열리면 데이터 채워넣기 (구)
//function openUserViewModal(d) {
//    $("#dev_nm").val(d.dev_nm || "");       // 성명
//    $("#brdt").val(d.brdt || "");           // 생년월일
//    $("#tel").val(d.tel || "");             // 연락처
//    $("#email").val(d.email || "");         // 이메일
//    $("#region").val(d.region || "");       // 거주지역
//    $("#main_lang").val(d.main_lang || ""); // 주 개발언어
//    $("#exp_yr").val(d.exp_yr || "");       // 경력연차
//    $("#edu_last").val(d.edu_last || "");   // 최종학력
//    $("#cert_txt").val(d.cert_txt || "");   // 보유 자격증
//    $("#avail_dt").val(d.avail_dt || "");   // 투입가능시점
//    $("#work_md").val(d.work_md || "");    // 근무형태
//    $("#ctrt_typ").val(d.ctrt_typ || "");   // 계약형태
//    $("#hope_rate_amt").val(d.hope_rate_amt || "");   // 희망단가
//
//    setModalMode("view");
//    $("#view-user-area").show();
//}

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
    $("#exp_yr").val(d.exp_yr || "");
    $("#edu_last").val(d.edu_last || "");
    $("#cert_txt").val(d.cert_txt || "");
    $("#avail_dt").val(d.avail_dt || "");

    $("#hope_rate_amt").val(
        formatAmount(d.hope_rate_amt)
    );

    $("#dev_type").val(d.dev_type || "");
    $("#work_md").val(d.work_md || "");
    $("#ctrt_typ").val(d.ctrt_typ || "");

    $(".show_devId").text(
        window.currentDevId
            ? "[" + window.currentDevId + "]"
            : ""
    );

    // dev_id 값 가져와서 sub-title에 붙이기
    if (d.dev_id) {
        if (d.dev_id.startsWith("HCNC_F")) {
            $("#dev_type").val("HCNC_F");
        } else if (d.dev_id.startsWith("HCNC_S")) {
            $("#dev_type").val("HCNC_S");
        } else {
            // console.log("dev_id 값이 잘못 되었습니다.")
            $("#dev_type").val("");
        }
    } else {
        // console.log("dev_id 값이 존재하지 않습니다.")
        $("#dev_type").val("");
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
    $("#exp_yr").val("");
    $("#edu_last").val("");
    $("#cert_txt").val("");
    $("#avail_dt").val("");
    $("#hope_rate_amt").val("");

    $("#view-user-area").hide();
}

// 팝업의 역할에 따라 sub-title 변경 되기
function setModalMode(mode) {
    var $modal = $("#view-user-area");
    var $inputs = $modal.find("input, select");
    var $title = $modal.find(".modal-title");

    if (mode === "view") {
        $title.text("상세");
        $inputs.prop("disabled", true);
        $(".btn-save").hide();
    } else if (mode === "insert") {
        $title.text("등록");
        $inputs.prop("disabled", false);
        $(".btn-save").show();
    } else {
        $title.text("수정");
        $inputs.prop("disabled", false);
        $(".btn-save").show();
    }

    window.hr010ReadOnly = mode === "view";
    updateTabActions($(".tab-btn.active").data("tab"));
    if (typeof window.applyTab3Readonly === "function") {
        window.applyTab3Readonly(window.hr010ReadOnly);
    }
    if (typeof window.applyTab4Readonly === "function") {
        window.applyTab4Readonly(window.hr010ReadOnly);
    }
}

// 모달 닫히면 영역 사라지게 하기
function closeUserViewModal() {
    document.getElementById("view-user-area").style.display = "none";
}

function initTab(tabId) {
    switch(tabId) {
        case "tab1": initTab1(); break;
        case "tab2": initTab2(); break;
        case "tab3": initTab3(); break;
        case "tab4": initTab4(); break;
    }
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
        if (tabId === "tab3" && window.hr013Table) {
            window.hr013Table.redraw(true);
        }
        if (tabId === "tab4" && window.hr014TableA) {
            window.hr014TableA.redraw(true);
        }
    }, 0);
}

// 계약단가(,),(테이블표)
function amountFormatter(cell) {
    if (cell.getValue() === null || cell.getValue() === undefined || cell.getValue() === "") {
        return "";
    }
    return formatNumberInput(cell.getValue());
}

// 팝업에서도 마찬가지로 (,) 표시
function formatAmount(value) {
    if (value === null || value === undefined || value === "") return "";

    return value
        .toString()
        .replace(/[^0-9]/g, "")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 데이터 유효성 검사
function validateUserForm() {

    // 값 가져오기
    const dev_nm = $("#dev_nm").val().trim();
    const brdt = $("#brdt").val().trim();
    const tel = $("#tel").val().trim();
    const email = $("#email").val().trim();
    const hopeRate = $("#hope_rate_amt").val().replace(/,/g, "");

    if (!dev_nm) {
        alert("성명을 입력하세요.");
        $("#dev_nm").focus();
        return false;
    }

    if (!brdt) {
        alert("생년월일을 입력하세요.");
        $("#brdt").focus();
        return false;
    }

    if (!tel) {
        alert("연락처를 입력하세요.");
        $("#tel").focus();
        return false;
    }

    if (!email) {
        alert("이메일을 입력하세요.");
        $("#email").focus();
        return false;
    }

    // 전화번호 (숫자만 입력)
    if (!/^[0-9\-]+$/.test(tel)) {
        alert("연락처 형식이 올바르지 않습니다.");
        $("#tel").focus();
        return false;
    }

    // 이메일
    const emailRegex =
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(email)) {
        alert("이메일 형식이 올바르지 않습니다.");
        $("#email").focus();
        return false;
    }

    if (hopeRate && isNaN(hopeRate)) {
        alert("희망단가는 숫자만 입력 가능합니다.");
        $("#hope_rate_amt").focus();
        return false;
    }

    return true;
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
