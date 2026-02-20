import React, { useState, useEffect } from 'react';
import './AdminOrders.css';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { getTrackingUrl } from '../utils/carrierTracking';

interface Order {
    id: string;
    merchant_uid: string;
    amount: number;
    buyer_name: string;
    buyer_tel: string;
    buyer_addr: string;
    buyer_postcode: string;
    receiver_name: string;
    receiver_tel: string;
    order_items: any[];
    status: string;
    tracking_number: string;
    carrier: string;
    shipping_memo: string;
    shipped_at: string;
    created_at: string;
    points_used?: number;
    coupon_id?: number | null;
}

interface AdminOrdersProps {
    onBack: () => void;
    userRole: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    paid: { label: '결제완료', color: '#3498db' },
    shipping: { label: '배송중', color: '#f39c12' },
    delivered: { label: '배송완료', color: '#2ecc71' },
    completed: { label: '구매확정', color: '#27ae60' },
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
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkResult, setBulkResult] = useState<{ total: number; success: number; failed: number; errors: string[] } | null>(null);

    useEffect(() => {
        if (userRole === 'admin') {
            fetchOrders().then(() => autoConfirmOldOrders());
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

    // Auto-confirm orders shipped 7+ days ago
    const autoConfirmOldOrders = async () => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('orders')
            .update({ status: 'completed' })
            .eq('status', 'shipping')
            .not('shipped_at', 'is', null)
            .lt('shipped_at', sevenDaysAgo)
            .select();

        if (!error && data && data.length > 0) {
            console.log(`자동 구매확정: ${data.length}건`);
            setOrders(prev => prev.map(o => {
                const confirmed = data.find((d: any) => d.id === o.id);
                return confirmed ? { ...o, status: 'completed' } : o;
            }));
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        const { data, error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)
            .select();

        if (error) {
            alert('상태 변경 실패: ' + error.message);
        } else if (!data || data.length === 0) {
            alert('상태 변경 실패: 권한이 없거나 해당 주문을 찾을 수 없습니다. Supabase RLS 정책을 확인해주세요.');
            console.error('Update returned 0 rows. Check RLS policies on orders table.');
        } else {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        }
    };

    const handleCancelOrder = async (order: Order) => {
        if (!confirm(`정말 이 주문을 취소하시겠습니까?\n\n결제금액 ${formatCurrency(order.amount)}이 환불됩니다.`)) return;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        try {
            const res = await fetch(`${supabaseUrl}/functions/v1/cancel-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'apikey': supabaseAnonKey,
                },
                body: JSON.stringify({
                    paymentId: order.merchant_uid,
                    orderId: order.id,
                    reason: '관리자 취소',
                }),
            });

            const result = await res.json();

            if (!res.ok || result.error) {
                alert('결제 취소 실패: ' + (result.error || '알 수 없는 오류'));
                return;
            }

            if (result.warning) {
                alert('⚠️ ' + result.warning);
            } else {
                alert('✅ 결제가 취소되었습니다.');
            }

            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));

        } catch (err: any) {
            alert('오류 발생: ' + err.message);
        }
    };

    const saveTracking = async (orderId: string) => {
        if (!trackingInput.carrier || !trackingInput.tracking_number.trim()) {
            alert('택배사와 운송장 번호를 모두 입력해주세요.');
            return;
        }

        const { data, error } = await supabase
            .from('orders')
            .update({
                carrier: trackingInput.carrier,
                tracking_number: trackingInput.tracking_number.trim(),
                status: 'shipping',
                shipped_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .select();

        if (error) {
            alert('송장 저장 실패: ' + error.message);
        } else if (!data || data.length === 0) {
            alert('송장 저장 실패: 권한이 없거나 해당 주문을 찾을 수 없습니다. Supabase RLS 정책을 확인해주세요.');
            console.error('Update returned 0 rows. Check RLS policies on orders table.');
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

    // Excel Download: 결제완료 & 배송준비 주문만 추출
    const downloadExcel = () => {
        const targetOrders = orders.filter(o => o.status === 'paid' || o.status === 'shipping');

        if (targetOrders.length === 0) {
            alert('다운로드할 주문 건이 없습니다. (결제완료/배송중 상태만 추출됩니다)');
            return;
        }

        const rows: any[] = [];
        targetOrders.forEach(order => {
            if (order.order_items && Array.isArray(order.order_items)) {
                order.order_items.forEach((item: any) => {
                    rows.push({
                        '주문번호': order.merchant_uid || '',
                        '주문자명': order.buyer_name || '',
                        '주문자 연락처': order.buyer_tel || '',
                        '수령자명': order.receiver_name || order.buyer_name || '',
                        '수령자 연락처': order.receiver_tel || order.buyer_tel || '',
                        '우편번호': order.buyer_postcode || '',
                        '배송지 주소': order.buyer_addr || '',
                        '주문 상품명': item.name || '',
                        '수량': item.quantity || 1,
                        '배송메세지': order.shipping_memo || '',
                    });
                });
            } else {
                rows.push({
                    '주문번호': order.merchant_uid || '',
                    '주문자명': order.buyer_name || '',
                    '주문자 연락처': order.buyer_tel || '',
                    '수령자명': order.receiver_name || order.buyer_name || '',
                    '수령자 연락처': order.receiver_tel || order.buyer_tel || '',
                    '우편번호': order.buyer_postcode || '',
                    '배송지 주소': order.buyer_addr || '',
                    '주문 상품명': '-',
                    '수량': 1,
                    '배송메세지': order.shipping_memo || '',
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        // 컬럼 너비 자동 조정
        ws['!cols'] = [
            { wch: 18 }, // 주문번호
            { wch: 12 }, // 주문자명
            { wch: 16 }, // 주문자 연락처
            { wch: 12 }, // 수령자명
            { wch: 16 }, // 수령자 연락처
            { wch: 8 },  // 우편번호
            { wch: 40 }, // 주소
            { wch: 30 }, // 상품명
            { wch: 6 },  // 수량
            { wch: 25 }, // 배송메세지
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '주문내역');

        const today = new Date();
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        XLSX.writeFile(wb, `404_주문내역_${dateStr}.xlsx`);
    };

    // 송장 양식 다운로드
    const downloadTrackingTemplate = () => {
        const templateRows = [
            { '주문번호': '', '택배사': 'CJ대한통운', '송장번호': '' },
        ];
        const ws = XLSX.utils.json_to_sheet(templateRows);
        ws['!cols'] = [
            { wch: 30 }, // 주문번호
            { wch: 15 }, // 택배사
            { wch: 20 }, // 송장번호
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '송장등록양식');
        XLSX.writeFile(wb, '404_송장등록_양식.xlsx');
    };

    // 송장 일괄 업로드
    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setBulkUploading(true);
        setBulkResult(null);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet);

            if (rows.length === 0) {
                alert('엑셀 파일에 데이터가 없습니다.');
                setBulkUploading(false);
                return;
            }

            let success = 0;
            let failed = 0;
            const errors: string[] = [];

            for (const row of rows) {
                const merchantUid = String(row['주문번호'] || '').trim();
                const carrier = String(row['택배사'] || '').trim();
                const trackingNumber = String(row['송장번호'] || '').trim();

                if (!merchantUid || !trackingNumber) {
                    failed++;
                    errors.push(`빈 값: 주문번호="${merchantUid}", 송장번호="${trackingNumber}"`);
                    continue;
                }

                const { data, error } = await supabase
                    .from('orders')
                    .update({
                        carrier: carrier || 'CJ대한통운',
                        tracking_number: trackingNumber,
                        status: 'shipping',
                        shipped_at: new Date().toISOString(),
                    })
                    .eq('merchant_uid', merchantUid)
                    .select();

                if (error) {
                    failed++;
                    errors.push(`${merchantUid}: ${error.message}`);
                } else if (!data || data.length === 0) {
                    failed++;
                    errors.push(`${merchantUid}: 주문을 찾을 수 없음`);
                } else {
                    success++;
                }
            }

            setBulkResult({ total: rows.length, success, failed, errors });
            fetchOrders(); // 목록 새로고침
        } catch (err: any) {
            alert('파일 처리 중 오류: ' + err.message);
        } finally {
            setBulkUploading(false);
            // reset file input
            e.target.value = '';
        }
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
                <div className="admin-header-actions">
                    <button className="admin-excel-btn" onClick={downloadExcel}>📥 Excel 다운로드</button>
                    <button className="admin-bulk-btn" onClick={() => setShowBulkModal(true)}>📤 송장 일괄 등록</button>
                    <button className="admin-refresh-btn" onClick={fetchOrders}>🔄 새로고침</button>
                </div>
            </div>

            {/* 송장 일괄 등록 모달 */}
            {showBulkModal && (
                <div className="bulk-modal-overlay" onClick={() => { setShowBulkModal(false); setBulkResult(null); }}>
                    <div className="bulk-modal" onClick={e => e.stopPropagation()}>
                        <h2>📤 송장 일괄 등록</h2>
                        <p className="bulk-desc">택배사에서 발급받은 송장 엑셀을 업로드하면<br />주문 상태가 자동으로 '배송중'으로 변경됩니다.</p>

                        <button className="bulk-template-btn" onClick={downloadTrackingTemplate}>
                            📋 양식 다운로드 (.xlsx)
                        </button>
                        <p className="bulk-hint">필수 컬럼: <strong>주문번호</strong>, <strong>택배사</strong>, <strong>송장번호</strong></p>

                        <label className="bulk-upload-area">
                            {bulkUploading ? (
                                <span>⏳ 처리 중...</span>
                            ) : (
                                <>
                                    <span className="bulk-upload-icon">📂</span>
                                    <span>.xlsx 또는 .csv 파일을 선택하세요</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept=".xlsx,.csv"
                                onChange={handleBulkUpload}
                                disabled={bulkUploading}
                                style={{ display: 'none' }}
                            />
                        </label>

                        {bulkResult && (
                            <div className="bulk-result">
                                <h3>처리 결과</h3>
                                <div className="bulk-result-stats">
                                    <span>총 <strong>{bulkResult.total}</strong>건</span>
                                    <span className="result-success">성공 <strong>{bulkResult.success}</strong>건</span>
                                    <span className="result-failed">실패 <strong>{bulkResult.failed}</strong>건</span>
                                </div>
                                {bulkResult.errors.length > 0 && (
                                    <div className="bulk-errors">
                                        {bulkResult.errors.map((err, i) => (
                                            <div key={i} className="bulk-error-line">⚠️ {err}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button className="bulk-close-btn" onClick={() => { setShowBulkModal(false); setBulkResult(null); }}>
                            닫기
                        </button>
                    </div>
                </div>
            )}

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
                                <th>수령자</th>
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
                                            {order.merchant_uid}
                                        </span>
                                    </td>
                                    <td className="td-buyer">
                                        <div className="buyer-name">{order.buyer_name || '-'}</div>
                                        <div className="buyer-tel">{order.buyer_tel || '-'}</div>
                                    </td>
                                    <td className="td-receiver">
                                        <div className="buyer-name">{order.receiver_name || order.buyer_name || '-'}</div>
                                        <div className="buyer-tel">{order.receiver_tel || order.buyer_tel || '-'}</div>
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
                                    <td className="td-amount">
                                        <div>{formatCurrency(order.amount)}</div>
                                        {order.points_used != null && order.points_used > 0 && (
                                            <div className="discount-badge points-badge">⭐ 포인트 -{formatCurrency(order.points_used)}</div>
                                        )}
                                        {order.coupon_id != null && (
                                            <div className="discount-badge coupon-badge">🎟 쿠폰 적용</div>
                                        )}
                                    </td>
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
                                                        {(() => {
                                                            const url = getTrackingUrl(order.carrier, order.tracking_number);
                                                            return url ? (
                                                                <a
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="tracking-link"
                                                                >
                                                                    {order.tracking_number} 🔗
                                                                </a>
                                                            ) : (
                                                                <div className="tracking-num">{order.tracking_number}</div>
                                                            );
                                                        })()}
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
                                                onClick={() => handleCancelOrder(order)}
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
