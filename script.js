document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initSpaNavigation();
    renderFavorites(); // 저장된 즐겨찾기 목록 불러오기
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
//  SPA 네비게이션
// ==========================================
function initSpaNavigation() {
    const navButtons = document.querySelectorAll('.spa-nav-btn');
    const sections = document.querySelectorAll('.spa-section');

    if (navButtons.length === 0) return;

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');

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
        });
    });
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

        // 단독 자음/모음 입력 검사
        const isolatedJamoRegex = /[ㄱ-ㅎㅏ-ㅣ]/;
        if (isolatedJamoRegex.test(val)) {
            statusMessage.textContent = '❌ 단독 자음이나 모음은 닉네임으로 사용할 수 없습니다.';
            statusMessage.style.color = '#e63946';
            return;
        }

        // 특수문자 입력 검사
        const specialCharRegex = /[^가-힣a-zA-Z0-9]/;
        if (specialCharRegex.test(val)) {
            statusMessage.textContent = '❌ 특수문자는 닉네임에 사용할 수 없습니다.';
            statusMessage.style.color = '#e63946';
            return;
        }

        // 글자수 제한 (한글 8자, 영문/숫자 16자)
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
let cachedSchedulerData = null; // 필터 토글용 스케줄러 데이터 캐시

const completedFilterCheckbox = document.getElementById('completed-filter-checkbox');
const filterLabel = document.getElementById('filter-label');

// 등록된 항목만 보기 필터 체크박스 토글
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

        // 기존 렌더링 리스트 초기화
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
            // 배포용 서버 주소 사용 시
            const response = await fetch(`https://mapletodo.onrender.com/api/character?nickname=${nickname}`);

            // 로컬 테스트용 서버 주소 사용 시
            // const response = await fetch(`http://localhost:3000/api/character?nickname=${nickname}`);
            const data = await response.json();

            if (response.ok) {
                statusMessage.textContent = `🎉 '${nickname}' 캐릭터 조회 및 스케줄러 연동 완료!`;

                const basicData = data.basic;
                const schedulerData = data.scheduler;

                charImg.src = basicData.character_image || '';
                charName.textContent = basicData.character_name;
                charLevel.textContent = `Lv.${basicData.character_level}`;
                charClass.textContent = basicData.character_class;

                // 즐겨찾기 상태 반영
                updateFavoriteButtonState(basicData.character_name);

                if (schedulerData) {
                    cachedSchedulerData = schedulerData;
                    const onlyRegistered = completedFilterCheckbox ? completedFilterCheckbox.checked : true;
                    renderAllTasks(schedulerData, onlyRegistered);
                }

                charCard.style.display = 'flex';
            } else {
                let errorMsg = data.error || '존재하지 않거나 정보를 찾을 수 없는 닉네임입니다.';
                statusMessage.textContent = `❌ 조회 실패: ${errorMsg}`;
                charCard.style.display = 'none';
            }
        } catch (error) {
            statusMessage.textContent = '🚨 서버 연결 오류가 발생했습니다. (백엔드 서버가 켜져있는지 확인해주세요)';
            console.error(error);
            charCard.style.display = 'none';
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = '조회';
        }
    });
}

// ==========================================
//  숙제 항목 UI 렌더링 함수
// ==========================================
function renderAllTasks(schedulerData, onlyRegistered) {
    // 일일 퀘스트/콘텐츠 렌더링
    const dailyListContainer = document.getElementById('daily-quest-list');
    if (dailyListContainer && schedulerData.daily_contents) {
        dailyListContainer.innerHTML = '';

        schedulerData.daily_contents.forEach(item => {
            if (onlyRegistered && item.registration_flag !== 'true') return;

            const chip = document.createElement('div');
            let isCompleted = false;
            if (item.type === 'quest') {
                isCompleted = item.quest_state === '2';
            } else if (item.type === 'contents') {
                isCompleted = item.now_count >= item.max_count && item.max_count > 0;
            }

            chip.className = `task-chip ${isCompleted ? 'completed' : ''}`;
            let displayText = item.content_name;
            if (item.content_name === '몬스터파크') {
                displayText = `몬스터파크 (${item.now_count}/${item.max_count})`;
            }

            chip.innerHTML = `<span>${displayText}</span>`;
            dailyListContainer.appendChild(chip);
        });
    }

    // 주간 콘텐츠 렌더링
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

    // 주간 보스 렌더링
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

                chip.innerHTML = `
                    <span class="badge ${badgeClass}">${badgeText}</span>
                    <span>${boss.content_name}</span>
                `;
                weeklyBossListContainer.appendChild(chip);
            });
    }
}

// ==========================================
//  즐겨찾기 시스템 (localStorage)
// ==========================================
const favoriteCheckbox = document.getElementById('favorite-checkbox');
const favoriteListContainer = document.getElementById('favorite-list');

// 즐겨찾기 목록 불러오기
function getFavorites() {
    const favorites = localStorage.getItem('maple_favorites');
    return favorites ? JSON.parse(favorites) : [];
}

// 즐겨찾기 상태 변경 이벤트 handling
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
    });
}

// 화면에 즐겨찾기 칩 목록 출력
function renderFavorites() {
    if (!favoriteListContainer) return;
    favoriteListContainer.innerHTML = '';

    const favorites = getFavorites();

    if (favorites.length === 0) {
        const emptySpan = document.createElement('span');
        emptySpan.className = 'favorite-empty-text';
        emptySpan.textContent = '등록된 즐겨찾기가 없습니다. 캐릭터 조회 후 별표를 눌러보세요!';
        favoriteListContainer.appendChild(emptySpan);
        return;
    }

    favorites.forEach(nickname => {
        const chip = document.createElement('div');
        chip.className = 'favorite-chip';
        chip.innerHTML = `<span>👤 ${nickname}</span>`;

        // 즐겨찾기 칩 클릭 시 해당 캐릭터 즉시 조회
        chip.addEventListener('click', () => {
            nicknameInput.value = nickname;
            searchBtn.click();
        });

        favoriteListContainer.appendChild(chip);
    });
}

// 현재 캐릭터의 즐겨찾기 여부에 따른 체크박스 상태 갱신
function updateFavoriteButtonState(nickname) {
    if (!favoriteCheckbox) return;
    const favorites = getFavorites();
    favoriteCheckbox.checked = favorites.includes(nickname);
}