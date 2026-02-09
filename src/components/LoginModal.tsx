import React, { useState } from 'react';
import './LoginModal.css';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (id: string, pw: string) => boolean;
    onSignup: (userInfo: any) => boolean;
    onCheckDuplicate?: (id: string) => boolean;
}

import { useKakaoLogin } from '../hooks/useKakaoLogin';
import { useNaverLogin } from '../hooks/useNaverLogin';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, onSignup, onCheckDuplicate }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isIdChecked, setIsIdChecked] = useState(false);

    const { loginWithKakao } = useKakaoLogin();
    const { loginWithNaver } = useNaverLogin();

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isSignup) {
            // Signup Logic
            if (!username || !password || !name || !email || !phone || !confirmPassword) {
                alert('모든 필드를 입력해주세요.');
                return;
            }
            if (!isIdChecked) {
                alert('아이디 중복확인을 해주세요.');
                return;
            }
            if (password !== confirmPassword) {
                alert('비밀번호가 일치하지 않습니다.');
                return;
            }

            // Call onSignup prop
            const success = onSignup({ username, password, name, email, phone });
            if (success) {
                // If signup successful, switch to login view and reset fields
                setIsSignup(false);
                setUsername('');
                setPassword('');
                setName('');
                setEmail('');
                setPhone('');
                setConfirmPassword('');
                setIsIdChecked(false);
            }
        } else {
            // Login Logic
            if (username.trim() && password.trim()) {
                const success = onLogin(username, password);
                if (success) {
                    onClose();
                    // Fields will be reset when closed/reopened or controlled by parent if needed
                    setUsername('');
                    setPassword('');
                }
            } else {
                alert('아이디와 비밀번호를 모두 입력해주세요.');
            }
        }
    };

    const toggleMode = () => {
        setIsSignup(!isSignup);
        // Reset fields when switching
        setUsername('');
        setPassword('');
        setName('');
        setEmail('');
        setPhone('');
        setConfirmPassword('');
        setIsIdChecked(false);
    };

    return (
        <div className="login-modal-overlay" onClick={onClose}>
            <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="login-close-btn" onClick={onClose}>&times;</button>
                <h2>{isSignup ? 'SIGN UP' : 'LOGIN'}</h2>
                <form onSubmit={handleSubmit} className="login-form">

                    {isSignup && (
                        <div className="input-group">
                            <label htmlFor="name">NAME</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="이름을 입력하세요"
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="username">ID</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); setIsIdChecked(false); }}
                                placeholder="아이디를 입력하세요"
                                style={{ flex: 1 }}
                            />
                            {isSignup && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!username.trim()) {
                                            alert('아이디를 입력해주세요.');
                                            return;
                                        }
                                        if (onCheckDuplicate && onCheckDuplicate(username)) {
                                            setIsIdChecked(true);
                                            alert('사용 가능한 아이디입니다.');
                                        } else {
                                            setIsIdChecked(false);
                                            alert('이미 사용 중인 아이디입니다.');
                                        }
                                    }}
                                    style={{
                                        padding: '10px 14px',
                                        background: isIdChecked ? '#2ecc71' : '#333',
                                        color: '#fff',
                                        border: isIdChecked ? '1px solid #2ecc71' : '1px solid #555',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {isIdChecked ? '확인완료 ✓' : '중복확인'}
                                </button>
                            )}
                        </div>
                    </div>

                    {isSignup && (
                        <div className="input-group">
                            <label htmlFor="email">EMAIL</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="이메일을 입력하세요"
                            />
                        </div>
                    )}

                    {isSignup && (
                        <div className="input-group">
                            <label htmlFor="phone">PHONE</label>
                            <input
                                type="tel"
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="010-0000-0000"
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="password">PASSWORD</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호를 입력하세요"
                        />
                    </div>

                    {isSignup && (
                        <div className="input-group">
                            <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="비밀번호를 다시 입력하세요"
                            />
                        </div>
                    )}

                    {!isSignup && (
                        <div className="login-actions">
                            <label className="keep-login">
                                <input type="checkbox" /> 로그인 상태 유지
                            </label>
                            <a href="#" className="find-pw">비밀번호 찾기</a>
                        </div>
                    )}

                    <button type="submit" className="login-submit-btn">
                        {isSignup ? '회원가입' : '로그인'}
                    </button>

                    {!isSignup && (
                        <>
                            <button type="button" className="kakao-login-btn" onClick={loginWithKakao}>
                                <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_small.png" alt="" style={{ width: 20, marginRight: 8, verticalAlign: 'middle' }} />
                                카카오로 3초만에 시작하기
                            </button>
                            <button type="button" className="naver-login-btn" onClick={loginWithNaver}>
                                <img src="https://static.nid.naver.com/oauth/button_g.PNG" alt="" style={{ width: 20, marginRight: 8, verticalAlign: 'middle', objectFit: 'contain' }} />
                                네이버로 시작하기
                            </button>
                        </>
                    )}

                    <div className="toggle-mode-area">
                        <span>{isSignup ? '이미 계정이 있으신가요?' : '아직 회원이 아니신가요?'}</span>
                        <button type="button" className="toggle-mode-btn" onClick={toggleMode}>
                            {isSignup ? '로그인하기' : '회원가입하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;
