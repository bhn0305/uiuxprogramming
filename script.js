document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initSpaNavigation();
    renderFavorites(); // 저장된 즐겨찾기 목록 불러오기
    renderCustomTasks(); // 나만의 숙제 목록 불러오기
});

// ==========================================
//  다크모드 / 라이트모드 토글 기능
// ==========================================
function initThemeToggle() {
    const toggleButton = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    if (!toggleButton) return;

    const currentTheme = htmlElement.getAttribute('data-theme');
    toggleButton.textContent = currentTheme === 'dark' ? '☀️ Light' : '🌙 Dark';

    toggleButton.addEventListener('click', () => {
        const isDarkMode = htmlElement.getAttribute('data-theme') === 'dark';

        if (isDarkMode) {
            htmlElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            toggleButton.textContent = '🌙 Dark';
        } else {
            htmlElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            toggleButton.textContent = '☀️ Light';
        }
    });
}

// ==========================================
//  SPA 네비게이션 (새로고침 시 현재 탭 유지 기능 포함)
// ==========================================
function initSpaNavigation() {
    const navButtons = document.querySelectorAll('.spa-nav-btn');
    if (navButtons.length === 0) return;

    // 저장된 활성 섹션 불러오기 (기본값: section-register)
    const savedSection = localStorage.getItem('maple_active_section') || 'section-register';
    switchSection(savedSection);

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            switchSection(targetId);
            // 클릭한 섹션 ID를 localStorage에 저장하여 새로고침 후에도 유지
            localStorage.setItem('maple_active_section', targetId);
        });
    });
}

// 섹션 전환 공통 함수
function switchSection(targetId) {
    const navButtons = document.querySelectorAll('.spa-nav-btn');
    const sections = document.querySelectorAll('.spa-section');

    navButtons.forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`.spa-nav-btn[data-target="${targetId}"]`).forEach(b => {
        b.classList.add('active');
    });

    sections.forEach(sec => {
        sec.style.display = 'none';
    });

    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // 사용자가 다시 '캐릭터 조회' 섹션(section-register)으로 돌아왔을 때,
    // 만약 조회된 캐릭터가 있다면 커스텀 숙제 목록을 자동으로 최신화(실시간 반영)
    if (targetId === 'section-register') {
        const currentName = charName ? charName.textContent.trim() : '';
        if (currentName && currentName !== '닉네임' && charCard.style.display === 'flex') {
            renderCustomTasksForCharacter(currentName);
        }
    }
}

// ==========================================
//  닉네임 입력 유효성 검사
// ==========================================
const nicknameInput = document.getElementById('nickname');
const statusMessage = document.getElementById('status-message');
const searchBtn = document.getElementById('search-btn');

if (nicknameInput) {
    nicknameInput.addEventListener('input', (e) => {
        const val = e.target.value;

        const isolatedJamoRegex = /[ㄱ-ㅎㅏ-ㅣ]/;
        if (isolatedJamoRegex.test(val)) {
            statusMessage.textContent = '❌ 단독 자음이나 모음은 닉네임으로 사용할 수 없습니다.';
            statusMessage.style.color = '#e63946';
            return;
        }

        const specialCharRegex = /[^가-힣a-zA-Z0-9]/;
        if (specialCharRegex.test(val)) {
            statusMessage.textContent = '❌ 특수문자는 닉네임에 사용할 수 없습니다.';
            statusMessage.style.color = '#e63946';
            return;
        }

        const hasKorean = /[가-힣]/.test(val);
        const maxLength = hasKorean ? 8 : 16;

        if (val.length > maxLength) {
            e.target.value = val.slice(0, maxLength);
            statusMessage.textContent = `❌ ${hasKorean ? '한글은 최대 8자' : '영문/숫자는 최대 16자'}까지 입력할 수 있습니다.`;
            statusMessage.style.color = '#e63946';
            return;
        }

        const trimmedVal = val.trim();
        if (trimmedVal.length > 0) {
            statusMessage.textContent = `💡 '${trimmedVal}' 입력 중... 조회 버튼을 눌러주세요.`;
            statusMessage.style.color = 'var(--primary-color)';
        } else {
            statusMessage.textContent = '닉네임을 입력하고 조회 버튼을 누르세요.';
            statusMessage.style.color = 'var(--text-sub)';
        }
    });
}

