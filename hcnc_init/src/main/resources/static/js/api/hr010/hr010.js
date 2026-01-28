/*****
 * 사용자 관리 - hr010.js (hcnc_hms)
 */
var userTable;
var currentMode = "insert";

$(document).ready(function () {
    buildUserTable();
    loadUserTableData();

    $(".btn-search").on("click", function (event) {
        event.preventDefault();
        loadUserTableData();
    });

    $("#searchKeyword").on("keyup", function (event) {
        if (event.key === "Enter") {
            loadUserTableData();
        }
    });

    $(".btn-new").on("click", function () {
        openUserModal("insert");
    });

    $(".btn-edit").on("click", function () {
        openUserModal("update");
    });

    $(".btn-delete").on("click", function () {
        deleteUserRows();
    });

    $(".btn-user-save").on("click", function () {
        upsertUserBtn();
    });
});

function buildUserTable() {
    if (!window.Tabulator) {
        console.error("Tabulator가 로드되지 않았습니다.");
        return;
    }

    if (!document.getElementById("TABLE_USER")) {
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

    userTable = new Tabulator("#TABLE_USER", {
        layout: "fitColumns",
        headerSort: true,
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        selectable: true,
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
            { title: "희망단가", field: "hope_rate_amt", hozAlign: "right" },
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
            openUserModal("view", row.getData());
        }
    });
}

function loadUserTableData() {
    if (!userTable || typeof userTable.setData !== "function") {
        return;
    }

    $.ajax({
        url: "/hr010/list",
        type: "GET",
        data: {
            dev_nm: $("#insertNM").val(),
            searchKeyword: $("#searchKeyword").val()
        },
      success: function (response) {
          userTable.setData(response.res || []);
      },
        error: function () {
            alert("사용자 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

function upsertUserBtn() {
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
        hope_rate_amt: $("#hope_rate_amt").val(),
        avail_dt: $("#avail_dt").val(),
        ctrt_typ: $("#ctrt_typ").val(),
        work_md: $("#work_md").val(),
        cert_txt: $("#cert_txt").val(),
        dev_type: $("#dev_type").val(),
        crt_by: ""
    };

    $.ajax({
        url: "/hr010/upsert"
        type: "POST",
        data: payload,
        success: function () {
            alert("저장되었습니다.");
            closeUserViewModal();
            loadUserTableData();
        },
        error: function () {
            alert("저장 중 오류가 발생했습니다.");
        }
    });
}

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
            data: { user_id: row.getData().user_id },
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

function openUserModal(mode, data) {
    currentMode = mode;

    if (mode === "insert") {
        clearUserForm();
    }
    else if (mode === "update" || mode === "view") {
        if (!data) {
            var rows = userTable.getSelectedRows();
            if (rows.length !== 1) {
                alert("한 명만 선택해주세요.");
                return;
            }
            data = rows[0].getData();
        }
        fillUserForm(data);
    }

    setModalMode(mode);
    $("#view-user-area").show();
}

//function closeUserWriteModal() {
//    document.getElementById("write-user-area").style.display = "none";
//}

function openUserViewModal(d) {
    $("#dev_nm").val(d.dev_nm || "");       // 성명
    $("#brdt").val(d.brdt || "");           // 생년월일
    $("#tel").val(d.tel || "");             // 연락처
    $("#email").val(d.email || "");         // 이메일
    $("#region").val(d.region || "");       // 거주지역
    $("#main_lang").val(d.main_lang || ""); // 주 개발언어
    $("#exp_yr").val(d.exp_yr || "");       // 경력연차
    $("#edu_last").val(d.edu_last || "");   // 최종학력
    $("#cert_txt").val(d.cert_txt || "");   // 보유 자격증
    $("#avail_dt").val(d.avail_dt || "");   // 투입가능시점
    $("#work_md").val(d.work_md || "");    // 근무형태
    $("#ctrt_typ").val(d.ctrt_typ || "");   // 계약형태
    $("#hope_rate_amt").val(d.hope_rate_amt || "");   // 희망단가

    setModalMode("view");
    $("#view-user-area").show();
}


function fillUserForm(d) {
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
    $("#hope_rate_amt").val(d.hope_rate_amt || "");

    $("#dev_type").val(d.dev_type || "");
    $("#work_md").val(d.work_md || "");
    $("#ctrt_typ").val(d.ctrt_typ || "");

    if (d.dev_id) {
        if (d.dev_id.startsWith("HCNC_F")) {
            $("#dev_type").val("HCNC_F");
        } else if (d.dev_id.startsWith("HCNC_S")) {
            $("#dev_type").val("HCNC_S");
        } else {
            console.log("dev_id 값이 잘못 되었습니다.")
            $("#dev_type").val("");
        }
    } else {
        console.log("dev_id 값이 존재하지 않습니다.")
        $("#dev_type").val("");
    }
}

function clearUserForm() {
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
}

function closeUserViewModal() {
    document.getElementById("view-user-area").style.display = "none";
}