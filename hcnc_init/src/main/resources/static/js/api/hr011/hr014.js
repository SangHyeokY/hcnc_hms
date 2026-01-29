var tableHr014;

$(document).ready(function () {
    buildHr014Table();
    loadHr014Table();

    $(".btn-hr014-load").on("click", function () {
        loadHr014Table();
    });

    $(".btn-hr014-new").on("click", function () {
        openHr014Modal("new");
    });

    $(".btn-hr014-edit").on("click", function () {
        openHr014Modal("edit");
    });

    $(".btn-hr014-delete").on("click", function () {
        deleteHr014Row();
    });

    $(".btn-hr014-save").on("click", function () {
        saveHr014Row();
    });

    $("#write_hr014_rate_amt").on("input", function () {
        $(this).val(formatNumberInput($(this).val()));
    });

    $("#write_hr014_alloc_pct").on("input", function () {
        $(this).val(formatPercentInput($(this).val()));
    });
});

function buildHr014Table() {
    if (!window.Tabulator) {
        console.error("Tabulator가 로드되지 않았습니다.");
        return;
    }

    if (!document.getElementById("TABLE_HR014")) {
        return;
    }

    function ynCheckboxFormatter(cell) {
        var checked = cell.getValue() === "Y" ? " checked" : "";
        return "<input type='checkbox'" + checked + " disabled />";
    }

    tableHr014 = new Tabulator("#TABLE_HR014", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        selectable: 1,
        columns: [
            { title: "당사 여부", field: "inprj_yn", width: 90, hozAlign: "center", formatter: ynCheckboxFormatter },
            { title: "기간", field: "st_ed_dt", width: 160, hozAlign: "center" },
            { title: "고객사", field: "cust_nm", widthGrow: 2 },
            { title: "프로젝트명", field: "prj_nm", widthGrow: 2 },
            { title: "계약단가", field: "rate_amt", width: 130, hozAlign: "right", formatter: amountFormatter },
            { title: "역할", field: "role_nm", width: 80, hozAlign: "center" },
            { title: "기술스택", field: "stack_txt", widthGrow: 3 },
            { title: "투입률", field: "alloc_pct", width: 90, hozAlign: "right", formatter: perentageFormatter },
            { title: "비고", field: "remark", widthGrow: 4 }
        ],
        data: []
    });
}

// 단가/프로젝트 이력 조회
function loadHr014Table() {
    if (!tableHr014 || typeof tableHr014.setData !== "function") {
        return;
    }

    $.ajax({
        url: "/hr014/list",
        type: "GET",
        success: function (response) {
            tableHr014.setData(response.list || []);
        },
        error: function () {
            alert("데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

// 프로젝트 이력 모달 열기
function openHr014Modal(mode) {
    var title = mode === "edit" ? "수정" : "등록";
    $("#hr014-type").text(title);

    if (mode === "edit") {
        var rowData = getHr014SelectedRow();
        if (!rowData) {
            alert("수정할 행을 선택해주세요.");
            return;
        }
        fillHr014Form(rowData);
    } else {
        clearHr014Form();
    }

    $("#write-hr014-area").show();
}

// 프로젝트 이력 모달 닫기
function closeHr014Modal() {
    $("#write-hr014-area").hide();
}

// 선택 행 가져오기
function getHr014SelectedRow() {
    if (!tableHr014) {
        return null;
    }
    var rows = tableHr014.getSelectedRows();
    if (!rows || rows.length === 0) {
        return null;
    }
    return rows[0].getData();
}

// 폼 데이터 채우기
function fillHr014Form(data) {

    console.log("st_dt : " + data.st_dt, "ed_dt : " + data.ed_dt);
    $("#write_hr014_dev_prj_id").val(data.dev_prj_id || "");
    $("#write_hr014_inprj_yn").val(data.inprj_yn || "N");
    $("#write_hr014_st_dt").val(toDateInput(data.st_dt));
    $("#write_hr014_ed_dt").val(toDateInput(data.ed_dt));
    $("#write_hr014_cust_nm").val(data.cust_nm || "");
    $("#write_hr014_prj_nm").val(data.prj_nm || "");
    $("#write_hr014_rate_amt").val(formatNumberInput(data.rate_amt));
    $("#write_hr014_role_nm").val(data.role_nm || "");
    $("#write_hr014_stack_txt").val(data.stack_txt || "");
    $("#write_hr014_alloc_pct").val(formatPercentInput(data.alloc_pct));
    $("#write_hr014_remark").val(data.remark || "");
    console.log("input value : " + $("#write_hr014_st_dt").val());
}

// 폼 초기화
function clearHr014Form() {
    $("#write_hr014_dev_prj_id").val("");
    $("#write_hr014_inprj_yn").val("N");
    $("#write_hr014_st_dt").val("");
    $("#write_hr014_ed_dt").val("");
    $("#write_hr014_cust_nm").val("");
    $("#write_hr014_prj_nm").val("");
    $("#write_hr014_rate_amt").val("");
    $("#write_hr014_role_nm").val("");
    $("#write_hr014_stack_txt").val("");
    $("#write_hr014_alloc_pct").val("");
    $("#write_hr014_remark").val("");
}

// 저장 버튼
function saveHr014Row() {
    alert("저장 API는 아직 구현되지 않았습니다.");
}

// 삭제 버튼
function deleteHr014Row() {
    var rowData = getHr014SelectedRow();
    if (!rowData) {
        alert("삭제할 행을 선택해주세요.");
        return;
    }
    alert("삭제 API는 아직 구현되지 않았습니다.");
}

// 투입률
function perentageFormatter(cell) {
    if (cell.getValue() === null || cell.getValue() === undefined || cell.getValue() === "") {
        return "";
    }
    return formatPercentInput(cell.getValue());
}

// 계약단가(,),(테이블표)
function amountFormatter(cell) {
    if (cell.getValue() === null || cell.getValue() === undefined || cell.getValue() === "") {
        return "";
    }
    return formatNumberInput(cell.getValue());

}

// 날짜(테이블 표시)
function toDateInput(v) {
    if (!v) return "";
    var d = new Date(Number(v));
    if(isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);

}

// 숫자 콤마 포맷(입력값)
function formatNumberInput(value) {
    if (value === null || value === undefined) return "";
    var raw = String(value).replace(/[^\d]/g, "");
    if (raw === "") return "";
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 퍼센트 포맷(입력값)
function formatPercentInput(value) {
    if (value === null || value === undefined) return "";
    var raw = String(value).replace(/[^\d]/g, "");
    if (raw === "") return "";
    return raw + "%";
}
