import dynamic from 'next/dynamic'

const CipherApp = dynamic(() => import('@/src/components/CipherApp'), { ssr: false })

export default function Page() {
  return <CipherApp />
}
