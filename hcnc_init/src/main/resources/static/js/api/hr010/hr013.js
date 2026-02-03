// hr013.js
var stackTagInput = null;
var pendingStackValue = "";
var lastNonInprjCustNm = "";
var hr013DeletedIds = [];
var hr013SkillOptions = [];
var hr013JobOptions = [];

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
        $(".btn-tab3-remove").off("click").on("click", function () {
            removeHr013SelectedRows();
        });
        $(".btn-tab3-add").off("click").on("click", function () {
            addHr013Row();
        });

        $("#write_hr013_inprj_yn").off("change").on("change", function () {
            applyInprjCustomerName($(this).val(), $("#write_hr013_cust_nm").val());
        });

        $("#write_hr013_cust_nm").off("input").on("input", function () {
            if ($("#write_hr013_inprj_yn").val() !== "Y") {
                lastNonInprjCustNm = $(this).val();
            }
        });

       setComCode("write_hr013_job_cd", "job_cd", "", "cd", "cd_nm", function () {
           hr013JobOptions = $("#write_hr013_job_cd option").map(function () {
               return { cd: this.value, cd_nm: $(this).text() };
           }).get();
           initSelectDefault("write_hr013_job_cd", "선택");
           if (window.hr013Table) {
               window.hr013Table.redraw(true);
           }
       });
       setComCode("write_hr013_skl_cd", "skl_id", "", "cd", "cd_nm", function (res) {
           hr013SkillOptions = res || [];
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
        selectable: false,
        variableHeight: true,
        columns: [
            {
                field: "_checked",
                formatter: rowSelectFormatter,
                hozAlign: "center",
                headerSort: false,
                width: 50,
                cellClick: function (e, cell) {
                    var resolved = resolveCell(e, cell);
                    if (!resolved) {
                        return;
                    }
                    var row = resolved.getRow();
                    var next = !resolved.getValue();
                    row.update({ _checked: next });
                    syncRowCheckbox(row, next);
                }
            },
            {
                title: "당사 여부",
                field: "inprj_yn",
                hozAlign: "center",
                formatter: inprjCheckboxFormatter,
                cellClick: function (e, cell) {
                    if (window.hr010ReadOnly) {
                        return;
                    }
                    var resolved = resolveCell(e, cell);
                    if (!resolved) {
                        return;
                    }
                    toggleInprjValue(resolved);
                }
            },
            {
                title: "시작일",
                field: "st_dt",
                hozAlign: "center",
                formatter: dateDisplayFormatter,
                editor: dateEditor,
                editable: isHr013Editable,
                cellClick: startEditOnClick
            },
            {
                title: "종료일",
                field: "ed_dt",
                hozAlign: "center",
                formatter: dateDisplayFormatter,
                editor: dateEditor,
                editable: isHr013Editable,
                cellClick: startEditOnClick
            },
            {
                title: "고객사",
                field: "cust_nm",
                editor: "input",
                editable: function (cell) {
                    return isHr013Editable() && cell.getRow().getData().inprj_yn !== "Y";
                },
                cellClick: startEditOnClick
            },
            { title: "프로젝트명", field: "prj_nm", editor: "input", editable: isHr013Editable, cellClick: startEditOnClick },
            { title: "계약단가", field: "rate_amt", hozAlign: "right", formatter: amountFormatter, editor: "input", editable: isHr013Editable, cellClick: startEditOnClick },
            {
                title: "역할",
                field: "job_cd",
                hozAlign: "center",
                formatter: jobCodeFormatter,
                editor: "select",
                editorParams: function () {
                    return { values: getJobCodeMap() };
                },
                editable: isHr013Editable,
                cellClick: startEditOnClick
            },
            { title: "기술스택", field: "stack_txt", formatter: skillDisplayFormatter, editor: stackTagEditor, editable: isHr013Editable, cellClick: startEditOnClick },
            { title: "투입률", field: "alloc_pct", hozAlign: "right", formatter: percentageFormatter, minWidth: 90, editor: "input", editable: isHr013Editable, cellClick: startEditOnClick },
            { title: "비고", field: "remark", editor: "input", editable: isHr013Editable, cellClick: startEditOnClick }
        ],
        data: []
    });
}

