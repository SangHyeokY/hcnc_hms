// hr012.js
window.initTab2 = function() {
    // 서브 탭 초기 상태 설정
    $(".tab-sub-btn").removeClass("active");
    $(".tab-sub-btn[data-tab='tab2-1']").addClass("active");

    // 테이블 초기화 (한 번만 수행)
    if (!window.hr012TableA) buildHr012TableA();
    if (!window.hr012TableB) buildHr012TableB();

    // 초기 데이터 로드
    loadHr012TableDataA();
    loadHr012TableDataB();

    // A/B 테이블 보여주기/숨기기
    $("#TABLE_HR012_A").show();
    $("#TABLE_HR012_B").hide();

    // 탭 클릭 이벤트
    $(".tab-sub-btn").off("click").on("click", function() {
        const tabId = $(this).data("tab");

        $(".tab-sub-btn").removeClass("active");
        $(this).addClass("active");

        if (tabId === "tab2-1") {
            $("#TABLE_HR012_A").show();
            window.hr012TableA.redraw();
            $("#TABLE_HR012_B").hide();
        } else if (tabId === "tab2-2") {
            $("#TABLE_HR012_B").show();
            window.hr012TableB.redraw();
            $("#TABLE_HR012_A").hide();
        }
    });
};

function buildHr012TableA() {
    if (window.hr012TableA) return;

    // const categories = ["Backend", "DB", "DevOps", "ERP/MES", "Frontend", "Infra", "Mobile", "기타"];
    // const initData = categories.map(cat => ({ cd_nm: cat, skl_id_kst: "" }));

    window.hr012TableA = new Tabulator("#TABLE_HR012_A", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        columns: [
            { title: "구분", field: "cd_nm", hozAlign: "left", width: 400},
            { title: "상세", field: "skl_id_kst", hozAlign: "left" }
        ],
        data: []
    });
}

function loadHr012TableDataA() {
    const devId = window.currentDevId;
    if (!window.hr012TableA) return;

    $.ajax({
        url: "/hr010/tab2",
        type: "GET",
        data: { dev_id: devId },
        success: function(response) {
            const dataArray = Array.isArray(response) ? response : response.res;

            if (!Array.isArray(dataArray)) {
                console.error("Tab2A 데이터 형식이 배열이 아닙니다.", response);
                return;
            }

//            const dataMap = {};
//            dataArray.forEach(item => {
//                // 서버에서 오는 skl_id_lst 문자열 그대로 사용
//                dataMap[item.cd_nm] = item.skl_id_lst || "";
//            });
//
//            // 기존 테이블 데이터 가져와서 상세 값만 채움
//            const updatedData = window.hr012TableA.getData().map(row => ({
//                cd_nm: row.cd_nm,
//                skl_id_kst: dataMap[row.cd_nm] || ""
//            }));
//
//            window.hr012TableA.setData(updatedData);
               const tableData = dataArray.map(item => ({
                      cd_nm: item.cd_nm,
                      skl_id_kst: item.skl_id_lst || ""
                  }));

                  window.hr012TableA.setData(tableData);
        },
        error: function() {
            alert("Tab2A 데이터 로드 실패");
        }
    });
}

// =============================================================================================================================

function scoreCheckboxFormatter(cell, formatterParams, onRendered) {
    const value = cell.getValue();
    const checked = value ? "checked" : "";
    return `<input type="checkbox" disabled ${checked} />`;
}

function buildHr012TableB() {
    if (window.hr012TableB) return;

    window.hr012TableB = new Tabulator("#TABLE_HR012_B", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        columns: [
            { title: "기술", field: "cd_nm", hozAlign: "left", widthGrow: 2 },
            { title: "1", field: "lv1", hozAlign: "center", formatter: scoreCheckboxFormatter },
            { title: "2", field: "lv2", hozAlign: "center", formatter: scoreCheckboxFormatter },
            { title: "3", field: "lv3", hozAlign: "center", formatter: scoreCheckboxFormatter },
            { title: "4", field: "lv4", hozAlign: "center", formatter: scoreCheckboxFormatter },
            { title: "5", field: "lv5", hozAlign: "center", formatter: scoreCheckboxFormatter }
        ],
        data: []
    });
}

function loadHr012TableDataB() {
    const devId = window.currentDevId;
    if (!window.hr012TableB) return;

    $.ajax({
        url: "/hr010/tab2_2",
        type: "GET",
        data: { dev_id: devId },
        success: function(response) {
            const dataArray = Array.isArray(response) ? response : response.res;
            if (!Array.isArray(dataArray)) return console.error("Tab2B 데이터 형식이 배열이 아닙니다.", response);

            const tableData = dataArray.map(item => ({
                cd_nm: item.cd_nm,
                lv1: item.lv1 === "Y",
                lv2: item.lv2 === "Y",
                lv3: item.lv3 === "Y",
                lv4: item.lv4 === "Y",
                lv5: item.lv5 === "Y"
            }));

            window.hr012TableB.setData(tableData);
        },
        error: function() {
            alert("Tab2B 데이터 로드 실패");
        }
    });
}



