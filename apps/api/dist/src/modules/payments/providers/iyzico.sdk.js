"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iyzicoCreateCheckout = iyzicoCreateCheckout;
const iyzipay_1 = require("iyzipay");
async function iyzicoCreateCheckout(dto, amount, user) {
    const apiKey = process.env.IYZICO_API_KEY;
    const secret = process.env.IYZICO_SECRET;
    const baseUrl = process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com';
    if (!apiKey || !secret) {
        throw new Error('IYZICO credentials missing');
    }
    const iyzipay = new iyzipay_1.default({ apiKey, secretKey: secret, uri: baseUrl });
    const basketId = dto.courseId ?? dto.planId ?? 'atlasio-basket';
    const price = amount.toFixed(2);
    const fullName = user?.name ?? 'Atlasio User';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] ?? 'Atlasio';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    const createRequest = {
        locale: iyzipay_1.default.LOCALE.TR,
        conversationId: basketId,
        price,
        paidPrice: price,
        currency: iyzipay_1.default.CURRENCY.TRY,
        installment: dto.installments ?? 1,
        basketId,
        paymentGroup: iyzipay_1.default.PAYMENT_GROUP.PRODUCT,
        callbackUrl: process.env.PAYMENT_CALLBACK_URL ??
            `${process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100'}/payments/webhook/iyzico`,
        buyer: {
            id: user?.id ?? 'anonymous',
            name: firstName,
            surname: lastName,
            identityNumber: '11111111111',
            email: user?.email ?? 'user@atlasio.ai',
            registrationAddress: 'N/A',
            city: 'Istanbul',
            country: 'Turkey',
            zipCode: '34000',
        },
        billingAddress: {
            contactName: fullName,
            city: 'Istanbul',
            country: 'Turkey',
            address: 'N/A',
            zipCode: '34000',
        },
        basketItems: [
            {
                id: basketId,
                name: dto.courseId ? 'Kurs' : 'Plan',
                category1: 'Education',
                itemType: iyzipay_1.default.BASKET_ITEM_TYPE.VIRTUAL,
                price,
            },
        ],
    };
    return new Promise((resolve, reject) => {
        iyzipay.checkoutFormInitialize.create(createRequest, (err, result) => {
            if (err)
                return reject(new Error(err?.message ?? 'iyzico error'));
            if (result?.status !== 'success')
                return reject(new Error(result?.errorMessage ?? 'iyzico error'));
            resolve(result.paymentPageUrl);
        });
    });
}
//# sourceMappingURL=iyzico.sdk.js.map