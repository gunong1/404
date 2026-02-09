import { useEffect } from 'react';

const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID;
const CALLBACK_URL = import.meta.env.VITE_NAVER_CALLBACK_URL;

export const useNaverLogin = () => {
    useEffect(() => {
        if (!window.naver) {
            console.warn('Naver SDK not loaded');
            return;
        }

        const naverId = 'naverIdLogin'; // SDK defaults to this ID, stick to it to prevent crashes

        if (!document.getElementById(naverId)) {
            const div = document.createElement('div');
            div.id = naverId;
            div.style.display = 'none';
            document.body.appendChild(div);
        }

        try {
            const naverLogin = new window.naver.LoginWithNaverId({
                clientId: NAVER_CLIENT_ID,
                callbackUrl: CALLBACK_URL,
                isPopup: false,
                loginButton: { color: 'green', type: 3, height: 60 },
            });
            naverLogin.init();
        } catch (error) {
            console.error('Naver Login Init Failed:', error);
        }
    }, []);

    const loginWithNaver = () => {
        const naverId = 'naverIdLogin';
        const naverLoginButton = document.getElementById(naverId)?.firstChild as HTMLElement;
        if (naverLoginButton) {
            naverLoginButton.click();
        } else {
            // Retry finding the button if initialization was slightly delayed
            setTimeout(() => {
                const retryBtn = document.getElementById(naverId)?.firstChild as HTMLElement;
                if (retryBtn) {
                    retryBtn.click();
                } else {
                    alert('네이버 로그인 버튼을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
                }
            }, 500);
        }
    };

    return { loginWithNaver };
};
