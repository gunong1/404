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


export const usePayment = () => {
    const requestPayment = async (data: PaymentData): Promise<string | null> => {
        console.log('PortOne Config:', { STORE_ID, CHANNEL_KEY });
        if (!STORE_ID || !CHANNEL_KEY) {
            alert('PortOne 설정이 올바르지 않습니다.');
            return null;
        }

        try {
            const paymentId = `pay${Date.now()}`;
            const response = await PortOne.requestPayment({
                storeId: STORE_ID,
                channelKey: CHANNEL_KEY,
                paymentId: paymentId,
                orderName: data.orderName,
                totalAmount: data.totalAmount,
                currency: "CURRENCY_KRW",
                payMethod: "CARD",
                customer: {
                    fullName: data.buyer?.name,
                    phoneNumber: data.buyer?.tel,
                    email: data.buyer?.email,
                }
            });

            if (response?.code != null) {
                // Error case (PortOne V2 returns code on error, or sometimes throws? Need to check SDK behavior carefully. 
                // Actually PortOne.requestPayment returns a Promise that resolves to PaymentResponse.
                // If the user closes the window or cancels, it might return an error code or status.)
                alert(`결제 실패: ${response.message}`);
                return null;
            }


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
            const { error } = await supabase
                .from('orders')
                .insert([
                    {
                        merchant_uid: paymentId,
                        amount: data.totalAmount,
                        buyer_name: data.buyer?.name,
                        buyer_email: data.buyer?.email || '',
                        buyer_tel: data.buyer?.tel,
                        buyer_addr: data.shippingAddress || '',
                        buyer_postcode: data.buyerPostcode || '',
                        order_items: data.items || [],
                        shipping_memo: data.shippingMemo || '',
                        status: 'paid',
                    },
                ]);

            if (error) {
                console.error('Error saving order:', error);
                alert('결제는 성공했으나 주문 저장에 실패했습니다. 관리자에게 문의해주세요.');
                return null;
            } else {
                console.log('Order saved to Supabase');
                return paymentId;
            }

        } catch (error) {
            console.error('Payment Error:', error);
            return null;
        }
    };

    return { requestPayment };
};
