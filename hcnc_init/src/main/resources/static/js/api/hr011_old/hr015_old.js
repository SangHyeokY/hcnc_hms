var tableA;
var riskState = {
    leave_txt: "",
    claim_txt: "",
    sec_txt: "",
    re_in_yn: "N",
    memo: ""
};
var riskKeys = [
    { key: "leave_txt", label: "이탈이력" },
    { key: "claim_txt", label: "클레임" },
    { key: "sec_txt", label: "보안이슈" },
    { key: "memo_txt", label: "관리메모" }
];
var riskActiveKey = "leave_txt";

$(document).ready(function () {
    buildTables();
    loadTableA();
    loadTableB();
    initHr015Tabs();

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

    buildRiskList();
}

// 탭2 평가 데이터 조회
function initHr015Tabs() {
    var $shell = $(".hr015-shell");
    var $tabs = $("#HR015_SIDE_TABS .hr015-tab-btn");
    var $panels = $(".hr015-tab-panel");

    $tabs.off("click").on("click", function () {
        var target = $(this).data("tab");
        $tabs.removeClass("active");
        $(this).addClass("active");
        $panels.removeClass("active");
        if (target === "hr015-B") {
            $("#HR015_TAB_B").addClass("active");
            $shell.addClass("is-risk");
        } else {
            $("#HR015_TAB_A").addClass("active");
            $shell.removeClass("is-risk");
            if (tableA && typeof tableA.redraw === "function") {
                tableA.redraw(true);
            }
        }
    });
}

// 탭1 평가 데이터 조회
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

// 탭2 리스크 데이터 조회
function loadTableB() {
    $.ajax({
        url: "/hr015/b/list",
        type: "GET",
        success: function (response) {
            var risk = (response.list && response.list[0]) ? response.list[0] : {};
            riskState.leave_txt = risk.leave_txt || "";
            riskState.claim_txt = risk.claim_txt || "";
            riskState.sec_txt = risk.sec_txt || "";
            riskState.re_in_yn = risk.re_in_yn || "N";
            riskState.memo = risk.memo || "";

            $("#HR015_REIN_CHECK").prop("checked", riskState.re_in_yn === "Y");
            setRiskActive(riskActiveKey);
        },
        error: function () {
            alert("탭2 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

// 탭1 평가 저장
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

// 탭2 리스크 저장
function saveTableB() {
    riskState.re_in_yn = $("#HR015_REIN_CHECK").is(":checked") ? "Y" : "N";

    $.ajax({
        url: "/hr015/b/save",
        type: "POST",
        data: {
            leave_txt: riskState.leave_txt,
            claim_txt: riskState.claim_txt,
            sec_txt: riskState.sec_txt,
            re_in_yn: riskState.re_in_yn,
            memo: riskState.memo
        },
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

// 리스크 항목 리스트 렌더링
function buildRiskList() {
    var $list = $("#HR015_RISK_LIST");
    if ($list.length === 0) {
        return;
    }
    $list.empty();
    riskKeys.forEach(function (item) {
        var $btn = $("<div class='risk-item'></div>");
        $btn.text(item.label);
        $btn.attr("data-key", item.key);
        $btn.on("click", function () {
            setRiskActive(item.key);
        });
        $list.append($btn);
    });

    $("#HR015_RISK_TEXT").on("input", function () {
        var value = $(this).val();
        if (riskActiveKey === "memo_txt") {
            riskState.memo = value;
        } else {
            riskState[riskActiveKey] = value;
        }
    });

    $("#HR015_REIN_CHECK").on("change", function () {
        riskState.re_in_yn = $(this).is(":checked") ? "Y" : "N";
    });
}

// 리스크 항목 선택 처리
function setRiskActive(key) {
    riskActiveKey = key;
    $("#HR015_RISK_LIST .risk-item").removeClass("active");
    $("#HR015_RISK_LIST .risk-item[data-key='" + key + "']").addClass("active");

    if (key === "memo_txt") {
        $("#HR015_RISK_TEXT").val(riskState.memo || "");
    } else {
        $("#HR015_RISK_TEXT").val(riskState[key] || "");
    }
}

// 탭1 저장용 payload 구성
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
