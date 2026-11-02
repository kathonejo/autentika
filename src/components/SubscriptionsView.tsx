import { useEffect, useMemo, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { erc20Abi, parseUnits, formatUnits } from 'viem'
import { toast } from 'sonner'
import { translations } from '@/i18n'
import type { Lang } from '@/i18n'
import { useReadChainId } from '@/hooks/useCommissions'
import {
  useSubscriptionsContractAddress,
  useArtistPlan,
  useSubscription,
  useClaimable,
  useDiscountedMonthlyFee,
} from '@/hooks/useSubscriptions'
import {
  SUBSCRIPTIONS_ABI,
  isSubscriptionsConfigured,
  ANNUAL_MONTHS,
} from '@/subscriptions'
import { getUsdcAddress, isSupportedChain, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { ArtistSubsDashboard, EXAMPLE_ARTIST_SUBS } from '@/components/ArtistSubsDashboard'

interface Props {
  lang: Lang
  onBack: () => void
  /** Optional preselected artist from profile Suscribirme */
  initialArtist?: `0x${string}`
}

function fmtUsdc(raw: bigint | undefined): string {
  if (raw === undefined) return '—'
  return formatUnits(raw, 6)
}

export function SubscriptionsView({ lang, onBack, initialArtist }: Props) {
  const t = translations[lang]
  const { address, isConnected } = useAccount()
  const chainId = useReadChainId()
  const club = useSubscriptionsContractAddress()
  const configured = isSubscriptionsConfigured(chainId)
  const usdcAddr = isSupportedChain(chainId) ? getUsdcAddress(chainId) : getUsdcAddress(ARC_TESTNET_CHAIN_ID)

  const [tab, setTab] = useState<'deposit' | 'balance' | 'artist'>(
    address && initialArtist && address.toLowerCase() === initialArtist.toLowerCase() ? 'artist' : 'deposit',
  )
  const [artistInput, setArtistInput] = useState(initialArtist ?? '')
  const [amountStr, setAmountStr] = useState('')
  const [planFeeStr, setPlanFeeStr] = useState('')
  const [planTitle, setPlanTitle] = useState('Club de correo')
  const [claimSub, setClaimSub] = useState('')

  const artist = useMemo(() => {
    const raw = artistInput.trim()
    return /^0x[0-9a-fA-F]{40}$/.test(raw) ? (raw as `0x${string}`) : undefined
  }, [artistInput])

  const { data: planRaw, refetch: refetchPlan } = useArtistPlan(artist)
  const plan = planRaw as { monthlyFeeUsdc: bigint; title: string; active: boolean } | undefined
  const { data: subRaw, refetch: refetchSub } = useSubscription(artist, address)
  const sub = subRaw as {
    balance: bigint
    lockedRemaining: bigint
    lockedMonthsLeft: bigint
    totalClaimed: bigint
    cancelled: boolean
    exists: boolean
  } | undefined
  const { data: claimableRaw, refetch: refetchClaimable } = useClaimable(artist, address)
  const { data: discountedRaw } = useDiscountedMonthlyFee(artist)
  const discounted = discountedRaw as bigint | undefined

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddr,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && club ? [address, club] : undefined,
    chainId,
    query: { enabled: !!address && !!club },
  })

  const { writeContract, data: txHash, isPending, error } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (error) toast.error(error.message.slice(0, 120))
  }, [error])

  useEffect(() => {
    if (isSuccess) {
      toast.success(t.subTxOk)
      void refetchPlan()
      void refetchSub()
      void refetchClaimable()
      void refetchAllowance()
    }
  }, [isSuccess, t.subTxOk, refetchPlan, refetchSub, refetchClaimable, refetchAllowance])

  function parseAmt(s: string): bigint | null {
    try {
      const n = parseUnits(s.trim() || '0', 6)
      return n > 0n ? n : null
    } catch {
      return null
    }
  }

  function ensureClub(): boolean {
    if (!club) {
      toast.error(t.subNotDeployed)
      return false
    }
    return true
  }

  function approveIfNeeded(amount: bigint, then: () => void) {
    if (!club || !usdcAddr) return
    const have = (allowance as bigint | undefined) ?? 0n
    if (have >= amount) {
      then()
      return
    }
    writeContract({
      address: usdcAddr,
      abi: erc20Abi,
      functionName: 'approve',
      args: [club, amount],
    }, {
      onSuccess: () => toast.success(t.usdcApproved),
      onError: (e) => toast.error(e.message.slice(0, 100)),
    })
  }

  function doDeposit(andLock: boolean) {
    if (!ensureClub() || !artist || !address) return
    const amt = parseAmt(amountStr)
    if (!amt) {
      toast.error(t.subInvalidAmount)
      return
    }
    approveIfNeeded(amt, () => {
      writeContract({
        address: club!,
        abi: SUBSCRIPTIONS_ABI,
        functionName: 'deposit',
        args: [artist, amt],
      }, {
        onSuccess: () => {
          if (andLock) {
            // lock after deposit lands — user taps again if needed; try chained via refetch
            setTimeout(() => {
              writeContract({
                address: club!,
                abi: SUBSCRIPTIONS_ABI,
                functionName: 'lockMonths',
                args: [artist, ANNUAL_MONTHS],
              })
            }, 2500)
          }
        },
        onError: (e) => toast.error(e.message.slice(0, 100)),
      })
    })
  }

  function doLockOnly() {
    if (!ensureClub() || !artist) return
    writeContract({
      address: club!,
      abi: SUBSCRIPTIONS_ABI,
      functionName: 'lockMonths',
      args: [artist, ANNUAL_MONTHS],
    }, { onError: (e) => toast.error(e.message.slice(0, 100)) })
  }

  function doWithdraw() {
    if (!ensureClub() || !artist) return
    const amt = parseAmt(amountStr)
    if (!amt) {
      toast.error(t.subInvalidAmount)
      return
    }
    writeContract({
      address: club!,
      abi: SUBSCRIPTIONS_ABI,
      functionName: 'withdraw',
      args: [artist, amt],
    }, { onError: (e) => toast.error(e.message.slice(0, 100)) })
  }

  function doCancel() {
    if (!ensureClub() || !artist) return
    writeContract({
      address: club!,
      abi: SUBSCRIPTIONS_ABI,
      functionName: 'cancel',
      args: [artist],
    }, { onError: (e) => toast.error(e.message.slice(0, 100)) })
  }

  function doSetPlan() {
    if (!ensureClub() || !address) return
    const fee = parseAmt(planFeeStr)
    if (!fee) {
      toast.error(t.subInvalidAmount)
      return
    }
    writeContract({
      address: club!,
      abi: SUBSCRIPTIONS_ABI,
      functionName: 'setPlan',
      args: [fee, planTitle.trim() || 'Club de correo'],
    }, {
      onSuccess: () => {
        setArtistInput(address)
        toast.success(t.subPlanSaved)
      },
      onError: (e) => toast.error(e.message.slice(0, 100)),
    })
  }

  function doClaim() {
    if (!ensureClub()) return
    const subAddr = claimSub.trim()
    if (!/^0x[0-9a-fA-F]{40}$/.test(subAddr)) {
      toast.error(t.subInvalidArtist)
      return
    }
    writeContract({
      address: club!,
      abi: SUBSCRIPTIONS_ABI,
      functionName: 'claim',
      args: [subAddr as `0x${string}`],
    }, { onError: (e) => toast.error(e.message.slice(0, 100)) })
  }

  const busy = isPending || confirming

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <button className="btn-outline" onClick={onBack} style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', marginBottom: '1.25rem' }}>
        ← {t.back}
      </button>

      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <div className="halftone-corner" style={{ top: 0, right: 0, width: 70, height: 70 }} />
        <h1 className="display" style={{ color: 'var(--blue)', fontSize: '1.6rem', margin: 0 }}>{t.subTitle}</h1>
        <p style={{ color: 'var(--ink-2)', fontSize: '0.9rem', margin: '0.5rem 0 0', lineHeight: 1.5 }}>{t.subIntro}</p>
        <hr className="rule-blue" style={{ marginTop: '0.75rem' }} />
      </div>

      {!configured && (
        <div className="framed-card" style={{ padding: '1rem', marginBottom: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
          {t.subNotDeployed}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {(['deposit', 'balance', 'artist'] as const).map(k => (
          <button
            key={k}
            className={tab === k ? 'btn-primary' : 'btn-outline'}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}
            onClick={() => setTab(k)}
          >
            {k === 'deposit' ? t.subTabDeposit : k === 'balance' ? t.subTabBalance : t.subTabArtist}
          </button>
        ))}
      </div>

      {(tab === 'deposit' || tab === 'balance') && (
        <div className="framed-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <label className="field-label">{t.subArtistAddr}</label>
          <input
            className="field-input"
            placeholder="0x…"
            value={artistInput}
            onChange={e => setArtistInput(e.target.value)}
            style={{ width: '100%', marginBottom: '0.75rem' }}
          />
          {plan?.active && (
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-2)', margin: '0 0 0.75rem' }}>
              <strong>{plan.title}</strong> · {fmtUsdc(plan.monthlyFeeUsdc)} USDC / mes
              {discounted !== undefined && (
                <> · {t.subAnnualPlanLabel}: {fmtUsdc(discounted)} USDC</>
              )}
            </p>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--blue)', margin: '0 0 0.75rem', fontWeight: 600 }}>
            {t.subAnnualPlanLabel}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0 0 1rem', lineHeight: 1.45 }}>
            {t.subShippingNote}
          </p>

          {tab === 'deposit' && (
            <>
              <label className="field-label">{t.subDepositAmount}</label>
              <input
                className="field-input"
                type="text"
                inputMode="decimal"
                placeholder="100"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                style={{ width: '100%', marginBottom: '0.75rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" disabled={busy || !isConnected || !configured} onClick={() => doDeposit(false)} style={{ flex: 1 }}>
                  {busy ? t.confirming : t.subDepositBtn}
                </button>
                <button className="btn-outline" disabled={busy || !isConnected || !configured} onClick={() => doDeposit(true)} style={{ flex: 1, fontSize: '0.8rem' }}>
                  {t.subDepositAndLockBtn}
                </button>
              </div>
              <button className="btn-outline" disabled={busy || !isConnected || !configured} onClick={doLockOnly}
                style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                {t.subLockOnlyBtn}
              </button>
            </>
          )}

          {tab === 'balance' && (
            <>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                <div>{t.subFreeBalance}: <strong>{fmtUsdc(sub?.balance)} USDC</strong></div>
                <div>{t.subLocked}: <strong>{fmtUsdc(sub?.lockedRemaining)} USDC</strong>
                  {sub && sub.lockedMonthsLeft > 0n ? ` (${sub.lockedMonthsLeft.toString()} ${t.subMonthsLeft})` : ''}
                </div>
                <div>{t.subClaimableNow}: <strong>{fmtUsdc(claimableRaw as bigint | undefined)} USDC</strong></div>
                <div>{t.subTotalClaimed}: {fmtUsdc(sub?.totalClaimed)} USDC</div>
                {sub?.cancelled && <div style={{ color: 'var(--danger)' }}>{t.subCancelled}</div>}
              </div>
              <label className="field-label">{t.subWithdrawAmount}</label>
              <input
                className="field-input"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                style={{ width: '100%', marginBottom: '0.75rem' }}
              />
              <button className="btn-primary" disabled={busy || !isConnected || !configured} onClick={doWithdraw} style={{ width: '100%', marginBottom: '0.5rem' }}>
                {t.subWithdrawBtn}
              </button>
              <button className="btn-outline" disabled={busy || !isConnected || !configured || !!sub?.cancelled} onClick={doCancel} style={{ width: '100%', fontSize: '0.8rem' }}>
                {t.subCancelBtn}
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'artist' && (
        <div className="framed-card" style={{ padding: '1.25rem' }}>
          <h2 className="display" style={{ fontSize: '1.05rem', color: 'var(--blue)', margin: '0 0 0.75rem' }}>{t.subArtistPanelTitle}</h2>
          {/* Dashboard: live from events/views when club is deployed; example until then */}
          <ArtistSubsDashboard
            lang={lang}
            rows={EXAMPLE_ARTIST_SUBS}
            example={!configured}
          />
          <label className="field-label">{t.subPlanTitle}</label>
          <input className="field-input" value={planTitle} onChange={e => setPlanTitle(e.target.value)} style={{ width: '100%', marginBottom: '0.75rem' }} />
          <label className="field-label">{t.subPlanFee}</label>
          <input className="field-input" value={planFeeStr} onChange={e => setPlanFeeStr(e.target.value)} placeholder="50" style={{ width: '100%', marginBottom: '0.75rem' }} />
          <button className="btn-primary" disabled={busy || !isConnected || !configured} onClick={doSetPlan} style={{ width: '100%', marginBottom: '1.25rem' }}>
            {t.subSavePlanBtn}
          </button>

          <label className="field-label">{t.subClaimSubscriber}</label>
          <input className="field-input" value={claimSub} onChange={e => setClaimSub(e.target.value)} placeholder="0x…" style={{ width: '100%', marginBottom: '0.75rem' }} />
          <button className="btn-outline" disabled={busy || !isConnected || !configured} onClick={doClaim} style={{ width: '100%' }}>
            {t.subClaimBtn}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.75rem', lineHeight: 1.45 }}>{t.subClaimHint}</p>
        </div>
      )}
    </div>
  )
}