// ==========================================
//  캐릭터 조회 및 API 정보 연동
// ==========================================
let cachedSchedulerData = null;
const completedFilterCheckbox = document.getElementById('completed-filter-checkbox');
const filterLabel = document.getElementById('filter-label');

if (completedFilterCheckbox) {
    completedFilterCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            filterLabel.style.color = "var(--primary-color)";
            filterLabel.style.fontWeight = "bold";
        } else {
            filterLabel.style.color = "var(--text-sub)";
            filterLabel.style.fontWeight = "normal";
        }
        if (cachedSchedulerData) {
            renderAllTasks(cachedSchedulerData, isChecked);
        }
    });
}

const searchForm = document.getElementById('search-form');
const charCard = document.getElementById('character-card');
const charImg = document.getElementById('char-image');
const charName = document.getElementById('char-name');
const charLevel = document.getElementById('char-level');
const charClass = document.getElementById('char-class');

if (searchForm) {
    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const nickname = nicknameInput.value.trim();
        if (!nickname) return;

        cachedSchedulerData = null;
        const dailyListContainer = document.getElementById('daily-quest-list');
        const weeklyContentsListContainer = document.getElementById('weekly-contents-list');
        const weeklyBossListContainer = document.getElementById('weekly-boss-list');
        if (dailyListContainer) dailyListContainer.innerHTML = '';
        if (weeklyContentsListContainer) weeklyContentsListContainer.innerHTML = '';
        if (weeklyBossListContainer) weeklyBossListContainer.innerHTML = '';

        searchBtn.disabled = true;
        searchBtn.textContent = '조회 중...';
        statusMessage.textContent = `⏳ '${nickname}' 캐릭터 정보와 스케줄러를 조회하는 중입니다...`;

        try {
            const response = await fetch(`https://mapletodo.onrender.com/api/character?nickname=${nickname}`);
            const data = await response.json();

            if (response.ok) {
                statusMessage.textContent = `🎉 '${nickname}' 캐릭터 조회 및 스케줄러 연동 완료!`;
                const basicData = data.basic;
                const schedulerData = data.scheduler;

                charImg.src = basicData.character_image || '';
                charName.textContent = basicData.character_name;
                charLevel.textContent = `Lv.${basicData.character_level}`;
                charClass.textContent = basicData.character_class;

                updateFavoriteButtonState(basicData.character_name);

                if (schedulerData) {
                    cachedSchedulerData = schedulerData;
                    const onlyRegistered = completedFilterCheckbox ? completedFilterCheckbox.checked : true;
                    renderAllTasks(schedulerData, onlyRegistered);
                }

                // 커스텀 숙제 목록
                renderCustomTasksForCharacter(basicData.character_name);

                charCard.style.display = 'flex';
            } else {
                let errorMsg = data.error || '존재하지 않거나 정보를 찾을 수 없는 닉네임입니다.';
                statusMessage.textContent = `❌ 조회 실패: ${errorMsg}`;
                charCard.style.display = 'none';
            }
        } catch (error) {
            statusMessage.textContent = '🚨 서버 연결 오류가 발생했습니다.';
            console.error(error);
            charCard.style.display = 'none';
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = '조회';
        }
    });
}

