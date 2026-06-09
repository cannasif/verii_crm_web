import { contactApi } from '@/features/contact-management/api/contact-api';
import { customerApi } from '@/features/customer-management/api/customer-api';
import {
  resolveContactPhone,
  resolveCustomerPhone,
  resolveWhatsappRecipientPhone,
} from './quotation-share-utils';

export async function resolveQuotationWhatsappPhone(params: {
  customerId: number;
  contactId?: number | null;
  customerPhone?: string | null;
  customerPhone2?: string | null;
}): Promise<string> {
  const { customerId, contactId, customerPhone, customerPhone2 } = params;

  try {
    const [customer, contactResponse] = await Promise.all([
      customerApi.getById(customerId),
      contactApi.getList({
        pageNumber: 1,
        pageSize: 100,
        sortBy: 'FullName',
        sortDirection: 'asc',
        filters: [{ column: 'CustomerId', operator: 'equals', value: String(customerId) }],
      }),
    ]);

    const contacts = contactResponse.data ?? [];
    const linkedContact =
      contacts.find((item) => item.id === contactId) ??
      contacts.find((item) => resolveContactPhone(item.mobile, item.phone)) ??
      null;

    return resolveWhatsappRecipientPhone({
      defaultPhone: resolveCustomerPhone(customerPhone, customerPhone2) || null,
      contactPhone: linkedContact
        ? resolveContactPhone(linkedContact.mobile, linkedContact.phone)
        : null,
      customerPhone: customer.phone,
      customerPhone2: customer.phone2,
    });
  } catch {
    return resolveCustomerPhone(customerPhone, customerPhone2);
  }
}

export async function resolveQuotationMailEmail(params: {
  customerId: number;
  contactId?: number | null;
  customerEmail?: string | null;
}): Promise<string> {
  const { customerId, contactId, customerEmail } = params;

  try {
    const [customer, contactResponse] = await Promise.all([
      customerApi.getById(customerId),
      contactApi.getList({
        pageNumber: 1,
        pageSize: 100,
        sortBy: 'FullName',
        sortDirection: 'asc',
        filters: [{ column: 'CustomerId', operator: 'equals', value: String(customerId) }],
      }),
    ]);

    const contacts = contactResponse.data ?? [];

    if (contactId) {
      const linkedContact = contacts.find((item) => item.id === contactId);
      const linkedEmail = linkedContact?.email?.trim();
      if (linkedEmail) return linkedEmail;
    }

    const customerCardEmail = customer.email?.trim();
    if (customerCardEmail) return customerCardEmail;

    const propEmail = customerEmail?.trim();
    if (propEmail) return propEmail;

    const firstContactWithEmail = contacts.find((item) => item.email?.trim());
    return firstContactWithEmail?.email?.trim() ?? '';
  } catch {
    return customerEmail?.trim() ?? '';
  }
}
