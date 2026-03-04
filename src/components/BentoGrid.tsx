import React from 'react';
import './BentoGrid.css';

interface BentoGridProps {
    onProductClick: () => void;
    onQuickBuy: () => void;
}

const BentoGrid: React.FC<BentoGridProps> = ({ onProductClick, onQuickBuy }) => {
    return (
        <section className="bento-section">
            <div className="product-grid">
                {/* Single Product Card - Apple Style */}
                <div className="product-card-apple clickable-card" onClick={onProductClick}>
                    <div className="apple-card-text">
                        <span className="apple-badge">신상품</span>
                        <h2 className="apple-card-title">빼곡 404 Not Found<br />바디워시</h2>
                        <p className="apple-card-desc">향을 입히지 않습니다. 원인을 제거합니다.</p>
                        <div className="apple-card-actions">
                            <button className="apple-btn-fill" onClick={(e) => { e.stopPropagation(); onQuickBuy(); }}>구입하기</button>
                        </div>
                    </div>
                    <div className="apple-card-image">
                        <img src="/bottle_404.jpg" alt="빼곡 404 Not Found 바디워시" className="apple-product-img" />
                    </div>
                </div>

                {/* Coming Soon Placeholder */}
                <div className="product-card-apple coming-soon-card">
                    <div className="coming-soon-content">
                        <span className="coming-soon-icon">🧴</span>
                        <h3 className="coming-soon-title">상품 준비중</h3>
                        <p className="coming-soon-desc">새로운 제품이 곧 출시됩니다.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BentoGrid;
