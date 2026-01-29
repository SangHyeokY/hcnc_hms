var tableHr014;

$(document).ready(function () {
    buildHr014Table();
    loadHr014Table();

    $(".btn-hr014-load").on("click", function () {
        loadHr014Table();
    });
});

function buildHr014Table() {
    if (!window.Tabulator) {
        console.error("Tabulator가 로드되지 않았습니다.");
        return;
    }

    if (!document.getElementById("TABLE_HR014")) {
        return;
    }

    function ynCheckboxFormatter(cell) {
        var checked = cell.getValue() === "Y" ? " checked" : "";
        return "<input type='checkbox'" + checked + " disabled />";
    }

    tableHr014 = new Tabulator("#TABLE_HR014", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        columns: [
            { title: "당사 여부", field: "inprj_yn", width: 90, hozAlign: "center", formatter: ynCheckboxFormatter },
            { title: "기간", field: "st_ed_dt", width: 150, hozAlign: "center" },
            { title: "고객사", field: "cust_nm", widthGrow: 2 },
            { title: "프로젝트명", field: "prj_nm", widthGrow: 2 },
            { title: "계약단가", field: "rate_amt", width: 130, hozAlign: "right", formatter: amountFormatter },
            { title: "역할", field: "role_nm", width: 80, hozAlign: "center" },
            { title: "기술스택", field: "stack_txt", widthGrow: 3 },
            { title: "투입률", field: "alloc_pct", width: 90, hozAlign: "right" , formatter: perentageFormatter },
            { title: "비고", field: "remark", widthGrow: 4}
        ],
        data: []
    });
}

// 단가/프로젝트 이력 조회
function loadHr014Table() {
    if (!tableHr014 || typeof tableHr014.setData !== "function") {
        return;
    }

    $.ajax({
        url: "/hr014/list",
        type: "GET",
        success: function (response) {
            tableHr014.setData(response.list || []);
        },
        error: function () {
            alert("데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

// 투입률
function perentageFormatter(cell) {
    if (!cell.getValue() === null || cell.getValue() === undefined) {
        return "";
    }
    return cell.getValue() + "%";
}

// 계약단가(,)
function amountFormatter(cell) {
    if (!cell.getValue() === null || cell.getValue() === undefined) {
        return "";
    }
    comma = function (str) {
        str = String(str);
        return str.replace(/(\d)(?=(?:\d{3})+(?!\d))/g, '$1,');
    }

    return comma(cell.getValue());

}
