/********************************************************
 * 공통코드관리 - cm040.js (hcnc_hms)
 *  - tb_cd_mst 기준
 *  - 코드그룹(MAIN) / 상세코드(DETAIL) 관리
 ********************************************************/

/* =====================================================
 * 전역 변수
 * ===================================================== */
var mainTable;
var detailTable;

var mainMode = "insert";
var detailMode = "insert";

var currentDetailGrpCd = ""; // DETAIL formatter에서 사용
var amountSuffixGroupCds = ["job_cd"];
var pointSuffixGroupCds  = ["rank", "grade", "grd_cd", "grade_cd"];


/* =====================================================
 * 초기화
 * ===================================================== */
$(document).ready(function () {
    buildTables();
    loadMainTableData();

    /* 검색 */
    $(".btn-search").on("click", function (e) {
        e.preventDefault();
        loadMainTableData();
    });

    /* MAIN 버튼 */
    $(".btn-main-add").on("click", () => openMainWriteModal("insert"));
    $(".btn-main-edit").on("click", () => openMainWriteModal("update"));
    $(".btn-main-del").on("click", deleteMainRows);
    $(".btn-main-save").on("click", upsertMainBtn);

    /* DETAIL 버튼 */
    $(".btn-detail-add").on("click", () => openDetailWriteModal("insert"));
    $(".btn-detail-edit").on("click", () => openDetailWriteModal("update"));
    $(".btn-detail-del").on("click", deleteDetailRows);
    $(".btn-detail-save").on("click", upsertDetailBtn);

    /* DETAIL 정렬 저장 */
    $(".btn-detail-sort-save").on("click", saveDetailSort);
});


/* =====================================================
 * 테이블 생성
 * ===================================================== */
function buildTables() {
    if (!window.Tabulator) return;
    if (!document.getElementById("TABLE_COMMON_MAIN")) return;

    function toggleRowSelection(row) {
        row.isSelected() ? row.deselect() : row.select();
    }

    function syncRowCheckbox(row, checked) {
        const el = row.getElement();
        const chk = el && el.querySelector(".row-check");
        if (chk) chk.checked = checked;
    }

    function syncTableCheckboxes(table) {
        if (!table || typeof table.getRows !== "function") return;
        table.getRows().forEach(r => syncRowCheckbox(r, r.isSelected()));
    }

    /* =========================
     * MAIN TABLE (코드그룹)
     * ========================= */
    mainTable = new Tabulator("#TABLE_COMMON_MAIN", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        selectable: 1,
        columnDefaults: {
            resizable: true,
            cellClick: (e, cell) => {
                toggleRowSelection(cell.getRow());
                e.stopPropagation();
            }
        },
        columns: [
            {
                title: "",
                formatter: c =>
                    `<input type="checkbox" class="row-check"${c.getRow().isSelected() ? " checked" : ""}>`,
                width: 50,
                hozAlign: "center",
                headerSort: false,
                cellClick: (e, c) => {
                    toggleRowSelection(c.getRow());
                    e.preventDefault();
                }
            },
            { title: "코드그룹", field: "grp_cd", hozAlign: "center" },
            { title: "코드", field: "cd", hozAlign: "center" },
            { title: "코드그룹명", field: "grp_nm" },
            { title: "사용여부", field: "use_yn", hozAlign: "center", width: 90 }
        ],
        rowSelected: r => syncRowCheckbox(r, true),
        rowDeselected: r => syncRowCheckbox(r, false),
        rowSelectionChanged: function (data) {
            if (!mainTable) return;

            syncTableCheckboxes(mainTable);

            if (data.length) {
                loadDetailTableData(data[0].cd);
            } else {
                currentDetailGrpCd = "";
                if (detailTable) detailTable.clearData();
            }
        }
    });

    /* =========================
     * DETAIL TABLE (상세코드)
     * ========================= */
    detailTable = new Tabulator("#TABLE_COMMON_DETAIL", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        selectable: true,
        movableRows: true,
        columnDefaults: {
            resizable: true,
            cellClick: (e, cell) => {
                toggleRowSelection(cell.getRow());
                e.stopPropagation();
            }
        },
        columns: [
            {
                title: "",
                formatter: c =>
                    `<input type="checkbox" class="row-check"${c.getRow().isSelected() ? " checked" : ""}>`,
                width: 50,
                hozAlign: "center",
                headerSort: false,
                cellClick: (e, c) => {
                    toggleRowSelection(c.getRow());
                    e.preventDefault();
                }
            },
            { title: "코드", field: "cd", hozAlign: "center", width: 90 },
            { title: "코드명", field: "cd_nm", width: 150 },
            { title: "정렬순서", field: "sort_no", hozAlign: "center", width: 90 },
            { title: "부가정보1", field: "adinfo_01", formatter: amountFormatter },
            { title: "부가정보2", field: "adinfo_02", formatter: amountFormatter },
            { title: "부가정보3", field: "adinfo_03", formatter: amountFormatter },
            { title: "부가정보4", field: "adinfo_04", formatter: amountFormatter },
            { title: "부가정보5", field: "adinfo_05", formatter: amountFormatter },
            { title: "사용여부", field: "use_yn", hozAlign: "center" }
        ],
        rowSelected: r => syncRowCheckbox(r, true),
        rowDeselected: r => syncRowCheckbox(r, false),
        rowMoved: () => {
            detailTable.getData().forEach((d, i) => d.sort_no = i + 1);
        }
    });
}


