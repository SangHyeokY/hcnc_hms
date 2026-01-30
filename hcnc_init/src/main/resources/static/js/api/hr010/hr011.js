// hr011.js
let hr011ModalMode = "new";

window.initTab1 = function() {
    if (!window.hr011Table) buildHr011Table();
    loadHr011TableData();

    if(window.tab1){
        // 등록/수정/삭제 모달
        $(".btn-tab1-new").off("click").on("click", function () {
        	openHr011Modal("new");
        });
        $(".btn-tab1-edit").off("click").on("click", function () {
            if (!window.hr011Table) return;
            const rows = window.hr011Table.getSelectedRows();
            if (rows.length === 0) {
                alert("수정할 항목을 선택해주세요.");
                return;
            }
            openHr011Modal("edit");
        });
        $(".btn-tab1-delete").off("click").on("click", function () {
            // deleteHr011Row();
        });
    }
};

function openHr011Modal(mode) {
    hr011ModalMode = mode;
    // clearHr011Form();
    var hr011_title = mode === "edit" ? "수정" : "등록";
    $("#hr011-type").text(hr011_title);

    if (mode === "edit") {
        const rowData = hr011Table.getSelectedRows()[0].getData();
        // fillHr011Form(rowData);
    }
    $("#upsert-user-hrm").show();
}

function getHr011SelectedRow() {
    if (!window.hr011Table) {
        return null;
    }
    var rows = window.hr011Table.getSelectedRows();
    if (!rows || rows.length === 0) {
        return null;
    }
    return rows[0].getData();
}

// 등록/수정 모달 닫히게 하기
function closeUpsertUserModal() {
    clearHr011Form();
    hr011ModalMode = "new";
    $("#upsert-user-hrm").hide();
}

function buildHr011Table() {
    if (!document.getElementById("TABLE_HR011_A")) return;

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

    window.hr011Table = new Tabulator("#TABLE_HR011_A", {
        layout: "fitColumns",
        // headerSort: true,
        placeholder: "데이터 없음", // 데이터 없으면 표시
        selectable: 1,
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
            { title: "소속사", field: "org_nm", hozAlign: "center" },
            {
                title: "사업자유형",
                field: "biz_typ",
                formatter: function(cell) {
                    const val = cell.getValue();
                    if(val === "01") return "개인";
                    if(val === "02") return "개인사업자";
                    if(val === "03") return "법인";
                    return val || "";
                }
            },
            { title: "계약시작일", field: "st_dt" },
            { title: "계약종료일", field: "ed_dt" },
            { title: "계약금액", field: "amt", hozAlign: "right", formatter: amountFormatter },
            { title: "비고", field: "remark" }
        ],
        data: [], // 초기에는 빈 배열
        rowSelected: function (row) {
            syncRowCheckbox(row, true);
        },
        rowDeselected: function (row) {
            syncRowCheckbox(row, false);
        },
        rowSelectionChanged: function () {
            syncTableCheckboxes(this);
        }
    });
}

function loadHr011TableData() {
    const devId = window.currentDevId;
    if (!window.hr011Table) return;

    $.ajax({
        url: "/hr010/tab1",
        type: "GET",
        data: { dev_id: devId },
        success: function(res) {
            // 데이터를 배열로 변환
            const data = res && res.res ? res.res: [];
            const dataArray = Array.isArray(data) ? data : [data];

            // 데이터 없으면 setData 호출하지 않고, placeholder가 표시되도록 처리 가능
            window.hr011Table.setData(dataArray);
            window.hr011Table.redraw();
        },
        error: function() { alert("Tab1 데이터 로드 실패"); }
    });
}

// 계약단가(,),(테이블표)
function amountFormatter(cell) {
    if (cell.getValue() === null || cell.getValue() === undefined || cell.getValue() === "") {
        return "";
    }
    return formatNumberInput(cell.getValue());

}

