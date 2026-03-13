// 사용자 관리 - hr010.js (hcnc_hms)

// 인적사항 리스트 테이블
var userTable;

// 모드(insert: 등록 / update: 수정 / view: 상세조회)
var currentMode = "insert";
var currentHr010UserTypeTab = "staff";
var hr010SourceRows = [];

// 주 개발언어 태그 입력 공통 모듈
var mainLangTagInput = null;
var pendingMainLangValue = "";
var mainLangPicker = null;
var mainLangSkillOptions = [];
var mainLangGroupOptions = [];

// 소속구분 공통코드
var devTypMap = [];
var devTypOptions = [];

// 개인/법인 공통코드
var ctrtTypMap = [];
var ctrtTypOptions = [];

// 근무형태 공통코드
var workMdMap = [];
var workMdOptions = [];

// KOSA등급 공통코드
var kosaGrdMap = [];
var kosaGrdOptions = [];

// 주요분야 공통코드
var mainFldMap = [];
var mainFldOptions = [];

// 주요고객사 공통코드
var mainCustMap = [];
var mainCustOptions = [];

// 저장된 탭 alert 표시하기 위한 리스트
var savedTabs = [];

// 조회조건 콤보에 들어갈 검색가능한 field 목록
var hr010SearchableFields = [];
// 검색 대상에서 제외할 컬럼
var HR010_SEARCH_EXCLUDE_FIELDS = new Set(["checkBox", "kosa_grd_cd", "main_fld_cd", "main_cust_cd"]);

// 탭 전체 입력/수정 여부 판단 => 전역 플래그
let initTabs = false;

// 저장/로딩중 팝업 표시 여부 플래그
let isSaving = false;

// 저장 성공 여부 플래그
let isSuccess = false;



// 개발자ID
window.currentDevId = null;

// 탭 개별 입력/수정 여부 판단
const changedTabs = {
    mainArea: false, // 좌측 영역
    tab1: false, // 1번째 Tab
    tab2: false, // 2번재 Tab
    tab3: false, // 3번째 Tab
    tab4: false  // 4번째 Tab
};

const tabNameMap = {
    mainArea: "인적사항",
    tab1: "소속 및 계약정보",
    tab2: "보유역량 및 숙련도",
    tab3: "프로젝트",
    tab4: "평가 및 리스크"
};

// ============================================================================== //

// 문서 첫 생성 시 실행
$(document).ready(async function () {
    buildUserTable();

    initHr010SearchTypeOptions(); // 검색조건 콤보

    // console.log(Swal); // swal 오류 확인용

    // 탭별 이벤트 정의
    $(".search-btn-area .btn-search").text("조회");

    $(".hr030-filter-chip").on("click", function () {
        var nextType = String($(this).data("userType") || "staff");
        if (currentHr010UserTypeTab === nextType) {
            return;
        }

        currentHr010UserTypeTab = nextType;
        $(".hr030-filter-chip").removeClass("is-active");
        $(this).addClass("is-active");

        applyHr010UserTypeFilter();
        if (window.userTable) {
            updateTabulatorGridCount(window.userTable);
        }
    });

    // 소속 구분 공통콤보
    setComCode("select_dev_typ", "DEV_TYP", "", "cd", "cd_nm", function () {
        devTypOptions = $("#select_dev_typ option").map(function () {
            return { cd: this.value, cd_nm: $(this).text() };
        }).get();
        initSelectDefault("select_dev_typ", "직원/프리랜서");
        devTypMap = getDevTypMap();
    });

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

    // KOSA 등급 셀렉트 공통콤보
    setComCode("select_kosa_grd_cd", "KOSA_GRD_CD", "", "cd", "cd_nm", function () {
        kosaGrdOptions = $("#select_kosa_grd_cd option").map(function () {
            return { cd: this.value, cd_nm: $(this).text() };
        }).get();
        initSelectDefault("select_kosa_grd_cd", "KOSA등급");
        kosaGrdMap = getKosaGrdMap();
    });

    // 주요분야 셀렉트 공통콤보
    setComCode("select_main_fld_cd", "MAIN_FLD_CD", "", "cd", "cd_nm", function () {
        mainFldOptions = $("#select_main_fld_cd option").map(function () {
            return { cd: this.value, cd_nm: $(this).text() };
        }).get();
        initSelectDefault("select_main_fld_cd", "주요분야");
        mainFldMap = getMainFldMap();
    });

    // 주요고객사 셀렉트 공통콤보
    setComCode("select_main_cust_cd", "MAIN_CUST_CD", "", "cd", "cd_nm", function () {
        mainCustOptions = $("#select_main_cust_cd option").map(function () {
            return { cd: this.value, cd_nm: $(this).text() };
        }).get();
        initSelectDefault("select_main_cust_cd", "주요고객사");
        mainCustMap = getMainCustMap();
    });

    // 테이블 로딩이 끝날 때 까지 로딩바 표시
    showLoading();
    await loadUserTableData();

    // 로딩 완료 후 테이블 건수 표시
    if (window.userTable) updateTabulatorGridCount(window.userTable);

    hideLoading();

    $(".tab-panel").hide(); // Tab 숨기기

    // ================================================ //

    // 프로필 이미지 표시
    $("#fileProfile").on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // 이미지 파일만 허용
        if (!file.type.startsWith("image/")) {
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'info',
                title: '알림',
                html: `<strong>이미지 파일</strong>만 선택 가능합니다.`,
            });
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
        await reloadHr010List();
        if (window.userTable) updateTabulatorGridCount(window.userTable);
        hideLoading();
    });

    // 검색어 이벤트 (Enter 입력)
    $("#searchConditionKeyword, #searchKeyword").on("keyup", async function (event) {
        if (event.key === "Enter") {
            showLoading();
            await loadUserTableData();
            if (window.userTable) updateTabulatorGridCount(window.userTable);
            hideLoading();
        }
    });

    // ESC 누르면 모달 닫힘
    $(document).on("keydown", function (event) {
        if (event.key === "Escape") {
            closeUserViewModal();
        }
    });

    // 조회 버튼이벤트
    $(".btn-main-view").on("click", function () {
        const rowData = btnEditView("상세정보를 조회할 ");
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
        if (tabId == "tab4") {
            if (!canAccessHr014Tab())
                return; // hr014 권한 검증

            if ((window.hr013_prj_nm === undefined || window.hr013_prj_nm === null)) {
                showAlert({
                    icon: 'warning',
                    title: '경고',
                    html: `해당 탭은<strong>&nbsp;프로젝트</strong>&nbsp;탭에서<strong>&nbsp;당사(HCNC)&nbsp;</strong>프로젝트의
                           <strong>&nbsp;평가&nbsp;</strong>버튼을 클릭해야 접근 가능합니다.`
                });
                return;
            }
        }

        $(".tab-btn").removeClass("active");
        $(this).addClass("active");

        $(".tab-panel").hide();
        $("#" + tabId).show();
        updateTabActions(tabId);
        refreshTabLayout(tabId);
    });

    // 메인 영역 변경 이벤트
    $(document).on("change input", "#main-modal-table input, #main-modal-table select, #main-modal-table textarea", function () {
        if (initTabs) return;
        changedTabs.mainArea = true;
        // console.log("mainArea 변경됨");
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

        if (!canAccessHr014Tab()) changedTabs.tab4 = false;  // hr014 권한 검증

        if (isSaving) return;

        // 로딩 표시
        isSaving = true;
        showLoading();

        // 기본 유효성 검사
        if (!validateUserForm()) {
            // console.log("인적사항 유효성 실패");
            hideLoading();
            isSaving = false;
            return;
        }

        // 탭별 유효성 검사 (update 모드만)
        if (currentMode !== "insert" && currentMode !== "view") {
            if ((changedTabs.tab1 && !validateHr011Form()) ||
                (changedTabs.tab2 && !validateHr012Form()) ||
                (changedTabs.tab3 && !window.hr013Table) ||
                (changedTabs.tab4 && !window.hr014TableA)) {

                // console.log("탭 유효성 실패");
                hideLoading();
                isSaving = false;
                return;
            }
        }

        try {
            // 인적사항 저장
            const success = await upsertUserBtn();
            if (!success) {
                throw new Error("인적사항 저장 실패");
            }
            savedTabs.push("인적사항");

            // 세부정보 저장
            if (currentMode != "insert") {
                // 탭 데이터 순차 저장
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
            }

            // 저장 완료 후, 상태 플래그 변경
            isSuccess = true;

            // 저장한 탭의 이름 저장
            const savedTabNames = savedTabs.length
                ? savedTabs.map(n => `<strong>${n}</strong>`).join(",&nbsp;")
                : "<strong>인적사항</strong>";  // 혹시 savedTabs가 비어있다면 인적사항 표시

            showAlert({
                icon: 'success',
                title: currentMode === "insert" ? "등록 완료" : "저장 완료",
                html: `${savedTabNames}&nbsp;정보가 저장되었습니다.`
            });

            // 탭 상태 초기화
            Object.keys(changedTabs).forEach(k => changedTabs[k] = false);

            // 신규 등록이면 팝업 닫기
            if (currentMode === "insert") {
                closeUserViewModal();
            }

        } catch (e) {
            console.error(e);

            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                text: '저장 중 오류가 발생했습니다.'
            });

        } finally {
            isSaving = false;
            hideLoading();

            // 저장에 성공했다면...
            if (isSuccess) {
                userTable.clearData();
                await loadUserTableData();
            }
            // console.log("저장 작업 종료, 로딩 상태 :", isSaving); // false여야 정상
        }
    });
});

