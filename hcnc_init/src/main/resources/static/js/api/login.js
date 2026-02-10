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
    const pwdChkHash = document.getElementById("user_pwchg_chk_hash").value;

    if (!userId) {
        // Swal로 알림
        Swal.fire({
            icon: 'success',
            title: '경고',
            text: '아이디를 입력해주세요.',
            showClass: { popup: '', backdrop: '' },
            hideClass: { popup: '', backdrop: '' },
            backdrop: true,
            allowOutsideClick: false,
            confirmButtonText: '확인',
            confirmButtonColor: '#3085d6',
            scrollbarPadding: false
        });
        document.getElementById("user_pwchg_id").focus();
        return;
    }

    if (!pwdHash) {
        // Swal로 알림
        Swal.fire({
            icon: 'warning',
            title: '경고',
            text: '새 비밀번호를 입력해주세요.',
            showClass: { popup: '', backdrop: '' },
            hideClass: { popup: '', backdrop: '' },
            backdrop: true,
            allowOutsideClick: false,
            confirmButtonText: '확인',
            confirmButtonColor: '#3085d6',
            scrollbarPadding: false
        });
        document.getElementById("user_pwchg_hash").focus();
        return;
    }

    if (!pwdChkHash) {
        // Swal로 알림
        Swal.fire({
            icon: 'warning',
            title: '경고',
            text: '비밀번호가 일치하지 않습니다.',
            showClass: { popup: '', backdrop: '' },
            hideClass: { popup: '', backdrop: '' },
            backdrop: true,
            allowOutsideClick: false,
            confirmButtonText: '확인',
            confirmButtonColor: '#3085d6',
            scrollbarPadding: false
        });
        document.getElementById("user_pwchg_hash").focus();
        return;
    }

    if (pwdHash !== pwdChkHash) {
        // Swal로 알림
        Swal.fire({
            icon: 'warning',
            title: '경고',
            text: '비밀번호가 일치하지 않습니다.',
            showClass: { popup: '', backdrop: '' },
            hideClass: { popup: '', backdrop: '' },
            backdrop: true,
            allowOutsideClick: false,
            confirmButtonText: '확인',
            confirmButtonColor: '#3085d6',
            scrollbarPadding: false
        });
        document.getElementById("user_pwchg_hash").focus();
        return;
    }

    let pwValid = validatePassword(pwdHash);
    if (!pwValid.ok){
        Swal.fire({
            icon: 'warning',
            title: '경고',
            text: pwValid.message,
            showClass: { popup: '', backdrop: '' },
            hideClass: { popup: '', backdrop: '' },
            backdrop: true,
            allowOutsideClick: false,
            confirmButtonText: '확인',
            confirmButtonColor: '#3085d6',
            scrollbarPadding: false
        });
        document.getElementById("user_pwchg_hash").focus();
        return;

    }

    $.ajax({
        url: "/pwChg",
        type: "POST",
        data: {
            username: userId,
            password: pwdHash,
            password_chk: pwdChkHash
        },
        success: function (response) {
            if (response.success) {
                closePwChgModal();
                // Swal로 알림
                Swal.fire({
                    icon: 'success',
                    title: '알림',
                    text: '비밀번호가 변경되었습니다.',
                    showClass: { popup: '', backdrop: '' },
                    hideClass: { popup: '', backdrop: '' },
                    backdrop: true,
                    allowOutsideClick: false,
                    confirmButtonText: '확인',
                    confirmButtonColor: '#3085d6',
                    scrollbarPadding: false
                });
            }
            else {
                // Swal로 알림
                Swal.fire({
                    icon: 'error',
                    title: '오류',
                    text: '비밀번호 변경 중 오류가 발생했습니다.',
                    showClass: { popup: '', backdrop: '' },
                    hideClass: { popup: '', backdrop: '' },
                    backdrop: true,
                    allowOutsideClick: false,
                    confirmButtonText: '확인',
                    confirmButtonColor: '#3085d6',
                    scrollbarPadding: false
                });
            }
        },
        error: function () {
            Swal.fire({
                icon: 'error',
                title: '오류',
                text: '비밀번호 변경 중 오류가 발생했습니다.',
                showClass: { popup: '', backdrop: '' },
                hideClass: { popup: '', backdrop: '' },
                backdrop: true,
                allowOutsideClick: false,
                confirmButtonText: '확인',
                confirmButtonColor: '#3085d6',
                scrollbarPadding: false
            });
        }
    });
}


/**
 * 8~16자, 영문 대문자/소문자/숫자/특수문자 각각 최소 1개 포함
 * 허용 특수문자: 일반적으로 많이 쓰는 범위로 제한 (원하면 확장 가능)
 */
function validatePassword(pw) {
    if (typeof pw !== "string") return { ok: false, message: "비밀번호 형식이 올바르지 않습니다." };

    // 공백 포함 금지(원하면 제거 가능)
    if (/\s/.test(pw)) return { ok: false, message: "비밀번호에 공백은 사용할 수 없습니다." };

    const regex =
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,16}$/;

    const ok = regex.test(pw);

    return ok
        ? { ok: true, message: "" }
        : { ok: false, message: "비밀번호는 8~16자의 영문 대/소문자, 숫자, 특수문자를 모두 포함해야 합니다." };
}