import type { Lang } from './i18n'

export type FaqItem = { q: string; a: string }

export const faqCopy: Record<
  Lang,
  {
    title: string
    collectorTab: string
    artistTab: string
    close: string
    openLabel: string
    collector: FaqItem[]
    artist: FaqItem[]
  }
> = {
  es: {
    title: 'Preguntas frecuentes',
    collectorTab: 'Soy coleccionista',
    artistTab: 'Soy artista',
    close: 'Cerrar',
    openLabel: 'Abrir preguntas frecuentes',
    collector: [
      {
        q: '¿Qué es USDC?',
        a: 'USDC es una moneda digital pensada para valer cerca de 1 dólar. En Autentika los encargos se pagan en USDC sobre la red Arc.',
      },
      {
        q: '¿Cómo pago un encargo?',
        a: 'Conectá tu billetera en Arc. Cuando el artista cree el encargo con tu dirección, abrís el detalle, tocás «Aprobar USDC» y después «Financiar Encargo». Confirmá las dos transacciones en la billetera.',
      },
      {
        q: '¿Qué pasa con mi plata hasta la entrega?',
        a: 'Al financiar, el USDC queda guardado en el contrato inteligente (no en la billetera del artista). Se libera al artista cuando confirmás la recepción, o si el artista reclama automáticamente 14 días después de marcar la entrega.',
      },
      {
        q: '¿Qué es el certificado?',
        a: 'Cuando el artista marca la entrega, se crea en la cadena un Certificado de Autenticidad con datos de la obra, foto (URL + hash), sello, firma y red del artista. Después podés verlo y descargarlo en PDF.',
      },
      {
        q: '¿Y si el artista nunca entrega?',
        a: 'Antes de financiar, cualquiera puede cancelar. Si ya financiaste y pasa la fecha límite sin entrega, podés pedir reembolso y luego retirar el USDC a tu billetera. Si el artista sí entregó a tiempo, no hay reembolso: confirmás o, a los 14 días, el artista puede reclamar el pago.',
      },
      {
        q: '¿Hay comisiones de la plataforma?',
        a: 'Sí, pequeña: por defecto 0.5% (máx. 2%) solo cuando se libera el pago al artista — nunca en reembolsos. En reventas in-app / ERC-2981 hay un 0.25% de plataforma (máx. 1%). Además pagás el gas de Arc (USDC), que suele ser menos de un centavo.',
      },
    ],
    artist: [
      {
        q: '¿Cómo armo mi perfil?',
        a: 'En «Perfil del Artista» guardá tu nombre, sello (URL de imagen), firma (URL) y «Red del artista» (Instagram, web, Linktree u otro enlace). Eso se copia a cada certificado que emitas.',
      },
      {
        q: '¿Cuándo cobro?',
        a: 'Cuando el coleccionista confirma la recepción, o si pasaron 14 días desde que marcaste la entrega y aún no confirmó (entonces podés reclamar vos). Después aparece un aviso para «Retirar» el USDC a tu billetera.',
      },
      {
        q: '¿Cómo completo el certificado?',
        a: 'En un encargo financiado tocás «Marcar como Entregado» y completás título, técnica, dimensiones, fecha, cuidados, URL de la foto y su hash SHA-256. Al enviar se crea el certificado en cadena.',
      },
      {
        q: '¿Cómo paso USDC a pesos u otra moneda?',
        a: 'Podés usar un exchange que soporte Arc (como OKX, si lo ofrece) o puenteá USDC a Base con bridge.usdc.com y desde ahí lo cambiás en el exchange o billetera que uses.',
      },
      {
        q: '¿Autentika cobra algo?',
        a: 'Al liberar el pago, Autentika toma 0.5% (máx. 2%) como comisión de plataforma. Los reembolsos no tienen comisión. También pagás gas de Arc (USDC, suele ser menos de un centavo) al crear, marcar entrega o retirar.',
      },
      {
        q: '¿Cómo empiezo un encargo?',
        a: 'Creá un encargo con la dirección del coleccionista, el monto en USDC y una fecha límite. El coleccionista financia; vos entregás antes de esa fecha; el pago se libera al confirmar o a los 14 días.',
      },
    ],
  },
  en: {
    title: 'FAQ',
    collectorTab: "I'm a collector",
    artistTab: "I'm an artist",
    close: 'Close',
    openLabel: 'Open FAQ',
    collector: [
      {
        q: 'What is USDC?',
        a: 'USDC is a digital dollar meant to stay near $1. On Autentika, commissions are paid in USDC on the Arc network.',
      },
      {
        q: 'How do I pay?',
        a: 'Connect your wallet on Arc. When the artist creates a commission with your address, open it, tap “Approve USDC”, then “Fund Commission”. Confirm both transactions in your wallet.',
      },
      {
        q: 'Where does my money sit until delivery?',
        a: 'When you fund, USDC is held in the smart contract—not in the artist’s wallet. It is released to the artist when you confirm receipt, or if the artist auto-claims 14 days after marking delivery.',
      },
      {
        q: 'What is the certificate?',
        a: 'When the artist marks delivery, an on-chain Certificate of Authenticity is created with artwork details, photo (URL + hash), seal, signature, and artist link. You can view it and download a PDF.',
      },
      {
        q: 'What if the artist never delivers?',
        a: 'Before funding, either party can cancel. If you funded and the deadline passes with no delivery, you can claim a refund, then withdraw USDC to your wallet. If the artist delivered on time, there is no refund—you confirm, or after 14 days the artist can claim payment.',
      },
      {
        q: 'Are there platform fees?',
        a: 'Yes, a small one: default 0.5% (cap 2%) only when payment is released to the artist — never on refunds. In-app / ERC-2981 resales include a 0.25% platform share (cap 1%). You also pay Arc gas (USDC), usually under one cent.',
      },
    ],
    artist: [
      {
        q: 'How do I set up my profile?',
        a: 'In Artist Profile, save your display name, seal image URL, signature image URL, and Artist link (Instagram, website, Linktree, or another URL). That data is snapshotted into each certificate you issue.',
      },
      {
        q: 'When do I get paid?',
        a: 'When the collector confirms receipt, or 14 days after you mark delivery if they still haven’t confirmed (you can auto-claim). Then use Withdraw to move USDC into your wallet.',
      },
      {
        q: 'How do I fill the certificate?',
        a: 'On a funded commission, tap “Mark as Delivered” and enter title, technique, dimensions, date, care notes, photo URL, and its SHA-256 hash. Submitting creates the on-chain certificate.',
      },
      {
        q: 'How do I turn USDC into local currency?',
        a: 'Use an exchange that supports Arc (for example OKX, if available), or bridge USDC to Base with bridge.usdc.com and cash out from there.',
      },
      {
        q: 'Does Autentika take a cut?',
        a: 'On release Autentika takes 0.5% (cap 2%) as platform fee. Refunds have no fee. You also pay Arc gas (USDC, usually under a cent) to create, mark delivery, or withdraw.',
      },
      {
        q: 'How do I start a commission?',
        a: 'Create a commission with the collector’s address, USDC amount, and a deadline. The collector funds; you deliver before the deadline; payment releases on confirm or after 14 days.',
      },
    ],
  },
}
