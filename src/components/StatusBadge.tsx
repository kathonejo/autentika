import { CommissionStatus } from '@/contract'
import type { Lang } from '@/i18n'
import { translations } from '@/i18n'

const STATUS_SLUG: Record<CommissionStatus, string> = {
  [CommissionStatus.Created]:   'created',
  [CommissionStatus.Funded]:    'funded',
  [CommissionStatus.Delivered]: 'delivered',
  [CommissionStatus.Released]:  'released',
  [CommissionStatus.Refunded]:  'refunded',
  [CommissionStatus.Cancelled]: 'cancelled',
}

const STATUS_KEYS: Record<CommissionStatus, keyof typeof translations['en']> = {
  [CommissionStatus.Created]:   'statusCreated',
  [CommissionStatus.Funded]:    'statusFunded',
  [CommissionStatus.Delivered]: 'statusDelivered',
  [CommissionStatus.Released]:  'statusReleased',
  [CommissionStatus.Refunded]:  'statusRefunded',
  [CommissionStatus.Cancelled]: 'statusCancelled',
}

/**
 * Sticker-style status badge — slightly rotated, hand-placed look.
 * Color and rotation are driven by CSS via data-status attribute.
 */
export function StatusBadge({ status, lang }: { status: CommissionStatus; lang: Lang }) {
  const t = translations[lang]
  return (
    <span
      className="sticker shrink-0"
      data-status={STATUS_SLUG[status]}
    >
      {t[STATUS_KEYS[status]] as string}
    </span>
  )
}
