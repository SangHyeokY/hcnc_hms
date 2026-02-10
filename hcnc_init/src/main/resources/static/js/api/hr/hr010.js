// 사용자 관리 - hr010.js (hcnc_hms)

// 인적사항 리스트 테이블
var userTable;

// 모드(insert: 등록 / update: 수정 / view: 상세조회)
var currentMode = "insert";

// 개발자ID
window.currentDevId = null;

// 주 개발언어 태그 입력 공통 모듈
var mainLangTagInput = null;
var pendingMainLangValue = "";

// 개인/법인 공통코드
var ctrtTypMap = [];
var ctrtTypOptions = [];

// 근무형태 공통코드
var workMdMap = [];
var workMdOptions = [];

// 탭 전체 입력/수정 여부 판단 => 전역 플래그
let initTabs = false;

// 탭 개별 입력/수정 여부 판단
const changedTabs = {
    tab1: false, // 1번째 Tab
    tab2: false, // 2번재 Tab
    tab3: false, // 3번째 Tab
    tab4: false  // 4번째 Tab
};

// 저장/로딩중 팝업 표시 여부
let isSaving = false;

// 저장된 탭 alert 표시하기 위한 리스트
const savedTabs = [];

// ============================================================================== //

// 문서 첫 생성 시 실행
$(document).ready(async function () {
    buildUserTable();

    // 근무형태 셀렉트 공통콤보
    setComCode("select_work_md", "WORK_MD", "", "cd", "cd_nm", function () {
        workMdOptions = $("#select_work_md option").map(function () {
            return { cd: this.value, cd_nm: $(this).text() };
        }).get();
        initSelectDefault("select_work_md", "상주/재택/혼합");
        if (window.userTable) {
            window.userTable.redraw(true);
        }
        workMdMap = getWorkMdMap();
    });

    // 개인, 법인 셀렉트 공통콤보
    setComCode("select_ctrt_typ", "CTRT_TYP", "", "cd", "cd_nm", function () {
        ctrtTypOptions = $("#select_ctrt_typ option").map(function () {
            return { cd: this.value, cd_nm: $(this).text() };
        }).get();
        initSelectDefault("select_ctrt_typ", "개인/법인");
        ctrtTypMap = getCtrtTypMap();
        if (window.userTable) {
            const col = window.userTable.getColumn("ctrt_typ");
            if (col) {
                col.getCells().forEach(cell => cell.reformat());
            }
        }
    });

    // 테이블 로딩이 끝날 때 까지 로딩바 표시
    showLoading();
    await loadUserTableData();
    hideLoading();

    $(".tab-panel").hide(); // Tab 숨기기

    // ================================================ //

    // 프로필 이미지 표시
    $("#fileProfile").on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // 이미지 파일만 허용
        if (!file.type.startsWith("image/")) {
            alert("이미지 파일만 선택 가능합니다.");
            return;
        }
        $("#dev_img").show();
        $("#dev_img")[0].src = URL.createObjectURL(file);
    });

    // ================================================ //

    // 검색 버튼 이벤트
    $(".btn-search").on("click", async function (event) {
        event.preventDefault();
        showLoading();
        await loadUserTableData();
        hideLoading();
    });

    // 검색어 이벤트 (Enter 입력)
    $("#searchKeyword").on("keyup", async function (event) {
        if (event.key === "Enter") {
            showLoading();
            await loadUserTableData();
            hideLoading();
        }
    });

    // 조회 버튼이벤트
    $(".btn-main-view").on("click", function () {
        const rowData = btnEditView("상세히 조회할 ");
        if (!rowData) return;
        loadUserTableImgDataAsync(rowData);
        openUserModal("view", rowData);
    });

    // 등록 버튼 이벤트
    $(".btn-main-add").on("click", function () {
        openUserModal("insert");
    });

    // 수정 버튼 이벤트
    $(".btn-main-edit").on("click", function () {
        const rowData = btnEditView("수정할 ");
        if (!rowData) return;
        loadUserTableImgDataAsync(rowData);
        openUserModal("update", rowData);
    });

    // 삭제 버튼 이벤트
    $(".btn-main-del").on("click", function () {
        deleteUserRows();
    });

    // 탭 변경 이벤트
    $(".tab-btn").on("click", function () {
        const tabId = $(this).data("tab");

        $(".tab-btn").removeClass("active");
        $(this).addClass("active");

        $(".tab-panel").hide();
        $("#" + tabId).show();
        updateTabActions(tabId);
        refreshTabLayout(tabId);
    });

    // Tab1 변경 이벤트
    $("#tab1").on("change input", "input, select, textarea", function () {
        if (initTabs) return;
        changedTabs.tab1 = true;
    });

    // Tab2 변경 이벤트
    $("#tab2").on("change input", "input, select, textarea", function () {
        if (initTabs) return;
        changedTabs.tab2 = true;
    });

    // Tab3 변경 이벤트
    $("#tab3").on("change input", "input, select, textarea", function () {
        if (initTabs) return;
        changedTabs.tab3 = true;
    });

    // Tab4 변경 이벤트
    $("#tab4").on("change input", "input, select, textarea", function () {
        if (initTabs) return;
        changedTabs.tab4 = true;
    });

    // ================================================ //

    // ★ 팝업에서 인적사항 및 tab 정보 저장 (통합 저장)
    $(document).on("click", "#btn-user-save", async function () {
        const activeTab = $(".tab-btn.active").data("tab");
        console.log("현재 탭 :", activeTab);

        // 로딩바 표시
        if (isSaving) return;
        isSaving = true;
        showLoading();

        try {
            // 기본 유효성 검사
            if (!validateUserForm()) {
                throw new Error("인적사항 유효성 실패");
            }
            // mode가 update일 때, tab별로 유효성 검사
            if (currentMode !== "insert" && currentMode !== "view") {
                if (changedTabs.tab1 && !validateHr011Form()) throw new Error("tab1 검증 실패");
                if (changedTabs.tab2 && !validateHr012Form()) throw new Error("tab2 검증 실패");
                if (changedTabs.tab3 && !window.hr013Table) throw new Error("tab3 없음");
                if (changedTabs.tab4 && !window.hr014TableA) throw new Error("tab4 없음");
            }

            // 인적사항 저장 (여기서 서버 작업 끝날 때까지 대기)
            const success = await upsertUserBtn();
            if (!success) {throw new Error("인적사항 저장 실패");}

            // 탭 변경 내용을 DB에 저장 (순차)
            if (changedTabs.tab1) {
                await saveHr011TableData();
                savedTabs.push("소속 및 계약정보");
            }
            if (changedTabs.tab2) {
                await saveHr012TableData();
                savedTabs.push("보유역량 및 숙련도");
            }
            if (changedTabs.tab3) {
                await saveHr013InlineRows();
                savedTabs.push("프로젝트");
            }
            if (changedTabs.tab4) {
                await saveTab4All();
                savedTabs.push("평가 및 리스크");
            }

            Object.keys(changedTabs).forEach(k => changedTabs[k] = false);

            // 저장 완료 알림
            if (
                currentMode === "insert" ||
                (!changedTabs.tab1 && !changedTabs.tab2 && !changedTabs.tab3 && !changedTabs.tab4)
            ) {
                alert("인적사항 정보가 저장되었습니다.");
            } else {
                alert(
                    `인적사항\n- ${savedTabs.join("\n- ")}\n저장이 완료되었습니다.`
                );
            }

            // 신규 등록이었을 경우, 팝업 종료
            if (currentMode === "insert") {
                closeUserViewModal();
            }
        } catch (e) {
            console.error(e);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            isSaving = false;

            showLoading();
            userTable.clearData();
            await loadUserTableData();
            hideLoading();

            console.log("저장 작업 종료, 로딩 상태 :", isSaving); // false여야 정상
        }
    });
});

