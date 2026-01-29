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

    function riskValueFormatter(cell) {
        if (!cell || typeof cell.getRow !== "function") {
            return "";
        }
        var rowData = cell.getRow().getData();
        if (rowData.rsk_key === "re_in_yn") {
            var checked = cell.getValue() === "Y" ? " checked" : "";
            return "<input type='checkbox'" + checked + " />";
        }
        return cell.getValue() || "";
    }

    tableB = new Tabulator("#TABLE_HR015_B", {
        layout: "fitColumns",
        headerSort: true,
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        columns: [
            { title: "구 분", field: "label", hozAlign: "center", widthGrow: 2 },
            {
                title: "내 용",
                field: "value",
                hozAlign: "center",
                widthGrow: 4,
                formatter: riskValueFormatter,
                editor: "input",
                editable: function (cell) {
                    var rowData = cell.getRow().getData();
                    return rowData.rsk_key !== "re_in_yn";
                },
                cellClick: function (e, cell) {
                    if (!cell || typeof cell.getRow !== "function") {
                        return;
                    }
                    var rowData = cell.getRow().getData();
                    if (rowData.rsk_key !== "re_in_yn") {
                        cell.edit();
                        return;
                    }
                    var value = cell.getValue() === "Y" ? "N" : "Y";
                    cell.getRow().update({ value: value });
                },
                headerSort: false
            }
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
            var risk = (response.list && response.list[0]) ? response.list[0] : {};
            tableB.setData(buildRiskRows(risk));
            $("#HR015_RISK_MEMO").val(risk.memo || "");
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

    var risk = buildRiskPayload(tableB.getData());
    risk.memo = $.trim($("#HR015_RISK_MEMO").val());

    $.ajax({
        url: "/hr015/b/save",
        type: "POST",
        data: risk,
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

function buildRiskRows(risk) {
    return [
        { rsk_key: "leave_txt", label: "이탈이력", value: risk.leave_txt || "" },
        { rsk_key: "claim_txt", label: "클레임", value: risk.claim_txt || "" },
        { rsk_key: "sec_txt", label: "보안이슈", value: risk.sec_txt || "" },
        { rsk_key: "re_in_yn", label: "재투입 가능 여부", value: risk.re_in_yn || "N" }
    ];
}

function buildRiskPayload(rows) {
    var payload = {
        leave_txt: "",
        claim_txt: "",
        sec_txt: "",
        re_in_yn: "N"
    };

    if (!Array.isArray(rows)) {
        return payload;
    }

    rows.forEach(function (row) {
        if (row.rsk_key) {
            payload[row.rsk_key] = row.value;
        }
    });

    return payload;
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
