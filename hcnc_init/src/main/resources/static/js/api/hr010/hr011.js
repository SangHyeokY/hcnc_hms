// hr011.js
let hr011ModalMode = "view";
window.hr011Data = null;

window.initTab1 = function () {
    if (!window.tab1) return;

    loadHr011TableData(window.currentDevId);

    $(".btn-tab1-edit")
        .off("click")
        .on("click", () => openHr011Modal("edit"));

    $(".btn-tab1-new")
        .off("click")
        .on("click", () => openHr011Modal("new"));

    $(".btn-tab1-delete")
        .off("click")
        .on("click", deleteHr011Modal);

    $("#btn-tab1-save")
        .off("click")
        .on("click", saveHr011TableData);
};

function openHr011Modal(mode) {
    hr011ModalMode = mode;

    if (mode === "edit") {
        if (!window.hr011Data) {
            alert("수정할 데이터가 없습니다.");
            return;
        }
        $("#hr011-type").text("수정");
        fillHr011ModalForm(window.hr011Data);
        setHr011ModalEditable(true);
    } else if (mode === "new") {
          $("#hr011-type").text("등록");
          clearHr011ModalForm();
          setHr011ModalEditable(true);
          if (window.currentDevId) {
                 $("#dev_id_input").val(window.currentDevId);
             } else {
                 alert("세션이 만료되었습니다.");
                 return;
          }
    }
    $("#upsert-user-hrm").show();
}

function closeUpsertUserModal() {
    hr011ModalMode = "view";
    setHr011ModalEditable(false);
    clearHr011Form();
    clearHr011ModalForm();
    $("#upsert-user-hrm").hide();

}

function fillHr011Form(data) {
    $("#org_nm").val(data.org_nm || "");
    $("#biz_typ").val(data.biz_typ || "");
    $("#st_dt").val(data.st_dt || "");
    $("#ed_dt").val(data.ed_dt || "");
    $("#amt").val(formatNumber(data.amt));
    $("#remark").val(data.remark || "");
}

function clearHr011Form() {
    $("#org_nm, #biz_typ, #st_dt, #ed_dt, #amt, #remark").val("");
}

function clearHr011ModalForm() {
    $("#org_nm_input, #biz_typ_input, #st_dt_input, #ed_dt_input, #amt_input, #remark_input, #ctrt_id_input, #dev_id_input").val("");
}

function setHr011ViewReadonly() {
    $("#org_nm, #biz_typ, #st_dt, #ed_dt, #amt, #remark")
        .prop("disabled", true);
}

function loadHr011TableData(devId) {
    if (!devId) {
        clearHr011Form();
        setHr011ViewReadonly();
        $(".btn-tab1-new").show();
        $(".btn-tab1-edit").hide();
        window.hr011Data = null;
        return;
    }

    $.ajax({
        url: "/hr010/tab1",
        type: "GET",
        data: { dev_id: devId },
        success: (res) => {
            const data = res?.res ?? null;
            window.hr011Data = data;
            console.log(data);

            clearHr011Form();
            setHr011ViewReadonly();

              if (data) {
                  fillHr011Form(data);
                  $(".btn-tab1-new").hide();
                  $(".btn-tab1-edit").show();
              } else {
                  $(".btn-tab1-new").show();
                  $(".btn-tab1-edit").hide();
              }
          },
        error: () => {
            alert("데이터 조회 실패");
            clearHr011Form();
            setHr011ViewReadonly();
            $(".btn-tab1-new").show();
            $(".btn-tab1-edit").hide();
            window.hr011Data = null;
        }
    });
}

function saveHr011TableData() {
    if (!validateHr011Form()) return;

    const param = {
        ctrtId: hr011ModalMode === "edit" ? $("#ctrt_id_input").val() : null,
        devId: $("#dev_id_input").val(),
        orgNm: $("#org_nm_input").val(),
        bizTyp: $("#biz_typ_input").val(),
        stDt: $("#st_dt_input").val(),
        edDt: $("#ed_dt_input").val(),
        amt: unformatNumber($("#amt_input").val()),
        remark: $("#remark_input").val()
    };

    $.ajax({
        url: "/hr010/tab1_upsert",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(param),
        success: () => {
            alert("저장되었습니다.");
            closeUpsertUserModal();
            loadHr011TableData(window.currentDevId);
        },
        error: () => alert("저장 실패")
    });
}

function deleteHr011Modal() {
    if (!window.hr011Data || !window.hr011Data.ctrt_id) {
        alert("삭제할 데이터가 없습니다.");
        return;
    }
    if (!confirm("정말로 삭제하시겠습니까?")) return;
     const param = {
        ctrtId: window.hr011Data.ctrt_id,
        devId: window.currentDevId
     };

    $.ajax({
        url: "/hr010/tab1_delete",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(param),
        success: () => {
            alert("삭제되었습니다.");
            closeUpsertUserModal();
            loadHr011TableData(window.currentDevId);
        },
        error: () => {
            alert("삭제에 실패했습니다.");
        }
    });
}

function fillHr011ModalForm(data) {
    $("#org_nm_input").val(data.org_nm || "");
    $("#biz_typ_input").val(data.biz_typ || "");
    $("#st_dt_input").val(data.st_dt || "");
    $("#ed_dt_input").val(data.ed_dt || "");
    $("#amt_input").val(formatNumber(data.amt));
    $("#remark_input").val(data.remark || "");
    $("#dev_id_input").val(data.dev_id || "");
    $("#ctrt_id_input").val(data.ctrt_id || ""),
    console.log("아이디 : "+data.dev_id )
}

function setHr011ModalEditable(editable) {
    $("#org_nm_input, #biz_typ_input, #st_dt_input, #ed_dt_input, #amt_input, #remark_input").prop("disabled", !editable);
}

// 유효성 검사
function validateHr011Form() {
    const orgNm   = $("#org_nm_input").val().trim();
    const bizTyp  = $("#biz_typ_input").val().trim();
    const stDt    = $("#st_dt_input").val();
    const edDt    = $("#ed_dt_input").val();
    const amtRaw  = unformatNumber($("#amt_input").val());

    if (!orgNm) {
        alert("소속사를 입력해주세요.");
        $("#org_nm_input").focus();
        return false;
    }

    if (!bizTyp || bizTyp == null) {
        alert("사업자 유형을 선택해주세요.");
        $("#biz_typ_input").focus();
        return false;
    }

    if (!stDt) {
        alert("계약 시작일을 입력해주세요.");
        $("#st_dt_input").focus();
        return false;
    }

    if (!edDt) {
        alert("계약 종료일을 입력해주세요.");
        $("#ed_dt_input").focus();
        return false;
    }

    if (new Date(stDt) > new Date(edDt)) {
        alert("계약 종료일은 시작일 이후여야 합니다.");
        $("#ed_dt_input").focus();
        return false;
    }

    if (!amtRaw) {
        alert("계약 금액을 입력해주세요.");
        $("#amt_input").focus();
        return false;
    }

    if (isNaN(amtRaw) || Number(amtRaw) <= 0) {
        alert("계약 금액은 0보다 큰 숫자여야 합니다.");
        $("#amt_input").focus();
        return false;
    }
    return true;
}

// ============================================================================== //

// 숫자에 콤마
function formatNumber(num) {
    if (!num) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 숫자만 입력
$("#amt_input, #amt").on("input", function () {
    let input_number = this.value.replace(/[^0-9]/g, "");
    this.value = formatNumber(input_number);
});

// 문자열 가공
function unformatNumber(str) {
    return str ? str.replace(/,/g, "") : "";
}