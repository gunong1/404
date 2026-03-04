import React, { useState, useEffect } from 'react';
import './InventoryDashboard.css';
import { supabase } from '../lib/supabase';

interface Product {
    id: string;
    name: string;
    total_stock: number;
    safe_stock: number;
    sellable_stock: number;
    sold_count: number;
    updated_at: string;
}

const InventoryDashboard: React.FC = () => {
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingSafe, setEditingSafe] = useState(false);
    const [safeInput, setSafeInput] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchProduct = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', 'bodywash-01')
            .maybeSingle();
        if (!error && data) setProduct(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchProduct();
    }, []);

    const handleSafeSave = async () => {
        if (!product) return;
        const newSafe = parseInt(safeInput, 10);
        if (isNaN(newSafe) || newSafe < 0) {
            alert('올바른 숫자를 입력해주세요.');
            return;
        }
        if (newSafe > product.total_stock) {
            alert('안전 재고는 총생산량을 초과할 수 없습니다.');
            return;
        }
        setSaving(true);
        const newSellable = product.total_stock - newSafe - product.sold_count;
        const { error } = await supabase
            .from('products')
            .update({
                safe_stock: newSafe,
                sellable_stock: Math.max(0, newSellable),
                updated_at: new Date().toISOString(),
            })
            .eq('id', 'bodywash-01');
        if (error) {
            alert('저장 실패: ' + error.message);
        } else {
            await fetchProduct();
            setEditingSafe(false);
        }
        setSaving(false);
    };

    const isLowStock = product && product.sellable_stock <= 50 && product.sellable_stock > 0;
    const isSoldOut = product && product.sellable_stock === 0;

    if (loading) {
        return (
            <div className="inv-loading">
                <span className="inv-spinner" />
                재고 데이터를 불러오는 중...
            </div>
        );
    }

    if (!product) {
        return (
            <div className="inv-error">
                ⚠️ 재고 데이터를 불러올 수 없습니다. Supabase에 <code>products</code> 테이블을 생성해주세요.
            </div>
        );
    }

    return (
        <div className="inv-dashboard">
            <div className="inv-header">
                <h2 className="inv-title">재고 현황</h2>
                <div className="inv-meta">
                    <span className="inv-product-name">{product.name}</span>
                    <span className="inv-updated">
                        최근 업데이트: {new Date(product.updated_at).toLocaleString('ko-KR')}
                    </span>
                    <button className="inv-refresh-btn" onClick={fetchProduct}>↻ 새로고침</button>
                </div>
            </div>

            <div className="inv-cards">
                {/* 판매 가능 재고 */}
                <div className={`inv-card ${isSoldOut ? 'inv-card--soldout' : isLowStock ? 'inv-card--low' : ''}`}>
                    <span className="inv-card-label">판매 가능 재고</span>
                    <span className="inv-card-value">{product.sellable_stock.toLocaleString()}</span>
                    <span className="inv-card-unit">개</span>
                    {isSoldOut && <span className="inv-card-badge inv-badge--soldout">품절</span>}
                    {isLowStock && <span className="inv-card-badge inv-badge--low">⚠ 재고 부족</span>}
                    <div className="inv-card-sub">총 생산량 {product.total_stock.toLocaleString()}개 중</div>
                </div>

                {/* CS용 안전 재고 */}
                <div className="inv-card inv-card--safe">
                    <span className="inv-card-label">CS / 불량 안전 재고</span>
                    {editingSafe ? (
                        <div className="inv-edit-row">
                            <input
                                className="inv-safe-input"
                                type="number"
                                value={safeInput}
                                min={0}
                                onChange={e => setSafeInput(e.target.value)}
                                autoFocus
                            />
                            <button
                                className="inv-save-btn"
                                onClick={handleSafeSave}
                                disabled={saving}
                            >
                                {saving ? '저장 중...' : '저장'}
                            </button>
                            <button
                                className="inv-cancel-btn"
                                onClick={() => setEditingSafe(false)}
                                disabled={saving}
                            >
                                취소
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className="inv-card-value">{product.safe_stock.toLocaleString()}</span>
                            <span className="inv-card-unit">개</span>
                            <button
                                className="inv-edit-btn"
                                onClick={() => { setSafeInput(String(product.safe_stock)); setEditingSafe(true); }}
                            >
                                ✏ 수정
                            </button>
                        </>
                    )}
                    <div className="inv-card-sub">CS 및 불량 대응용 예비 재고</div>
                </div>

                {/* 누적 판매량 */}
                <div className="inv-card inv-card--sold">
                    <span className="inv-card-label">누적 판매량</span>
                    <span className="inv-card-value">{product.sold_count.toLocaleString()}</span>
                    <span className="inv-card-unit">개</span>
                    <div className="inv-card-sub">
                        판매율 {product.total_stock > 0
                            ? Math.round((product.sold_count / product.total_stock) * 100)
                            : 0}%
                    </div>
                </div>
            </div>

            {/* 저재고 경고 배너 */}
            {isLowStock && (
                <div className="inv-alert">
                    ⚠ 판매 가능 재고가 <strong>{product.sellable_stock}개</strong> 남았습니다.
                    재고 보충을 검토해주세요.
                </div>
            )}
            {isSoldOut && (
                <div className="inv-alert inv-alert--soldout">
                    🚫 재고가 <strong>모두 소진</strong>되었습니다. 상품 페이지에 품절 안내가 표시됩니다.
                </div>
            )}
        </div>
    );
};

export default InventoryDashboard;