// ============================================================================== //

// 역할 코드 -> 라벨 맵 생성 (소속구분 : 직원/프리랜서)
function getDevTypMap() {
    var map = {};
    if (devTypOptions && devTypOptions.length) {
        devTypOptions.forEach(function (item) {
            if (item.cd) {
                map[item.cd] = item.cd_nm || item.cd;
            }
        });
        return map;
    }
    $("#select_dev_typ option").each(function () {
        var val = this.value;
        if (val) {
            map[val] = $(this).text();
        }
    });
    return map;
}

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

// 역할 코드 -> 라벨 맵 생성 (KOSA등급)
function getKosaGrdMap() {
    var map = {};
    if (kosaGrdOptions && kosaGrdOptions.length) {
        kosaGrdOptions.forEach(function (item) {
            if (item.cd) {
                map[item.cd] = item.cd_nm || item.cd;
            }
        });
        return map;
    }
    $("#select_kosa_grd_cd option").each(function () {
        var val = this.value;
        if (val) {
            map[val] = $(this).text();
        }
    });
    return map;
}

// 역할 코드 -> 라벨 맵 생성 (주요분야)
function getMainFldMap() {
    var map = {};
    if (mainFldOptions && mainFldOptions.length) {
        mainFldOptions.forEach(function (item) {
            if (item.cd) {
                map[item.cd] = item.cd_nm || item.cd;
            }
        });
        return map;
    }
    $("#select_main_fld_cd option").each(function () {
        var val = this.value;
        if (val) {
            map[val] = $(this).text();
        }
    });
    return map;
}

