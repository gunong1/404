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

        // 2. Supabase에서 주문 상태를 cancelled로 업데이트
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { error: dbError } = await supabaseAdmin
            .from("orders")
            .update({ status: "cancelled" })
            .eq("id", orderId);

        if (dbError) {
            // PortOne은 취소됐으나 DB 실패 - 로그 남기고 경고 반환
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
