import React, { useState, useRef, useTransition } from 'react';
import './LoginModal.css';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (id: string, pw: string) => Promise<boolean>;
    onSignup: (userInfo: any) => Promise<boolean>;
    onCheckDuplicate?: (id: string) => Promise<boolean>;
}

import { useKakaoLogin } from '../hooks/useKakaoLogin';
import { useNaverLogin } from '../hooks/useNaverLogin';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, onSignup, onCheckDuplicate }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [isPending, startTransition] = useTransition(); // Optimization for INP
    const [isLoading, setIsLoading] = useState(false); // Network loading state
    const [isIdChecked, setIsIdChecked] = useState(false);

    // Password Validation State
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState('');

    // Agreement States
    const [agreements, setAgreements] = useState({
        terms: false,
        privacy: false,
        age: false,
        marketing: false
    });

    // Use Refs for uncontrolled inputs to prevent re-renders on every keystroke
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const phoneRef = useRef<HTMLInputElement>(null);
    const confirmPasswordRef = useRef<HTMLInputElement>(null);
    const mouseDownTarget = useRef<EventTarget | null>(null);

    const { loginWithKakao } = useKakaoLogin();
    const { loginWithNaver } = useNaverLogin();

    if (!isOpen) return null;

    const allRequiredChecked = agreements.terms && agreements.privacy && agreements.age;
    const allChecked = allRequiredChecked && agreements.marketing;

    const handleTotalCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setAgreements({
            terms: checked,
            privacy: checked,
            age: checked,
            marketing: checked
        });
    };

    const handleSingleCheck = (name: keyof typeof agreements) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setAgreements(prev => ({
            ...prev,
            [name]: e.target.checked
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const username = usernameRef.current?.value || '';
        const password = passwordRef.current?.value || '';

        if (isSignup) {
            const name = nameRef.current?.value || '';
            const email = emailRef.current?.value || '';
            const phone = phoneRef.current?.value || '';
            const confirmPassword = confirmPasswordRef.current?.value || '';

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
            if (!isPasswordValid) {
                alert('비밀번호가 보안 규칙(영문+숫자+특수문자 8자 이상)을 만족하지 않습니다.');
                return;
            }
            if (!allRequiredChecked) {
                alert('필수 약관에 모두 동의해 주세요.');
                return;
            }

            setIsLoading(true);
            try {
                // Await the async signup matching the Promise<boolean> return type
                const success = await onSignup({
                    username,
                    password,
                    name,
                    email,
                    phone,
                    marketingConsent: agreements.marketing
                });

                if (success) {
                    // Update UI state in transition
                    startTransition(() => {
                        setIsSignup(false);
                        resetFields();
                    });
                }
            } catch (error) {
                console.error("Signup failed", error);
                alert("회원가입 중 오류가 발생했습니다.");
            } finally {
                setIsLoading(false);
            }
        } else {
            // Login Logic
            if (username.trim() && password.trim()) {
                setIsLoading(true);
                try {
                    const success = await onLogin(username, password);
                    if (success) {
                        onClose();
                        resetFields();
                    }
                } catch (error) {
                    console.error("Login failed", error);
                    alert("로그인 중 오류가 발생했습니다.");
                } finally {
                    setIsLoading(false);
                }
            } else {
                alert('아이디와 비밀번호를 모두 입력해주세요.');
            }
        }
    };

    const resetFields = () => {
        if (usernameRef.current) usernameRef.current.value = '';
        if (passwordRef.current) passwordRef.current.value = '';
        if (nameRef.current) nameRef.current.value = '';
        if (emailRef.current) emailRef.current.value = '';
        if (phoneRef.current) phoneRef.current.value = '';
        if (confirmPasswordRef.current) confirmPasswordRef.current.value = '';
        setIsIdChecked(false);
        setAgreements({ terms: false, privacy: false, age: false, marketing: false });
        setIsPasswordValid(false);
        setPasswordMsg('');
    };

    const toggleMode = () => {
        setIsSignup(!isSignup);
        resetFields();
    };

    const handleLinkClick = (path: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        window.open(path, '_blank');
    };

    return (
        <div
            className="login-modal-overlay"
            onMouseDown={(e) => { mouseDownTarget.current = e.target; }}
            onClick={(e) => {
                // Only close if both mousedown AND click happened on the overlay itself
                if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
                    onClose();
                }
                mouseDownTarget.current = null;
            }}
        >
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
                                ref={nameRef}
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
                                ref={usernameRef}
                                onChange={() => { if (isIdChecked) setIsIdChecked(false); }}
                                placeholder="아이디를 입력하세요"
                                style={{ flex: 1 }}
                            />
                            {isSignup && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const val = usernameRef.current?.value || '';
                                        if (!val.trim()) {
                                            alert('아이디를 입력해주세요.');
                                            return;
                                        }
                                        if (onCheckDuplicate) {
                                            const isAvailable = await onCheckDuplicate(val);
                                            if (isAvailable) {
                                                setIsIdChecked(true);
                                                alert('사용 가능한 아이디입니다.');
                                            } else {
                                                setIsIdChecked(false);
                                                alert('이미 사용 중인 아이디입니다.');
                                            }
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
                                ref={emailRef}
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
                                ref={phoneRef}
                                placeholder="010-0000-0000"
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="password">PASSWORD</label>
                        <input
                            type="password"
                            id="password"
                            ref={passwordRef}
                            onChange={(e) => {
                                if (isSignup) {
                                    const val = e.target.value;
                                    // Regex: At least one letter, one number, on special char, min 8 chars
                                    const isValid = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*?_~]).{8,}$/.test(val);
                                    const msg = isValid
                                        ? '사용 가능한 안전한 비밀번호입니다.'
                                        : '영문, 숫자, 특수문자(!@#$%^&*?_~) 포함 8자 이상 입력해 주세요.';
                                    setPasswordMsg(msg);
                                    setIsPasswordValid(isValid);
                                }
                            }}
                            placeholder="비밀번호를 입력하세요"
                        />
                        {isSignup && (
                            <span style={{
                                fontSize: '0.8rem',
                                color: isPasswordValid ? '#2ecc71' : '#e74c3c',
                                marginTop: '4px'
                            }}>
                                {passwordMsg}
                            </span>
                        )}
                    </div>

                    {isSignup && (
                        <div className="input-group">
                            <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                ref={confirmPasswordRef}
                                placeholder="비밀번호를 다시 입력하세요"
                            />
                        </div>
                    )}

                    {isSignup && (
                        <div className="agreement-section">
                            <label className="agreement-total">
                                <input
                                    type="checkbox"
                                    checked={allChecked}
                                    onChange={handleTotalCheck}
                                />
                                <span>(전체 동의) 약관에 모두 동의합니다.</span>
                            </label>
                            <div className="agreement-list">
                                <label className="agreement-item">
                                    <input
                                        type="checkbox"
                                        checked={agreements.terms}
                                        onChange={handleSingleCheck('terms')}
                                    />
                                    <span>[필수] <a href="/terms" onClick={handleLinkClick('/terms')} className="text-link">이용약관 동의</a></span>
                                </label>
                                <label className="agreement-item">
                                    <input
                                        type="checkbox"
                                        checked={agreements.privacy}
                                        onChange={handleSingleCheck('privacy')}
                                    />
                                    <span>[필수] <a href="/privacy-policy" onClick={handleLinkClick('/privacy-policy')} className="text-link">개인정보 수집 및 이용 동의</a></span>
                                </label>
                                <label className="agreement-item">
                                    <input
                                        type="checkbox"
                                        checked={agreements.age}
                                        onChange={handleSingleCheck('age')}
                                    />
                                    <span>[필수] 본인은 만 14세 이상입니다.</span>
                                </label>
                                <label className="agreement-item">
                                    <input
                                        type="checkbox"
                                        checked={agreements.marketing}
                                        onChange={handleSingleCheck('marketing')}
                                    />
                                    <span>[선택] 쇼핑 정보 수신 동의 (SMS, 이메일)</span>
                                </label>
                            </div>
                        </div>
                    )}



                    <button type="submit" className="login-submit-btn" disabled={isSignup && (!allRequiredChecked || !isPasswordValid) || (isPending || isLoading)} style={{ opacity: (isSignup && (!allRequiredChecked || !isPasswordValid) || isPending || isLoading) ? 0.5 : 1 }}>
                        {isPending || isLoading ? '처리 중...' : (isSignup ? '회원가입' : '로그인')}
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

export default React.memo(LoginModal);
