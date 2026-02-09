import React from 'react';
import './OrderComplete.css';

interface OrderCompleteProps {
    orderId: string;
    totalAmount: number;
    buyerName: string;
    shippingAddress: string;
    onGoHome: () => void;
}

const OrderComplete: React.FC<OrderCompleteProps> = ({
    orderId,
    totalAmount,
    buyerName,
    shippingAddress,
    onGoHome,
}) => {
    const orderDate = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <section className="order-complete-section">
            <div className="order-complete-card">
                <div className="success-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="30" stroke="#4CAF50" strokeWidth="3" />
                        <path d="M20 33L28 41L44 23" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                <h1 className="complete-title">주문이 완료되었습니다!</h1>
                <p className="complete-subtitle">감사합니다. 주문하신 상품을 빠르게 배송해드리겠습니다.</p>

                <div className="order-detail-card">
                    <div className="detail-row">
                        <span className="detail-label">주문번호</span>
                        <span className="detail-value order-id">{orderId}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">주문일시</span>
                        <span className="detail-value">{orderDate}</span>
                    </div>
                    <div className="detail-divider"></div>
                    <div className="detail-row">
                        <span className="detail-label">주문자</span>
                        <span className="detail-value">{buyerName}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">배송지</span>
                        <span className="detail-value address">{shippingAddress}</span>
                    </div>
                    <div className="detail-divider"></div>
                    <div className="detail-row total-row">
                        <span className="detail-label">결제 금액</span>
                        <span className="detail-value total-amount">₩{totalAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="order-info-box">
                    <p>📦 배송은 결제 완료 후 1~3영업일 이내에 시작됩니다.</p>
                    <p>📧 주문 관련 문의: support@404bodycare.com</p>
                </div>

                <button className="go-home-btn" onClick={onGoHome}>
                    쇼핑 계속하기
                </button>
            </div>
        </section>
    );
};

export default OrderComplete;
