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
    }
    $("#upsert-user-hrm").show();
}

function closeUpsertUserModal() {
    hr011ModalMode = "view";
    setHr011ModalEditable(false);
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
       devId: window.currentDevId,
       orgNm: $("#org_nm_input").val(),
       bizTyp: $("#biz_typ_input").val(),
       stDt: $("#st_dt_input").val(),
       edDt: $("#ed_dt_input").val(),
       amt: unformatNumber($("#amt_input").val()),
       remark: $("#remark_input").val()
   };

//    const url = window.hr011Data
//        ? "/hr010/tab1_update"
//        : "/hr010/tab1_upsert";

    $.ajax({
        url: "/hr010/tab1_upsert",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(param),
        success: () => {
            alert("저장되었습니다.");
            // closeUpsertUserModal();
            // loadHr011TableData(window.currentDevId);
        },
        error: () => alert("저장 실패")
    });
}

function fillHr011ModalForm(data) {
    $("#org_nm_input").val(data.org_nm || "");
    $("#biz_typ_input").val(data.biz_typ || "");
    $("#st_dt_input").val(data.st_dt || "");
    $("#ed_dt_input").val(data.ed_dt || "");
    $("#amt_input").val(formatNumber(data.amt));
    $("#remark_input").val(data.remark || "");
}

function setHr011ModalEditable(editable) {
    $("#org_nm_input, #biz_typ_input, #st_dt_input, #ed_dt_input, #amt_input, #remark_input")
        .prop("disabled", !editable);
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


function formatNumber(num) {
    if (!num) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function unformatNumber(str) {
    return str ? str.replace(/,/g, "") : "";
}

$("#amt_input, #amt").on("input", function () {
    this.value = formatNumber(unformatNumber(this.value));
});
