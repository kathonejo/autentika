import { useEffect, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useDeployContract } from 'wagmi'
import { toast } from 'sonner'
import { translations } from '@/i18n'
import type { Lang } from '@/i18n'
import {
  usePlatformFeeBps, usePlatformResaleBps, useFeeRecipient, useContractOwner,
  useReadChainId,
} from '@/hooks/useCommissions'
import { KATHONEJO_ABI, getContractAddress, getUsdcAddress, isSupportedChain } from '@/contract'
import { AUTENTIKA_DIRECTORY_ABI } from '@/deploy/autentikaDirectoryAbi'
import { AUTENTIKA_DIRECTORY_BYTECODE } from '@/deploy/autentikaDirectoryBytecode'
import { getDirectoryAddress, setStoredDirectoryAddress, isDirectoryConfigured } from '@/directory'
import { AUTENTIKA_SUBSCRIPTIONS_ABI } from '@/deploy/autentikaSubscriptionsAbi'
import { AUTENTIKA_SUBSCRIPTIONS_BYTECODE } from '@/deploy/autentikaSubscriptionsBytecode'
import {
  getSubscriptionsAddress, setStoredSubscriptionsAddress, isSubscriptionsConfigured,
  DEFAULT_FEE_RECIPIENT,
} from '@/subscriptions'

interface AdminViewProps {
  lang: Lang
  onBack: () => void
}

interface FeeRowProps {
  label: string
  currentVal: number | undefined
  maxBps: number
  onSet: (v: number) => void
  busy: boolean
  hint: string
}

function FeeRow({ label, currentVal, maxBps, onSet, busy, hint }: FeeRowProps) {
  const [input, setInput] = useState('')
  return (
    <div style={{ borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
      <label className="field-label">{label}</label>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>{hint}</p>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--ink-2)' }}>
          Current: <strong>{currentVal ?? '…'} bps</strong>
          {currentVal !== undefined && <> ({(currentVal / 100).toFixed(2)}%)</>}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>· Max {maxBps} bps ({(maxBps / 100).toFixed(0)}%)</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <input
          className="field-input"
          type="number"
          min={0}
          max={maxBps}
          placeholder={`0–${maxBps}`}
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ maxWidth: '100px' }}
        />
        <button
          className="btn-outline"
          disabled={busy || !input || Number(input) < 0 || Number(input) > maxBps}
          onClick={() => { onSet(Number(input)); setInput('') }}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
        >
          {busy ? 'Saving…' : 'Set'}
        </button>
      </div>
    </div>
  )
}