// 역할 코드 -> 라벨 맵 생성 (주요고객사)
function getMainCustMap() {
    var map = {};
    if (mainCustOptions && mainCustOptions.length) {
        mainCustOptions.forEach(function (item) {
            if (item.cd) {
                map[item.cd] = item.cd_nm || item.cd;
            }
        });
        return map;
    }
    $("#select_main_cust_cd option").each(function () {
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

    applyHr010EditorPermission()

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
                title: "선택",
                hozAlign: "center",
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
                width: 60,
                headerSort: false,
                download: false
            },
            { title: "성명", field: "dev_nm", hozAlign: "center", headerSort: true, widthGrow: 2, frozen: true },
            {
                title: "평가등급",
                field: "grade",
                hozAlign: "center",
                frozen: true, width: 120,
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    if (!d.grade) return "";
                    return formatGradeLabel(d.grade, d.score);
                }
            },
            {
                title: "주개발언어",
                field: "main_lang_nm",
                widthGrow: 4, minWidth: 120, frozen: true,
                formatter: function (cell) {
                    const value = cell.getValue();
                    if (!value) return "";
                    return `<div style="
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;">
                        ${value.split(",").map(v => v.trim()).join(", ")}
                    </div>`;
                }
            },
            {
                title: "희망단가",
                field: "hope_rate_amt",
                widthGrow: 3, minWidth: 100, frozen: true,
                formatter: function (cell) {
                    const value = cell.getValue();
                    return `<div style="text-align:right;">${amountFormatter(value)}</div>`;
                }
            },
            { title: "생년월일", field: "brdt", hozAlign: "center", headerSort: true, widthGrow: 2, minWidth: 80, visible: false },
            { title: "연락처", field: "tel", hozAlign: "center", widthGrow: 3, minWidth: 100, headerSort: false },
            { title: "dev_id", field: "dev_id", visible: false },
            { title: "kosa_grd_cd", field: "kosa_grd_cd", visible: false },
            { title: "main_fld_cd", field: "main_fld_cd", visible: false },
            { title: "main_cust_cd", field: "main_cust_cd", visible: false },
            {
                title: "이메일",
                field: "email", widthGrow: 3, headerSort: false,
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
            {
                title: "거주지역",
                field: "region",
                widthGrow: 2,
                formatter: function (cell) {
                    const value = cell.getValue();
                    if (!value) return "";
                    return `<div style="
                        text-align:center;
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
                widthGrow: 2,
                formatter: function (cell) {
                    return `<div style="text-align:right;">${formatCareerYearMonth(cell.getValue())}</div>`;
                }
            },
            {
                title: "최종학력",
                field: "edu_last",
                widthGrow: 4, minWidth: 120, headerSort: false, visible: false,
                /*formatter: function (cell) {
                    const value = cell.getValue();
                    if (!value) return "";
                    return `<div style="
                        text-align:left;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;">
                        ${value}
                    </div>`;
                }*/
            },
            {
                title: "보유자격증",
                field: "cert_txt",
                widthGrow: 4, headerSort: false,
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
            { title: "투입가능시점", field: "avail_dt", hozAlign: "center", width: 115 },
            {
                title: "계약형태",
                field: "ctrt_typ",
                hozAlign: "center",
                formatter: function (cell) {
                    const val = cell.getValue();
                    return (ctrtTypMap && ctrtTypMap[val]) ? ctrtTypMap[val] : val;
                }, editor: false, editable: false, widthGrow: 2
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
// 타입 판별/필터 함수
function resolveHr010UserType(row) {
    if (!row || typeof row !== "object") {
        return "staff";
    }

    var devTyp = String(row.select_dev_typ || "").toUpperCase();

    if (devTyp === "HCNC_F" || devTyp === "F") {
        return "freelancer";
    }
    if (devTyp === "HCNC_S" || devTyp === "S") {
        return "staff";
    }

    var devId = String(row.dev_id || "").toUpperCase();
    if (devId.indexOf("HCNC_F") === 0) {
        return "freelancer";
    }
    if (devId.indexOf("HCNC_S") === 0) {
        return "staff";
    }

    return "staff";
}

function filterHr010RowsByType(list) {
    if (!Array.isArray(list)) {
        return [];
    }

    if (currentHr010UserTypeTab === "freelancer") {
        return list.filter(function (row) {
            return resolveHr010UserType(row) === "freelancer";
        });
    }

    return list.filter(function (row) {
        return resolveHr010UserType(row) !== "freelancer";
    });
}

function applyHr010UserTypeFilter() {
    if (!userTable || typeof userTable.setData !== "function") {
        return;
    }

    userTable.setData(filterHr010RowsByType(hr010SourceRows));
}

// db로부터 리스트 불러와서 인적사항 테이블에 넣기
async function loadUserTableData() {
    if (!userTable || typeof userTable.setData !== "function") {
        return;
    }

    // 키워드 검색
    const searchType = String($("#searchType").val() || ""); // 조회조건 선택값
    const conditionKeyword = $.trim($("#searchConditionKeyword").val()); // 새 '검색어' 입력값
    let tagKeyword = $.trim($("#searchKeyword").val()); // 기존 검색어(현재 Tag 검색) 입력값

    if (tagKeyword) { // Tag 검색: 다중 입력 시 OR 검색되도록 공백 토큰으로 전달
        tagKeyword = tagKeyword
            .split(/[\s,]+/)
            .filter(w => w)
            .join(" ");
    } else {
        tagKeyword = null;
    }

    // console.log("키워드 :", keyword);

    try {
        // 리스트 불러오기
        const response = await $.ajax({
            url: "/hr010/list",
            type: "GET",
            data: {
                dev_nm: "",
                searchKeyword: tagKeyword // Tag 검색은 서버 조회 파라미터 전달
            }
        });

        const list = response.res || [];
        if (!list.length) {
            hr010SourceRows = [];
            applyHr010UserTypeFilter();
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

        const filteredList = applyHr010ConditionFilter(list, searchType, conditionKeyword); // 조회조건 필터 적용
        hr010SourceRows = filteredList; // 필터 결과를 그리드 소스로 반영
        applyHr010UserTypeFilter(); // 직원/프리랜서 탭 필터 적용

        // userTable.setData(response.res || []);
    } catch (e) {
        console.error(e);
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'error',
            title: '오류',
            text: '사용자 데이터를 불러오는 중 오류가 발생했습니다.',
        });
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
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: '사용자 데이터를 불러오는 중 오류가 발생했습니다.',
                });
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
            dev_typ: $("#select_dev_typ").val(),
            crt_by: "",
            kosa_grd_cd: $("#select_kosa_grd_cd").val(),
            main_fld_cd: $("#select_main_fld_cd").val(),
            main_cust_cd: $("#select_main_cust_cd").val()
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
                    console.log(response?.message || "저장에 실패했습니다.");
                    showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                        icon: 'error',
                        title: '오류',
                        text: '저장 중 오류가 발생했습니다.'
                    });
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
                console.log("저장 중 오류가 발생했습니다.");
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: '저장 중 오류가 발생했습니다.'
                });
                reject(xhr);
            }
        });
    });
}

// ============================================================================== //

// 데이터 삭제 요청 - toast 방식  추가해야될 사항(현재 삭제하겠냐는 문구에 잡힌 파라미터 수정 필요)
async function deleteUserRows() {
    var selectedRows = userTable.getSelectedRows();

    // 선택 없음
    if (selectedRows.length === 0) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'info',
            title: '알림',
            text: '삭제할 사용자를 선택해주세요.'
        });
        return;
    }

    // 선택된 첫 번째 행의 이름 가져오기
    var firstRowData = selectedRows[0].getData();

    // 1단계 확인 모달
    const firstResult = await showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
        title: '경고',
        html: `<strong>${firstRowData.dev_nm}</strong>&nbsp;사용자 정보를 삭제하시겠습니까?`,
        icon: 'warning',
        showCancelButton: true,
        cancelButtonText: '취소',
        cancelButtonColor: '#212E41'
    });
    if (!firstResult.isConfirmed) return;

    const secondResult = await showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
        title: '경고',
        html: `다시 확인 버튼을 누르시면&nbsp;<strong>${firstRowData.dev_nm}</strong>&nbsp;사용자의 데이터가 삭제되며, 되돌릴 수 없습니다.`,
        icon: 'warning',
        showCancelButton: true,
        cancelButtonText: '취소',
        cancelButtonColor: '#212E41'
    });
    if (!secondResult.isConfirmed) return;

    // 실제 삭제 Ajax 호출
    var pending = selectedRows.length;

    selectedRows.forEach(function (row) {
        $.ajax({
            url: "/hr010/delete",
            type: "POST",
            data: { dev_id: row.getData().dev_id },
            success: function () {
                pending -= 1;
                if (pending === 0) {
                    loadUserTableData();
                    showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                        icon: 'success',
                        title: '완료',
                        html: `<strong>${firstRowData.dev_nm}</strong>&nbsp;사용자의 데이터가 삭제되었습니다.`
                    });
                }
            },
            error: function () {
                showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                    icon: 'error',
                    title: '오류',
                    text: '삭제 중 오류가 발생했습니다.'
                });
            }
        });
    });
}

// ============================================================================== //

async function reloadHr010List() {
    showLoading(); // 로딩바 표시
    await loadUserTableData();
    if (window.userTable) updateTabulatorGridCount(window.userTable);
    hideLoading();
}


// ============================================================================== //

// 모달(팝업) 열리는 이벤트 처리
openUserModal = async function (mode, data) {
    window.hr013_prj_nm = null;

    currentMode = mode;
    initTabs = true;
    const $modal = $("#view-user-area");

    showLoading(); // 로딩바 표시
    $modal.removeClass("show").hide();

    if (mode === "insert") clearUserForm();
    else fillUserForm(data || userTable.getSelectedRows()[0].getData());

    setModalMode(mode);
    await initAllTabs(); // 모든 tab 초기화
    applyHr014TabPermission(); // tab4(권한 검증후 표시) 활성화

    // 인력 관리 등록 시, 정해진 탭에 따라 자동으로 선택
    if (mode === "insert") {
        const activeTabBtn = document.querySelector(".hr030-filter-chip.active");
        const devTyp = activeTabBtn?.dataset.userType === "freelancer" ? "HCNC_F" : "HCNC_S";
        $("#select_dev_typ").val(devTyp).trigger("change");
    }

    window.hr014TabInitialized = false;
    initMainLangTags();

    // 조회, 수정할 때, 여기서 모든 비동기 작업 대기
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

    // tab1 활성화
    $(".tab-btn").removeClass("active");
    $(".tab-btn[data-tab='tab1']").addClass("active");
    $(".tab-panel").hide();
    $("#tab1").show();

    // 팝업 표시 완료 + 로딩 종료
    setTimeout(() => {
        $modal.show().addClass("show");
        initTabs = false;
        hideLoading(); // 로딩바 숨김
    }, 100);
};

// 모든 tab 초기화
async function initAllTabs() {
    // 처음에 보여질 Tab1만 await
    await initTab1();
    if (currentMode !== "insert") {
        initTab2();   // 기다릴 필요 없음
        initTab3();
        if (canAccessHr014Tab()) {
            initTab4();
        }
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
    // $("#dev_id_input").text(d.dev_id || "");

    $("#hope_rate_amt").val(
        formatAmount(d.hope_rate_amt)
    );

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

    // 셀렉트 kosa_grd_cd
    if (d.kosa_grd_cd && kosaGrdMap[d.kosa_grd_cd]) {
        $("#select_kosa_grd_cd").val(d.kosa_grd_cd);
    } else {
        $("#select_kosa_grd_cd").val("");
    }

    // 셀렉트 main_fld_cd
    if (d.main_fld_cd && mainFldMap[d.main_fld_cd]) {
        $("#select_main_fld_cd").val(d.main_fld_cd);
    } else {
        $("#select_main_fld_cd").val("");
    }

    // 셀렉트 main_cust_cd
    if (d.main_cust_cd && mainCustMap[d.main_cust_cd]) {
        $("#select_main_cust_cd").val(d.main_cust_cd);
    } else {
        $("#select_main_cust_cd").val("");
    }

    // 소속 구분 결정 로직 통합
    let devTypValue = "";
    if (d.dev_id) {
        if (d.dev_id.startsWith("HCNC_F")) {
            devTypValue = "HCNC_F";
        } else if (d.dev_id.startsWith("HCNC_S")) {
            devTypValue = "HCNC_S";
        }
    } else if (d.select_dev_typ) {
        devTypValue = d.select_dev_typ;
    }
    $("#select_dev_typ").val(devTypValue);

    const rank = d.grade || "";
    const score = d.score || 0;
    if (rank) {
        $("#grade").text(rank + "등급");
        $("#score").text("(" + score + "점)");
    } else {
        $("#grade").text("");
        $("#score").text("");
    }
    $("#aboutGrade").show();
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
    $("#select_dev_typ").val("");
    $("#select_work_md").val("");
    $("#select_ctrt_typ").val("");
    $("#grade").text("");
    $("#score").text("");
    $("#aboutGrade").hide();
    $("#select_kosa_grd_cd").val("");
    $("#select_main_fld_cd").val("");
    $("#select_main_cust_cd").val("");
}

// ============================================================================== //

// 팝업의 역할에 따라 sub-title 변경 되기
function setModalMode(mode) {
    console.log("Mode 구분 :", mode);

    const isView = mode === "view"; // 상세(조회)
    const isInsert = mode === "insert"; // 등록
    const isUpdate = mode === "update"; // 수정

    var $modal = $("#view-user-area");
    var $title = $modal.find("#modal-title");
    $modal.toggleClass("is-view-mode", isView);

    if (mode) {
        $title.text(
            mode === "view" ? "상세" :
                mode === "insert" ? "등록" :
                    "수정"
        );
        $modal
            .removeClass("view insert update")
            .addClass(mode);
    }

    // ================================
    // 공통 입력 제어 (조회 기준)
    // ================================
    const isReadOnly = isView;

    $modal.find("input, textarea")
        .prop("readonly", isReadOnly)
        .prop("disabled", isReadOnly);

    $modal.find("select")
        .not("#select_dev_typ")
        .prop("disabled", isReadOnly);

    const $profile = $modal.find(".modal-human-area .pic-area .profile-area");
    $profile.toggleClass("view", isView);
    $profile.toggleClass("edit", !isView);
    // ================================
    // select_dev_typ 전용 제어
    // ================================
    $modal.find("#select_dev_typ")
        .toggleClass("selectedDevTyp", isInsert) // 등록만 셀렉트 추가
        .prop("disabled", !isInsert); // 등록이 아니면 모두 disabled
    // ================================
    // career-exp 전용 제어
    // ================================
    $(".career-spin-wrap").toggle(!isView); // 조회가 아니면 모두 hide
    $(".career-exp-text").toggle(isView);
    // ================================
    // select_kosa_grd_cd 전용 제어
    // ================================
    var $select = $modal.find("#select_kosa_grd_cd");
    var $text = $modal.find("#kosa_grd_cd_text");

    if (isView) {
        var selectedText = $select.find("option:selected").text();
        $text.text(selectedText).show();   // 텍스트 표시
        $select.hide();                    // select 숨김
    } else {
        $text.hide();
        $select.show();
    }
    // ================================
    // 등록 전용 처리
    // ================================
    if (isInsert) {
        $("#grade").text("");
        $("#score").text("-");
    }

    // 주 개발언어 입력창은 팝업 트리거 전용으로 항상 readonly 유지
    $("#main_lang_input").prop("readonly", true);
    $(".career-spin-btn").prop("disabled", isView);
    syncCareerExpText();

    // Mode에 따른 버튼 숨김/표시
    $("#btn-user-save").toggle(isInsert || isUpdate);
    $("#btn-excel").toggle(isView);
    $(".tab-article").toggle(!isInsert);
    $("#main_lang_input, #btn_main_lang_picker").toggle(!isView);
    $(".showingbtn").toggle(isUpdate || isInsert);
    if (isView) {
        closeMainLangPicker(true);
        if (typeof closeHr012SkillPicker === "function") {
            closeHr012SkillPicker(true);
        }
        if (typeof closeHr013SkillPicker === "function") {
            closeHr013SkillPicker(true);
        }
    }

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

async function closeUserViewModal() {
    // 수정된 탭 목록 구하기
    const modifiedTabs = Object.keys(changedTabs).filter(tab => changedTabs[tab]);

    if (modifiedTabs.length > 0) {
        const devNmInput = document.getElementById("dev_nm");
        const devNm = devNmInput ? devNmInput.value : "";

        // 탭 이름을 읽기 쉽게 변환
        const tabNamesHtml = modifiedTabs
            .map((tab, i) => {
                const nameHtml = `<span><strong>${tabNameMap[tab]}</strong></span>`;
                return i < modifiedTabs.length - 1 ? `${nameHtml}<span>&nbsp;,&nbsp;</span>` : nameHtml;
            }).join('');

        const modeText = currentMode === "insert" ? "등록"
            : currentMode === "update" ? "수정"
                : currentMode === "view" ? "조회"
                    : currentMode; // 알 수 없는 경우 그대로

        // 신규 등록이면 이름 제외, 탭과 모드 안내만 표시
        const htmlContent = currentMode === "insert"
            ? `<span>${tabNamesHtml} 항목을 ${modeText}하고 있습니다.</span>
               <span>${modeText} 작업을 취소하고 닫으시겠습니까?</span>`
            : `<span><strong>${devNm}</strong>님의 인적사항에서</span>&nbsp;
               <span>${tabNamesHtml}</span>&nbsp;
               <span>항목이 ${modeText}되었습니다.</span>
               <span>${modeText} 작업을 취소하고 닫으시겠습니까?</span>`;

        const result = await showAlert({
            title: '경고',
            html: htmlContent,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '예',
            cancelButtonText: '취소',
            cancelButtonColor: '#212E41'
        });

        // 사용자가 취소했으면 모달 닫기 중단
        if (!result.isConfirmed) return;
    }

    // 모달 닫기
    const $modal = $("#view-user-area");
    closeMainLangPicker(true);
    if (typeof closeHr012SkillPicker === "function") closeHr012SkillPicker(true);
    if (typeof closeHr013SkillPicker === "function") closeHr013SkillPicker(true);
    $modal.removeClass("show");

    setTimeout(() => {
        $modal.hide();
        clearUserForm();
        savedTabs = [];
        Object.keys(changedTabs).forEach(k => changedTabs[k] = false);
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
    const devTyp = ($("#select_dev_typ").val() || "").trim();    // 소속 구분 (dev_id에서 S: 직원, F: 프리랜서)
    const brdt = ($("#brdt").val() || "").trim();                // 생년월일
    const tel = ($("#tel").val() || "").trim();                  // 연락처
    const email = ($("#email").val() || "").trim();              // 이메일
    const workMd = ($("#select_work_md").val() || "").trim();    // 근무 가능형태 (01: 상주, 02: 재택, 03: 혼합)
    const availDt = ($("#avail_dt").val() || "").trim();         // 투입 가능일
    const eduLast = ($("#edu_last").val() || "").trim();         // 최종학력
    const hopeRaw = normalizeAmountValue($("#hope_rate_amt").val()); // 희망단가 금액
    const kosaGrd = ($("#select_kosa_grd_cd").val() || "").trim(); // KOSA등급 (01: 초급, 02: 중급, 03: 고급, 04: 특급)
    const expYrYear = ($("#exp_yr_year").val() || "").trim();    // 경력연차(년)
    const expYrMonth = ($("#exp_yr_month").val() || "").trim();  // 경력연차(개월)
    const mainFld = ($("#select_main_fld_cd").val() || "").trim() // 주요분야 (01: 공공, 02: 공공/금융, 03: 제조, 04: 공공/제조)
    const ctrtTyp = ($("#select_ctrt_typ").val() || "").trim();  // 계약 형태 (01: 개인, 02: 법인)
    const mainCust = ($("#select_main_cust_cd").val() || "").trim();     // 주요고객사

    // 최대 입력 가능 숫자
    const MAX_AMT = 999999999;

    // ↓ 데이터 입력 순서대로 작성할 것

    // 개발자 이름(성명)
    if (!dev_nm) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>성명</strong>을 입력하세요.`
        });
        $("#dev_nm").focus();
        return false;
    }

    // 소속 구분
    if (!devTyp || devTyp == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>소속 구분</strong>을 선택해주세요.`
        });
        $("#select_dev_typ").focus();
        return false;
    }

    // 생년월일
    if (!brdt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>생년월일</strong>을 입력하세요.`
        });
        $("#brdt").focus();
        return false;
    }

    // 전화번호
    if (!tel) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>연락처</strong>를 입력하세요.`
        });
        $("#tel").focus();
        return false;
    }

    // 전화번호 (숫자만 입력)
    if (!/^[0-9\-]+$/.test(tel)) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>연락처</strong>&nbsp;형식이 올바르지 않습니다.`
        });
        $("#tel").focus();
        return false;
    }

    // 이메일
    if (!email) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>이메일</strong>을 입력하세요.`
        });
        $("#email").focus();
        return false;
    }

    const emailRegex =
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(email)) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>이메일</strong>&nbsp;형식이 올바르지 않습니다.`
        });
        $("#email").focus();
        return false;
    }

    // 근무 가능 형태
    if (!workMd || workMd == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>근무가능형태</strong>를 선택해주세요.`
        });
        $("#select_work_md").focus();
        return false;
    }

    // 투입 가능일
    if (!availDt) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>투입 가능 시점</strong>을 입력하세요.`
        });
        $("#avail_dt").focus();
        return false;
    }

    // 최종학력
    if (!eduLast) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>최종학력</strong>을 입력하세요.`
        });
        $("#edu_last").focus();
        return false;
    }

    // 희망단가
    if (!hopeRaw) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>단가</strong>를 입력해주세요.`
        });
        $("#hope_rate_amt").focus();
        return false;
    }
    if (Number(hopeRaw) > MAX_AMT) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>단가</strong>는 최대 999,999,999원까지 입력 가능합니다.`
        });
        $("#hope_rate_amt").focus();
        return false;
    }

    // KOSA등급
    if (!kosaGrd || kosaGrd == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>KOSA 등급</strong>을 선택해주세요.`
        });
        $("#select_kosa_grd_cd").focus();
        return false;
    }

    // 경력연차
    if (expYrYear === "" || expYrMonth === "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>경력연차(년/개월)</strong>을 입력하세요.`
        });
        if (expYrYear === "") {
            $("#exp_yr_year").focus();
        } else {
            $("#exp_yr_month").focus();
        }
        return false;
    }
    if (!/^\d+$/.test(expYrYear) || !/^\d+$/.test(expYrMonth)) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>경력연차(년/개월)</strong>을 입력하세요.`
        });
        $("#exp_yr_year").focus();
        return false;
    }
    var expYearNum = Number(expYrYear);
    var expMonthNum = Number(expYrMonth);
    if (expYearNum < 0 || expYearNum > 99 || expMonthNum < 0 || expMonthNum > 12) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>경력연차</strong>는 년(0~99), 개월(0~12) 범위 내에서 입력해주세요.`
        });
        $("#exp_yr_year").focus();
        return false;
    }
    syncCareerExpValue();

    // 주요분야
    if (!mainFld || mainFld == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>주요 분야</strong>를 선택해주세요.`
        });
        $("#select_main_fld_cd").focus();
        return false;
    }

    // 계약 형태
    if (!ctrtTyp || ctrtTyp == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>계약 형태</strong>를 선택해주세요.`
        });
        $("#select_ctrt_typ").focus();
        return false;
    }

    // 주요고객사
    if (!mainCust || mainCust == "") {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'warning',
            title: '경고',
            html: `<strong>주요 고객사</strong>를 선택해주세요.`
        });
        $("#select_main_cust_cd").focus();
        return false;
    }
    return true;
}

