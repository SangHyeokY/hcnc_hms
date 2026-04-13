// 사용자 관리 - hr020.js (hcnc_hms)

// 인적사항 리스트 테이블
var prjTable;

// 모드(insert: 등록 / update: 수정 / view: 상세조회)
var currentMode = "insert";
var currentHr020UserTypeTab = "staff";
var hr020SourceRows = [];

// 역할 공통코드
var jobCdMap = {};

// 개발자ID
window.currentDevId = null;

// ============================================================================== //

// 문서 첫 생성 시 실행
$(document).ready(async function () {
    buildPrjTable();

    // 탭별 이벤트 정의
    $(".search-btn-area .btn-search").text("조회");

    $(".toggle-filter-chip").on("click", function () {
        var nextType = String($(this).data("userType") || "staff");
        if (currentHr020UserTypeTab === nextType) {
            return;
        }

        currentHr020UserTypeTab = nextType;
        $(".toggle-filter-chip").removeClass("active");
        $(this).addClass("active");

        applyHr020UserTypeFilter();
        if (window.prjTable) {
            updateTabulatorGridCount(window.prjTable);
        }
    });

    // 테이블 로딩이 끝날 때 까지 로딩바 표시
    showLoading();

    $(".main-titlebar").addClass("hr020-main-titlebar");

    await new Promise(resolve => {
        setComCode("write_hr020_job_cd", "job_cd", "", "cd", "cd_nm", function (list) {
            jobCdMap = {};
            (list || []).forEach(function (item) {
                if (item.cd) {
                    jobCdMap[item.cd] = item.cd_nm;
                }
            });
            resolve();
        });
    });
    await loadPrjTableData();

    // 로딩 완료 후 테이블 건수 표시
    if (window.prjTable) updateTabulatorGridCount(window.prjTable);

    hideLoading();

    // ================================================ //

    // 검색 버튼 이벤트
    $(".btn-search").on("click", async function (event) {
        event.preventDefault();
        showLoading();
        await loadPrjTableData();
        if (window.prjTable) updateTabulatorGridCount(window.prjTable);
        hideLoading();
    });

    // 검색어 이벤트 (Enter 입력)
    $("#searchKeyword").on("keyup", async function (event) {
        if (event.key === "Enter") {
            showLoading();
            await loadPrjTableData();
            if (window.prjTable) updateTabulatorGridCount(window.prjTable);
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
        // openUserModal("view", rowData);
    });

    // 등록 버튼 이벤트
    $(".btn-main-add").on("click", function () {
        // openUserModal("insert");
    });

    // 수정 버튼 이벤트
    $(".btn-main-edit").on("click", function () {
        const rowData = btnEditView("수정할 ");
        if (!rowData) return;
        // openUserModal("update", rowData);
    });

    // 삭제 버튼 이벤트
    $(".btn-main-del").on("click", function () {
        // deleteUserRows();
    });
});

// ============================================================================== //

// 역할 표시용 라벨 변환
function jobCodeFormatter(cell) {
    var raw = normalizeJobValue(cell.getValue());
    if (!raw) return "-";

    return jobCdMap[raw] || raw;
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

// 역할 코드/라벨 정합성 보정(코드 우선)
function normalizeJobCodes() {
    if (!window.prjTable) {
        return;
    }
    var map = jobCdMap;
    var labelToCode = {};
    Object.keys(map).forEach(function (code) {
        labelToCode[map[code]] = code;
    });
    // 코드가 우선이며, 라벨만 있는 값은 코드로 역매핑한다.
    window.prjTable.getRows().forEach(function (row) {
        var data = row.getData();
        var current = normalizeJobValue(data.job_cd) || "";
        if (current && map[current]) {
            if (!data.role_nm) {
                row.update({ role_nm: map[current] });
            }
            return;
        }
        var label = normalizeJobValue(data.role_nm) || current;
        if (label && labelToCode[label]) {
            row.update({ job_cd: labelToCode[label], role_nm: label });
        }
    });
}

// 둥근 프로필 생성
function makeProfileCircle(name) {
    const text = getProfileText(name);
    const bgColor = stringToSoftColor(name);

    return `
        <div class="profile-circle-icon" style="background:${bgColor}">
            ${text}
        </div>
    `;
}

// ============================================================================== //

// 인적사항 리스트 테이블 생성 정의
function buildPrjTable() {
    if (!window.Tabulator) {
        console.error("Tabulator가 로드되지 않았습니다.");
        return;
    }
    if (!document.getElementById("TABLE_HR020_A")) {
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
    // layout: "fitColumns"일 때, widthGrow 사용할 땐, minWidth도 사용 / 그냥 너비만 지정할 땐 width만 주기
    prjTable = new Tabulator("#TABLE_HR020_A", {
        layout: "fitColumns",
        height: "100%",
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
                width: 60,
                headerSort: false,
                download: false,
                resizable: false
            },
            {
                title: "성명",
                field: "dev_nm",
                headerSort: true,
                resizable: false,
                width: 200,
                formatter: function (cell) {
                    const row = cell.getRow().getData();
                    const name = row.dev_nm || "";
                    const imgUrl = row.img_url;

                    let profileHtml = "";

                    if (row.has_img && imgUrl) {
                        profileHtml = `
                            <img src="${imgUrl}" class="profile-circle-icon"
                                 onerror="this.style.display='none'"/>
                        `;
                    } else {
                        profileHtml = makeProfileCircle(name);
                    }

                    return `
                        <div class="profile-circle-wrap">
                            ${profileHtml}
                            <span>${name}</span>
                        </div>
                    `;
                }
            },
            { title: "고객사", field: "cust_nm", widthGrow: 4, formatter: cell => emptyToDash(cell.getValue()) },
            { title: "dev_id", field: "dev_id", visible: false },
            { title: "프로젝트명", field: "prj_nm", widthGrow: 4, formatter: cell => emptyToDash(cell.getValue()) },
            {
                title: "역할",
                field: "job_cd",
                hozAlign: "center",
                formatter: jobCodeFormatter,
                editor: false,
                editable: false,
                widthGrow: 1
            },
            {
                title: "계약단가",
                field: "rate_amt",
                widthGrow: 3,
                formatter: function (cell) {
                    const value = cell.getValue();
                    const formatted = amountFormatter(value);
                    return `<div style="text-align:right;">
                        ${formatted || "-"}
                    </div>`;
                }
            },
            { title: "연락처", field: "tel", hozAlign: "center", widthGrow: 3, headerSort: false },
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
                field: "sido_cd",
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
            { title: "비고", field: "remark", headerSort: false, width: 200 }
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
            syncTableCheckboxes(prjTable);
        },
        // 행 더블 클릭
        rowDblClick: function (e, row) {
            var rowData = row.getData();
            // openUserModal("view", rowData);
        }
    });
}
// ============================================================================== //
// 타입 판별/필터 함수
function resolveHr020UserType(row) {
    if (!row || typeof row !== "object") {
        return "staff";
    }

    var devType = String(row.dev_type || "").toUpperCase();
    if (devType === "HCNC_F" || devType === "F") {
        return "freelancer";
    }
    if (devType === "HCNC_S" || devType === "S") {
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

function filterHr020RowsByType(list) {
    if (!Array.isArray(list)) {
        return [];
    }

    if (currentHr020UserTypeTab === "freelancer") {
        return list.filter(function (row) {
            return resolveHr020UserType(row) === "freelancer";
        });
    }

    return list.filter(function (row) {
        return resolveHr020UserType(row) !== "freelancer";
    });
}

function applyHr020UserTypeFilter() {
    if (!prjTable || typeof prjTable.setData !== "function") {
        return;
    }

    prjTable.setData(filterHr020RowsByType(hr020SourceRows));
}

// db로부터 리스트 불러와서 인적사항 테이블에 넣기
async function loadPrjTableData() {
    if (!prjTable || typeof prjTable.setData !== "function") {
        return;
    }

    try {
        // 리스트 불러오기
        const response = await $.ajax({
            url: "/hr020/list",
            type: "GET",
            data: {
                dev_nm: $("#insertNm").val(),
                // searchKeyword: keyword
            }
        });

        const list = response.res || [];

        if (!list.length) {
            hr020SourceRows = [];
            applyHr020UserTypeFilter();
            return;
        }

        hr020SourceRows = list;
        applyHr020UserTypeFilter();
        normalizeJobCodes();
        // prjTable.setData(response.res || []);
    } catch (e) {
        console.error(e);
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'error',
            title: '오류',
            text: '사용자 데이터를 불러오는 중 오류가 발생했습니다.',
        });
    }
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

// 계약단가 입력: 숫자만 허용하고 "원" 접미사 앞에서만 커서가 움직이도록 제어한다.
$("#rate_amt")
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

// alert 문자 가공
function btnEditView(alertPrefix = "") {
    if (!prjTable) return null;
    const rows = prjTable.getSelectedRows();
    const prefix = alertPrefix || "";
    if (rows.length !== 1) {
        showAlert({ // 알림(info), 경고(warning), 오류(error), 완료(success)
            icon: 'info',
            title: '알림',
            text:
                prefix +
                (rows.length === 0
                    ? '대상을 선택하세요.'
                    : '한 명만 선택해주세요.')
        });
        return null;
    }
    return rows[0].getData();
}
function emptyToDash(value) {
    return (value === null || value === undefined || value === "") ? "-" : value;
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
                text: `'개발자ID'가 없습니다.`
            });
            return;
        }
        location.href =
            `/common/getExcel?dev_id=${encodeURIComponent(devId)}&dev_nm=${encodeURIComponent(devNm)}`;
    });
}
