import React, { useState } from 'react';
import './Footer.css';
import { TERMS_CONTENT, PRIVACY_CONTENT } from '../data/legalText';

const Footer: React.FC = () => {
    const [modalContent, setModalContent] = useState<string | null>(null);
    const [modalTitle, setModalTitle] = useState<string | null>(null);

    const openModal = (title: string, content: string) => {
        setModalTitle(title);
        setModalContent(content);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setModalContent(null);
        setModalTitle(null);
        document.body.style.overflow = 'auto';
    };

    const termsContent = TERMS_CONTENT;
    const privacyContent = PRIVACY_CONTENT;

    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-top">

                    <div className="footer-contact">
                        <h4>고객센터</h4>
                        <p className="cs-email-highlight">📧 middlebigdog@naver.com</p>
                        <p className="cs-hours">평일 10:00 - 17:00 (점심 12:00 - 13:00)</p>
                        <p className="cs-hours">토/일/공휴일 휴무</p>
                    </div>
                </div>

                <div className="footer-divider"></div>

                <div className="footer-links">
                    <button onClick={() => openModal('이용약관', termsContent)}>이용약관</button>
                    <span className="separator">|</span>
                    <button onClick={() => openModal('개인정보처리방침', privacyContent)} className="privacy-link">개인정보처리방침</button>
                </div>

                <div className="footer-business">
                    <p>상호: 코픽 (Kopick) | 대표자: 송치호 | 사업자등록번호: 687-09-02870</p>
                    <p>통신판매업신고: 제 2025-대전서구-1854호 | 전화: 010-9156-8438</p>
                    <p>주소: 대전광역시 서구 도산로 79, 1106동 705호</p>
                    <p>이메일: middlebigdog@naver.com</p>
                </div>

                <div className="copyright">
                    &copy; 2025 404. All rights reserved.
                </div>
            </div>

            {modalContent && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{modalTitle}</h3>
                            <button className="close-btn" onClick={closeModal}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <pre>{modalContent}</pre>
                        </div>
                    </div>
                </div>
            )}
        </footer>
    );
};

export default Footer;
