import type { ComponentType } from 'npm:react@18.3.1'
import { template as scopeReviewTemplate } from './scope-review.tsx'
import { template as ambassadorApplicationTemplate } from './ambassador-application.tsx'
import { template as resourceDeliveryTemplate } from './resource-delivery.tsx'
import { template as resourceLeadTemplate } from './resource-lead.tsx'
import { template as storyReceivedTemplate } from './story-received.tsx'
import { template as storyConfirmationTemplate } from './story-confirmation.tsx'
import { template as storyPublishedTemplate } from './story-published.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
  /** Send to the internal inbox from the INTERNAL_INBOX secret (never in code). */
  toInternal?: boolean
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome.tsx'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'scope-review': scopeReviewTemplate,
  'ambassador-application': ambassadorApplicationTemplate,
  'resource-delivery': resourceDeliveryTemplate,
  'resource-lead': resourceLeadTemplate,
  'story-received': storyReceivedTemplate,
  'story-confirmation': storyConfirmationTemplate,
  'story-published': storyPublishedTemplate,
}
