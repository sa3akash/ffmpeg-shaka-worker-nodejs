'use client'

import React from 'react'
import { useShakaPlayer } from './hooks/useShakaPlayer'

const ShakaPlayer = () => {

  const {videoRef,containerRef} = useShakaPlayer()

  return (
    <div ref={containerRef} className='aspect-video bg-amber-950 w-2xl'>
      <video ref={videoRef}></video>
    </div>
  )
}

export default ShakaPlayer