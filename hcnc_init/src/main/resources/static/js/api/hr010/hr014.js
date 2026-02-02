// hr014.js
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


window.initTab4 = function() {
    // 서브 탭 초기 상태 설정
    var $tab4 = $("#tab4");
    var $subBtns = $tab4.find(".tab-sub-btn");
    $subBtns.removeClass("active");
    $subBtns.filter("[data-tab='tab4-A']").addClass("active");

    // 테이블 초기화 (한 번만 수행)
    if (!window.hr014TableA) buildHr014TableA();
    // if (!window.hr014TableB) buildHr014TableB();

    // 초기 데이터 로드 (한 번만)
    if (!window.hr014TabInitialized) {
        loadHr014TableDataA();
        loadHr014TableDataB();
    }

    // A/B 테이블 보여주기/숨기기
    $tab4.find("#TABLE_HR014_A").show();
    $tab4.find("#TABLE_HR014_B").hide();
    if (window.hr014TableA) {
        window.hr014TableA.redraw(true);
    }

    // 탭 클릭 이벤트
    $subBtns.off("click").on("click", function() {
        const tabId = $(this).data("tab");

        $subBtns.removeClass("active");
        $(this).addClass("active");

        if (tabId === "tab4-A") {
            $tab4.find("#TABLE_HR014_A").show();
            $tab4.find("#TABLE_HR014_B").hide();
            if (window.hr014TableA) {
                window.hr014TableA.redraw(true);
            }
        } else if (tabId === "tab4-B") {
            $tab4.find("#TABLE_HR014_A").hide();
            $tab4.find("#TABLE_HR014_B").show();
            // window.hr014TableB.redraw();
        }
    });
     buildRiskList();

    $(".btn-tab4-save").off("click").on("click", function () {
        saveTab4Active();
    });

    window.hr014TabInitialized = true;
};

function buildHr014TableA() {
    if (window.hr014TableA) return;

    window.hr014TableA = new Tabulator("#TABLE_HR014_A", {
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
            {
                title: "코멘트",
                field: "cmt",
                widthGrow: 3,
                hozAlign: "center",
                editor: "input",
                editable: function () {
                    return !window.hr010ReadOnly;
                },
                headerVertical: "middle"
            }
        ],
        data: []
    });
}

function loadHr014TableDataA() {
    const devId = window.currentDevId || $("#dev_id").val();
    if (!window.hr014TableA) return;

    $.ajax({
        url: "/hr015/a/list",
        type: "GET",
        data: { dev_id: devId },
        success: function(response) {
            const dataArray = Array.isArray(response.list)
                ? response.list
                : [];
            window.hr014TableA.setData(dataArray);
            // console.log(dataArray)
        },
        error: function() {
            alert("tab4A 데이터 로드 실패");
        }
    });
}

// =============================================================================================================================

function scoreCheckboxFormatter(cell, formatterParams, onRendered) {
    const value = cell.getValue();
    const checked = value === "Y" ? "checked" : "";
    const disabled = window.hr010ReadOnly ? "disabled" : "";
    return `<input type="radio" ${checked} ${disabled} />`;
}

function setScore(row, level) {
        if (window.hr010ReadOnly) {
            return;
        }
        var data = row.getData();
        data.lv1 = "N";
        data.lv2 = "N";
        data.lv3 = "N";
        data.lv4 = "N";
        data.lv5 = "N";
        data["lv" + level] = "Y";
        row.update(data);
    }

//function buildHr014TableB() {
//    if (window.hr014TableB) return;
//
//    window.hr014TableB = new Tabulator("#TABLE_HR014_B", {
//        layout: "fitColumns",
//        placeholder: "데이터 없음",
//        columns: [
//            { title: "기술", field: "cd_nm", hozAlign: "left", widthGrow: 2 },
//            { title: "1", field: "lv1", hozAlign: "center", formatter: scoreCheckboxFormatter },
//            { title: "2", field: "lv2", hozAlign: "center", formatter: scoreCheckboxFormatter },
//            { title: "3", field: "lv3", hozAlign: "center", formatter: scoreCheckboxFormatter },
//            { title: "4", field: "lv4", hozAlign: "center", formatter: scoreCheckboxFormatter },
//            { title: "5", field: "lv5", hozAlign: "center", formatter: scoreCheckboxFormatter }
//        ],
//        data: []
//    });
//}

