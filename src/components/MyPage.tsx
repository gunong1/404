import React, { useState, useEffect } from 'react';
import './MyPage.css';
import { supabase } from '../lib/supabase';
import { getTrackingUrl } from '../utils/carrierTracking';

interface Order {
    id: string;
    merchant_uid: string;
    amount: number;
    buyer_name: string;
    buyer_tel: string;
    buyer_addr: string;
    status: string;
    carrier: string;
    tracking_number: string;
    created_at: string;
}

interface SavedAddress {
    zipcode: string;
    address: string;
    addressDetail: string;
}

interface Coupon {
    id: number;
    coupon_name: string;
    discount_amount: number;
    min_order_amount: number;
    is_used: boolean;
    expires_at: string;
    created_at: string;
}

interface MyPageProps {
    onBack: () => void;
    username: string;
    userEmail?: string;
    userPhone?: string;
    savedAddress?: SavedAddress;
    onAddressChange?: (addr: SavedAddress) => void;
    onPhoneChange?: (phone: string) => void;
}

const MyPage: React.FC<MyPageProps> = ({ onBack, username, userEmail, userPhone, savedAddress, onAddressChange, onPhoneChange }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditingAddr, setIsEditingAddr] = useState(false);
    const [addrForm, setAddrForm] = useState<SavedAddress>(
        savedAddress || { zipcode: '', address: '', addressDetail: '' }
    );
    const [localAddress, setLocalAddress] = useState<SavedAddress | undefined>(savedAddress);
    const [coupons, setCoupons] = useState<Coupon[]>([]);

    // Profile edit states
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [phoneForm, setPhoneForm] = useState(userPhone || '');
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', newPw: '', confirm: '' });
    const [passwordMsg, setPasswordMsg] = useState('');
    const [isOAuthUser, setIsOAuthUser] = useState(false);

    // Load address from DB on mount
    useEffect(() => {
        fetchOrders();
        if (userEmail) {
            supabase
                .from('users')
                .select('address, detail_address, zipcode, phone, password')
                .eq('email', userEmail)
                .maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        if (data.address) {
                            const addr = {
                                zipcode: data.zipcode || '',
                                address: data.address || '',
                                addressDetail: data.detail_address || '',
                            };
                            setLocalAddress(addr);
                            setAddrForm(addr);
                        }
                        if (data.phone) {
                            setPhoneForm(data.phone);
                        }
                        // OAuth users have 'oauth_user' as password
                        if (!data.password || data.password === 'oauth_user') {
                            setIsOAuthUser(true);
                        }
                    } else {
                        // No user row in DB = OAuth user who hasn't saved any info yet
                        setIsOAuthUser(true);
                    }
                });

            // Load coupons (only unused)
            supabase
                .from('user_coupons')
                .select('*')
                .eq('user_email', userEmail)
                .eq('is_used', false)
                .order('created_at', { ascending: false })
                .then(({ data }) => {
                    if (data) setCoupons(data);
                });
        }
    }, [userEmail]);

    const fetchOrders = async () => {
        try {
            let query = supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (userEmail) {
                query = query.eq('buyer_email', userEmail);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching orders:', error);
            } else {
                setOrders(data || []);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusText = (status: string) => {
        const map: Record<string, { label: string; className: string }> = {
            paid: { label: '결제완료', className: 'status-paid' },
            shipping: { label: '배송중', className: 'status-shipping' },
            delivered: { label: '배송완료', className: 'status-delivered' },
            completed: { label: '구매확정', className: 'status-completed' },
            cancelled: { label: '취소됨', className: 'status-cancelled' },
        };
        return map[status] || { label: status, className: '' };
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    const handleSearchAddress = () => {
        new (window as any).daum.Postcode({
            oncomplete: (data: any) => {
                setAddrForm(prev => ({
                    ...prev,
                    zipcode: data.zonecode,
                    address: data.roadAddress || data.jibunAddress,
                }));
            }
        }).open();
    };

    const handleSaveAddress = async () => {
        if (!addrForm.address.trim()) {
            alert('주소를 검색해주세요.');
            return;
        }
        if (userEmail) {
            const { data: updated, error: updateErr } = await supabase
                .from('users')
                .update({
                    address: addrForm.address,
                    detail_address: addrForm.addressDetail,
                    zipcode: addrForm.zipcode,
                })
                .eq('email', userEmail)
                .select();

            if (!updateErr && (!updated || updated.length === 0)) {
                const { error: insertErr } = await supabase
                    .from('users')
                    .insert({
                        username: userEmail.split('@')[0] + '_' + Date.now(),
                        password: 'oauth_user',
                        name: username,
                        email: userEmail,
                        phone: '',
                        address: addrForm.address,
                        detail_address: addrForm.addressDetail,
                        zipcode: addrForm.zipcode,
                    });
                if (insertErr) {
                    console.error('Address insert error:', insertErr);
                    alert('주소 저장 중 오류가 발생했습니다.');
                    return;
                }
            } else if (updateErr) {
                console.error('Address update error:', updateErr);
                alert('주소 저장 중 오류가 발생했습니다.');
                return;
            }
        }
        setLocalAddress(addrForm);
        if (onAddressChange) {
            onAddressChange(addrForm);
        }
        setIsEditingAddr(false);
        alert('배송지가 저장되었습니다.');
    };

    const handleSavePhone = async () => {
        const cleaned = phoneForm.replace(/[^0-9]/g, '');
        if (!cleaned || cleaned.length < 10) {
            alert('올바른 전화번호를 입력해주세요.');
            return;
        }
        if (userEmail) {
            const { error } = await supabase
                .from('users')
                .update({ phone: cleaned })
                .eq('email', userEmail);
            if (error) {
                alert('전화번호 저장 중 오류가 발생했습니다.');
                return;
            }
        }
        setPhoneForm(cleaned);
        if (onPhoneChange) onPhoneChange(cleaned);
        setIsEditingPhone(false);
        alert('전화번호가 변경되었습니다.');
    };

    const handleChangePassword = async () => {
        if (!passwordForm.current) {
            alert('현재 비밀번호를 입력해주세요.');
            return;
        }
        if (!passwordForm.newPw || !passwordForm.confirm) {
            alert('새 비밀번호를 입력해주세요.');
            return;
        }
        if (passwordForm.newPw !== passwordForm.confirm) {
            alert('새 비밀번호가 일치하지 않습니다.');
            return;
        }
        const isValid = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*?_~]).{8,}$/.test(passwordForm.newPw);
        if (!isValid) {
            alert('비밀번호는 영문+숫자+특수문자 포함 8자 이상이어야 합니다.');
            return;
        }

        // Verify current password
        if (userEmail) {
            const { data: user } = await supabase
                .from('users')
                .select('password')
                .eq('email', userEmail)
                .maybeSingle();

            if (!user || user.password !== passwordForm.current) {
                alert('현재 비밀번호가 일치하지 않습니다.');
                return;
            }

            const { error } = await supabase
                .from('users')
                .update({ password: passwordForm.newPw })
                .eq('email', userEmail);

            if (error) {
                alert('비밀번호 변경 중 오류가 발생했습니다.');
                return;
            }
        }

        setPasswordForm({ current: '', newPw: '', confirm: '' });
        setPasswordMsg('');
        setIsEditingPassword(false);
        alert('비밀번호가 변경되었습니다.');
    };

    const hasAddress = localAddress && localAddress.address;

    const handleConfirmPurchase = async (orderId: string) => {
        if (!confirm('구매를 확정하시겠습니까? 확정 후에는 반품/환불이 어려울 수 있습니다.')) return;

        const { data, error } = await supabase
            .from('orders')
            .update({ status: 'completed' })
            .eq('id', orderId)
            .select();

        if (error) {
            alert('구매 확정 실패: ' + error.message);
        } else if (!data || data.length === 0) {
            alert('구매 확정 실패: 권한이 없습니다.');
        } else {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
            alert('구매가 확정되었습니다. 감사합니다!');
        }
    };

    return (
        <section className="mypage-section">
            <button className="back-btn" onClick={onBack}>&larr; 홈으로</button>

            <div className="mypage-header">
                <div className="user-avatar">
                    {username.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                    <h1 className="mypage-title">{username}님</h1>
                    <p className="mypage-subtitle">주문 내역을 확인하세요</p>
                </div>
            </div>

            {/* 개인정보 수정 */}
            <div className="profile-section">
                <h2 className="section-title">⚙️ 개인정보 수정</h2>

                {/* 전화번호 수정 */}
                <div className="profile-card">
                    <div className="profile-row">
                        <span className="profile-label">📱 전화번호</span>
                        {!isEditingPhone ? (
                            <div className="profile-value-row">
                                <span className="profile-value">{phoneForm || '등록된 전화번호가 없습니다'}</span>
                                <button className="profile-edit-btn" onClick={() => setIsEditingPhone(true)}>
                                    수정
                                </button>
                            </div>
                        ) : (
                            <div className="profile-edit-form">
                                <input
                                    type="tel"
                                    value={phoneForm}
                                    onChange={(e) => setPhoneForm(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="01012345678"
                                    className="profile-input"
                                />
                                <div className="profile-edit-actions">
                                    <button className="addr-cancel-btn" onClick={() => {
                                        setPhoneForm(userPhone || '');
                                        setIsEditingPhone(false);
                                    }}>취소</button>
                                    <button className="addr-save-btn" onClick={handleSavePhone}>저장</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 비밀번호 변경 */}
                <div className="profile-card">
                    <div className="profile-row">
                        <span className="profile-label">🔒 비밀번호</span>
                        {isOAuthUser ? (
                            <div className="profile-value-row">
                                <span className="profile-value oauth-note">소셜 로그인 계정은 비밀번호 변경이 불가합니다</span>
                            </div>
                        ) : !isEditingPassword ? (
                            <div className="profile-value-row">
                                <span className="profile-value">••••••••</span>
                                <button className="profile-edit-btn" onClick={() => setIsEditingPassword(true)}>
                                    변경
                                </button>
                            </div>
                        ) : (
                            <div className="profile-edit-form">
                                <input
                                    type="password"
                                    value={passwordForm.current}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                                    placeholder="현재 비밀번호"
                                    className="profile-input"
                                />
                                <input
                                    type="password"
                                    value={passwordForm.newPw}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setPasswordForm(prev => ({ ...prev, newPw: val }));
                                        const isValid = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*?_~]).{8,}$/.test(val);
                                        setPasswordMsg(val ? (isValid ? '사용 가능한 안전한 비밀번호입니다.' : '영문+숫자+특수문자 포함 8자 이상') : '');
                                    }}
                                    placeholder="새 비밀번호"
                                    className="profile-input"
                                />
                                {passwordMsg && (
                                    <span className={`password-hint ${/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*?_~]).{8,}$/.test(passwordForm.newPw) ? 'valid' : 'invalid'}`}>
                                        {passwordMsg}
                                    </span>
                                )}
                                <input
                                    type="password"
                                    value={passwordForm.confirm}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                                    placeholder="새 비밀번호 확인"
                                    className="profile-input"
                                />
                                <div className="profile-edit-actions">
                                    <button className="addr-cancel-btn" onClick={() => {
                                        setPasswordForm({ current: '', newPw: '', confirm: '' });
                                        setPasswordMsg('');
                                        setIsEditingPassword(false);
                                    }}>취소</button>
                                    <button className="addr-save-btn" onClick={handleChangePassword}>변경</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 배송지 관리 */}
                <div className="profile-card">
                    <div className="profile-row">
                        <span className="profile-label">🏠 배송지</span>
                        {!isEditingAddr ? (
                            <div className="profile-value-row">
                                {hasAddress ? (
                                    <>
                                        <div className="address-info-compact">
                                            <span className="address-badge">기본 배송지</span>
                                            <p className="profile-value">
                                                [{localAddress!.zipcode}] {localAddress!.address}
                                                {localAddress!.addressDetail && ` ${localAddress!.addressDetail}`}
                                            </p>
                                        </div>
                                        <button className="profile-edit-btn" onClick={() => {
                                            setAddrForm(localAddress!);
                                            setIsEditingAddr(true);
                                        }}>수정</button>
                                    </>
                                ) : (
                                    <>
                                        <span className="profile-value">등록된 배송지가 없습니다</span>
                                        <button className="profile-edit-btn" onClick={() => setIsEditingAddr(true)}>등록</button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="profile-edit-form">
                                <div className="addr-zipcode-row">
                                    <input
                                        type="text"
                                        value={addrForm.zipcode}
                                        readOnly
                                        placeholder="우편번호"
                                        className="profile-input"
                                    />
                                    <button type="button" className="addr-search-btn" onClick={handleSearchAddress}>
                                        주소 검색
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={addrForm.address}
                                    readOnly
                                    placeholder="주소 검색을 눌러주세요"
                                    className="profile-input"
                                />
                                <input
                                    type="text"
                                    value={addrForm.addressDetail}
                                    onChange={(e) => setAddrForm(prev => ({ ...prev, addressDetail: e.target.value }))}
                                    placeholder="상세주소를 입력하세요"
                                    className="profile-input"
                                />
                                <div className="profile-edit-actions">
                                    <button className="addr-cancel-btn" onClick={() => setIsEditingAddr(false)}>취소</button>
                                    <button className="addr-save-btn" onClick={handleSaveAddress}>저장</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 나의 쿠폰함 */}
            <div className="coupon-box-section">
                <h2 className="section-title">
                    🎟️ 나의 쿠폰함
                    <span className="order-count">{coupons.filter(c => !c.is_used && new Date(c.expires_at) > new Date()).length}장</span>
                </h2>
                {coupons.length === 0 ? (
                    <div className="coupon-empty">
                        <p>보유 중인 쿠폰이 없습니다</p>
                    </div>
                ) : (
                    <div className="coupon-list">
                        {coupons.map((coupon) => {
                            const isExpired = new Date(coupon.expires_at) <= new Date();
                            const isUsable = !coupon.is_used && !isExpired;
                            return (
                                <div key={coupon.id} className={`coupon-card ${!isUsable ? 'coupon-disabled' : ''}`}>
                                    <div className="coupon-card-left">
                                        <span className="coupon-amount">₩{coupon.discount_amount.toLocaleString()}</span>
                                        <span className="coupon-name-tag">{coupon.coupon_name}</span>
                                    </div>
                                    <div className="coupon-card-right">
                                        {coupon.min_order_amount > 0 && (
                                            <span className="coupon-condition">₩{coupon.min_order_amount.toLocaleString()} 이상 구매 시</span>
                                        )}
                                        <span className="coupon-expiry">
                                            {isExpired ? '기간 만료' : `~ ${new Date(coupon.expires_at).toLocaleDateString('ko-KR')}`}
                                        </span>
                                        {coupon.is_used && <span className="coupon-used-badge">사용 완료</span>}
                                        {isUsable && <span className="coupon-active-badge">사용 가능</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="orders-section">
                <h2 className="section-title">
                    주문 내역
                    <span className="order-count">{orders.length}건</span>
                </h2>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>주문 내역을 불러오는 중...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <p className="empty-title">아직 주문 내역이 없습니다</p>
                        <p className="empty-desc">첫 번째 주문을 해보세요!</p>
                        <button className="shop-btn" onClick={onBack}>쇼핑하러 가기</button>
                    </div>
                ) : (
                    <div className="order-list">
                        {orders.map((order) => {
                            const statusInfo = getStatusText(order.status);
                            return (
                                <div key={order.id} className="order-card">
                                    <div className="order-card-header">
                                        <div className="order-date">
                                            {formatDate(order.created_at)}
                                        </div>
                                        <span className={`order-status ${statusInfo.className}`}>
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    <div className="order-card-body">
                                        <div className="order-detail-row">
                                            <span className="order-label">주문번호</span>
                                            <span className="order-value mono">{order.merchant_uid}</span>
                                        </div>
                                        <div className="order-detail-row">
                                            <span className="order-label">주문자</span>
                                            <span className="order-value">{order.buyer_name || '-'}</span>
                                        </div>
                                        <div className="order-detail-row">
                                            <span className="order-label">배송지</span>
                                            <span className="order-value addr">{order.buyer_addr || '-'}</span>
                                        </div>
                                        <div className="order-detail-row">
                                            <span className="order-label">연락처</span>
                                            <span className="order-value">{order.buyer_tel || '-'}</span>
                                        </div>
                                        {order.carrier && order.tracking_number && (
                                            <div className="order-detail-row">
                                                <span className="order-label">배송추적</span>
                                                <span className="order-value">
                                                    {(() => {
                                                        const url = getTrackingUrl(order.carrier, order.tracking_number);
                                                        return url ? (
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="tracking-link"
                                                            >
                                                                {order.carrier} {order.tracking_number} 🔗
                                                            </a>
                                                        ) : (
                                                            <span>{order.carrier} {order.tracking_number}</span>
                                                        );
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="order-card-footer">
                                        <span className="order-amount">₩{order.amount.toLocaleString()}</span>
                                        {(order.status === 'shipping' || order.status === 'delivered') && (
                                            <button
                                                className="confirm-purchase-btn"
                                                onClick={() => handleConfirmPurchase(order.id)}
                                            >
                                                ✅ 구매 확정
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default MyPage;
