'use client'

import { AnimatedNumber } from '@/components/animated-number'
import type { ReviewData, TimedSwim } from '@/types/review'
import { yardsToMiles } from '@/utils/yard'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { SidekickQRCode } from '../sidekick-qrcode'

interface SummarySlideProps {
  data: ReviewData
}

export function SummarySlide({ data }: SummarySlideProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  const swimmer = data.swimmer
  const year = data.year

  if (!swimmer) return null

  const totalDistanceMiles = yardsToMiles(swimmer.distance).toFixed(1)

  // Timed swim statistics
  const timedSwims = swimmer.timedSwims || []
  const totalTimedSwims = timedSwims.length
  const prCount = timedSwims.filter((swim) => swim.isPR).length
  const bestTimes = getBestTimes(timedSwims)

  return (
    <div
      ref={ref}
      className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-6"
    >
      {/* Mobile-optimized container (max-width for screenshot) */}
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="mb-4 text-3xl font-bold">{year} Year in Review</h1>
          </motion.div>
        </div>

        {/* Swimmer photo and name */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="-mt-6 mb-4 flex flex-col items-center"
        >
          {swimmer.photo ? (
            <img
              src={swimmer.photo}
              alt={swimmer.name}
              className="h-24 w-24 rounded-full object-cover shadow-lg ring-4 ring-white"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-3xl font-bold text-white shadow-lg ring-4 ring-white">
              {swimmer.name[0]}
            </div>
          )}
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            {swimmer.name}
          </h2>
        </motion.div>

        {/* Stats */}
        <div className="space-y-6 px-6 pb-2 md:pb-6">
          {/* Total Distance */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <p className="mb-1 text-sm text-gray-600">Total Distance</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold text-gray-900">
                <AnimatedNumber
                  start={0}
                  end={Number(totalDistanceMiles)}
                  decimals={1}
                />
              </span>
              <span className="text-xl text-gray-600">miles</span>
            </div>
          </motion.div>

          {/* Grid of stats */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Swims */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-center"
            >
              <p className="mb-1 text-xs text-gray-600">Total Swims</p>
              <p className="text-3xl font-bold text-blue-600">
                <AnimatedNumber start={0} end={swimmer.count} />
              </p>
            </motion.div>

            {/* Longest Streak */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 text-center"
            >
              <p className="mb-1 text-xs text-gray-600">Longest Streak</p>
              <p className="text-3xl font-bold text-purple-600">
                <AnimatedNumber start={0} end={swimmer.longestStreak} />
              </p>
              <p className="mt-1 text-xs text-gray-500">weeks</p>
            </motion.div>
          </div>

          {/* Timed Swims Section */}
          {totalTimedSwims > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-4 rounded-2xl border-t border-gray-200 bg-gradient-to-br from-amber-50 to-orange-100 p-4"
            >
              <p className="mb-3 text-center text-xs font-semibold text-gray-600">
                Timed Swims
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="mb-1 text-xs text-gray-600">Total Timed</p>
                  <p className="text-2xl font-bold text-orange-600">
                    <AnimatedNumber start={0} end={totalTimedSwims} />
                  </p>
                </div>
                <div className="text-center">
                  <p className="mb-1 text-xs text-gray-600">Personal Records</p>
                  <p className="text-2xl font-bold text-amber-600">
                    <AnimatedNumber start={0} end={prCount} />
                  </p>
                </div>
              </div>
              {bestTimes.length > 0 && (
                <div className="mt-3 border-t border-orange-200 pt-3 text-center">
                  <p className="mb-1 text-xs text-gray-600">Best Times</p>
                  <div className="flex flex-row items-center justify-between gap-2">
                    {bestTimes.map((bestTime) => (
                      <div key={`${bestTime.distance}-${bestTime.stroke}`}>
                        <p className="text-xl font-bold text-orange-700">
                          {bestTime.time}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {bestTime.distance} {bestTime.stroke}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Average per swim */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.6,
              delay: totalTimedSwims > 0 ? 0.8 : 0.7,
            }}
            className="border-t border-gray-200 pt-2 text-center"
          >
            <p className="mb-1 text-sm text-gray-600">Average per Swim</p>
            <p className="text-2xl font-bold text-gray-900">
              <AnimatedNumber
                start={0}
                end={swimmer.distance / swimmer.count}
                decimals={0}
              />{' '}
              yards
            </p>
          </motion.div>
        </div>

        {/* Logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex items-center justify-center gap-4 px-6 pb-2 md:pb-6"
        >
          {/* QSS Logo placeholder */}
          <div className="text-xs font-semibold text-gray-400">QSS</div>
          <div className="h-4 w-px bg-gray-300" />
          {/* Sidekick Logo */}
          <div className="flex items-center gap-2">
            <SidekickQRCode value="https://sidekickswim.com" size={30} />
            <span className="text-xs font-semibold text-gray-400">
              Sidekick
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/**
 * Get three best times based on these rules:
 * 1. If PR is true
 * 2. Pick best time for each event (a combination of distance and stroke)
 */
function getBestTimes(timedSwims: TimedSwim[]): TimedSwim[] {
  const bestTimes: TimedSwim[] = []
  const eventMap: Record<string, TimedSwim> = {}

  timedSwims.forEach((swim) => {
    const eventKey = `${swim.distance}-${swim.stroke}`
    if (!eventMap[eventKey] || eventMap[eventKey].time > swim.time) {
      eventMap[eventKey] = swim
    }
  })
  // for eventMap, if the swim is a PR, add it to bestTimes
  Object.values(eventMap).forEach((swim) => {
    if (swim.isPR) {
      bestTimes.push(swim)
    }
  })
  // Show longer distances first
  const sortedBestTimes = bestTimes.sort((a, b) => b.distance - a.distance)
  if (sortedBestTimes.length > 3) {
    return sortedBestTimes.slice(0, 3)
  }
  // If less than 3, add longer distances in eventMap until we have 3
  const sortedEvents = Object.values(eventMap).sort(
    (a, b) => b.distance - a.distance,
  )
  console.log('sortedEvents', sortedEvents)
  while (sortedBestTimes.length < 3) {
    const event = sortedEvents.pop()
    if (event) {
      sortedBestTimes.push(event)
    }
  }
  return sortedBestTimes
}