function applyTab3Readonly(isReadOnly) {
    $("#TABLE_HR013_A").toggleClass("is-readonly", !!isReadOnly);
    if (window.hr013Table) {
        window.hr013Table.redraw(true);
    }
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
            var normalized = dataArray.map(function (row) {
                row._checked = false;
                if (row.job_cd && typeof row.job_cd === "object") {
                    row.job_cd = row.job_cd.cd || row.job_cd.value || "";
                }
                return row;
            });
            window.hr013Table.setData(normalized);
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
    lastNonInprjCustNm = data.inprj_yn === "Y" ? "" : (data.cust_nm || "");
    applyInprjCustomerName(data.inprj_yn, data.cust_nm);
    $("#write_hr013_prj_nm").val(data.prj_nm || "");
    $("#write_hr013_rate_amt").val(formatNumberInput(data.rate_amt));
    $("#write_hr013_job_cd").val(data.job_cd || "");
    $("#write_hr013_alloc_pct").val(formatPercentInput(data.alloc_pct));
    $("#write_hr013_remark").val(data.remark || "");
    pendingStackValue = data.stack_txt || "";
    if (stackTagInput) {
        stackTagInput.setFromValue(pendingStackValue);
    }


    // console.log("input value : " + $("#write_hr013_st_dt").val());
}

