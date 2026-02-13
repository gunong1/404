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
        const { paymentId, orderData } = await req.json();
        const portoneSecret = Deno.env.get("PORTONE_API_SECRET");

        if (!paymentId || !portoneSecret) {
            throw new Error("Missing paymentId or PORTONE_API_SECRET");
        }

        // 1. PortOne API 호출하여 결제 정보 확인
        const portoneRes = await fetch(`https://api.portone.io/payments/${paymentId}`, {
            headers: {
                "Authorization": `PortOne ${portoneSecret}`,
            },
        });

        if (!portoneRes.ok) {
            const errorText = await portoneRes.text();
            throw new Error(`PortOne API Error: ${portoneRes.status} - ${errorText}`);
        }

        const paymentData = await portoneRes.json();
        const { status, amount, id } = paymentData;

        // 2. 검증 로직
        // 2-1. 결제 상태 확인 (PAID)
        if (status !== "PAID") {
            throw new Error(`Payment status is not PAID. Current status: ${status}`);
        }

        // 2-2. 결제 금액 확인
        if (amount.total !== orderData.amount) {
            throw new Error(`Amount mismatch. Expected: ${orderData.amount}, Actual: ${amount.total}`);
        }

        // 3. Supabase Edge Function 환경 변수에서 Admin Key 가져오기
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        // 4. Supabase Admin Client 생성
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        // 5. 주문 정보 DB 저장 (orders 테이블)
        const { data, error: dbError } = await supabaseAdmin
            .from("orders")
            .insert([
                {
                    merchant_uid: id, // PortOne paymentId
                    amount: amount.total,
                    buyer_name: orderData.buyer_name,
                    buyer_email: orderData.buyer_email,
                    buyer_tel: orderData.buyer_tel,
                    buyer_addr: orderData.buyer_addr,
                    buyer_postcode: orderData.buyer_postcode,
                    order_items: orderData.order_items,
                    shipping_memo: orderData.shipping_memo,
                    status: "paid", // 검증 완료된 상태
                },
            ])
            .select();

        if (dbError) {
            throw new Error(`Database Error: ${dbError.message}`);
        }

        return new Response(JSON.stringify({ success: true, daa: data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
