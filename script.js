const toggleButton = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

// 버튼 클릭 시 테마 전환
toggleButton.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        htmlElement.removeAttribute('data-theme');
        toggleButton.textContent = '🌙 다크모드';
    } else {
        htmlElement.setAttribute('data-theme', 'dark');
        toggleButton.textContent = '☀️ 라이트모드';
    }
});


const searchForm = document.getElementById('search-form');
const nicknameInput = document.getElementById('nickname');
const searchBtn = document.getElementById('search-btn');
const API_KEY = 'test_7c77f9a58ed9b5983de3f7c0416107c8ee337931376f5e766e7a1b817331e542efe8d04e6d233bd35cf2fabdeb93fb0d';

searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nickname = nicknameInput.value.trim();

    if (!nickname) {
        alert('⚠️ 닉네임을 입력해주세요.');
        return;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = '조회 중...';

    try {
        const url = 'https://open.api.nexon.com/maplestory/v1/id?character_name=' + encodeURIComponent(nickname);

        const response = await fetch(url, {
            headers: {
                'x-nxopen-api-key': API_KEY
            }
        });

        const data = await response.json();

        if (response.ok && data.ocid) {
            // 캐릭터가 존재할 때 alert 창
            alert(`✅ '${nickname}' 캐릭터가 존재합니다! (OCID 확인 완료)`);
        } else {
            // 캐릭터가 없거나 에러 발생 시 alert 창
            const errorCode = data.error?.name || '';

            if (response.status === 400 || response.status === 404) {
                alert(`❌ 존재하지 않거나 정보를 찾을 수 없는 닉네임입니다.`);
            } else if (response.status === 403 || errorCode === 'OPENAPI00005') {
                alert(`⚠️ API 인증 오류가 발생했습니다. 관리자에게 문의하세요.`);
            } else if (response.status === 429) {
                alert(`⏳ 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.`);
            } else {
                alert(`⚠️ 조회에 실패했습니다. (에러 코드: ${response.status})`);
            }
        }
    } catch (error) {
        alert('🚨 네트워크 연결에 실패했습니다.');
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = '캐릭터 등록';
    }
});