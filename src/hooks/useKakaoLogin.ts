import { useEffect, useRef } from 'react';

const KAKAO_KEY = import.meta.env.VITE_KAKAO_API_KEY;

export interface KakaoUserInfo {
    nickname: string;
    email: string;
    phone: string;
}

export const useKakaoLogin = () => {
    const isInitialized = useRef(false);

    useEffect(() => {
        const initKakao = () => {
            if (window.Kakao && !window.Kakao.isInitialized()) {
                window.Kakao.init(KAKAO_KEY);
                isInitialized.current = true;
                console.log('Kakao SDK Initialized');
            } else if (window.Kakao && window.Kakao.isInitialized()) {
                isInitialized.current = true;
            }
        };

        initKakao();

        const timer = setInterval(() => {
            if (window.Kakao) {
                initKakao();
                clearInterval(timer);
            }
        }, 300);

        return () => clearInterval(timer);
    }, []);

    const waitForKakao = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (window.Kakao && window.Kakao.isInitialized()) {
                resolve();
                return;
            }
            let attempts = 0;
            const maxAttempts = 15;
            const interval = setInterval(() => {
                attempts++;
                if (window.Kakao) {
                    if (!window.Kakao.isInitialized()) {
                        window.Kakao.init(KAKAO_KEY);
                    }
                    clearInterval(interval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    reject(new Error('Kakao SDK 로드 실패'));
                }
            }, 200);
        });
    };

    const loginWithKakao = async () => {
        try {
            await waitForKakao();
            window.Kakao.Auth.authorize({
                redirectUri: window.location.origin + '/oauth/callback',
                scope: 'profile_nickname,account_email',
            });
        } catch {
            alert('카카오 SDK를 불러오지 못했습니다. 페이지를 새로고침 해주세요.');
        }
    };

    // Call this after redirect callback to fetch user info
    const fetchKakaoUserInfo = async (code: string): Promise<KakaoUserInfo> => {
        try {
            // Exchange code for token via Kakao REST API
            const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: KAKAO_KEY,
                    redirect_uri: window.location.origin + '/oauth/callback',
                    code: code,
                }),
            });

            const tokenData = await tokenRes.json();
            console.log('Kakao token response:', tokenData);

            if (tokenData.access_token) {
                // Set token in SDK
                window.Kakao.Auth.setAccessToken(tokenData.access_token);

                // Fetch user info
                const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
                    headers: {
                        Authorization: `Bearer ${tokenData.access_token}`,
                    },
                });
                const userData = await userRes.json();
                console.log('Kakao user info:', userData);

                const account = userData.kakao_account || {};
                const profile = account.profile || {};

                return {
                    nickname: profile.nickname || '카카오 사용자',
                    email: account.email || '',
                    phone: '',
                };
            }
        } catch (err) {
            console.error('Kakao user info fetch error:', err);
        }

        return { nickname: '카카오 사용자', email: '', phone: '' };
    };

    return { loginWithKakao, fetchKakaoUserInfo };
};
