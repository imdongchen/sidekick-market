'use client'

import { AnimatedNumber } from '@/components/animated-number'
import type { ReviewData } from '@/types/review'
import { yardsToMiles } from '@/utils/yard'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface MonthlyBreakdownSlideProps {
  data: ReviewData
}

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function MonthlyBreakdownSlide({ data }: MonthlyBreakdownSlideProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  const swimmer = data.swimmer
  if (!swimmer || !swimmer.monthlyData || swimmer.monthlyData.length === 0)
    return null

  const monthlyData = swimmer.monthlyData
  const maxDistance = Math.max(...monthlyData.map((m) => m.distance), 1)
  const maxCount = Math.max(...monthlyData.map((m) => m.count), 1)

  // Find best month
  const bestMonth = monthlyData.reduce((best, current) =>
    current.distance > best.distance ? current : best,
  )

  const getMonthName = (monthStr: string) => {
    const monthNum = parseInt(monthStr.split('-')[1], 10)
    return monthNames[monthNum - 1]
  }

  return (
    <div
      ref={ref}
      className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-32 w-32 rounded-full bg-white blur-3xl"
            style={{
              left: `${(i % 4) * 25}%`,
              top: `${Math.floor(i / 4) * 33}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-4 text-center md:mb-8"
        >
          <h1 className="mb-2 text-3xl font-bold text-white md:text-5xl">
            Monthly Breakdown
          </h1>
          {/* <p className="text-lg text-white/80">
            Your progress throughout {data.year}
          </p> */}
        </motion.div>

        {/* Monthly cards grid */}
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {monthlyData.map((month, index) => {
            const monthName = getMonthName(month.start)
            const distancePercent = (month.distance / maxDistance) * 100
            const countPercent = (month.count / maxCount) * 100
            const isBestMonth = month.start === bestMonth.start

            return (
              <motion.div
                key={month.start}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`relative rounded-2xl border-2 bg-white/10 p-3 backdrop-blur-sm md:p-4 ${
                  isBestMonth
                    ? 'border-yellow-400 shadow-lg shadow-yellow-400/50'
                    : 'border-white/20'
                }`}
              >
                {isBestMonth && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.05 + 0.3, type: 'spring' }}
                    className="absolute -right-2 -top-2 text-2xl"
                  >
                    ⭐
                  </motion.div>
                )}

                <div className="mb-3 text-center">
                  <p className="mb-1 text-sm font-semibold text-white/90">
                    {monthName}
                  </p>
                  <p className="text-xs text-white/70">
                    <AnimatedNumber start={0} end={month.count} /> swims
                  </p>
                </div>

                {/* Distance bar */}
                <div className="relative mb-2 h-16 overflow-hidden rounded-lg bg-white/10 md:h-24">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={isInView ? { height: `${distancePercent}%` } : {}}
                    transition={{
                      duration: 0.8,
                      delay: index * 0.05 + 0.2,
                      ease: 'easeOut',
                    }}
                    className="absolute bottom-0 left-0 right-0 rounded-lg bg-gradient-to-t from-blue-500 to-cyan-400"
                  />
                  <div className="absolute inset-0 flex items-end justify-center pb-1">
                    <span className="z-10 text-xs font-bold text-white">
                      {yardsToMiles(month.distance).toFixed(1)} miles
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Best month highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-sm md:mt-8"
        >
          <p className="mb-2 text-sm text-white/80">Best Month</p>
          <p className="mb-2 text-3xl font-bold text-white">
            {getMonthName(bestMonth.start)}
          </p>
          <div className="flex items-center justify-center gap-6 text-white/90">
            <div>
              <p className="text-sm text-white/70">Distance</p>
              <p className="text-xl font-semibold">
                {yardsToMiles(bestMonth.distance).toFixed(1)} miles
              </p>
            </div>
            <div className="h-12 w-px bg-white/20" />
            <div>
              <p className="text-sm text-white/70">Swims</p>
              <p className="text-xl font-semibold">{bestMonth.count}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
