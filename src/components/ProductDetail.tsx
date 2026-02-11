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
                        향을 입히지 않습니다. 원인을 제거합니다.
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
                <div className="detail-section">
                    <h3>제품 상세 설명</h3>
                    <p className="detail-text-highlight">Scent 404 Not Found : 감각의 초기화</p>
                    <p className="detail-quote">"향을 입히지 않습니다. 원인을 제거합니다."</p>
                    <p>404 바디워시는 불쾌한 체취의 주범인 '디아세틸(Diacetyl)'과 '노네날(Nonenal)'을 흡착하여 씻어내는 딥 클렌징 솔루션입니다. 인위적인 향료로 체취를 가리는 대신, 피부 본연의 무구한 상태로 되돌리세요.</p>
                    <ul className="detail-specs-list">
                        <li><strong>Effect:</strong> 체취 원인 물질 제거, 딥 클렌징</li>
                        <li><strong>Skin Type:</strong> 모든 피부용</li>
                        <li><strong>Volume:</strong> 500ml</li>
                    </ul>
                </div>

                <div className="detail-divider-line"></div>

                <div className="detail-section">
                    <h3>배송 안내</h3>
                    <ul className="detail-info-list">
                        <li><strong>배송 방법:</strong> 택배 배송</li>
                        <li><strong>배송 지역:</strong> 전국</li>
                        <li><strong>배송 비용:</strong> 3,000원 (50,000원 이상 구매 시 무료배송 / 제주 및 도서산간 지역 별도 추가)</li>
                        <li><strong>배송 기간:</strong> 결제일로부터 1~3일 (주말/공휴일 제외, 물류 사정에 따라 지연될 수 있음)</li>
                    </ul>
                </div>

                <div className="detail-divider-line"></div>

                <div className="detail-section">
                    <h3>교환 및 반품 안내</h3>
                    <ul className="detail-info-list">
                        <li><strong>신청 기간:</strong> 상품 수령 후 7일 이내 교환 및 반품 가능</li>
                        <li><strong>비용 부담:</strong>
                            <ul className="sub-list">
                                <li>고객 단순 변심: 왕복 배송비 6,000원 고객 부담</li>
                                <li>상품 불량 및 오배송: 판매자 전액 부담</li>
                            </ul>
                        </li>
                        <li><strong>반품 불가 사유:</strong>
                            <ul className="sub-list">
                                <li>포장을 개봉하였거나 포장이 훼손되어 상품 가치가 상실된 경우</li>
                                <li>사용 또는 일부 소비에 의하여 상품의 가치가 현저히 감소한 경우</li>
                                <li>시간의 경과에 의하여 재판매가 곤란할 정도로 상품 등의 가치가 현저히 감소한 경우</li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
};

export default ProductDetail;
