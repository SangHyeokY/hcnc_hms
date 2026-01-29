function setComCode(strId, strGrpCd, strTag, id = 'cd', name = 'cd_nm', done) {

    $.ajax({
        url: "/common/getCm",
        type: "POST",
        data: {
            grp_cd: strGrpCd,
            tag: strTag
        },
        success: function (data) {
            bindComCode(strId, data.res, id, name);
            if (typeof done === "function") {
                done(data.res || []);
            }
        },
        error: function () {
            alert("콤보박스 데이터를 불러오는 중 오류가 발생했습니다.");
        }
    });
}

function bindComCode(strId, jsonData, id, name) {
    const select = $("#" + strId)[0];

    // 기존 옵션 제거
    select.innerHTML = "";

    jsonData.forEach((item) => {
        const option = document.createElement("option");
        option.value = eval("item." + id);
        option.textContent = eval("item." + name);
        select.appendChild(option);
    })
}
