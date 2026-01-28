/*****
 * 공통코드관리 - cm040.js (hcnc_hms)
 *  - tb_cd_mst 기준
 *  - 코드그룹/상세코드 관리
 */
var mainTable;
var detailTable;
var mainMode = "insert";
var detailMode = "insert";

$(document).ready(function () {
    buildTables();
    loadMainTableData();

    $(".btn-search").on("click", function (event) {
        event.preventDefault();
        loadMainTableData();
    });

    $(".btn-main-add").on("click", function () {
        openMainWriteModal("insert");
    });

    $(".btn-main-edit").on("click", function () {
        openMainWriteModal("update");
    });

    $(".btn-main-del").on("click", function () {
        deleteMainRows();
    });

    $(".btn-detail-add").on("click", function () {
        openDetailWriteModal("insert");
    });

    $(".btn-detail-edit").on("click", function () {
        openDetailWriteModal("update");
    });

    $(".btn-detail-del").on("click", function () {
        deleteDetailRows();
    });

    $(".btn-detail-sort-save").on("click", function () {
        if (!detailTable || typeof detailTable.getData !== "function") {
            alert("상세 테이블이 초기화되지 않았습니다.");
            return;
        }

        var rows = detailTable.getData();
        if (!rows.length) {
            alert("저장할 정렬 데이터가 없습니다.");
            return;
        }

        if (!confirm("현재 정렬순서를 저장 하시겠습니까?")) {
            return;
        }

        rows.forEach(function (rowData, index) {
            rowData.sort_no = index + 1;
        });
        applyDetailSort(rows);
        alert("정렬순서를 저장했습니다.");
    });

    $(".btn-main-save").on("click", function () {
        upsertMainBtn();
    });

    $(".btn-detail-save").on("click", function () {
        upsertDetailBtn();
    });
});

function buildTables() {
    if (!window.Tabulator) {
        console.error("Tabulator가 로드되지 않았습니다.");
        return;
    }

    if (!document.getElementById("TABLE_COMMON_MAIN")) {
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

    mainTable = new Tabulator("#TABLE_COMMON_MAIN", {
        layout: "fitColumns",
        headerSort: true,
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        selectable: 1,
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
            { title: "코드그룹", field: "grp_cd", hozAlign: "center", widthGrow: 1 },
            { title: "코드", field: "cd", hozAlign: "center", widthGrow: 1 },
            { title: "코드그룹명", field: "grp_nm", widthGrow: 1 },
            { title: "사용여부", field: "use_yn", hozAlign: "center", width: 100, widthGrow: 0 }
        ],
        data: [],
        rowSelected: function (row) {
            syncRowCheckbox(row, true);
        },
        rowDeselected: function (row) {
            syncRowCheckbox(row, false);
        },
        rowSelectionChanged: function (data) {
            syncTableCheckboxes(mainTable);
            if (data.length !== 0) {
                loadDetailTableData(data[0].cd);
            } else if (detailTable && typeof detailTable.clearData === "function") {
                detailTable.clearData();
            }
        }
    });

    detailTable = new Tabulator("#TABLE_COMMON_DETAIL", {
        layout: "fitColumns",
        headerSort: true,
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        selectable: true,
        movableRows: true,
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
            { title: "코드", field: "cd", hozAlign: "center" },
            { title: "코드명", field: "cd_nm", width: 150 },
            { title: "정렬순서", field: "sort_no", hozAlign: "center" },
            { title: "부가정보1", field: "adinfo_01" },
            { title: "부가정보2", field: "adinfo_02" },
            { title: "부가정보3", field: "adinfo_03" },
            { title: "부가정보4", field: "adinfo_04" },
            { title: "부가정보5", field: "adinfo_05" },
            { title: "사용여부", field: "use_yn", hozAlign: "center" }
        ],
        data: [],
        rowSelected: function (row) {
            syncRowCheckbox(row, true);
        },
        rowDeselected: function (row) {
            syncRowCheckbox(row, false);
        },
        rowSelectionChanged: function () {
            syncTableCheckboxes(detailTable);
        },
        rowMoved: function () {
            var rows = detailTable.getData();
            rows.forEach(function (rowData, index) {
                rowData.sort_no = index + 1;
            });
        }
    });
}