// ============================================================================== //

// 역할 코드 -> 라벨 맵 생성 (근무형태 : 상주/재택/혼합)
function getWorkMdMap() {
    var map = {};
    if (workMdOptions && workMdOptions.length) {
        workMdOptions.forEach(function (item) {
            if (item.cd) {
                map[item.cd] = item.cd_nm || item.cd;
            }
        });
        return map;
    }
    $("#select_work_md option").each(function () {
        var val = this.value;
        if (val) {
            map[val] = $(this).text();
        }
    });
    return map;
}

// 역할 코드 -> 라벨 맵 생성 (계약형태 : 개인/법인)
function getCtrtTypMap() {
    var map = {};
    if (ctrtTypOptions && ctrtTypOptions.length) {
        ctrtTypOptions.forEach(function (item) {
            if (item.cd) {
                map[item.cd] = item.cd_nm || item.cd;
            }
        });
        return map;
    }
    $("#select_ctrt_typ option").each(function () {
        var val = this.value;
        if (val) {
            map[val] = $(this).text();
        }
    });
    return map;
}

// 콤보 기본 옵션/선택 처리
function initSelectDefault(selectId, placeholderText) {
    var $sel = $("#" + selectId);
    if ($sel.find("option[value='']").length === 0) {
        $sel.prepend("<option value=''>" + placeholderText + "</option>");
    }
    $sel.val("");
    if (!$sel.val()) {
        $sel.find("option:first").prop("selected", true);
    }
}

// 역할 값이 객체로 와도 문자열로 정규화
function normalizeJobValue(value) {
    if (value == null) {
        return "";
    }
    if (typeof value === "object") {
        var current = value;
        var guard = 0;
        while (current && typeof current === "object" && guard < 4) {
            var candidate = current.cd || current.value || current.label || current.cd_nm || current.name || current.nm || current.id;
            if (candidate && typeof candidate !== "object") {
                return String(candidate);
            }
            if (candidate && typeof candidate === "object") {
                current = candidate;
                guard += 1;
                continue;
            }
            break;
        }
        return "";
    }
    return String(value);
}

// ============================================================================== //

