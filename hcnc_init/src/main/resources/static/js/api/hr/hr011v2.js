(function ($) {
    window.currentMode = window.currentMode || "view";
    window.hr010ReadOnly = false;
    window.changedTabs = window.changedTabs || { tab1: false, tab2: false, tab3: false, tab4: false };

    const state = {
        devId: "",
        isInsert: false,
        row: null,
        contract: null,
        score: null,
        photoUrl: "",
        photoFile: null,
        activeProjectToken: "",
        pendingProjectToken: "",
        projectRowsCache: [],
        projectWorkspaceBound: false,
        projectWorkspaceTable: null,
        projectWorkspaceTimer: null
    };

    const codeMaps = {
        devTyp: {},
        workMd: {},
        ctrtTyp: {},
        kosa: {},
        mainFld: {},
        mainCust: {},
        sido: {},
        bizTyp: {}
    };

    $(async function () {
        bindEvents();

        try {
            await initSelects();
            await initPage();
            initLegacySections();
        } catch (error) {
            console.error("[hr011v2] init failed", error);
            await showAlert({
                icon: "error",
                title: "오류",
                text: "새 화면을 불러오는 중 문제가 발생했습니다."
            });
        }
    });

    function bindEvents() {
        $("#hr011v2BackBtn").on("click", function () {
            window.location.href = "/hr010";
        });

        $("#hr011v2LegacyBtn").on("click", function () {
            const url = state.isInsert && !state.devId
                ? "/hr011?mode=insert"
                : `/hr011?dev_id=${encodeURIComponent(state.devId)}`;
            window.location.href = url;
        });

        $("#hr011v2ResetBtn").on("click", async function () {
            if (state.isInsert && !state.devId) {
                applyInsertDefaults();
                syncModeUi();
                syncPageState();
                return;
            }

            await reloadCurrentData();
        });

        $("#hr011v2SaveBtn").on("click", async function () {
            await savePage();
        });

        $(document).on("hr013:focusEvaluation", function (_, projectId) {
            if (projectId) {
                setActiveProjectById(projectId, { reload: false });
            }

            const section = document.getElementById("hr011v2SectionProject");
            if (section) {
                scrollToSection(section);
            }
        });

        $(document).on("hr013:dataLoaded", function (_, rows) {
            state.projectRowsCache = Array.isArray(rows) ? rows : [];
            scheduleProjectWorkspaceSync();
        });

        $("#hr011v2ProjectAddBtn").on("click", function () {
            if (typeof addHr013Row === "function") {
                addHr013Row();
                return;
            }
            $(".btn-tab3-add").trigger("click");
        });

        $("#hr011v2ProjectDeleteBtn").on("click", async function () {
            const entry = getActiveProjectEntry();
            if (!entry || !entry.rowComp) {
                await showAlert({
                    icon: "info",
                    title: "알림",
                    text: "삭제할 프로젝트를 먼저 선택해 주세요."
                });
                return;
            }

            markProjectEntryChecked(entry.token);

            if (typeof removeHr013SelectedRows === "function") {
                await removeHr013SelectedRows();
                scheduleProjectWorkspaceSync();
                return;
            }

            $(".btn-tab3-remove").trigger("click");
        });

        $("#hr011v2ProjectLinkBtn").on("click", function () {
            const entry = getActiveProjectEntry();
            if (!entry) {
                return;
            }
            openProjectRowModal(entry);
        });

        $("#hr011v2ProjectSkillBtn").on("click", function () {
            const entry = getActiveProjectEntry();
            if (!entry || !entry.rowComp || typeof openHr013SkillPicker !== "function") {
                return;
            }
            openHr013SkillPicker("grid", entry.rowComp);
        });

        $("#hr011v2ProjectEditBtn").on("click", function () {
            openProjectRowModal(getActiveProjectEntry());
        });

        $(document).on("click", ".hr011v2-project-card", function () {
            const token = String($(this).data("projectToken") || "");
            if (!token) {
                return;
            }
            activateProjectEntry(token, { reload: true });
        });

        $(document).on("click", ".hr011v2-project-card-action", function (event) {
            event.preventDefault();
            event.stopPropagation();

            const token = String($(this).closest(".hr011v2-project-card").data("projectToken") || "");
            const action = String($(this).data("action") || "");
            const entry = getProjectEntryByToken(token);

            if (!entry) {
                return;
            }

            if (action === "focus") {
                activateProjectEntry(token, { reload: true });
                return;
            }

            if (action === "skill" && typeof openHr013SkillPicker === "function") {
                openHr013SkillPicker("grid", entry.rowComp);
                return;
            }

            if (action === "link" && typeof openHr013ProjectPicker === "function") {
                openHr013ProjectPicker(entry.rowComp);
            }
        });

        $(document).on("change", ".select_prj_cd", function () {
            const projectId = $.trim($(this).val() || "");
            if (!projectId) {
                return;
            }
            setActiveProjectById(projectId, { reload: false });
        });

        $("#hr011v2PhotoTrigger").on("click", function () {
            $("#hr011v2Photo").trigger("click");
        });

        $("#hr011v2Photo").on("change", function () {
            const file = this.files && this.files[0] ? this.files[0] : null;
            if (!file) {
                return;
            }

            if (!String(file.type || "").startsWith("image/")) {
                showAlert({
                    icon: "warning",
                    title: "경고",
                    text: "이미지 파일만 업로드할 수 있습니다."
                });
                this.value = "";
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                showAlert({
                    icon: "warning",
                    title: "경고",
                    text: "이미지는 2MB 이하만 업로드할 수 있습니다."
                });
                this.value = "";
                return;
            }

            state.photoFile = file;
            const reader = new FileReader();
            reader.onload = function (event) {
                state.photoUrl = String(event.target && event.target.result || "");
                renderPhotoPreview(state.photoUrl, getFieldValue("#hr011v2DevNm"));
            };
            reader.readAsDataURL(file);
        });

        $("#hr011v2FormRoot").on("input change", "input, select, textarea", function (event) {
            const target = event.target;

            if (target.id === "hr011v2Tel") {
                target.value = formatPhoneNumber(target.value);
            }

            if (target.id === "hr011v2HopeRateAmt" || target.id === "hr011v2Amt") {
                target.value = formatCurrencyInput(target.value);
            }

            if (target.id === "hr011v2ExpYear") {
                target.value = clampNumber(target.value, 0, 99);
            }

            if (target.id === "hr011v2ExpMonth") {
                target.value = clampNumber(target.value, 0, 12);
            }

            syncPageState();
        });

        $(".hr011v2-nav-btn").on("click", function () {
            const targetId = $(this).data("target");
            const section = document.getElementById(targetId);
            if (!section) {
                return;
            }

            scrollToSection(section);
        });

        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    const id = entry.target.getAttribute("id");
                    $(".hr011v2-nav-btn").removeClass("is-active");
                    $(`.hr011v2-nav-btn[data-target="${id}"]`).addClass("is-active");
                });
            }, {
                rootMargin: "-25% 0px -55% 0px",
                threshold: 0.01
            });

            $(".hr011v2-main > section").each(function () {
                observer.observe(this);
            });
        }
    }

    function getScrollOffset() {
        const root = document.querySelector(".container-wrap");
        const headerHeight = root
            ? parseInt(getComputedStyle(root).getPropertyValue("--hcnc-header-height"), 10) || 72
            : 72;
        return headerHeight + 20;
    }

    function scrollToSection(section) {
        if (!section) {
            return;
        }

        const top = section.getBoundingClientRect().top + window.scrollY - getScrollOffset();
        window.scrollTo({
            top: Math.max(0, top),
            behavior: "smooth"
        });
    }

    function bindProjectWorkspace() {
        if (state.projectWorkspaceBound) {
            return;
        }
        state.projectWorkspaceBound = true;
    }

    function ensureProjectWorkspaceObservers() {
        const table = window.hr013Table;
        if (!table || state.projectWorkspaceTable === table || typeof table.on !== "function") {
            return;
        }

        ["dataLoaded", "dataChanged", "cellEdited", "rowAdded", "rowDeleted"].forEach(function (eventName) {
            try {
                table.on(eventName, function () {
                    scheduleProjectWorkspaceSync();
                });
            } catch (error) {
                console.warn("[hr011v2] table observer attach skipped", eventName, error);
            }
        });

        state.projectWorkspaceTable = table;
    }

    function scheduleProjectWorkspaceSync(preferredToken) {
        if (preferredToken) {
            state.pendingProjectToken = preferredToken;
        }

        if (state.projectWorkspaceTimer) {
            clearTimeout(state.projectWorkspaceTimer);
        }

        state.projectWorkspaceTimer = setTimeout(function () {
            state.projectWorkspaceTimer = null;
            syncProjectWorkspace();
        }, 0);
    }

    function syncProjectWorkspace() {
        bindProjectWorkspace();
        ensureProjectWorkspaceObservers();

        const entries = getProjectEntries();

        if (!entries.length) {
            state.activeProjectToken = "";
            renderProjectTimeline([]);
            renderProjectFocus(null);
            renderProjectEvalState(null);
            syncLegacySectionStatus();
            return;
        }

        let nextToken = state.pendingProjectToken || state.activeProjectToken || "";
        state.pendingProjectToken = "";

        if (!nextToken || !entries.some(function (entry) { return entry.token === nextToken; })) {
            nextToken = getProjectTokenById(entries, window.hr013_prj_nm) || entries[0].token;
        }

        state.activeProjectToken = nextToken;

        const activeEntry = entries.find(function (entry) {
            return entry.token === state.activeProjectToken;
        }) || entries[0];

        state.activeProjectToken = activeEntry.token;

        renderProjectTimeline(entries);
        renderProjectFocus(activeEntry);
        renderProjectEvalState(activeEntry);
        syncLegacySectionStatus();

        if (activeEntry.data && activeEntry.data.dev_prj_id) {
            const selectedProjectId = String(window.hr013_prj_nm || "").trim();
            const nextProjectId = String(activeEntry.data.dev_prj_id || "").trim();

            if (nextProjectId && selectedProjectId !== nextProjectId) {
                loadProjectEvaluation(nextProjectId, false);
            }
        }
    }

    function getProjectEntries() {
        if (!window.hr013Table || typeof window.hr013Table.getRows !== "function") {
            return buildProjectEntriesFromCache();
        }

        const rows = window.hr013Table.getRows() || [];
        if (!rows.length && state.projectRowsCache.length) {
            return buildProjectEntriesFromCache();
        }

        return rows.map(function (rowComp, index) {
            const data = rowComp && typeof rowComp.getData === "function" ? (rowComp.getData() || {}) : {};
            return {
                token: buildProjectToken(data, index),
                rowComp: rowComp,
                data: data
            };
        });
    }

    function buildProjectEntriesFromCache() {
        return (state.projectRowsCache || []).map(function (data, index) {
            return {
                token: buildProjectToken(data, index),
                rowComp: null,
                data: data || {}
            };
        });
    }

    function buildProjectToken(data, index) {
        const projectId = $.trim(data && data.dev_prj_id || "");
        if (projectId) {
            return `id:${projectId}`;
        }
        return `tmp:${index}`;
    }

    function getProjectTokenById(entries, projectId) {
        const target = $.trim(projectId || "");
        if (!target) {
            return "";
        }

        const matched = (entries || []).find(function (entry) {
            return String(entry.data && entry.data.dev_prj_id || "").trim() === target;
        });

        return matched ? matched.token : "";
    }

    function getProjectEntryByToken(token) {
        return getProjectEntries().find(function (entry) {
            return entry.token === token;
        }) || null;
    }

    function getActiveProjectEntry() {
        if (!state.activeProjectToken) {
            return null;
        }
        return getProjectEntryByToken(state.activeProjectToken);
    }

    function activateProjectEntry(token, options) {
        const entry = getProjectEntryByToken(token);
        if (!entry) {
            return;
        }

        state.activeProjectToken = entry.token;
        renderProjectTimeline(getProjectEntries());
        renderProjectFocus(entry);
        renderProjectEvalState(entry);
        syncLegacySectionStatus();

        if (options && options.reload === false) {
            return;
        }

        if (entry.data && entry.data.dev_prj_id) {
            loadProjectEvaluation(entry.data.dev_prj_id, false);
        }
    }

    function setActiveProjectById(projectId, options) {
        const token = getProjectTokenById(getProjectEntries(), projectId);
        if (!token) {
            return;
        }
        activateProjectEntry(token, options);
    }

    function loadProjectEvaluation(projectId, shouldScroll) {
        const normalizedId = $.trim(projectId || "");
        if (!normalizedId) {
            return;
        }

        const entry = getProjectEntryByToken(getProjectTokenById(getProjectEntries(), normalizedId)) || getActiveProjectEntry();
        const canEvaluate = !!(entry && entry.data && entry.data.dev_prj_id && isInternalProject(entry.data));
        const canManageRisk = !!(entry && entry.data && entry.data.dev_prj_id);

        window.currentDevId = state.devId || "";
        window.hr013_prj_nm = normalizedId;
        $(".select_prj_cd").val(normalizedId);

        if (canEvaluate && typeof reloadTab4 === "function") {
            reloadTab4(normalizedId).finally(function () {
                renderProjectFocus(getActiveProjectEntry());
                renderProjectEvalState(getActiveProjectEntry());
                syncLegacySectionStatus();
                if (shouldScroll) {
                    scrollToSection(document.getElementById("hr011v2SectionProject"));
                }
            });
            return;
        }

        if (canManageRisk && typeof window.loadHr014RiskData === "function") {
            window.loadHr014RiskData().finally(function () {
                renderProjectFocus(getActiveProjectEntry());
                renderProjectEvalState(getActiveProjectEntry());
                syncLegacySectionStatus();
                if (shouldScroll) {
                    scrollToSection(document.getElementById("hr011v2SectionProject"));
                }
            });
            return;
        }

        renderProjectEvalState(getActiveProjectEntry());
        syncLegacySectionStatus();
    }

    function markProjectEntryChecked(token) {
        const entries = getProjectEntries();
        entries.forEach(function (entry) {
            if (!entry.rowComp || typeof entry.rowComp.update !== "function") {
                return;
            }
            entry.rowComp.update({ _checked: entry.token === token });
        });
    }

    function openProjectRowModal(entry) {
        if (typeof closeHr013SkillPicker === "function") {
            closeHr013SkillPicker(true);
        }

        if (entry && entry.data && typeof fillHr013Form === "function") {
            $("#hr013-type").text(entry.data.dev_prj_id ? "수정" : "등록");
            fillHr013Form(entry.data);
            $("#write-hr013-area").show();
            return;
        }

        if (typeof clearHr013Form === "function") {
            clearHr013Form();
        }
        $("#hr013-type").text("등록");
        $("#write-hr013-area").show();
    }

    function renderProjectTimeline(entries) {
        const $timeline = $("#hr011v2ProjectTimeline");
        const count = entries.length;
        $("#hr011v2ProjectTimelineCount").text(`${count}건`);
        $("#hr011v2ProjectTimelineSummary").text(
            count ? `왼쪽 절반에서 프로젝트를 고르면 오른쪽 절반 작업영역이 즉시 바뀝니다.` : "등록된 프로젝트가 없습니다. 새 프로젝트를 추가해 주세요."
        );

        $timeline.empty();

        if (!count) {
            $timeline.append(`
                <div class="hr011v2-project-empty">
                    <strong>아직 프로젝트가 없습니다.</strong>
                    <p>새 프로젝트를 추가하면 이 영역에 타임라인 카드가 생성됩니다.</p>
                </div>
            `);
            return;
        }

        entries.forEach(function (entry) {
            const data = entry.data || {};
            const isActive = entry.token === state.activeProjectToken;
            const projectName = data.prj_nm || "프로젝트명 미입력";
            const customer = data.inprj_yn === "Y" ? "HCNC / 당사 프로젝트" : `${data.cust_nm || "고객사 미입력"} / 외부 프로젝트`;
            const period = formatProjectPeriod(data.st_dt, data.ed_dt);
            const roleText = resolveProjectRole(data);
            const roleSummary = `${roleText}${data.alloc_pct ? ` · ${String(data.alloc_pct).replace(/[^\d]/g, "")}%` : ""}`;
            const workspaceText = !data.dev_prj_id
                ? "저장 전"
                : isInternalProject(data)
                    ? "평가 + 리스크"
                    : "리스크 전용";
            const stackLabels = getProjectStackLabels(data).slice(0, 2);
            const stackHtml = stackLabels.length
                ? stackLabels.map(function (label) {
                    return `<span class="hr011v2-project-card__pill">${escapeHtml(label)}</span>`;
                }).join("")
                : `<span class="hr011v2-project-card__pill is-empty">기술 미입력</span>`;
            const badgeText = data.dev_prj_id ? "저장됨" : "임시";

            $timeline.append(`
                <article class="hr011v2-project-card ${isActive ? "is-active" : ""}" data-project-token="${escapeAttribute(entry.token)}">
                    <div class="hr011v2-project-card__head">
                        <span class="hr011v2-project-card__badge ${data.inprj_yn === "Y" ? "is-internal" : "is-external"}">${data.inprj_yn === "Y" ? "당사" : "외부"}</span>
                        <span class="hr011v2-project-card__status">${escapeHtml(badgeText)}</span>
                    </div>
                    <h5>${escapeHtml(projectName)}</h5>
                    <p class="hr011v2-project-card__customer">${escapeHtml(customer)}</p>
                    <div class="hr011v2-project-card__meta">
                        <span>${escapeHtml(period)}</span>
                        <span>${escapeHtml(roleSummary || "역할 미입력")}</span>
                        <span>${escapeHtml(workspaceText)}</span>
                    </div>
                    <div class="hr011v2-project-card__stack">${stackHtml}</div>
                </article>
            `);
        });
    }

    function renderProjectFocus(entry) {
        const $title = $("#hr011v2ProjectFocusTitle");
        const $desc = $("#hr011v2ProjectFocusDesc");
        const $customer = $("#hr011v2ProjectFocusCustomer");
        const $period = $("#hr011v2ProjectFocusPeriod");
        const $role = $("#hr011v2ProjectFocusRole");
        const $rate = $("#hr011v2ProjectFocusRate");
        const $note = $("#hr011v2ProjectFocusNote");
        const $stack = $("#hr011v2ProjectFocusStack");
        const hasEntry = !!(entry && entry.data);
        const hasEditableRow = !!(entry && entry.rowComp);

        $("#hr011v2ProjectLinkBtn, #hr011v2ProjectSkillBtn, #hr011v2ProjectEditBtn").prop("disabled", !hasEditableRow);
        $stack.empty();

        if (!hasEntry) {
            $title.text("프로젝트를 선택해 주세요");
            $desc.text("왼쪽 타임라인에서 프로젝트를 선택하면 평가와 리스크 작업영역이 열립니다.");
            $customer.text("-");
            $period.text("-");
            $role.text("-");
            $rate.text("-");
            $note.text("평가를 진행하려면 저장된 프로젝트를 선택해 주세요.");
            $stack.append('<span class="hr011v2-empty-pill">선택된 프로젝트의 기술이 여기에 표시됩니다.</span>');
            return;
        }

        const data = entry.data;
        const projectName = data.prj_nm || "프로젝트명 미입력";
        const customerText = data.inprj_yn === "Y"
            ? `HCNC / 당사 프로젝트`
            : `${data.cust_nm || "고객사 미입력"} / 외부 프로젝트`;
        const periodText = formatProjectPeriod(data.st_dt, data.ed_dt);
        const roleText = `${resolveProjectRole(data)} / ${data.alloc_pct ? `${String(data.alloc_pct).replace(/[^\d]/g, "")}%` : "투입률 미입력"}`;
        const rateText = formatProjectRate(data.rate_amt);
        const stackLabels = getProjectStackLabels(data);
        const isSaved = !!data.dev_prj_id;
        const isInternal = isInternalProject(data);

        $title.text(projectName);
        if (!isSaved) {
            $desc.text("임시 프로젝트 행입니다. 저장을 완료하면 우측 작업영역이 열리고 평가 또는 리스크를 이어서 작성할 수 있습니다.");
        } else if (isInternal) {
            $desc.text("당사 프로젝트입니다. 관리자평가와 리스크관리를 한 화면에서 바로 수정할 수 있습니다.");
        } else {
            $desc.text("외부 프로젝트입니다. 관리자평가는 제외되고 리스크관리만 이어서 작성할 수 있습니다.");
        }
        $customer.text(customerText);
        $period.text(periodText);
        $role.text(roleText);
        $rate.text(rateText);
        $note.text(data.remark || (!isSaved
            ? "프로젝트 코드 연결과 저장을 먼저 진행해 주세요."
            : isInternal
                ? "관리자평가와 리스크관리를 모두 바로 확인할 수 있습니다."
                : "외부 프로젝트는 리스크 중심으로 관리합니다."));

        if (!stackLabels.length) {
            $stack.append('<span class="hr011v2-empty-pill">기술 미입력</span>');
            return;
        }

        stackLabels.forEach(function (label) {
            $stack.append(`<span class="hr011v2-pill">${escapeHtml(label)}</span>`);
        });
    }

    function renderProjectEvalState(entry) {
        const hasSavedProject = !!(entry && entry.data && entry.data.dev_prj_id);
        const canEvaluate = !!(hasSavedProject && isInternalProject(entry.data));
        const $empty = $("#hr011v2ProjectEvalEmpty");
        const $emptyTitle = $empty.find("strong");
        const $emptyDesc = $empty.find("p");
        const $locked = $("#hr011v2ProjectEvalLocked");
        const $board = $("#hr011v2ProjectEvalBoard");

        if (!hasSavedProject) {
            $emptyTitle.text(entry ? "프로젝트 저장 후 작업영역이 열립니다." : "저장된 프로젝트를 선택하면 작업영역이 열립니다.");
            $emptyDesc.text(entry
                ? "임시 행은 먼저 프로젝트명과 기본 정보를 저장한 뒤 관리자평가 또는 리스크를 입력할 수 있습니다."
                : "왼쪽 타임라인에서 저장된 프로젝트를 선택하면 우측 보드가 바로 열립니다.");
            $empty.show();
            $locked.prop("hidden", true).hide();
            $board.removeClass("is-risk-only").hide();
            $("#HR014_TAB_A").show();
            $("#HR014_TAB_B").show();
            return;
        }

        $empty.hide();
        $locked.prop("hidden", canEvaluate).toggle(!canEvaluate);
        $board
            .toggleClass("is-risk-only", !canEvaluate)
            .show();
        $("#HR014_TAB_A").toggle(canEvaluate);
        $("#HR014_TAB_B").show();
    }

    function resolveProjectRole(data) {
        if (!data) {
            return "역할 미입력";
        }

        if (typeof jobCodeFormatter === "function") {
            const cellLike = {
                getValue: function () { return data.job_cd || data.role_nm || ""; },
                getRow: function () { return { getData: function () { return data; } }; }
            };
            const label = $.trim(jobCodeFormatter(cellLike) || "");
            if (label) {
                return label;
            }
        }

        return $.trim(data.role_nm || data.job_cd || "") || "역할 미입력";
    }

    function getProjectStackLabels(data) {
        const raw = $.trim(data && (data.stack_txt_nm || "") || "");
        if (raw) {
            return splitLabels(raw);
        }

        if (typeof getSkillLabelList === "function") {
            const text = $.trim(getSkillLabelList(data && (data.stack_txt || "") || ""));
            return splitLabels(text);
        }

        return splitLabels(data && (data.stack_txt || "") || "");
    }

    function formatProjectPeriod(stDt, edDt) {
        const start = formatProjectDate(stDt);
        const end = formatProjectDate(edDt);
        if (!start && !end) {
            return "기간 미입력";
        }
        if (!start || !end) {
            return start || end;
        }
        return `${start} ~ ${end}`;
    }

    function formatProjectDate(value) {
        if (!value) {
            return "";
        }
        if (typeof formatDateDisplay === "function") {
            return formatDateDisplay(value);
        }
        return String(value).replaceAll(".", "-");
    }

    function formatProjectRate(value) {
        if (typeof hr013AmountFormatter === "function") {
            const text = $.trim(hr013AmountFormatter(value) || "");
            return text || "단가 미입력";
        }
        return value ? `${value}` : "단가 미입력";
    }

    function isInternalProject(data) {
        return String(data && data.inprj_yn || "").trim().toUpperCase() === "Y";
    }

    async function initSelects() {
        await Promise.all([
            loadSelect("hr011v2DevTyp", "DEV_TYP", codeMaps.devTyp, "구분을 선택하세요."),
            loadSelect("hr011v2WorkMd", "WORK_MD", codeMaps.workMd, "근무형태를 선택하세요."),
            loadSelect("hr011v2CtrtTyp", "CTRT_TYP", codeMaps.ctrtTyp, "계약형태를 선택하세요."),
            loadSelect("hr011v2Kosa", "KOSA_GRD_CD", codeMaps.kosa, "KOSA 등급을 선택하세요."),
            loadSelect("hr011v2MainFld", "MAIN_FLD_CD", codeMaps.mainFld, "주요 분야를 선택하세요."),
            loadSelect("hr011v2MainCust", "MAIN_CUST_CD", codeMaps.mainCust, "주요 고객사를 선택하세요."),
            loadSelect("hr011v2Sido", "SIDO_CD", codeMaps.sido, "거주지역을 선택하세요."),
            loadSelect("hr011v2BizTyp", "BIZ_TYP", codeMaps.bizTyp, "사업자 유형을 선택하세요.")
        ]);
    }

    async function initPage() {
        const params = new URLSearchParams(window.location.search || "");
        const hiddenDevId = $.trim($("#hr011v2DevId").val());
        const queryDevId = $.trim(params.get("dev_id") || "");

        state.devId = hiddenDevId || queryDevId;
        state.isInsert = isInsertRequest(params) || !state.devId;

        if (!state.devId && !state.isInsert) {
            await showAlert({
                icon: "warning",
                title: "안내",
                text: "선택된 인력 정보가 없습니다."
            });
            window.location.href = "/hr010";
            return;
        }

        if (state.isInsert) {
            applyInsertDefaults();
            syncModeUi();
            syncPageState();
            return;
        }

        await reloadCurrentData();
    }

    function isInsertRequest(params) {
        const mode = String(params.get("mode") || "").trim().toLowerCase();
        const isNew = String(params.get("new") || "").trim().toUpperCase();
        return mode === "insert" || isNew === "Y";
    }

    async function reloadCurrentData() {
        if (!state.devId) {
            applyInsertDefaults();
            syncPageState();
            return;
        }

        showLoading();

        try {
            await Promise.all([
                loadProfile(state.devId),
                loadContract(state.devId),
                loadScore(state.devId)
            ]);

            state.isInsert = false;
            syncModeUi();
            syncPageState();
            initLegacySections();
        } finally {
            hideLoading();
        }
    }

    async function loadProfile(devId) {
        const response = await $.ajax({
            url: "/hr010/list",
            type: "GET",
            data: { dev_id: devId }
        });

        const row = Array.isArray(response && response.res) ? response.res[0] : null;
        if (!row) {
            throw new Error("상세 데이터를 찾을 수 없습니다.");
        }

        state.row = row;
        state.photoUrl = row.img_url || "";
        fillProfileForm(row);
    }

    async function loadContract(devId) {
        try {
            const response = await $.ajax({
                url: "/hr011/tab1",
                type: "GET",
                data: { dev_id: devId }
            });

            state.contract = response && response.res ? response.res : null;
            fillContractForm(state.contract || {});
        } catch (error) {
            console.warn("[hr011v2] contract load skipped", error);
            state.contract = null;
            fillContractForm({});
        }
    }

    async function loadScore(devId) {
        try {
            const response = await $.ajax({
                url: "/hr010/getScore",
                type: "GET",
                data: { dev_id: devId }
            });

            state.score = response && response.res ? response.res : null;
        } catch (error) {
            console.warn("[hr011v2] score load skipped", error);
            state.score = null;
        }
    }

    function fillProfileForm(row) {
        $("#hr011v2DevId").val(row.dev_id || "");
        $("#hr011v2DevNm").val(row.dev_nm || "");
        $("#hr011v2DevTyp").val(resolveDevTypeValue(row));
        $("#hr011v2Brdt").val(row.brdt || "");
        $("#hr011v2Tel").val(row.tel || "");
        $("#hr011v2Email").val(row.email || "");
        $("#hr011v2Sido").val(row.sido_cd || "");
        $("#hr011v2AvailDt").val(row.avail_dt || "");
        $("#hr011v2WorkMd").val(row.work_md || "");
        $("#hr011v2CtrtTyp").val(row.ctrt_typ || "");
        $("#hr011v2Kosa").val(row.kosa_grd_cd || "");
        $("#hr011v2MainFld").val(row.main_fld_cd || "");
        $("#hr011v2MainCust").val(row.main_cust_cd || "");
        $("#hr011v2EduLast").val(row.edu_last || "");
        $("#hr011v2CertTxt").val(row.cert_txt || "");
        $("#hr011v2MainLangRaw").val(row.main_lang || "");
        $("#hr011v2HopeRateAmt").val(formatCurrencyInput(row.hope_rate_amt));
        setCareerFields(row.exp_yr);
        renderMainLangPills(splitLabels(row.main_lang_nm || row.main_lang || ""));
        renderPhotoPreview(state.photoUrl, row.dev_nm || "");
    }

    function fillContractForm(contract) {
        $("#hr011v2CtrtId").val(contract.ctrt_id || "");
        $("#hr011v2OrgNm").val(contract.org_nm || "");
        $("#hr011v2BizTyp").val(contract.biz_typ || "");
        $("#hr011v2StDt").val(contract.st_dt || "");
        $("#hr011v2EdDt").val(contract.ed_dt || "");
        $("#hr011v2Amt").val(formatCurrencyInput(contract.amt));
        $("#hr011v2Remark").val(contract.remark || "");
    }

    function applyInsertDefaults() {
        state.isInsert = true;
        state.row = null;
        state.contract = null;
        state.score = null;
        state.devId = "";
        state.photoUrl = "";
        state.photoFile = null;

        $("#hr011v2DevId").val("");
        $("#hr011v2CtrtId").val("");
        $("#hr011v2MainLangRaw").val("");
        $("#hr011v2Photo").val("");
        $("#hr011v2DevNm").val("");
        $("#hr011v2Brdt").val("");
        $("#hr011v2Tel").val("");
        $("#hr011v2Email").val("");
        $("#hr011v2Sido").val("");
        $("#hr011v2AvailDt").val("");
        $("#hr011v2WorkMd").val("");
        $("#hr011v2CtrtTyp").val("");
        $("#hr011v2Kosa").val("");
        $("#hr011v2MainFld").val("");
        $("#hr011v2MainCust").val("");
        $("#hr011v2EduLast").val("");
        $("#hr011v2CertTxt").val("");
        $("#hr011v2HopeRateAmt").val("");
        $("#hr011v2OrgNm").val("");
        $("#hr011v2BizTyp").val("");
        $("#hr011v2StDt").val("");
        $("#hr011v2EdDt").val("");
        $("#hr011v2Amt").val("");
        $("#hr011v2Remark").val("");

        setCareerFields("");
        renderMainLangPills([]);
        renderPhotoPreview("", "");

        const firstDevType = $("#hr011v2DevTyp option").filter(function () {
            return !!String(this.value || "").trim();
        }).first().val() || "";
        $("#hr011v2DevTyp").val(firstDevType);
        syncLegacyContext();
    }

    async function savePage() {
        if (!validateProfileForm()) {
            return;
        }

        if (hasContractInput() && !validateContractForm()) {
            return;
        }

        try {
            showLoading();

            const mainResponse = await saveMainProfile();
            if (mainResponse && mainResponse.success === false) {
                throw new Error(mainResponse.message || "접근 권한이 없습니다.");
            }

            const savedDevId = $.trim(mainResponse && mainResponse.dev_id || "");
            if (savedDevId) {
                state.devId = savedDevId;
                $("#hr011v2DevId").val(savedDevId);
                updateUrl(savedDevId);
            }

            if (hasContractInput()) {
                await saveContract();
            }

            await saveLegacySections();

            state.isInsert = false;
            await reloadCurrentData();

            await showAlert({
                icon: "success",
                title: "완료",
                text: "새 화면 기준으로 회원 정보가 저장되었습니다."
            });
        } catch (error) {
            console.error("[hr011v2] save failed", error);
            await showAlert({
                icon: "error",
                title: "오류",
                text: error && error.message ? error.message : "저장 중 오류가 발생했습니다."
            });
        } finally {
            hideLoading();
        }
    }

    async function saveMainProfile() {
        const formData = new FormData();
        formData.append("dev_id", getFieldValue("#hr011v2DevId"));
        formData.append("dev_typ", getFieldValue("#hr011v2DevTyp"));
        formData.append("dev_nm", getFieldValue("#hr011v2DevNm"));
        formData.append("brdt", getFieldValue("#hr011v2Brdt"));
        formData.append("tel", getFieldValue("#hr011v2Tel"));
        formData.append("email", getFieldValue("#hr011v2Email"));
        formData.append("sido_cd", getFieldValue("#hr011v2Sido"));
        formData.append("main_lang", getFieldValue("#hr011v2MainLangRaw"));
        formData.append("exp_yr", composeCareerValue());
        formData.append("edu_last", getFieldValue("#hr011v2EduLast"));
        formData.append("cert_txt", getFieldValue("#hr011v2CertTxt"));
        formData.append("work_md", getFieldValue("#hr011v2WorkMd"));
        formData.append("avail_dt", getFieldValue("#hr011v2AvailDt"));
        formData.append("ctrt_typ", getFieldValue("#hr011v2CtrtTyp"));
        formData.append("hope_rate_amt", normalizeAmountValue(getFieldValue("#hr011v2HopeRateAmt")));
        formData.append("kosa_grd_cd", getFieldValue("#hr011v2Kosa"));
        formData.append("main_fld_cd", getFieldValue("#hr011v2MainFld"));
        formData.append("main_cust_cd", getFieldValue("#hr011v2MainCust"));

        if (state.photoFile) {
            formData.append("dev_img", state.photoFile);
        }

        return $.ajax({
            url: "/hr010/upsert",
            type: "POST",
            processData: false,
            contentType: false,
            data: formData
        });
    }

    async function saveContract() {
        const response = await $.ajax({
            url: "/hr011/tab1_upsert",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                ctrtId: getFieldValue("#hr011v2CtrtId") || null,
                devId: state.devId,
                orgNm: getFieldValue("#hr011v2OrgNm"),
                bizTyp: getFieldValue("#hr011v2BizTyp"),
                stDt: getFieldValue("#hr011v2StDt"),
                edDt: getFieldValue("#hr011v2EdDt"),
                amt: normalizeAmountValue(getFieldValue("#hr011v2Amt")),
                remark: getFieldValue("#hr011v2Remark")
            })
        });

        if (response && response.success === false) {
            throw new Error(response.message || "계약 정보 저장에 실패했습니다.");
        }

        return response;
    }

    function validateProfileForm() {
        const checks = [
            { value: getFieldValue("#hr011v2DevNm"), selector: "#hr011v2DevNm", message: "성명을 입력하세요." },
            { value: getFieldValue("#hr011v2DevTyp"), selector: "#hr011v2DevTyp", message: "구분을 선택하세요." },
            { value: getFieldValue("#hr011v2Brdt"), selector: "#hr011v2Brdt", message: "생년월일을 입력하세요." },
            { value: getFieldValue("#hr011v2Tel"), selector: "#hr011v2Tel", message: "연락처를 입력하세요." },
            { value: getFieldValue("#hr011v2Email"), selector: "#hr011v2Email", message: "이메일을 입력하세요." },
            { value: getFieldValue("#hr011v2WorkMd"), selector: "#hr011v2WorkMd", message: "근무가능형태를 선택하세요." },
            { value: getFieldValue("#hr011v2AvailDt"), selector: "#hr011v2AvailDt", message: "투입 가능 시점을 입력하세요." },
            { value: getFieldValue("#hr011v2EduLast"), selector: "#hr011v2EduLast", message: "최종학력을 입력하세요." },
            { value: getFieldValue("#hr011v2CtrtTyp"), selector: "#hr011v2CtrtTyp", message: "계약형태를 선택하세요." },
            { value: getFieldValue("#hr011v2Kosa"), selector: "#hr011v2Kosa", message: "KOSA 등급을 선택하세요." },
            { value: getFieldValue("#hr011v2MainFld"), selector: "#hr011v2MainFld", message: "주요 분야를 선택하세요." },
            { value: getFieldValue("#hr011v2MainCust"), selector: "#hr011v2MainCust", message: "주요 고객사를 선택하세요." }
        ];

        for (let i = 0; i < checks.length; i += 1) {
            if (!checks[i].value) {
                warnField(checks[i].selector, checks[i].message);
                return false;
            }
        }

        if (!/^[0-9\-]+$/.test(getFieldValue("#hr011v2Tel"))) {
            warnField("#hr011v2Tel", "연락처 형식이 올바르지 않습니다.");
            return false;
        }

        if (!isValidEmail(getFieldValue("#hr011v2Email"))) {
            warnField("#hr011v2Email", "이메일 형식이 올바르지 않습니다.");
            return false;
        }

        const yearValue = Number(getFieldValue("#hr011v2ExpYear"));
        const monthValue = Number(getFieldValue("#hr011v2ExpMonth"));

        if (!Number.isFinite(yearValue) || yearValue < 0 || yearValue > 99) {
            warnField("#hr011v2ExpYear", "경력(년)은 0부터 99 사이여야 합니다.");
            return false;
        }

        if (!Number.isFinite(monthValue) || monthValue < 0 || monthValue > 12) {
            warnField("#hr011v2ExpMonth", "경력(개월)은 0부터 12 사이여야 합니다.");
            return false;
        }

        if (Number(normalizeAmountValue(getFieldValue("#hr011v2HopeRateAmt"))) <= 0) {
            warnField("#hr011v2HopeRateAmt", "희망 단가를 입력하세요.");
            return false;
        }

        return true;
    }

    function validateContractForm() {
        const orgNm = getFieldValue("#hr011v2OrgNm");
        const bizTyp = getFieldValue("#hr011v2BizTyp");
        const stDt = getFieldValue("#hr011v2StDt");
        const edDt = getFieldValue("#hr011v2EdDt");
        const amt = Number(normalizeAmountValue(getFieldValue("#hr011v2Amt")));

        if (!orgNm) {
            warnField("#hr011v2OrgNm", "소속사를 입력하세요.");
            return false;
        }

        if (!bizTyp) {
            warnField("#hr011v2BizTyp", "사업자 유형을 선택하세요.");
            return false;
        }

        if (!stDt) {
            warnField("#hr011v2StDt", "계약 시작일을 입력하세요.");
            return false;
        }

        if (!edDt) {
            warnField("#hr011v2EdDt", "계약 종료일을 입력하세요.");
            return false;
        }

        if (new Date(stDt) > new Date(edDt)) {
            warnField("#hr011v2EdDt", "계약 종료일은 시작일 이후여야 합니다.");
            return false;
        }

        if (!Number.isFinite(amt) || amt <= 0) {
            warnField("#hr011v2Amt", "계약 금액은 0보다 커야 합니다.");
            return false;
        }

        return true;
    }

    function warnField(selector, message) {
        showAlert({
            icon: "warning",
            title: "경고",
            text: message
        });
        $(selector).trigger("focus");
    }

    function syncModeUi() {
        const hasDevId = !!state.devId;
        const modeText = state.isInsert ? "등록 화면" : "수정 화면";
        const pageTitle = state.isInsert ? "회원정보 등록" : "회원정보 수정";
        const heroId = hasDevId ? state.devId : "저장 후 생성";

        syncLegacyContext();
        $("#hr011v2ModeBadge").text(modeText);
        $("#hr011v2PageTitle").text(pageTitle);
        $("#hr011v2HeroDevId").text(heroId);
        $("#hr011v2PreviewTitle").text(state.isInsert ? "등록 참고 정보" : "수정 참고 정보");
        $("#hr011v2PreviewSub").text("수정 가능한 값은 아래 입력 폼에서만 변경할 수 있습니다.");
        $("#hr011v2DevTyp").prop("disabled", !state.isInsert);
        $("#hr011v2LegacyBtn").text(state.isInsert ? "기존 등록 화면" : "기존 상세 화면");
        $("#hr011v2SaveBtn").text(state.isInsert ? "등록" : "저장");
        $("#hr011v2ProjectAddBtn, #hr011v2ProjectDeleteBtn").prop("disabled", !hasDevId);
    }

    function syncPageState() {
        const scoreText = state.score && state.score.rank ? `${state.score.rank} (${state.score.score || 0}점)` : "미산정";
        const completion = syncCompletionStatus();

        $("#hr011v2CompletionHero").text(`${completion}%`);
        $("#hr011v2HeroScore").text(scoreText);
        syncReadonlySummary();
    }

    function syncCompletionStatus() {
        const profileSelectors = [
            "#hr011v2DevNm",
            "#hr011v2DevTyp",
            "#hr011v2Brdt",
            "#hr011v2Tel",
            "#hr011v2Email",
            "#hr011v2Sido"
        ];
        const workSelectors = [
            "#hr011v2AvailDt",
            "#hr011v2WorkMd",
            "#hr011v2CtrtTyp",
            "#hr011v2Kosa",
            "#hr011v2MainFld",
            "#hr011v2MainCust",
            "#hr011v2EduLast",
            "#hr011v2HopeRateAmt"
        ];
        const contractSelectors = [
            "#hr011v2OrgNm",
            "#hr011v2BizTyp",
            "#hr011v2StDt",
            "#hr011v2EdDt",
            "#hr011v2Amt"
        ];

        const profileCount = countFilled(profileSelectors);
        const workCount = countFilled(workSelectors);

        $("#hr011v2StatusProfile").text(`${profileCount} / ${profileSelectors.length}`);
        $("#hr011v2StatusWork").text(`${workCount} / ${workSelectors.length}`);

        if (!hasContractInput()) {
            $("#hr011v2StatusContract").text("선택 입력");
        } else {
            const contractCount = countFilled(contractSelectors);
            $("#hr011v2StatusContract").text(`${contractCount} / ${contractSelectors.length}`);
        }

        syncLegacySectionStatus();

        const totalFilled = profileCount + workCount;
        const totalBase = profileSelectors.length + workSelectors.length;
        return Math.round((totalFilled / totalBase) * 100);
    }

    function initLegacySections() {
        syncLegacyContext();

        if (typeof window.initTab3 === "function") {
            window.initTab3();
        }

        if (typeof window.initTab4 === "function") {
            window.initTab4();
        }

        $("#hr011v2ProjectEvalBoard .hr014-shell").addClass("hr011v2-dual-pane");

        bindProjectWorkspace();
        ensureProjectWorkspaceObservers();
        if (typeof window.loadHr013TableData === "function") {
            window.loadHr013TableData();
        }
        scheduleProjectWorkspaceSync();
        syncLegacySectionStatus();
    }

    function syncLegacyContext() {
        window.currentDevId = state.devId || "";
        window.currentMode = state.isInsert ? "insert" : "update";
        window.hr010ReadOnly = false;
        window.changedTabs = window.changedTabs || { tab1: false, tab2: false, tab3: false, tab4: false };
        $("#dev_id").val(state.devId || "");
        $(document).trigger("tab:readonly", [false]);
    }

    async function saveLegacySections() {
        syncLegacyContext();

        if (typeof window.saveHr013TableData === "function") {
            await window.saveHr013TableData();
        }

        if (typeof window.saveTab4All === "function") {
            await window.saveTab4All();
        }
    }

    function syncLegacySectionStatus() {
        const entries = getProjectEntries();
        const projectCount = entries.length;
        const activeEntry = getActiveProjectEntry();
        const isSaved = !!(activeEntry && activeEntry.data && activeEntry.data.dev_prj_id);
        const evalReady = !!(isSaved && isInternalProject(activeEntry.data));
        const statusLabel = !isSaved
            ? "선택 대기"
            : evalReady
                ? "평가 가능"
                : "리스크";

        const statusText = projectCount
            ? `${projectCount || 0}건 · ${statusLabel}`
            : "0건 · 선택 대기";

        $("#hr011v2StatusProjectWorkspace").text(statusText);
        syncReadonlySummary();
    }

    function syncReadonlySummary() {
        const projectStats = getProjectSummaryStats();

        $("#hr011v2PreviewProjectTotal").text(`${projectStats.total}건`);
        $("#hr011v2PreviewProjectInternal").text(`${projectStats.internal}건`);
        $("#hr011v2PreviewProjectExternal").text(`${projectStats.external}건`);
        $("#hr011v2PreviewProjectEval").text(`${projectStats.evaluable}건`);
    }

    function getProjectSummaryStats() {
        const entries = getProjectEntries();

        return entries.reduce(function (acc, entry) {
            const data = entry && entry.data ? entry.data : {};
            acc.total += 1;

            if (isInternalProject(data)) {
                acc.internal += 1;
                if (data.dev_prj_id) {
                    acc.evaluable += 1;
                }
            } else {
                acc.external += 1;
            }

            return acc;
        }, {
            total: 0,
            internal: 0,
            external: 0,
            evaluable: 0
        });
    }

    function renderMainLangPills(labels) {
        const $wrap = $("#hr011v2MainLangPills");
        $wrap.empty();

        if (!labels || !labels.length) {
            $wrap.append('<span class="hr011v2-empty-pill">기존 스킬 정보와 연동됩니다.</span>');
            return;
        }

        labels.forEach(function (label) {
            $wrap.append(`<span class="hr011v2-pill">${escapeHtml(label)}</span>`);
        });
    }

    function renderPhotoPreview(imageUrl, name) {
        const $preview = $("#hr011v2PhotoPreview");
        if (imageUrl) {
            $preview.html(`<img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(name || "프로필 이미지")}">`);
            return;
        }

        const text = getBadgeText(name || "신규");
        $preview.html(`<div class="hr011v2-photo-fallback">${escapeHtml(text)}</div>`);
    }

    function loadSelect(selectId, grpCd, targetMap, placeholder) {
        return new Promise(function (resolve) {
            setComCode(selectId, grpCd, "", "cd", "cd_nm", function (items) {
                const $select = $("#" + selectId);
                if (!$select.find("option[value='']").length) {
                    $select.prepend(`<option value="">${placeholder}</option>`);
                }

                $select.val("");
                (items || []).forEach(function (item) {
                    if (item && item.cd) {
                        targetMap[item.cd] = item.cd_nm || item.cd;
                    }
                });
                resolve();
            });
        });
    }

    function countFilled(selectors) {
        let count = 0;
        selectors.forEach(function (selector) {
            if (getFieldValue(selector)) {
                count += 1;
            }
        });
        return count;
    }

    function hasContractInput() {
        return [
            "#hr011v2OrgNm",
            "#hr011v2BizTyp",
            "#hr011v2StDt",
            "#hr011v2EdDt",
            "#hr011v2Amt",
            "#hr011v2Remark"
        ].some(function (selector) {
            const value = getFieldValue(selector);
            return !!value;
        });
    }

    function getFieldValue(selector) {
        return $.trim($(selector).val() || "");
    }

    function resolveDevTypeValue(row) {
        if (String(row && row.dev_id || "").startsWith("HCNC_F")) {
            return "HCNC_F";
        }
        if (String(row && row.dev_id || "").startsWith("HCNC_S")) {
            return "HCNC_S";
        }
        return "";
    }

    function setCareerFields(value) {
        if (!value) {
            $("#hr011v2ExpYear").val(0);
            $("#hr011v2ExpMonth").val(0);
            return;
        }

        const num = Number(value);
        if (!Number.isFinite(num)) {
            $("#hr011v2ExpYear").val(0);
            $("#hr011v2ExpMonth").val(0);
            return;
        }

        const years = Math.floor(num);
        const months = Math.round((num - years) * 12);
        $("#hr011v2ExpYear").val(clampNumber(years, 0, 99));
        $("#hr011v2ExpMonth").val(clampNumber(months, 0, 12));
    }

    function composeCareerValue() {
        const years = Number(clampNumber(getFieldValue("#hr011v2ExpYear"), 0, 99));
        const months = Number(clampNumber(getFieldValue("#hr011v2ExpMonth"), 0, 12));

        if (!months) {
            return String(years);
        }
        return `${years}.${months}`;
    }

    function normalizeAmountValue(value) {
        if (!value) {
            return "0.00";
        }

        const num = Number(String(value).replace(/[^0-9.]/g, ""));
        if (!Number.isFinite(num)) {
            return "0.00";
        }

        const clamped = Math.min(num, 999999999999.99);
        return clamped.toFixed(2);
    }

    function formatCurrencyInput(value) {
        const raw = String(value == null ? "" : value).replace(/[^0-9.]/g, "");
        if (!raw) {
            return "";
        }

        const number = Number(raw);
        if (!Number.isFinite(number)) {
            return "";
        }

        return `${Math.round(number).toLocaleString("ko-KR")}원`;
    }

    function formatPhoneNumber(value) {
        const digits = String(value || "").replace(/[^0-9]/g, "");
        if (digits.length < 4) {
            return digits;
        }
        if (digits.length < 8) {
            return digits.replace(/(\d{3})(\d+)/, "$1-$2");
        }
        return digits.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3");
    }

    function clampNumber(value, min, max) {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return min;
        }
        return Math.max(min, Math.min(max, num));
    }

    function isValidEmail(value) {
        return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
    }

    function splitLabels(value) {
        return String(value || "")
            .split(",")
            .map(function (item) { return $.trim(item); })
            .filter(Boolean);
    }

    function getMainLangSummary() {
        const labels = $("#hr011v2MainLangPills .hr011v2-pill").map(function () {
            return $.trim($(this).text());
        }).get().filter(Boolean);
        if (labels.length) {
            return labels.slice(0, 2).join(", ");
        }

        return "미등록";
    }

    function formatContractPeriod(stDt, edDt) {
        if (!stDt && !edDt) {
            return "미설정";
        }
        if (!stDt || !edDt) {
            return stDt || edDt;
        }
        return `${stDt} ~ ${edDt}`;
    }

    function updateUrl(devId) {
        const nextUrl = `/hr011v2?dev_id=${encodeURIComponent(devId)}`;
        window.history.replaceState({}, "", nextUrl);
    }

    function getBadgeText(name) {
        const source = String(name || "").trim();
        if (!source) {
            return "신규";
        }
        return source.length >= 2 ? source.slice(-2) : source;
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }
})(jQuery);