function renderAllTasks(schedulerData, onlyRegistered) {
    const dailyListContainer = document.getElementById('daily-quest-list');
    if (dailyListContainer && schedulerData.daily_contents) {
        dailyListContainer.innerHTML = '';
        schedulerData.daily_contents.forEach(item => {
            if (onlyRegistered && item.registration_flag !== 'true') return;
            const chip = document.createElement('div');
            let isCompleted = item.type === 'quest' ? item.quest_state === '2' : item.now_count >= item.max_count && item.max_count > 0;
            chip.className = `task-chip ${isCompleted ? 'completed' : ''}`;
            let displayText = item.content_name;
            if (item.content_name === '몬스터파크') displayText = `몬스터파크 (${item.now_count}/${item.max_count})`;
            chip.innerHTML = `<span>${displayText}</span>`;
            dailyListContainer.appendChild(chip);
        });
    }

    const weeklyContentsListContainer = document.getElementById('weekly-contents-list');
    if (weeklyContentsListContainer && schedulerData.weekly_contents) {
        weeklyContentsListContainer.innerHTML = '';
        schedulerData.weekly_contents.forEach(content => {
            if (onlyRegistered && content.registration_flag !== 'true') return;
            const chip = document.createElement('div');
            let isCompleted = content.now_count > 0;
            let displayText = content.content_name;
            if (!content.content_name.includes('에픽 던전') && content.max_count > 0) {
                displayText = `${content.content_name} (${content.now_count}/${content.max_count})`;
            }
            chip.className = `task-chip ${isCompleted ? 'completed' : ''}`;
            chip.innerHTML = `<span>${displayText}</span>`;
            weeklyContentsListContainer.appendChild(chip);
        });
    }

    const weeklyBossListContainer = document.getElementById('weekly-boss-list');
    const weeklyBossTitle = document.getElementById('weekly-boss-title');
    if (weeklyBossListContainer && schedulerData.boss_contents) {
        if (weeklyBossTitle && schedulerData.weekly_boss_clear_count !== undefined) {
            weeklyBossTitle.textContent = `주간 보스 (${schedulerData.weekly_boss_clear_count}/${schedulerData.weekly_boss_clear_limit_count})`;
        }
        weeklyBossListContainer.innerHTML = '';
        schedulerData.boss_contents
            .filter(boss => boss.cycle === 'bossWeekly')
            .forEach(boss => {
                if (onlyRegistered && boss.registration_flag !== 'true') return;
                const chip = document.createElement('div');
                const isCompleted = boss.complete_flag === 'true';
                chip.className = `task-chip boss-chip ${isCompleted ? 'completed' : ''}`;
                let badgeClass = 'normal';
                if (boss.difficulty === 'easy') badgeClass = 'easy';
                else if (boss.difficulty === 'normal') badgeClass = 'normal';
                else if (boss.difficulty === 'hard') badgeClass = 'hard';
                else if (boss.difficulty === 'chaos') badgeClass = 'chaos';
                else if (boss.difficulty === 'extreme') badgeClass = 'extreme';
                const badgeText = boss.difficulty.charAt(0).toUpperCase();
                chip.innerHTML = `<span class="badge ${badgeClass}">${badgeText}</span><span>${boss.content_name}</span>`;
                weeklyBossListContainer.appendChild(chip);
            });
    }
}

// ==========================================
//  즐겨찾기 시스템 (localStorage)
// ==========================================
const favoriteCheckbox = document.getElementById('favorite-checkbox');
const favoriteListContainer = document.getElementById('favorite-list');

function getFavorites() {
    const favorites = localStorage.getItem('maple_favorites');
    return favorites ? JSON.parse(favorites) : [];
}

if (favoriteCheckbox) {
    favoriteCheckbox.addEventListener('change', () => {
        const currentNickname = charName.textContent.trim();
        if (!currentNickname || currentNickname === '닉네임') return;
        let favorites = getFavorites();
        const index = favorites.indexOf(currentNickname);
        if (index > -1) {
            favorites.splice(index, 1);
            favoriteCheckbox.checked = false;
        } else {
            favorites.push(currentNickname);
            favoriteCheckbox.checked = true;
        }
        localStorage.setItem('maple_favorites', JSON.stringify(favorites));
        renderFavorites();

        // 커스텀 숙제 영역 실시간 갱신
        renderCustomTasksForCharacter(currentNickname);
    });
}

