import React, { useState, useEffect, useRef } from 'react';
import './Checkout.css';
import { usePayment } from '../hooks/usePayment';
import { supabase } from '../lib/supabase';

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
}

interface Coupon {
    id: number;
    coupon_name: string;
    discount_amount: number;
    min_order_amount: number;
    expires_at: string;
}

interface ShippingInfo {
    name: string;
    phone: string;
    email: string;
    zipcode: string;
    address: string;
    addressDetail: string;
    memo: string;
    customMemo: string;
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

    // Buyer Info State (Auto-filled from Naver/Session)
    const [buyer, setBuyer] = useState({
        name: username || '',
        phone: userPhone || '',
        email: userEmail || ''
    });

    // Shipping Info State
    const [shipping, setShipping] = useState<ShippingInfo>({
        name: username || '',
        phone: userPhone || '',
        email: userEmail || '',
        zipcode: savedAddress?.zipcode || '',
        address: savedAddress?.address || '',
        addressDetail: savedAddress?.addressDetail || '',
        memo: '',
        customMemo: '',
    });

    const [isSameAsBuyer, setIsSameAsBuyer] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [saveAsDefault, setSaveAsDefault] = useState(false);
    const phoneInputRef = useRef<HTMLInputElement>(null);

    // Coupon state
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
    const selectedCoupon = coupons.find(c => c.id === selectedCouponId);
    const couponDiscount = selectedCoupon ? selectedCoupon.discount_amount : 0;

    // Points state
    const [userPoints, setUserPoints] = useState(0);
    const [pointsInput, setPointsInput] = useState('');
    const pointsUsed = Math.min(
        Math.max(0, parseInt(pointsInput || '0', 10) || 0),
        userPoints
    );

    const shippingFee = totalAmount >= 39000 ? 0 : 3000;
    // 최종금액 = 상품 - 쿠폰할인 + 배송비 - 포인트
    const finalAmount = Math.max(0, totalAmount - couponDiscount + shippingFee - pointsUsed);
    // 실제 적용 가능한 최대 포인트 (결제금액 초과 불가)
    const maxUsablePoints = Math.min(
        userPoints,
        Math.max(0, totalAmount - couponDiscount + shippingFee)
    );

    // Load default address from DB
    useEffect(() => {
        const loadDefaultAddress = async () => {
            if (!userEmail) return;
            const { data } = await supabase
                .from('users')
                .select('address, detail_address, zipcode')
                .eq('email', userEmail)
                .maybeSingle();

            if (data && data.address) {
                setShipping(prev => ({
                    ...prev,
                    zipcode: prev.zipcode || data.zipcode || '',
                    address: prev.address || data.address || '',
                    addressDetail: prev.addressDetail || data.detail_address || '',
                }));
            }
        };
        loadDefaultAddress();
    }, [userEmail]);

    // Load user coupons
    useEffect(() => {
        const loadCoupons = async () => {
            if (!userEmail) return;
            const { data } = await supabase
                .from('user_coupons')
                .select('id, coupon_name, discount_amount, min_order_amount, expires_at')
                .eq('user_email', userEmail)
                .eq('is_used', false)
                .gte('expires_at', new Date().toISOString());
            if (data) setCoupons(data);
        };
        loadCoupons();
    }, [userEmail]);

    // Load user points
    useEffect(() => {
        const loadPoints = async () => {
            if (!userEmail) return;
            const { data } = await supabase
                .from('users')
                .select('points')
                .eq('email', userEmail)
                .maybeSingle();
            if (data && typeof data.points === 'number') {
                setUserPoints(data.points);
            }
        };
        loadPoints();
    }, [userEmail]);

    // Re-consent: alert and focus phone input if phone is missing (SNS login without phone permission)
    useEffect(() => {
        if (!userPhone || userPhone.trim() === '') {
            setTimeout(() => {
                alert('연락처 정보가 없습니다. 연락처를 직접 입력해 주세요.');
                phoneInputRef.current?.focus();
            }, 300);
        }
    }, []);

