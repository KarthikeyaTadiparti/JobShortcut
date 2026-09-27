/**
 * Interface and schema contract for the centralized WhatsApp locator registry.
 * Target destination: backend/src/config/whatsapp_locators.ts
 */

export type ElementCategory =
  | "auth"
  | "navigation_search"
  | "chat_list"
  | "conversation_header"
  | "messages"
  | "date_headers"
  | "links";

export interface LocatorDefinition {
  id: string;
  name: string;
  category: ElementCategory;
  description: string;
  primary: string;
  fallbacks: string[];
  isOptional?: boolean;
  requiresParent?: string;
}

export type WhatsAppLocatorRegistry = Record<string, LocatorDefinition>;
