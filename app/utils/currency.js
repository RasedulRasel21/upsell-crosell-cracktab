/**
 * Currency utility functions for consistent currency display across the app
 */

// Map of currency codes to their symbols
const CURRENCY_SYMBOLS = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'AUD': '$',
  'CAD': '$',
  'CHF': 'CHF',
  'CNY': '¥',
  'SEK': 'kr',
  'NZD': '$',
  'MXN': '$',
  'SGD': '$',
  'HKD': '$',
  'NOK': 'kr',
  'KRW': '₩',
  'TRY': '₺',
  'RUB': '₽',
  'INR': '₹',
  'BRL': 'R$',
  'ZAR': 'R',
  'DKK': 'kr',
  'PLN': 'zł',
  'TWD': 'NT$',
  'THB': '฿',
  'MYR': 'RM',
  'PHP': '₱',
  'IDR': 'Rp',
  'VND': '₫',
  'CZK': 'Kč',
  'ILS': '₪',
  'AED': 'د.إ',
  'SAR': '﷼',
  'COP': '$',
  'CLP': '$',
  'PEN': 'S/',
  'ARS': '$',
  'BGN': 'лв',
  'HRK': 'kn',
  'HUF': 'Ft',
  'RON': 'lei',
};

/**
 * Get the currency symbol for a given currency code
 * @param {string} currencyCode - ISO 4217 currency code (e.g., 'USD', 'EUR')
 * @returns {string} The currency symbol or the currency code with a space if not found
 */
export function getCurrencySymbol(currencyCode) {
  if (!currencyCode) return '$';
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || `${currencyCode} `;
}

/**
 * Format a price with the appropriate currency symbol
 * @param {number} amount - The price amount
 * @param {string} currencyCode - ISO 4217 currency code (e.g., 'USD', 'EUR')
 * @param {object} options - Formatting options
 * @param {number} options.decimals - Number of decimal places (default: 2)
 * @param {boolean} options.symbolAfter - Whether to show symbol after the amount (for some currencies)
 * @returns {string} The formatted price string
 */
export function formatPrice(amount, currencyCode = 'USD', options = {}) {
  const { decimals = 2, symbolAfter = false } = options;

  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = parseFloat(amount || 0).toFixed(decimals);

  // Some currencies conventionally show the symbol after the amount
  const symbolAfterCurrencies = ['SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON'];
  const showSymbolAfter = symbolAfter || symbolAfterCurrencies.includes(currencyCode?.toUpperCase());

  if (showSymbolAfter) {
    return `${formattedAmount} ${symbol}`;
  }

  return `${symbol}${formattedAmount}`;
}

/**
 * Format a price using the browser's Intl.NumberFormat for proper localization
 * @param {number} amount - The price amount
 * @param {string} currencyCode - ISO 4217 currency code (e.g., 'USD', 'EUR')
 * @param {string} locale - Locale string (e.g., 'en-US', 'de-DE')
 * @returns {string} The formatted price string
 */
export function formatPriceIntl(amount, currencyCode = 'USD', locale = 'en-US') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount || 0);
  } catch (error) {
    // Fallback to simple formatting if Intl fails
    return formatPrice(amount, currencyCode);
  }
}

/**
 * Get store currency from Shopify Admin API
 * The shop query is available by default in Admin API without special scopes
 * @param {object} admin - Shopify Admin API client
 * @returns {Promise<string>} The store's currency code
 */
export async function getStoreCurrency(admin) {
  try {
    const response = await admin.graphql(
      `#graphql
        query getShopCurrency {
          shop {
            currencyCode
            name
          }
        }`
    );

    const result = await response.json();

    // Check for errors in the response
    if (result.errors) {
      console.error('GraphQL errors fetching store currency:', JSON.stringify(result.errors));
      return 'USD';
    }

    const currencyCode = result?.data?.shop?.currencyCode;

    if (currencyCode) {
      console.log(`Store currency: ${currencyCode} for ${result?.data?.shop?.name}`);
    }

    return currencyCode || 'USD';
  } catch (error) {
    console.error('Error fetching store currency:', error.message || error);
    return 'USD';
  }
}

export default {
  getCurrencySymbol,
  formatPrice,
  formatPriceIntl,
  getStoreCurrency,
  CURRENCY_SYMBOLS,
};
