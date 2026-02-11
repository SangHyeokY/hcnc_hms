/*****
 * 사용자 관리 - cm010.js (hcnc_hms)
 */
var userTable;
var currentMode = "insert";

// API 경로를 한곳에서 관리해 변경 시 수정 범위를 줄인다.
var API_ENDPOINTS = {
    list: "/cm010/list",
    save: "/cm010/save",
    codeList: "/cm010/cdList",
    delete: "/cm010/delete"
};

// 모달 애니메이션 전환 타이밍
var MODAL_TIMINGS = {
    showDelayMs: 100,
    hideDelayMs: 250
};

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

    // ESC 누르면 모달 닫힘
    $(document).on("keydown", function (event) {
        if (event.key === "Escape") {
            if ($("#write-user-area").hasClass("show")) {
                closeUserWriteModal();
            }
            else if ($("#view-user-area").hasClass("show")) {
                closeUserViewModal();
            }
        }
    });

    $(".btn-main-add").on("click", function () {
        openUserWriteModal("insert");
    });

    $(".btn-main-edit").on("click", function () {
        openUserWriteModal("update");
    });

    $(".btn-main-del").on("click", function () {
        deleteUserRows();
    });

    $("#btn-user-save").on("click", function () {
        upsertUserBtn();
    });
});

function showModalWithTransition(modal) {
    if (!modal) {
        return;
    }

    modal.classList.remove("show");
    modal.style.display = "block";
    modal.offsetHeight;
    setTimeout(function () {
        modal.classList.add("show");
    }, MODAL_TIMINGS.showDelayMs);
}

function hideModalWithTransition(modal) {
    if (!modal) {
        return;
    }

    modal.classList.remove("show");
    setTimeout(function () {
        modal.style.display = "none";
    }, MODAL_TIMINGS.hideDelayMs);
}

function toActivationYn(lockYn) {
    // lock_yn: N(미잠금)=활성 Y, Y(잠금)=활성 N
    if (lockYn === "N") return "Y";
    if (lockYn === "Y") return "N";
    return "";
}

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
        // Tabulator 선택 상태와 커스텀 체크박스 표시를 동기화한다.
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
            { title: "ID", field: "user_id", hozAlign: "center", widthGrow: 1 },
            { title: "이름", field: "user_nm", widthGrow: 1 },
            { title: "e-mail", field: "email", widthGrow: 2 },
            { title: "연락처", field: "tel", hozAlign: "center", widthGrow: 2 },
            { title: "권한", field: "role_nm", hozAlign: "center", widthGrow: 1 },
            { title: "직무", field: "job_nm", hozAlign: "center", widthGrow: 1 },
            { title: "부서", field: "dept_nm", hozAlign: "center", widthGrow: 1 },
            { title: "사용여부", field: "use_yn", hozAlign: "center", widthGrow: 1 },
            {
                title: "활성화 여부",
                field: "lock_yn",
                hozAlign: "center",
                formatter: function (cell) {
                    return toActivationYn(cell.getValue());
                },
                widthGrow: 1
            },
            { title: "비고", field: "remark", hozAlign: "center", widthGrow: 3 }
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
        // rowDblClick: function (e, row) {
        //     openUserViewModal(row.getData());
        // }
    });
}

function getSearchUseYnValue() {
    var $checked = $("input[name='searchUseYnRadio']:checked");
    if ($checked.length > 0) {
        return $checked.val();
    }
    return $("#searchUseYn").val();
}

// 사용자 목록 조회
function loadUserTableData() {
    if (!userTable || typeof userTable.setData !== "function") {
        return;
    }

    showLoading();

    $.ajax({
        url: API_ENDPOINTS.list,
        type: "GET",
        data: {
            searchType: $("#searchType").val(),
            searchUseYn: getSearchUseYnValue(),
            searchKeyword: $("#searchKeyword").val()
        },
        success: function (response) {
            userTable.setData(response.list || []);
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: "error",
                title: "오류",
                text: "사용자 데이터를 불러오는 중 오류가 발생했습니다."
            });
        },
        complete: function () {
            hideLoading();
        }
    });
}

