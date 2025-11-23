import dynamic from 'next/dynamic'

const BackgroundEffect = dynamic(() => import('@/components/background-effect'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function Home() {
  return <BackgroundEffect />
}

