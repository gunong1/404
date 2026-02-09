import React from 'react';
import './BentoGrid.css';

interface BentoGridProps {
    onProductClick: () => void;
}

const BentoGrid: React.FC<BentoGridProps> = ({ onProductClick }) => {
    return (
        <section className="bento-section">
            <div className="product-grid">
                {/* Single Product Card - Apple Style */}
                <div className="product-card-apple clickable-card" onClick={onProductClick}>
                    <div className="apple-card-text">
                        <span className="apple-badge">신상품</span>
                        <h2 className="apple-card-title">Scent Not Found<br />바디워시</h2>
                        <p className="apple-card-desc">완벽한 무의 향, 당신의 감각을 초기화합니다.</p>
                        <div className="apple-card-actions">
                            <button className="apple-btn-fill" onClick={(e) => { e.stopPropagation(); onProductClick(); }}>구입하기</button>
                        </div>
                    </div>
                    <div className="apple-card-image">
                        <img src="/bottle_404.jpg" alt="Scent Not Found Bottle" className="apple-product-img" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BentoGrid;
