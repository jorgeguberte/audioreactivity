import dynamic from 'next/dynamic'

const AudioReactiveParticles = dynamic(
  () => import('./components/AudioReactiveParticles').then((mod) => mod.AudioReactiveParticles),
  { ssr: false }
)

export default function Home() {
  return (
    <main>
      <AudioReactiveParticles />
    </main>
  )
}