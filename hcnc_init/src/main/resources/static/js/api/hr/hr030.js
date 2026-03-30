(function () {
    var dashboardData = window.HR030_DASHBOARD_DATA;

    if (!dashboardData) {
        return;
    }

    // 대시보드 전역 메타 정보와 화면 상태값
    var employeeStatusMap = {
        "투입중": true,
        "대기중": true,
        "제안중": true,
        "검토중": true,
        "종료예정": true
    };

    var statusToneMap = {
        "검토중": "warning",
        "확정": "success",
        "보류": "danger",
        "투입중": "primary",
        "대기중": "slate",
        "제안중": "info",
        "종료예정": "danger",
        "높음": "danger",
        "보통": "slate",
        "금융권 운영": "primary",
        "커머스 고도화": "info",
        "대형 SI": "warning",
        "공공": "slate",
        "차세대": "warning",
        "운영 보강": "info"
    };

    var availabilityStatusMeta = [
        { label: "투입중", color: "#4f6ff7" },
        { label: "대기중", color: "#f3b44f" },
        { label: "종료예정", color: "#a173ff" }
    ];

    var careerBandMeta = [
        { key: "junior", label: "초급", description: "4년 이하", color: "#7c9af8" },
        { key: "mid", label: "중급", description: "5~7년", color: "#4f6ff7" },
        { key: "senior", label: "고급", description: "8~10년", color: "#1fb6a6" },
        { key: "lead", label: "특급", description: "11년 이상", color: "#f3b44f" }
    ];

    var skillColorPalette = ["#4f6ff7", "#1fb6a6", "#f3b44f", "#a173ff", "#eb8079", "#4cb0ff", "#33c18d"];

    var kpiIconMap = {
        total: "users",
        employee: "user",
        freelancer: "briefcase",
        available: "zap"
    };

    var state = {
        query: "",
        statusFilter: "all",
        selectedRegionId: dashboardData.map.defaultRegionId || "all",
        skillViewMode: "all",
        availabilityCardFilter: "all",
        skillCatalogLoaded: false,
        skillCatalogRequested: false,
        skillCatalogMap: {},
        skillCatalogLabels: [],
        employeeTable: null,
        charts: {
            skills: null,
            availability: null,
            category: null
        }
    };

    // 공통 포맷터와 작은 렌더링 헬퍼
    function byId(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("ko-KR").format(value || 0);
    }

    function formatPercent(value) {
        return (Math.round((value || 0) * 10) / 10).toFixed(1);
    }

    function normalizeText(value) {
        return String(value == null ? "" : value).replace(/\s+/g, "").toLowerCase();
    }

    function getTodayLabel() {
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long"
        }).format(new Date());
    }

    function getAvatarText(name) {
        var cleanName = String(name || "").trim();

        if (cleanName.length < 2) {
            return cleanName || "관리";
        }

        return cleanName.slice(-2);
    }

    function getToneClass(label) {
        return statusToneMap[label] || "slate";
    }

    function renderStatusBadge(label) {
        return '<span class="hr030-status-badge is-' + getToneClass(label) + '">' + escapeHtml(label) + "</span>";
    }

    function renderSectionHeader(options) {
        return [
            '<div class="hr030-section-head">',
            '  <div class="hr030-section-copy">',
            '    <h5>' + escapeHtml(options.title) + "</h5>",
            '    <p>' + escapeHtml(options.description) + "</p>",
            "  </div>",
            options.controlHtml || ('  <span class="hr030-section-meta">' + escapeHtml(options.meta) + "</span>"),
            "</div>"
        ].join("");
    }

    function renderHeaderSelect(config) {
        var attributes = [
            'class="hr030-card-select"',
            'data-dashboard-select="' + escapeHtml(config.type) + '"'
        ];

        if (config.card) {
            attributes.push('data-card="' + escapeHtml(config.card) + '"');
        }

        return [
            '<label class="hr030-card-select-wrap">',
            '  <span class="blind">' + escapeHtml(config.label || "보기 기준 선택") + "</span>",
            '  <select ' + attributes.join(" ") + ">",
            (config.options || []).map(function (option) {
                var selected = option.value === config.value ? ' selected' : "";

                return '<option value="' + escapeHtml(option.value) + '"' + selected + ">" + escapeHtml(option.label) + "</option>";
            }).join(""),
            "  </select>",
            "</label>"
        ].join("");
    }

    function getPrimaryCategory(item) {
        var raw = item && item.department ? item.department : "";

        return String(raw).split("·")[0].trim() || "기타";
    }

    function parseCareerYears(position) {
        var matched = String(position || "").match(/\d+/);

        return matched ? Number(matched[0]) : null;
    }

    function getCareerBand(item) {
        var years = parseCareerYears(item && item.position);

        if (years === null || years <= 4) {
            return careerBandMeta[0];
        }

        if (years <= 7) {
            return careerBandMeta[1];
        }

        if (years <= 10) {
            return careerBandMeta[2];
        }

        return careerBandMeta[3];
    }

    function buildSkillCatalog(items) {
        var catalogMap = {};
        var catalogLabels = [];

        (items || []).forEach(function (item) {
            var label = String(item && (item.cd_nm || item.label || item.name || item.cd) || "").trim();
            var normalized;

            if (!label) {
                return;
            }

            normalized = normalizeText(label);
            catalogMap[normalized] = label;

            if (catalogLabels.indexOf(label) === -1) {
                catalogLabels.push(label);
            }
        });

        state.skillCatalogMap = catalogMap;
        state.skillCatalogLabels = catalogLabels;
        state.skillCatalogLoaded = Object.keys(catalogMap).length > 0;
    }

    function loadSkillCatalog() {
        if (state.skillCatalogRequested || typeof getComCode !== "function") {
            return;
        }

        state.skillCatalogRequested = true;
        getComCode("skl_id", "", function (res) {
            buildSkillCatalog(Array.isArray(res) ? res : []);
            renderDashboard();
        });
    }

    function buildSkillCandidates(label) {
        var raw = String(label || "").trim();
        var normalized = normalizeText(raw);
        var candidates = [];

        if (!raw) {
            return candidates;
        }

        function pushCandidate(value) {
            if (value && candidates.indexOf(value) === -1) {
                candidates.push(value);
            }
        }

        pushCandidate(raw);

        if (normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1) {
            pushCandidate("Java/Spring");
            pushCandidate("Java");
            pushCandidate("Spring");
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1) {
            pushCandidate("React/Vue");
            pushCandidate("React");
            pushCandidate("Vue");
        }

        if (normalized.indexOf("javascript") > -1 || normalized.indexOf("typescript") > -1) {
            pushCandidate("JavaScript");
            pushCandidate("TypeScript");
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1) {
            pushCandidate("Python/Data");
            pushCandidate("Python");
            pushCandidate("Data");
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("테스트") > -1 || normalized.indexOf("test") > -1) {
            pushCandidate("QA/테스트");
            pushCandidate("QA");
            pushCandidate("테스트");
        }

        if (normalized.indexOf("퍼블") > -1 || normalized.indexOf("publishing") > -1 || normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1) {
            pushCandidate("웹퍼블리싱");
            pushCandidate("퍼블리싱");
            pushCandidate("HTML/CSS");
        }

        if (normalized.indexOf("pm") > -1 || normalized.indexOf("pl") > -1 || normalized.indexOf("pmo") > -1 || normalized.indexOf("기획") > -1) {
            pushCandidate("PM/PL");
            pushCandidate("PMO");
        }

        return candidates;
    }

    function getFallbackTechnicalSkillLabel(label) {
        var normalized = normalizeText(label);

        if (normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1) {
            return "Java/Spring";
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1 ||
            normalized.indexOf("javascript") > -1 || normalized.indexOf("typescript") > -1) {
            return "React/Vue";
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1) {
            return "Python/Data";
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("테스트") > -1 || normalized.indexOf("test") > -1) {
            return "QA/테스트";
        }

        if (normalized.indexOf("퍼블") > -1 || normalized.indexOf("publishing") > -1 ||
            normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1) {
            return "웹퍼블리싱";
        }

        return "";
    }

    function getSkillFamilyRule(label) {
        var normalized = normalizeText(label);

        if (!normalized) {
            return null;
        }

        if ((normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1) && normalized.indexOf("javascript") === -1) {
            return {
                include: ["springboot", "spring", "java", "jsp", "jpa", "mybatis", "egov", "전자정부"],
                exclude: ["javascript"],
                priority: ["springboot", "spring", "java", "jpa", "mybatis", "jsp", "egov", "전자정부"]
            };
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1 ||
            normalized.indexOf("javascript") > -1 || normalized.indexOf("typescript") > -1) {
            return {
                include: ["react", "vue", "typescript", "javascript", "next", "nuxt", "angular"],
                exclude: [],
                priority: ["react", "vue", "typescript", "javascript", "next", "nuxt", "angular"]
            };
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1) {
            return {
                include: ["python", "pandas", "spark", "airflow", "django", "flask", "data", "etl"],
                exclude: [],
                priority: ["python", "pandas", "spark", "airflow", "django", "flask", "data", "etl"]
            };
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("테스트") > -1 || normalized.indexOf("test") > -1) {
            return {
                include: ["qa", "test", "테스트", "selenium", "cypress", "jmeter", "xray"],
                exclude: [],
                priority: ["qa", "test", "테스트", "selenium", "cypress", "jmeter", "xray"]
            };
        }

        if (normalized.indexOf("퍼블") > -1 || normalized.indexOf("publishing") > -1 ||
            normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1) {
            return {
                include: ["html", "css", "scss", "sass", "publishing", "퍼블", "웹접근성"],
                exclude: [],
                priority: ["html", "css", "scss", "sass", "publishing", "퍼블", "웹접근성"]
            };
        }

        return null;
    }

    function getSkillFamilySeedLabels(label) {
        var normalized = normalizeText(label);

        if (!normalized) {
            return [];
        }

        if ((normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1) && normalized.indexOf("javascript") === -1) {
            return ["Java", "Spring", "Spring Boot", "JPA"];
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1 ||
            normalized.indexOf("javascript") > -1 || normalized.indexOf("typescript") > -1) {
            return ["React", "Vue", "TypeScript", "JavaScript"];
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1) {
            return ["Python", "Pandas", "ETL"];
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("테스트") > -1 || normalized.indexOf("test") > -1) {
            return ["QA", "테스트자동화"];
        }

        if (normalized.indexOf("퍼블") > -1 || normalized.indexOf("publishing") > -1 ||
            normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1) {
            return ["HTML", "CSS", "웹접근성"];
        }

        return [];
    }

    function isRoleSkillLabel(label) {
        var normalized = normalizeText(label);

        return normalized === "pm" ||
            normalized === "pl" ||
            normalized.indexOf("pm/") === 0 ||
            normalized.indexOf("pmo") > -1 ||
            normalized.indexOf("projectmanager") > -1 ||
            normalized.indexOf("manager") > -1 ||
            normalized.indexOf("기획") > -1 ||
            normalized.indexOf("관리") > -1;
    }

    function isTechnicalSkillLabel(label) {
        var familyRule = getSkillFamilyRule(label);

        return !!label && !isRoleSkillLabel(label) && !!familyRule;
    }

    function resolveTechnicalSkillLabel(label) {
        var candidates = buildSkillCandidates(label);
        var resolved = "";

        candidates.some(function (candidate) {
            var match = state.skillCatalogMap[normalizeText(candidate)];

            if (match) {
                resolved = match;
                return true;
            }

            return false;
        });

        if (resolved) {
            return resolved;
        }

        if (state.skillCatalogLoaded) {
            return "";
        }

        return getFallbackTechnicalSkillLabel(label);
    }

    function getCatalogSkillScore(label, familyRule) {
        var normalized = normalizeText(label);
        var score = 0;

        (familyRule.priority || []).forEach(function (keyword, index) {
            if (normalized.indexOf(keyword) > -1) {
                score += (familyRule.priority.length - index) * 10;
            }
        });

        if (label.indexOf("/") > -1 || label.indexOf("·") > -1) {
            score -= 8;
        }

        score -= normalized.length / 100;
        return score;
    }

    function appendUniqueSkillLabel(target, label) {
        if (label && target.indexOf(label) === -1) {
            target.push(label);
        }
    }

    function resolveCatalogSkillSeedLabel(seedLabel) {
        var normalizedSeed = normalizeText(seedLabel);
        var candidates;

        if (!normalizedSeed || !state.skillCatalogLoaded) {
            return seedLabel;
        }

        if (state.skillCatalogMap[normalizedSeed]) {
            return state.skillCatalogMap[normalizedSeed];
        }

        candidates = state.skillCatalogLabels.filter(function (catalogLabel) {
            return isTechnicalSkillLabel(catalogLabel) && normalizeText(catalogLabel).indexOf(normalizedSeed) > -1;
        }).sort(function (a, b) {
            var exactA = normalizeText(a) === normalizedSeed ? 1 : 0;
            var exactB = normalizeText(b) === normalizedSeed ? 1 : 0;
            var atomicA = (a.indexOf("/") === -1 && a.indexOf("·") === -1) ? 1 : 0;
            var atomicB = (b.indexOf("/") === -1 && b.indexOf("·") === -1) ? 1 : 0;

            if (exactA !== exactB) {
                return exactB - exactA;
            }

            if (atomicA !== atomicB) {
                return atomicB - atomicA;
            }

            return a.length - b.length;
        });

        return candidates[0] || seedLabel;
    }

    function buildResolvedTechnicalSkillLabels(label) {
        var familyRule = getSkillFamilyRule(label);
        var exactMatch = resolveTechnicalSkillLabel(label);
        var matches = [];
        var atomicMatches;
        var preferredSeeds = getSkillFamilySeedLabels(label);

        if (!state.skillCatalogLoaded) {
            if (preferredSeeds.length) {
                return preferredSeeds.slice(0, 4);
            }

            return exactMatch ? [exactMatch] : [];
        }

        if (!familyRule) {
            return exactMatch && isTechnicalSkillLabel(exactMatch) ? [exactMatch] : [];
        }

        matches = state.skillCatalogLabels.filter(function (catalogLabel) {
            var normalized = normalizeText(catalogLabel);

            if (!isTechnicalSkillLabel(catalogLabel)) {
                return false;
            }

            if ((familyRule.exclude || []).some(function (keyword) {
                return normalized.indexOf(keyword) > -1;
            })) {
                return false;
            }

            return (familyRule.include || []).some(function (keyword) {
                return normalized.indexOf(keyword) > -1;
            });
        }).sort(function (a, b) {
            return getCatalogSkillScore(b, familyRule) - getCatalogSkillScore(a, familyRule);
        });

        if (exactMatch && isTechnicalSkillLabel(exactMatch) && matches.indexOf(exactMatch) === -1) {
            matches.unshift(exactMatch);
        }

        preferredSeeds.forEach(function (seedLabel) {
            appendUniqueSkillLabel(matches, resolveCatalogSkillSeedLabel(seedLabel));
        });

        atomicMatches = matches.filter(function (catalogLabel) {
            return catalogLabel.indexOf("/") === -1 && catalogLabel.indexOf("·") === -1;
        });

        if (atomicMatches.length) {
            matches = atomicMatches.concat(matches.filter(function (catalogLabel) {
                return atomicMatches.indexOf(catalogLabel) === -1;
            }));
        }

        return matches.slice(0, 3);
    }

    function getSkillDistributionWeights(size) {
        if (size <= 1) {
            return [1];
        }

        if (size === 2) {
            return [0.58, 0.42];
        }

        if (size === 3) {
            return [0.5, 0.3, 0.2];
        }

        if (size === 4) {
            return [0.35, 0.26, 0.22, 0.17];
        }

        if (size === 5) {
            return [0.3, 0.24, 0.19, 0.15, 0.12];
        }

        if (size === 6) {
            return [0.26, 0.21, 0.17, 0.14, 0.12, 0.1];
        }

        return Array.apply(null, { length: size }).map(function (_, index) {
            return size - index;
        }).map(function (value, _, arr) {
            var total = arr.reduce(function (sum, current) {
                return sum + current;
            }, 0);

            return value / total;
        });
    }

    function splitSkillValue(total, labels) {
        var weights = getSkillDistributionWeights(labels.length);
        var rows = labels.map(function (label, index) {
            var raw = total * (weights[index] || 0);
            return {
                label: label,
                value: Math.floor(raw),
                remainder: raw - Math.floor(raw)
            };
        });
        var allocated = rows.reduce(function (sum, item) {
            return sum + item.value;
        }, 0);
        var remaining = total - allocated;
        var cursor = 0;

        rows.sort(function (a, b) {
            return b.remainder - a.remainder;
        });

        while (remaining > 0 && rows.length) {
            rows[cursor % rows.length].value += 1;
            cursor += 1;
            remaining -= 1;
        }

        return rows.filter(function (item) {
            return item.value > 0;
        }).sort(function (a, b) {
            return b.value - a.value;
        });
    }

    function getTechnicalSkillColor(label, index) {
        var normalized = normalizeText(label);

        if (label === "기타") {
            return "#94a3b8";
        }

        if (normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1) {
            return "#4f6ff7";
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1 ||
            normalized.indexOf("javascript") > -1 || normalized.indexOf("typescript") > -1) {
            return "#1fb6a6";
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1) {
            return "#f3b44f";
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("테스트") > -1 || normalized.indexOf("test") > -1) {
            return "#eb8079";
        }

        if (normalized.indexOf("퍼블") > -1 || normalized.indexOf("publishing") > -1 ||
            normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1) {
            return "#a173ff";
        }

        return skillColorPalette[index % skillColorPalette.length];
    }

    function buildRegionSkillDistribution(regionSkills) {
        var isAllView = state.skillViewMode === "all";
        var skillMap = {};
        var otherValue = 0;
        var maxVisible = state.skillViewMode === "top3" ? 3 : state.skillViewMode === "top5" ? 5 : 20;
        var minShare = isAllView ? 3 : 0;
        var skills;
        var total;

        (regionSkills || []).forEach(function (item) {
            var value = Number(item && item.value || 0);
            var resolvedLabels = buildResolvedTechnicalSkillLabels(item && item.label);
            var distributedSkills;

            if (!value) {
                return;
            }

            if (!resolvedLabels.length) {
                otherValue += value;
                return;
            }

            distributedSkills = splitSkillValue(value, resolvedLabels);

            distributedSkills.forEach(function (distributedItem) {
                if (!skillMap[distributedItem.label]) {
                    skillMap[distributedItem.label] = {
                        label: distributedItem.label,
                        value: 0
                    };
                }

                skillMap[distributedItem.label].value += distributedItem.value;
            });
        });

        skills = Object.keys(skillMap).map(function (key) {
            return skillMap[key];
        }).sort(function (a, b) {
            return (b.value || 0) - (a.value || 0);
        });

        total = skills.reduce(function (sum, item) {
            return sum + (item.value || 0);
        }, 0);

        if (skills.length > maxVisible) {
            skills.slice(maxVisible).forEach(function (item) {
                otherValue += item.value || 0;
            });
            skills = skills.slice(0, maxVisible);
        }

        skills = skills.filter(function (item, index) {
            var share = total ? (item.value / total) * 100 : 0;

            if (index < maxVisible && item.value >= 2 && share >= minShare) {
                return true;
            }

            otherValue += item.value || 0;
            return false;
        });

        skills = skills.map(function (item, index) {
            return {
                label: item.label,
                value: item.value,
                color: getTechnicalSkillColor(item.label, index)
            };
        });

        if (otherValue > 0) {
            skills.push({
                label: "기타",
                value: otherValue,
                color: getTechnicalSkillColor("기타", skills.length)
            });
        }

        return skills;
    }

    function getSkillCategoryMeta(label) {
        var normalized = normalizeText(label);

        if (label === "기타") {
            return { key: "other", label: "기타", color: "#cbd5e1" };
        }

        if ((normalized.indexOf("java") > -1 || normalized.indexOf("spring") > -1 || normalized.indexOf("jpa") > -1 || normalized.indexOf("mybatis") > -1) && normalized.indexOf("javascript") === -1) {
            return { key: "backend", label: "백엔드", color: "#4f6ff7" };
        }

        if (normalized.indexOf("react") > -1 || normalized.indexOf("vue") > -1 || normalized.indexOf("typescript") > -1 || normalized.indexOf("javascript") > -1) {
            return { key: "frontend", label: "프론트엔드", color: "#1fb6a6" };
        }

        if (normalized.indexOf("qa") > -1 || normalized.indexOf("test") > -1 || normalized.indexOf("테스트") > -1) {
            return { key: "qa", label: "QA", color: "#eb8079" };
        }

        if (normalized.indexOf("html") > -1 || normalized.indexOf("css") > -1 || normalized.indexOf("퍼블") > -1 || normalized.indexOf("접근성") > -1) {
            return { key: "publishing", label: "퍼블리싱", color: "#a173ff" };
        }

        if (normalized.indexOf("python") > -1 || normalized.indexOf("data") > -1 || normalized.indexOf("etl") > -1 || normalized.indexOf("pandas") > -1) {
            return { key: "data", label: "데이터", color: "#f3b44f" };
        }

        return { key: "other", label: "기타", color: "#94a3b8" };
    }

    function buildSkillTreemapData(skills) {
        var grouped = {};

        (skills || []).forEach(function (item) {
            var groupMeta = getSkillCategoryMeta(item.label);

            if (!grouped[groupMeta.key]) {
                grouped[groupMeta.key] = {
                    name: groupMeta.label,
                    value: 0,
                    itemStyle: {
                        color: groupMeta.color,
                        borderColor: "#ffffff",
                        borderWidth: 3,
                        gapWidth: 3
                    },
                    children: []
                };
            }

            grouped[groupMeta.key].value += Number(item.value || 0);
            grouped[groupMeta.key].children.push({
                name: item.label,
                value: Number(item.value || 0),
                itemStyle: {
                    color: item.color,
                    borderColor: "#ffffff",
                    borderWidth: 2,
                    gapWidth: 2
                }
            });
        });

        return Object.keys(grouped).map(function (key) {
            return grouped[key];
        }).sort(function (a, b) {
            return (b.value || 0) - (a.value || 0);
        });
    }

    function buildCenterLabelPlugin(pluginId, primaryText, secondaryText) {
        return {
            id: pluginId,
            afterDraw: function (chart) {
                var ctx = chart.ctx;
                var meta = chart.getDatasetMeta(0);
                var centerPoint = meta && meta.data && meta.data[0];
                var x;
                var y;

                if (!centerPoint) {
                    return;
                }

                x = centerPoint.x;
                y = centerPoint.y;

                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#18253f";
                ctx.font = '700 23px "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
                ctx.fillText(primaryText, x, y - 8);
                ctx.fillStyle = "#7f776c";
                ctx.font = '600 11px "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
                ctx.fillText(secondaryText, x, y + 15);
                ctx.restore();
            }
        };
    }

    function renderDashboardCard(item) {
        var iconName = kpiIconMap[item.key] || "circle";

        return [
            '<article class="hr030-kpi-card" data-kpi-key="' + escapeHtml(item.key || "") + '" aria-label="' + escapeHtml(item.label) + " " + formatNumber(item.value) + "명" + '">',
            '  <span class="hr030-kpi-icon" aria-hidden="true"><i data-lucide="' + escapeHtml(iconName) + '"></i></span>',
            '  <div class="hr030-kpi-copy">',
            '    <span class="hr030-kpi-label">' + escapeHtml(item.label) + "</span>",
            '    <strong class="hr030-kpi-value"><span class="hr030-kpi-number">' + formatNumber(item.value) + '</span><span class="hr030-kpi-unit">명</span></strong>',
            '    <span class="hr030-kpi-description">' + escapeHtml(item.description) + "</span>",
            "  </div>",
            "</article>"
        ].join("");
    }

    // 현재 화면 조건에 맞는 데이터 가공
    function getCurrentRegion() {
        var selectedId = state.selectedRegionId;
        var region;

        if (!selectedId || selectedId === "all") {
            return dashboardData.map.overview;
        }

        region = dashboardData.map.regions.find(function (item) {
            return item.id === selectedId;
        });

        return region || dashboardData.map.overview;
    }

    function matchesSearch(fields) {
        if (!state.query) {
            return true;
        }

        return normalizeText(fields.join(" ")).indexOf(normalizeText(state.query)) > -1;
    }

    function getVisibleEmployees() {
        return dashboardData.recentEmployees.filter(function (item) {
            var matchesRegion = state.selectedRegionId === "all" || item.regionId === state.selectedRegionId;
            var matchesStatus = !employeeStatusMap[state.statusFilter] || item.status === state.statusFilter;

            return matchesRegion && matchesStatus && matchesSearch([
                item.employeeId,
                item.name,
                item.department,
                item.region,
                item.position,
                item.employmentType,
                item.status
            ]);
        });
    }

    function getVisibleIssues() {
        return dashboardData.issues.filter(function (item) {
            var matchesRegion = state.selectedRegionId === "all" || item.regionId === state.selectedRegionId;
            var matchesStatus = !employeeStatusMap[state.statusFilter] || item.status === state.statusFilter;

            return matchesRegion && matchesStatus && matchesSearch([
                item.issueId,
                item.title,
                item.summary,
                item.region,
                item.status,
                item.severity
            ]);
        });
    }

    function updateSearchResultNote(employeeRows, issueRows) {
        var noteEl = byId("hr030SearchResultNote");
        var regionLabel = getCurrentRegion().name;

        if (!noteEl) {
            return;
        }

        if (!state.query) {
            noteEl.textContent = "";
            noteEl.classList.add("is-empty");
            return;
        }

        noteEl.textContent = regionLabel + " 검색 결과 인력 " + formatNumber(employeeRows.length) + "명 · 운영 이슈 " + formatNumber(issueRows.length) + "건";
        noteEl.classList.remove("is-empty");
    }

    function formatShortDate(value) {
        var parts = String(value || "").split("-");

        if (parts.length !== 3) {
            return value || "-";
        }

        return parts[1] + "." + parts[2];
    }

    // 인력 테이블 렌더링과 폴백 처리
    function employeeNameFormatter(cell) {
        var row = cell.getRow().getData();

        return [
            '<div class="hr030-cell-user">',
            '  <strong>' + escapeHtml(row.name) + "</strong>",
            '  <span>' + escapeHtml(row.department) + "</span>",
            "</div>"
        ].join("");
    }

    function statusBadgeFormatter(cell) {
        return '<div class="hr030-status-cell">' + renderStatusBadge(cell.getValue()) + "</div>";
    }

    function initEmployeeTable(dataRows) {
        if (typeof Tabulator !== "function") {
            renderEmployeeTableFallback(dataRows);
            return;
        }

        state.employeeTable = new Tabulator("#hr030RecentEmployeeTable", {
            data: dataRows,
            layout: "fitColumns",
            height: "100%",
            pagination: "local",
            paginationSize: 2,
            paginationSizeSelector: false,
            paginationButtonCount: 5,
            placeholder: "조건에 맞는 인력 데이터가 없습니다.",
            headerHozAlign: "center",
            movableColumns: false,
            reactiveData: false,
            columns: [
                { title: "인력ID", field: "employeeId", width: 108, hozAlign: "center", headerSort: true },
                { title: "이름 / 기술", field: "name", minWidth: 240, formatter: employeeNameFormatter, headerSort: true },
                { title: "지역", field: "region", width: 88, hozAlign: "center", headerSort: true },
                { title: "경력", field: "position", width: 86, hozAlign: "center", headerSort: true },
                { title: "가용일", field: "availableDate", width: 88, hozAlign: "center", headerSort: true },
                { title: "희망단가", field: "employmentType", width: 104, hozAlign: "center", headerSort: true },
                { title: "상태", field: "status", width: 108, minWidth: 108, hozAlign: "center", headerSort: true, formatter: statusBadgeFormatter }
            ]
        });
    }

    function renderEmployeeTableFallback(dataRows) {
        var container = byId("hr030RecentEmployeeTable");
        var rowsHtml = dataRows.map(function (item) {
            return [
                "<tr>",
                "  <td>" + escapeHtml(item.employeeId) + "</td>",
                '  <td><div class="hr030-cell-user"><strong>' + escapeHtml(item.name) + "</strong><span>" + escapeHtml(item.department) + "</span></div></td>",
                "  <td>" + escapeHtml(item.region) + "</td>",
                "  <td>" + escapeHtml(item.position) + "</td>",
                "  <td>" + escapeHtml(item.availableDate) + "</td>",
                "  <td>" + escapeHtml(item.employmentType) + "</td>",
                '  <td><div class="hr030-status-cell">' + renderStatusBadge(item.status) + "</div></td>",
                "</tr>"
            ].join("");
        }).join("");

        if (!rowsHtml) {
            rowsHtml = '<tr><td colspan="7" class="hr030-table-empty">조건에 맞는 인력 데이터가 없습니다.</td></tr>';
        }

        container.innerHTML = [
            '<table class="hr030-fallback-table">',
            "  <thead>",
            "    <tr>",
            "      <th>인력ID</th>",
            "      <th>이름 / 기술</th>",
            "      <th>지역</th>",
            "      <th>경력</th>",
            "      <th>가용일</th>",
            "      <th>희망단가</th>",
            "      <th>상태</th>",
            "    </tr>",
            "  </thead>",
            "  <tbody>",
            rowsHtml,
            "  </tbody>",
            "</table>"
        ].join("");
    }

    function renderEmployeeTable(dataRows) {
        byId("hr030EmployeeTableMeta").textContent = "이름, 기술, 지역 기준으로 빠르게 인력을 확인할 수 있습니다.";

        if (state.employeeTable) {
            state.employeeTable.setData(dataRows).then(function () {
                if (typeof state.employeeTable.setPage === "function") {
                    state.employeeTable.setPage(1);
                }
            });
            return;
        }

        initEmployeeTable(dataRows);
    }

    // 좌측 카드: 지역 지도와 권역 상세 렌더링
    function renderRegionMap() {
        var container = byId("hr030RegionMap");
        var noteEl = byId("hr030RegionMapNote");
        var selectedId = state.selectedRegionId;
        var selectedRegion = getCurrentRegion();
        var regionsSvg = dashboardData.map.regions.map(function (region) {
            var isActive = selectedId === region.id;

            return [
                '<g class="hr030-map-region' + (isActive ? " is-active" : "") + '" data-region-id="' + escapeHtml(region.id) + '" role="button" tabindex="0" aria-label="' + escapeHtml(region.name) + ' ' + formatNumber(region.headcount) + '명">',
                '  <polygon class="hr030-map-shape" points="' + escapeHtml(region.points) + '"></polygon>',
                '  <text class="hr030-map-label" x="' + escapeHtml(region.labelX) + '" y="' + escapeHtml(region.labelY) + '">' + escapeHtml(region.name) + "</text>",
                '  <text class="hr030-map-value" x="' + escapeHtml(region.labelX) + '" y="' + escapeHtml(region.labelY + 18) + '">' + formatNumber(region.headcount) + "</text>",
                "</g>"
            ].join("");
        }).join("");

        container.innerHTML = [
            '<svg class="hr030-map-svg" viewBox="30 42 238 272" preserveAspectRatio="xMidYMid meet" aria-hidden="true">',
            '  <g class="hr030-map-backdrop">',
            '    <path d="M76 54 L136 42 L204 54 L248 92 L256 160 L244 254 L222 300 L170 314 L116 304 L74 278 L44 220 L38 156 L48 94 Z"></path>',
            "  </g>",
            regionsSvg,
            "</svg>"
        ].join("");

        if (noteEl) {
            noteEl.innerHTML = [
                '<div class="hr030-region-legend">',
                '  <span><i class="is-headcount"></i>지역별 총 인원 규모</span>',
                '  <span><i class="is-selected"></i>선택된 지역</span>',
                "</div>",
                '<span class="hr030-region-selection-badge">' + escapeHtml(selectedId === "all" ? "전체" : selectedRegion.name) + "</span>"
            ].join("");
        }
    }

    function renderRegionDetail() {
        var region = getCurrentRegion();
        var detailEl = byId("hr030RegionDetail");
        var availableRatio = region.headcount ? Math.round((region.available / region.headcount) * 100) : 0;
        var stats = [
            { label: "총 인원", value: formatNumber(region.headcount) + "명" },
            { label: "투입 가능", value: formatNumber(region.available) + "명" },
            { label: "현재 투입", value: formatNumber(region.active) + "명" },
            { label: "평균 경력", value: escapeHtml(region.avgCareer) }
        ];
        var noteText = region.note || "지도를 클릭하면 우측 상세 정보가 함께 바뀌고, 같은 데이터셋을 기준으로 구성한 내용을 재사용할 수 있도록 만든 예시입니다.";

        detailEl.innerHTML = [
            '<div class="hr030-region-detail-head">',
            '  <div class="hr030-region-detail-copy">',
            '    <h6>' + escapeHtml(region.name) + "</h6>",
            '    <p>권역별 인력 운영 지표를 빠르게 비교할 수 있습니다.</p>',
            "  </div>",
            '  <span class="hr030-region-detail-skill">주력 ' + escapeHtml(region.leadSkill) + "</span>",
            "</div>",
            '<div class="hr030-region-stat-grid">',
            stats.map(function (item) {
                return [
                    '<div class="hr030-region-stat-card">',
                    '  <span>' + escapeHtml(item.label) + "</span>",
                    '  <strong>' + item.value + "</strong>",
                    "</div>"
                ].join("");
            }).join(""),
            "</div>",
            '<div class="hr030-region-summary-grid">',
            '  <div class="hr030-region-summary-card hr030-region-summary-card--ratio">',
            '    <span>투입 가능 비율</span>',
            '    <div class="hr030-region-ratio-row">',
            '      <strong>' + formatNumber(availableRatio) + "%</strong>",
            '      <div class="hr030-region-ratio-bar"><i style="width:' + escapeHtml(availableRatio) + '%"></i></div>',
            "    </div>",
            "  </div>",
            '  <div class="hr030-region-summary-card hr030-region-summary-card--note">',
            '    <p>' + escapeHtml(noteText) + "</p>",
            "  </div>",
            "</div>"
        ].join("");
    }

    // 차트 공통 설정과 중앙 카드 차트 렌더링
    function destroyChart(chartKey) {
        if (state.charts[chartKey]) {
            if (typeof state.charts[chartKey].dispose === "function") {
                state.charts[chartKey].dispose();
            } else if (typeof state.charts[chartKey].destroy === "function") {
                state.charts[chartKey].destroy();
            }
            state.charts[chartKey] = null;
        }
    }

    function applyChartDefaults() {
        if (typeof Chart !== "function") {
            return;
        }

        Chart.defaults.font.family = '"Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
        Chart.defaults.color = "#64748b";
    }

    function resizeCharts() {
        Object.keys(state.charts).forEach(function (chartKey) {
            var chart = state.charts[chartKey];

            if (chart && typeof chart.resize === "function") {
                chart.resize();
            }
        });
    }

    function renderSkillDistribution() {
        var currentRegion = getCurrentRegion();
        var chartEl = byId("hr030SkillChart");
        var listEl = byId("hr030SkillList");
        var skills = buildRegionSkillDistribution(currentRegion.skills);
        var summarySkills;
        var treemapData;
        var total;
        var topSkill;

        total = skills.reduce(function (sum, item) {
            return sum + (item.value || 0);
        }, 0);
        topSkill = skills.reduce(function (best, item) {
            if (!best || (item.value || 0) > (best.value || 0)) {
                return item;
            }

            return best;
        }, null);
        summarySkills = skills.filter(function (item) {
            return item.label !== "기타";
        }).slice(0, 4);

        if (!summarySkills.length) {
            summarySkills = skills.slice(0, 4);
        }

        if (listEl) {
            if (!skills.length) {
                listEl.innerHTML = '<div class="hr030-empty-state">표시할 기술 스택 데이터가 없습니다.</div>';
            } else {
                listEl.innerHTML = [
                    '<div class="hr030-skill-summary-label">Top 4</div>',
                    summarySkills.map(function (item) {
                    var percent = total ? ((item.value / total) * 100).toFixed(1) : "0.0";

                    return [
                        '<div class="hr030-skill-item">',
                        '  <div class="hr030-skill-item-head">',
                        '    <div class="hr030-skill-item-main">',
                        '      <span class="hr030-skill-dot" style="background:' + escapeHtml(item.color) + '"></span>',
                        '      <div class="hr030-skill-copy">',
                        '        <strong>' + escapeHtml(item.label) + "</strong>",
                        "      </div>",
                        "    </div>",
                        '    <div class="hr030-skill-side">',
                        '      <span class="hr030-skill-count">' + formatNumber(item.value) + "명</span>",
                        '      <strong class="hr030-skill-share">' + percent + "%</strong>",
                        "    </div>",
                        "  </div>",
                        '  <span class="hr030-skill-bar"><i style="width:' + percent + '%;background:' + escapeHtml(item.color) + '"></i></span>',
                        "</div>"
                    ].join("");
                }).join("")
                ].join("");
            }
        }

        destroyChart("skills");

        if (!chartEl) {
            return;
        }

        if (!skills.length) {
            chartEl.innerHTML = '<div class="hr030-empty-state">표시할 기술 스택 데이터가 없습니다.</div>';
            return;
        }

        if (typeof echarts !== "object" || typeof echarts.init !== "function") {
            return;
        }

        chartEl.innerHTML = "";
        treemapData = buildSkillTreemapData(skills);
        state.charts.skills = echarts.init(chartEl, null, { renderer: "svg" });
        state.charts.skills.setOption({
            animationDuration: 500,
            animationDurationUpdate: 300,
            tooltip: {
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                borderWidth: 0,
                textStyle: {
                    color: "#ffffff",
                    fontFamily: '"Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif'
                },
                formatter: function (params) {
                    var value = Number(params.value || 0);
                    var share = total ? formatPercent((value / total) * 100) : "0.0";
                    var path = (params.treePathInfo || []).map(function (item) {
                        return item.name;
                    }).filter(Boolean).slice(1).join(" / ");

                    return [
                        '<div style="display:grid;gap:4px;min-width:120px;">',
                        '  <strong style="font-size:13px;font-weight:700;">' + escapeHtml(params.name || "") + "</strong>",
                        path ? '  <span style="font-size:11px;opacity:0.78;">' + escapeHtml(path) + "</span>" : "",
                        '  <span style="font-size:12px;">' + formatNumber(value) + "명 · " + share + "%</span>",
                        "</div>"
                    ].join("");
                }
            },
            series: [{
                type: "treemap",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                roam: false,
                nodeClick: false,
                breadcrumb: { show: false },
                visibleMin: 4,
                sort: "desc",
                squareRatio: 1,
                label: {
                    show: true,
                    formatter: function (params) {
                        var value = Number(params.value || 0);

                        if (value < 2) {
                            return "";
                        }

                        return params.name;
                    },
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 700
                },
                upperLabel: {
                    show: true,
                    height: 12,
                    color: "#334155",
                    fontSize: 11,
                    fontWeight: 700
                },
                itemStyle: {
                    borderColor: "#ffffff",
                    borderWidth: 1,
                    gapWidth: 1,
                    borderRadius: 2
                },
                levels: [
                    {
                        itemStyle: {
                            borderColor: "transparent",
                            borderWidth: 0,
                            gapWidth: 1
                        }
                    },
                    {
                        upperLabel: {
                            show: true,
                            height: 12,
                            color: "#24304a",
                            fontSize: 11,
                            fontWeight: 700
                        },
                        itemStyle: {
                            borderColor: "#ffffff",
                            borderWidth: 1,
                            gapWidth: 1,
                            borderRadius: 2
                        }
                    },
                    {
                        label: {
                            show: true,
                            color: "#ffffff",
                            fontSize: 12,
                            fontWeight: 700
                        },
                        itemStyle: {
                            borderColor: "#ffffff",
                            borderWidth: 1,
                            gapWidth: 1,
                            borderRadius: 2
                        }
                    }
                ],
                data: treemapData
            }]
        });

        requestAnimationFrame(function () {
            if (state.charts.skills && typeof state.charts.skills.resize === "function") {
                state.charts.skills.resize();
            }
        });
    }

    // 우측 카드: 가용 인력 요약 차트와 리스트 렌더링
    function renderAvailabilityPanel(employeeRows) {
        var canvas = byId("hr030AvailabilityChart");
        var summaryEl = byId("hr030AvailabilitySummary");
        var listEl = byId("hr030AvailabilityList");
        var availabilityStatuses = {
            "투입중": true,
            "대기중": true,
            "종료예정": true
        };
        var statusSortOrder = {
            "대기중": 0,
            "종료예정": 1,
            "투입중": 2
        };
        var relevantRows = employeeRows.filter(function (item) {
            if (!availabilityStatuses[item.status]) {
                return false;
            }

            if (state.availabilityCardFilter !== "all" && item.status !== state.availabilityCardFilter) {
                return false;
            }

            return true;
        }).slice().sort(function (a, b) {
            var toneDiff = (statusSortOrder[a.status] || 99) - (statusSortOrder[b.status] || 99);

            if (toneDiff !== 0) {
                return toneDiff;
            }

            return String(a.availableDate || "").localeCompare(String(b.availableDate || ""));
        });
        var summaryData = availabilityStatusMeta.map(function (item) {
            var value = relevantRows.filter(function (row) {
                return row.status === item.label;
            }).length;

            return {
                label: item.label,
                value: value,
                color: item.color
            };
        }).filter(function (item) {
            return state.availabilityCardFilter === "all" || item.label === state.availabilityCardFilter;
        });
        var total = summaryData.reduce(function (sum, item) {
            return sum + item.value;
        }, 0);

        if (summaryEl) {
            summaryEl.innerHTML = summaryData.map(function (item) {
                var share = total ? formatPercent((item.value / total) * 100) : "0.0";

                return [
                    '<div class="hr030-status-card">',
                    '  <span class="hr030-status-card-label"><i style="background:' + escapeHtml(item.color) + '"></i>' + escapeHtml(item.label) + "</span>",
                    '  <strong>' + formatNumber(item.value) + "명</strong>",
                    '  <span class="hr030-status-card-meta">' + share + "%</span>",
                    "</div>"
                ].join("");
            }).join("");
        }

        if (listEl) {
            if (!relevantRows.length) {
                listEl.innerHTML = '<div class="hr030-empty-state">조건에 맞는 가용 인력 데이터가 없습니다.</div>';
            } else {
                listEl.innerHTML = relevantRows.map(function (item) {
                    return [
                        '<div class="hr030-person-row">',
                        '  <div class="hr030-person-main">',
                        '    <strong>' + escapeHtml(item.name) + "</strong>",
                        '    <span>' + escapeHtml(getPrimaryCategory(item)) + " · " + escapeHtml(item.region) + " · " + escapeHtml(item.availableDate) + "</span>",
                        "  </div>",
                        "  " + renderStatusBadge(item.status),
                        "</div>"
                    ].join("");
                }).join("");
            }
        }

        if (typeof Chart !== "function" || !canvas) {
            return;
        }

        applyChartDefaults();
        destroyChart("availability");

        state.charts.availability = new Chart(canvas, {
            type: "bar",
            data: {
                labels: summaryData.map(function (item) { return item.label; }),
                datasets: [{
                    data: summaryData.map(function (item) { return item.value; }),
                    backgroundColor: summaryData.map(function (item) { return item.color; }),
                    borderRadius: 999,
                    borderSkipped: false,
                    borderWidth: 0,
                    barThickness: 16,
                    maxBarThickness: 16
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 2,
                        right: 6,
                        top: 2,
                        bottom: 2
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                var value = Number(context.raw || 0);
                                var share = total ? formatPercent((value / total) * 100) : "0.0";

                                return context.label + " " + formatNumber(value) + "명 (" + share + "%)";
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: {
                            color: "rgba(235, 227, 215, 0.9)",
                            drawTicks: false
                        },
                        ticks: {
                            precision: 0,
                            color: "#8e887d",
                            font: {
                                size: 10
                            },
                            callback: function (value) {
                                return value + "명";
                            }
                        }
                    },
                    y: {
                        border: { display: false },
                        grid: { display: false },
                        ticks: {
                            color: "#5f5b55",
                            font: {
                                size: 11,
                                weight: 700
                            }
                        }
                    }
                }
            }
        });
    }

    function renderCategoryDistribution(employeeRows) {
        var canvas = byId("hr030CategoryChart");
        var listEl = byId("hr030CategoryList");
        var categories = careerBandMeta.map(function (item) {
            return {
                key: item.key,
                label: item.label,
                description: item.description,
                color: item.color,
                value: 0
            };
        });
        var total;

        employeeRows.forEach(function (item) {
            var band = getCareerBand(item);
            var target = categories.find(function (category) {
                return category.key === band.key;
            });

            if (target) {
                target.value += 1;
            }
        });

        total = categories.reduce(function (sum, item) {
            return sum + item.value;
        }, 0);

        if (listEl) {
            if (!total) {
                listEl.innerHTML = '<div class="hr030-empty-state">표시할 경력 기준 데이터가 없습니다.</div>';
            } else {
                listEl.innerHTML = categories.map(function (item) {
                    var percent = total ? ((item.value / total) * 100).toFixed(1) : "0.0";

                    return [
                        '<div class="hr030-skill-item">',
                        '  <div class="hr030-skill-item-head">',
                        '    <div class="hr030-skill-item-main">',
                        '      <span class="hr030-skill-dot" style="background:' + escapeHtml(item.color) + '"></span>',
                        '      <div class="hr030-skill-copy">',
                        '        <strong>' + escapeHtml(item.label) + "</strong>",
                        '        <span>' + escapeHtml(item.description) + "</span>",
                        "      </div>",
                        "    </div>",
                        '    <div class="hr030-skill-side">',
                        '      <span class="hr030-skill-count">' + formatNumber(item.value) + "명</span>",
                        '      <strong class="hr030-skill-share">' + percent + "%</strong>",
                        "    </div>",
                        "  </div>",
                        '  <span class="hr030-skill-bar"><i style="width:' + percent + '%;background:' + escapeHtml(item.color) + '"></i></span>',
                        "</div>"
                    ].join("");
                }).join("");
            }
        }

        if (typeof Chart !== "function" || !canvas) {
            return;
        }

        applyChartDefaults();
        destroyChart("category");

        if (!total) {
            return;
        }

        state.charts.category = new Chart(canvas, {
            type: "bar",
            data: {
                labels: categories.map(function (item) { return item.label; }),
                datasets: [{
                    data: categories.map(function (item) { return item.value; }),
                    backgroundColor: categories.map(function (item) { return item.color; }),
                    borderRadius: 8,
                    borderSkipped: false,
                    borderWidth: 0,
                    barThickness: 14,
                    maxBarThickness: 14
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 2,
                        right: 4,
                        top: 0,
                        bottom: 0
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                var value = Number(context.raw || 0);
                                var share = total ? formatPercent((value / total) * 100) : "0.0";

                                return context.label + " " + formatNumber(value) + "명 (" + share + "%)";
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: {
                            color: "rgba(235, 227, 215, 0.72)",
                            drawTicks: false
                        },
                        ticks: {
                            precision: 0,
                            color: "#8e887d",
                            font: {
                                size: 9
                            },
                            callback: function (value) {
                                return value + "명";
                            }
                        }
                    },
                    y: {
                        border: { display: false },
                        grid: { display: false },
                        ticks: {
                            color: "#5f5b55",
                            font: {
                                size: 10,
                                weight: 700
                            }
                        }
                    }
                }
            }
        });
    }

    // 예비 위젯용 운영 이슈 렌더러
    function renderIssueSummary(issueRows) {
        var summaryEl = byId("hr030IssueSummary");
        var reviewCount = issueRows.filter(function (item) { return item.status === "검토중"; }).length;
        var endingCount = issueRows.filter(function (item) { return item.status === "종료예정"; }).length;

        summaryEl.innerHTML = [
            '<div class="hr030-issue-summary-card">',
            '  <span>검토중</span>',
            '  <strong>' + formatNumber(reviewCount) + "건</strong>",
            "</div>",
            '<div class="hr030-issue-summary-card">',
            '  <span>종료예정</span>',
            '  <strong>' + formatNumber(endingCount) + "건</strong>",
            "</div>"
        ].join("");
    }

    function renderIssueList(issueRows) {
        var container = byId("hr030IssueList");

        if (!issueRows.length) {
            container.innerHTML = '<div class="hr030-empty-state">조건에 맞는 운영 이슈가 없습니다.</div>';
            return;
        }

        container.innerHTML = issueRows.map(function (item) {
            return [
                '<article class="hr030-list-item hr030-issue-item">',
                '  <div class="hr030-list-main">',
                '    <div class="hr030-list-title-row">',
                "      " + renderStatusBadge(item.severity),
                "      " + renderStatusBadge(item.status),
                "    </div>",
                '    <strong>' + escapeHtml(item.title) + "</strong>",
                '    <p>' + escapeHtml(item.summary) + "</p>",
                "  </div>",
                '  <div class="hr030-list-side">',
                '    <span class="hr030-list-code">' + escapeHtml(item.region) + " · " + escapeHtml(item.requestedAt) + "</span>",
                '    <span class="hr030-list-due">' + escapeHtml(item.dueText) + "</span>",
                "  </div>",
                "</article>"
            ].join("");
        }).join("");
    }

    // 카드 헤더와 상단 고정 콘텐츠 갱신
    function setStaticContent() {
        var alertButton = document.querySelector(".hr030-admin-alert");
        var alertCount = dashboardData.alertCount || 0;
        var alertCountEl = byId("hr030AlertCount");

        if (alertCountEl) {
            alertCountEl.textContent = alertCount > 0 ? String(alertCount) : "";
        }

        if (alertButton) {
            alertButton.setAttribute("aria-label", alertCount > 0 ? "알림 " + alertCount + "건" : "알림");
        }

        byId("hr030KpiGrid").innerHTML = dashboardData.kpis.map(renderDashboardCard).join("");
        initializeIcons();
    }

    function updateHeaders(employeeRows) {
        var currentRegion = getCurrentRegion();
        var regionOptions = [{ value: "all", label: "전체" }].concat(dashboardData.map.regions.map(function (region) {
            return { value: region.id, label: region.name };
        }));
        var skillOptions = [
            { value: "all", label: "전체" },
            { value: "top5", label: "상위 5개" },
            { value: "top3", label: "상위 3개" }
        ];
        var availabilityOptions = [
            { value: "all", label: "전체" },
            { value: "투입중", label: "투입중" },
            { value: "대기중", label: "대기중" },
            { value: "종료예정", label: "종료예정" }
        ];
        var availabilityCount = employeeRows.filter(function (item) {
            return item.status === "투입중" || item.status === "대기중" || item.status === "종료예정";
        }).filter(function (item) {
            return state.availabilityCardFilter === "all" || item.status === state.availabilityCardFilter;
        }).length;
        var regionHeader = byId("hr030RegionHeader");
        var detailHeader = byId("hr030DetailHeader");
        var skillHeader = byId("hr030SkillHeader");
        var availabilityHeader = byId("hr030AvailabilityHeader");
        var placeholderHeader = byId("hr030PlaceholderHeader");
        var availabilityListHeader = byId("hr030AvailabilityListHeader");

        if (regionHeader) {
            regionHeader.innerHTML = renderSectionHeader({
                title: "지역별 인력 지도",
                description: "권역을 클릭하면 상세 지표와 주력 기술 구성이 함께 바뀝니다.",
                controlHtml: renderHeaderSelect({
                    type: "region",
                    card: "map",
                    label: "지역 선택",
                    value: state.selectedRegionId,
                    options: regionOptions
                })
            });
        }

        if (detailHeader) {
            detailHeader.innerHTML = renderSectionHeader({
                title: state.selectedRegionId === "all" ? "전체 권역 상세" : currentRegion.name + " 상세",
                description: "선택한 권역의 주요 운영 수치를 확인합니다.",
                controlHtml: renderHeaderSelect({
                    type: "region",
                    card: "detail",
                    label: "상세 지역 선택",
                    value: state.selectedRegionId,
                    options: regionOptions
                })
            });
        }

        if (skillHeader) {
            skillHeader.innerHTML = renderSectionHeader({
                title: "주력 기술 분포",
                description: currentRegion.name + " 권역 기준 실제 기술태그 상위 분포",
                controlHtml: renderHeaderSelect({
                    type: "skill-view",
                    card: "skills",
                    label: "기술 보기 기준",
                    value: state.skillViewMode,
                    options: skillOptions
                })
            });
        }

        if (availabilityHeader) {
            availabilityHeader.innerHTML = renderSectionHeader({
                title: "가용 인력 / 투입 가능 인원",
                description: currentRegion.name + " 기준 상태별 인원 요약과 즉시 확인 리스트",
                controlHtml: renderHeaderSelect({
                    type: "availability-view",
                    card: "availability",
                    label: "가용 인력 보기 기준",
                    value: state.availabilityCardFilter,
                    options: availabilityOptions
                })
            });
        }

        if (placeholderHeader) {
            placeholderHeader.innerHTML = renderSectionHeader({
                title: "추가 카드",
                description: "추후 운영 위젯을 배치할 수 있는 준비 영역입니다.",
                controlHtml: renderHeaderSelect({
                    type: "placeholder-view",
                    card: "placeholder",
                    label: "추가 카드 보기 기준",
                    value: "all",
                    options: [{ value: "all", label: "전체" }]
                })
            });
        }

        if (availabilityListHeader) {
            availabilityListHeader.innerHTML = "<strong>가용 인력 리스트</strong><span>조건 일치 " + formatNumber(availabilityCount) + "명</span>";
        }
    }

    function renderDashboard() {
        var employeeRows = getVisibleEmployees();
        var issueRows = getVisibleIssues();

        updateHeaders(employeeRows);
        updateSearchResultNote(employeeRows, issueRows);
        renderRegionMap();
        renderRegionDetail();
        renderAvailabilityPanel(employeeRows);
        renderSkillDistribution();
    }

    // 사용자 상호작용 바인딩
    function bindSearch() {
        var searchInput = byId("hr030DashboardSearch");

        if (!searchInput) {
            return;
        }

        searchInput.addEventListener("input", function (event) {
            state.query = event.target.value || "";
            renderDashboard();
        });
    }

    function bindStatusFilter() {
        var filterGroup = byId("hr030StatusFilterGroup");

        if (!filterGroup) {
            return;
        }

        filterGroup.addEventListener("click", function (event) {
            var target = event.target.closest("button[data-status-filter]");

            if (!target) {
                return;
            }

            state.statusFilter = target.getAttribute("data-status-filter") || "all";

            Array.prototype.forEach.call(filterGroup.querySelectorAll("button"), function (button) {
                button.classList.toggle("is-active", button === target);
            });

            renderDashboard();
        });
    }

    function bindRegionSelection() {
        var mapEl = byId("hr030RegionMap");
        var resetButton = byId("hr030RegionReset");

        function findRegionId(target) {
            var node = target;

            while (node && node !== mapEl) {
                if (node.dataset && node.dataset.regionId) {
                    return node.dataset.regionId;
                }

                node = node.parentNode;
            }

            return "";
        }

        if (mapEl) {
            mapEl.addEventListener("click", function (event) {
                var regionId = findRegionId(event.target);

                if (!regionId) {
                    return;
                }

                state.selectedRegionId = regionId;
                renderDashboard();
            });

            mapEl.addEventListener("keydown", function (event) {
                var regionId = findRegionId(event.target);

                if (!regionId || (event.key !== "Enter" && event.key !== " ")) {
                    return;
                }

                event.preventDefault();
                state.selectedRegionId = regionId;
                renderDashboard();
            });
        }

        if (resetButton) {
            resetButton.addEventListener("click", function () {
                state.selectedRegionId = "all";
                renderDashboard();
            });
        }
    }

    function bindCardSelects() {
        var dashboard = byId("hr030-dashboard");

        if (!dashboard) {
            return;
        }

        dashboard.addEventListener("change", function (event) {
            var target = event.target;
            var selectType;
            var value;

            if (!target || target.tagName !== "SELECT") {
                return;
            }

            selectType = target.getAttribute("data-dashboard-select");
            value = target.value || "all";

            if (selectType === "region") {
                state.selectedRegionId = value;
                renderDashboard();
                return;
            }

            if (selectType === "skill-view") {
                state.skillViewMode = value;
                renderDashboard();
                return;
            }

            if (selectType === "availability-view") {
                state.availabilityCardFilter = value;
                renderDashboard();
            }
        });
    }

    function initializeIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    // 초기 진입 시점 부트스트랩
    function initialize() {
        setStaticContent();
        renderDashboard();
        loadSkillCatalog();
        bindSearch();
        bindStatusFilter();
        bindRegionSelection();
        bindCardSelects();
        window.addEventListener("resize", resizeCharts);
        initializeIcons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