// ============================================================================== //

// 주 개발언어 태그/팝업 초기화
function initMainLangTags() {
    if (!mainLangTagInput) {
        mainLangTagInput = createTagInput({
            inputSelector: "#main_lang_input",
            listSelector: "#mainLangTagList",
            hiddenSelector: "#main_lang",
            getValue: function (item) { return item.cd; },
            getLabel: function (item) { return item.cd_nm; },
            matchMode: "prefix",
            // 주개발언어는 x 삭제가 아닌 기술선택 팝업에서만 변경한다.
            removable: false,
            onTagChange: function () {
                syncMainLangPickerUi();
            }
        });
        initMainLangPicker();
        bindMainLangPickerEvents();
    }

    setComCode("main_lang_select", "skl_id", "", "cd", "cd_nm", function (res) {
        mainLangSkillOptions = Array.isArray(res) ? res : [];
        mainLangTagInput.setOptions(mainLangSkillOptions);
        mainLangTagInput.setFromValue(pendingMainLangValue || $("#main_lang").val());
        pendingMainLangValue = $("#main_lang").val() || pendingMainLangValue;
        syncMainLangPickerUi(true);
    });

    getComCode("skl_grp", "", function (res) {
        mainLangGroupOptions = Array.isArray(res) ? res : [];
        syncMainLangPickerUi(true);
    });
}

