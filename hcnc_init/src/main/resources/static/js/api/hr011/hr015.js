var tableA;
var tableB;

$(document).ready(function () {
    buildTables();
    loadTableA();
    loadTableB();

    $(".btn-a-load").on("click", function () {
        loadTableA();
    });

    $(".btn-b-load").on("click", function () {
        loadTableB();
    });

    $(".btn-a-save").on("click", function () {
        saveTableA();
    });

    $(".btn-b-save").on("click", function () {
        saveTableB();
    });
});

function buildTables() {
    if (!window.Tabulator) {
        console.error("Tabulator가 로드되지 않았습니다.");
        return;
    }

    if (!document.getElementById("TABLE_HR015_A")) {
        return;
    }

    function scoreCheckboxFormatter(cell) {
        var value = cell.getValue();
        var checked = value === "Y" ? " checked" : "";
        return "<input type='checkbox'" + checked + " />";
    }

    function setScore(row, level) {
        var data = row.getData();
        data.lv1 = "N";
        data.lv2 = "N";
        data.lv3 = "N";
        data.lv4 = "N";
        data.lv5 = "N";
        data["lv" + level] = "Y";
        row.update(data);
    }

    tableA = new Tabulator("#TABLE_HR015_A", {
        layout: "fitColumns",
        headerSort: true,
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        columns: [
            { title: "항 목", field: "cd_nm", widthGrow: 2 },
            {
                title: "점 수",
                headerHozAlign: "center",
                headerVertical: "middle",
                columns: [
                    {
                        title: "1",
                        field: "lv1",
                        hozAlign: "center",
                        width: 100,
                        formatter: scoreCheckboxFormatter,
                        cellClick: function (e, cell) {
                            setScore(cell.getRow(), 1);
                        },
                        headerVertical: "middle",
                        headerSort: false
                    },
                    {
                        title: "2",
                        field: "lv2",
                        hozAlign: "center",
                        width: 100,
                        formatter: scoreCheckboxFormatter,
                        cellClick: function (e, cell) {
                            setScore(cell.getRow(), 2);
                        },
                        headerVertical: "middle",
                        headerSort: false
                    },
                    {
                        title: "3",
                        field: "lv3",
                        hozAlign: "center",
                        width: 100,
                        formatter: scoreCheckboxFormatter,
                        cellClick: function (e, cell) {
                            setScore(cell.getRow(), 3);
                        },
                        headerVertical: "middle",
                        headerSort: false
                    },
                    {
                        title: "4",
                        field: "lv4",
                        hozAlign: "center",
                        width: 100,
                        formatter: scoreCheckboxFormatter,
                        cellClick: function (e, cell) {
                            setScore(cell.getRow(), 4);
                        },
                        headerVertical: "middle",
                        headerSort: false
                    },
                    {
                        title: "5",
                        field: "lv5",
                        hozAlign: "center",
                        width: 100,
                        formatter: scoreCheckboxFormatter,
                        cellClick: function (e, cell) {
                            setScore(cell.getRow(), 5);
                        },
                        headerVertical: "middle",
                        headerSort: false
                    }
                ]
            },
            { title: "코멘트", field: "cmt", widthGrow: 3, hozAlign: "center", editor: "input", headerVertical: "middle" }
        ],
        data: []
    });

    tableB = new Tabulator("#TABLE_HR015_B", {
        layout: "fitColumns",
        headerSort: true,
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        columns: [
            { title: "항목코드", field: "item_cd", hozAlign: "center", widthGrow: 1 },
            { title: "항목명", field: "item_nm", widthGrow: 2 },
            { title: "사용여부", field: "use_yn", hozAlign: "center", widthGrow: 1 }
        ],
        data: []
    });
}

function loadTableA() {
    if (!tableA || typeof tableA.setData !== "function") {
        return;
    }

    $.ajax({
        url: "/hr015/a/list",
        type: "GET",
        success: function (response) {
            tableA.setData(response.list || []);
        },
        error: function () {
            alert("탭1 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

function loadTableB() {
    if (!tableB || typeof tableB.setData !== "function") {
        return;
    }

    $.ajax({
        url: "/hr015/b/list",
        type: "GET",
        success: function (response) {
            tableB.setData(response.list || []);
        },
        error: function () {
            alert("탭2 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

function saveTableA() {
    if (!tableA) {
        return;
    }

    $.ajax({
        url: "/hr015/a/save",
        type: "POST",
        data: { rows: JSON.stringify(buildSaveRows(tableA.getData())) },
        success: function (response) {
            if (response.success) {
                loadTableA();
                alert("저장되었습니다.");
            } else {
                alert("저장에 실패했습니다.");
            }
        },
        error: function () {
            alert("저장 중 오류가 발생했습니다.");
        }
    });
}

function saveTableB() {
    if (!tableB) {
        return;
    }

    $.ajax({
        url: "/hr015/b/save",
        type: "POST",
        data: { rows: JSON.stringify(buildSaveRows(tableB.getData())) },
        success: function (response) {
            if (response.success) {
                loadTableB();
                alert("저장되었습니다.");
            } else {
                alert("저장에 실패했습니다.");
            }
        },
        error: function () {
            alert("저장 중 오류가 발생했습니다.");
        }
    });
}

function buildSaveRows(rows) {
    if (!Array.isArray(rows)) {
        return [];
    }

    return rows.map(function (row) {
        var evalId = row.eval_id || row.cd || row.item_cd || "";
        var lvl = row.lvl;

        if (lvl == null || lvl === "") {
            if (row.lv1 === "Y") lvl = 1;
            else if (row.lv2 === "Y") lvl = 2;
            else if (row.lv3 === "Y") lvl = 3;
            else if (row.lv4 === "Y") lvl = 4;
            else if (row.lv5 === "Y") lvl = 5;
            else lvl = null;
        }

        return {
            eval_id: evalId,
            lvl: lvl,
            cmt: row.cmt || ""
        };
    });
}
