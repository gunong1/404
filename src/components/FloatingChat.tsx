import React from 'react';
import './FloatingChat.css';

const FloatingChat: React.FC = () => {
    return (
        <a
            href="https://pf.kakao.com/_vxkqzX/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="floating-chat-btn"
            aria-label="카카오톡 채널 1:1 채팅 문의"
        >
            {/* 카카오톡 말풍선 아이콘 (SVG) */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="#3C1E1E"
            >
                <path d="M12 2C6.477 2 2 5.924 2 10.773c0 3.076 1.73 5.78 4.35 7.418L5.3 22l4.574-2.282c.686.118 1.393.18 2.126.18 5.523 0 10-3.924 10-8.773C22 5.924 17.523 2 12 2z" />
            </svg>
            <span className="floating-chat-label">카카오 문의</span>
        </a>
    );
};

export default FloatingChat;
