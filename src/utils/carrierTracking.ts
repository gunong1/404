// Carrier tracking URL mapping
const CARRIER_URLS: Record<string, (trackingNumber: string) => string> = {
    'CJ대한통운': (t) => `https://nplus.doortodoor.co.kr/web/detail.jsp?slipno=${t}`,
    '우체국택배': (t) => `https://service.epost.go.kr/trace.RetrieveDomRgiTraceList.comm?sid1=${t}`,
    '로젠택배': (t) => `https://www.ilogen.com/web/personal/trace/${t}`,
    '한진택배': (t) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnum=${t}`,
    '롯데택배': (t) => `https://www.lotteglogis.com/home/reservation/tracking/link498?InvNo=${t}`,
    'GS25편의점택배': (t) => `https://www.cvsnet.co.kr/invoice/tracking.do?invoice_no=${t}`,
    '경동택배': (t) => `https://kdexp.com/service/shipment/trace.do?barcode=${t}`,
};

export const getTrackingUrl = (carrier: string, trackingNumber: string): string | null => {
    const urlFn = CARRIER_URLS[carrier];
    if (urlFn && trackingNumber) {
        return urlFn(trackingNumber);
    }
    return null;
};
