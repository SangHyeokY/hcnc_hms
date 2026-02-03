// hr013.js
var stackTagInput = null;
var pendingStackValue = "";

window.initTab3 = function() {
    if (!window.hr013Table) buildHr013Table();
    loadHr013TableData();

    $("#write_hr013_rate_amt").on("input", function () {
            $(this).val(formatNumberInput($(this).val()));
        });

        $("#write_hr013_alloc_pct").on("input", function () {
            $(this).val(formatPercentInput($(this).val()));
        });

    $(".btn-hr013-save").off("click").on("click", function () {
        saveHr013Row();
    });

        $(".btn-tab3-new").off("click").on("click", function () {
            openHr013Modal("new");
        });
        $(".btn-tab3-edit").off("click").on("click", function () {
            openHr013Modal("edit");
        });
        $(".btn-tab3-delete").off("click").on("click", function () {
            deleteHr013Row();
        });

       setComCode("write_hr013_job_cd", "job_cd", "", "cd", "cd_nm", function () {
           initSelectDefault("write_hr013_job_cd", "선택");
       });
       setComCode("write_hr013_skl_cd", "skl_id", "", "cd", "cd_nm", function (res) {
           if (!stackTagInput) {
               stackTagInput = createTagInput({
                   inputSelector: "#write_hr013_stack_input",
                   listSelector: "#hr013SkillTagList",
                   hiddenSelector: "#write_hr013_stack_txt",
                   datalistSelector: "#write_hr013_stack_datalist",
                   getValue: function (item) { return item.cd; },
                   getLabel: function (item) { return item.cd_nm; },
                   matchMode: "prefix"
               });
           }
           stackTagInput.setOptions(res || []);
           stackTagInput.setFromValue(pendingStackValue || $("#write_hr013_stack_txt").val());
           if (window.hr013Table) {
               window.hr013Table.redraw(true);
           }
       });
};

function buildHr013Table() {
    if (!document.getElementById("TABLE_HR013_A")) return;

    window.hr013Table = new Tabulator("#TABLE_HR013_A", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        selectable: 1,
        columnDefaults: {
            cellClick: function (e, cell) {
                cell.getRow().toggleSelect();
            }
        },
        columns: [
            {
                title: "당사 여부",
                field: "inprj_yn",
                hozAlign: "center",
                formatter: ynCheckboxFormatter,
                cellClick: function (e, cell) {
                    cell.getRow().toggleSelect();
                }
            },
            { title: "기간", field: "st_ed_dt", hozAlign: "center" },
            { title: "고객사", field: "cust_nm"},
            { title: "프로젝트명", field: "prj_nm"},
            { title: "계약단가", field: "rate_amt", hozAlign: "right", formatter: amountFormatter },
            { title: "역할", field: "role_nm", hozAlign: "center" },
            { title: "기술스택", field: "stack_txt", formatter: skillDisplayFormatter },
            { title: "투입률", field: "alloc_pct", hozAlign: "right", formatter: percentageFormatter },
            { title: "비고", field: "remark"}
        ],
        data: []
    });
}

function applyTab3Readonly(isReadOnly) {
    $("#TABLE_HR013_A").toggleClass("is-readonly", !!isReadOnly);
}

window.applyTab3Readonly = applyTab3Readonly;

// 프로젝트 이력 모달 열기
function openHr013Modal(mode) {
    var title = mode === "edit" ? "수정" : "등록";
    $("#hr013-type").text(title);

    if (mode === "edit") {
        var rowData = getHr013SelectedRow();
        if (!rowData) {
            alert("수정할 행을 선택해주세요.");
            return;
        }
        fillHr013Form(rowData);
    } else {
        clearHr013Form();
    }

    $("#write-hr013-area").show();
}

// 프로젝트 이력 모달 닫기
function closeHr013Modal() {
    $("#write-hr013-area").hide();
}

function loadHr013TableData() {
    const dev_id = window.currentDevId || $("#dev_id").val();
    if (!window.hr013Table) return;

    $.ajax({
        url: "/hr010/tab3",
        type: "GET",
        data: { dev_id: dev_id },
        success: function(res) {
            const dataArray = Array.isArray(res.list) ? res.list : [];
            window.hr013Table.setData(dataArray);
            window.hr013Table.redraw();
        },
        error: function() { alert("Tab3 데이터 로드 실패"); }
    });
}

// 선택 행 가져오기
function getHr013SelectedRow() {
    if (!window.hr013Table) {
        return null;
    }
    var rows = window.hr013Table.getSelectedRows();
    if (!rows || rows.length === 0) {
        return null;
    }
    return rows[0].getData();
}

