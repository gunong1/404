import React, { useState, useEffect } from 'react';
import './AdminOrders.css';
import { supabase } from '../lib/supabase';

interface Order {
    id: string;
    merchant_uid: string;
    amount: number;
    buyer_name: string;
    buyer_tel: string;
    buyer_addr: string;
    buyer_postcode: string;
    order_items: any[];
    status: string;
    tracking_number: string;
    carrier: string;
    created_at: string;
}

interface AdminOrdersProps {
    onBack: () => void;
    userRole: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    paid: { label: '결제완료', color: '#3498db' },
    shipping: { label: '배송중', color: '#f39c12' },
    delivered: { label: '배송완료', color: '#2ecc71' },
    cancelled: { label: '취소', color: '#e74c3c' },
};

const CARRIERS = [
    'CJ대한통운', '한진택배', '롯데택배', '우체국택배',
    'GS25편의점택배', '로젠택배', '경동택배', '기타',
];

const AdminOrders: React.FC<AdminOrdersProps> = ({ onBack, userRole }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [trackingInput, setTrackingInput] = useState({ carrier: '', tracking_number: '' });

    useEffect(() => {
        if (userRole === 'admin') {
            fetchOrders();
        }
    }, [userRole]);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
        } else {
            setOrders(data || []);
        }
        setLoading(false);
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (error) {
            alert('상태 변경 실패: ' + error.message);
        } else {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        }
    };

    const saveTracking = async (orderId: string) => {
        if (!trackingInput.carrier || !trackingInput.tracking_number.trim()) {
            alert('택배사와 운송장 번호를 모두 입력해주세요.');
            return;
        }

        const { error } = await supabase
            .from('orders')
            .update({
                carrier: trackingInput.carrier,
                tracking_number: trackingInput.tracking_number.trim(),
                status: 'shipping',
            })
            .eq('id', orderId);

        if (error) {
            alert('송장 저장 실패: ' + error.message);
        } else {
            setOrders(prev => prev.map(o => o.id === orderId ? {
                ...o,
                carrier: trackingInput.carrier,
                tracking_number: trackingInput.tracking_number.trim(),
                status: 'shipping'
            } : o));
            setEditingId(null);
            setTrackingInput({ carrier: '', tracking_number: '' });
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount) + '원';
    };

    // Access Control
    if (userRole !== 'admin') {
        return (
            <section className="admin-section">
                <div className="admin-denied">
                    <h2>⚠️ 접근 권한이 없습니다</h2>
                    <p>관리자만 이용할 수 있는 페이지입니다.</p>
                    <button onClick={onBack} className="admin-back-btn">홈으로 돌아가기</button>
                </div>
            </section>
        );
    }

    return (
        <section className="admin-section">
            <div className="admin-header">
                <button className="admin-back-btn" onClick={onBack}>← 돌아가기</button>
                <h1>📦 주문 관리</h1>
                <button className="admin-refresh-btn" onClick={fetchOrders}>🔄 새로고침</button>
            </div>

            <div className="admin-stats">
                <div className="stat-card">
                    <span className="stat-label">전체</span>
                    <span className="stat-value">{orders.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">결제완료</span>
                    <span className="stat-value">{orders.filter(o => o.status === 'paid').length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">배송중</span>
                    <span className="stat-value">{orders.filter(o => o.status === 'shipping').length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">배송완료</span>
                    <span className="stat-value">{orders.filter(o => o.status === 'delivered').length}</span>
                </div>
            </div>

            {loading ? (
                <div className="admin-loading">주문 데이터를 불러오는 중...</div>
            ) : orders.length === 0 ? (
                <div className="admin-empty">주문 내역이 없습니다.</div>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>주문일시</th>
                                <th>주문번호</th>
                                <th>주문자</th>
                                <th>배송지</th>
                                <th>상품</th>
                                <th>결제금액</th>
                                <th>상태</th>
                                <th>송장</th>
                                <th>액션</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td className="td-date">{formatDate(order.created_at)}</td>
                                    <td className="td-uid">
                                        <span className="uid-text" title={order.merchant_uid}>
                                            {order.merchant_uid?.slice(0, 16)}...
                                        </span>
                                    </td>
                                    <td className="td-buyer">
                                        <div className="buyer-name">{order.buyer_name || '-'}</div>
                                        <div className="buyer-tel">{order.buyer_tel || '-'}</div>
                                    </td>
                                    <td className="td-addr">
                                        {order.buyer_postcode && <span className="postcode">[{order.buyer_postcode}]</span>}
                                        <span>{order.buyer_addr || '-'}</span>
                                    </td>
                                    <td className="td-items">
                                        {order.order_items && Array.isArray(order.order_items) ? (
                                            order.order_items.map((item: any, idx: number) => (
                                                <div key={idx} className="item-line">
                                                    {item.name} x{item.quantity}
                                                </div>
                                            ))
                                        ) : '-'}
                                    </td>
                                    <td className="td-amount">{formatCurrency(order.amount)}</td>
                                    <td className="td-status">
                                        <span
                                            className="status-badge"
                                            style={{ backgroundColor: STATUS_MAP[order.status]?.color || '#666' }}
                                        >
                                            {STATUS_MAP[order.status]?.label || order.status}
                                        </span>
                                    </td>
                                    <td className="td-tracking">
                                        {editingId === order.id ? (
                                            <div className="tracking-form">
                                                <select
                                                    value={trackingInput.carrier}
                                                    onChange={e => setTrackingInput(p => ({ ...p, carrier: e.target.value }))}
                                                >
                                                    <option value="">택배사 선택</option>
                                                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <input
                                                    type="text"
                                                    placeholder="운송장 번호"
                                                    value={trackingInput.tracking_number}
                                                    onChange={e => setTrackingInput(p => ({ ...p, tracking_number: e.target.value }))}
                                                />
                                                <button className="btn-save" onClick={() => saveTracking(order.id)}>저장</button>
                                                <button className="btn-cancel" onClick={() => setEditingId(null)}>취소</button>
                                            </div>
                                        ) : (
                                            <div className="tracking-info">
                                                {order.carrier && order.tracking_number ? (
                                                    <>
                                                        <div>{order.carrier}</div>
                                                        <div className="tracking-num">{order.tracking_number}</div>
                                                    </>
                                                ) : (
                                                    <span className="no-tracking">미입력</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="td-actions">
                                        {order.status === 'paid' && (
                                            <>
                                                <button
                                                    className="btn-action btn-ship"
                                                    onClick={() => {
                                                        setEditingId(order.id);
                                                        setTrackingInput({
                                                            carrier: order.carrier || '',
                                                            tracking_number: order.tracking_number || ''
                                                        });
                                                    }}
                                                >
                                                    송장입력
                                                </button>
                                            </>
                                        )}
                                        {order.status === 'shipping' && (
                                            <button
                                                className="btn-action btn-complete"
                                                onClick={() => updateStatus(order.id, 'delivered')}
                                            >
                                                배송완료
                                            </button>
                                        )}
                                        {(order.status === 'paid' || order.status === 'shipping') && (
                                            <button
                                                className="btn-action btn-cancel-order"
                                                onClick={() => {
                                                    if (confirm('정말 이 주문을 취소하시겠습니까?')) {
                                                        updateStatus(order.id, 'cancelled');
                                                    }
                                                }}
                                            >
                                                취소
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

export default AdminOrders;