/* =====================================================
 * 공통 유틸
 * ===================================================== */
function amountFormatter(cell) {
    const v = cell.getValue();
    if (v == null || v === "") return "";

    const n = String(v).replace(/,/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(n)) return v;

    const f = Number(n).toLocaleString("ko-KR");
    if (amountSuffixGroupCds.includes(currentDetailGrpCd)) return f + "원";
    if (pointSuffixGroupCds.includes(currentDetailGrpCd)) return f + "점";
    return f;
}

function getSearchUseYnValue() {
    return $("input[name='searchUseYnRadio']:checked").val()
        || $("#searchUseYn").val();
}


/* =====================================================
 * MAIN (코드그룹)
 * ===================================================== */
function loadMainTableData() {
	if (!mainTable || typeof mainTable.setData !== "function") {
        return;
    }

    var keyword = $.trim($("#searchKeyword").val());
    var useYn = getSearchUseYnValue();

    showLoading(); // 로딩바 표시

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
                currentDetailGrpCd = "";
                detailTable.clearData();
            }
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: `'코드그룹' 데이터를 불러오는 중 오류가 발생했습니다.`
            });
        },
        complete: function () {
            hideLoading();
        }
    });
}
async function deleteMainRows() {
	const selectedRows = mainTable.getSelectedRows();

    if (selectedRows.length === 0) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'info',
            title: '알림',
            text: `삭제할 '코드그룹'을 선택해주세요.`
        });
        return;
    }

    // 선택된 첫 번째 행의 이름 가져오기
    var firstRowData = selectedRows[0].getData();

    const firstResult = await showAlert({  // 알림(info), 경고(warning), 오류(error), 완료(success)
        icon: 'warning',
        title: '경고',
        text: `선택한 '${firstRowData.grp_cd} (${firstRowData.grp_nm})' 코드그룹을 삭제하시겠습니까?`,
        showCancelButton: true,
        cancelButtonText: '취소',
        cancelButtonColor: '#212E41'
    });
    if (!firstResult.isConfirmed) return;

    const secondResult = await showAlert({
        icon: 'warning',
        title: '경고',
        text: `다시 확인 버튼을 누르시면 '${firstRowData.grp_cd} (${firstRowData.grp_nm})'의 데이터가 삭제되며, 되돌릴 수 없습니다.`,
        showCancelButton: true,
        cancelButtonText: '취소',
        cancelButtonColor: '#212E41'
    });
    if (!secondResult.isConfirmed) return;

    showLoading();

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
                    showAlert({
                        icon: 'error',
                        title: '오류',
                        text: response.message || '삭제할 수 없습니다.'
                    });
                }
            },
            complete: function () {
                pending -= 1;
                if (pending === 0) {
                    hideLoading();
                    loadMainTableData();
                    if (allSucceeded) {
                        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                            icon: 'success',
                            title: '완료',
                            text: '삭제되었습니다.'
                        });
                    }
                }
            },
            error: function () {
                hideLoading();
                allSucceeded = false;
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: `'코드그룹' 삭제 중 오류가 발생했습니다.`
                });
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
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드그룹'을 입력해주세요.`
        });
        $("#write_main_grp_cd").focus();
        return;
    }

    if (!code) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드'를 입력해주세요.`
        });
        $("#write_main_cd").focus();
        return;
    }

    if (!grpNm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드그룹명'을 입력해주세요.`
        });
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
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'success',
                    title: '완료',
                    text: '저장되었습니다.'
                });
            } else {
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: '저장에 실패했습니다.'
                });
            }
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: '저장 중 오류가 발생했습니다.'
            });
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
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                text: `수정할 '코드그룹'을 선택해주세요.`
            });
            return;
        }
        if (selectedRows.length > 1) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                text: '수정은 한 개만 선택해주세요.'
            });
            return;
        }

        var rowData = selectedRows[0].getData();
        $("#write_main_grp_cd").val(rowData.grp_cd).prop("disabled", true);
        $("#write_main_grp_nm").val(rowData.grp_nm);
        $("#write_main_use_yn").val(rowData.use_yn);
        $("#write_main_parent_grp_cd").val(rowData.parent_grp_cd || rowData.grp_cd);
        $("#write_main_cd").val(rowData.cd).prop("disabled", true);
    }

    const $modal = $("#write-main-area");
    $modal.show();
    setTimeout(() => {
        $("#write-main-area").addClass("show");
    }, 100);
}
function closeMainWriteModal() {
	const modal = document.getElementById("write-main-area");
    modal.classList.remove("show");
    setTimeout(() => {
        modal.style.display = "none";
    }, 250);
}