function renderFavorites() {
    if (!favoriteListContainer) return;
    favoriteListContainer.innerHTML = '';
    const favorites = getFavorites();
    if (favorites.length === 0) {
        const emptySpan = document.createElement('span');
        emptySpan.className = 'favorite-empty-text';
        emptySpan.textContent = '등록된 즐겨찾기가 없습니다.';
        favoriteListContainer.appendChild(emptySpan);
        return;
    }
    favorites.forEach(nickname => {
        const chip = document.createElement('div');
        chip.className = 'favorite-chip';
        chip.innerHTML = `<span>👤 ${nickname}</span>`;
        chip.addEventListener('click', () => {
            nicknameInput.value = nickname;
            searchBtn.click();
        });
        favoriteListContainer.appendChild(chip);
    });
}

function updateFavoriteButtonState(nickname) {
    if (!favoriteCheckbox) return;
    const favorites = getFavorites();
    favoriteCheckbox.checked = favorites.includes(nickname);
}

// ==========================================
//  나만의 숙제 폼 입력 검증 및 실시간 렌더링
// ==========================================
const customTaskForm = document.getElementById('custom-task-form');
const taskNameInput = document.getElementById('task-name');
const nameLenSpan = document.getElementById('name-len');
const nameError = document.getElementById('name-error');

const taskCategorySelect = document.getElementById('task-category');
const conditionalBossBox = document.getElementById('conditional-boss-box');
const bossDifficultySelect = document.getElementById('boss-difficulty');
const bossError = document.getElementById('boss-error');

const taskSubmitBtn = document.getElementById('task-submit-btn');
const formFeedbackMsg = document.getElementById('form-feedback-msg');
const customTaskListContainer = document.getElementById('custom-task-list');

if (taskCategorySelect) {
    taskCategorySelect.addEventListener('change', (e) => {
        const selectedVal = e.target.value;
        if (selectedVal === 'boss') {
            conditionalBossBox.style.display = 'block';
            bossDifficultySelect.disabled = false;
        } else {
            conditionalBossBox.style.display = 'none';
            bossDifficultySelect.disabled = true;
            bossDifficultySelect.value = '';
            bossError.textContent = '';
        }
    });
}

if (taskNameInput) {
    taskNameInput.addEventListener('input', (e) => {
        const val = e.target.value;
        nameLenSpan.textContent = val.length;
        const specialCharRegex = /[^가-힣a-zA-Z0-9\s]/;
        if (specialCharRegex.test(val)) {
            nameError.textContent = '❌ 특수문자는 사용할 수 없습니다.';
            taskNameInput.style.borderColor = '#e63946';
        } else if (val.trim().length > 0 && val.trim().length < 2) {
            nameError.textContent = '⚠️ 숙제 이름은 최소 2글자 이상 입력해주세요.';
            taskNameInput.style.borderColor = '#ffa53b';
        } else {
            nameError.textContent = '';
            taskNameInput.style.borderColor = val.length > 0 ? '#38d9a9' : 'var(--border-color)';
        }
    });
}

