// hr014.js
// 리스크 탭(B) 임시 상태. 저장 전까지 화면 입력값을 여기에 유지한다.
const evalData = new Map(); // 평가 데이터 (프로젝트별)
const riskData = new Map(); // 리스크 데이터 (프로젝트별)

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

    // 초기 탭 상태
    $subBtns.removeClass("active");
    $subBtns.filter("[data-tab='tab4-A']").addClass("active");

    // 테이블 초기화 (한 번만 수행)
    if (!window.hr014TableA) buildHr014TableA();
    // if (!window.hr014TableB) buildHr014TableB();

    // 서버에서 항상 조회
    loadHr014TableDataA().then(function (data) {
        window.hr014TableA.setData(data);  // 초기 데이터로 덮어쓰기
        window.hr014TableA.redraw(true);
        return loadHr014TableDataB().catch(function (err) {
            console.warn("tab4B 초기 로드 실패", err);
        });
    });

    // A/B 테이블 보여주기/숨기기
    $tab4.find("#TABLE_HR014_A").show();
    $tab4.find("#TABLE_HR014_B").hide();

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
        selectableRange: false, // v5 이상이면 안전하게 추가
        resizableColumns: false,
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        // 평가의견 입력이 변경되면 탭 저장 대상에 포함
        cellEdited: function () {
            if (window.isTab4Loading) return;
            changedTabs.tab4 = true;
            evalData.set(
                window.hr013_prj_nm,
                window.hr014TableA.getData()
            );
        },
        columns: [
            { title: "항 목", field: "cd_nm", hozAlign: "center", width: 160, minWidth: 160, maxWidth: 160 },
            {
                title: "1점",
                field: "lv1",
                hozAlign: "center",
                width: 80,
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
                width: 80,
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
                width: 80,
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
                width: 80,
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
                width: 80,
                formatter: scoreCheckboxFormatter,
                cellClick: function (e, cell) {
                    setScore(cell.getRow(), 5);
                },
                headerVertical: "middle",
                headerSort: false
            },
            {
                title: "✏️ 평가의견",
                field: "cmt",
                widthGrow: 1,
                headerSort: false,
                editor: "input",
                editorParams: {
                    elementAttributes: {
                        placeholder: "클릭하여 평가의견을 작성하세요."
                    }
                },
                formatter: commentTextFormatter,
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

function loadHr014TableDataA(selectedOverride) {
    const devId = window.currentDevId || $("#dev_id").val();
    if (!window.hr014TableA) return Promise.resolve(); // 기존 return 대신 완료로 처리
    const requestedPrjId = String(selectedOverride || window.hr013_prj_nm || "").trim();

    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/hr014/a/list",
            type: "GET",
            data: {
                dev_id: devId,
                dev_prj_id: requestedPrjId
            },
            success: function (response) {
                if (!response.success) {
                    reject("fail");
                    return;
                }

                const dataArray = Array.isArray(response.list) ? response.list : [];
                const projectList = Array.isArray(response.projectList) ? response.projectList : [];
                const defaultProjectId = projectList.length ? String(projectList[0].dev_prj_id || "").trim() : "";
                let selected = requestedPrjId;

                if (!selected && defaultProjectId) {
                    selected = defaultProjectId;
                }

                if (selected && projectList.length) {
                    const found = projectList.some(function (item) {
                        return String(item.dev_prj_id || "").trim() === selected;
                    });
                    if (!found) {
                        selected = defaultProjectId;
                    }
                }

                if (selected && selected !== requestedPrjId) {
                    window.hr013_prj_nm = selected;
                    loadHr014TableDataA(selected).then(resolve).catch(reject);
                    return;
                }

                window.hr013_prj_nm = selected;

                // 자사 프로젝트 표시
                const $select = $(".select_prj_cd");

                // 항상 초기화
                $select.empty();

                projectList.forEach(function (item) {
                    const itemId = String(item.dev_prj_id || "").trim();
                    const isSelected = itemId && itemId === selected ? "selected" : "";
                    $select.append(
                        `<option value="${itemId}" ${isSelected}>${item.prj_nm}</option>`
                    );
                });
                $select.val(selected);
                updateHr014Count();
                // updateStepperUI();

                // setData 이후 렌더까지 체감상 보장하려면(선택)
                // renderComplete 이벤트 1회 대기
                if (window.hr014TableA && window.hr014TableA.once) {
                    window.hr014TableA.once("renderComplete", function () {
                        resolve(dataArray);
                    });
                } else {
                    resolve(dataArray);
                }
            },
            error: function (xhr, status, err) {
                console.log("tab4A 데이터 로드 실패");
                reject(err || new Error("tab4A load failed"));
            }
        });
    });
}

