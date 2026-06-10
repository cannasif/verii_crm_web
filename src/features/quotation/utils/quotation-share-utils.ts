export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type || 'application/pdf' });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const normalized = result.includes('base64,') ? result.split('base64,')[1] : result;
      resolve(normalized);
    };
    reader.onerror = () => reject(reader.error ?? new Error('File could not be read.'));
    reader.readAsDataURL(blob);
  });
}

export function normalizePhoneForWhatsapp(value: string): string {
  return value.replace(/[^\d+]/g, '').replace(/^00/, '+');
}

export function resolveContactPhone(mobile?: string | null, phone?: string | null): string {
  const candidate = (mobile || phone || '').trim();
  return candidate ? normalizePhoneForWhatsapp(candidate) : '';
}

export function resolveCustomerPhone(phone?: string | null, phone2?: string | null): string {
  const primary = (phone || '').trim();
  if (primary) return normalizePhoneForWhatsapp(primary);
  const secondary = (phone2 || '').trim();
  return secondary ? normalizePhoneForWhatsapp(secondary) : '';
}

export function resolveWhatsappRecipientPhone(params: {
  defaultPhone?: string | null;
  contactPhone?: string | null;
  customerPhone?: string | null;
  customerPhone2?: string | null;
}): string {
  const fromDefault = (params.defaultPhone || '').trim();
  if (fromDefault) return normalizePhoneForWhatsapp(fromDefault);

  const fromContact = (params.contactPhone || '').trim();
  if (fromContact) return normalizePhoneForWhatsapp(fromContact);

  return resolveCustomerPhone(params.customerPhone, params.customerPhone2);
}
