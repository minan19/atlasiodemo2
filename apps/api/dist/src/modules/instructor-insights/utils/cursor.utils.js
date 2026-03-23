"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
function encodeCursor(createdAtIso, id) {
    return Buffer.from(`${createdAtIso}|${id}`, 'utf8').toString('base64');
}
function decodeCursor(cursor) {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const [createdAtIso, id] = decoded.split('|');
    if (!createdAtIso || !id)
        throw new Error('Invalid cursor');
    return { createdAtIso, id };
}
//# sourceMappingURL=cursor.utils.js.map