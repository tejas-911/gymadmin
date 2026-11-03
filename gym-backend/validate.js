// Request-body checks shared by controllers. Each returns true when the value is acceptable.
const isBlank = v => v == null || String(v).trim() === '';
const isId = v => /^\d+$/.test(String(v)) && Number(v) > 0;
const isAmount = v => !isBlank(v) && Number.isFinite(Number(v)) && Number(v) >= 0;
const isEmail = v => typeof v === 'string' && v.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone = v => typeof v === 'string' && v.length <= 15 && /^\+?[\d\s-]{7,}$/.test(v);
// YYYY-MM-DD that is a real calendar day (rejects 2023-02-29, which Date would roll over to March)
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    && !isNaN(new Date(v)) && new Date(v).toISOString().slice(0, 10) === v;

const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer'];
const GENDERS = ['Male', 'Female', 'Other'];

module.exports = { isBlank, isId, isAmount, isEmail, isPhone, isDate, PAYMENT_METHODS, GENDERS };

if (require.main === module) {
    const assert = require('assert');
    assert(isBlank('  ') && isBlank(null) && !isBlank('a'));
    assert(isId(3) && isId('3') && !isId(0) && !isId(-1) && !isId('1.5') && !isId('') && !isId(true));
    assert(isAmount(0) && isAmount('12.50') && !isAmount(-1) && !isAmount('') && !isAmount('abc'));
    assert(isEmail('a@b.co') && !isEmail('a@b') && !isEmail('a b@c.d'));
    assert(isPhone('+91 00000 00000') && isPhone('9876543210') && !isPhone('12ab') && !isPhone('+91 00000 000000'));
    assert(isDate('2024-02-29') && !isDate('2023-02-29') && !isDate('2024-13-01') && !isDate('01/02/2024'));
    console.log('validate.js: all checks passed');
}