function loadHr014TableDataB() {
    const devId = window.currentDevId || $("#dev_id").val();
    // if (!window.hr014TableB) return;

    $.ajax({
        url: "/hr015/b/list",
        type: "GET",
        data: { dev_id: devId },
        success: function(response) {
            var risk = (response.list && response.list[0]) ? response.list[0] : {};
            riskState.leave_txt = risk.leave_txt || "";
            riskState.claim_txt = risk.claim_txt || "";
            riskState.sec_txt = risk.sec_txt || "";
            riskState.re_in_yn = risk.re_in_yn || "N";
            riskState.memo = risk.memo || "";

            $("#HR015_REIN_CHECK").prop("checked", riskState.re_in_yn === "Y");
            setRiskActive(riskActiveKey);
        },
        error: function() {
            alert("tab4B 데이터 로드 실패");
        }
    });
}

// ================================================================================= //

// 탭1 평가 저장
function saveTableA(showAlert) {
    if (showAlert === undefined) {
        showAlert = true;
    }
    if (!window.hr014TableA) {
        return;
    }
    $.ajax({
        url: "/hr015/a/save",
        type: "POST",
        data: {
            dev_id: window.currentDevId || $("#dev_id").val(),
            rows: JSON.stringify(buildSaveRows(window.hr014TableA.getData()))
        },
        success: function (response) {
            if (response.success) {
                loadHr014TableDataA();
                if (showAlert) {
                    alert("저장되었습니다.");
                }
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
function saveTableB(showAlert) {
    if (showAlert === undefined) {
        showAlert = true;
    }
    riskState.re_in_yn = $("#HR015_REIN_CHECK").is(":checked") ? "Y" : "N";

    $.ajax({
        url: "/hr015/b/save",
        type: "POST",
        data: {
            dev_id: window.currentDevId || $("#dev_id").val(),
            leave_txt: riskState.leave_txt,
            claim_txt: riskState.claim_txt,
            sec_txt: riskState.sec_txt,
            re_in_yn: riskState.re_in_yn,
            memo: riskState.memo
        },
        success: function (response) {
            if (response.success) {
                loadHr014TableDataB();
                if (showAlert) {
                    alert("저장되었습니다.");
                }
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
        if (window.hr010ReadOnly) {
            return;
        }
        var value = $(this).val();
        if (riskActiveKey === "memo_txt") {
            riskState.memo = value;
        } else {
            riskState[riskActiveKey] = value;
        }
    });

    $("#HR015_REIN_CHECK").on("change", function () {
        if (window.hr010ReadOnly) {
            return;
        }
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
    }).filter(function (row) {
        return row.eval_id && row.lvl != null && row.lvl !== "";
    });
}

// 탭4 저장 (활성 서브탭 기준)
function saveTab4Active() {
    var activeTab = $(".tab-sub-btn.active").data("tab");
    if (activeTab === "tab4-B") {
        saveTableB(true);
    } else {
        saveTableA(true);
    }
}

// 탭4 전체 저장 (평가 + 리스크)
function saveTab4All() {
    saveTableA(false);
    saveTableB(false);
}

window.saveTab4All = saveTab4All;

function applyTab4Readonly(isReadOnly) {
    $("#HR015_RISK_TEXT").prop("disabled", isReadOnly);
    $("#HR015_REIN_CHECK").prop("disabled", isReadOnly);
    $("#TABLE_HR014_A").toggleClass("is-readonly", !!isReadOnly);
}

window.applyTab4Readonly = applyTab4Readonly;



