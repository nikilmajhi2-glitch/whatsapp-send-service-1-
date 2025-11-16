/**
 * Format phone number to WhatsApp JID format
 * @param {string} number - Phone number
 * @returns {string} Formatted JID
 */
function formatJID(number) {
  if (number.includes('@')) return number;
  const cleaned = number.replace(/[^\d]/g, '');
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Clean phone number (remove non-digits)
 * @param {string} number - Phone number
 * @returns {string} Cleaned number
 */
function cleanPhoneNumber(number) {
  return number.replace(/[^\d]/g, '');
}

/**
 * Validate phone number format
 * @param {string} number - Phone number
 * @returns {boolean} Is valid
 */
function isValidPhoneNumber(number) {
  const cleaned = cleanPhoneNumber(number);
  return cleaned.length >= 10 && cleaned.length <= 15;
}

module.exports = {
  formatJID,
  cleanPhoneNumber,
  isValidPhoneNumber
};
