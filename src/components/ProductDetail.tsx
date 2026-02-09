import React, { useState } from 'react';
import './ProductDetail.css';
import SocialLoginButtons from './SocialLoginButtons';

interface ProductDetailProps {
    onBack: () => void;
    onAddToCart: (quantity: number) => void;
    onBuyNow: (quantity: number) => void;
    isLoggedIn: boolean;
    onLoginClick: () => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ onBack, onAddToCart, onBuyNow, isLoggedIn, onLoginClick }) => {
    const [quantity, setQuantity] = useState(1);
    const basePrice = 18000;
    const totalPrice = basePrice * quantity;

    const handleBuyNow = () => {
        if (!isLoggedIn) {
            alert('로그인 후 이용해주세요.');
            onLoginClick();
            return;
        }
        onBuyNow(quantity);
    };

    const handleAddToCart = () => {
        if (!isLoggedIn) {
            alert('로그인 후 이용해주세요.');
            onLoginClick();
            return;
        }
        onAddToCart(quantity);
    };

    return (
        <section className="product-detail-section">
            <button className="back-btn" onClick={onBack}>&larr; 뒤로 가기</button>
            <div className="product-detail-container">
                <div className="detail-image-area">
                    <img src="/bottle_404.jpg" alt="Scent Not Found Body Wash" className="detail-image" />
                    <div className="detail-glow-effect"></div>
                </div>
                <div className="detail-info-area">
                    <span className="detail-subtitle">신상품</span>
                    <h1 className="detail-title">Scent Not Found 바디워시</h1>
                    <p className="detail-description">
                        The scent of void. Designed for system reboot.<br />
                        완벽한 무의 향, 당신의 감각을 초기화합니다.
                    </p>

                    <div className="detail-specs">
                        <div className="spec-item">
                            <span className="spec-label">용량</span>
                            <span className="spec-value">500ml / 16.9 fl. oz</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">제품군</span>
                            <span className="spec-value">올인원 바디워시</span>
                        </div>
                    </div>

                    <div className="detail-divider"></div>

                    <div className="detail-price-area">
                        <span className="detail-currency">₩</span>
                        <span className="detail-amount">{totalPrice.toLocaleString()}</span>
                    </div>

                    <div className="detail-controls">
                        <div className="detail-qty-control">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                            <span>{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)}>+</button>
                        </div>
                        <div className="action-buttons">
                            <button
                                className="detail-action-btn cart-btn"
                                onClick={handleAddToCart}
                            >
                                장바구니 담기
                            </button>
                            <button
                                className="detail-action-btn buy-btn"
                                onClick={handleBuyNow}
                            >
                                바로 구매하기
                            </button>
                        </div>
                    </div>
                    {!isLoggedIn && (
                        <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                            <p style={{ textAlign: 'center', color: '#666', marginBottom: '10px', fontSize: '0.9rem' }}>간편 로그인 / 회원가입</p>
                            <SocialLoginButtons />
                        </div>
                    )}
                </div>
            </div>

            <div className="detail-content-more">
                <h3>상품 상세 정보</h3>
                <p>
                    여기에 상세 페이지 이미지가 들어갑니다.<br />
                    (고해상도 제품 상세 설명 이미지 영역)
                </p>
                <div className="detail-placeholder-box">
                    Product Detail Image Area
                </div>
            </div>
        </section>
    );
};

export default ProductDetail;
