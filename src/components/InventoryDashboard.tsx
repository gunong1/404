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

type EditField = 'name' | 'sellable' | 'safe' | null;

interface EditState {
    productId: string;
    field: EditField;
    value: string;
}

const InventoryDashboard: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [edit, setEdit] = useState<EditState | null>(null);

    // 신규 품목 추가 폼
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProduct, setNewProduct] = useState({
        id: '',
        name: '',
        total_stock: '',
        safe_stock: '',
    });

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('updated_at', { ascending: false });
        if (!error && data) setProducts(data);
        setLoading(false);
    };

    useEffect(() => { fetchProducts(); }, []);

    // 인라인 편집 저장
    const handleSave = async () => {
        if (!edit) return;
        const product = products.find(p => p.id === edit.productId);
        if (!product) return;
        setSaving(true);

        let updatePayload: Partial<Product> & { updated_at: string } = { updated_at: new Date().toISOString() };

        if (edit.field === 'name') {
            const val = edit.value.trim();
            if (!val) { alert('품목명을 입력해주세요.'); setSaving(false); return; }
            updatePayload.name = val;
        } else if (edit.field === 'safe') {
            const val = parseInt(edit.value, 10);
            if (isNaN(val) || val < 0) { alert('올바른 숫자를 입력해주세요.'); setSaving(false); return; }
            updatePayload.safe_stock = val;
            // sellable = total - safe - sold
            updatePayload.sellable_stock = Math.max(0, product.total_stock - val - product.sold_count);
        } else if (edit.field === 'sellable') {
            const val = parseInt(edit.value, 10);
            if (isNaN(val) || val < 0) { alert('올바른 숫자를 입력해주세요.'); setSaving(false); return; }
            updatePayload.sellable_stock = val;
            // total = sellable + safe + sold
            updatePayload.total_stock = val + product.safe_stock + product.sold_count;
        }

        const { error } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', edit.productId);

        if (error) {
            alert('저장 실패: ' + error.message);
        } else {
            await fetchProducts();
            setEdit(null);
        }
        setSaving(false);
    };

    const startEdit = (productId: string, field: EditField, currentValue: string) => {
        setEdit({ productId, field, value: currentValue });
    };

    // 신규 품목 추가
    const handleAddProduct = async () => {
        const id = newProduct.id.trim();
        const name = newProduct.name.trim();
        const total = parseInt(newProduct.total_stock, 10);
        const safe = parseInt(newProduct.safe_stock, 10) || 0;

        if (!id) { alert('품목 ID를 입력해주세요. (영문/숫자, 예: bodywash-02)'); return; }
        if (!name) { alert('품목명을 입력해주세요.'); return; }
        if (isNaN(total) || total <= 0) { alert('총생산량을 올바르게 입력해주세요.'); return; }

        setSaving(true);
        const { error } = await supabase.from('products').insert({
            id,
            name,
            total_stock: total,
            safe_stock: safe,
            sellable_stock: Math.max(0, total - safe),
            sold_count: 0,
            updated_at: new Date().toISOString(),
        });

        if (error) {
            if (error.code === '23505') alert('이미 존재하는 품목 ID입니다.');
            else alert('추가 실패: ' + error.message);
        } else {
            await fetchProducts();
            setShowAddForm(false);
            setNewProduct({ id: '', name: '', total_stock: '', safe_stock: '' });
        }
        setSaving(false);
    };

    const isLow = (p: Product) => p.sellable_stock > 0 && p.sellable_stock <= 50;
    const isSoldOut = (p: Product) => p.sellable_stock === 0;

    if (loading) {
        return (
            <div className="inv-loading">
                <span className="inv-spinner" />재고 데이터를 불러오는 중...
            </div>
        );
    }

    const renderCell = (product: Product, field: EditField, currentValue: string, displayValue: React.ReactNode) => {
        const isEditing = edit?.productId === product.id && edit?.field === field;
        if (isEditing) {
            return (
                <div className="inv-edit-row">
                    <input
                        className="inv-safe-input"
                        type={field === 'name' ? 'text' : 'number'}
                        value={edit.value}
                        onChange={e => setEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEdit(null); }}
                    />
                    <button className="inv-save-btn" onClick={handleSave} disabled={saving}>{saving ? '…' : '저장'}</button>
                    <button className="inv-cancel-btn" onClick={() => setEdit(null)} disabled={saving}>취소</button>
                </div>
            );
        }
        return (
            <div className="inv-value-row">
                <span className="inv-card-value">{displayValue}</span>
                <button className="inv-edit-btn" onClick={() => startEdit(product.id, field, currentValue)}>✏</button>
            </div>
        );
    };

    return (
        <div className="inv-dashboard">
            <div className="inv-header">
                <h2 className="inv-title">재고 현황</h2>
                <div className="inv-meta">
                    <button className="inv-refresh-btn" onClick={fetchProducts}>↻ 새로고침</button>
                    <button className="inv-add-btn" onClick={() => setShowAddForm(v => !v)}>
                        {showAddForm ? '✕ 닫기' : '+ 품목 추가'}
                    </button>
                </div>
            </div>

            {/* 신규 품목 추가 폼 */}
            {showAddForm && (
                <div className="inv-add-form">
                    <h3 className="inv-add-title">새 품목 추가</h3>
                    <div className="inv-add-row">
                        <div className="inv-add-field">
                            <label>품목 ID <span className="inv-required">*</span></label>
                            <input
                                className="inv-add-input"
                                type="text"
                                placeholder="예: bodywash-02"
                                value={newProduct.id}
                                onChange={e => setNewProduct(p => ({ ...p, id: e.target.value }))}
                            />
                        </div>
                        <div className="inv-add-field">
                            <label>품목명 <span className="inv-required">*</span></label>
                            <input
                                className="inv-add-input"
                                type="text"
                                placeholder="예: 404 샴푸"
                                value={newProduct.name}
                                onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div className="inv-add-field">
                            <label>총 생산량 <span className="inv-required">*</span></label>
                            <input
                                className="inv-add-input"
                                type="number"
                                placeholder="500"
                                value={newProduct.total_stock}
                                onChange={e => setNewProduct(p => ({ ...p, total_stock: e.target.value }))}
                            />
                        </div>
                        <div className="inv-add-field">
                            <label>안전 재고</label>
                            <input
                                className="inv-add-input"
                                type="number"
                                placeholder="10"
                                value={newProduct.safe_stock}
                                onChange={e => setNewProduct(p => ({ ...p, safe_stock: e.target.value }))}
                            />
                        </div>
                    </div>
                    <button className="inv-add-submit-btn" onClick={handleAddProduct} disabled={saving}>
                        {saving ? '추가 중...' : '품목 추가하기'}
                    </button>
                </div>
            )}

            {/* 품목이 없을 때 */}
            {products.length === 0 && (
                <div className="inv-error">
                    ⚠️ 재고 데이터가 없습니다. Supabase에 <code>products</code> 테이블을 생성하거나 품목을 추가해주세요.
                </div>
            )}

            {/* 품목별 카드 */}
            {products.map(product => (
                <div key={product.id} className={`inv-product-block ${isSoldOut(product) ? 'inv-block--soldout' : isLow(product) ? 'inv-block--low' : ''}`}>
                    {/* 품목 헤더 */}
                    <div className="inv-product-header">
                        <div className="inv-product-name-row">
                            {renderCell(product, 'name', product.name,
                                <span className="inv-product-label">{product.name}</span>
                            )}
                            <span className="inv-product-id">#{product.id}</span>
                        </div>
                        <span className="inv-updated">
                            {new Date(product.updated_at).toLocaleString('ko-KR')}
                        </span>
                    </div>

                    <div className="inv-cards">
                        {/* 판매 가능 재고 */}
                        <div className={`inv-card ${isSoldOut(product) ? 'inv-card--soldout' : isLow(product) ? 'inv-card--low' : ''}`}>
                            <span className="inv-card-label">판매 가능 재고</span>
                            {renderCell(product, 'sellable', String(product.sellable_stock),
                                <>{product.sellable_stock.toLocaleString()}<span className="inv-card-unit-inline">개</span></>
                            )}
                            {isSoldOut(product) && <span className="inv-card-badge inv-badge--soldout">품절</span>}
                            {isLow(product) && <span className="inv-card-badge inv-badge--low">⚠ 재고 부족</span>}
                            <div className="inv-card-sub">총 생산량 {product.total_stock.toLocaleString()}개 중</div>
                        </div>

                        {/* CS 안전 재고 */}
                        <div className="inv-card inv-card--safe">
                            <span className="inv-card-label">CS / 불량 안전 재고</span>
                            {renderCell(product, 'safe', String(product.safe_stock),
                                <>{product.safe_stock.toLocaleString()}<span className="inv-card-unit-inline">개</span></>
                            )}
                            <div className="inv-card-sub">CS 및 불량 대응용 예비 재고</div>
                        </div>

                        {/* 누적 판매량 */}
                        <div className="inv-card inv-card--sold">
                            <span className="inv-card-label">누적 판매량</span>
                            <div className="inv-value-row">
                                <span className="inv-card-value">{product.sold_count.toLocaleString()}<span className="inv-card-unit-inline">개</span></span>
                            </div>
                            <div className="inv-card-sub">
                                판매율 {product.total_stock > 0
                                    ? Math.round((product.sold_count / product.total_stock) * 100)
                                    : 0}%
                            </div>
                        </div>
                    </div>

                    {isLow(product) && (
                        <div className="inv-alert">
                            ⚠ 판매 가능 재고가 <strong>{product.sellable_stock}개</strong> 남았습니다. 재고 보충을 검토해주세요.
                        </div>
                    )}
                    {isSoldOut(product) && (
                        <div className="inv-alert inv-alert--soldout">
                            🚫 <strong>{product.name}</strong> 재고가 모두 소진되었습니다. 상품 페이지에 품절 안내가 표시됩니다.
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default InventoryDashboard;