// ============================================================================== //

// 공통 팩토리 기반 주개발언어 선택 팝업 초기화
function initMainLangPicker() {
    if (mainLangPicker || typeof createGroupedSkillPicker !== "function") {
        return;
    }
    mainLangPicker = createGroupedSkillPicker({
        namespace: "main_lang",
        pickerAreaSelector: "#main-lang-picker-area",
        openTriggerSelector: "#main_lang_input, #btn_main_lang_picker",
        applyTriggerSelector: "#btn_main_lang_picker_apply",
        closeTriggerSelector: "#btn_main_lang_picker_close_x",
        tableSelector: "#TABLE_MAIN_LANG_PICKER",
        searchInputSelector: "#main-lang-picker-search",
        searchWrapSelector: ".main-lang-picker-search-wrap",
        suggestListSelector: "#main-lang-picker-suggest",
        metaSelector: "#main-lang-picker-meta",
        chipClass: "main-lang-skill-chip",
        chipWrapClass: "main-lang-skill-chip-wrap",
        suggestItemClass: "main-lang-suggest-item",
        flashClass: "is-flash",
        groupColumnWidth: 180,
        getSkillOptions: function () {
            return mainLangSkillOptions || [];
        },
        getGroupOptions: function () {
            return mainLangGroupOptions || [];
        },
        getSelectedCodes: function () {
            var set = new Set();
            String($("#main_lang").val() || "")
                .split(",")
                .forEach(function (item) {
                    var code = $.trim(item);
                    if (code) {
                        set.add(code);
                    }
                });
            return set;
        },
        isReadonly: function () {
            return currentMode === "view";
        },
        onApply: function (payload) {
            if (mainLangTagInput) {
                mainLangTagInput.setFromValue(payload.csv || "");
            }
            pendingMainLangValue = payload.csv || "";
        }
    });
}