    // Update shipping info when buyer info changes if "Same as Buyer" is checked
    const handleBuyerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBuyer(prev => {
            const newBuyer = { ...prev, [name]: value };
            if (isSameAsBuyer) {
                setShipping(prevShipping => ({ ...prevShipping, [name]: value }));
            }
            return newBuyer;
        });
    };

    const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setShipping(prev => ({ ...prev, [name]: value }));
    };

    const toggleSameAsBuyer = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsSameAsBuyer(checked);
        if (checked) {
            setShipping(prev => ({
                ...prev,
                name: buyer.name,
                phone: buyer.phone,
                email: buyer.email
            }));
        } else {
            // Optional: Clear fields or keep them? Keeping them is usually better UX.
            // setShipping(prev => ({ ...prev, name: '', phone: '', email: '' }));
        }
    };

    const validateForm = (): boolean => {
        if (!buyer.name.trim()) { alert('주문자 이름을 입력해주세요.'); return false; }
        if (!buyer.phone.trim()) { alert('주문자 연락처를 입력해주세요.'); return false; }
        if (!buyer.email.trim()) { alert('주문자 이메일을 입력해주세요.'); return false; }

        if (!shipping.name.trim()) { alert('받으시는 분 이름을 입력해주세요.'); return false; }
        if (!shipping.phone.trim()) { alert('받으시는 분 연락처를 입력해주세요.'); return false; }
        if (!shipping.address.trim()) { alert('주소를 입력해주세요.'); return false; }
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
                totalAmount: finalAmount,
                currency: "CURRENCY_KRW",
                payMethod: "CARD",
                buyer: {
                    name: buyer.name,
                    email: buyer.email,
                    tel: buyer.phone,
                },
                shippingAddress: `${shipping.address} ${shipping.addressDetail}`.trim(),
                shippingMemo: shipping.memo === '__custom__' ? shipping.customMemo : shipping.memo,
                items: items.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
                buyerPostcode: shipping.zipcode,
                receiverName: shipping.name,
                receiverTel: shipping.phone,
                couponDiscount,
                pointsUsed,
                couponId: selectedCouponId,
            };

            const orderId = await requestPayment(paymentData);
            if (orderId) {
                // 재고 차감 (결제 성공 즉시)
                const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
                const { data: stockResult, error: stockError } = await supabase.rpc('deduct_stock', {
                    product_id: 'bodywash-01',
                    qty: totalQty,
                });
                if (stockError) {
                    console.error('[Stock] Deduct failed:', stockError);
                } else if (stockResult && !stockResult.success) {
                    console.warn('[Stock] Deduct returned failure:', stockResult);
                } else {
                    console.log('[Stock] Deducted', totalQty, '| Remaining:', stockResult?.sellable_stock);
                    if (stockResult?.sellable_stock <= 50) {
                        console.warn('[ADMIN ALERT] Low stock! Only', stockResult.sellable_stock, 'left.');
                    }
                }
                // Mark coupon as used
                if (selectedCouponId) {
                    await supabase
                        .from('user_coupons')
                        .update({ is_used: true })
                        .eq('id', selectedCouponId);
                }
                // Deduct points if used (direct DB update, no RPC needed)
                if (pointsUsed > 0 && userEmail) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('points')
                        .eq('email', userEmail)
                        .maybeSingle();
                    if (userData && typeof userData.points === 'number') {
                        const newPoints = Math.max(0, userData.points - pointsUsed);
                        const { error: pointErr } = await supabase
                            .from('users')
                            .update({ points: newPoints })
                            .eq('email', userEmail);
                        if (pointErr) console.error('[Checkout] Point deduction failed:', pointErr);
                    }
                }
                // Save default address if checked
                if (saveAsDefault && userEmail) {
                    console.log('[Checkout] Saving address for email:', userEmail);
                    // Try update first (for existing users)
                    const { data: updated, error: updateErr } = await supabase
                        .from('users')
                        .update({
                            address: shipping.address,
                            detail_address: shipping.addressDetail,
                            zipcode: shipping.zipcode,
                        })
                        .eq('email', userEmail)
                        .select();

                    console.log('[Checkout] Update result:', updated, 'error:', updateErr);

                    // If no row was updated, insert a new one (OAuth users)
                    if (!updateErr && (!updated || updated.length === 0)) {
                        console.log('[Checkout] No existing row, inserting new user');
                        const { error: insertErr } = await supabase
                            .from('users')
                            .insert({
                                username: userEmail.split('@')[0] + '_' + Date.now(),
                                password: 'oauth_user',
                                name: buyer.name,
                                email: userEmail,
                                phone: buyer.phone || '',
                                address: shipping.address,
                                detail_address: shipping.addressDetail,
                                zipcode: shipping.zipcode,
                            });
                        if (insertErr) console.error('[Checkout] Insert error:', insertErr);
                        else console.log('[Checkout] Address inserted successfully');
                    }
                }
                onOrderComplete(orderId, buyer.name, `${shipping.address} ${shipping.addressDetail}`.trim());
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

                    {/* Buyer Info */}
                    <div className="shipping-form" style={{ marginBottom: '20px' }}>
                        <h2 className="section-heading">주문자 정보</h2>
                        <div className="form-group">
                            <label htmlFor="buyer_name">이름 <span className="required">*</span></label>
                            <input
                                id="buyer_name"
                                name="name"
                                type="text"
                                placeholder="이름을 입력해주세요"
                                value={buyer.name}
                                onChange={handleBuyerChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="buyer_phone">연락처 <span className="required">*</span></label>
                            <input
                                id="buyer_phone"
                                name="phone"
                                type="tel"
                                ref={phoneInputRef}
                                placeholder="휴대폰 번호를 입력해주세요"
                                value={buyer.phone}
                                onChange={handleBuyerChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="buyer_email">이메일 <span className="required">*</span></label>
                            <input
                                id="buyer_email"
                                name="email"
                                type="email"
                                placeholder="example@email.com"
                                value={buyer.email}
                                onChange={handleBuyerChange}
                            />
                        </div>
                    </div>

                    {/* Shipping Form */}
                    <div className="shipping-form">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h2 className="section-heading" style={{ marginBottom: 0 }}>배송 정보</h2>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem', color: '#ccc' }}>
                                <input
                                    type="checkbox"
                                    checked={isSameAsBuyer}
                                    onChange={toggleSameAsBuyer}
                                    style={{ width: '16px', height: '16px', accentColor: '#fff' }}
                                />
                                주문자 정보와 동일
                            </label>
                        </div>

                        <div className="form-group">
                            <label htmlFor="name">받으시는 분 <span className="required">*</span></label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="이름을 입력해주세요"
                                value={shipping.name}
                                onChange={handleShippingChange}
                                disabled={isSameAsBuyer}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">연락처 <span className="required">*</span></label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder="01012345678"
                                value={shipping.phone}
                                onChange={handleShippingChange}
                                disabled={isSameAsBuyer}
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
                                        onChange={handleShippingChange}
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
                                onChange={handleShippingChange}
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
                                onChange={handleShippingChange}
                            />
                        </div>
                        <div className="form-group-checkbox">
                            <label className="save-address-label">
                                <input
                                    type="checkbox"
                                    checked={saveAsDefault}
                                    onChange={(e) => setSaveAsDefault(e.target.checked)}
                                />
                                <span>기본 배송지로 저장</span>
                            </label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="memo">배송 메모</label>
                            <select
                                id="memo"
                                name="memo"
                                value={shipping.memo === '__custom__' ? '__custom__' : shipping.memo}
                                onChange={(e) => {
                                    if (e.target.value === '__custom__') {
                                        handleShippingChange({ target: { name: 'memo', value: '__custom__' } } as any);
                                    } else {
                                        handleShippingChange(e);
                                    }
                                }}
                            >
                                <option value="">배송 메모를 선택해주세요</option>
                                <option value="문 앞에 놓아주세요">문 앞에 놓아주세요</option>
                                <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
                                <option value="택배함에 넣어주세요">택배함에 넣어주세요</option>
                                <option value="배송 전 연락 바랍니다">배송 전 연락 바랍니다</option>
                                <option value="부재 시 휴대폰으로 연락 바랍니다">부재 시 휴대폰으로 연락 바랍니다</option>
                                <option value="__custom__">직접 입력</option>
                            </select>
                            {shipping.memo === '__custom__' && (
                                <input
                                    type="text"
                                    name="customMemo"
                                    placeholder="배송 메모를 직접 입력해주세요"
                                    onChange={(e) => {
                                        handleShippingChange({ target: { name: 'customMemo', value: e.target.value } } as any);
                                    }}
                                    style={{ marginTop: '8px' }}
                                />
                            )}
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
                    <div className="coupon-section">
                        <label className="coupon-label">🎟️ 쿠폰 적용</label>
                        {coupons.length > 0 ? (
                            <select
                                className="coupon-select"
                                value={selectedCouponId || ''}
                                onChange={(e) => setSelectedCouponId(e.target.value ? Number(e.target.value) : null)}
                            >
                                <option value="">쿠폰을 선택해주세요</option>
                                {coupons.filter(c => c.min_order_amount <= totalAmount).map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.coupon_name} (-₩{c.discount_amount.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="no-coupon-text">사용 가능한 쿠폰이 없습니다</p>
                        )}
                    </div>
                    {couponDiscount > 0 && (
                        <div className="summary-row coupon-discount-row">
                            <span>쿠폰 할인</span>
                            <span className="coupon-discount-amount">-₩{couponDiscount.toLocaleString()}</span>
                        </div>
                    )}

                    {/* Points Section */}
                    <div className="point-section">
                        <div className="point-header">
                            <label className="point-label">⭐ 포인트 사용</label>
                            <span className="point-balance">잔액: {userPoints.toLocaleString()}P</span>
                        </div>
                        {userPoints > 0 ? (
                            <>
                                <div className="point-input-row">
                                    <input
                                        type="number"
                                        className="point-input"
                                        value={pointsInput}
                                        min={0}
                                        max={maxUsablePoints}
                                        placeholder="0"
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value || '0', 10) || 0;
                                            const clamped = Math.min(Math.max(0, val), maxUsablePoints);
                                            setPointsInput(clamped === 0 ? '' : String(clamped));
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="point-all-btn"
                                        onClick={() => setPointsInput(String(maxUsablePoints))}
                                    >
                                        전액 사용
                                    </button>
                                    <button
                                        type="button"
                                        className="point-reset-btn"
                                        onClick={() => setPointsInput('')}
                                    >
                                        취소
                                    </button>
                                </div>
                                <p className="point-notice">최대 {maxUsablePoints.toLocaleString()}P 사용 가능</p>
                            </>
                        ) : (
                            <p className="no-point-text">사용 가능한 포인트가 없습니다</p>
                        )}
                    </div>

                    {pointsUsed > 0 && (
                        <div className="summary-row point-discount-row">
                            <span>포인트 할인</span>
                            <span className="point-discount-amount">-₩{pointsUsed.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="summary-row">
                        <span>배송비</span>
                        {shippingFee === 0 ? (
                            <span className="free-shipping">무료</span>
                        ) : (
                            <span>₩{shippingFee.toLocaleString()}</span>
                        )}
                    </div>
                    {totalAmount < 39000 && (
                        <p className="shipping-notice">₩{(39000 - totalAmount).toLocaleString()} 더 구매 시 무료배송!</p>
                    )}
                    <div className="summary-divider"></div>
                    <div className="summary-total">
                        <span>최종 결제 금액</span>
                        <span className="total-price">₩{finalAmount.toLocaleString()}</span>
                    </div>
                    <button
                        className="checkout-btn"
                        onClick={handleCheckout}
                        disabled={isProcessing || items.length === 0}
                    >
                        {isProcessing ? '결제 진행 중...' : `₩${finalAmount.toLocaleString()} 결제하기`}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Checkout;
