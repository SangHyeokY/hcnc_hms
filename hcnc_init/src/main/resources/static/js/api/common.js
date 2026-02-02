function setComCode(strId, strGrpCd, strTag, id = 'cd', name = 'cd_nm', done, bTotal = false) {

    $.ajax({
        url: "/common/getCm",
        type: "POST",
        data: {
            grp_cd: strGrpCd,
            tag: strTag
        },
        success: function (data) {
            bindComCode(strId, data.res, bTotal, id, name);
            if (typeof done === "function") {
                done(data.res || []);
            }
        },
        error: function () {
            alert("콤보박스 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

function bindComCode(strId, jsonData, bTotal, id, name) {
    const select = $("#" + strId)[0];

    // 기존 옵션 제거
    select.innerHTML = "";

    if (bTotal) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "전체";
        select.appendChild(option);
    }

    jsonData.forEach((item) => {
        const option = document.createElement("option");
        option.value = eval("item." + id);
        option.textContent = eval("item." + name);
        select.appendChild(option);
    })
}

// 태그 입력 공통 유틸 (입력 + datalist + 태그 목록 + hidden 동기화)
function createTagInput(config) {
    var $input = $(config.inputSelector);
    var $list = $(config.listSelector);
    var $hidden = $(config.hiddenSelector);
    var $help = config.helpSelector ? $(config.helpSelector) : $list.closest(".tag-input-box").find(".tag-help");
    var $datalist = config.datalistSelector ? $(config.datalistSelector) : null;
    var getValue = config.getValue; 
    var getLabel = config.getLabel;
    var matchMode = config.matchMode || "prefix";
    var options = [];
    var map = {};
    var tags = []; 

    $input.addClass("tag-input-field");

    // 코드/라벨 매핑 생성
    function buildMap() {
        map = {};
        options.forEach(function (item) {
            var key = getValue(item);
            if (key != null) {
                map[String(key)] = getLabel(item) || key;
            }
        });
    }

    // 옵션을 렌더링해서 자동완성 목록 생성
    function renderDatalist() {
        if (!$datalist) return;
        $datalist.empty();
        options.forEach(function (item) {
            var label = getLabel(item);
            if (label == null) return;
            var opt = document.createElement("option");
            opt.value = label;
            $datalist.append(opt);
        });
    }

    // hidden 필드랑 태그 동기화
    function syncHidden() {
        var codes = tags.map(function (t) { return t.code; }).join(",");
        $hidden.val(codes);
    }

    // 태그 리스트 렌더링
    function renderTags() {
        $list.empty();
        tags.forEach(function (tag) {
            var $item = $("<li class=\"tag-item\"></li>");
            $item.attr("data-code", tag.code);
            $item.append(document.createTextNode(tag.label));
            var $remove = $("<button type=\"button\" class=\"tag-remove\" aria-label=\"태그 삭제\">x</button>");
            $item.append($remove);
            $list.append($item);
        });
        if ($help && $help.length) {
            $help.toggle(tags.length === 0);
        }
        syncHidden();
    }

    // 코드로 태그 추가
    function addByCode(code) {
        if (!code) return;
        if (tags.some(function (t) { return t.code === code; })) return;
        var label = map[code] || code;
        tags.push({ code: code, label: label });
        renderTags();
    }

    // 라벨 입력으로 태그 추가
    function addByLabel(raw) {
        var label = $.trim(raw || "");
        if (!label) return;
        var code = null;
        var lowered = label.toLowerCase();
        options.some(function (item) {
            var name = String(getLabel(item) || "");
            if (!name) return false;
            if (name.toLowerCase() === lowered) {
                code = String(getValue(item));
                return true;
            }
            return false;
        });
        if (!code && matchMode === "prefix") {
            options.some(function (item) {
                var name = String(getLabel(item) || "");
                if (!name) return false;
                if (name.toLowerCase().startsWith(lowered)) {
                    code = String(getValue(item));
                    return true;
                }
                return false;
            });
        }
        if (!code) return;
        addByCode(code);
    }

    // 코드로 태그 삭제
    function removeByCode(code) {
        tags = tags.filter(function (t) { return t.code !== code; });
        renderTags();
    }

    // 저장된 CSV에서 태그 재구성
    function setFromValue(value) {
        tags = [];
        var raw = String(value || "").trim();
        if (!raw) {
            renderTags();
            return;
        }
        raw.split(",").forEach(function (code) {
            var trimmed = $.trim(code);
            if (trimmed) {
                addByCode(trimmed);
            }
        });
    }

    $list.on("click", ".tag-remove", function () {
        var code = $(this).closest(".tag-item").data("code");
        removeByCode(code);
    });

    $input.on("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            addByLabel($(this).val());
            $(this).val("").focus();
        }
    });

    // 외부에서 쓰는 API
    return {
        setOptions: function (list) {
            options = list || [];
            buildMap();
            renderDatalist();
        },
        setFromValue: setFromValue,
        clear: function () { setFromValue(""); },
        addByCode: addByCode,
        addByLabel: addByLabel
    };
}
