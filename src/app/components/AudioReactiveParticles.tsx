'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useBoxProjectedEnv } from '@react-three/drei'
import * as THREE from 'three'

interface FrequencyRange {
  min: number;
  max: number;
  color: THREE.Color;
}

function AudioReactiveBoxes() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const boxRefs = useRef<THREE.Mesh[]>([])
  const audioDataRef = useRef(new Uint8Array(2048))
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  // Define the frequency ranges (in Hz) with specific colors
  const frequencyRanges: FrequencyRange[] = [
    {min: 20, max: 60, color: new THREE.Color(0xffff00)},    // Sub-bass - Yellow
    { min: 60, max: 250, color: new THREE.Color(0xff0000) },    // Bass - Red
    { min: 250, max: 2000, color: new THREE.Color(0x00ff00) },  // Mid-range - Green
    { min: 2000, max: 8000, color: new THREE.Color(0x0000ff) } // Treble - Blue
  ]

  const initializeAudio = async () => {
    if (audioContext) return

    const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const newAnalyser = newAudioContext.createAnalyser()
    newAnalyser.fftSize = 4096 // Increased for better frequency resolution

    const response = await fetch('/nakamatomo.mp3')
    const arrayBuffer = await response.arrayBuffer()
    const newAudioBuffer = await newAudioContext.decodeAudioData(arrayBuffer)

    setAudioContext(newAudioContext)
    setAnalyser(newAnalyser)
    setAudioBuffer(newAudioBuffer)
  }

  const toggleAudio = async () => {
    if (!audioContext || !audioBuffer || !analyser) {
      await initializeAudio()
      return
    }

    if (isPlaying) {
      sourceRef.current?.stop()
      setIsPlaying(false)
    } else {
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(analyser)
      analyser.connect(audioContext.destination)
      source.start()
      sourceRef.current = source
      setIsPlaying(true)
    }
  }

  useFrame(() => {
    if (!analyser || !isPlaying) return

    analyser.getByteFrequencyData(audioDataRef.current)

    frequencyRanges.forEach((range, index) => {
      const box = boxRefs.current[index]
      if (!box) return

      const nyquist = audioContext!.sampleRate / 2
      const lowIndex = Math.round((range.min / nyquist) * audioDataRef.current.length)
      const highIndex = Math.round((range.max / nyquist) * audioDataRef.current.length)

      let total = 0
      let count = 0

      for (let i = lowIndex; i <= highIndex; i++) {
        total += audioDataRef.current[i]
        count++
      }

      const averageFrequency = total / count

      // Normalize the average frequency (0-255) to a scale factor (1-2)
      const scaleFactor = 1 + (averageFrequency / 255)

      // Apply the scale factor to the box
      box.scale.set(1, Math.sin(scaleFactor), 1)
      box.position.setY(Math.cos(scaleFactor) / 2)
      box.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, Math.tan(averageFrequency)/10, 0), 0.01))

      // Set the box color based on the predefined color and intensity
      const intensity = averageFrequency/255;
      const color = range.color.clone().multiplyScalar(intensity)
      ;(box.material as THREE.MeshPhongMaterial).color = color
    })
  })

  return (
    <>
      {frequencyRanges.map((range, index) => (
        <mesh
          key={index}
          ref={(el) => (boxRefs.current[index] = el as THREE.Mesh)}
          position={[index * 2 - 2, 0, 0]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshPhongMaterial color={range.color} />
        </mesh>
      ))}
      <mesh position={[0, -2, 0]} onClick={toggleAudio}>
        <boxGeometry args={[1, 0.5, 0.5]} />
        <meshPhongMaterial color={isPlaying ? "#00ff00" : "#ff0000"} />
      </mesh>
    </>
  )
}

export function AudioReactiveParticles() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 75, near: 0.1, far: 1000 }}>
        <color attach="background" args={['#000']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <AudioReactiveBoxes />
      </Canvas>
    </div>
  )
}