// 팝업 이벤트는 공통 유틸이 네임스페이스로 1회만 등록한다.
function bindMainLangPickerEvents() {
    initMainLangPicker();
    if (mainLangPicker) {
        mainLangPicker.bindEvents();
    }
}

// 읽기 전용이 아닐 때만 팝업을 열고, 선택 원본은 hidden(#main_lang) 기준으로 로드한다.
function openMainLangPicker() {
    if (currentMode === "view") {
        return;
    }
    initMainLangPicker();
    if (mainLangPicker) {
        mainLangPicker.open();
    }
}

function closeMainLangPicker(immediate) {
    if (!mainLangPicker) {
        return;
    }
    mainLangPicker.close(immediate);
}

// "적용" 클릭 시에만 draft 선택값이 태그/hidden 값으로 확정 반영된다.
function applyMainLangPickerSelection() {
    if (!mainLangPicker) {
        closeMainLangPicker();
        return;
    }
    mainLangPicker.apply();
}

function syncMainLangPickerUi(forceRebuild) {
    if (!mainLangPicker) {
        return;
    }
    mainLangPicker.sync(forceRebuild);
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
    normalizeCareerSpinInputs();
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

    var currentYear = clampCareerYearValue($("#exp_yr_year").val());
    var currentMonth = clampCareerMonthValue($("#exp_yr_month").val());

    if (targetSelector === "#exp_yr_month") {
        if (step > 0) {
            if (currentYear >= 99 && currentMonth >= 12) {
                currentYear = 0;
                currentMonth = 0;
            } else
                if (currentMonth >= 12) {
                    currentMonth = 0;
                    currentYear = clampCareerYearValue(currentYear + 1);
                } else {
                    currentMonth = clampCareerMonthValue(currentMonth + 1);
                }
        } else {
            if (currentMonth <= 0 && currentYear > 0) {
                currentYear = clampCareerYearValue(currentYear - 1);
                currentMonth = 12;
            } else {
                currentMonth = clampCareerMonthValue(currentMonth - 1);
            }
        }
    } else {
        if (step > 0 && currentYear >= 99 && currentMonth >= 12) {
            currentYear = 0;
            currentMonth = 0;
        } else {
            currentYear = clampCareerYearValue(currentYear + step);
        }
    }

    $("#exp_yr_year").val(currentYear);
    $("#exp_yr_month").val(currentMonth);
    normalizeCareerSpinInputs();
});