// 보유역량 평가 => 이동[TAB4 => TAB3]
async function reloadTab4(selectedPrjId) {
    showLoading();
    window.isTab4Loading = true;

    try {
        window.hr013_prj_nm = selectedPrjId;

        // 서버 데이터 가져오기
        const [aData] = await Promise.all([
            loadHr014TableDataA(),
            loadHr014TableDataB()
        ]);

        // 기존 사용자 입력이 있으면 그걸 우선
        const saved = evalData.get(selectedPrjId);

        if (saved) {
            window.hr014TableA.setData(saved);
        } else {
            window.hr014TableA.setData(aData);
        }

    } finally {
        window.isTab4Loading = false;
        hideLoading();
    }
}

// 셀렉트 선택 시, 테이블 재로드
$(document).on("change", ".select_prj_cd", async function () {
    const selectedPrjId = $(this).val();
    await reloadTab4(selectedPrjId);
});

// =============================================================================================================================

// function scoreCheckboxFormatter(cell, formatterParams, onRendered) {
//     const value = cell.getValue();
//     const checked = value === "Y" ? "checked" : "";
//     const isReadOnly = !!window.hr010ReadOnly;
//     // 실제 점수 변경은 radio 자체가 아니라 cellClick(setScore)에서 처리한다.
//     if (isReadOnly) {
//         const scoreLabel = String(cell.getColumn().getField() || "").replace("lv", "");
//         return `<span class="hr014-readonly-score" style="display:block; width:100%; text-align:center; font-weight:700; color:#20385c;">${checked ? scoreLabel : ""}</span>`;
//     }
//     const disabled = isReadOnly ? "disabled" : "";
//     return `<input type="radio" ${checked} ${disabled} />`;
// }

function scoreCheckboxFormatter(cell, formatterParams, onRendered) {
    const value = cell.getValue();
    const checked = value === "Y";
    const isReadOnly = !!window.hr010ReadOnly;

    // readonly 모드
    if (isReadOnly) {
        const scoreLabel = String(cell.getColumn().getField() || "").replace("lv", "");
        return `
            <span class="hr014-readonly-score"
                  style="display:block;
                         width:100%;
                         text-align:center;
                         font-weight:700;
                         color:#20385c;">
                ${checked ? scoreLabel : ""}
            </span>
        `;
    }

    // 수정 가능 모드
    return `
        <div class="hr014-star ${checked ? "is-on" : ""}">
            ${checked ? "★" : "☆"}
        </div>
    `;
}

// =============================================================================================================================

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
    evalData.set(window.hr013_prj_nm, window.hr014TableA.getData());
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

function commentTextFormatter(cell) {
    var value = cell.getValue();

    if (!value) {
        return `<div class="hr014-comment-text" style="color:#92979D !important;">평가의견을 구체적으로 입력하세요.</div>`;
    }
    var safeValue = escapeHtml(String(value));

    return `<div class="hr014-comment-text">${safeValue}</div>`;
}

