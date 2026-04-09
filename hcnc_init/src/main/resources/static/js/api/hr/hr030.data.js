window.HR030_DASHBOARD_DATA = {
    alertCount: 4,
    kpis: [
        {
            key: "total",
            label: "전체 인원",
            value: 248,
            delta: "+4",
            deltaTone: "up",
            description: "직원 + 프리랜서 운영 풀 기준"
        },
        {
            key: "employee",
            label: "직원 수",
            value: 92,
            delta: "37.1%",
            deltaTone: "neutral",
            description: "내부 인력 운영 기준"
        },
        {
            key: "freelancer",
            label: "프리랜서 수",
            value: 156,
            delta: "62.9%",
            deltaTone: "neutral",
            description: "외부 투입 가능 인력 풀 기준"
        },
        {
            key: "available",
            label: "즉시 투입 가능 인원",
            value: 34,
            delta: "+2",
            deltaTone: "up",
            description: "직원 + 프리랜서 운영, 즉시 제안 또는 재배치 가능 기준"
        },
        {
            key: "available_s",
            label: "즉시 투입 가능 (직원)",
            value: 20,
            delta: "+2",
            deltaTone: "up",
            description: "직원 운영, 즉시 제안 또는 재배치 가능 기준"
        },
        {
            key: "available_f",
            label: "즉시 투입 가능 (프리랜서)",
            value: 14,
            delta: "+2",
            deltaTone: "up",
            description: "프리랜서 운영, 즉시 제안 또는 재배치 가능 기준"
        }
    ],
    map: {
        defaultRegionId: "all",
        overview: {
            id: "all",
            name: "전체 권역",
            headcount: 248,
            available: 34,
            active: 186,
            avgCareer: "7.4년",
            avgRate: "678만원",
            leadSkill: "Java/Spring",
            note: "수도권 비중이 높고, 금융권 운영과 커머스 프로젝트가 전체 수요를 주도합니다.",
            industries: ["금융권 운영", "커머스", "공공/SI"],
            issueCount: 9,
            endingSoon: 7,
            skills: [
                { label: "Java/Spring", value: 72, color: "#4f6ff7" },
                { label: "React/Vue", value: 46, color: "#1fb6a6" },
                { label: "PM/PL", value: 34, color: "#f3b44f" },
                { label: "퍼블리싱", value: 29, color: "#a173ff" },
                { label: "QA/운영", value: 27, color: "#eb8079" }
            ],
            projects: [
                { client: "A은행 운영", role: "백엔드 2명 · PM 1명", status: "검토중", dueText: "오늘" },
                { client: "커머스 리뉴얼", role: "프론트 2명 · 퍼블 1명", status: "제안중", dueText: "D-2" },
                { client: "공공 차세대", role: "QA 자동화 1명", status: "투입중", dueText: "상시" }
            ]
        },
        regions: [
            {
                id: "seoul",
                name: "서울",
                headcount: 96,
                available: 13,
                active: 74,
                avgCareer: "8.2년",
                avgRate: "742만원",
                leadSkill: "Java/Spring",
                note: "금융권 운영과 커머스 고도화 비중이 높고, 즉시 제안 가능한 중급 백엔드 풀이 안정적입니다.",
                industries: ["금융권 운영", "커머스 고도화", "대형 SI"],
                issueCount: 3,
                endingSoon: 2,
                labelX: 122,
                labelY: 78,
                points: "108,58 134,54 148,70 140,92 112,90 102,72",
                skills: [
                    { label: "Java/Spring", value: 31, color: "#4f6ff7" },
                    { label: "React/Vue", value: 18, color: "#1fb6a6" },
                    { label: "PM/PL", value: 14, color: "#f3b44f" },
                    { label: "퍼블리싱", value: 11, color: "#a173ff" },
                    { label: "QA/운영", value: 9, color: "#eb8079" }
                ],
                projects: [
                    { client: "A은행 운영", role: "백엔드 2명 · PM 1명", status: "검토중", dueText: "11:00까지" },
                    { client: "B카드 차세대", role: "QA 자동화 1명", status: "투입중", dueText: "상시" },
                    { client: "패션 커머스", role: "프론트 1명", status: "제안중", dueText: "D-1" }
                ]
            },
            {
                id: "gyeonggi",
                name: "경기",
                headcount: 58,
                available: 8,
                active: 42,
                avgCareer: "7.1년",
                avgRate: "664만원",
                leadSkill: "React/Vue",
                note: "판교/분당 중심 프론트 수요가 높고, 상주 가능 인력 비중이 높습니다.",
                industries: ["플랫폼", "B2B SaaS", "모빌리티"],
                issueCount: 2,
                endingSoon: 1,
                labelX: 98,
                labelY: 110,
                points: "74,88 110,90 120,116 104,140 72,136 62,112",
                skills: [
                    { label: "React/Vue", value: 18, color: "#1fb6a6" },
                    { label: "Java/Spring", value: 14, color: "#4f6ff7" },
                    { label: "PM/PL", value: 8, color: "#f3b44f" },
                    { label: "퍼블리싱", value: 7, color: "#a173ff" },
                    { label: "QA/운영", value: 5, color: "#eb8079" }
                ],
                projects: [
                    { client: "모빌리티 운영", role: "프론트 1명", status: "검토중", dueText: "오늘" },
                    { client: "SaaS 관리자", role: "퍼블리셔 1명", status: "제안중", dueText: "D-2" }
                ]
            },
            {
                id: "incheon",
                name: "인천",
                headcount: 12,
                available: 2,
                active: 8,
                avgCareer: "6.4년",
                avgRate: "612만원",
                leadSkill: "QA/운영",
                note: "운영/지원 직군 비중이 높고, 프로젝트 단위 재배치 요청이 적은 지역입니다.",
                industries: ["운영 지원", "물류", "공공"],
                issueCount: 1,
                endingSoon: 0,
                labelX: 56,
                labelY: 96,
                points: "46,88 68,90 72,108 54,116 40,102",
                skills: [
                    { label: "QA/운영", value: 4, color: "#eb8079" },
                    { label: "Java/Spring", value: 3, color: "#4f6ff7" },
                    { label: "React/Vue", value: 2, color: "#1fb6a6" },
                    { label: "PM/PL", value: 2, color: "#f3b44f" },
                    { label: "퍼블리싱", value: 1, color: "#a173ff" }
                ],
                projects: [
                    { client: "물류 시스템", role: "운영 1명", status: "투입중", dueText: "상시" }
                ]
            },
            {
                id: "gangwon",
                name: "강원",
                headcount: 18,
                available: 3,
                active: 12,
                avgCareer: "6.9년",
                avgRate: "598만원",
                leadSkill: "Java/Spring",
                note: "원격 운영 포지션 위주로 운영되며, 중급 백엔드 인력 풀이 고르게 분포합니다.",
                industries: ["공공", "관광", "지역 플랫폼"],
                issueCount: 1,
                endingSoon: 1,
                labelX: 178,
                labelY: 94,
                points: "144,48 206,56 236,86 226,138 170,146 148,102",
                skills: [
                    { label: "Java/Spring", value: 6, color: "#4f6ff7" },
                    { label: "React/Vue", value: 4, color: "#1fb6a6" },
                    { label: "PM/PL", value: 3, color: "#f3b44f" },
                    { label: "퍼블리싱", value: 3, color: "#a173ff" },
                    { label: "QA/운영", value: 2, color: "#eb8079" }
                ],
                projects: [
                    { client: "관광 통합", role: "백엔드 1명", status: "검토중", dueText: "D-3" }
                ]
            },
            {
                id: "chungcheong",
                name: "충청",
                headcount: 24,
                available: 3,
                active: 18,
                avgCareer: "7.0년",
                avgRate: "641만원",
                leadSkill: "PM/PL",
                note: "공공/SI 프로젝트 PMO와 QA 비중이 높은 안정 권역입니다.",
                industries: ["공공", "차세대", "SI"],
                issueCount: 1,
                endingSoon: 1,
                labelX: 122,
                labelY: 156,
                points: "106,132 152,134 162,168 136,194 96,188 88,156",
                skills: [
                    { label: "PM/PL", value: 7, color: "#f3b44f" },
                    { label: "Java/Spring", value: 6, color: "#4f6ff7" },
                    { label: "QA/운영", value: 5, color: "#eb8079" },
                    { label: "React/Vue", value: 3, color: "#1fb6a6" },
                    { label: "퍼블리싱", value: 3, color: "#a173ff" }
                ],
                projects: [
                    { client: "공공 차세대", role: "PMO 1명", status: "투입중", dueText: "상시" },
                    { client: "행정 포털", role: "QA 1명", status: "종료예정", dueText: "D-10" }
                ]
            },
            {
                id: "jeolla",
                name: "전라",
                headcount: 16,
                available: 2,
                active: 11,
                avgCareer: "6.5년",
                avgRate: "576만원",
                leadSkill: "퍼블리싱",
                note: "원격 퍼블리싱과 운영 보강 수요가 꾸준하며, 단기 제안 포지션이 간헐적으로 발생합니다.",
                industries: ["운영 보강", "웹 접근성", "지역 서비스"],
                issueCount: 0,
                endingSoon: 1,
                labelX: 88,
                labelY: 230,
                points: "70,196 112,196 126,230 110,262 62,258 50,228",
                skills: [
                    { label: "퍼블리싱", value: 5, color: "#a173ff" },
                    { label: "React/Vue", value: 4, color: "#1fb6a6" },
                    { label: "Java/Spring", value: 3, color: "#4f6ff7" },
                    { label: "QA/운영", value: 2, color: "#eb8079" },
                    { label: "PM/PL", value: 2, color: "#f3b44f" }
                ],
                projects: [
                    { client: "지역 포털", role: "퍼블리셔 1명", status: "제안중", dueText: "D-2" }
                ]
            },
            {
                id: "gyeongsang",
                name: "경상",
                headcount: 20,
                available: 2,
                active: 15,
                avgCareer: "7.6년",
                avgRate: "655만원",
                leadSkill: "Java/Spring",
                note: "제조/운영 시스템 유지보수 비중이 높고, 장기 투입 인력이 많은 권역입니다.",
                industries: ["제조", "MES", "운영 유지보수"],
                issueCount: 1,
                endingSoon: 1,
                labelX: 204,
                labelY: 220,
                points: "170,150 222,146 252,186 248,258 196,274 154,224",
                skills: [
                    { label: "Java/Spring", value: 8, color: "#4f6ff7" },
                    { label: "QA/운영", value: 4, color: "#eb8079" },
                    { label: "PM/PL", value: 3, color: "#f3b44f" },
                    { label: "React/Vue", value: 3, color: "#1fb6a6" },
                    { label: "퍼블리싱", value: 2, color: "#a173ff" }
                ],
                projects: [
                    { client: "제조 운영", role: "백엔드 1명", status: "종료예정", dueText: "D-7" },
                    { client: "MES 개선", role: "운영 1명", status: "투입중", dueText: "상시" }
                ]
            },
            {
                id: "busan",
                name: "부산/울산",
                headcount: 4,
                available: 1,
                active: 2,
                avgCareer: "5.8년",
                avgRate: "544만원",
                leadSkill: "React/Vue",
                note: "소규모 수요 권역이며, 단기 커머스/운영 보강 형태로 수요가 발생합니다.",
                industries: ["커머스", "운영 보강"],
                issueCount: 0,
                endingSoon: 0,
                labelX: 244,
                labelY: 288,
                points: "230,270 252,272 258,290 242,302 226,288",
                skills: [
                    { label: "React/Vue", value: 2, color: "#1fb6a6" },
                    { label: "Java/Spring", value: 1, color: "#4f6ff7" },
                    { label: "퍼블리싱", value: 1, color: "#a173ff" }
                ],
                projects: [
                    { client: "해운 포털", role: "프론트 1명", status: "검토중", dueText: "D-4" }
                ]
            }
        ]
    },
    recentEmployees: [
        {
            employeeId: "FR260317",
            name: "김현우",
            department: "Java/Spring · 금융권 운영",
            regionId: "seoul",
            region: "서울",
            position: "12년차",
            employmentType: "850만원",
            joinDate: "2026-03-17",
            availableDate: "03.25",
            status: "검토중"
        },
        {
            employeeId: "FR260310",
            name: "박서연",
            department: "React/Vue · 커머스",
            regionId: "gyeonggi",
            region: "경기",
            position: "8년차",
            employmentType: "700만원",
            joinDate: "2026-03-10",
            availableDate: "즉시",
            status: "투입중"
        },
        {
            employeeId: "FR260304",
            name: "이도윤",
            department: "웹퍼블리싱 · 반응형",
            regionId: "jeolla",
            region: "전라",
            position: "5년차",
            employmentType: "520만원",
            joinDate: "2026-03-04",
            availableDate: "03.28",
            status: "대기중"
        },
        {
            employeeId: "FR260225",
            name: "정지원",
            department: "PMO · 대형 SI",
            regionId: "chungcheong",
            region: "충청",
            position: "7년차",
            employmentType: "650만원",
            joinDate: "2026-02-25",
            availableDate: "04.01",
            status: "제안중"
        },
        {
            employeeId: "FR260212",
            name: "오세훈",
            department: "QA · 테스트 자동화",
            regionId: "seoul",
            region: "서울",
            position: "6년차",
            employmentType: "580만원",
            joinDate: "2026-02-12",
            availableDate: "즉시",
            status: "투입중"
        },
        {
            employeeId: "FR260205",
            name: "한예림",
            department: "Python/Data · 리포팅",
            regionId: "gyeongsang",
            region: "경상",
            position: "9년차",
            employmentType: "780만원",
            joinDate: "2026-02-05",
            availableDate: "03.31",
            status: "대기중"
        },
        {
            employeeId: "FR260201",
            name: "윤지민",
            department: "PM/PL · 금융권 운영",
            regionId: "incheon",
            region: "인천",
            position: "10년차",
            employmentType: "820만원",
            joinDate: "2026-02-01",
            availableDate: "03.29",
            status: "검토중"
        },
        {
            employeeId: "FR260129",
            name: "최민석",
            department: "Java/Spring · 공공 차세대",
            regionId: "seoul",
            region: "서울",
            position: "11년차",
            employmentType: "790만원",
            joinDate: "2026-01-29",
            availableDate: "즉시",
            status: "투입중"
        },
        {
            employeeId: "FR260122",
            name: "강하늘",
            department: "QA/운영 · 제조 운영",
            regionId: "busan",
            region: "부산/울산",
            position: "7년차",
            employmentType: "610만원",
            joinDate: "2026-01-22",
            availableDate: "04.03",
            status: "대기중"
        },
        {
            employeeId: "FR260118",
            name: "송다은",
            department: "React/Vue · 퍼블리싱",
            regionId: "gangwon",
            region: "강원",
            position: "4년차",
            employmentType: "480만원",
            joinDate: "2026-01-18",
            availableDate: "03.30",
            status: "제안중"
        },
        {
            employeeId: "FR260115",
            name: "임주원",
            department: "Python/Data · 분석 리포팅",
            regionId: "gyeonggi",
            region: "경기",
            position: "6년차",
            employmentType: "590만원",
            joinDate: "2026-01-15",
            availableDate: "04.05",
            status: "검토중"
        },
        {
            employeeId: "FR260111",
            name: "배정민",
            department: "Java/Spring · 공공/SI",
            regionId: "incheon",
            region: "인천",
            position: "9년차",
            employmentType: "730만원",
            joinDate: "2026-01-11",
            availableDate: "D-5",
            status: "종료예정"
        },
        {
            employeeId: "FR260108",
            name: "문가영",
            department: "PMO · 운영 보강",
            regionId: "chungcheong",
            region: "충청",
            position: "8년차",
            employmentType: "640만원",
            joinDate: "2026-01-08",
            availableDate: "즉시",
            status: "대기중"
        },
        {
            employeeId: "FR260103",
            name: "조태윤",
            department: "React/Vue · 커머스 고도화",
            regionId: "gyeongsang",
            region: "경상",
            position: "5년차",
            employmentType: "540만원",
            joinDate: "2026-01-03",
            availableDate: "04.02",
            status: "제안중"
        },
        {
            employeeId: "FR251229",
            name: "신유진",
            department: "Java/Spring · 제조 운영",
            regionId: "busan",
            region: "부산/울산",
            position: "13년차",
            employmentType: "880만원",
            joinDate: "2025-12-29",
            availableDate: "상시",
            status: "투입중"
        },
        {
            employeeId: "FR251223",
            name: "허민재",
            department: "QA · 테스트 자동화",
            regionId: "jeolla",
            region: "전라",
            position: "6년차",
            employmentType: "570만원",
            joinDate: "2025-12-23",
            availableDate: "D-12",
            status: "종료예정"
        }
    ],
    issues: [
        {
            issueId: "ISS-260324-01",
            title: "서울권 금융 프로젝트 투입 승인 지연",
            summary: "백엔드 2명, PM 1명 승인 대기",
            region: "서울",
            regionId: "seoul",
            requestedAt: "09:20",
            dueText: "11:00까지",
            status: "검토중",
            severity: "높음"
        },
        {
            issueId: "ISS-260324-02",
            title: "경기권 프론트 포지션 고객 제안 요청",
            summary: "React/Vue 후보 1명 추가 필요",
            region: "경기",
            regionId: "gyeonggi",
            requestedAt: "08:40",
            dueText: "오늘 회신",
            status: "제안중",
            severity: "보통"
        },
        {
            issueId: "ISS-260324-03",
            title: "충청 공공 차세대 QA 인력 종료 예정",
            summary: "D-10 종료, 후속 인력 검토 필요",
            region: "충청",
            regionId: "chungcheong",
            requestedAt: "어제 17:10",
            dueText: "D-10",
            status: "종료예정",
            severity: "높음"
        },
        {
            issueId: "ISS-260324-04",
            title: "강원 원격 운영 포지션 추가 인터뷰 조율",
            summary: "백엔드 후보 1명 1차 인터뷰 필요",
            region: "강원",
            regionId: "gangwon",
            requestedAt: "10:15",
            dueText: "15:00까지",
            status: "검토중",
            severity: "보통"
        },
        {
            issueId: "ISS-260324-05",
            title: "경상 제조 운영 프로젝트 종료 인수인계 확인",
            summary: "장기 투입 인력 1명 인수인계 일정 점검",
            region: "경상",
            regionId: "gyeongsang",
            requestedAt: "09:50",
            dueText: "D-7",
            status: "종료예정",
            severity: "보통"
        }
    ]
};