// 사용자 신규/수정 저장
function upsertUserBtn() {
    var userId = $.trim($("#write_user_id").val());
    var userNm = $.trim($("#write_user_nm").val());
    var pwdHash = $.trim($("#write_pwd_hash").val());
    var roleCd = $.trim($("#write_role_cd").val());

    if (!userId) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: "warning",
            title: "경고",
            text: "'아이디'를 입력해주세요."
        });
        $("#write_user_id").focus();
        return;
    }

    if (!userNm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: "warning",
            title: "경고",
            text: "'이름'을 입력해주세요."
        });
        $("#write_user_nm").focus();
        return;
    }

    if (!roleCd) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: "warning",
            title: "경고",
            text: "'역할'을 선택해주세요."
        });
        $("#write_role_cd").focus();
        return;
    }

    if (currentMode === "insert" && !pwdHash) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: "warning",
            title: "경고",
            text: "'비밀번호'를 입력해주세요."
        });
        $("#write_pwd_hash").focus();
        return;
    }

    showLoading();

    $.ajax({
        url: API_ENDPOINTS.save,
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
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: "success",
                    title: "완료",
                    text: "저장되었습니다."
                });
            } else {
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: "error",
                    title: "오류",
                    text: "저장에 실패했습니다."
                });
            }
        },
        error: function () {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: "error",
                title: "오류",
                text: "저장 중 오류가 발생했습니다."
            });
        },
        complete: function () {
            hideLoading();
        }
    });
}

// 공통코드(권한/직무/부서) 콤보 조회
function selectCommonCodesForUser(done) {
    $.ajax({
        url: API_ENDPOINTS.codeList,
        type: "GET",
        success: function (response) {
            var list = response.list || [];
            var grouped = { role_cd: [], job_cd: [], dept_cd: [] };

            // grp_cd 기준으로 필요한 콤보 데이터를 한 번에 분류한다.
            list.forEach(function (item) {
                if (grouped[item.grp_cd]) {
                    grouped[item.grp_cd].push(item);
                }
            });

            fillSelect("#write_role_cd", grouped.role_cd);
            fillSelect("#write_job_cd", grouped.job_cd);
            fillSelect("#write_dept_cd", grouped.dept_cd);

            if (typeof done === "function") {
                done();
            }
        },
        error: function () {
            fillSelect("#write_role_cd", []);
            fillSelect("#write_job_cd", []);
            fillSelect("#write_dept_cd", []);
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: "error",
                title: "오류",
                text: "'공통코드' 조회 중 오류가 발생했습니다."
            });
            // 코드 조회 실패여도 모달 오픈 흐름은 끊지 않는다.
            if (typeof done === "function") {
                done();
            }
        }
    });
}

// 공통 콤보 옵션 렌더링
function fillSelect(selector, list) {
    var $sel = $(selector);
    $sel.empty();
    $sel.append("<option value=''>선택</option>");

    list.forEach(function (item) {
        $sel.append("<option value='" + item.cd + "'>" + item.cd_nm + "</option>");
    });
}

// 사용자 삭제 처리
async function deleteUserRows() {
    const selectedRows = userTable.getSelectedRows();

    if (selectedRows.length === 0) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: "info",
            title: "알림",
            text: "삭제할 사용자를 선택해주세요."
        });
        return;
    }

    const result = await showAlert({
        icon: "warning",
        title: "경고",
        text: "선택한 사용자를 삭제하시겠습니까?",
        showCancelButton: true,
        cancelButtonText: "취소",
        cancelButtonColor: "#212E41"
    });

    if (!result.isConfirmed) {
        return;
    }

    showLoading();

    // 다건 삭제 완료 시점을 맞추기 위한 카운터와 성공 여부 플래그
    var pending = selectedRows.length;
    var allSucceeded = true;

    selectedRows.forEach(function (row) {
        $.ajax({
            url: API_ENDPOINTS.delete,
            type: "POST",
            data: { user_id: row.getData().user_id },
            success: function (response) {
                // 서버가 명시적으로 실패를 반환하면 성공 플래그를 내린다.
                if (response && response.success === false) {
                    allSucceeded = false;
                }
            },
            complete: function () {
                // 마지막 complete에서만 로딩 종료/재조회/완료 알림을 처리한다.
                pending -= 1;
                if (pending === 0) {
                    hideLoading();
                    loadUserTableData();
                    if (allSucceeded) {
                        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                            icon: "success",
                            title: "완료",
                            text: "삭제되었습니다."
                        });
                    }
                }
            },
            error: function () {
                allSucceeded = false;
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: "error",
                    title: "오류",
                    text: "삭제 중 오류가 발생했습니다."
                });
            }
        });
    });
}

