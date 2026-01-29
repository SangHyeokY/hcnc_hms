// hr013.js
window.initTab3 = function() {
    if (!window.hr013Table) buildHr013Table();
    loadHr013TableData();
};

function buildHr013Table() {
    if (!window.Tabulator) return;
    if (!document.getElementById("TABLE_HR013_A")) return;

    window.hr013Table = new Tabulator("#TABLE_HR013_A", {
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

function loadHr013TableData() {
    if (!window.hr013Table) return;
    $.ajax({
        url: "/hr010/list",
        type: "GET",
        success: function(res) {
            window.hr013Table.setData(res || []);
        },
        error: function() { alert("Tab1 데이터 로드 실패"); }
    });
}
