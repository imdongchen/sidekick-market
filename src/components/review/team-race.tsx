'use client'

import type { ReviewData } from '@/types/review'
import { yardsToMiles } from '@/utils/yard'
import { motion, useInView } from 'framer-motion'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface TeamRaceSlideProps {
  data: ReviewData
  onNext: () => void
}

export function TeamRaceSlide({ data, onNext }: TeamRaceSlideProps) {
  const ref = useRef(null)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const isInView = useInView(ref, { once: true })
  const [showCelebration, setShowCelebration] = useState(false)

  const swimmers = data.swimmers || []

  // Sort by distance
  const sortedSwimmers = [...swimmers].sort((a, b) => b.distance - a.distance)
  const maxDistance = Math.max(...swimmers.map((s) => s.distance), 1)

  // Get season based on month (for background)
  const getSeason = (month: number) => {
    if (month >= 3 && month <= 5) return 'spring'
    if (month >= 6 && month <= 8) return 'summer'
    if (month >= 9 && month <= 11) return 'autumn'
    return 'winter'
  }

  const currentSeason = getSeason(new Date().getMonth() + 1)

  const seasonColors = {
    spring: 'from-green-400/20 via-emerald-300/20 to-teal-400/20',
    summer: 'from-yellow-400/20 via-orange-300/20 to-amber-400/20',
    autumn: 'from-orange-400/20 via-red-300/20 to-amber-500/20',
    winter: 'from-blue-400/20 via-cyan-300/20 to-indigo-400/20',
  }

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setShowCelebration(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [isInView])

  return (
    <div
      ref={ref}
      className={`relative h-screen w-full bg-gradient-to-br ${seasonColors[currentSeason]}`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 0.1, y: 1000 } : {}}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute left-[10%] h-2 w-2 rounded-full bg-white"
            style={{ left: `${Math.random() * 100}%` }}
          />
        ))}
      </div>

      {/* Title */}
      <div className="absolute left-1/2 top-12 z-10 w-full -translate-x-1/2 text-center">
        <h1 className="mb-2 text-4xl font-bold text-white md:text-6xl">
          {data.year} Team Race
        </h1>
      </div>

      {/* Swim lanes */}
      <div className="absolute left-0 right-0 top-1/2 max-h-[70vh] -translate-y-1/2 space-y-8 overflow-y-auto px-8">
        {sortedSwimmers.map((swimmer, index) => {
          const progress = (swimmer.distance / maxDistance) * 100
          const delay = index * 0.2

          return (
            <motion.div
              key={swimmer.id}
              initial={{ opacity: 0, x: -100 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay }}
              className="flex items-center gap-4"
            >
              {/* Swimmer info */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    // set search param to swimmer.slug
                    const params = new URLSearchParams(searchParams)
                    params.set('user', swimmer.slug)
                    router.replace(`${pathname}?${params.toString()}`)

                    onNext()
                  }}
                >
                  {swimmer.photo ? (
                    <img
                      src={swimmer.photo}
                      alt={swimmer.name}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 font-bold text-white">
                      {swimmer.name[0]}
                    </div>
                  )}
                </button>
                <div>
                  <p className="font-semibold text-white">
                    {swimmer.name.split(' ')[0]}
                  </p>
                  <p className="text-sm text-white/70">
                    {yardsToMiles(swimmer.distance).toFixed(1)} mi
                  </p>
                </div>
              </div>

              {/* Lane */}
              <div className="relative h-12 flex-1 overflow-hidden rounded-full bg-white/10">
                {/* Lane lines */}
                <div className="absolute inset-0 flex items-center">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="h-0.5 flex-1 bg-white/20"
                      style={{ marginRight: i < 9 ? '4px' : '0' }}
                    />
                  ))}
                </div>

                {/* Progress bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${progress}%` } : {}}
                  transition={{
                    duration: 1.5,
                    delay: delay + 0.3,
                    ease: 'easeOut',
                  }}
                  className="absolute left-0 top-0 flex h-full items-center justify-end rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 pr-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ duration: 0.3, delay: delay + 1.5 }}
                    className="h-8 w-8 rounded-full bg-white shadow-lg"
                  />
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Celebration animation */}
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className="absolute bottom-20 left-0 right-0 z-20 m-auto -translate-x-1/2 text-center"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 1,
            }}
            className="mb-4 text-6xl"
          >
            '🏆'
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-white md:text-4xl"
          >
            Winner: {sortedSwimmers[0]?.name}!
          </motion.h2>

          {/* Confetti */}
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: Math.random() * 200 + 100,
                opacity: 0,
                rotate: 360,
              }}
              transition={{
                duration: 2 + Math.random(),
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
              className="absolute left-1/2 top-0 h-3 w-3"
              style={{
                backgroundColor: [
                  '#FFD700',
                  '#FF6B6B',
                  '#4ECDC4',
                  '#95E1D3',
                  '#F38181',
                ][Math.floor(Math.random() * 5)],
              }}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}
