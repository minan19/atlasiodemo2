"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paytrCreateCheckout = paytrCreateCheckout;
const node_fetch_1 = require("node-fetch");
async function paytrCreateCheckout(dto, amount, currency, email) {
    const merchantId = process.env.PAYTR_MERCHANT_ID;
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
    const baseUrl = process.env.PAYTR_BASE_URL ?? 'https://www.paytr.com/odeme/api/get-token';
    if (!merchantId || !merchantKey || !merchantSalt) {
        throw new Error('PAYTR credentials missing');
    }
    const userIp = '127.0.0.1';
    const merchantOid = dto.courseId ?? dto.planId ?? `atlasio-${Date.now()}`;
    const paymentAmount = Math.round(amount * 100);
    const payload = new URLSearchParams();
    payload.set('merchant_id', merchantId);
    payload.set('user_ip', userIp);
    payload.set('merchant_oid', merchantOid);
    payload.set('email', email ?? 'test@atlasio.ai');
    payload.set('payment_amount', paymentAmount.toString());
    payload.set('currency', currency === 'TRY' ? 'TL' : currency);
    payload.set('test_mode', process.env.NODE_ENV === 'production' ? '0' : '1');
    payload.set('no_installment', dto.installments && dto.installments > 1 ? '0' : '1');
    payload.set('max_installment', String(dto.installments ?? 1));
    payload.set('user_name', 'Atlasio User');
    payload.set('user_address', 'N/A');
    payload.set('user_phone', '000');
    payload.set('merchant_ok_url', `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/payments/success`);
    payload.set('merchant_fail_url', `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/payments/cancel`);
    payload.set('timeout_limit', '300');
    const hashStr = `${merchantId}${userIp}${merchantOid}${email ?? ''}${paymentAmount}${currency}${dto.installments ?? 1}${merchantSalt}`;
    const crypto = await Promise.resolve().then(() => require('crypto'));
    const paytrToken = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');
    payload.set('paytr_token', paytrToken);
    const res = await (0, node_fetch_1.default)(baseUrl, { method: 'POST', body: payload });
    const json = (await res.json());
    if (json.status !== 'success' || !json.token) {
        throw new Error(json.reason ?? 'paytr init failed');
    }
    const iframeUrl = `https://www.paytr.com/odeme/guvenli/${json.token}`;
    return iframeUrl;
}
//# sourceMappingURL=paytr.sdk.js.map