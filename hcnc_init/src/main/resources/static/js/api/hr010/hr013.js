// hr013.js
window.initTab3 = function() {
    if (!window.hr013Table) buildHr013Table();
    loadHr013TableData();
};

function buildHr013Table() {
    if (!document.getElementById("TABLE_HR013_A")) return;

    window.hr013Table = new Tabulator("#TABLE_HR013_A", {
        layout: "fitColumns",
        placeholder: "데이터 없음",
        columns: [
            { title: "당사 여부", field: "inprj_yn", hozAlign: "center", formatter: ynCheckboxFormatter },
            { title: "기간", field: "st_ed_dt", hozAlign: "center" },
            { title: "고객사", field: "cust_nm"},
            { title: "프로젝트명", field: "prj_nm"},
            { title: "계약단가", field: "rate_amt", hozAlign: "right", formatter: amountFormatter },
            { title: "역할", field: "role_nm", hozAlign: "center" },
            { title: "기술스택", field: "stack_txt", formatter: skillDisplayFormatter },
            { title: "투입률", field: "alloc_pct", hozAlign: "right", formatter: perentageFormatter },
            { title: "비고", field: "remark"}
        ],
        data: []
    });
}

function loadHr013TableData() {
    const dev_id = window.currentDevId;
    if (!window.hr013Table) return;

    $.ajax({
        url: "/hr014/list",
        type: "GET",
        data: { dev_id: dev_id },
        success: function(res) {
            // 데이터를 배열로 변환
            const data = res && res.res ? res.res: [];
            const dataArray = Array.isArray(data) ? data : [data];

            // 데이터 없으면 setData 호출하지 않고, placeholder가 표시되도록 처리 가능
            window.hr013Table.setData(dataArray);
            window.hr013Table.redraw();
        },
        error: function() { alert("Tab3 데이터 로드 실패"); }
    });
}

function ynCheckboxFormatter(cell) {
    var checked = cell.getValue() === "Y" ? " checked" : "";
    return "<input type='checkbox'" + checked + " disabled />";
}

// 기술스택 태그 맵 구성
function buildSkillMap() {
    skillMap = {};
    skillOptions.forEach(function (item) {
        if (item && item.cd != null) {
            skillMap[item.cd] = item.cd_nm || item.cd;
        }
    });
}

// 태그 추가 (코드)
function addSkillTagByCode(code) {
    if (!code) return;
    if (skillTags.some(function (t) { return t.code === code; })) return;
    var label = skillMap[code] || code;
    skillTags.push({ code: code, label: label });
    renderSkillTags();
}

// 태그 추가 (라벨)
function addSkillTagByLabel(raw) {
    var label = $.trim(raw || "");
    if (!label) return;
    var code = null;
    skillOptions.some(function (item) {
        if (item && item.cd_nm === label) {
            code = item.cd;
            return true;
        }
        return false;
    });
    if (!code) {
        return;
    }
    addSkillTagByCode(code);
}

// 태그 삭제
function removeSkillTag(code) {
    if (!code) return;
    skillTags = skillTags.filter(function (t) { return t.code !== code; });
    renderSkillTags();
}

// 태그 렌더링
function renderSkillTags() {
    var $list = $("#hr014SkillTagList");
    var $help = $("#hr014SkillTagList").closest(".tag-input-box").find(".tag-help");
    $list.empty();
    skillTags.forEach(function (tag) {
        var $item = $("<li class=\"tag-item\"></li>");
        $item.attr("data-code", tag.code);
        $item.append(document.createTextNode(tag.label));
        var $remove = $("<button type=\"button\" class=\"tag-remove\" aria-label=\"태그 삭제\">x</button>");
        $item.append($remove);
        $list.append($item);
    });
    if ($help.length) {
        $help.toggle(skillTags.length === 0);
    }
    var codes = skillTags.map(function (t) { return t.code; }).join(",");
    $("#write_hr014_stack_txt").val(codes);
}

// 기존 값으로 태그 세팅
function setSkillTagsFromValue(value) {
    skillTags = [];
    var raw = String(value || "").trim();
    if (!raw) {
        renderSkillTags();
        return;
    }
    raw.split(",").forEach(function (code) {
        var trimmed = $.trim(code);
        if (trimmed) {
            addSkillTagByCode(trimmed);
        }
    });
}

// 테이블 표시용 기술스택 변환
function skillDisplayFormatter(cell) {
    var value = cell.getValue();
    if (value == null || value === "") {
        return "";
    }
    var raw = String(value);
    var parts = raw.split(",");
    var labels = parts.map(function (code) {
        var trimmed = $.trim(code);
        if (!trimmed) return "";
        return skillMap[trimmed] || trimmed;
    }).filter(function (item) { return item !== ""; });
    return labels.join(", ");
}

// 투입률
function perentageFormatter(cell) {
    if (cell.getValue() === null || cell.getValue() === undefined || cell.getValue() === "") {
        return "";
    }
    return formatPercentInput(cell.getValue());
}

// 계약단가(,),(테이블표)
function amountFormatter(cell) {
    if (cell.getValue() === null || cell.getValue() === undefined || cell.getValue() === "") {
        return "";
    }
    return formatNumberInput(cell.getValue());

}

// 날짜(테이블 표시)
function toDateInput(v) {
    if (!v) return "";
    var d = new Date(Number(v));
    if(isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);

}

// 숫자 콤마 포맷(입력값)
function formatNumberInput(value) {
    if (value === null || value === undefined) return "";
    var raw = String(value).replace(/[^\d]/g, "");
    if (raw === "") return "";
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 퍼센트 포맷(입력값)
function formatPercentInput(value) {
    if (value === null || value === undefined) return "";
    var raw = String(value).replace(/[^\d]/g, "");
    if (raw === "") return "";
    return raw + "%";
}