// 폼 초기화
function clearHr013Form() {
    $("#write_hr013_dev_prj_id").val("");
    $("#write_hr013_inprj_yn").val("N");
    $("#write_hr013_st_dt").val("");
    $("#write_hr013_ed_dt").val("");
    lastNonInprjCustNm = "";
    applyInprjCustomerName("N", "");
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

    if (payload.inprj_yn === "Y") {
        payload.cust_nm = "HCNC";
        $("#write_hr013_cust_nm").val(payload.cust_nm);
    }

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

// 당사 여부에 따라 고객사 자동 입력
function applyInprjCustomerName(inprjYn, custNm) {
    if (inprjYn === "Y") {
        if (custNm && custNm !== "HCNC") {
            lastNonInprjCustNm = custNm;
        }
        $("#write_hr013_cust_nm").val("HCNC").prop("disabled", true);
        return;
    }
    var nextValue = lastNonInprjCustNm || (custNm && custNm !== "HCNC" ? custNm : "") || "";
    $("#write_hr013_cust_nm").val(nextValue).prop("disabled", false);
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

function inprjCheckboxFormatter(cell) {
    var checked = cell.getValue() === "Y" ? " checked" : "";
    var disabled = window.hr010ReadOnly ? " disabled" : "";
    return "<input type='checkbox' style='pointer-events:none;'" + checked + disabled + " />";
}

// 선택 행 임시 삭제
function removeHr013SelectedRows() {
    if (!window.hr013Table) {
        return;
    }
    var rows = window.hr013Table.getRows().filter(function (row) {
        return row.getData()._checked;
    });
    if (!rows || rows.length === 0) {
        alert("삭제할 행을 선택해주세요.");
        return;
    }
    if (!confirm("선택한 행을 정말로 삭제하시겠습니까?")) {
        return;
    }
    rows.forEach(function (row) {
        var data = row.getData();
        if (data.dev_prj_id) {
            hr013DeletedIds.push(data.dev_prj_id);
        }
        row.delete();
    });
}

// 프로젝트 탭 통합 저장용
window.saveHr013TableData = function () {
    saveHr013InlineRows();
};

function saveHr013InlineRows() {
    if (!window.hr013Table) {
        return;
    }
    var devId = window.currentDevId || $("#dev_id").val();
    var rows = window.hr013Table.getData();
    var requests = [];

    rows.forEach(function (row) {
        if (!row.inprj_yn || !row.st_dt || !row.ed_dt) {
            return;
        }
        var custNm = row.cust_nm || "";
        if (row.inprj_yn === "Y") {
            custNm = "HCNC";
        }

        requests.push($.ajax({
            url: "/hr010/tab3_save",
            type: "POST",
            data: {
                dev_id: devId,
                dev_prj_id: row.dev_prj_id,
                inprj_yn: row.inprj_yn,
                st_dt: row.st_dt,
                ed_dt: row.ed_dt,
                cust_nm: custNm,
                prj_nm: row.prj_nm || "",
                rate_amt: row.rate_amt || "",
                job_cd: row.job_cd || "",
                stack_txt: row.stack_txt || "",
                alloc_pct: row.alloc_pct || "",
                remark: row.remark || ""
            }
        }));
    });

    hr013DeletedIds.forEach(function (id) {
        requests.push($.ajax({
            url: "/hr010/tab3_delete",
            type: "POST",
            data: { dev_prj_id: id, dev_id: devId }
        }));
    });

    if (requests.length === 0) {
        return;
    }

    $.when.apply($, requests).done(function () {
        hr013DeletedIds = [];
        loadHr013TableData();
    }).fail(function () {
        alert("프로젝트 저장 중 오류가 발생했습니다.");
    });
}

function addHr013Row() {
    if (!window.hr013Table) {
        return;
    }
    window.hr013Table.addRow({
        dev_prj_id: "",
        dev_id: window.currentDevId || $("#dev_id").val(),
        _checked: false,
        inprj_yn: "N",
        st_dt: "",
        ed_dt: "",
        cust_nm: "",
        prj_nm: "",
        rate_amt: "",
        job_cd: "",
        stack_txt: "",
        alloc_pct: "",
        remark: ""
    }, true);
}

function toggleInprjValue(cell) {
    var row = cell.getRow();
    var data = row.getData();
    var next = data.inprj_yn === "Y" ? "N" : "Y";
    var nextCust = data.cust_nm || "";
    if (next === "Y") {
        nextCust = "HCNC";
    } else if (nextCust === "HCNC") {
        nextCust = "";
    }
    row.update({ inprj_yn: next, cust_nm: nextCust });
}

function isHr013Editable() {
    return !window.hr010ReadOnly;
}

function getJobCodeMap() {
    var map = {};
    if (hr013JobOptions && hr013JobOptions.length) {
        hr013JobOptions.forEach(function (item) {
            if (item.cd) {
                map[item.cd] = item.cd_nm || item.cd;
            }
        });
        return map;
    }
    $("#write_hr013_job_cd option").each(function () {
        var val = this.value;
        if (val) {
            map[val] = $(this).text();
        }
    });
    return map;
}

function jobCodeFormatter(cell) {
    var row = cell.getRow().getData();
    if (row && row.role_nm) {
        return row.role_nm;
    }
    var val = cell.getValue();
    if (val && typeof val === "object") {
        val = val.cd || val.value || "";
    }
    if (!val) {
        return "";
    }
    var map = getJobCodeMap();
    return map[val] || val;
}

function dateDisplayFormatter(cell) {
    return formatDateDisplay(cell.getValue());
}

function formatDateDisplay(value) {
    if (!value) {
        return "";
    }
    if (typeof value === "number" || /^\d+$/.test(String(value))) {
        var d = new Date(Number(value));
        if (isNaN(d.getTime())) {
            return "";
        }
        return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    }
    return String(value).replaceAll(".", "-");
}

function rowSelectFormatter(cell) {
    var checked = cell.getValue() ? " checked" : "";
    return "<input type='checkbox' class='row-check'" + checked + " />";
}

function syncRowCheckbox(row, checked) {
    var el = row.getElement();
    if (!el) {
        return;
    }
    var checkbox = el.querySelector(".row-check");
    if (checkbox) {
        checkbox.checked = !!checked;
    }
}

function startEditOnClick(e, cell) {
    if (!isHr013Editable()) {
        return;
    }
    var resolved = resolveCell(e, cell);
    if (resolved && typeof resolved.edit === "function") {
        resolved.edit();
    }
}

function resolveCell(e, cell) {
    if (cell && typeof cell.getRow === "function") {
        return cell;
    }
    if (e && typeof e.getRow === "function") {
        return e;
    }
    return null;
}

function dateEditor(cell, onRendered, success, cancel) {
    var input = document.createElement("input");
    input.type = "date";
    input.style.width = "100%";
    input.value = formatDateDisplay(cell.getValue());

    onRendered(function () {
        input.focus();
        input.select();
    });

    input.addEventListener("blur", function () {
        success(input.value);
    });

    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            success(input.value);
        }
        if (e.key === "Escape") {
            cancel();
        }
    });

    return input;
}

