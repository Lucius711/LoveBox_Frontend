/**
 * @typedef {Object} CartItem
 * @property {number} id
 * @property {string} imageUrl
 * @property {string} prompt
 * @property {string} wish
 * @property {string} recipientName
 * @property {string} senderName
 * @property {string} sizeId
 * @property {string} sizeLabel
 * @property {number} price
 */

/**
 * @typedef {Object} ShippingInfo
 * @property {string} fullName
 * @property {string} phone
 * @property {string} addressLine1
 * @property {string} city
 * @property {string} deliveryNote
 * @property {string} preferredDate
 */

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {CartItem[]} items
 * @property {ShippingInfo} shippingInfo
 * @property {number} totalAmount
 * @property {string} status
 */

export {};