// 인적사항 리스트 테이블 생성 정의
function buildUserTable() {
    if (!window.Tabulator) {
        console.error("Tabulator가 로드되지 않았습니다.");
        return;
    }
    if (!document.getElementById("TABLE_HR010_A")) {
        return;
    }

    // 체크박스 싱크 및 정의
    function syncRowCheckbox(row, checked) {
        var rowElement = row.getElement();
        if (!rowElement) {
            return;
        }
        var checkbox = rowElement.querySelector(".row-check");
        if (checkbox) {
            checkbox.checked = checked;
        }
    }
    function syncTableCheckboxes(table) {
        if (!table || typeof table.getRows !== "function") {
            return;
        }
        table.getRows().forEach(function (row) {
            syncRowCheckbox(row, row.isSelected());
        });
    }
    function toggleRowSelection(row) {
        if (row.isSelected()) {
            row.deselect();
        } else {
            row.select();
        }
    }

    // 테이블 정의
    userTable = new Tabulator("#TABLE_HR010_A", {
        layout: "fitColumns",
        height: "100%",
        headerSort: true,
        placeholder: "데이터 없음",
        headerHozAlign: "center",
        selectable: 1, // 1개만 선택 가능
        columnDefaults: {
            resizable: true,
            cellClick: function (e, cell) {
                toggleRowSelection(cell.getRow());
                e.stopPropagation();
            }
        },
        columns: [
            {
                title: "",
                field: "checkBox",
                formatter: function (cell) {
                    var checked = cell.getRow().isSelected() ? " checked" : "";
                    return "<input type='checkbox' class='row-check'" + checked + " />";
                },
                cellClick: function (e, cell) {
                    toggleRowSelection(cell.getRow());
                    e.stopPropagation();
                    e.preventDefault();
                },
                frozen: true,
                width: 50,
                headerSort: false,
                download: false
            },
            { title: "성명", field: "dev_nm", hozAlign: "center", headerSort: true , widthGrow:1, minWidth: 100, frozen: true},
            {
                title: "평가 등급",
                field: "grade",
                hozAlign: "center",
                widthGrow:2, minWidth: 120, frozen: true,
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    if (!d.grade) return "-";
                    return formatGradeLabel(d.grade, d.score);
                }
            },
            {   title: "주 개발언어",
                field: "main_lang_nm",
                widthGrow: 4, minWidth: 180, frozen: true,
                formatter: function (cell) {
                    const value = cell.getValue();
                    if (!value) return "";
                    return `<div style="
                        text-align:left;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;">
                        ${value.split(",").map(v => v.trim()).join(", ")}
                    </div>`;
                }
            },
            {   title: "희망단가",
                field: "hope_rate_amt",
                widthGrow: 3, minWidth: 150, frozen: true,
                formatter: function(cell){
                    const value = cell.getValue();
                    return `<div style="text-align:right;">${amountFormatter(value)}</div>`;
                }
            },
            { title: "dev_id", field: "dev_id", visible: false },
            { title: "생년월일", field: "brdt", headerSort: true, widthGrow: 2, minWidth: 120 },
            { title: "연락처", field: "tel", widthGrow: 3, minWidth: 150, headerSort: false },
            {   title: "이메일",
                field: "email", widthGrow:4, minWidth: 180, headerSort: false,
                formatter: function (cell) {
                    const value = cell.getValue();
                    if (!value) return "";
                    return `<div style="
                        text-align:left;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;">
                        ${value}
                    </div>`;
                }
            },
            {   title: "거주지역",
                field: "region",
                widthGrow:1, minWidth: 100,
                formatter: function(cell){
                    const value = cell.getValue();
                    if (!value) return "";
                    return `<div style="
                        text-align:left;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;">
                        ${value}
                    </div>`;
                }
            },
            {
                title: "경력연차",
                field: "exp_yr",
                hozAlign: "center",
                widthGrow: 1,
                minWidth: 100,
                formatter: function(cell){
                    return `<div style="text-align:right;">${formatCareerYearMonth(cell.getValue())}</div>`;
                }
            },
            {   title: "최종학력",
                field: "edu_last",
                widthGrow:4, minWidth: 180, headerSort: false,
                formatter: function (cell) {
                    const value = cell.getValue();
                    if (!value) return "";
                    return `<div style="
                        text-align:left;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;">
                        ${value}
                    </div>`;
                }
            },
            {   title: "보유 자격증",
                field: "cert_txt" ,
                widthGrow:4, minWidth: 180, headerSort: false,
                formatter: function (cell) {
                    const value = cell.getValue();
                    if (!value) return "";
                    return `<div style="
                        text-align:left;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;">
                        ${value}
                    </div>`;
                }
            },
            { title: "투입 가능 시점", field: "avail_dt", widthGrow:2, minWidth: 120 },
            {   title: "계약 형태",
                field: "ctrt_typ",
                formatter: function (cell) {
                    const val = cell.getValue();
                    return (ctrtTypMap && ctrtTypMap[val]) ? ctrtTypMap[val] : val;
                }, editor: false, editable: false, widthGrow: 1, minWidth: 100
            },
        ],
        data: [],
        // 행 클릭
        rowSelected: function (row) {
            syncRowCheckbox(row, true);
        },
        // 행 선택 해제
        rowDeselected: function (row) {
            syncRowCheckbox(row, false);
        },
        // 체크박스 선택
        rowSelectionChanged: function () {
            syncTableCheckboxes(userTable);
        },
        // 행 더블 클릭
        rowDblClick: function (e, row) {
            var rowData = row.getData();
            loadUserTableImgDataAsync(rowData);
            openUserModal("view", rowData);
        }
    });
}

