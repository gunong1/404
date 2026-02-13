import * as PortOne from '@portone/browser-sdk/v2';
import { supabase } from '../lib/supabase';

const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID;
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY;

interface PaymentData {
    orderName: string;
    totalAmount: number;
    currency: string;
    payMethod: string;
    buyer?: {
        name?: string;
        email?: string;
        tel?: string;
    };
    paymentId?: string;
    shippingAddress?: string;
    shippingMemo?: string;
    items?: { name: string; quantity: number; price: number }[];
    buyerPostcode?: string;
}


// Force full-viewport for any PortOne SDK injected elements
const forceFullViewport = (el: HTMLElement) => {
    el.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        z-index: 99999 !important;
        overflow: auto !important;
    `;
    // Also fix any iframes inside
    const iframes = el.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        (iframe as HTMLElement).style.cssText = `
            width: 100% !important;
            height: 100% !important;
            max-width: 100vw !important;
            border: none !important;
        `;
    });
};

const setupPaymentIframeObserver = () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLElement && node.parentElement === document.body && node.id !== 'root') {
                    // This is a new top-level element injected by the SDK
                    if (node.tagName === 'DIV' || node.tagName === 'IFRAME') {
                        console.log('[Payment] Detected SDK element:', node.tagName, node.id, node.className);
                        forceFullViewport(node);
                        // Also observe for child iframe additions
                        const childObserver = new MutationObserver(() => {
                            forceFullViewport(node);
                        });
                        childObserver.observe(node, { childList: true, subtree: true });
                        setTimeout(() => childObserver.disconnect(), 60000);
                    }
                }
            });
        });
    });
    observer.observe(document.body, { childList: true });
    // Auto-disconnect after 60s
    setTimeout(() => observer.disconnect(), 60000);
    return observer;
};

export const usePayment = () => {
    const requestPayment = async (data: PaymentData): Promise<string | null> => {
        console.log('PortOne Config:', { STORE_ID, CHANNEL_KEY });
        if (!STORE_ID || !CHANNEL_KEY) {
            alert('PortOne 설정이 올바르지 않습니다.');
            return null;
        }

        try {
            // Start observing for SDK-injected elements
            setupPaymentIframeObserver();
            const now = new Date();
            const datePrefix = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const paymentId = `ORD-${datePrefix}-${randomSuffix}`;

            // Save pending order to sessionStorage (survives mobile REDIRECTION page reload)
            sessionStorage.setItem('pending_order', JSON.stringify({
                paymentId,
                amount: data.totalAmount,
                buyerName: data.buyer?.name || '',
                buyerEmail: data.buyer?.email || '',
                buyerTel: data.buyer?.tel || '',
                shippingAddress: data.shippingAddress || '',
                shippingMemo: data.shippingMemo || '',
                buyerPostcode: data.buyerPostcode || '',
                items: data.items || [],
                orderName: data.orderName,
            }));

            const response = await PortOne.requestPayment({
                storeId: STORE_ID,
                channelKey: CHANNEL_KEY,
                paymentId: paymentId,
                orderName: data.orderName,
                totalAmount: data.totalAmount,
                currency: "KRW",
                payMethod: "CARD",
                windowType: {
                    pc: "IFRAME",
                    mobile: "REDIRECTION",
                },
                redirectUrl: window.location.origin,
                customer: {
                    fullName: data.buyer?.name,
                    phoneNumber: data.buyer?.tel,
                    email: data.buyer?.email,
                },
                products: (data.items || []).map(item => ({
                    id: item.name,
                    name: item.name,
                    amount: item.price,
                    quantity: item.quantity,
                })),
                bypass: {
                    kcp_v2: {
                        site_cd: "IP5RQ",
                        shop_user_id: "90404",
                    }
                },
            } as any);

            if (response?.code != null) {
                // Payment failed or cancelled
                sessionStorage.removeItem('pending_order');
                alert(`결제 실패: ${response.message}`);
                return null;
            }

            // PC IFRAME payment succeeded - clean up pending order
            sessionStorage.removeItem('pending_order');


            // PortOne V2 response handling
            // The response object structure depends on the V2 SDK version.
            // But usually we need to verify payment on server side or check success here.

            // NOTE: PortOne V2 might not return the full transaction details directly in client side for security in some modes,
            // but for this implementation we assume standard flow.

            // Let's assume success if no error code.
            console.log('Payment Response:', response);

            // Since checking 'success' boolean is V1, V2 usually returns txId and we should verify.
            // For this MVP, we save to Supabase if we have a paymentId (and implicitly success/pending).

            // Save order to Supabase
            // 2. Supabase Edge Function 호출 (결제 검증 및 주문 생성)
            const { data: result, error: functionError } = await supabase.functions.invoke('verify-payment', {
                body: {
                    paymentId,
                    orderData: {
                        amount: data.totalAmount,
                        buyer_name: data.buyer?.name,
                        buyer_email: data.buyer?.email || '',
                        buyer_tel: data.buyer?.tel,
                        buyer_addr: data.shippingAddress || '',
                        buyer_postcode: data.buyerPostcode || '',
                        order_items: data.items || [],
                        shipping_memo: data.shippingMemo || '',
                    }
                }
            });

            if (functionError) {
                console.error('Edge Function Error:', functionError);
                // 결제는 성공했으나 검증/저장 실패 시 처리 (사용자에게 알림 등)
                // 검증 실패 시 결제 취소 API를 호출해야 할 수도 있음 (현재 범위 외)
                alert('결제 검증에 실패했습니다. 관리자에게 문의해주세요.');
                return null;
            }

            console.log('Payment verified and order saved:', result);
            return paymentId;

        } catch (error) {
            console.error('Payment Error:', error);
            return null;
        }
    };

    return { requestPayment };
};
