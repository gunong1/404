import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { paymentId, orderId, reason } = await req.json();
        const portoneSecret = Deno.env.get("PORTONE_API_SECRET");

        if (!paymentId || !orderId || !portoneSecret) {
            throw new Error("Missing paymentId, orderId, or PORTONE_API_SECRET");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        // 1. PortOne V2 API로 결제 취소 요청
        const cancelRes = await fetch(`https://api.portone.io/payments/${paymentId}/cancel`, {
            method: "POST",
            headers: {
                "Authorization": `PortOne ${portoneSecret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                reason: reason || "관리자 취소",
            }),
        });

        const cancelData = await cancelRes.json();

        if (!cancelRes.ok) {
            throw new Error(`PortOne 취소 실패: ${cancelData.message || cancelRes.status}`);
        }

        // 2. 주문 정보 조회 (포인트/쿠폰/재고 복구를 위해)
        const { data: orderData, error: orderFetchError } = await supabaseAdmin
            .from("orders")
            .select("buyer_email, points_used, coupon_id, order_items")
            .eq("id", orderId)
            .maybeSingle();

        // 3. Supabase에서 주문 상태를 cancelled로 업데이트
        const { error: dbError } = await supabaseAdmin
            .from("orders")
            .update({ status: "cancelled" })
            .eq("id", orderId);

        if (dbError) {
            console.error("DB 업데이트 실패:", dbError.message);
            return new Response(
                JSON.stringify({
                    success: true,
                    warning: "결제는 취소됐으나 DB 상태 업데이트 실패: " + dbError.message,
                    cancelData,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
        }

        // 4. 포인트 복구
        if (!orderFetchError && orderData?.points_used > 0 && orderData?.buyer_email) {
            const { data: userData } = await supabaseAdmin
                .from("users")
                .select("points")
                .eq("email", orderData.buyer_email)
                .maybeSingle();

            if (userData && typeof userData.points === "number") {
                const restoredPoints = userData.points + orderData.points_used;
                await supabaseAdmin
                    .from("users")
                    .update({ points: restoredPoints })
                    .eq("email", orderData.buyer_email);
                console.log(`포인트 복구: ${orderData.buyer_email} +${orderData.points_used}P`);
            }
        }

        // 5. 쿠폰 복구 (is_used = false로 되돌림)
        if (!orderFetchError && orderData?.coupon_id) {
            await supabaseAdmin
                .from("user_coupons")
                .update({ is_used: false })
                .eq("id", orderData.coupon_id);
            console.log(`쿠폰 복구: coupon_id=${orderData.coupon_id}`);
        }

        // 6. 재고 및 누적 판매량 복구
        if (!orderFetchError && orderData?.order_items) {
            try {
                const items = orderData.order_items || [];
                const totalQty = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

                if (totalQty > 0) {
                    const { error: stockError } = await supabaseAdmin.rpc('restore_stock', {
                        product_id: 'bodywash-01',
                        qty: totalQty
                    });
                    if (stockError) {
                        console.error("재고 복구 실패:", stockError);
                    } else {
                        console.log(`재고 복구 성공: +${totalQty}개`);
                    }
                }
            } catch (err) {
                console.error("재고 복구 계산 중 오류:", err);
            }
        }

        return new Response(
            JSON.stringify({ success: true, cancelData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
});
