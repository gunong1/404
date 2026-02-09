import React from 'react';
import { useKakaoLogin } from '../hooks/useKakaoLogin';
import { useNaverLogin } from '../hooks/useNaverLogin';

const SocialLoginButtons: React.FC = () => {
    const { loginWithKakao } = useKakaoLogin();
    const { loginWithNaver } = useNaverLogin();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <button
                onClick={loginWithKakao}
                style={{
                    backgroundColor: '#FEE500',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '15px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                }}
            >
                <img
                    src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_small.png"
                    alt="Kakao"
                    style={{ width: '20px', height: '20px' }}
                />
                카카오로 시작하기
            </button>

            <button
                id="naverCustomBtn"
                onClick={loginWithNaver}
                style={{
                    backgroundColor: '#03C75A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '15px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                }}
            >
                <img
                    src="https://static.nid.naver.com/oauth/button_g.PNG"
                    alt="Naver"
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                />
                네이버로 시작하기
            </button>
        </div>
    );
};

export default SocialLoginButtons;
