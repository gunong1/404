import React, { useState, useEffect } from 'react';
import './Header.css';

interface HeaderProps {
    cartCount?: number;
    isLoggedIn?: boolean;
    username?: string;
    onLoginClick?: () => void;
    onLogoutClick?: () => void;
    onCartClick?: () => void;
    onMyPageClick?: () => void;
    onHomeClick?: () => void;
    transparent?: boolean;
}

const Header: React.FC<HeaderProps> = ({
    cartCount = 0,
    isLoggedIn = false,
    username = '',
    onLoginClick,
    onLogoutClick,
    onCartClick,
    onMyPageClick,
    onHomeClick,
    transparent = false
}) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`site-header ${scrolled ? 'scrolled' : ''} ${transparent && !scrolled ? 'transparent' : ''}`}>
            <div className="header-inner">
                <img src="/logo_404.png" alt="404" className="logo" onClick={() => { onHomeClick?.(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ cursor: 'pointer' }} />
                <nav className="nav-menu">
                    {isLoggedIn ? (
                        <>
                            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onMyPageClick?.(); }}>
                                마이페이지
                            </a>
                            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onLogoutClick?.(); }}>
                                {username}님 (LOGOUT)
                            </a>
                        </>
                    ) : (
                        <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onLoginClick?.(); }}>
                            로그인
                        </a>
                    )}
                    <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onCartClick?.(); }}>
                        장바구니({cartCount})
                    </a>
                </nav>
            </div>
        </header>
    );
};

export default Header;
