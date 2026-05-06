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
