export interface WhatsappIntegrationStatusDto {
  isConfigured: boolean;
  isEnabled: boolean;
  displayName: string;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  graphApiVersion: string;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  verifyTokenMasked?: string | null;
  webhookUrl?: string | null;
  lastWebhookReceivedAt?: string | null;
  lastOutboundMessageAt?: string | null;
}

export interface UpdateWhatsappIntegrationSettingsDto {
  isEnabled: boolean;
  displayName: string;
  phoneNumberId: string;
  businessAccountId: string;
  graphApiVersion: string;
  accessTokenPlain?: string | null;
  appSecretPlain?: string | null;
  verifyToken: string;
}

export interface WhatsappTestMessageDto {
  toPhoneNumber: string;
  message: string;
}

export interface WhatsappSendMessageResultDto {
  isSuccess: boolean;
  messageId?: string | null;
  logId?: number | null;
  sentAt: string;
}

export interface WhatsappIntegrationLogDto {
  id: number;
  tenantId: string;
  userId?: number | null;
  operation: string;
  direction: 'Inbound' | 'Outbound' | string;
  isSuccess: boolean;
  severity: string;
  provider: string;
  message?: string | null;
  errorCode?: string | null;
  phoneNumber?: string | null;
  whatsappMessageId?: string | null;
  templateName?: string | null;
  payloadJson?: string | null;
  metadataJson?: string | null;
  createdDate: string;
}

export interface WhatsappQuoteDraftLineDto {
  id: number;
  stockId: number;
  productCode: string;
  productName: string;
  unit?: string | null;
  groupCode?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  lineGrandTotal: number;
  isMainProduct: boolean;
  isMandatoryRelatedProduct: boolean;
}

export interface WhatsappQuoteDraftDto {
  id: number;
  tenantId: string;
  conversationId: number;
  customerId?: number | null;
  customerName?: string | null;
  contactId?: number | null;
  contactName?: string | null;
  quotationId?: number | null;
  phoneNumber: string;
  status: string;
  total: number;
  grandTotal: number;
  customerMessage?: string | null;
  createdDate: string;
  lines: WhatsappQuoteDraftLineDto[];
}
