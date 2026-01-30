// hr011.js
window.initTab1 = function() {
    if (!window.hr011Table) buildHr011Table();
    loadHr011TableData();
};

function buildHr011Table() {
    if (!document.getElementById("TABLE_HR011_A")) return;

    window.hr011Table = new Tabulator("#TABLE_HR011_A", {
        layout: "fitColumns",
        // headerSort: true,
        placeholder: "데이터 없음", // 데이터 없으면 표시
        // selectable: true,
        columns: [
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
        data: [] // 초기에는 빈 배열
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

