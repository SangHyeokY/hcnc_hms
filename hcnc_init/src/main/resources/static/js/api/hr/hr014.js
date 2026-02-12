// hr014.js
// 리스크 탭(B) 임시 상태. 저장 전까지 화면 입력값을 여기에 유지한다.
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

// 상위 모달(view/update) 상태를 탭4 UI에 반영한다.
$(document).off("tab:readonly.hr014").on("tab:readonly.hr014", function(_, isReadOnly) {
    applyTab4Readonly(!!isReadOnly);
});
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

    initHr014Tabs();
    buildRiskList();
    setRiskActive(riskActiveKey);   // 리스크 항목 선택

    $(".btn-tab4-save").off("click").on("click", function () {
        saveTab4Active();
    });

    window.hr014TabInitialized = true;
};

function initHr014Tabs() {
    var $shell = $(".hr014-shell");
    var $tabs = $("#HR014_SIDE_TABS .hr014-tab-btn");
    var $panels = $(".hr014-tab-panel");

    if ($tabs.length === 0) {
        return;
    }

    $tabs.off("click").on("click", function () {
        var target = $(this).data("tab");
        $tabs.removeClass("active");
        $(this).addClass("active");
        $panels.removeClass("active");

        if (target === "hr014-B") {
            $("#HR014_TAB_B").addClass("active");
            $(".hr014-toolbar-01").hide();
            $(".hr014-toolbar-02").show();
        } else {
            $("#HR014_TAB_A").addClass("active");
            $(".hr014-toolbar-01").show();
            $(".hr014-toolbar-02").hide();
            // 숨김 상태였다가 다시 표시되는 Tabulator는 redraw가 필요하다.
            if (window.hr014TableA) {
                window.hr014TableA.redraw(true);
            }
        }
    });
}

function buildHr014TableA() {
    if (window.hr014TableA) return;

    window.hr014TableA = new Tabulator("#TABLE_HR014_A", {
        layout: "fitColumns",
        // 관리자평가(A)는 현재 페이징 미사용. 필요 시 true/"local"로 즉시 전환 가능.
        pagination: false,
        headerSort: true,
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        // 평가의견 입력이 변경되면 탭 저장 대상에 포함
        cellEdited: function () {
            changedTabs.tab4 = true;
        },
        columns: [
            { title: "항 목", field: "cd_nm", hozAlign: "center", width: 125, minWidth: 125, maxWidth: 125 },
            {
                title: "1점",
                field: "lv1",
                hozAlign: "center",
                width: 50,
                formatter: scoreCheckboxFormatter,
                cellClick: function (e, cell) {
                    setScore(cell.getRow(), 1);
                },
                headerVertical: "middle",
                headerSort: false
            },
            {
                title: "2점",
                field: "lv2",
                hozAlign: "center",
                width: 50,
                formatter: scoreCheckboxFormatter,
                cellClick: function (e, cell) {
                    setScore(cell.getRow(), 2);
                },
                headerVertical: "middle",
                headerSort: false
            },
            {
                title: "3점",
                field: "lv3",
                hozAlign: "center",
                width: 50,
                formatter: scoreCheckboxFormatter,
                cellClick: function (e, cell) {
                    setScore(cell.getRow(), 3);
                },
                headerVertical: "middle",
                headerSort: false
            },
            {
                title: "4점",
                field: "lv4",
                hozAlign: "center",
                width: 50,
                formatter: scoreCheckboxFormatter,
                cellClick: function (e, cell) {
                    setScore(cell.getRow(), 4);
                },
                headerVertical: "middle",
                headerSort: false
            },
            {
                title: "5점",
                field: "lv5",
                hozAlign: "center",
                width: 50,
                formatter: scoreCheckboxFormatter,
                cellClick: function (e, cell) {
                    setScore(cell.getRow(), 5);
                },
                headerVertical: "middle",
                headerSort: false
            },
            {
                title: "평가의견",
                field: "cmt",
                widthGrow: 1,
                headerSort: false,
                editor: "input",
                editable: function () {
                    return !window.hr010ReadOnly;
                },
                // 수정 모드에서는 셀 클릭 시 바로 텍스트 입력 편집 시작
                cellClick: function (e, cell) {
                    if (window.hr010ReadOnly || !cell || typeof cell.edit !== "function") {
                        return;
                    }
                    cell.edit();
                }
            }
        ],
        data: []
    });
}

