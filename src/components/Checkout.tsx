import React, { useState } from 'react';
import './Checkout.css';
import { usePayment } from '../hooks/usePayment';

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
}

interface ShippingInfo {
    name: string;
    phone: string;
    email: string;
    zipcode: string;
    address: string;
    addressDetail: string;
    memo: string;
}

interface CheckoutProps {
    items: CartItem[];
    onBack: () => void;
    totalAmount: number;
    onOrderComplete: (orderId: string, buyerName: string, shippingAddress: string) => void;
    username?: string;
    userEmail?: string;
    userPhone?: string;
    savedAddress?: { zipcode: string; address: string; addressDetail: string };
    onUpdateQuantity?: (itemId: string, newQuantity: number) => void;
    onRemoveItem?: (itemId: string) => void;
}

const Checkout: React.FC<CheckoutProps> = ({ items, onBack, totalAmount, onOrderComplete, username, userEmail, userPhone, savedAddress, onUpdateQuantity, onRemoveItem }) => {
    const { requestPayment } = usePayment();
    const [shipping, setShipping] = useState<ShippingInfo>({
        name: username || '',
        phone: userPhone || '',
        email: userEmail || '',
        zipcode: savedAddress?.zipcode || '',
        address: savedAddress?.address || '',
        addressDetail: savedAddress?.addressDetail || '',
        memo: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setShipping({ ...shipping, [e.target.name]: e.target.value });
    };

    const validateForm = (): boolean => {
        if (!shipping.name.trim()) { alert('받으시는 분 이름을 입력해주세요.'); return false; }
        if (!shipping.phone.trim()) { alert('연락처를 입력해주세요.'); return false; }
        if (!shipping.address.trim()) { alert('주소를 입력해주세요.'); return false; }
        if (!shipping.email.trim()) { alert('이메일을 입력해주세요.'); return false; }
        return true;
    };

    const handleCheckout = async () => {
        if (items.length === 0) {
            alert('장바구니가 비어있습니다.');
            return;
        }
        if (!validateForm()) return;

        setIsProcessing(true);
        try {
            const orderName = items.length === 1
                ? items[0].name
                : `${items[0].name} 외 ${items.length - 1}건`;

            const paymentData = {
                orderName,
                totalAmount,
                currency: "CURRENCY_KRW",
                payMethod: "CARD",
                buyer: {
                    name: shipping.name,
                    email: shipping.email,
                    tel: shipping.phone,
                },
                shippingAddress: `${shipping.address} ${shipping.addressDetail}`.trim(),
                shippingMemo: shipping.memo,
            };

            const orderId = await requestPayment(paymentData);
            if (orderId) {
                onOrderComplete(orderId, shipping.name, `${shipping.address} ${shipping.addressDetail}`.trim());
            }
        } catch (error) {
            console.error('Checkout error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <section className="checkout-section">
            <button className="back-btn" onClick={onBack}>&larr; 쇼핑 계속하기</button>
            <h1 className="checkout-title">주문 / 결제</h1>

            <div className="checkout-container">
                <div className="checkout-left">
                    {/* Shipping Form */}
                    <div className="shipping-form">
                        <h2 className="section-heading">배송 정보</h2>
                        <div className="form-group">
                            <label htmlFor="name">받으시는 분 <span className="required">*</span></label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="이름을 입력해주세요"
                                value={shipping.name}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">연락처 <span className="required">*</span></label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder="010-0000-0000"
                                value={shipping.phone}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">이메일 <span className="required">*</span></label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="example@email.com"
                                value={shipping.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group zipcode-group">
                                <label htmlFor="zipcode">우편번호</label>
                                <div className="zipcode-row">
                                    <input
                                        id="zipcode"
                                        name="zipcode"
                                        type="text"
                                        placeholder="우편번호"
                                        value={shipping.zipcode}
                                        onChange={handleChange}
                                        readOnly
                                    />
                                    <button
                                        type="button"
                                        className="zipcode-btn"
                                        onClick={() => {
                                            // Daum Postcode API integration
                                            new (window as any).daum.Postcode({
                                                oncomplete: (data: any) => {
                                                    setShipping(prev => ({
                                                        ...prev,
                                                        zipcode: data.zonecode,
                                                        address: data.roadAddress || data.jibunAddress,
                                                    }));
                                                }
                                            }).open();
                                        }}
                                    >
                                        주소 검색
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="address">주소 <span className="required">*</span></label>
                            <input
                                id="address"
                                name="address"
                                type="text"
                                placeholder="주소 검색을 눌러주세요"
                                value={shipping.address}
                                onChange={handleChange}
                                readOnly
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="addressDetail">상세 주소</label>
                            <input
                                id="addressDetail"
                                name="addressDetail"
                                type="text"
                                placeholder="상세 주소를 입력해주세요 (동/호수 등)"
                                value={shipping.addressDetail}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="memo">배송 메모</label>
                            <select
                                id="memo"
                                name="memo"
                                value={shipping.memo}
                                onChange={handleChange}
                            >
                                <option value="">배송 메모를 선택해주세요</option>
                                <option value="문 앞에 놓아주세요">문 앞에 놓아주세요</option>
                                <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
                                <option value="택배함에 넣어주세요">택배함에 넣어주세요</option>
                                <option value="배송 전 연락 바랍니다">배송 전 연락 바랍니다</option>
                                <option value="부재 시 휴대폰으로 연락 바랍니다">부재 시 휴대폰으로 연락 바랍니다</option>
                            </select>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="order-items-section">
                        <h2 className="section-heading">주문 상품 ({items.length}건)</h2>
                        <div className="order-list">
                            {items.length === 0 ? (
                                <div className="empty-cart">
                                    <p>장바구니가 비어있습니다.</p>
                                </div>
                            ) : (
                                items.map((item, index) => (
                                    <div key={`${item.id}-${index}`} className="order-item">
                                        <div className="item-image-box">
                                            <img src={item.image} alt={item.name} className="item-image" />
                                        </div>
                                        <div className="item-info">
                                            <h3 className="item-name">{item.name}</h3>
                                            <span className="item-price">₩{item.price.toLocaleString()}</span>
                                            <div className="qty-controls">
                                                <button
                                                    className="qty-btn"
                                                    onClick={() => {
                                                        if (item.quantity <= 1) {
                                                            if (onRemoveItem) onRemoveItem(item.id);
                                                        } else {
                                                            if (onUpdateQuantity) onUpdateQuantity(item.id, item.quantity - 1);
                                                        }
                                                    }}
                                                >
                                                    {item.quantity <= 1 ? '🗑' : '−'}
                                                </button>
                                                <span className="qty-value">{item.quantity}</span>
                                                <button
                                                    className="qty-btn"
                                                    onClick={() => {
                                                        if (onUpdateQuantity) onUpdateQuantity(item.id, item.quantity + 1);
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <p className="item-total">합계: ₩{(item.price * item.quantity).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="order-summary">
                    <h2>결제 정보</h2>
                    <div className="summary-row">
                        <span>상품 금액</span>
                        <span>₩{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="summary-row">
                        <span>배송비</span>
                        <span>무료</span>
                    </div>
                    <div className="summary-divider"></div>
                    <div className="summary-total">
                        <span>최종 결제 금액</span>
                        <span className="total-price">₩{totalAmount.toLocaleString()}</span>
                    </div>
                    <button
                        className="checkout-btn"
                        onClick={handleCheckout}
                        disabled={isProcessing || items.length === 0}
                    >
                        {isProcessing ? '결제 진행 중...' : `₩${totalAmount.toLocaleString()} 결제하기`}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Checkout;