// ============================================================================== //

// db로부터 리스트 불러와서 인적사항 테이블에 넣기
async function loadUserTableData() {
    if (!userTable || typeof userTable.setData !== "function") {
        return;
    }

    // 키워드 검색
    let keyword = $("#searchKeyword").val().trim();
    if (keyword) {
        keyword = keyword
            .split(/[\s,]+/)
            .filter(w => w)
            .map(w => "+" + w)
            .join(" ");
    } else {
        keyword = null;
    }
    console.log("키워드 :", keyword);

    try {
        // 리스트 불러오기
        const response = await $.ajax({
            url: "/hr010/list",
            type: "GET",
            data: {
                dev_nm: $("#insertNM").val(),
                searchKeyword: keyword
            }
        });

        const list = response.res || [];
        if (!list.length) {
            userTable.setData([]);
            return;
        }

        // 점수 불러오기
        const scorePromises = list.map(row =>
            fetchUserScore(row.dev_id)
                .then(res => ({
                    dev_id: row.dev_id,
                    ...(res.res || {})
                }))
                .catch(() => ({
                    dev_id: row.dev_id
                }))
        );

        const scores = await Promise.all(scorePromises);

        const scoreMap = {};
        scores.forEach(s => {
            scoreMap[s.dev_id] = s;
        });

        list.forEach(row => {
            const s = scoreMap[row.dev_id] || {};
            row.grade = s.rank || "";
            row.score = s.score || 0;
        });

        userTable.setData(list);
        // userTable.setData(response.res || []);
    } catch (e) {
        console.error(e);
        alert("사용자 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

// db로부터 프로필 이미지 가져오기
function loadUserTableImgDataAsync(data) {
    return new Promise((resolve, reject) => {
        if (!userTable || typeof userTable.setData !== "function") {
            resolve(); // 테이블 없으면 그냥 resolve
            return;
        }

        $.ajax({
            url: "/hr010/list/img",
            type: "GET",
            xhrFields: { responseType: "arraybuffer" },
            data: data,
            success: function (response) {
                const blob = new Blob([response], { type: "image/jpeg" });
                const imgUrl = URL.createObjectURL(blob);

                if (response.byteLength > 0)
                    $("#dev_img").show();
                else
                    $("#dev_img").hide();

                $("#dev_img")[0].src = imgUrl;
                resolve(); // 완료 시 resolve
            },
            error: function (e) {
                console.error(e);
                alert("사용자 데이터를 불러오는 중 오류가 발생했습니다.");
                resolve(); // 에러여도 UI는 표시 가능하도록 resolve
            }
        });
    });
}

// ============================================================================== //

// 인적사항 데이터 신규 등록/수정 이벤트
function upsertUserBtn() {
    return new Promise((resolve, reject) => {

        var payload = {
            dev_id: $("#dev_id").val(),
            dev_nm: $("#dev_nm").val(),
            brdt: $("#brdt").val(),
            tel: $("#tel").val(),
            email: $("#email").val(),
            region: $("#region").val(),
            main_lang: $("#main_lang").val(),
            exp_yr: composeCareerExpValue(),
            edu_last: $("#edu_last").val(),
            cert_txt: $("#cert_txt").val(),
            hope_rate_amt: normalizeAmountValue($("#hope_rate_amt").val()),
            avail_dt: $("#avail_dt").val(),
            ctrt_typ: $("#select_ctrt_typ").val(),
            work_md: $("#select_work_md").val(),
            dev_type: $("#dev_type").val(),
            crt_by: ""
        };

        const activeTab = $(".tab-btn.active").data("tab");
        const file = $("#fileProfile")[0].files[0];
        const fd = new FormData();

        // 1) 텍스트 필드들 추가
        Object.keys(payload).forEach(k => {
            if (k === "dev_img") return;
            if (payload[k] == null) return;
            fd.append(k, payload[k]);
        });

        // 2) 파일 추가 (컨트롤러 @RequestPart 이름과 동일해야 함)
        if (file) fd.append("dev_img", file);

        $.ajax({
            url: "/hr010/upsert",
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            dataType: "json",

            success: function (response) {
                if (!response || response.success === false) {
                    alert(response?.message || "저장에 실패했습니다.");
                    resolve(false);
                    return;
                }
                if (response.dev_id) {
                    window.currentDevId = response.dev_id;
                    $("#dev_id").val(response.dev_id);
                }
                resolve(true);
            },
            error: function (xhr) {
                alert("저장 중 오류가 발생했습니다.");
                 reject(xhr);
            }
        });
    });
}

// ============================================================================== //

// 데이터 삭제 이벤트
function deleteUserRows() {
    var selectedRows = userTable.getSelectedRows();
    if (selectedRows.length === 0) {
        alert("삭제할 사용자를 선택해주세요.");
        return;
    }
    if (!confirm("선택한 사용자를 삭제하시겠습니까?")) {
        return;
    }
    var pending = selectedRows.length;

    selectedRows.forEach(function (row) {
        $.ajax({
            url: "/hr010/delete",
            type: "POST",
            data: { dev_id: row.getData().dev_id },
            complete: function () {
                pending -= 1;
                if (pending === 0) {
                    loadUserTableData();
                    alert("삭제되었습니다.");
                }
            },
            error: function () {
                alert("삭제 중 오류가 발생했습니다.");
            }
        });
    });
}

// ============================================================================== //

// 모달(팝업) 열리는 이벤트 처리
openUserModal = async function(mode, data) {
    currentMode = mode;
    initTabs = true;
    const $modal = $("#view-user-area");

    showLoading(); // 로딩바 표시
    $modal.removeClass("show");
    $modal.show();

    if(mode === "insert") clearUserForm();
    else fillUserForm(data || userTable.getSelectedRows()[0].getData());
    setModalMode(mode);

    initAllTabs(); // 모든 tab 초기화

    // tab1 활성화
    $(".tab-btn").removeClass("active");
    $(".tab-btn[data-tab='tab1']").addClass("active");
    $(".tab-panel").hide();
    $("#tab1").show();

    window.hr014TabInitialized = false;
    initMainLangTags();

    // 조회, 수정할 때
    if (mode !== "insert" && data?.dev_id) {
        // console.log("Promise로 팝업에 띄울 데이터 호출 중...");
        updateTabActions("tab1");
        refreshTabLayout("tab1");
        // 모두 Promise로 변경
        await Promise.all([
            // loadUserScoreAsync(data.dev_id),
            loadUserTableImgDataAsync(data)
        ]);
        // console.log("Tab1 새로고침 완료");
    }

    // 팝업 표시 완료 + 로딩 종료
    setTimeout(() => {
        initTabs = false;
        $modal.addClass("show");
        hideLoading(); // 로딩바 숨김
    }, 100);
};

// 모든 tab 초기화
function initAllTabs() {
    initTab1();
    if (currentMode !== "insert") { // 등록 mode가 아닐 경우
        initTab2();
        initTab3();
        initTab4();
    }
}

// 팝업에 인적사항 데이터 채워넣기
function fillUserForm(d) {
    window.currentDevId = d.dev_id;
    $("#dev_id").val(d.dev_id || "");
    $("#dev_nm").val(d.dev_nm || "");
    $("#brdt").val(d.brdt || "");
    $("#tel").val(d.tel || "");
    $("#email").val(d.email || "");
    $("#region").val(d.region || "");

    $("#main_lang").val(d.main_lang || "");
    pendingMainLangValue = d.main_lang || ""; // main_lang 채워넣기 전용
    if (mainLangTagInput) {
        mainLangTagInput.setFromValue(pendingMainLangValue);
    }

    setCareerSpinInputs(d.exp_yr);
    $("#edu_last").val(d.edu_last || "");
    $("#cert_txt").val(d.cert_txt || "");
    $("#avail_dt").val(d.avail_dt || "");
    $("#dev_id_input").text(d.dev_id || "");

    $("#hope_rate_amt").val(
        formatAmount(d.hope_rate_amt)
    );

    $("#dev_type").val(d.dev_type || "");

    // 셀렉트 work_md
    if (d.work_md && workMdMap[d.work_md]) {
        $("#select_work_md").val(d.work_md);
    } else {
        $("#select_work_md").val("");
    }

    // 셀렉트 ctrt_typ
    if (d.ctrt_typ && ctrtTypMap[d.ctrt_typ]) {
        $("#select_ctrt_typ").val(d.ctrt_typ);
    } else {
        $("#select_ctrt_typ").val("");
    }

    $("#dev_type").val(""); // 기본값 초기화

    // '소속 구분' 값 재할당
    if (d.dev_id) {
        if (d.dev_id.startsWith("HCNC_F")) {
            $("#dev_type").val("HCNC_F");
        } else if (d.dev_id.startsWith("HCNC_S")) {
            $("#dev_type").val("HCNC_S");
        }
    }

    const rank = d.grade || "";
    const score = d.score || 0;
    if (rank) {
        $("#grade").text(formatGradeLabel(rank, score));
    } else {
        $("#grade").text("");
    }
}

// 팝업 닫히면 값 초기화하기
function clearUserForm() {
    window.currentDevId = null;
    $("#dev_img").hide();
    $("#dev_img")[0].src = "";
    $("#dev_id").val("");
    $("#dev_nm").val("");
    $("#brdt").val("");
    $("#tel").val("");
    $("#email").val("");
    $("#region").val("");

    $("#main_lang").val("");
    pendingMainLangValue = "";
    if (mainLangTagInput) {
        mainLangTagInput.clear();
    }

    setCareerSpinInputs("");
    $("#edu_last").val("");
    $("#cert_txt").val("");
    $("#avail_dt").val("");
    $("#hope_rate_amt").val("");
    $("#dev_id_input").text("");

//    $("#grade").text("");
//    $("#score").text("");
    $("#dev_type").val("");

    $("#select_work_md").val("");
    $("#select_ctrt_typ").val("");

    // $("#show_devId").text("");
    // $("#dev_type2").text("");
    // $("#devTypeWrap").hide();

    $("#score").text("-");
}

// ============================================================================== //

// 팝업의 역할에 따라 sub-title 변경 되기
function setModalMode(mode) {
    console.log("Mode 구분 :", mode);

    const isView   = mode === "view"; // 상세(조회)
    const isInsert = mode === "insert"; // 등록
    const isUpdate = mode === "update"; // 수정

    var $modal = $("#view-user-area");
    var $title = $modal.find("#modal-title");
    $modal.toggleClass("is-view-mode", isView);

    // title 표시
    if (isView) $title.text("상세");
    else if (isInsert) $title.text("등록");
    else if (isUpdate) $title.text("수정");

    // 등록 페이지의 경우
    if (isInsert) {
        $("#dev_id_input").text("-");
        $("#grade").text("");
    }

    if (isView) {
        // 조회 mode => 수정불가
        $modal.find("input, textarea")
              .prop("readonly", true)
              .prop("disabled", true);
        $modal.find("select").prop("disabled", true);
    }
    else {
        // 등록, 수정 mode => 수정가능
        $modal.find("input, textarea")
              .prop("readonly", false)
              .prop("disabled", false)
              .removeAttr("readonly")
              .removeAttr("disabled");
        $modal.find("select")
              .prop("disabled", false)
              .removeAttr("disabled");
    }
    $(".career-spin-btn").prop("disabled", isView);

    // 등록 mode일 경우에만 '소속 구분' 입력 가능
    if (isInsert) {
        $("#dev_type").prop("disabled", false);
    } else {
        $("#dev_type").prop("disabled", true);
    }

    // Mode에 따른 버튼 숨김/표시
    $("#btn-user-save").toggle(isInsert || isUpdate);
    $("#btn-excel").toggle(isView);
    $(".tab-article").toggle(!isInsert);
    $("#main_lang_input").toggle(!isView);
    $(".showingbtn").toggle(isUpdate || isInsert);

    const $tagBox = $("#mainLangTagList").closest(".tag-input-box");
    $tagBox.toggleClass("is-readonly", isView);
    $tagBox.find(".tag-help").toggle(!isView);

    updateTabActions($(".tab-btn.active").data("tab"));

    // Tab 연동
    window.hr010ReadOnly = isView;
    broadcastTabReadonly(isView);
}

// Tab의 readonly 제어
function broadcastTabReadonly(isReadOnly) {
    $(document).trigger("tab:readonly", [isReadOnly]);
}

// ============================================================================== //

// 모달 닫히면 영역 사라지게 하기
function closeUserViewModal() {
    // document.getElementById("view-user-area").style.display = "none";
    const $modal = $("#view-user-area");
    $modal.removeClass("show");

    setTimeout(() => {
        $modal.hide();
        clearUserForm();
    }, 250);
}

// 탭별 버튼 표시
function updateTabActions(tabId) {
    if (window.hr010ReadOnly) {
        $(".tab-actions").removeClass("active");
        $(".tab-action-bar").hide();
        return;
    }
    $(".tab-action-bar").show();
    $(".tab-actions").removeClass("active");
    $(".tab-actions[data-tab='" + tabId + "']").addClass("active");
}

// 탭 표시 후 레이아웃 재계산
function refreshTabLayout(tabId) {
    setTimeout(function () {
        if (tabId === "tab2" && window.hr012TableA) {
            window.hr012TableA.redraw(true);
        }
        if (tabId === "tab2" && window.hr012TableB) {
            window.hr012TableB.redraw(true);
        }
        if (tabId === "tab3" && window.hr013Table) {
            window.hr013Table.redraw(true);
        }
        if (tabId === "tab4" && window.hr014TableA) {
            window.hr014TableA.redraw(true);
        }
    }, 10);
}

// ============================================================================== //

// 데이터 유효성 검사
function validateUserForm() {

    // 값 가져오기
    const dev_nm = ($("#dev_nm").val() || "").trim();            // 성명
    const brdt = ($("#brdt").val() || "").trim();                // 생년월일
    // ==
    const tel = ($("#tel").val() || "").trim();                  // 연락처
    const email = ($("#email").val() || "").trim();              // 이메일
    // ==
    const expYrYear = ($("#exp_yr_year").val() || "").trim();    // 경력연차(년)
    const expYrMonth = ($("#exp_yr_month").val() || "").trim();  // 경력연차(개월)
    const eduLast = ($("#edu_last").val() || "").trim();         // 최종학력
    // ==
    const devType = ($("#dev_type").val() || "").trim();         // 소속 구분 (dev_id에서 S: 직원, F: 프리랜서)
    const workMd = ($("#select_work_md").val() || "").trim();    // 근무 가능형태 (01: 상주, 02: 재택, 03: 혼합)
    // ==
    const hopeRaw = normalizeAmountValue($("#hope_rate_amt").val()); // 희망단가 금액
    const availDt = ($("#avail_dt").val() || "").trim();         // 투입 가능일
    const ctrtTyp = ($("#select_ctrt_typ").val() || "").trim();  // 계약 형태 (01: 개인, 02: 법인)

    // 최대 입력 가능 숫자
    const MAX_AMT = 999999999;

    // ↓ 데이터 입력 순서대로 작성할 것

    // 개발자 이름
    if (!dev_nm) {
        alert("성명을 입력하세요.");
        $("#dev_nm").focus();
        return false;
    }

    // 생년월일
    if (!brdt) {
        alert("생년월일을 입력하세요.");
        $("#brdt").focus();
        return false;
    }

    // 전화번호
    if (!tel) {
        alert("연락처를 입력하세요.");
        $("#tel").focus();
        return false;
    }

    // 전화번호 (숫자만 입력)
    if (!/^[0-9\-]+$/.test(tel)) {
        alert("연락처 형식이 올바르지 않습니다.");
        $("#tel").focus();
        return false;
    }

    // 이메일
    if (!email) {
        alert("이메일을 입력하세요.");
        $("#email").focus();
        return false;
    }

    const emailRegex =
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(email)) {
        alert("이메일 형식이 올바르지 않습니다.");
        $("#email").focus();
        return false;
    }

    // 경력연차
    if (expYrYear === "" || expYrMonth === "") {
        alert("경력연차(년/개월)를 입력하세요.");
        if (expYrYear === "") {
            $("#exp_yr_year").focus();
        } else {
            $("#exp_yr_month").focus();
        }
        return false;
    }
    if (!/^\d+$/.test(expYrYear) || !/^\d+$/.test(expYrMonth)) {
        alert("경력연차는 숫자만 입력 가능합니다.");
        $("#exp_yr_year").focus();
        return false;
    }

    var expYearNum = Number(expYrYear);
    var expMonthNum = Number(expYrMonth);
    if (expYearNum < 0 || expYearNum > 99 || expMonthNum < 0 || expMonthNum > 99) {
        alert("경력연차의 년/개월은 0~99 범위로 입력하세요.");
        $("#exp_yr_year").focus();
        return false;
    }

    syncCareerExpValue();

    // 최종학력
    if (!eduLast) {
        alert("최종학력을 입력하세요.");
        $("#edu_last").focus();
        return false;
    }

    // 소속 구분
    if (!devType || devType == "") {
        alert("소속을 선택해주세요.");
        $("#dev_type").focus();
        return false;
    }

    // 근무 가능 형태
    if (!workMd || workMd == "") {
        alert("근무형태를 선택해주세요.");
        $("#select_work_md").focus();
        return false;
    }

    // 희망단가
    if (!hopeRaw) {
        alert("희망단가를 입력해주세요.");
        $("#hope_rate_amt").focus();
        return false;
    }
    if (Number(hopeRaw) > MAX_AMT) {
        alert("희망단가는 최대 999,999,999원까지 입력 가능합니다.");
        $("#hope_rate_amt").focus();
        return false;
    }

    // 투입 가능일
    if (!availDt) {
        alert("투입 가능 시점을 입력하세요.");
        $("#avail_dt").focus();
        return false;
    }

    // 계약 형태
    if (!ctrtTyp || ctrtTyp == "") {
        alert("계약 형태를 선택해주세요.");
        $("#select_ctrt_typ").focus();
        return false;
    }

    return true;
}

// ============================================================================== //

// 주 개발언어 태그 공통화 초기화
function initMainLangTags() {
    if (mainLangTagInput) {
        return;
    }
    mainLangTagInput = createTagInput({
        inputSelector: "#main_lang_input",
        listSelector: "#mainLangTagList",
        hiddenSelector: "#main_lang",
        datalistSelector: "#main_lang_datalist",
        getValue: function (item) { return item.cd; },
        getLabel: function (item) { return item.cd_nm; },
        matchMode: "prefix"
    });

    // 공통 콤보 박스
    setComCode("main_lang_select", "skl_id", "", "cd", "cd_nm", function (res) {
        mainLangTagInput.setOptions(res || []);
        mainLangTagInput.setFromValue(pendingMainLangValue || $("#main_lang").val());
    });
}

// ============================================================================== //

// 전화번호 자동 변환
$("#tel").on("input", function () {
    let val = $(this).val().replace(/[^0-9]/g, "");

    if (val.length < 4) {
        $(this).val(val);
    } else if (val.length < 8) {
        $(this).val(val.replace(/(\d{3})(\d+)/, "$1-$2"));
    } else {
        $(this).val(val.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3"));
    }
});

// 경력연차(년/개월) 스핀 보정
$("#exp_yr_year, #exp_yr_month").on("input change", function () {
    this.value = clampCareerSpinValue(this.value);
    syncCareerExpValue();
});

// 경력연차 커스텀 스핀 버튼(+/-)
$(document).on("click", ".career-spin-btn", function () {
    var targetSelector = $(this).data("target");
    var step = parseInt($(this).data("step"), 10) || 0;
    if (!targetSelector || step === 0) {
        return;
    }

    var $target = $(targetSelector);
    if (!$target.length || $target.prop("disabled")) {
        return;
    }

    var current = clampCareerSpinValue($target.val());
    var next = clampCareerSpinValue(current + step);
    $target.val(next).trigger("input");
});

// 희망단가는 숫자만 입력 가능
$("#hope_rate_amt").on("input", function () {
    let input_number = this.value.replace(/[^0-9]/g, "");
    this.value = formatAmount(input_number);
});

// 숫자에 콤마 표시
function formatNumber(num) {
    if (!num) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 테이블에 점수 등급 표시
function fetchUserScore(devId) {
    return $.ajax({
        url: "/hr010/getScore",
        type: "GET",
        data: { dev_id: devId }
    });
}

// 점수 계산
//function loadUserScoreAsync(devId) {
//    return new Promise((resolve, reject) => {
//        $("#grade").text("계산중...");
//        $("#score").text("");
//
//        $.ajax({
//            url: "/hr010/getScore",
//            type: "GET",
//            data: { dev_id: devId },
//            success: function(res) {
//                const data = res.res || {};
//                $("#grade").text(data.rank || "");
//                $("#score").text(`(${data.score || 0}점)`);
//                resolve(); // 완료 시 resolve 호출
//            },
//            error: function(err) {
//                console.error(err);
//                reject(err); // 에러 시 reject 호출
//            }
//        });
//    });
//}

// alert 문자 가공
function btnEditView(alertPrefix = "") {
    if (!userTable) return null;
    const rows = userTable.getSelectedRows();
    if (rows.length === 0) {
        alert(alertPrefix + "대상을 선택하세요.");
        return null;
    }
    if (rows.length > 1) {
        alert(alertPrefix + "한 명만 선택해주세요.");
        return null;
    }
    return rows[0].getData();
}

// 계약단가(,),(테이블표)
function amountFormatter(value, data, cell, row, options) {
    if (value === null || value === undefined || value === "") {
        return "";
    }
    return formatAmount(value);
}

// 팝업에서도 마찬가지로 (,) 표시
function formatAmount(value) {
    if (value === null || value === undefined || value === "") return "";

    const numeric = value
        .toString()
        .replace(/[^0-9]/g, "")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return numeric ? numeric + "원" : "";
}

function normalizeAmountValue(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[^0-9]/g, "");
}

function formatGradeLabel(rank, score) {
    if (!rank) return "";
    return `${rank}등급 (${score || 0}점)`;
}

function clampCareerSpinValue(value) {
    var num = parseInt(value, 10);
    if (!Number.isFinite(num) || isNaN(num)) {
        return 0;
    }
    if (num < 0) return 0;
    if (num > 99) return 99;
    return num;
}

function parseCareerExpValue(value) {
    if (value === null || value === undefined || value === "") {
        return { years: 0, months: 0 };
    }

    var raw = String(value).trim();
    if (!raw) {
        return { years: 0, months: 0 };
    }

    if (/^\d+(\.\d+)?$/.test(raw)) {
        var parts = raw.split(".");
        var years = clampCareerSpinValue(parts[0]);
        var months = 0;
        if (parts.length > 1) {
            var monthText = String(parts[1] || "").replace(/[^\d]/g, "");
            months = clampCareerSpinValue(monthText || 0);
        }
        return { years: years, months: months };
    }

    var yearMatch = raw.match(/(\d+)\s*년/);
    var monthMatch = raw.match(/(\d+)\s*개?월/);
    return {
        years: clampCareerSpinValue(yearMatch ? yearMatch[1] : 0),
        months: clampCareerSpinValue(monthMatch ? monthMatch[1] : 0)
    };
}

function setCareerSpinInputs(value) {
    var parsed = parseCareerExpValue(value);
    $("#exp_yr_year").val(parsed.years);
    $("#exp_yr_month").val(parsed.months);
    syncCareerExpValue();
}

function composeCareerExpValue() {
    var years = clampCareerSpinValue($("#exp_yr_year").val());
    var months = clampCareerSpinValue($("#exp_yr_month").val());
    if (months === 0) {
        return String(years);
    }
    return years + "." + months;
}

function syncCareerExpValue() {
    $("#exp_yr").val(composeCareerExpValue());
}

function formatCareerYearMonth(value) {
    if (value === null || value === undefined || value === "") {
        return "";
    }

    var raw = String(value).trim();
    if (!raw) {
        return "";
    }

    if (!/^\d+(\.\d+)?$/.test(raw)) {
        return raw;
    }

    var parts = raw.split(".");
    var years = parseInt(parts[0], 10) || 0;
    if (parts.length === 1) {
        return years + "년";
    }

    var monthsRaw = String(parts[1] || "");
    if (!monthsRaw || /^0+$/.test(monthsRaw)) {
        return years + "년";
    }

    var months = parseInt(monthsRaw, 10);
    if (!months) {
        return years + "년";
    }

    return years + "년 " + months + "개월";
}

// 엑셀 다운로드 처리
const excelBtn = document.getElementById("btn-excel");
if (excelBtn) {
    excelBtn.addEventListener("click", function () {
        const devId = document.getElementById("dev_id").value;
        const devNm = document.getElementById("dev_nm").value;
        if (!devId) {
            alert("오류 : 개발자ID가 없습니다.");
            return;
        }
        location.href =
            `/common/getExcel?dev_id=${encodeURIComponent(devId)}&dev_nm=${encodeURIComponent(devNm)}`;
    });
}

// 로딩바 표시
function showLoading() {
    const $overlay = $("#loading-overlay");
    const $text = $overlay.find("p");
    if (isSaving){
        $text.text("저장 중입니다...");
    } else {
        $text.text("로딩 중입니다...");
    }
    $overlay.addClass("active");
}

// 로딩바 숨김
function hideLoading() {
    $("#loading-overlay").removeClass("active");
}
