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

/**
 * Safe utility to extract and format the salary from all job schema variants in Firestore.
 */
export const formatJobSalary = (job: any): string => {
  if (!job) return 'Salary Negotiable';

  // 1. If salary is an object: { min, max, period, currency, negotiable }
  if (job.salary && typeof job.salary === 'object') {
    const s = job.salary;
    const minVal = Number(s.min);
    const maxVal = Number(s.max);
    const min = !isNaN(minVal) && minVal > 0 ? minVal.toLocaleString('en-IN') : (s.min ? String(s.min) : '');
    const max = !isNaN(maxVal) && maxVal > 0 ? maxVal.toLocaleString('en-IN') : (s.max ? String(s.max) : '');
    const period = s.period === 'monthly' ? '/ mo' : s.period === 'yearly' ? '/ yr' : (s.period ? `/${s.period}` : '');

    if (min && max) {
      return `₹${min} - ₹${max}${period ? ' ' + period : ''}`;
    } else if (min) {
      return `₹${min}+${period ? ' ' + period : ''}`;
    } else if (max) {
      return `Up to ₹${max}${period ? ' ' + period : ''}`;
    }
  }

  // 2. If salaryRange is present as string
  if (typeof job.salaryRange === 'string' && job.salaryRange.trim() && job.salaryRange !== 'Competitive Pay' && job.salaryRange !== 'Best Pay') {
    return job.salaryRange.trim();
  }

  // 3. If salaryMin / salaryMax
  if (job.salaryMin || job.salaryMax) {
    const minVal = Number(job.salaryMin);
    const maxVal = Number(job.salaryMax);
    const min = !isNaN(minVal) && minVal > 0 ? minVal.toLocaleString('en-IN') : (job.salaryMin ? String(job.salaryMin) : '');
    const max = !isNaN(maxVal) && maxVal > 0 ? maxVal.toLocaleString('en-IN') : (job.salaryMax ? String(job.salaryMax) : '');
    const period = job.salaryPeriod === 'monthly' ? '/ mo' : job.salaryPeriod === 'yearly' ? '/ yr' : '';
    if (min && max) return `₹${min} - ₹${max}${period ? ' ' + period : ''}`;
    if (min) return `₹${min}+${period ? ' ' + period : ''}`;
    if (max) return `Up to ₹${max}${period ? ' ' + period : ''}`;
  }

  // 4. If direct string or number
  if (typeof job.salary === 'string' && job.salary.trim() && job.salary !== 'Competitive Pay' && job.salary !== 'Best Pay') {
    return job.salary.trim();
  }
  if (typeof job.salary === 'number' && job.salary > 0) {
    return `₹${job.salary.toLocaleString('en-IN')}`;
  }

  return 'Salary Negotiable';
};

/**
 * Safe utility to extract company logo from all job schema variants.
 */
export const getJobLogoUrl = (job: any): string => {
  if (!job) return '';
  if (typeof job.logoUrl === 'string' && job.logoUrl.startsWith('http')) return job.logoUrl;
  if (typeof job.companyLogo === 'string' && job.companyLogo.startsWith('http')) return job.companyLogo;
  if (job.companyDetails && typeof job.companyDetails.logoUrl === 'string' && job.companyDetails.logoUrl.startsWith('http')) {
    return job.companyDetails.logoUrl;
  }
  return '';
};