function loadMainTableData() {
    if (!mainTable || typeof mainTable.setData !== "function") {
        return;
    }

    var keyword = $.trim($("#searchKeyword").val());
    var useYn = $("#searchUseYn").val();

    $.ajax({
        url: "/cm040/main/list",
        type: "GET",
        data: {
            searchKeyword: keyword,
            searchUseYn: useYn
        },
        success: function (response) {
            mainTable.setData(response.list || []);
            if (detailTable && typeof detailTable.clearData === "function") {
                detailTable.clearData();
            }
        },
        error: function () {
            alert("코드그룹 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

function loadDetailTableData(grpCd) {
    if (!detailTable || typeof detailTable.setData !== "function") {
        return;
    }

    if (!grpCd) {
        detailTable.clearData();
        return;
    }

    $.ajax({
        url: "/cm040/detail/list",
        type: "GET",
        data: { grp_cd: grpCd },
        success: function (response) {
            detailTable.setData(response.list || []);
        },
        error: function () {
            alert("상세코드 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

function applyDetailSort(rows) {
    if (!rows.length) {
        return;
    }

    var pending = rows.length;
    rows.forEach(function (rowData) {
        $.ajax({
            url: "/cm040/detail/sort",
            type: "POST",
            data: {
                grp_cd: rowData.grp_cd,
                cd: rowData.cd,
                sort_no: rowData.sort_no
            },
            complete: function () {
                pending -= 1;
                if (pending === 0) {
                    loadDetailTableData(rowData.grp_cd);
                }
            }
        });
    });
}

function deleteMainRows() {
    var selectedRows = mainTable.getSelectedRows();
    if (selectedRows.length === 0) {
        alert("삭제할 코드그룹을 선택해주세요.");
        return;
    }

    if (!confirm("선택한 코드그룹을 삭제하시겠습니까?")) {
        return;
    }

    var pending = selectedRows.length;
    var allSucceeded = true;
    selectedRows.forEach(function (row) {
        var rowData = row.getData();
        $.ajax({
            url: "/cm040/main/delete",
            type: "POST",
            data: {
                grp_cd: rowData.grp_cd,
                cd: rowData.cd
            },
            success: function (response) {
                if (!response.success) {
                    allSucceeded = false;
                    alert(response.message || "삭제할 수 없습니다.");
                }
            },
            complete: function () {
                pending -= 1;
                if (pending === 0) {
                    loadMainTableData();
                    if (allSucceeded) {
                        alert("삭제되었습니다.");
                    }
                }
            },
            error: function () {
                allSucceeded = false;
                alert("코드그룹 삭제 중 오류가 발생했습니다.");
            }
        });
    });
}

function deleteDetailRows() {
    var selectedRows = detailTable.getSelectedRows();
    if (selectedRows.length === 0) {
        alert("삭제할 상세코드를 선택해주세요.");
        return;
    }

    if (!confirm("선택한 상세코드를 삭제하시겠습니까?")) {
        return;
    }

    var pending = selectedRows.length;
    var grpCd = selectedRows[0].getData().grp_cd;

    selectedRows.forEach(function (row) {
        $.ajax({
            url: "/cm040/detail/delete",
            type: "POST",
            data: {
                grp_cd: row.getData().grp_cd,
                cd: row.getData().cd
            },
            complete: function () {
                pending -= 1;
                if (pending === 0) {
                    loadDetailTableData(grpCd);
                    alert("삭제되었습니다.");
                }
            },
            error: function () {
                alert("상세코드 삭제 중 오류가 발생했습니다.");
            }
        });
    });
}

function upsertMainBtn() {
    var grpCd = $.trim($("#write_main_grp_cd").val());
    var grpNm = $.trim($("#write_main_grp_nm").val());
    var useYn = $("#write_main_use_yn").val();
    var code = $.trim($("#write_main_cd").val());

    if (!grpCd) {
        alert("코드그룹을 입력해주세요.");
        $("#write_main_grp_cd").focus();
        return;
    }

    if (!code) {
        alert("코드를 입력해주세요.");
        $("#write_main_cd").focus();
        return;
    }

    if (!grpNm) {
        alert("코드그룹명을 입력해주세요.");
        $("#write_main_grp_nm").focus();
        return;
    }

    $.ajax({
        url: "/cm040/main/save",
        type: "POST",
        data: {
            grp_cd: grpCd,
            cd: code,
            cd_nm: grpNm,
            use_yn: useYn
        },
        success: function (response) {
            if (response.success) {
                closeMainWriteModal();
                loadMainTableData();
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

function upsertDetailBtn() {
    var grpCd = $.trim($("#write_detail_grp_cd").val());
    var cd = $.trim($("#write_detail_cd").val());
    var cdNm = $.trim($("#write_detail_cd_nm").val());
    var sortNo = parseInt($("#write_detail_sort_no").val(), 10);

    if (!grpCd) {
        alert("코드그룹을 선택해주세요.");
        return;
    }

    if (detailMode !== "insert" && !cd) {
        alert("코드를 입력해주세요.");
        $("#write_detail_cd").focus();
        return;
    }

    if (!cdNm) {
        alert("코드명을 입력해주세요.");
        $("#write_detail_cd_nm").focus();
        return;
    }

    if (!sortNo || sortNo < 1) {
        alert("정렬순서를 입력해주세요.");
        $("#write_detail_sort_no").focus();
        return;
    }

    $.ajax({
        url: "/cm040/detail/save",
        type: "POST",
        data: {
            grp_cd: grpCd,
            cd: cd,
            cd_nm: cdNm,
            sort_no: sortNo,
            adinfo_01: $.trim($("#write_detail_adinfo_01").val()),
            adinfo_02: $.trim($("#write_detail_adinfo_02").val()),
            adinfo_03: $.trim($("#write_detail_adinfo_03").val()),
            adinfo_04: $.trim($("#write_detail_adinfo_04").val()),
            adinfo_05: $.trim($("#write_detail_adinfo_05").val()),
            use_yn: $("#write_detail_use_yn").val(),
            mode: detailMode
        },
        success: function (response) {
            if (response.success) {
                closeDetailWriteModal();
                loadDetailTableData(grpCd);
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

function openMainWriteModal(type) {
    mainMode = type;
    $("#main-type").text(type === "insert" ? "등록" : "수정");

    if (type === "insert") {
        $("#write_main_grp_cd").val("").prop("disabled", false);
        $("#write_main_grp_nm").val("");
        $("#write_main_use_yn").val("Y");
        $("#write_main_parent_grp_cd").val("");
        $("#write_main_cd").val("").prop("disabled", false);
    } else {
        var selectedRows = mainTable.getSelectedRows();
        if (selectedRows.length === 0) {
            alert("수정할 코드그룹을 선택해주세요.");
            return;
        }
        if (selectedRows.length > 1) {
            alert("수정은 한 개만 선택해주세요.");
            return;
        }

        var rowData = selectedRows[0].getData();
        $("#write_main_grp_cd").val(rowData.grp_cd).prop("disabled", true);
        $("#write_main_grp_nm").val(rowData.grp_nm);
        $("#write_main_use_yn").val(rowData.use_yn);
        $("#write_main_parent_grp_cd").val(rowData.parent_grp_cd || rowData.grp_cd);
        $("#write_main_cd").val(rowData.cd).prop("disabled", true);
    }

    $("#write-main-area").show();
}

function closeMainWriteModal() {
    $("#write-main-area").hide();
}

function openDetailWriteModal(type) {
    detailMode = type;
    $("#detail-type").text(type === "insert" ? "등록" : "수정");

    if (!detailTable || typeof detailTable.getData !== "function") {
        alert("상세 테이블이 초기화되지 않았습니다.");
        return;
    }

    if (type === "insert") {
        if (!mainTable || typeof mainTable.getSelectedRows !== "function") {
            alert("코드그룹 테이블이 초기화되지 않았습니다.");
            return;
        }

        var selectedMain = mainTable.getSelectedRows();
        if (selectedMain.length === 0) {
            alert("코드그룹을 먼저 선택해주세요.");
            return;
        }

        var mainData = selectedMain[0].getData();
        $("#write_detail_grp_cd").val(mainData.cd);
        $("#write_detail_cd").val("").prop("disabled", true).attr("placeholder", "자동");
        $("#write_detail_cd_nm").val("");

        var maxSort = detailTable.getData()
            .reduce(function (acc, item) { return Math.max(acc, item.sort_no || 0); }, 0);
        $("#write_detail_sort_no").val(maxSort + 1);
        $("#write_detail_adinfo_01").val("");
        $("#write_detail_adinfo_02").val("");
        $("#write_detail_adinfo_03").val("");
        $("#write_detail_adinfo_04").val("");
        $("#write_detail_adinfo_05").val("");
        $("#write_detail_use_yn").val("Y");
    } else {
        var selectedDetail = detailTable.getSelectedRows();
        if (selectedDetail.length === 0) {
            alert("수정할 상세코드를 선택해주세요.");
            return;
        }
        if (selectedDetail.length > 1) {
            alert("수정은 한 개만 선택해주세요.");
            return;
        }

        var rowData = selectedDetail[0].getData();
        $("#write_detail_grp_cd").val(rowData.grp_cd);
        $("#write_detail_cd").val(rowData.cd).prop("disabled", true).attr("placeholder", "");
        $("#write_detail_cd_nm").val(rowData.cd_nm);
        $("#write_detail_sort_no").val(rowData.sort_no);
        $("#write_detail_adinfo_01").val(rowData.adinfo_01 || "");
        $("#write_detail_adinfo_02").val(rowData.adinfo_02 || "");
        $("#write_detail_adinfo_03").val(rowData.adinfo_03 || "");
        $("#write_detail_adinfo_04").val(rowData.adinfo_04 || "");
        $("#write_detail_adinfo_05").val(rowData.adinfo_05 || "");
        $("#write_detail_use_yn").val(rowData.use_yn);
    }

    $("#write-detail-area").show();
}

function closeDetailWriteModal() {
    $("#write-detail-area").hide();
}
