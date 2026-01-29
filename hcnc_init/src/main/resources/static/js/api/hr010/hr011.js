// hr011.js
window.initTab1 = function () {

    if (!window.hr011Table) {
        buildHr011Table();
        loadHr011TableData();
    }
    window.hr011Table?.redraw(true);
};

function buildHr011Table() {
    if (!window.Tabulator) return;
    if (!document.getElementById("TABLE_HR011_A")) return;

    window.hr011Table = new Tabulator("#TABLE_HR011_A", {
        layout: "fitColumns",
        headerSort: true,
        placeholder: "데이터 없음",
        selectable: true,
        columns: [
            { title: "소속사", field: "org_nm", hozAlign: "center" },
            { title: "사업자유형", field: "biz_typ" },
            { title: "계약시작일", field: "st_dt" },
            { title: "계약종료일", field: "ed_dt" },
            { title: "계약금액", field: "amt" },
            { title: "비고", field: "remark" }
        ],
        data: []
    });
}

function loadHr011TableData() {
    if (!window.hr011Table) return;
     const devId = window.currentDevId;
    if (!devId) {
        window.hr011Table.clearData();
        return;
    }
    $.ajax({
        url: "/hr010/tab1",
        type: "GET",
        data: { dev_id: devId },
        success: function(res) {
            window.hr011Table.setData(res || []);
        },
        error: function() { alert("Tab1 데이터 로드 실패"); }
    });
}
