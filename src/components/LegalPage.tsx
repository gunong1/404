import React from 'react';
import Header from './Header';
import Footer from './Footer';
import './LegalPage.css';

interface LegalPageProps {
    title: string;
    content: string;
    onHomeClick: () => void;
    isLoggedIn?: boolean;
    username?: string;
    onLoginClick?: () => void;
    onLogoutClick?: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({
    title,
    content,
    onHomeClick,
    isLoggedIn = false,
    username = '',
    onLoginClick,
    onLogoutClick
}) => {
    return (
        <div className="legal-page">
            <Header
                onHomeClick={onHomeClick}
                isLoggedIn={isLoggedIn}
                username={username}
                onLoginClick={onLoginClick}
                onLogoutClick={onLogoutClick}
            // Hide cart/mypage interactions on legal page simply or pass them if needed
            />
            <div className="legal-container">
                <h1>{title}</h1>
                <div className="legal-content">
                    <pre>{content}</pre>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default LegalPage;
