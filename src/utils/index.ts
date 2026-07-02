/**
 * Formats a currency amount into a standard localized string.
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch (e) {
    return `${currency === 'USD' ? '$' : currency} ${amount.toFixed(2)}`;
  }
};

/**
 * Formats a ISO date string into a human-friendly date string.
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  } catch (e) {
    return dateString;
  }
};

/**
 * Validates whether the given string is a valid email.
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Truncates text to a specified length and appends ellipses if exceeded.
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Safe utility to parse location strings/objects and format them into readable location strings.
 */
export const formatLocation = (loc: any): string => {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  if (typeof loc === 'object') {
    const parts: string[] = [];
    if (loc.city) parts.push(loc.city);
    if (loc.state) parts.push(loc.state);
    if (loc.country) parts.push(loc.country);
    const base = parts.join(', ');

    const typeParts: string[] = [];
    if (loc.remote === true || loc.remote === 'true') typeParts.push('Remote');
    else if (loc.hybrid === true || loc.hybrid === 'true') typeParts.push('Hybrid');
    else if (loc.onsite === true || loc.onsite === 'true' || loc.office === true) typeParts.push('On-site');

    const typeStr = typeParts.join('/');
    if (base && typeStr) {
      return `${base} (${typeStr})`;
    }
    return base || typeStr || '';
  }
  return '';
};
