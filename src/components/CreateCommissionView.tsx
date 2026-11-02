import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { toast } from 'sonner'
import { parseUsdc, formatUsdc } from '@/onchain-money'
import { KATHONEJO_ABI, getContractAddress, isSupportedChain, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { translations } from '@/i18n'
import type { Lang } from '@/i18n'

function computeMinDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
const MODULE_MIN_DATE = computeMinDate()

interface Props {
  lang: Lang
  onCreated: () => void
  onBack: () => void
}

interface MilestoneRow {
  description: string
  amount: string
}

export function CreateCommissionView({ lang, onCreated, onBack }: Props) {
  const t = translations[lang]
  const { address, chainId } = useAccount()
  const readChainId = chainId !== undefined && isSupportedChain(chainId) ? chainId : ARC_TESTNET_CHAIN_ID
  const contractAddr = getContractAddress(readChainId) ?? undefined

  const [collector, setCollector] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [deadline, setDeadline] = useState('')
  const [title, setTitle] = useState('')

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [milestones, setMilestones] = useState<MilestoneRow[]>([])
  const [royaltyPct, setRoyaltyPct] = useState('0')

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash,
    onReplaced: () => toast(t.transactionConfirmed),
  })

  function addMilestone() {
    if (milestones.length >= 20) return
    setMilestones(prev => [...prev, { description: '', amount: '' }])
  }
  function removeMilestone(i: number) {
    setMilestones(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateMilestone(i: number, field: keyof MilestoneRow, val: string) {
    setMilestones(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  }

  const totalAmt = amountStr ? parseFloat(amountStr) : 0
  const msTotalNum = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0)
  const msError = milestones.length > 0 && Math.abs(msTotalNum - totalAmt) > 0.000001
  const msTotal = BigInt(Math.round(msTotalNum * 1_000_000))
  const royaltyBps = Math.round(parseFloat(royaltyPct || '0') * 100)

  function handleCreate() {
    if (!address || !contractAddr) return
    if (!collector || !amountStr || !deadline || !title) return
    if (msError) { toast.error(t.milestoneSumError); return }
    if (royaltyBps > 1000) { toast.error(t.royaltyMax); return }

    const deadlineTs = BigInt(Math.floor(new Date(deadline).getTime() / 1000))
    const amount = parseUsdc(amountStr)
    const mDescs = milestones.map(m => m.description)
    const mAmts = milestones.map(m => parseUsdc(m.amount))

    writeContract({
      address: contractAddr,
      abi: KATHONEJO_ABI,
      functionName: 'createCommission',
      args: [
        collector as `0x${string}`,
        amount,
        deadlineTs,
        title.trim(),
        royaltyBps,
        mDescs,
        mAmts,
      ],
    }, {
      onSuccess: () => {
        toast.success(t.commissionCreated)
        onCreated()
      },
      onError: (e) => toast.error(e.message.slice(0, 100)),
    })
  }

  const busy = isPending || confirming
  const minDateStr = MODULE_MIN_DATE

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <button className="btn-outline" onClick={onBack}
        style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', marginBottom: '1.5rem' }}>
        ← {t.back}
      </button>

      <div style={{ position: 'relative', marginBottom: '1.75rem' }}>
        <div className="halftone-corner" style={{ top: 0, right: 0, width: 80, height: 80 }} />
        <h1 className="display" style={{ color: 'var(--blue)', fontSize: '1.75rem', margin: 0 }}>
          {t.newCommission}
        </h1>
        <hr className="rule-blue" style={{ marginTop: '0.5rem' }} />
      </div>

      <div className="framed-card" style={{ padding: '1.5rem 1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label={t.commissionTitle}>
            <input className="field-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Portrait in oils" />
          </Field>
          <Field label={t.collectorAddress}>
            <input className="field-input" value={collector} onChange={e => setCollector(e.target.value)} placeholder="0x…" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <Field label={t.amount}>
              <input className="field-input" type="number" min="0.01" step="0.01" value={amountStr} onChange={e => setAmountStr(e.target.value)} placeholder="100.00" />
            </Field>
            <Field label={t.deadline}>
              <input className="field-input" type="date" min={minDateStr} value={deadline} onChange={e => setDeadline(e.target.value)} />
            </Field>
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1rem', lineHeight: 1.5 }}>{t.deadlineHint}</p>

        <details
          open={advancedOpen}
          onToggle={e => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
          style={{ marginTop: '1.5rem', border: '1.5px dashed var(--border)', borderRadius: 8, padding: '0.75rem 1rem' }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '0.85rem',
              color: 'var(--blue)',
              listStyle: 'none',
            }}
          >
            {t.advancedSection} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({t.optional})</span>
          </summary>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>{t.advancedSectionHint}</p>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="field-label">{t.milestones}</label>
              <button
                type="button"
                onClick={addMilestone}
                disabled={milestones.length >= 20}
                style={{
                  background: 'none', border: '1.5px dashed var(--blue)', borderRadius: 9999,
                  color: 'var(--blue)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                  fontSize: '0.75rem', padding: '0.2rem 0.75rem', cursor: 'pointer',
                }}
              >
                {t.addMilestone}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>{t.milestonesHint}</p>
            {milestones.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {milestones.map((m, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: '0.5rem', alignItems: 'end' }}>
                    <div>
                      <label className="field-label">{t.milestoneDescription} {i + 1}</label>
                      <input
                        className="field-input"
                        value={m.description}
                        onChange={e => updateMilestone(i, 'description', e.target.value)}
                        placeholder={`Step ${i + 1}…`}
                      />
                    </div>
                    <div>
                      <label className="field-label">USDC</label>
                      <input
                        className="field-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={m.amount}
                        onChange={e => updateMilestone(i, 'amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMilestone(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.1rem', paddingBottom: '0.2rem' }}
                      aria-label="Remove milestone"
                    >×</button>
                  </div>
                ))}
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: msError ? 'var(--danger)' : 'var(--muted)' }}>
                  {t.milestoneOf} {formatUsdc(msTotal)} / {amountStr || '0'} USDC
                  {msError && <span style={{ marginLeft: '0.5rem', fontWeight: 700 }}>⚠ {t.milestoneSumError}</span>}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="field-label">{t.royalty} {t.royaltyMax}</label>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>{t.royaltyHint}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                className="field-input"
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={royaltyPct}
                onChange={e => setRoyaltyPct(e.target.value)}
                style={{ flex: 1, accentColor: 'var(--blue)' }}
              />
              <span className="poster" style={{ fontSize: '1.1rem', color: 'var(--blue)', minWidth: '3.5rem', textAlign: 'right' }}>
                {parseFloat(royaltyPct) === 0 ? t.noRoyalty : `${royaltyPct}%`}
              </span>
            </div>
          </div>
        </details>

        <div style={{ marginTop: '1.5rem' }}>
          <button
            className="btn-primary"
            style={{ width: '100%' }}
            disabled={busy || !collector || !amountStr || !deadline || !title || msError}
            onClick={handleCreate}
          >
            {busy ? t.creating : t.createCommission}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}
