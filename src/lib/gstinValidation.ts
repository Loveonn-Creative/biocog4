// GSTIN Validation for Premium Mode
// Validates that invoices match user's verified MSME profile

export interface GstinValidationResult {
  valid: boolean;
  reason: 'matched' | 'gstin_mismatch' | 'no_invoice_gstin' | 'no_profile_gstin' | 'free_mode';
  message: string;
}

// Normalize GSTIN for comparison (remove spaces, uppercase)
const normalizeGstin = (gstin: string): string => {
  return gstin.replace(/\s+/g, '').toUpperCase();
};

// Validate GSTIN format (15 characters, alphanumeric)
export const isValidGstinFormat = (gstin: string): boolean => {
  const normalized = normalizeGstin(gstin);
  // GSTIN format: 2 digits state code + 10 char PAN + 1 entity + 1 default + 1 checksum
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(normalized);
};

// Main validation function for premium mode
export const validateInvoiceForPremium = (
  invoiceGstin: string | undefined,
  profileGstin: string | undefined,
  isPremium: boolean
): GstinValidationResult => {
  // Free mode: Accept all invoices
  if (!isPremium) {
    return {
      valid: true,
      reason: 'free_mode',
      message: 'Free mode - all invoices accepted for experimentation'
    };
  }

  // Premium mode without profile GSTIN: Warn but allow
  if (!profileGstin) {
    return {
      valid: true,
      reason: 'no_profile_gstin',
      message: 'Add your GSTIN in Settings to enable invoice verification'
    };
  }

  // Premium mode with profile but invoice missing GSTIN
  if (!invoiceGstin) {
    return {
      valid: false,
      reason: 'no_invoice_gstin',
      message: 'Invoice does not contain a valid GSTIN'
    };
  }

  // Compare normalized GSTINs
  const normalizedInvoice = normalizeGstin(invoiceGstin);
  const normalizedProfile = normalizeGstin(profileGstin);

  // Check if invoice GSTIN matches profile (buyer or supplier)
  if (normalizedInvoice === normalizedProfile) {
    return {
      valid: true,
      reason: 'matched',
      message: 'GSTIN verified - Invoice matches your business profile'
    };
  }

  // GSTIN mismatch
  return {
    valid: false,
    reason: 'gstin_mismatch',
    message: `GSTIN mismatch: Invoice (${normalizedInvoice}) does not match your profile (${normalizedProfile})`
  };
};

// Extract GSTIN from OCR data (check both supplier and buyer)
export const extractGstinFromInvoice = (
  supplierGstin?: string,
  buyerGstin?: string,
  profileGstin?: string
): string | undefined => {
  // If profile GSTIN matches buyer, use buyer (we're the buyer)
  if (profileGstin && buyerGstin) {
    const normalizedBuyer = normalizeGstin(buyerGstin);
    const normalizedProfile = normalizeGstin(profileGstin);
    if (normalizedBuyer === normalizedProfile) {
      return buyerGstin;
    }
  }
  
  // If profile GSTIN matches supplier, use supplier (we're the supplier)
  if (profileGstin && supplierGstin) {
    const normalizedSupplier = normalizeGstin(supplierGstin);
    const normalizedProfile = normalizeGstin(profileGstin);
    if (normalizedSupplier === normalizedProfile) {
      return supplierGstin;
    }
  }
  
  // Default: return buyer GSTIN (most common case - we're buying)
  return buyerGstin || supplierGstin;
};