// 폼 데이터 채우기
function fillHr013Form(data) {

    console.log("st_dt : " + data.st_dt, "ed_dt : " + data.ed_dt);
    $("#write_hr013_dev_prj_id").val(data.dev_prj_id || "");
    $("#write_hr013_inprj_yn").val(data.inprj_yn || "N");
    $("#write_hr013_st_dt").val(toDateInput(data.st_dt));
    $("#write_hr013_ed_dt").val(toDateInput(data.ed_dt));
    $("#write_hr013_cust_nm").val(data.cust_nm || "");
    $("#write_hr013_prj_nm").val(data.prj_nm || "");
    $("#write_hr013_rate_amt").val(formatNumberInput(data.rate_amt));
    $("#write_hr013_job_cd").val(data.job_cd || "");
    $("#write_hr013_alloc_pct").val(formatPercentInput(data.alloc_pct));
    $("#write_hr013_remark").val(data.remark || "");
    pendingStackValue = data.stack_txt || "";
    if (stackTagInput) {
        stackTagInput.setFromValue(pendingStackValue);
    }
    console.log("input value : " + $("#write_hr013_st_dt").val());
}

// 폼 초기화
function clearHr013Form() {
    $("#write_hr013_dev_prj_id").val("");
    $("#write_hr013_inprj_yn").val("N");
    $("#write_hr013_st_dt").val("");
    $("#write_hr013_ed_dt").val("");
    $("#write_hr013_cust_nm").val("");
    $("#write_hr013_prj_nm").val("");
    $("#write_hr013_rate_amt").val("");
    $("#write_hr013_job_cd").val("");
    $("#write_hr013_alloc_pct").val("");
    $("#write_hr013_remark").val("");
    pendingStackValue = "";
    if (stackTagInput) {
        stackTagInput.clear();
    }
}

// 저장 버튼
function saveHr013Row() {
    var payload = {
        dev_id: window.currentDevId || $("#dev_id").val(),
        dev_prj_id: $("#write_hr013_dev_prj_id").val(),
        inprj_yn: $("#write_hr013_inprj_yn").val(),
        st_dt: $("#write_hr013_st_dt").val(),
        ed_dt: $("#write_hr013_ed_dt").val(),
        cust_nm: $("#write_hr013_cust_nm").val(),
        prj_nm: $("#write_hr013_prj_nm").val(),
        rate_amt: $("#write_hr013_rate_amt").val(),
        job_cd: $("#write_hr013_job_cd").val(),
        stack_txt: $("#write_hr013_stack_txt").val(),
        alloc_pct: $("#write_hr013_alloc_pct").val(),
        remark: $("#write_hr013_remark").val()
    };

    if (!payload.inprj_yn) {
        alert("당사 여부를 선택해주세요.");
        return;
    }
    if (!payload.st_dt) {
        alert("시작일을 입력해주세요.");
        return;
    }
    if (!payload.ed_dt) {
        alert("종료일을 입력해주세요.");
        return;
    }
    if (!payload.cust_nm) {
        alert("고객사를 입력해주세요.");
        return;
    }
    if (!payload.prj_nm) {
        alert("프로젝트명을 입력해주세요.");
        return;
    }
    if (!payload.rate_amt) {
        alert("계약단가를 입력해주세요.");
        return;
    }
    if (!payload.job_cd) {
        alert("역할을 선택해주세요.");
        return;
    }
    if (!payload.alloc_pct) {
        alert("투입률을 입력해주세요.");
        return;
    }
    if (!payload.stack_txt) {
        alert("기술스택을 선택해주세요.");
        return;
    }

    $.ajax({
        url: "/hr010/tab3_save",
        type: "POST",
        data: payload,
        success: function (response) {
            if (response.success) {
                closeHr013Modal();
                loadHr013TableData();
                // alert("저장되었습니다.");
            } else {
                alert("저장에 실패했습니다.");
            }
        },
        error: function () {
            alert("저장 중 오류가 발생했습니다.");
        }
    });
}

// 삭제 버튼
function deleteHr013Row() {
    var rowData = getHr013SelectedRow();
    if (!rowData) {
        alert("삭제할 행을 선택해주세요.");
        return;
    }
    if (!confirm("삭제하시겠습니까?")) {
        return;
    }
    $.ajax({
        url: "/hr010/tab3_delete",
        type: "POST",
        data: { dev_prj_id: rowData.dev_prj_id, dev_id: window.currentDevId || $("#dev_id").val() },
        success: function (response) {
            if (response.success) {
                loadHr013TableData();
                alert("삭제되었습니다.");
            } else {
                alert("삭제에 실패했습니다.");
            }
        },
        error: function () {
            alert("삭제 중 오류가 발생했습니다.");
        }
    });
}

function ynCheckboxFormatter(cell) {
    var checked = cell.getValue() === "Y" ? " checked" : "";
    return "<input type='checkbox'" + checked + " disabled />";
}

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

// 테이블 표시용 기술스택 변환
function skillDisplayFormatter(cell) {
    var row = cell.getRow().getData();
    if (row && row.stack_txt_nm != null && row.stack_txt_nm !== "") {
        return row.stack_txt_nm;
    }
    var value = cell.getValue();
    return value == null ? "" : value;
}

// 투입률
function percentageFormatter(cell) {
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
