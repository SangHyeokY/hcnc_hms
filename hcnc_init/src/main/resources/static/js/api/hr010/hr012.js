// hr012.js
window.initTab2 = function() {
    // 서브 탭 초기 상태 설정
    $(".tab-sub-btn").removeClass("active");
    $(".tab-sub-btn[data-tab='tab2-1']").addClass("active");

    // 테이블 보여주기/숨기기
    $("#TABLE_HR012_A").show();
    $("#TABLE_HR012_B").hide();

    // A 테이블 초기화 + 데이터 로드
    if (!window.hr012TableA) buildHr012TableA();
    loadHr012TableDataA();
};

function buildHr012TableA() {
    if (window.hr012TableA) return;

    const categories = ["Backend", "DB", "DevOps", "ERP/MES", "Frontend", "Infra", "Mobile", "기타"];
    const initData = categories.map(cat => ({ cd_nm: cat, skl_id_kst: "" }));

    window.hr012TableA = new Tabulator("#TABLE_HR012_A", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        columns: [
            { title: "구분", field: "cd_nm", hozAlign: "left" },
            { title: "상세", field: "skl_id_kst", hozAlign: "left" }
        ],
        data: initData
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

            const dataMap = {};
            dataArray.forEach(item => {
                // 서버에서 오는 skl_id_lst 문자열 그대로 사용
                dataMap[item.cd_nm] = item.skl_id_lst || "";
            });

            // 기존 테이블 데이터 가져와서 상세 값만 채움
            const updatedData = window.hr012TableA.getData().map(row => ({
                cd_nm: row.cd_nm,
                skl_id_kst: dataMap[row.cd_nm] || ""
            }));

            window.hr012TableA.setData(updatedData);
        },
        error: function() {
            alert("Tab2A 데이터 로드 실패");
        }
    });
}

function buildHr012TableB() {
    if (window.hr012TableB) return;

    const categories = ["Java", "Spring", "React"];
    const initData = categories.map(skl => ({
            skl_nm: skl,
            c1: "",
            c2: "",
            c3: "",
            c4: "",
            c5: "",
            c6: ""
        }));

    window.hr012TableB = new Tabulator("#TABLE_HR012_B", {
        layout: "fitColumns",   // 컬럼 너비 자동
        placeholder: "데이터 없음",
        columns: [
            { title: "스킬명", field: "skl_nm", hozAlign: "left", widthGrow: 2 },
            { title: "Y/N1", field: "c1", hozAlign: "center", formatter: "tickCross", tickElement: "Y", crossElement: "N" },
            { title: "Y/N2", field: "c2", hozAlign: "center", formatter: "tickCross", tickElement: "Y", crossElement: "N" },
            { title: "Y/N3", field: "c3", hozAlign: "center", formatter: "tickCross", tickElement: "Y", crossElement: "N" },
            { title: "Y/N4", field: "c4", hozAlign: "center", formatter: "tickCross", tickElement: "Y", crossElement: "N" },
            { title: "Y/N5", field: "c5", hozAlign: "center", formatter: "tickCross", tickElement: "Y", crossElement: "N" },
            { title: "Y/N6", field: "c6", hozAlign: "center", formatter: "tickCross", tickElement: "Y", crossElement: "N" }
        ],
        data: initData
    });
}

function loadHr012TableDataB() {
    const devId = window.currentDevId;
    if (!window.hr012TableA) return;

    $.ajax({
        url: "/hr010/tab2_2",
        type: "GET",
        data: { dev_id: devId },
        success: function(response) {
            const dataArray = Array.isArray(response) ? response : response.res;

            if (!Array.isArray(dataArray)) {
                console.error("Tab2B 데이터 형식이 배열이 아닙니다.", response);
                return;
            }

            // 기존 초기 데이터 가져오기
            let currentData = window.hr012TableB.getData();

            // 서버 데이터로 업데이트
            dataArray.forEach(item => {
                // 기존 스킬명이 있으면 업데이트
                const existing = currentData.find(d => d.skl_nm === item.skl_nm);
                if (existing) {
                    existing.c1 = item.c1 || "";
                    existing.c2 = item.c2 || "";
                    existing.c3 = item.c3 || "";
                    existing.c4 = item.c4 || "";
                    existing.c5 = item.c5 || "";
                    existing.c6 = item.c6 || "";
                } else {
                    // 없으면 새로 추가
                    currentData.push({
                        skl_nm: item.skl_nm,
                        c1: item.c1 || "",
                        c2: item.c2 || "",
                        c3: item.c3 || "",
                        c4: item.c4 || "",
                        c5: item.c5 || "",
                        c6: item.c6 || ""
                    });
                }
            });

            window.hr012TableB.setData(currentData);
        },
        error: function() {
            alert("Tab2B 데이터 로드 실패");
        }
    });
}

$(document).ready(function() {
    $(".tab-sub-btn").on("click", function() {
        const tabId = $(this).data("tab");

        $(".tab-sub-btn").removeClass("active");
        $(this).addClass("active");

        if (tabId === "tab2-1") {
            $("#TABLE_HR012_A").show();
            $("#TABLE_HR012_B").hide();
            // if (!window.hr012TableA) initTab2A();
        } else if (tabId === "tab2-2") {
            $("#TABLE_HR012_B").show();
            $("#TABLE_HR012_A").hide();
            // if (!window.hr012TableB) initTab2B();
        }
    });
});


