$(document).ready(function() {
    // 태그 추가/삭제를 위한 클라이언트 상태.
    var tags = [];
    var table = null;
    var fallbackData = [
        {
            id: 1,
            name: "테스터",
            birthDate: "1900-01-01",
            phone: "010-0000-0000",
            email: "test@hcnc.co.kr",
            area: "울산",
            languages: "Java, SQLServer, Oracle",
            experience: "10년 2개월",
            education: "OO대학교 OO학과 학사",
            certs: "정보처리기사",
            hopePay: "월 1,000만원",
            availableDate: "2026-01-01",
            contractType: "개인",
            workType: "상주/재택/혼합"
        },
        {
            id: 2,
            name: "홍길동",
            birthDate: "1992-07-12",
            phone: "010-1234-5678",
            email: "hong@test.co.kr",
            area: "서울",
            languages: "Spring, React",
            experience: "7년 5개월",
            education: "OO대학교 컴퓨터공학과 학사",
            certs: "SQLD",
            hopePay: "월 800만원",
            availableDate: "2026-02-15",
            contractType: "법인",
            workType: "상주"
        }
    ];

    function syncTagsHidden() {
        $('#tagsHidden').val(tags.join(','));
    }

    // 태그 리스트를 다시 그리고 hidden 값 동기화.
    function renderTags() {
        var $list = $('#tagList');
        $list.empty();
        tags.forEach(function(tag, index) {
            var $item = $('<li class="tag-item"></li>');
            var $remove = $('<button type="button" class="tag-remove" aria-label="태그 삭제">x</button>');
            $remove.data('index', index);
            $item.append(document.createTextNode(tag));
            $item.append($remove);
            $list.append($item);
        });
        syncTagsHidden();
    }

    // 입력값 정규화 및 빈값/중복 태그 방지.
    function addTag(raw) {
        var tag = $.trim(raw);
        if (!tag) {
            return;
        }
        if (tags.indexOf(tag) !== -1) {
            return;
        }
        tags.push(tag);
        renderTags();
    }

    // Enter 또는 콤마 입력 시 태그 추가.
    $('#tagInput').on('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            var value = $(this).val();
            value.split(',').forEach(addTag);
            $(this).val('');
        }
    });

    // 포커스 아웃 시 남은 입력값을 태그로 추가.
    $('#tagInput').on('blur', function() {
        var value = $(this).val();
        if (value) {
            addTag(value);
            $(this).val('');
        }
    });

    // 삭제 버튼 클릭 시 인덱스로 태그 제거.
    $('#tagList').on('click', '.tag-remove', function() {
        var index = $(this).data('index');
        if (index >= 0) {
            tags.splice(index, 1);
            renderTags();
        }
    });

    function buildTable() {
        table = new Tabulator("#TABLE_MAIN", {
            layout: "fitColumns",
            placeholder: "데이터가 없습니다.",
            height: "360px",
            columns: [
                { title: "성명", field: "name", width: 120 },
                { title: "생년월일", field: "birthDate", width: 120, hozAlign: "center" },
                { title: "연락처", field: "phone", width: 140, hozAlign: "center" },
                { title: "이메일", field: "email", width: 200 },
                { title: "거주지역", field: "area", width: 120, hozAlign: "center" },
                { title: "주 개발언어", field: "languages", width: 180 },
                { title: "경력연차", field: "experience", width: 120, hozAlign: "center" },
                { title: "최종학력", field: "education", width: 200 },
                { title: "보유 자격증", field: "certs", width: 160 }
            ],
            rowDblClick: function(e, row) {
                showRowPopup(row.getData());
            }
        });
    }

    function loadTableData() {
        // TODO: DB 연동 시 이 부분을 API 호출로 교체하세요.
        return Promise.resolve(fallbackData);
    }

    function showRowPopup(rowData) {
        $('#personName').text(rowData.name || '');
        $('#personBirthDate').text(rowData.birthDate || '');
        $('#personPhone').text(rowData.phone || '');
        $('#personEmail').text(rowData.email || '');
        $('#personArea').text(rowData.area || '');
        $('#personLanguages').text(rowData.languages || '');
        $('#personExperience').text(rowData.experience || '');
        $('#personEducation').text(rowData.education || '');
        $('#personCerts').text(rowData.certs || '');
        $('#personWorkType').text(rowData.workType || '');
        $('#personHopePay').text(rowData.hopePay || '');
        $('#personAvailableDate').text(rowData.availableDate || '');
        $('#personContractType').text(rowData.contractType || '');

        $('#personDetailModal').addClass('is-open');
    }

    function closePersonModal() {
        $('#personDetailModal').removeClass('is-open');
    }

    // 엑셀 다운로드 버튼
    $('.btn-excel').on('click', function() {
        console.log('엑셀 다운로드');
        // 엑셀 다운로드 로직
    });
    
    // 출력 버튼
    $('.btn-print').on('click', function() {
        console.log('출력');
        // 출력 로직
    });
    
    // 승인 버튼
    $('.btn-approve').on('click', function() {
        console.log('승인');
        // 승인 로직
    });
    
    // 기본 버튼들
    $('.btn-new').on('click', function() {
        console.log('신규');
    });
    
    $('.btn-edit').on('click', function() {
        console.log('수정');
    });
    
    $('.btn-delete').on('click', function() {
        console.log('삭제');
    });

    $('#personDetailModal').on('click', '.modal-close', function() {
        closePersonModal();
    });

    $('#personDetailModal').on('click', '.modal-backdrop', function() {
        closePersonModal();
    });

    $(document).on('keydown', function(event) {
        if (event.key === 'Escape') {
            closePersonModal();
        }
    });

    buildTable();
    loadTableData().then(function(data) {
        if (table) {
            table.replaceData(data);
        }
    });
});