function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function loadHr014TableDataB() {
    const devId = window.currentDevId || $("#dev_id").val();

    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/hr014/b/list",
            type: "GET",
            data: {
                dev_id: devId,
                dev_prj_id: window.hr013_prj_nm
            },
            success: function (response) {
                var risk = (response.list && response.list[0]) ? response.list[0] : {};
                riskState.leave_txt = risk.leave_txt || "";
                riskState.claim_txt = risk.claim_txt || "";
                riskState.sec_txt   = risk.sec_txt   || "";
                riskState.re_in_yn  = risk.re_in_yn  || "N";
                riskState.memo      = risk.memo      || "";

                $("#HR014_REIN_CHECK").prop("checked", riskState.re_in_yn === "Y");
                setRiskActive(riskActiveKey);

                riskData.set(window.hr013_prj_nm, {...riskState});
                resolve(risk);
            },
            error: function (xhr, status, err) {
                console.log("tab4B 데이터 로드 실패");
                reject(err || new Error("tab4B load failed"));
            }
        });
    });
}

window.loadHr014RiskData = loadHr014TableDataB;

// ================================================================================= //

// 탭1 평가 저장
function saveTableA(alertFlag) {
    if (!window.hr014TableA) return Promise.resolve("skip");

    const eval = [];

    evalData.forEach((valueArray, key) => {

        // 프로젝트 ID 없으면 스킵
        if (!key || key === "") {
            console.warn("[Tab4] dev_prj_id 없음 → [Skip]", valueArray);
            return;
        }

        valueArray.forEach(item => {
            eval.push({
                ...item,
                dev_prj_id: Number(key) // 숫자로 변환
            });
        });
    });

    // 저장할 데이터 없으면 API 호출 안함
    if (eval.length === 0) {
        console.log("[Tab4] 저장할 평가 데이터 없음 → [Skip]");
        return Promise.resolve("skip");
    }

    return $.ajax({
        url: "/hr014/a/save",
        type: "POST",
        data: {
            dev_id: window.currentDevId || $("#dev_id").val(),
            rows: JSON.stringify(buildSaveEvalRows(eval))
        }
    }).then(response => {
        if (response.success) {
            loadHr014TableDataA();
            if (alertFlag) console.log("Tab4-a 저장되었습니다.");
            return "success";
        } else {
            return Promise.reject("A 저장 실패");
        }
    });
}

// 탭2 리스크 저장
function saveTableB(alertFlag) {
    const risk = [];

    riskData.forEach((valueArray, key) => {

        // 프로젝트 ID 없으면 스킵
        if (!key || key === "") {
            console.warn("[Tab4] dev_prj_id 없음 → [Skip]", valueArray);
            return;
        }

        risk.push({
            ...valueArray,
            dev_prj_id: Number(key) // 가능하면 숫자로
        });
    });

    // 저장할 데이터 자체가 없으면 서버 호출 안함
    if (risk.length === 0) {
        console.log("[Tab4] 저장할 리스크 데이터 없음 → [Skip]");
        return Promise.resolve("skip");
    }

    return $.ajax({
        url: "/hr014/b/save",
        type: "POST",
        data: {
            dev_id: window.currentDevId || $("#dev_id").val(),
            rows: JSON.stringify(risk)
        }
    }).then(response => {
        if (response.success) {
            loadHr014TableDataB();
            if (alertFlag) console.log("Tab4-b 저장되었습니다.");
            return "success";
        } else {
            return Promise.reject("B 저장 실패");
        }
    });
}