/* =====================================================
 * DETAIL (상세코드)
 * ===================================================== */
function loadDetailTableData(grpCd) {
	if (!detailTable || typeof detailTable.setData !== "function") {
        return;
    }

    if (!grpCd) {
        currentDetailGrpCd = "";
        detailTable.clearData();
        return;
    }
    currentDetailGrpCd = String(grpCd).toLowerCase();

     showLoading();

    $.ajax({
        url: "/cm040/detail/list",
        type: "GET",
        data: { grp_cd: grpCd },
        success: function (response) {
            detailTable.setData(response.list || []);
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: `'상세코드' 데이터를 불러오는 중 오류가 발생했습니다.`
            });
        },
        complete: function () {
            hideLoading();
        }
    });
}
async function deleteDetailRows() {
	const selectedRows = detailTable.getSelectedRows();

    if (selectedRows.length === 0) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'info',
            title: '알림',
            text: `삭제할 '상세코드'를 선택해주세요.`
        });
        return;
    }

    const firstRow = selectedRows[0].getData();

     const firstResult = await showAlert({
        icon: 'warning',
        title: '경고',
        text: `선택한 '${firstRow.cd} (${firstRow.cd_nm})' 상세코드를 삭제하시겠습니까?`,
        showCancelButton: true,
        confirmText: '삭제',
        cancelText: '취소'
     });

    if (!firstResult.isConfirmed) return;

    const secondResult = await showAlert({
        icon: 'warning',
        title: '경고',
        text: `다시 확인 버튼을 누르시면 '${firstRow.cd} (${firstRow.cd_nm})'의 데이터가 삭제되며, 되돌릴 수 없습니다.`,
        showCancelButton: true,
        confirmText: '삭제',
        cancelText: '취소'
    });

    if (!secondResult.isConfirmed) return;

    showLoading();

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
                    hideLoading();
                    loadDetailTableData(grpCd);
                    showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                        icon: 'success',
                        title: '완료',
                        text: '삭제되었습니다.'
                    });
                }
            },
            error: function () {
                hideLoading();
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: `'상세코드' 삭제 중 오류가 발생했습니다.`
                });
            }
        });
    });
}
function applyDetailSort(rows) {
	if (!rows.length) return;

    let pending = rows.length;
    const grpCd = rows[0].grp_cd;

    rows.forEach(rowData => {
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
                    hideLoading();
                    loadDetailTableData(grpCd);

                    showAlert({
                        icon: 'success',
                        title: '완료',
                        text: '정렬순서가 저장되었습니다.'
                    });
                }
            }
        });
    });
}
function upsertDetailBtn() {
	var grpCd = $.trim($("#write_detail_grp_cd").val());
    var cd = $.trim($("#write_detail_cd").val());
    var preCd = $.trim($("#write_detail_cd_origin").val());
    var cdNm = $.trim($("#write_detail_cd_nm").val());
    var sortNo = parseInt($("#write_detail_sort_no").val(), 10);

    if (!grpCd) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드그룹'을 선택해주세요.`
        });
        return;
    }

    if (detailMode !== "insert" && !cd) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드'를 입력해주세요.`
        });
        $("#write_detail_cd").focus();
        return;
    }

    if (!cdNm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'코드명'을 입력해주세요.`
        });
        $("#write_detail_cd_nm").focus();
        return;
    }

    if (!sortNo || sortNo < 1) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'정렬순서'를 입력해주세요.`
        });
        $("#write_detail_sort_no").focus();
        return;
    }

    if (detailMode === "update" && !preCd) {
        preCd = cd;
    }

    $.ajax({
        url: "/cm040/detail/save",
        type: "POST",
        data: {
            grp_cd: grpCd,
            cd: cd,
            pre_cd: preCd,
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
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'success',
                    title: '완료',
                    text: '저장되었습니다.'
                });
            } else {
                showAlert({
                    icon: 'error',
                    title: '오류',
                    text: response.message || '저장에 실패했습니다.'
                });
            }
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: '저장 중 오류가 발생했습니다.'
            });
        }
    });
}
function openDetailWriteModal(type) {
	detailMode = type;
    $("#detail-type").text(type === "insert" ? "등록" : "수정");

    if (!detailTable || typeof detailTable.getData !== "function") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            text: `'상세 테이블'이 초기화되지 않았습니다.`
        });
        return;
    }

    if (type === "insert") {
        if (!mainTable || typeof mainTable.getSelectedRows !== "function") {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'warning',
                title: '경고',
                text: `'코드그룹 테이블'이 초기화되지 않았습니다.`
            });
            return;
        }

        var selectedMain = mainTable.getSelectedRows();
        if (selectedMain.length === 0) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'warning',
                title: '경고',
                text: `'코드그룹'을 먼저 선택해주세요.`
            });
            return;
        }

        var mainData = selectedMain[0].getData();
        $("#write_detail_grp_cd").val(mainData.cd);
        $("#write_detail_cd").val("");
        $("#write_detail_cd_origin").val("");
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
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                text: `수정할 '상세코드'를 선택해주세요.`
            });
            return;
        }
        if (selectedDetail.length > 1) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                text: '수정은 한 개만 선택해주세요.'
            });
            return;
        }

        var rowData = selectedDetail[0].getData();
        $("#write_detail_grp_cd").val(rowData.grp_cd);
        $("#write_detail_cd").val(rowData.cd);
        $("#write_detail_cd_origin").val(rowData.cd);
        $("#write_detail_cd_nm").val(rowData.cd_nm);
        $("#write_detail_sort_no").val(rowData.sort_no);
        $("#write_detail_adinfo_01").val(rowData.adinfo_01 || "");
        $("#write_detail_adinfo_02").val(rowData.adinfo_02 || "");
        $("#write_detail_adinfo_03").val(rowData.adinfo_03 || "");
        $("#write_detail_adinfo_04").val(rowData.adinfo_04 || "");
        $("#write_detail_adinfo_05").val(rowData.adinfo_05 || "");
        $("#write_detail_use_yn").val(rowData.use_yn);
    }
    const $modal = $("#write-detail-area");
    $modal.show();
    setTimeout(() => {
        $("#write-detail-area").addClass("show");
    }, 100);
}
function closeDetailWriteModal() {
	const modal = document.getElementById("write-detail-area");
    modal.classList.remove("show");
    setTimeout(() => {
        modal.style.display = "none";
    }, 250);
}


/* =====================================================
 * DETAIL 정렬 저장 버튼
 * ===================================================== */
async function saveDetailSort() {
    if (!detailTable) return;

    const rows = detailTable.getData();
    if (!rows.length) {
        showAlert({ icon: "warning", title: "경고", text: "저장할 정렬 데이터가 없습니다." });
        return;
    }

    const result = await showAlert({
        icon: "info",
        title: "알림",
        text: "현재 정렬순서를 저장하시겠습니까?",
        showCancelButton: true,
        confirmText: "저장",
        cancelText: "취소"
    });

    if (!result.isConfirmed) return;

    showLoading();
    rows.forEach((r, i) => r.sort_no = i + 1);
    applyDetailSort(rows);
}