// 희망단가 입력: 숫자만 허용하고 "원" 접미사 앞에서만 커서가 움직이도록 제어한다.
$("#hope_rate_amt")
    .on("input", function () {
        var raw = this.value || "";
        var caret = Number.isFinite(this.selectionStart) ? this.selectionStart : raw.length;
        var digitsBeforeCaret = countAmountDigitsBeforeCaret(raw, caret);
        var inputNumber = normalizeAmountValue(raw);
        var formatted = formatAmount(inputNumber);
        this.value = formatted;
        setAmountCaretByDigitIndex(this, digitsBeforeCaret);
    })
    .on("focus", function () {
        moveAmountCaretToEditableEnd(this);
    })
    .on("click", function () {
        var input = this;
        setTimeout(function () {
            clampAmountCaretToEditableRange(input);
        }, 0);
    })
    .on("keydown", function (e) {
        var value = this.value || "";
        var suffixIndex = getAmountEditableEndIndex(value);
        var start = Number.isFinite(this.selectionStart) ? this.selectionStart : suffixIndex;
        var end = Number.isFinite(this.selectionEnd) ? this.selectionEnd : suffixIndex;

        // 커서가 "원" 뒤로 가지 않도록 제한
        if ((e.key === "ArrowRight" || e.key === "End") && start >= suffixIndex && end >= suffixIndex) {
            e.preventDefault();
            this.setSelectionRange(suffixIndex, suffixIndex);
            return;
        }

        // 커서가 "원" 뒤에 있으면 우선 "원" 앞으로 이동
        if (e.key === "Backspace" && start === end && start > suffixIndex) {
            e.preventDefault();
            this.setSelectionRange(suffixIndex, suffixIndex);
            return;
        }

        // Delete로 "원" 자체를 지우는 동작은 막음
        if (e.key === "Delete" && start === end && start >= suffixIndex) {
            e.preventDefault();
            return;
        }
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

// alert 문자 가공
function btnEditView(alertPrefix = "") {
    if (!userTable) return null;
    const rows = userTable.getSelectedRows();
    const prefix = alertPrefix || "";
    if (rows.length !== 1) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'info',
            title: '알림',
            text:
                prefix +
                (rows.length === 0
                    ? '대상을 목록에서 선택하세요.'
                    : '한 명만 선택해주세요.')
        });
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

// "원" 접미사를 제외한 마지막 편집 가능 인덱스를 반환한다.
function getAmountEditableEndIndex(value) {
    var text = String(value || "");
    return text.endsWith("원") ? text.length - 1 : text.length;
}

// 클릭/포커스 후 커서가 "원" 뒤로 나가지 않도록 강제로 보정한다.
function clampAmountCaretToEditableRange(input) {
    if (!input) return;
    var end = getAmountEditableEndIndex(input.value);
    var start = Number.isFinite(input.selectionStart) ? input.selectionStart : end;
    var finish = Number.isFinite(input.selectionEnd) ? input.selectionEnd : end;
    var nextStart = Math.min(Math.max(start, 0), end);
    var nextEnd = Math.min(Math.max(finish, 0), end);
    if (nextStart !== start || nextEnd !== finish) {
        input.setSelectionRange(nextStart, nextEnd);
    }
}

// 초기 포커스 시 커서를 항상 숫자 마지막으로 보낸다.
function moveAmountCaretToEditableEnd(input) {
    if (!input) return;
    var end = getAmountEditableEndIndex(input.value);
    input.setSelectionRange(end, end);
}

// 포맷팅 전/후 커서 위치를 유지하기 위해 커서 앞 숫자 개수를 센다.
function countAmountDigitsBeforeCaret(value, caret) {
    var text = String(value || "");
    var cursor = Math.max(0, Math.min(Number.isFinite(caret) ? caret : text.length, text.length));
    return text.slice(0, cursor).replace(/[^0-9]/g, "").length;
}

// 숫자 개수 기준으로 포맷팅 이후 커서 위치를 복원한다.
function setAmountCaretByDigitIndex(input, digitCount) {
    if (!input) return;
    var text = String(input.value || "");
    var editableEnd = getAmountEditableEndIndex(text);

    if (!digitCount || digitCount <= 0) {
        input.setSelectionRange(0, 0);
        return;
    }

    var seen = 0;
    var pos = editableEnd;
    for (var i = 0; i < editableEnd; i += 1) {
        if (/[0-9]/.test(text.charAt(i))) {
            seen += 1;
        }
        if (seen >= digitCount) {
            pos = i + 1;
            break;
        }
    }
    pos = Math.min(pos, editableEnd);
    input.setSelectionRange(pos, pos);
}

function formatGradeLabel(rank, score) {
    if (!rank) return "";
    return `${rank}등급 (${score || 0}점)`;
}

function clampCareerYearValue(value) {
    var num = parseInt(value, 10);
    if (!Number.isFinite(num) || isNaN(num)) {
        return 0;
    }
    if (num < 0) return 0;
    if (num > 99) return 99;
    return num;
}

function clampCareerMonthValue(value) {
    var num = parseInt(value, 10);
    if (!Number.isFinite(num) || isNaN(num)) {
        return 0;
    }
    if (num < 0) return 0;
    if (num > 12) return 12;
    return num;
}

function normalizeCareerSpinInputs() {
    var years = clampCareerYearValue($("#exp_yr_year").val());
    var monthsRaw = parseInt($("#exp_yr_month").val(), 10);
    var months = Number.isFinite(monthsRaw) && !isNaN(monthsRaw) ? monthsRaw : 0;

    if (months < 0) {
        months = 0;
    }
    if (months > 12) {
        years = clampCareerYearValue(years + Math.floor(months / 12));
        months = months % 12;
    }
    if (years >= 99 && months > 12) {
        months = 12;
    }

    months = clampCareerMonthValue(months);

    $("#exp_yr_year").val(years);
    $("#exp_yr_month").val(months);
    syncCareerExpValue();
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
        var years = clampCareerYearValue(parts[0]);
        var months = 0;
        if (parts.length > 1) {
            var monthText = String(parts[1] || "").replace(/[^\d]/g, "");
            months = clampCareerMonthValue(monthText || 0);
        }
        return { years: years, months: months };
    }

    var yearMatch = raw.match(/(\d+)\s*년/);
    var monthMatch = raw.match(/(\d+)\s*개?월/);
    return {
        years: clampCareerYearValue(yearMatch ? yearMatch[1] : 0),
        months: clampCareerMonthValue(monthMatch ? monthMatch[1] : 0)
    };
}

function setCareerSpinInputs(value) {
    var parsed = parseCareerExpValue(value);
    $("#exp_yr_year").val(parsed.years);
    $("#exp_yr_month").val(parsed.months);
    normalizeCareerSpinInputs();
    //    if ($("#exp_yr_text").length === 0) {
    //        $(".career-spin-wrap").closest("td").append('<span id="exp_yr_text" class="career-exp-text"></span>');
    //    }
    // 빈값으로 들어와도 정규화된 표시값(예: 0개월)이 유지되도록 현재 입력값 기준으로 표시
    syncCareerExpText(composeCareerExpValue());
}

function composeCareerExpValue() {
    var years = clampCareerYearValue($("#exp_yr_year").val());
    var months = clampCareerMonthValue($("#exp_yr_month").val());
    if (months === 0) {
        return String(years);
    }
    return years + "." + months;
}

function syncCareerExpValue() {
    $("#exp_yr").val(composeCareerExpValue());
    syncCareerExpText();
}

