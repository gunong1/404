import React, { useState, useRef } from 'react';
import './ReviewModal.css';
import { supabase } from '../lib/supabase';

interface ReviewModalProps {
    orderId: string;
    productId: string;
    userEmail: string;
    onClose: () => void;
    onSuccess: (pointsEarned: number) => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ orderId, productId, userEmail, onClose, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('이미지 크기는 5MB 이하여야 합니다.');
            return;
        }
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            alert('별점을 선택해주세요.');
            return;
        }
        if (!content.trim() || content.trim().length < 10) {
            alert('리뷰 내용을 10자 이상 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. 중복 리뷰 체크
            const { data: existing } = await supabase
                .from('reviews')
                .select('id')
                .eq('order_id', orderId)
                .eq('user_id', userEmail)
                .maybeSingle();

            if (existing) {
                alert('이미 해당 주문에 대한 리뷰를 작성하셨습니다.');
                onClose();
                return;
            }

            // 2. 이미지 업로드 (있을 경우)
            let imageUrl: string | null = null;
            if (imageFile) {
                const ext = imageFile.name.split('.').pop();
                const fileName = `review_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from('review-images')
                    .upload(fileName, imageFile, { cacheControl: '3600', upsert: false });
                if (uploadError) {
                    console.warn('이미지 업로드 실패, 텍스트 리뷰로 계속 진행:', uploadError.message);
                    imageUrl = null;
                } else {
                    const { data: urlData } = supabase.storage
                        .from('review-images')
                        .getPublicUrl(fileName);
                    imageUrl = urlData.publicUrl;
                }
            }

            // 3. 리뷰 저장
            const { error: insertError } = await supabase
                .from('reviews')
                .insert({
                    product_id: productId,
                    user_id: userEmail,
                    order_id: orderId,
                    rating,
                    content: content.trim(),
                    image_url: imageUrl,
                    source: 'internal',           // 자사몰 직결제 리뷰
                    author_name: null,            // 내부 회원: users 테이블 user_id로 조인
                    external_review_id: null,     // 전용 내부 리뷰이므로 null
                });

            if (insertError) throw insertError;

            // 4. 포인트 지급
            const pointsToAdd = imageUrl ? 1000 : 500;
            await supabase.rpc('increment_user_points', {
                user_email: userEmail,
                points_to_add: pointsToAdd,
            });

            onSuccess(pointsToAdd);
        } catch (err: any) {
            console.error('리뷰 제출 오류:', err);
            alert('리뷰 저장 중 오류가 발생했습니다: ' + (err.message || err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayRating = hoverRating || rating;

    return (
        <div className="review-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="review-modal">
                <div className="review-modal-header">
                    <h2 className="review-modal-title">✍ 리뷰 작성</h2>
                    <button className="review-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="review-modal-body">
                    {/* 별점 */}
                    <div className="review-rating-section">
                        <p className="review-section-label">별점을 선택해주세요</p>
                        <div className="star-selector">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    className={`star-btn ${star <= displayRating ? 'active' : ''}`}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    type="button"
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                        {displayRating > 0 && (
                            <span className="rating-label">
                                {['', '별로예요', '아쉬워요', '보통이에요', '좋아요', '최고예요!'][displayRating]}
                            </span>
                        )}
                    </div>

                    {/* 텍스트 입력 */}
                    <div className="review-content-section">
                        <p className="review-section-label">리뷰 내용 <span className="required">*필수</span></p>
                        <textarea
                            className="review-textarea"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="향, 거품, 사용감 등에 대한 솔직한 후기를 남겨주시면 다른 분들께 큰 도움이 됩니다!"
                            rows={5}
                            maxLength={1000}
                        />
                        <div className="review-char-count">{content.length} / 1000</div>
                    </div>

                    {/* 이미지 업로드 */}
                    <div className="review-image-section">
                        <p className="review-section-label">
                            사진 첨부
                            <span className="photo-point-badge">📸 포토리뷰 +1,000P</span>
                        </p>
                        {imagePreview ? (
                            <div className="image-preview-wrapper">
                                <img src={imagePreview} alt="미리보기" className="image-preview" />
                                <button className="image-remove-btn" onClick={handleRemoveImage} type="button">✕</button>
                            </div>
                        ) : (
                            <button
                                className="image-upload-btn"
                                onClick={() => fileInputRef.current?.click()}
                                type="button"
                            >
                                <span className="upload-icon">📷</span>
                                <span>사진 추가</span>
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* 포인트 안내 */}
                    <div className="review-point-info">
                        <span className="point-info-text">
                            💡 리뷰 작성 시&nbsp;
                            <strong>{imagePreview ? '1,000P' : '500P'}</strong>
                            {imagePreview ? ' (포토리뷰)' : ' (일반리뷰)'}
                            &nbsp;적립!
                        </span>
                    </div>
                </div>

                <div className="review-modal-footer">
                    <button className="review-cancel-btn" onClick={onClose} disabled={isSubmitting}>
                        취소
                    </button>
                    <button
                        className="review-submit-btn"
                        onClick={handleSubmit}
                        disabled={isSubmitting || rating === 0}
                    >
                        {isSubmitting ? '제출 중...' : '리뷰 등록하기'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
