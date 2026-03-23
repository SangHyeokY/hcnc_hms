window.HR030_DASHBOARD_DATA = {
    alertCount: 4,
    kpis: [
        {
            key: "employees",
            label: "전체 프리랜서 수",
            value: 248,
            delta: "+4",
            deltaTone: "up",
            description: "최근 30일 등록 기준"
        },
        {
            key: "attendance",
            label: "현재 투입 인원",
            value: 186,
            delta: "75.0%",
            deltaTone: "neutral",
            description: "진행 프로젝트 배정 기준"
        },
        {
            key: "vacation",
            label: "대기 인원",
            value: 34,
            delta: "-3",
            deltaTone: "down",
            description: "즉시 제안 가능 인력 포함"
        },
        {
            key: "newJoiner",
            label: "신규 등록 인원",
            value: 12,
            delta: "+2",
            deltaTone: "up",
            description: "이번 달 신규 등록"
        },
        {
            key: "resignation",
            label: "계약 종료 예정",
            value: 7,
            delta: "D-14",
            deltaTone: "warn",
            description: "2주 내 종료 예정"
        },
        {
            key: "approvals",
            label: "검토 요청 건수",
            value: 9,
            delta: "+2",
            deltaTone: "warn",
            description: "투입/계약 검토 기준"
        }
    ],
    charts: {
        departments: [
            { label: "백엔드", value: 76 },
            { label: "프론트엔드", value: 54 },
            { label: "퍼블리싱", value: 33 },
            { label: "PM/PL", value: 29 },
            { label: "QA/운영", value: 29 },
            { label: "데이터/AI", value: 27 }
        ],
        hiringTrend: [
            { month: "10월", hired: 5, exited: 2 },
            { month: "11월", hired: 7, exited: 3 },
            { month: "12월", hired: 4, exited: 2 },
            { month: "1월", hired: 6, exited: 2 },
            { month: "2월", hired: 8, exited: 3 },
            { month: "3월", hired: 12, exited: 4 }
        ],
        attendance: [
            { label: "투입중", value: 186, color: "#4f6ff7" },
            { label: "제안중", value: 24, color: "#1fb6a6" },
            { label: "대기중", value: 31, color: "#f3b44f" },
            { label: "종료예정", value: 7, color: "#f08b86" }
        ]
    },
    recentEmployees: [
        {
            employeeId: "FR260317",
            name: "김현우",
            department: "Java/Spring · 금융권 운영",
            position: "12년차",
            employmentType: "850만원",
            joinDate: "2026-03-17",
            status: "검토중"
        },
        {
            employeeId: "FR260310",
            name: "박서연",
            department: "React/Vue · 커머스",
            position: "8년차",
            employmentType: "700만원",
            joinDate: "2026-03-10",
            status: "투입중"
        },
        {
            employeeId: "FR260304",
            name: "이도윤",
            department: "웹퍼블리싱 · 반응형",
            position: "5년차",
            employmentType: "520만원",
            joinDate: "2026-03-04",
            status: "대기중"
        },
        {
            employeeId: "FR260225",
            name: "정지원",
            department: "PMO · 대형 SI",
            position: "7년차",
            employmentType: "650만원",
            joinDate: "2026-02-25",
            status: "제안중"
        },
        {
            employeeId: "FR260212",
            name: "오세훈",
            department: "QA · 테스트 자동화",
            position: "6년차",
            employmentType: "580만원",
            joinDate: "2026-02-12",
            status: "투입중"
        },
        {
            employeeId: "FR260205",
            name: "한예림",
            department: "Python/Data · 리포팅",
            position: "9년차",
            employmentType: "780만원",
            joinDate: "2026-02-05",
            status: "대기중"
        }
    ],
    approvals: [
        {
            requestId: "APR-260323-01",
            title: "A은행 운영 프로젝트 투입 검토",
            employeeName: "김현우",
            department: "Java/Spring",
            requestedAt: "09:20",
            dueText: "11:00까지",
            type: "투입",
            status: "검토중"
        },
        {
            requestId: "APR-260323-02",
            title: "커머스 프론트 포지션 고객 제안",
            employeeName: "박서연",
            department: "React/Vue",
            requestedAt: "08:40",
            dueText: "13:00까지",
            type: "제안",
            status: "검토중"
        },
        {
            requestId: "APR-260322-14",
            title: "퍼블리셔 계약 조건 확정",
            employeeName: "이도윤",
            department: "웹퍼블리싱",
            requestedAt: "어제 17:30",
            dueText: "오늘 검토",
            type: "계약",
            status: "확정"
        },
        {
            requestId: "APR-260321-06",
            title: "데이터 분석 인력 단가 재검토",
            employeeName: "한예림",
            department: "Python/Data",
            requestedAt: "3/21 14:10",
            dueText: "사유 보완 필요",
            type: "단가",
            status: "보류"
        },
        {
            requestId: "APR-260323-03",
            title: "QA 리더 포지션 1차 인터뷰 조율",
            employeeName: "오세훈",
            department: "QA 자동화",
            requestedAt: "10:15",
            dueText: "15:00까지",
            type: "인터뷰",
            status: "검토중"
        }
    ],
    schedule: [
        {
            time: "10:00",
            category: "공유",
            title: "A은행 운영 제안서 회신 예정",
            description: "백엔드/PM 후보 2명 고객사 전달 예정입니다."
        },
        {
            time: "11:30",
            category: "인터뷰",
            title: "커머스 프론트 포지션 1차 인터뷰",
            description: "React/Vue 후보 대상 비대면 인터뷰 진행"
        },
        {
            time: "14:00",
            category: "미팅",
            title: "3월 종료 예정 인력 재배치 회의",
            description: "종료 예정 7명 재배치 우선순위 검토"
        },
        {
            time: "16:30",
            category: "마감",
            title: "프리랜서 프로필 최신화 요청 마감",
            description: "기술스택, 희망단가, 가용일 업데이트 확인"
        }
    ]
};