if (customTaskForm) {
    customTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskName = taskNameInput.value.trim();
        const category = taskCategorySelect.value;
        const bossDiff = bossDifficultySelect.value;

        const specialCharRegex = /[^가-힣a-zA-Z0-9\s]/;
        if (taskName.length < 2 || specialCharRegex.test(taskName)) {
            formFeedbackMsg.style.color = '#e63946';
            formFeedbackMsg.textContent = '❌ 입력 조건을 충족하지 못한 항목이 있습니다.';
            taskNameInput.focus();
            return;
        }

        if (category === 'boss' && !bossDiff) {
            bossError.textContent = '❌ 주간 보스 난이도를 반드시 선택해주세요.';
            bossDifficultySelect.style.borderColor = '#e63946';
            formFeedbackMsg.style.color = '#e63946';
            formFeedbackMsg.textContent = '❌ 필수 입력 조건을 확인해주세요.';
            return;
        } else {
            bossError.textContent = '';
            bossDifficultySelect.style.borderColor = 'var(--border-color)';
        }

        taskSubmitBtn.disabled = true;
        taskSubmitBtn.textContent = '등록 중...';
        formFeedbackMsg.style.color = 'var(--primary-color)';
        formFeedbackMsg.textContent = '⏳ 데이터를 저장하는 중입니다...';

        setTimeout(() => {
            try {
                const taskAlarmCheckbox = document.getElementById('task-alarm'); // 👈 상단이나 제출 블록 내부에 선언 확인

                const newTask = {
                    name: taskName,
                    category: category,
                    difficulty: bossDiff || null,
                    alarm: taskAlarmCheckbox ? taskAlarmCheckbox.checked : false, // 👈 [핵심] 체크박스 상태값 연동 저장
                    date: new Date().toLocaleDateString()
                };

                const savedCustomTasks = JSON.parse(localStorage.getItem('maple_custom_tasks') || '[]');
                savedCustomTasks.push(newTask);
                localStorage.setItem('maple_custom_tasks', JSON.stringify(savedCustomTasks));

                // 즉시 실시간 화면 렌더링 호출
                renderCustomTasks();

                formFeedbackMsg.style.color = '#0ca678';
                formFeedbackMsg.textContent = `🎉 성공적으로 '${taskName}' 숙제가 등록되었습니다!`;

                customTaskForm.reset();
                if (conditionalBossBox) conditionalBossBox.style.display = 'none';
                nameLenSpan.textContent = '0';
                taskNameInput.style.borderColor = 'var(--border-color)';
            } catch (err) {
                formFeedbackMsg.style.color = '#e63946';
                formFeedbackMsg.textContent = '🚨 저장 중 오류가 발생했습니다.';
            } finally {
                taskSubmitBtn.disabled = false;
                taskSubmitBtn.textContent = '숙제 등록하기';
            }
        }, 400);
    });
}

function renderCustomTasks() {
    if (!customTaskListContainer) return;
    customTaskListContainer.innerHTML = '';

    const savedTasks = JSON.parse(localStorage.getItem('maple_custom_tasks') || '[]');

    if (savedTasks.length === 0) {
        const emptySpan = document.createElement('span');
        emptySpan.className = 'favorite-empty-text';
        emptySpan.textContent = '등록된 나만의 숙제가 없습니다. 위 폼을 통해 등록해 보세요!';
        customTaskListContainer.appendChild(emptySpan);
        return;
    }

    savedTasks.forEach((task, index) => {
        const chip = document.createElement('div');
        chip.className = 'task-chip';

        let badgeHtml = '';
        if (task.category === 'boss' && task.difficulty) {
            let badgeClass = 'normal';
            if (task.difficulty === 'easy') badgeClass = 'easy';
            else if (task.difficulty === 'normal') badgeClass = 'normal';
            else if (task.difficulty === 'hard') badgeClass = 'hard';
            else if (task.difficulty === 'chaos') badgeClass = 'chaos';
            else if (task.difficulty === 'extreme') badgeClass = 'extreme';

            const badgeText = task.difficulty.charAt(0).toUpperCase();
            badgeHtml = `<span class="badge ${badgeClass}">${badgeText}</span>`;
        }

        const categoryLabel = task.category === 'daily' ? '일일' : task.category === 'weekly' ? '주간' : '보스';

        chip.innerHTML = `
            ${badgeHtml}
            <span>[${categoryLabel}] ${task.name}</span>
            <button type="button" class="delete-task-btn" data-index="${index}" style="background:none; border:none; color:#e63946; cursor:pointer; margin-left:6px; font-weight:bold;">×</button>
        `;

        const deleteBtn = chip.querySelector('.delete-task-btn');
        deleteBtn.addEventListener('click', () => {
            savedTasks.splice(index, 1);
            localStorage.setItem('maple_custom_tasks', JSON.stringify(savedTasks));
            renderCustomTasks();
        });

        customTaskListContainer.appendChild(chip);
    });
}



// ==========================================
//  캐릭터 조회 시 커스텀 숙제 렌더링 및 완료/미완료 토글
// ==========================================
const customFilterCheckbox = document.getElementById('custom-filter-checkbox');
const customFilterLabel = document.getElementById('custom-filter-label');

