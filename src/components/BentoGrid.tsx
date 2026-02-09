import React from 'react';
import BentoItem from './BentoItem';
import './BentoGrid.css';

interface BentoGridProps {
    onProductClick: () => void;
}

const BentoGrid: React.FC<BentoGridProps> = ({ onProductClick }) => {
    return (
        <section className="bento-section">
            <div className="bento-container-grid">

                {/* 1. Main Product Highlight - Large Card */}
                <BentoItem
                    colSpan={3}
                    rowSpan={2}
                    title="Scent Not Found 바디워시"
                    subtitle="신상품"
                    className="product-highlight clickable-card"
                    onClick={onProductClick}
                >
                    <div className="highlight-content">
                        <p className="description">완벽한 무의 향, 당신의 감각을 초기화합니다.</p>
                        <div className="product-visual-large">
                            {/* Product Image */}
                            <img src="/bottle_404.jpg" alt="Scent Not Found Bottle" className="product-image-real" />
                            <div className="glow-effect"></div>
                        </div>
                    </div>
                </BentoItem>

            </div>
        </section>
    );
};

export default BentoGrid;