function loadHr014TableDataA() {
    const devId = window.currentDevId || $("#dev_id").val();
    if (!window.hr014TableA) return;

    $.ajax({
        url: "/hr014/a/list",
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
            console.log("tab4A 데이터 로드 실패");
        }
    });
}

// =============================================================================================================================

function scoreCheckboxFormatter(cell, formatterParams, onRendered) {
    const value = cell.getValue();
    const checked = value === "Y" ? "checked" : "";
    const disabled = window.hr010ReadOnly ? "disabled" : "";
    // 실제 점수 변경은 radio 자체가 아니라 cellClick(setScore)에서 처리한다.
    return `<input type="radio" ${checked} ${disabled} />`;
}


function commentInputFormatter(cell, formatterParams, onRendered) {
    var value = cell.getValue();
    var safeValue = escapeHtml(value == null ? "" : String(value));
    var disabled = window.hr010ReadOnly ? "disabled" : "";
    var placeholder = window.hr010ReadOnly ? "" : "관련 내용을 구체적으로 입력하세요.";

    onRendered(function () {
        var input = cell.getElement().querySelector(".hr014-comment-input");
        if (!input) return;
        input.oninput = function () {
            if (window.hr010ReadOnly) return;
            cell.getRow().getData().cmt = this.value;
        };
    });
    return `<input type="text" class="hr014-comment-input" placeholder="${placeholder}" value="${safeValue}" ${disabled} style="border: none"/>`;
}

function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function setScore(row, level) {
        if (window.hr010ReadOnly) {
            return;
        }
        // 한 행에서 점수는 단일 선택이므로 먼저 전체 N으로 초기화한 뒤 선택 점수를 Y로 둔다.
        var data = row.getData();
        data.lv1 = "N";
        data.lv2 = "N";
        data.lv3 = "N";
        data.lv4 = "N";
        data.lv5 = "N";
        data["lv" + level] = "Y";
        row.update(data);

        changedTabs.tab4 = true;
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
        url: "/hr014/b/list",
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
            console.log("tab4B 데이터 로드 실패");
        }
    });
}

// ================================================================================= //

// 탭1 평가 저장
function saveTableA(alertFlag) {
    if (alertFlag === undefined) {
        alertFlag = true;
    }
    if (!window.hr014TableA) {
        return;
    }
    $.ajax({
        url: "/hr014/a/save",
        type: "POST",
        data: {
            dev_id: window.currentDevId || $("#dev_id").val(),
            rows: JSON.stringify(buildSaveRows(window.hr014TableA.getData()))
        },
        success: function (response) {
            if (response.success) {
                loadHr014TableDataA();
                if (alertFlag) {
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
function saveTableB(alertFlag) {
    if (alertFlag === undefined) {
        alertFlag = true;
    }
    riskState.re_in_yn = $("#HR015_REIN_CHECK").is(":checked") ? "Y" : "N";

    $.ajax({
        url: "/hr014/b/save",
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
                if (alertFlag) {
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
    var placeholder = window.hr010ReadOnly ? "" : "관련 내용을 구체적으로 입력하세요.";

    if ($list.length === 0) {
        return;
    }
    $list.empty();
    riskKeys.forEach(function (item) {
        var $btn = $("<div class='risk-item'></div>");
        $btn.text(item.label);
        $btn.attr("data-key", item.key);
        $btn.on("click", function () {
            // 텍스트 영역은 항상 현재 선택된 항목(riskActiveKey)과 동기화된다.
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

    $("#HR015_RISK_TEXT").prop("placeholder", placeholder);

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
        // 백엔드 응답 스키마가 다를 수 있어 eval_id 후보 키를 순차 탐색한다.
        var evalId = row.eval_id || row.cd || row.item_cd || "";
        var lvl = row.lvl;

        // lvl이 비어있으면 lv1~lv5(Y/N)에서 역산한다.
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
    saveTableA(false); // alert 끔
    saveTableB(false); // alert 끔
}

window.saveTab4All = saveTab4All;

function applyTab4Readonly(isReadOnly) {
    $("#HR015_RISK_TEXT").prop("disabled", isReadOnly);
    $("#HR015_REIN_CHECK").prop("disabled", isReadOnly);
    $("#TABLE_HR014_A").toggleClass("is-readonly", !!isReadOnly);
    // tab2/tab4가 같은 id를 재사용하므로 tab4 영역으로 스코프를 제한한다.
    $(".tab4-content .hr014-side-tabs").toggleClass("is-readonly", !!isReadOnly);
}

window.applyTab4Readonly = applyTab4Readonly;