function syncCareerExpText(value) {
    var source = value;
    if (source === undefined || source === 0) {
        source = $("#exp_yr").val();
    }
    $("#exp_yr_text").text(formatCareerYearMonth(source));
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
        if (years === 0) {
            return "0개월";
        }
        return years + "년";
    }

    var monthsRaw = String(parts[1] || "");
    if (!monthsRaw || /^0+$/.test(monthsRaw)) {
        if (years === 0) {
            return "0개월";
        }
        return years + "년";
    }

    var months = parseInt(monthsRaw, 10);
    if (!months) {
        if (years === 0) {
            return "0개월";
        }
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
            showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
                icon: 'error',
                title: '오류',
                html: `<strong>개발자ID</strong>가 없습니다.`
            });
            return;
        }
        location.href =
            `/common/getExcel?dev_id=${encodeURIComponent(devId)}&dev_nm=${encodeURIComponent(devNm)}`;
    });
}



// tab4(평가/리스크) 접근 허용 role
const HR014_ALLOWED_ROLE_SET = new Set(["01", "02"]);

// hr010 등록 / 수정 접근 허용
const HR010_EDITOR_ROLE_SET = new Set(["01", "02", "03"]);

// layout.html hidden input(#LOGIN_AUTH)에서 현재 로그인 role 코드 읽기
function getLoginRoleCd() {
    return String($("#LOGIN_AUTH").val() || "").trim();
}

// 현재 사용자가 tab4를 볼 수 있는지 판단
function canAccessHr014Tab() {
    return HR014_ALLOWED_ROLE_SET.has(getLoginRoleCd());
}

// 현재 사용자가 hr010 등록/수정을 볼 수 있는지 판단
function canAccessHr010Editor() {
    return HR010_EDITOR_ROLE_SET.has(getLoginRoleCd());
}

// tab4 (평가/리스크)버튼/패널 표시 제어
function applyHr014TabPermission() {
    const allowed = canAccessHr014Tab();
    const $tabBtn = $(".tab-btn[data-tab='tab4']");
    const $tabPanel = $("#tab4");

    $tabBtn.toggle(allowed);    // tab4(평가/리스크) 버튼
    $tabPanel.toggle(allowed);  // tab4(평가/리스크) 패널
    updateVisibleMainTabEdge();

    // 권한 없는데 현재 tab4에 머물러 있으면 tab1로 강제 이동
    if (!allowed) {
        changedTabs.tab4 = false;  // 저장 대상에서도 제외
        if ($(".tab-btn.active").data("tab") === "tab4") {
            $(".tab-btn[data-tab='tab1']").trigger("click");
        }
    }

}

// 메인 탭에서 마지막으로 보이는 탭의 우측 경계를 정리해 끝부분이 자연스럽게 보이도록 처리
function updateVisibleMainTabEdge() {
    const $tabArea = $(".tab-article > .tab-area").first();
    const $tabBtns = $tabArea.find(".tab-btn");
    $tabBtns.removeClass("is-visible-last");
    $tabBtns.filter(":visible").last().addClass("is-visible-last");
}

// hr010 등록/수정 버튼/패널 표시 제어
function applyHr010EditorPermission() {
    const editAllowed = canAccessHr010Editor();
    const $btnAdd = $(".btn-main-add");
    const $btnEdit = $(".btn-main-edit");
    const $btnDel = $(".btn-main-del");    // hr010 등록/수정 버튼/패널 표시 제어
    $btnAdd.toggle(editAllowed);
    $btnEdit.toggle(editAllowed);
    $btnDel.toggle(editAllowed);
}

// 조회조건 콤보 동적 구성
function initHr010SearchTypeOptions() {
    const $searchType = $("#searchType"); // 콤보 엘리먼트
    if (!$searchType.length) return; // 화면에 없으면 종료
    if (!userTable || typeof userTable.getColumns !== "function") return; // 테이블 준비 안됐으면 종료

    const columnDefs = userTable.getColumns() // 테이블 컬럼 객체 목록
        .map(function (col) { return col.getDefinition(); }) // 정의 객체 추출
        .filter(function (def) { // 검색 가능한 컬럼만 남김
            if (!def || !def.field || !def.title) return false; // 필수 정보 없으면 제외
            if (def.visible === false) return false; // 숨김 컬럼 제외
            if (HR010_SEARCH_EXCLUDE_FIELDS.has(def.field)) return false; // 제외 대상 컬럼 제외
            return true; // 통과
        });

    hr010SearchableFields = columnDefs.map(function (def) { return def.field; }); // field 캐시

    $searchType.empty(); // 기존 옵션 제거
    $searchType.append($("<option>", { value: "", text: "전체" })); // 기본 '전체' 옵션

    columnDefs.forEach(function (def) { // 컬럼별 옵션 생성
        $searchType.append($("<option>", { value: def.field, text: def.title })); // value=field, text=컬럼명
    });
}

// 조건검색용 텍스트 변환/필터 함수 추가
function getHr010SearchTextByField(row, field) { // field별 검색 텍스트 표준화
    if (!row || !field) return "";
    if (field === "ctrt_typ") return String((ctrtTypMap && ctrtTypMap[row.ctrt_typ]) || row.ctrt_typ || ""); // 코드->라벨 변환
    if (field === "exp_yr") return String(formatCareerYearMonth(row.exp_yr) || ""); // 경력연차 포맷 반영
    if (field === "hope_rate_amt") return String(amountFormatter(row.hope_rate_amt) || ""); // 금액 포맷 반영
    return String(row[field] == null ? "" : row[field]); // 일반 필드 문자열화
}

function normalizeHr010Digits(value) { // 숫자 검색 보조: 콤마/원/공백 제거
    return String(value == null ? "" : value).replace(/\D/g, "");
}

function matchHr010FieldKeyword(row, field, keyword, keywordDigits) { // 필드별 검색 일치 여부
    const text = getHr010SearchTextByField(row, field);
    if (text.toLowerCase().includes(keyword)) {
        return true;
    }

    // 희망단가는 숫자만 입력해도 매칭되도록 추가 비교
    if (field === "hope_rate_amt" && keywordDigits) {
        return normalizeHr010Digits(text).includes(keywordDigits);
    }

    return false;
}

// 조회조건+검색어 필터
function applyHr010ConditionFilter(list, searchType, rawKeyword) {
    if (!Array.isArray(list)) return []; // 안전가드
    if (!rawKeyword) return list; // 검색어 없으면 원본 반환
    const keyword = String(rawKeyword).toLowerCase(); // 대소문자 무시
    const keywordDigits = normalizeHr010Digits(rawKeyword);

    if (!searchType) { // '전체' 선택 시 전체 검색 가능 필드 대상
        return list.filter(function (row) {
            return hr010SearchableFields.some(function (field) {
                return matchHr010FieldKeyword(row, field, keyword, keywordDigits); // 어느 한 필드라도 포함되면 통과
            });
        });
    }

    return list.filter(function (row) { // 특정 필드 선택 시 해당 필드만 검색
        return matchHr010FieldKeyword(row, searchType, keyword, keywordDigits); // 부분일치
    });
}
