// Request-body checks shared by controllers. Each returns true when the value is acceptable.
const isBlank = v => v == null || String(v).trim() === '';
const isId = v => /^\d+$/.test(String(v)) && Number(v) > 0;
const isAmount = v => !isBlank(v) && Number.isFinite(Number(v)) && Number(v) >= 0;
const isEmail = v => typeof v === 'string' && v.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone = v => typeof v === 'string' && v.length <= 15 && /^\+?[\d\s-]{7,}$/.test(v);
// YYYY-MM-DD that is a real calendar day (rejects 2023-02-29, which Date would roll over to March)
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    && !isNaN(new Date(v)) && new Date(v).toISOString().slice(0, 10) === v;

// Letters only (any alphabet, plus combining marks like Devanagari vowel signs), words separated by spaces; no digits or symbols
const isPersonName = v => typeof v === 'string' && /^[\p{L}\p{M}]+(?: +[\p{L}\p{M}]+)*$/u.test(v.trim());

const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer'];
const GENDERS = ['Male', 'Female', 'Other'];

// Error message for the member fields shared by every create/update path, or null if they are valid
const memberFieldError = ({ name, gender, phone, email, date_of_birth }) => {
    if (isBlank(name)) return 'Name is required';
    if (!isPersonName(name)) return 'Name can only contain letters and spaces';
    if (name.trim().length > 100) return 'Name must be 100 characters or fewer';
    if (!isEmail(email)) return 'A valid email is required';
    if (!isBlank(phone) && !isPhone(phone)) return 'Phone must be 7-15 digits, spaces or dashes, optionally starting with +';
    if (!isBlank(gender) && !GENDERS.includes(gender)) return `Gender must be one of: ${GENDERS.join(', ')}`;
    if (!isBlank(date_of_birth) && (!isDate(date_of_birth) || date_of_birth > new Date().toISOString().slice(0, 10)))
        return 'Date of birth must be a valid past date (YYYY-MM-DD)';
    return null;
};

module.exports = { isBlank, isId, isAmount, isEmail, isPhone, isDate, isPersonName, memberFieldError, PAYMENT_METHODS, GENDERS };

if (require.main === module) {
    const assert = require('assert');
    assert(isBlank('  ') && isBlank(null) && !isBlank('a'));
    assert(isId(3) && isId('3') && !isId(0) && !isId(-1) && !isId('1.5') && !isId('') && !isId(true));
    assert(isAmount(0) && isAmount('12.50') && !isAmount(-1) && !isAmount('') && !isAmount('abc'));
    assert(isEmail('a@b.co') && !isEmail('a@b') && !isEmail('a b@c.d'));
    assert(isPhone('+91 00000 00000') && isPhone('9876543210') && !isPhone('12ab') && !isPhone('+91 00000 000000'));
    assert(isDate('2024-02-29') && !isDate('2023-02-29') && !isDate('2024-13-01') && !isDate('01/02/2024'));
    assert(isPersonName('Arjun Sharma') && isPersonName(' José  Álvarez ') && isPersonName('अर्जुन'));
    assert(!isPersonName('Arjun2') && !isPersonName('Arjun_Sharma') && !isPersonName('A@b') && !isPersonName('   ') && !isPersonName(5));
    assert(memberFieldError({ name: 'R2D2', email: 'a@b.co' }) === 'Name can only contain letters and spaces');
    assert(memberFieldError({ name: 'Arjun Sharma', email: 'a@b.co' }) === null);
    console.log('validate.js: all checks passed');
}
