let tableData_old = [];

// hr012.js
window.initTab2 = function() {
    // 서브 탭 초기 상태 설정
    $(".hr012-tab-btn").removeClass("active");
    $(".hr012-tab-btn[data-tab='tab2-A']").addClass("active");

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
    $(".hr012-tab-btn").off("click").on("click", function() {
        const tabId = $(this).data("tab");

        $(".hr012-tab-btn").removeClass("active");
        $(this).addClass("active");

        if (tabId === "tab2-A") {
            $("#TABLE_HR012_A").show();
            window.hr012TableA.redraw();
            $("#TABLE_HR012_B").hide();
        } else if (tabId === "tab2-B") {
            $("#TABLE_HR012_B").show();
            window.hr012TableB.redraw();
            $("#TABLE_HR012_A").hide();
        }
    });
};

function buildHr012TableA() {
    if (window.hr012TableA) return;

    window.hr012TableA = new Tabulator("#TABLE_HR012_A", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        columns: [
            { title: "코드", field: "cd", visible: false },
            { title: "구분", field: "cd_nm", hozAlign: "left", width: 180},
            { title: "상세", field: "skl_id_lst", hozAlign: "left", editor: tagEditor, formatter: tagFormatter,
                editable: () => currentMode !== "view" },
            { title: "key", field: "key", visible: false }
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
            // console.log(response);
            const dataArray = Array.isArray(response) ? response : response.res;

            if (!Array.isArray(dataArray)) {
                console.error("Tab2A 데이터 형식이 배열이 아닙니다.", response);
                return;
            }

            const tableData = dataArray.map(item => ({
                cd: item.cd,
                cd_nm: item.cd_nm,
                skl_id_lst: (item.skl_id_lst !== undefined) ? JSON.parse(item.skl_id_lst) : []}
            ));
            tableData_old = structuredClone(tableData);

            window.hr012TableA.setData(tableData);
        },
        error: function() {
            alert("Tab2A 데이터 로드 실패");
        }
    });
}

// =============================================================================================================================

function radioFormatter(cell) {
    const checked = cell.getValue() ? "checked" : "";
    const disabled = currentMode === "view" ? "disabled" : "";
    return `<input type="radio" class="circle-radio" ${checked} ${disabled}>`;
}

function buildHr012TableB() {
    if (window.hr012TableB) return;

    window.hr012TableB = new Tabulator("#TABLE_HR012_B", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        columns: [
            { title: "skl_id", field: "skl_id", visible:false },
            { title: "기술", field: "cd_nm", hozAlign: "left", widthGrow: 2 },
            ...[1,2,3,4,5].map(i => ({
                title: i.toString(),
                field: "lv" + i,
                hozAlign: "center",
                formatter: radioFormatter,
                cellClick: function(e, cell){
                    if (currentMode === "view") return;

                    const row = cell.getRow();
                    const rowData = row.getData();
                    const currentField = cell.getField();

                    // 이미 선택되어 있으면 → 해제
                    if(rowData[currentField]){
                        row.update({ lv1:false, lv2:false, lv3:false, lv4:false, lv5:false });
                        return;
                    }

                    // 클릭한 레벨만 true, 나머지는 false
                    const updateObj = { lv1:false, lv2:false, lv3:false, lv4:false, lv5:false };
                    updateObj[currentField] = true;
                    row.update(updateObj);
                }
            }))
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
                skl_id: item.skl_id,
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

function saveHr012TableB(){
    if (!window.hr012TableB) return;

    const devId = window.currentDevId;
    const tableData = window.hr012TableB.getData(); // 데이터 임시 저장
    const saveList = tableData.map(row => {
        let lvl = 0;
        if (row.lv5) lvl = 5;
        else if (row.lv4) lvl = 4;
        else if (row.lv3) lvl = 3;
        else if (row.lv2) lvl = 2;
        else if (row.lv1) lvl = 1;
        else lvl = 0;

        return {
            devId: devId,
            sklId: row.skl_id,
            lvl: lvl
        };
    });

    $.ajax({
        url: "/hr010/tab2_2_save",
        type: "POST",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(saveList),
        success: function(response) {
            // alert("숙련도 저장 완료!");
            loadHr012TableDataB();
        },
        error: function() {
            alert("숙련도 저장 실패");
        }
    });
}


// 유효성 검사
function validateHr012Form() {

    return true;
}

function saveHr012TableData() {
    // if (!validateHr012Form()) return;

    const devId = window.currentDevId;
    const userId = $.trim($("#write_user_id").val());

    // 수정하기 전 데이터
    let codes = [];
    tableData_old.forEach(row => {
        if (row.skl_id_lst !== undefined)
            Object.values(row.skl_id_lst).forEach(item => {
                if (item.code !== undefined)
                    codes.push(item.code);
            });
    });
    const param_old = codes.map(data => {
        return {
            type: "d",
            dev_id: devId,
            skl_id: data,
            userId: userId
        }
    });
    // 수정한 후 데이터
    codes = [];
    hr012TableA.getData().forEach(row => {
        if (row.skl_id_lst !== undefined)
            Object.values(row.skl_id_lst).forEach(item => {
                if (item.code !== undefined)
                    codes.push(item.code);
            });
    });
    let param = codes.map(data => {
        return {
            type: "c",
            dev_id: devId,
            skl_id: data,
            userId: userId
        }
    });
    // 삭제 된 데이터
    const delparam = param_old.filter(a => !param.some(b => b.skl_id === a.skl_id));

    // 수정 + 삭제 데이터 병합
    param = [
        ...param,
        ...delparam.filter(x => !param.some(y => y.skl_id === x.skl_id)),
    ];

    $.ajax({
        url: "/hr010/tab2_1_save",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(param),
        success: () => {
            loadHr012TableDataA();
            saveHr012TableB();
        },
        error: () => alert("저장 실패")
    });
}