function stackTagEditor(cell, onRendered, success, cancel) {
    var uid = "hr013_tag_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    var wrap = document.createElement("div");
    wrap.className = "tag-input";
    wrap.style.width = "100%";

    var box = document.createElement("div");
    box.className = "tag-input-box";

    var help = document.createElement("div");
    help.className = "tag-help";
    box.appendChild(help);

    var list = document.createElement("ul");
    list.className = "tag-list";
    list.id = uid + "_list";
    box.appendChild(list);

    var input = document.createElement("input");
    input.type = "text";
    input.className = "text tag-input-field";
    input.id = uid + "_input";
    input.setAttribute("list", uid + "_datalist");
    input.placeholder = "기술 입력/선택 후 Enter";
    box.appendChild(input);

    var row = document.createElement("div");
    row.className = "tag-select-row";

    var datalist = document.createElement("datalist");
    datalist.id = uid + "_datalist";
    row.appendChild(datalist);

    var hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.id = uid + "_hidden";
    row.appendChild(hidden);

    wrap.appendChild(box);
    wrap.appendChild(row);

    onRendered(function () {
        var tagInput = createTagInput({
            inputSelector: "#" + uid + "_input",
            listSelector: "#" + uid + "_list",
            hiddenSelector: "#" + uid + "_hidden",
            datalistSelector: "#" + uid + "_datalist",
            getValue: function (item) { return item.cd; },
            getLabel: function (item) { return item.cd_nm; },
            matchMode: "prefix"
        });
        tagInput.setOptions(hr013SkillOptions || []);
        tagInput.setFromValue(cell.getValue() || "");

        function commitByInput(rawValue) {
            var raw = (rawValue || "").replace(",", "");
            if (raw) {
                tagInput.addByLabel(raw);
            }
            input.value = "";
        }

        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                e.stopPropagation();
                commitByInput(input.value);
            }
        });

        var row = cell.getRow();
        if (row && typeof row.normalizeHeight === "function") {
            row.normalizeHeight();
        }
        if (typeof MutationObserver !== "undefined") {
            var observer = new MutationObserver(function () {
                if (row && typeof row.normalizeHeight === "function") {
                    row.normalizeHeight();
                }
            });
            observer.observe(list, { childList: true, subtree: true });
        }

        input.focus();
    });

    wrap.addEventListener("click", function (e) {
        if (e.target && e.target.classList && e.target.classList.contains("tag-remove")) {
            if (cell && typeof cell.getRow === "function") {
                var row = cell.getRow();
                if (row && typeof row.normalizeHeight === "function") {
                    row.normalizeHeight();
                }
            }
        }
    });

    wrap.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            cancel();
        }
    });

    wrap.addEventListener("focusout", function () {
        setTimeout(function () {
            if (!wrap.contains(document.activeElement)) {
                var value = document.getElementById(uid + "_hidden").value;
                success(value);
            }
        }, 0);
    });

    return wrap;
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
    if (value == null || value === "") {
        return "";
    }
    var codes = String(value).split(",");
    if (hr013SkillOptions && hr013SkillOptions.length) {
        return codes.map(function (code) {
            var match = hr013SkillOptions.find(function (item) {
                return String(item.cd) === String(code);
            });
            return match ? match.cd_nm : code;
        }).join(", ");
    }
    return value;
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
