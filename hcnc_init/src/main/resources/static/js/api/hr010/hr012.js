// hr012.js
window.initTab2 = function () {

    if (!window.hr012Table) {
        buildHr012Table();
        loadHr012TableData();
    }
    window.hr012Table?.redraw(true);
};

function buildHr012Table() {
    if (!window.Tabulator) return;
    if (!document.getElementById("TABLE_HR012_A")) return;

    window.hr012Table = new Tabulator("#TABLE_HR012_A", {
        layout: "fitColumns",
        headerSort: true,
        placeholder: "데이터 없음",
        selectable: true,
        columns: [
            { title: "cd", field: "cd", visible: false },
            {
                title: "구분",
                field: "cd_nm",
                width: 160,
                hozAlign: "center",
                headerHozAlign: "center"
            },
            {
                title: "상세",
                field: "skl_id_lst",
                formatter: function (cell) {
                    const val = cell.getValue();
                    if (!val) return "-";

                    return val.split(",").join(", ");
                }
            }
        ],
        data: []
    });
}

function loadHr012TableData() {
    const devId = window.currentDevId;
    console.log(devId+"!@!#@!@")
    if (!window.hr012Table) return;
    if (!devId) {
        window.hr012Table.clearData();
        return;
    }
    $.ajax({
        url: "/hr010/tab2",
        type: "GET",
        data: { dev_id: devId },
        success: function(res) {
            window.hr012Table.setData(res || []);
        },
        error: function() { alert("Tab2 데이터 로드 실패"); }
    });
}
