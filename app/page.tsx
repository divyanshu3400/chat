import dynamic from 'next/dynamic'

const CipherApp = dynamic(() => import('@/components/CipherApp'), { ssr: false })

export default function Page() {
  return <CipherApp />
}