// 리스크 항목 리스트 렌더링
function buildRiskList() {
    var $list = $("#HR014_RISK_LIST");
    if ($list.length === 0) {
        return;
    }
    var isReadOnly = !!window.hr010ReadOnly;
    var placeholder = isReadOnly ? "" : "이탈이력을 구체적으로 입력하세요.";
    $list.empty();

    if (isReadOnly) {
        riskKeys.forEach(function (item) {
            var value = item.key === "memo_txt" ? (riskState.memo || "") : (riskState[item.key] || "");
            var $row = $(`
                <div class="risk-item risk-item--readonly" data-key="${item.key}" style="display:flex; flex-direction:column; gap:6px; padding:12px 0; border-bottom:1px solid #e6edf6;">
                    <div class="risk-item-label" style="font-size:12px; font-weight:700; color:#8aa0bd;">${escapeHtml(item.label)}</div>
                    <div class="risk-item-value" style="white-space:pre-wrap; word-break:break-word; color:#20385c; font-size:14px; font-weight:600; line-height:1.6;">${escapeHtml(value || "-")}</div>
                </div>
            `);
            $list.append($row);
        });
    } else {
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
    }

    $("#HR014_RISK_TEXT").prop("placeholder", placeholder)
        .off("input").on("input", function () {
            if (window.hr010ReadOnly) return;
            var value = $(this).val();
            if (riskActiveKey === "memo_txt") riskState.memo = value;
            else riskState[riskActiveKey] = value;
            riskData.set(window.hr013_prj_nm, {...riskState});
        });

    $("#HR014_REIN_CHECK").off("change").on("change", function () {
        if (window.hr010ReadOnly) return;
        riskState.re_in_yn = $(this).is(":checked") ? "Y" : "N";
        riskData.set(window.hr013_prj_nm, {...riskState});
    });

    renderRiskReadonlyView();
}

// 리스크 항목 선택 처리
function setRiskActive(key) {
    riskActiveKey = key;

    $("#HR014_RISK_LIST .risk-item").removeClass("active");
    $("#HR014_RISK_LIST .risk-item[data-key='" + key + "']").addClass("active");

    // 선택된 항목 찾기
    var item = riskKeys.find(function (r) {
        return r.key === key;
    });

    // placeholder 변경
    if (!window.hr010ReadOnly && item) {
        $("#HR014_RISK_TEXT").prop(
            "placeholder",
            item.label + "을(를) 구체적으로 입력하세요."
        );
    }

    // 기존 값 세팅
    if (key === "memo_txt") {
        $("#HR014_RISK_TEXT").val(riskState.memo || "");
    } else {
        $("#HR014_RISK_TEXT").val(riskState[key] || "");
    }

    renderRiskReadonlyView();
}

// 탭1 저장용 payload 구성
function buildSaveEvalRows(rows) {
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
            dev_prj_id: row.dev_prj_id,
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
    return Promise.all([
        saveTableA(false),
        saveTableB(false)
    ])
        .then(([aResult, bResult]) => {

            // console.log("A 결과:", aResult);
            // console.log("B 결과:", bResult);

            // 둘 다 성공했을 때만
            if (aResult === "success" && bResult === "success") {
                console.log("[Tab4] 저장 완료");
            }
        })
        .catch(() => {
            alert("저장 중 일부 실패");
        });
}

window.saveTab4All = saveTab4All;

function applyTab4Readonly(isReadOnly) {
    var locked = !!isReadOnly;
    $(".tab4-content").toggleClass("is-readonly", locked);
    $("#HR014_RISK_TEXT").prop("disabled", locked);
    $("#HR014_REIN_CHECK").prop("disabled", locked);
    $("#TABLE_HR014_A").toggleClass("is-readonly", locked);
    // tab2/tab4가 같은 id를 재사용하므로 tab4 영역으로 스코프를 제한한다.
    $(".tab4-content .hr014-side-tabs").toggleClass("is-readonly", locked);
    // 상세(view) 모드에서도 프로젝트 목록만은 선택 가능하게 유지한다.
    $(".select_prj_cd").prop("disabled", false).prop("readonly", false);
    $(".btn-tab4-save").prop("disabled", locked).toggle(!locked);
    if (window.hr014TableA) {
        window.hr014TableA.redraw(true);
    }
    buildRiskList();
}

window.applyTab4Readonly = applyTab4Readonly;