if (customFilterCheckbox) {
    customFilterCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        customFilterLabel.style.color = isChecked ? "var(--primary-color)" : "var(--text-sub)";

        // 현재 조회된 캐릭터가 있다면 화면 갱신
        const currentName = charName.textContent.trim();
        if (currentName && currentName !== '닉네임') {
            renderCustomTasksForCharacter(currentName);
        }
    });
}


// ==========================================
//  즐겨찾기된 캐릭터 전용 커스텀 숙제 렌더링
// ==========================================
function renderCustomTasksForCharacter(characterName) {
    const container = document.getElementById('char-custom-task-list');
    const customTaskGroupWrapper = container ? container.closest('.task-group') : null;
    if (!container || !customTaskGroupWrapper) return;

    // 현재 조회 중인 캐릭터가 즐겨찾기(maple_favorites)에 등록되어 있는지 확인
    const favorites = getFavorites();
    const isFavorite = favorites.includes(characterName);

    // 즐겨찾기가 안 된 캐릭터라면 커스텀 숙제 영역(그룹 전체)을 숨김 처리
    if (!isFavorite) {
        customTaskGroupWrapper.style.display = 'none';
        return;
    }

    customTaskGroupWrapper.style.display = 'block';
    container.innerHTML = '';

    // 보기 체크박스가 꺼져있으면 렌더링 안 함
    if (customFilterCheckbox && !customFilterCheckbox.checked) return;

    // 저장된 커스텀 숙제 불러오기
    const savedTasks = JSON.parse(localStorage.getItem('maple_custom_tasks') || '[]');
    // 캐릭터별 완료 상태 저장소
    const completionMap = JSON.parse(localStorage.getItem(`maple_task_status_${characterName}`) || '{}');

    if (savedTasks.length === 0) {
        container.innerHTML = `<span class="favorite-empty-text">등록된 커스텀 숙제가 없습니다. '숙제 등록' 탭에서 추가해 보세요!</span>`;
        return;
    }

    savedTasks.forEach((task, index) => {
        const chip = document.createElement('div');

        // 완료 여부 확인
        const isCompleted = completionMap[index] || false;

        chip.className = `task-chip ${isCompleted ? 'completed' : ''}`;
        chip.style.cursor = 'pointer';

        let badgeHtml = '';
        if (task.category === 'boss' && task.difficulty) {
            let badgeClass = 'normal';
            if (task.difficulty === 'easy') badgeClass = 'easy';
            else if (task.difficulty === 'normal') badgeClass = 'normal';
            else if (task.difficulty === 'hard') badgeClass = 'hard';
            else if (task.difficulty === 'chaos') badgeClass = 'chaos';
            else if (task.difficulty === 'extreme') badgeClass = 'extreme';

            const badgeText = task.difficulty.charAt(0).toUpperCase();
            badgeHtml = `<span class="badge ${badgeClass}">${badgeText}</span>`;
        }

        const categoryLabel = task.category === 'daily' ? '일일' : task.category === 'weekly' ? '주간' : '보스';

        chip.innerHTML = `
            ${badgeHtml}
            <span>[${categoryLabel}] ${task.name}</span>
            <span style="font-size: 0.75rem; margin-left: 4px; color: ${isCompleted ? '#0ca678' : 'var(--text-sub)'};">
                ${isCompleted ? '✓ 완료' : '미완료'}
            </span>
        `;

        // 해당 캐릭터의 완료/미완료 상태 토글
        chip.addEventListener('click', () => {
            const currentStatus = completionMap[index] || false;
            completionMap[index] = !currentStatus;

            localStorage.setItem(`maple_task_status_${characterName}`, JSON.stringify(completionMap));
            renderCustomTasksForCharacter(characterName);
        });

        container.appendChild(chip);
    });
}

// ==========================================
//  접속 시 숙제 알림 팝업 및 기간 체크 시스템
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    checkAndShowAlarmModal(); // 접속 시 알림 모달 검사 실행
});

