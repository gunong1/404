import React, { useState, useEffect } from 'react';
import './ProductDetail.css';
import SocialLoginButtons from './SocialLoginButtons';
import { supabase } from '../lib/supabase';

interface ProductDetailProps {
    onBack: () => void;
    onAddToCart: (quantity: number) => void;
    onBuyNow: (quantity: number) => void;
    isLoggedIn: boolean;
    onLoginClick: () => void;
    userEmail?: string;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ onBack, onAddToCart, onBuyNow, isLoggedIn, onLoginClick, userEmail }) => {
    const [quantity, setQuantity] = useState(1);
    const [isSoldOut, setIsSoldOut] = useState(false);
    const [stockLoading, setStockLoading] = useState(true);
    const originalPrice = 32000;
    const basePrice = 19800;
    const discountRate = 38;
    const totalPrice = basePrice * quantity;

    // Review states
    interface Review {
        id: string;
        user_id: string;
        rating: number;
        content: string;
        image_url: string | null;
        created_at: string;
        source: string;           // 'internal' | 'naver_pay' | 'kakao_pay' ...
        external_review_id: string | null;
        author_name: string | null; // 외부 채널 작성자명 (ex: '송**')
    }
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewTab, setReviewTab] = useState<'all' | 'photo'>('all');
    const [reviewsLoading, setReviewsLoading] = useState(true);

    // 재고 조회
    useEffect(() => {
        supabase
            .from('products')
            .select('sellable_stock')
            .eq('id', 'bodywash-01')
            .maybeSingle()
            .then(({ data }) => {
                if (data) setIsSoldOut(data.sellable_stock <= 0);
                setStockLoading(false);
            });
    }, []);

    // 리뷰 조회
    useEffect(() => {
        supabase
            .from('reviews')
            .select('id, user_id, rating, content, image_url, created_at, source, external_review_id, author_name')
            .eq('product_id', 'bodywash-01')
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                setReviews((data || []).map((r: any) => ({ ...r, source: r.source || 'internal' })));
                setReviewsLoading(false);
            });
    }, []);

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
                    <img src="/bottle_404.jpg" alt="404 Not Found 바디워시" className="detail-image" />
                    <div className="detail-glow-effect"></div>
                </div>
                <div className="detail-info-area">
                    <span className="detail-subtitle">신상품</span>
                    <h1 className="detail-title">404 Not Found 바디워시</h1>
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
                            <span className="spec-value">체취케어 기능성 바디워시</span>
                        </div>
                    </div>

                    <div className="detail-divider"></div>

                    <div className="detail-price-area">
                        <span className="discount-badge">{discountRate}%</span>
                        <span className="original-price">₩{(originalPrice * quantity).toLocaleString()}</span>
                        <div className="sale-price">
                            <span className="detail-currency">₩</span>
                            <span className="detail-amount">{totalPrice.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="detail-controls">
                        {!isSoldOut && (
                            <div className="detail-qty-control">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                                <span>{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)}>+</button>
                            </div>
                        )}
                        <div className="action-buttons">
                            {stockLoading ? (
                                <button className="detail-action-btn buy-btn" disabled>
                                    재고 확인 중...
                                </button>
                            ) : isSoldOut ? (
                                <button
                                    className="detail-action-btn sold-out-btn"
                                    disabled
                                >
                                    [품절] 재입고 알림 받기
                                </button>
                            ) : (
                                <>
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
                                </>
                            )}
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
                {/* 상세 이미지 */}
                <div className="parent-centering-container">
                    <div className="detail-info-image-wrap">
                        <img
                            src="/detail_info.png?v=2"
                            alt="404 바디워시 상세 정보"
                            className="detail-info-image"
                        />
                    </div>
                </div>

                <div className="detail-section">
                    <h3>제품 상세 설명</h3>
                    <p className="detail-text-highlight">404 Not Found : 감각의 초기화</p>
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
                        <li><strong>배송 비용:</strong> 3,000원 (39,000원 이상 구매 시 무료배송 / 제주 및 도서산간 지역 별도 추가)</li>
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

                {/* ===== 리뷰 섹션 ===== */}
                <div className="detail-divider-line"></div>

                <div className="detail-section reviews-section">
                    {/* 리뷰 보상 안내 */}
                    <div className="review-reward-banner">
                        <div className="review-reward-block">
                            <p className="review-reward-title">📝 리뷰 보상</p>
                            <p className="review-reward-item">📸 포토 평가 <span className="review-reward-highlight">(사진+글)</span> : <strong>1,000 포인트</strong> 즉시 지급</p>
                            <p className="review-reward-item">✏️ 텍스트 평가 <span className="review-reward-highlight">(글)</span> : <strong>500 포인트</strong> 즉시 지급</p>
                            <p className="review-reward-note">지급된 포인트는 다음 결제 시 100% 사용 가능합니다.</p>
                        </div>
                        <div className="review-reward-block">
                            <p className="review-reward-title">🏆 이달의 평가자 선정</p>
                            <p className="review-reward-item">매월 1일, 가장 직관적인 포토 리뷰를 남겨주신 <strong>3명</strong>을 선정합니다.</p>
                            <p className="review-reward-item">선정된 분들께는 <strong>404 바디워시 본품 1개</strong>를 추가 발송해 드립니다.</p>
                        </div>
                        <p className="review-reward-disclaimer">* 비방, 광고성, 제품과 무관한 리뷰는 사전 고지 없이 혜택 지급이 제한될 수 있습니다.</p>
                    </div>

                    {/* 리뷰 요약 헤더 */}
                    <div className="reviews-header">
                        <h3>고객 리뷰</h3>
                        {reviews.length > 0 && (
                            <div className="reviews-summary">
                                <span className="avg-star">★</span>
                                <span className="avg-score">
                                    {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                                </span>
                                <span className="review-total-cnt">({reviews.length}개 리뷰)</span>
                            </div>
                        )}
                    </div>

                    {/* 탭 */}
                    <div className="review-tabs">
                        <button
                            className={`review-tab-btn ${reviewTab === 'all' ? 'active' : ''}`}
                            onClick={() => setReviewTab('all')}
                        >
                            전체 리뷰 ({reviews.length})
                        </button>
                        <button
                            className={`review-tab-btn ${reviewTab === 'photo' ? 'active' : ''}`}
                            onClick={() => setReviewTab('photo')}
                        >
                            📸 포토 리뷰 ({reviews.filter(r => r.image_url).length})
                        </button>
                    </div>

                    {/* 리뷰 목록 */}
                    {reviewsLoading ? (
                        <div className="reviews-loading">리뷰를 불러오는 중...</div>
                    ) : (() => {
                        const filtered = reviewTab === 'photo' ? reviews.filter(r => r.image_url) : reviews;
                        return filtered.length === 0 ? (
                            <div className="reviews-empty">
                                {reviewTab === 'photo' ? '포토 리뷰가 없습니다.' : '아직 리뷰가 없습니다. 첫 번째 리뷰를 남겨보세요!'}
                            </div>
                        ) : (
                            <div className="review-list">
                                {filtered.map(review => (
                                    <div key={review.id} className="review-card">
                                        <div className="review-card-header">
                                            <div className="review-user-info">
                                                <span className="review-user-avatar">
                                                    {(review.author_name || review.user_id).charAt(0).toUpperCase()}
                                                </span>
                                                <span className="review-user-email">
                                                    {review.author_name
                                                        ? review.author_name
                                                        : review.user_id.replace(/(.{2}).*(@.*)/, '$1***$2')
                                                    }
                                                </span>
                                                {/* 채널 배지 */}
                                                {review.source === 'naver_pay' && (
                                                    <span className="channel-badge naver-badge">N페이 구매</span>
                                                )}
                                                {review.source === 'kakao_pay' && (
                                                    <span className="channel-badge kakao-badge">카카오페이</span>
                                                )}
                                                {userEmail && review.source === 'internal' && review.user_id === userEmail && (
                                                    <span className="my-review-badge">내 리뷰</span>
                                                )}
                                            </div>
                                            <div className="review-meta">
                                                <span className="review-stars">
                                                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                                </span>
                                                <span className="review-date">
                                                    {new Date(review.created_at).toLocaleDateString('ko-KR')}
                                                </span>
                                            </div>
                                        </div>
                                        {review.image_url && (
                                            <div className="review-image-area">
                                                <img src={review.image_url} alt="리뷰 이미지" className="review-list-image" />
                                            </div>
                                        )}
                                        <p className="review-content-text">{review.content}</p>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </section>
    );
};

export default ProductDetail;