function renderRiskReadonlyView() {
    var $detail = $("#HR014_TAB_B .risk-detail");
    if ($detail.length === 0) {
        return;
    }

    var isReadOnly = !!window.hr010ReadOnly;
    var $readonly = $detail.find("#HR014_RISK_READONLY");

    if (!isReadOnly) {
        $readonly.remove();
        $("#HR014_RISK_LIST, #HR014_RISK_TEXT, #HR014_REIN_CHECK").show();
        return;
    }

    if ($readonly.length === 0) {
        $readonly = $(`
            <div id="HR014_RISK_READONLY" style="display:flex; flex-direction:column; gap:12px;"></div>
        `);
        $detail.prepend($readonly);
    }

    var items = [];
    items.push({
        label: "재투입 가능여부",
        value: riskState.re_in_yn === "Y" ? "가능" : "불가"
    });

    riskKeys.forEach(function (item) {
        items.push({
            label: item.label,
            value: item.key === "memo_txt" ? (riskState.memo || "") : (riskState[item.key] || "")
        });
    });

    var html = items.map(function (item) {
        return `
            <div style="display:flex; flex-direction:column; gap:6px; padding:12px 0; border-bottom:1px solid #e6edf6;">
                <div style="font-size:12px; font-weight:700; color:#8aa0bd;">${escapeHtml(item.label)}</div>
                <div style="white-space:pre-wrap; word-break:break-word; color:#20385c; font-size:14px; font-weight:600; line-height:1.6;">${escapeHtml(item.value || "-")}</div>
            </div>
        `;
    }).join("");

    $readonly.html(html).show();
    $("#HR014_RISK_LIST, #HR014_RISK_TEXT, #HR014_REIN_CHECK").hide();
}

$("#HR014_RISK_TEXT").on("change", function () {
    // 텍스트 영역은 항상 현재 선택된 항목(riskActiveKey)과 동기화된다.
    riskData.set(window.hr013_prj_nm, {...riskState});
});

// 팝업이 닫힐 때 데이터 초기화
function clearTab4Popup() {
    // view 모드는 유지
    if (currentMode === "view") return;

    // 모든 프로젝트 데이터 초기화 (이게 핵심)
    evalData.delete(window.hr013_prj_nm);
    riskData.delete(window.hr013_prj_nm);

    // 상태 초기화
    riskState = {
        leave_txt: "",
        claim_txt: "",
        sec_txt: "",
        re_in_yn: "N",
        memo: ""
    };

    // UI 초기화
    $("#HR014_RISK_TEXT").val("");
    $("#HR014_REIN_CHECK").prop("checked", false);
    $("#HR014_RISK_LIST .risk-item").removeClass("active");

    riskActiveKey = "leave_txt";

    // 테이블도 초기화 (선택)
    if (window.hr014TableA) {
        window.hr014TableA.clearData();
    }
}

// 인적사항 팝업 닫혔을 때
$(".close-btn").on("click", function() {
    closeUserViewModal();
});

$(document).on("keydown", function(e) {
    if (e.key === "Escape") {
        closeUserViewModal(); // clear 직접 호출 금지
    }
});

/* 당사 프로젝트 개수 표시 */
function updateHr014Count() {
    const data = Array.isArray(window.hr013Data) ? window.hr013Data : [];
    const count = data.filter(row => String(row.inprj_yn).trim() === "Y").length;

    $("#hr014-count .hcnc-grid-count-number").text(count);

    // tab4 영역
    const $tab4Content = $(".hms-tab-wrap.tab4-content");
    const $tab4Line = $("#4-step-end");

    // tab2 제목
    const $hr012Title = $("#hr012-title");

    if (count === 0) {
        $tab4Content[0].style.setProperty("display", "none", "important");
        $tab4Line.addClass("is-hidden");

        // 보유역량 평가의 넘버링 변경 3) => 2)
        $hr012Title.contents().first()[0].textContent = "2) 보유역량 평가 ";
    } else {
        $tab4Content[0].style.setProperty("display", "block", "important");
        $tab4Line.removeClass("is-hidden");

        // 원상복구
        $hr012Title.contents().first()[0].textContent = "3) 보유역량 평가 ";
    }
}