function checkAndShowAlarmModal() {
    const modal = document.getElementById('custom-alarm-modal');
    if (!modal) return;

    // 숨김 처리 기한 체크 (localStorage에 저장된 만료 시간 확인)
    const hideUntil = localStorage.getItem('maple_alarm_hide_until');
    if (hideUntil) {
        const nowTime = new Date().getTime();
        if (nowTime < parseInt(hideUntil, 10)) {
            return; // 아직 숨김 기한이 남았으므로 팝업을 띄우지 않음
        } else {
            localStorage.removeItem('maple_alarm_hide_until'); // 기한 만료 시 저장소 정리
        }
    }

    // 저장된 커스텀 숙제 중 '알림 받기(taskAlarm === true)'가 체크된 항목 필터링
    const savedTasks = JSON.parse(localStorage.getItem('maple_custom_tasks') || '[]');
    const alarmTasks = savedTasks.filter(task => task.alarm === true);

    if (alarmTasks.length === 0) return; // 알림 대상이 없으면 팝업 안 뜸

    const modalTaskList = document.getElementById('modal-task-list');
    modalTaskList.innerHTML = '';
    alarmTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'modal-task-item';
        const categoryLabel = task.category === 'daily' ? '일일' : task.category === 'weekly' ? '주간' : '보스';
        item.textContent = `📌 [${categoryLabel}] ${task.name}`;
        modalTaskList.appendChild(item);
    });

    modal.style.display = 'flex';

    const closeBtn = document.getElementById('modal-close-btn');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const hideTodayCheckbox = document.getElementById('alarm-hide-option');
    const hideWeekCheckbox = document.getElementById('alarm-hide-option-week');

    hideTodayCheckbox.addEventListener('change', () => {
        if (hideTodayCheckbox.checked) hideWeekCheckbox.checked = false;
    });
    hideWeekCheckbox.addEventListener('change', () => {
        if (hideWeekCheckbox.checked) hideTodayCheckbox.checked = false;
    });

    const closeModalHandler = () => {
        const now = new Date().getTime();
        if (hideTodayCheckbox.checked) {
            // 하루
            const expireTime = now + (24 * 60 * 60 * 1000);
            localStorage.setItem('maple_alarm_hide_until', expireTime);
        } else if (hideWeekCheckbox.checked) {
            // 일주일
            const expireTime = now + (7 * 24 * 60 * 60 * 1000);
            localStorage.setItem('maple_alarm_hide_until', expireTime);
        }
        modal.style.display = 'none';
    };

    closeBtn.onclick = closeModalHandler;
    confirmBtn.onclick = closeModalHandler;
}

// ==========================================
//  알림 숨김 기간 테스트용 초기화 기능 
// ==========================================
const resetAlarmTimerBtn = document.getElementById('reset-alarm-timer-btn');

if (resetAlarmTimerBtn) {
    resetAlarmTimerBtn.onclick = () => {
        localStorage.removeItem('maple_alarm_hide_until');
        
        const savedTasks = JSON.parse(localStorage.getItem('maple_custom_tasks') || '[]');
        console.log('현재 저장된 커스텀 숙제 목록:', savedTasks);
        
        const alarmTasks = savedTasks.filter(task => task.alarm === true);
        console.log('알림이 켜진 숙제 개수:', alarmTasks.length);

        if (alarmTasks.length === 0) {
            alert('⚠️ 알림 팝업에 띄울 숙제가 없습니다!\n' +
                  '👉 [숙제 등록] 탭에서 "접속 시 숙제 알림 팝업 받기" 체크박스를 켠 후 숙제를 새로 등록해 주세요.');
            return;
        }

        alert('✨ 알림 숨김 기한이 초기화되었습니다! 모달 창을 띄웁니다.');
        
        if (typeof checkAndShowAlarmModal === 'function') {
            checkAndShowAlarmModal();
        } else {
            const modal = document.getElementById('custom-alarm-modal');
            if (modal) modal.style.display = 'flex';
        }
    };
} else {
    console.warn('⚠️ reset-alarm-timer-btn 버튼을 HTML에서 찾지 못했습니다.');
}