function DirectoryDeployCard({ lang }: { lang: Lang }) {
  const t = translations[lang]
  const chainId = useReadChainId()
  const autentika = getContractAddress(chainId) ?? undefined
  const [paste, setPaste] = useState('')
  const [current, setCurrent] = useState<string | null>(() => getDirectoryAddress(chainId))

  useEffect(() => {
    setCurrent(getDirectoryAddress(chainId))
  }, [chainId])

  const { deployContract, data: deployHash, isPending, error } = useDeployContract()
  const { data: receipt, isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: deployHash })

  useEffect(() => {
    if (isSuccess && receipt?.contractAddress) {
      const addr = receipt.contractAddress as `0x${string}`
      setStoredDirectoryAddress(addr)
      setCurrent(addr)
      toast.success(`${t.directoryAddrSaved}: ${addr}`)
    }
  }, [isSuccess, receipt, t.directoryAddrSaved])

  useEffect(() => {
    if (error) toast.error(error.message.slice(0, 120))
  }, [error])

  function deploy() {
    if (!autentika) {
      toast.error('AutentikaV2 address missing for this network')
      return
    }
    deployContract({
      abi: AUTENTIKA_DIRECTORY_ABI,
      bytecode: AUTENTIKA_DIRECTORY_BYTECODE,
      args: [autentika],
    })
  }

  function savePaste() {
    const raw = paste.trim()
    if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
      toast.error('Invalid address')
      return
    }
    setStoredDirectoryAddress(raw as `0x${string}`)
    setCurrent(raw)
    toast.success(t.directoryAddrSaved)
  }

  return (
    <div className="framed-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 className="display" style={{ fontSize: '1.1rem', color: 'var(--blue)', margin: '0 0 0.5rem' }}>
        {t.deployDirectoryTitle}
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-2)', margin: '0 0 1rem', lineHeight: 1.5 }}>
        {t.deployDirectoryHint}
      </p>
      {current && (
        <p style={{ fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--muted)', marginBottom: '0.75rem' }}>
          {current}
          {isDirectoryConfigured(chainId) ? ' ✓' : ''}
        </p>
      )}
      <button
        className="btn-primary"
        style={{ width: '100%', marginBottom: '0.75rem' }}
        disabled={isPending || confirming || !autentika}
        onClick={deploy}
      >
        {isPending || confirming ? t.deployingDirectory : t.deployDirectoryBtn}
      </button>
      <label className="field-label">{t.pasteDirectoryAddr}</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          className="field-input"
          placeholder="0x…"
          value={paste}
          onChange={e => setPaste(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <button className="btn-outline" onClick={savePaste} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
          Set
        </button>
      </div>
    </div>
  )
}


function SubscriptionsDeployCard({ lang }: { lang: Lang }) {
  const t = translations[lang]
  const { address } = useAccount()
  const chainId = useReadChainId()
  const usdc = isSupportedChain(chainId) ? getUsdcAddress(chainId) : undefined
  const feeFromV2 = useFeeRecipient()
  const feeRecipient = (typeof feeFromV2.data === 'string' && /^0x[0-9a-fA-F]{40}$/.test(feeFromV2.data)
    ? feeFromV2.data
    : DEFAULT_FEE_RECIPIENT) as `0x${string}`
  const [paste, setPaste] = useState('')
  const [current, setCurrent] = useState<string | null>(() => getSubscriptionsAddress(chainId))

  useEffect(() => {
    setCurrent(getSubscriptionsAddress(chainId))
  }, [chainId])

  const { deployContract, data: deployHash, isPending, error } = useDeployContract()
  const { data: receipt, isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: deployHash })

  useEffect(() => {
    if (isSuccess && receipt?.contractAddress) {
      const addr = receipt.contractAddress as `0x${string}`
      setStoredSubscriptionsAddress(addr)
      setCurrent(addr)
      toast.success(`${t.subscriptionsAddrSaved}: ${addr}`)
    }
  }, [isSuccess, receipt, t.subscriptionsAddrSaved])

  useEffect(() => {
    if (error) toast.error(error.message.slice(0, 120))
  }, [error])

  function deploy() {
    if (!usdc || !address) {
      toast.error('USDC or wallet missing')
      return
    }
    deployContract({
      abi: AUTENTIKA_SUBSCRIPTIONS_ABI,
      bytecode: AUTENTIKA_SUBSCRIPTIONS_BYTECODE,
      args: [usdc, address, feeRecipient],
    })
  }

  function savePaste() {
    const raw = paste.trim()
    if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
      toast.error('Invalid address')
      return
    }
    setStoredSubscriptionsAddress(raw as `0x${string}`)
    setCurrent(raw)
    toast.success(t.subscriptionsAddrSaved)
  }

  return (
    <div className="framed-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 className="display" style={{ fontSize: '1.1rem', color: 'var(--blue)', margin: '0 0 0.5rem' }}>
        {t.deploySubscriptionsTitle}
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-2)', margin: '0 0 1rem', lineHeight: 1.5 }}>
        {t.deploySubscriptionsHint}
      </p>
      {current && (
        <p style={{ fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--muted)', marginBottom: '0.75rem' }}>
          {current}
          {isSubscriptionsConfigured(chainId) ? ' ✓' : ''}
        </p>
      )}
      <button
        className="btn-primary"
        style={{ width: '100%', marginBottom: '0.75rem' }}
        disabled={isPending || confirming || !usdc || !address}
        onClick={deploy}
      >
        {isPending || confirming ? t.deployingSubscriptions : t.deploySubscriptionsBtn}
      </button>
      <label className="field-label">{t.pasteSubscriptionsAddr}</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          className="field-input"
          placeholder="0x…"
          value={paste}
          onChange={e => setPaste(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <button className="btn-outline" onClick={savePaste} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
          Set
        </button>
      </div>
    </div>
  )
}

export function AdminView({ lang, onBack }: AdminViewProps) {
  const t = translations[lang]
  const { address } = useAccount()
  const chainId = useReadChainId()
  const contractAddr = getContractAddress(chainId) ?? undefined

  const { data: owner } = useContractOwner()
  const { data: feeBps } = usePlatformFeeBps()
  const { data: resaleBps } = usePlatformResaleBps()
  const { data: feeRecip } = useFeeRecipient()

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase()

  const { writeContract, data: hash1, isPending: p1 } = useWriteContract()
  const { writeContract: writeContract2, data: hash2, isPending: p2 } = useWriteContract()
  const { writeContract: writeContract3, data: hash3, isPending: p3 } = useWriteContract()
  const { isLoading: c1 } = useWaitForTransactionReceipt({ hash: hash1 })
  const { isLoading: c2 } = useWaitForTransactionReceipt({ hash: hash2 })
  const { isLoading: c3 } = useWaitForTransactionReceipt({ hash: hash3 })

  const [recipientInput, setRecipientInput] = useState('')

  function setFeeBps(bps: number) {
    if (!contractAddr) return
    writeContract({
      address: contractAddr,
      abi: KATHONEJO_ABI,
      functionName: 'setPlatformFeeBps',
      args: [bps],
    }, {
      onSuccess: () => toast.success(t.feeSet),
      onError: (e) => toast.error(e.message.slice(0, 80)),
    })
  }

  function setResaleBps(bps: number) {
    if (!contractAddr) return
    writeContract2({
      address: contractAddr,
      abi: KATHONEJO_ABI,
      functionName: 'setPlatformResaleBps',
      args: [bps],
    }, {
      onSuccess: () => toast.success(t.feeSet),
      onError: (e) => toast.error(e.message.slice(0, 80)),
    })
  }

  function setFeeRecipient() {
    if (!contractAddr || !recipientInput) return
    writeContract3({
      address: contractAddr,
      abi: KATHONEJO_ABI,
      functionName: 'setFeeRecipient',
      args: [recipientInput as `0x${string}`],
    }, {
      onSuccess: () => { toast.success(t.feeSet); setRecipientInput('') },
      onError: (e) => toast.error(e.message.slice(0, 80)),
    })
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <button className="btn-outline" onClick={onBack}
        style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', marginBottom: '1.5rem' }}>
        ← {t.back}
      </button>

      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <div className="halftone-corner" style={{ top: 0, right: 0, width: 70, height: 70 }} />
        <h1 className="display" style={{ color: 'var(--blue)', fontSize: '1.6rem', margin: 0 }}>
          {t.adminTitle}
        </h1>
        <hr className="rule-blue" style={{ marginTop: '0.5rem' }} />
      </div>

      <DirectoryDeployCard lang={lang} />

      <SubscriptionsDeployCard lang={lang} />

      {!isOwner ? (
        <div className="framed-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)' }}>
          <p style={{ margin: 0 }}>{t.adminOnlyOwner}</p>
          {typeof owner === 'string' && (
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              Owner: {owner}
            </p>
          )}
        </div>
      ) : (
        <div className="framed-card" style={{ padding: '1.5rem' }}>

          <FeeRow
            label={t.platformFeeBps}
            currentVal={feeBps !== undefined ? Number(feeBps) : undefined}
            maxBps={200}
            onSet={setFeeBps}
            busy={p1 || c1}
            hint="Taken on every USDC release to the artist. Default 50 bps = 0.5%."
          />

          <FeeRow
            label={t.platformResaleBps}
            currentVal={resaleBps !== undefined ? Number(resaleBps) : undefined}
            maxBps={100}
            onSet={setResaleBps}
            busy={p2 || c2}
            hint="Taken on marketplace resale purchases. Default 25 bps = 0.25%."
          />

          <div>
            <label className="field-label">{t.feeRecipient}</label>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Current: <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{(feeRecip as string | undefined) ?? '…'}</span>
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                className="field-input"
                placeholder="0x…"
                value={recipientInput}
                onChange={e => setRecipientInput(e.target.value)}
                style={{ flex: 1, minWidth: '200px' }}
              />
              <button
                className="btn-outline"
                disabled={p3 || c3 || !recipientInput.startsWith('0x')}
                onClick={setFeeRecipient}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
              >
                {p3 || c3 ? 'Saving…' : 'Set'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
