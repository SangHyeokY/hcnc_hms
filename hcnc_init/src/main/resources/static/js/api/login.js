function showPwChgModal(userid) {
    const modal = document.getElementById("user-pwchange-area");
    const id = document.getElementById("user_pwchg_id");
    const pw = document.getElementById("user_pwchg_hash");

    id.value = userid;
    pw.value = "";
    modal.classList.remove("show");
    modal.style.display = "block";
    modal.offsetHeight;
    setTimeout(() => {
        modal.classList.add("show");
    }, 100);
}

// 사용자 등록/수정 모달 닫기
function closePwChgModal() {
    const modal = document.getElementById("user-pwchange-area");
    modal.classList.remove("show");
    setTimeout(() => {
        modal.style.display = "none";
    }, 250);
}


// 로드할때 init하기
document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("btn-pwchange-save").addEventListener("click", function () {
        upsertPwChangeBtn();
    });
});


// 사용자 신규/수정 저장
function upsertPwChangeBtn() {
    const userId = document.getElementById("user_pwchg_id").value;
    const pwdHash = document.getElementById("user_pwchg_hash").value;

    if (!userId) {
        alert("아이디를 입력해주세요.");
        document.getElementById("user_pwchg_id").focus();
        return;
    }

    if (!pwdHash) {
        alert("비밀번호를 입력해주세요.");
        document.getElementById("user_pwchg_hash").focus();
        return;
    }

    $.ajax({
        url: "/pwChg",
        type: "POST",
        data: {
            username: userId,
            password: pwdHash
        },
        success: function (response) {
            if (response.success) {
                alert("저장되었습니다.");
            }
            else {
                alert("저장에 실패했습니다.");
            }
        },
        error: function () {
            alert("저장 중 오류가 발생했습니다.");
        }
    });
}