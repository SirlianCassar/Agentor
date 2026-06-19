/* Shared constants needed by both the UI and the extracted logic modules.
   App-local-only constants stay inside App.tsx. */
import { defaultData } from './defaults'
import type { ProductEditionPlatform } from './types'

const assetBase = import.meta.env.BASE_URL
export const assetUrl = (path: string) => `${assetBase}${path.replace(/^\//, '')}`

export const PHONE_CALL_TEMPLATE = defaultData.settings.callTemplate
export const CALL_HISTORY_LIMIT = 5

export const productEditionPlatformOptions: Array<{
  value: ProductEditionPlatform
  label: string
}> = [
  { value: 'pc', label: 'PC' },
  { value: 'xbox', label: 'Xbox' },
  { value: 'playstation', label: 'PlayStation' },
  { value: 'custom', label: 'Autre' },
]
export const productEditionPlatformLabels: Record<ProductEditionPlatform, string> = {
  pc: 'PC',
  xbox: 'Xbox',
  playstation: 'PlayStation',
  custom: 'Autre',
}

export const quickLinks = [
  {
    id: 'crm',
    label: 'CRM',
    icon: assetUrl('/agentor/assets/crm.ico'),
    defaultUrl: defaultData.settings.quickLinkUrls.crm,
  },
  {
    id: 'share',
    label: 'ShareConseiller',
    icon: assetUrl('/agentor/assets/share.ico'),
    defaultUrl: defaultData.settings.quickLinkUrls.share,
  },
  {
    id: 'global',
    label: 'Global Action',
    icon: assetUrl('/agentor/assets/global.ico'),
    defaultUrl: defaultData.settings.quickLinkUrls.global,
  },
  {
    id: 'portal',
    label: 'Portal',
    icon: assetUrl('/agentor/assets/portal.png'),
    defaultUrl: defaultData.settings.quickLinkUrls.portal,
  },
  {
    id: 'assist',
    label: 'AssistBot',
    icon: assetUrl('/agentor/assets/Bot.png'),
    defaultUrl: defaultData.settings.quickLinkUrls.assist,
  },
]
