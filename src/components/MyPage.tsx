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

interface MyPageProps {
    onBack: () => void;
    username: string;
    userEmail?: string;
    savedAddress?: SavedAddress;
    onAddressChange?: (addr: SavedAddress) => void;
}

const MyPage: React.FC<MyPageProps> = ({ onBack, username, userEmail, savedAddress, onAddressChange }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditingAddr, setIsEditingAddr] = useState(false);
    const [addrForm, setAddrForm] = useState<SavedAddress>(
        savedAddress || { zipcode: '', address: '', addressDetail: '' }
    );
    const [localAddress, setLocalAddress] = useState<SavedAddress | undefined>(savedAddress);

    // Load address from DB on mount
    useEffect(() => {
        fetchOrders();
        if (userEmail) {
            supabase
                .from('users')
                .select('address, detail_address, zipcode')
                .eq('email', userEmail)
                .maybeSingle()
                .then(({ data }) => {
                    if (data && data.address) {
                        const addr = {
                            zipcode: data.zipcode || '',
                            address: data.address || '',
                            addressDetail: data.detail_address || '',
                        };
                        setLocalAddress(addr);
                        setAddrForm(addr);
                    }
                });
        }
    }, [userEmail]);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

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
        // Save to DB directly
        if (userEmail) {
            const { error } = await supabase
                .from('users')
                .upsert({
                    email: userEmail,
                    address: addrForm.address,
                    detail_address: addrForm.addressDetail,
                    zipcode: addrForm.zipcode,
                }, { onConflict: 'email' });
            if (error) {
                console.error('Address save error:', error);
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

            {/* 배송지 관리 */}
            <div className="address-section">
                <h2 className="section-title">
                    🏠 배송지 관리
                </h2>
                {!isEditingAddr ? (
                    <div className="address-card">
                        {hasAddress ? (
                            <>
                                <div className="address-info">
                                    <span className="address-badge">기본 배송지</span>
                                    <p className="address-text">
                                        [{localAddress!.zipcode}] {localAddress!.address}
                                    </p>
                                    {localAddress!.addressDetail && (
                                        <p className="address-detail-text">{localAddress!.addressDetail}</p>
                                    )}
                                </div>
                                <button className="address-edit-btn" onClick={() => {
                                    setAddrForm(localAddress!);
                                    setIsEditingAddr(true);
                                }}>
                                    수정
                                </button>
                            </>
                        ) : (
                            <div className="address-empty">
                                <p>등록된 배송지가 없습니다</p>
                                <button className="address-add-btn" onClick={() => setIsEditingAddr(true)}>
                                    + 배송지 등록
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="address-form-card">
                        <div className="addr-form-group">
                            <label>우편번호</label>
                            <div className="addr-zipcode-row">
                                <input
                                    type="text"
                                    value={addrForm.zipcode}
                                    readOnly
                                    placeholder="우편번호"
                                />
                                <button type="button" onClick={handleSearchAddress}>
                                    주소 검색
                                </button>
                            </div>
                        </div>
                        <div className="addr-form-group">
                            <label>주소</label>
                            <input
                                type="text"
                                value={addrForm.address}
                                readOnly
                                placeholder="주소 검색을 눌러주세요"
                            />
                        </div>
                        <div className="addr-form-group">
                            <label>상세주소</label>
                            <input
                                type="text"
                                value={addrForm.addressDetail}
                                onChange={(e) => setAddrForm(prev => ({ ...prev, addressDetail: e.target.value }))}
                                placeholder="상세주소를 입력하세요"
                            />
                        </div>
                        <div className="addr-form-actions">
                            <button className="addr-cancel-btn" onClick={() => setIsEditingAddr(false)}>취소</button>
                            <button className="addr-save-btn" onClick={handleSaveAddress}>저장</button>
                        </div>
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