// 사용자 등록/수정 모달 오픈
function openUserWriteModal(type) {
    currentMode = type;
    $(".edit-mode").text(type === "insert" ? "등록" : "수정");
    const modal = document.getElementById("write-user-area");

    if (type === "insert") {
        // 등록 모드: 공통코드 로딩 완료 후 폼을 기본값으로 초기화한다.
        selectCommonCodesForUser(function () {
            showModalWithTransition(modal);
            $("#write_user_id").val("").prop("disabled", false);
            $("#write_user_nm").val("");
            $("#write_pwd_hash").val("");
            $("#write_email").val("");
            $("#write_tel").val("");
            $("#write_use_yn").val("Y");
            $("#write_lock_yn").val("N");
            $("#write_remark").val("");
        });
        return;
    }

    var selectedRows = userTable.getSelectedRows();
    if (selectedRows.length === 0) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: "info",
            title: "알림",
            text: "수정할 사용자를 선택해주세요."
        });
        return;
    }
    if (selectedRows.length > 1) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: "info",
            title: "알림",
            text: "수정은 한 명만 선택해주세요."
        });
        return;
    }

    // 수정 모드: 공통코드 옵션 로딩 후 선택 사용자 값을 바인딩한다.
    selectCommonCodesForUser(function () {
        showModalWithTransition(modal);
        var rowData = selectedRows[0].getData();
        $("#write_user_id").val(rowData.user_id).prop("disabled", true);
        $("#write_user_nm").val(rowData.user_nm);
        $("#write_pwd_hash").val("");
        $("#write_email").val(rowData.email || "");
        $("#write_tel").val(rowData.tel || "");
        $("#write_role_cd").val(rowData.role_cd || "");
        $("#write_job_cd").val(rowData.job_cd || "");
        $("#write_dept_cd").val(rowData.dept_cd || "");
        $("#write_use_yn").val(rowData.use_yn);
        $("#write_lock_yn").val(rowData.lock_yn);
        $("#write_remark").val(rowData.remark || "");
    });
}

// 사용자 등록/수정 모달 닫기
function closeUserWriteModal() {
    const modal = document.getElementById("write-user-area");
    hideModalWithTransition(modal);
}

// 사용자 상세 보기 모달 오픈
function openUserViewModal(rowData) {
    $("#view_user_id").text(rowData.user_id || "");
    $("#view_user_nm").text(rowData.user_nm || "");
    $("#view_email").text(rowData.email || "");
    $("#view_tel").text(rowData.tel || "");
    $("#view_role_cd").text(rowData.role_nm || "");
    $("#view_job_cd").text(rowData.job_nm || "");
    $("#view_dept_cd").text(rowData.dept_nm || "");
    $("#view_use_yn").text(rowData.use_yn || "Y");
    $("#view_lock_yn").text(toActivationYn(rowData.lock_yn));
    $("#view_remark").text(rowData.remark || "");

    const modal = document.getElementById("view-user-area");
    showModalWithTransition(modal);
}

// 사용자 상세 보기 모달 닫기
function closeUserViewModal() {
    const modal = document.getElementById("view-user-area");
    hideModalWithTransition(modal);
}

// 전화번호 자동 변환
$("#write_tel").on("input", function () {
    let val = $(this).val().replace(/[^0-9]/g, "");

    if (val.length < 4) {
        $(this).val(val);
    } else if (val.length < 8) {
        $(this).val(val.replace(/(\d{3})(\d+)/, "$1-$2"));
    } else {
        $(this).val(val.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3"));
    }
});
