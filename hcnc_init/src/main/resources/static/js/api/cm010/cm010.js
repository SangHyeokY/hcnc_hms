/*****
 * 사용자 관리 - cm010.js (hcnc_hms)
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
        openUserWriteModal("insert");
    });

    $(".btn-edit").on("click", function () {
        openUserWriteModal("update");
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
        if (!table) {
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
        selectableRangeMode: "click",
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
                hozAlign: "center",
                headerSort: false,
                download: false
            },
            { title: "아이디", field: "user_id", hozAlign: "center", widthGrow: 1 },
            { title: "이름", field: "user_nm", widthGrow: 1 },
            { title: "이메일", field: "email", widthGrow: 1 },
            { title: "연락처", field: "tel", hozAlign: "center" },
            { title: "역할", field: "role_cd", hozAlign: "center" },
            { title: "부서", field: "dept_cd", hozAlign: "center" },
            { title: "직무", field: "job_cd", hozAlign: "center" },
            { title: "사용여부", field: "use_yn", hozAlign: "center", width: 90 }
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
            openUserViewModal(row.getData());
        }
    });
}

function loadUserTableData() {
    if (!userTable || typeof userTable.setData !== "function") {
        return;
    }

    $.ajax({
        url: "/cm010/list",
        type: "GET",
        data: {
            searchType: $("#searchType").val(),
            searchUseYn: $("#searchUseYn").val(),
            searchKeyword: $("#searchKeyword").val()
        },
        success: function (response) {
            userTable.setData(response.list || []);
        },
        error: function () {
            alert("사용자 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

function upsertUserBtn() {
    var userId = $.trim($("#write_user_id").val());
    var userNm = $.trim($("#write_user_nm").val());
    var pwdHash = $.trim($("#write_pwd_hash").val());
    var roleCd = $.trim($("#write_role_cd").val());

    if (!userId) {
        alert("아이디를 입력해주세요.");
        $("#write_user_id").focus();
        return;
    }

    if (!userNm) {
        alert("이름을 입력해주세요.");
        $("#write_user_nm").focus();
        return;
    }

    if (!roleCd) {
        alert("역할코드를 입력해주세요.");
        $("#write_role_cd").focus();
        return;
    }

    if (currentMode === "insert" && !pwdHash) {
        alert("비밀번호 해시를 입력해주세요.");
        $("#write_pwd_hash").focus();
        return;
    }

    $.ajax({
        url: "/cm010/save",
        type: "POST",
        data: {
            user_id: userId,
            user_nm: userNm,
            pwd_hash: pwdHash,
            email: $.trim($("#write_email").val()),
            tel: $.trim($("#write_tel").val()),
            role_cd: roleCd,
            dept_cd: $.trim($("#write_dept_cd").val()),
            job_cd: $.trim($("#write_job_cd").val()),
            lock_yn: $("#write_lock_yn").val(),
            use_yn: $("#write_use_yn").val(),
            remark: $.trim($("#write_remark").val())
        },
        success: function (response) {
            if (response.success) {
                closeUserWriteModal();
                loadUserTableData();
                alert("저장되었습니다.");
            } else {
                alert("저장에 실패했습니다.");
            }
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
            url: "/cm010/delete",
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

function openUserWriteModal(type) {
    currentMode = type;
    $(".edit-mode").text(type === "insert" ? "등록" : "수정");

    if (type === "insert") {
        $("#write_user_id").val("").prop("disabled", false);
        $("#write_user_nm").val("");
        $("#write_pwd_hash").val("");
        $("#write_email").val("");
        $("#write_tel").val("");
        $("#write_role_cd").val("");
        $("#write_dept_cd").val("");
        $("#write_job_cd").val("");
        $("#write_lock_yn").val("N");
        $("#write_use_yn").val("Y");
        $("#write_remark").val("");
    } else {
        var selectedRows = userTable.getSelectedRows();
        if (selectedRows.length === 0) {
            alert("수정할 사용자를 선택해주세요.");
            return;
        }
        if (selectedRows.length > 1) {
            alert("수정은 한 명만 선택해주세요.");
            return;
        }

        var rowData = selectedRows[0].getData();
        $("#write_user_id").val(rowData.user_id).prop("disabled", true);
        $("#write_user_nm").val(rowData.user_nm);
        $("#write_pwd_hash").val("");
        $("#write_email").val(rowData.email || "");
        $("#write_tel").val(rowData.tel || "");
        $("#write_role_cd").val(rowData.role_cd || "");
        $("#write_dept_cd").val(rowData.dept_cd || "");
        $("#write_job_cd").val(rowData.job_cd || "");
        $("#write_lock_yn").val(rowData.lock_yn || "N");
        $("#write_use_yn").val(rowData.use_yn || "Y");
        $("#write_remark").val(rowData.remark || "");
    }

    document.getElementById("write-user-area").style.display = "block";
}

function closeUserWriteModal() {
    document.getElementById("write-user-area").style.display = "none";
}

function openUserViewModal(rowData) {
    $("#view_user_id").text(rowData.user_id || "");
    $("#view_user_nm").text(rowData.user_nm || "");
    $("#view_email").text(rowData.email || "");
    $("#view_tel").text(rowData.tel || "");
    $("#view_dept_cd").text(rowData.dept_cd || "");
    $("#view_job_cd").text(rowData.job_cd || "");
    $("#view_role_cd").text(rowData.role_cd || "");
    $("#view_lock_yn").text(rowData.lock_yn || "");
    $("#view_remark").text(rowData.remark || "");

    document.getElementById("view-user-area").style.display = "block";
}

function closeUserViewModal() {
    document.getElementById("view-user-area").style.display = "none";
}
