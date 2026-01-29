// hr014.js
window.initTab4 = function() {
    if (!window.hr014Table) buildHr014Table();
    loadHr014TableData();
};

function buildHr014Table() {
    if (!window.Tabulator) return;
    if (!document.getElementById("TABLE_HR014_A")) return;

    window.hr014Table = new Tabulator("#TABLE_HR014_A", {
        layout: "fitColumns",
        headerSort: true,
        placeholder: "데이터 없음",
        selectable: true,
        columns: [
            { title: "성명", field: "dev_nm", hozAlign: "center" },
            { title: "생년월일", field: "brdt" },
            { title: "연락처", field: "tel" },
            { title: "이메일", field: "email" }
            // 필요한 컬럼 추가
        ],
        data: []
    });
}

function loadHr014TableData() {
    if (!window.hr014Table) return;
    $.ajax({
        url: "/hr010/list",
        type: "GET",
        success: function(res) {
            window.hr014Table.setData(res || []);
        },
        error: function() { alert("Tab1 데이터 로드 실패"); }
    });
}
