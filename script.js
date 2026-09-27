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