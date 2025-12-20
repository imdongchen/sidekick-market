'use client'

import type { ReviewData } from '@/types/review'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface PersonalRecordsSlideProps {
  data: ReviewData
}

const recordIcons: Record<string, string> = {
  first_swim: '🏊',
  longest_distance: '📏',
  most_swims_week: '🔥',
  most_swims_month: '💪',
  longest_streak: '⚡',
  best_month: '⭐',
  timed_swim_pr: '⏱️',
}

const strokeIcons: Record<string, string> = {
  freestyle: '🏊',
  backstroke: '🔄',
  breaststroke: '💨',
  butterfly: '🦋',
  medley: '🎯',
}

export function PersonalRecordsSlide({ data }: PersonalRecordsSlideProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  // Get regular records
  const records = data.personalRecords || []

  // Get timed swim PRs from swimmer data
  const timedSwimPRs =
    data.swimmer?.timedSwims?.filter((swim) => swim.isPR) || []

  // Combine records with timed swim PRs
  const allRecords = [
    ...records,
    ...timedSwimPRs.map((swim, index) => ({
      id: `timed-pr-${index}`,
      type: 'timed_swim_pr' as const,
      label: `${swim.distance} ${swim.stroke.charAt(0).toUpperCase() + swim.stroke.slice(1)} `,
      value: swim.time,
      date: swim.date || new Date().toISOString().split('T')[0],
      description: `Personal Record`,
      stroke: swim.stroke,
      distance: swim.distance,
      time: swim.time,
    })),
  ]

  if (allRecords.length === 0) return null

  return (
    <div
      ref={ref}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 p-6"
    >
      {/* Animated background */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={
              isInView
                ? {
                    opacity: [0, 0.3, 0],
                    scale: [0, 1.5, 0],
                    x: Math.random() * 1200,
                    y: Math.random() * 800,
                  }
                : {}
            }
            transition={{
              duration: 3,
              delay: i * 0.2,
              repeat: Infinity,
              repeatDelay: 2,
            }}
            className="absolute h-20 w-20 rounded-full bg-white/10 blur-xl"
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h1 className="mb-2 text-4xl font-bold text-white md:text-5xl">
            Personal Records
          </h1>
          <p className="text-lg text-white/80">
            Your achievements in {data.year}
            {timedSwimPRs.length > 0 && (
              <span className="mt-1 block text-sm">
                {timedSwimPRs.length} timed swim PR
                {timedSwimPRs.length > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute bottom-0 left-8 top-0 w-0.5 bg-white/20" />

          {/* Records */}
          <div className="space-y-8">
            {allRecords.map((record, index) => {
              const isEven = index % 2 === 0
              const delay = index * 0.15
              const isTimedSwim = record.type === 'timed_swim_pr'

              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay }}
                  className={`relative flex items-center gap-6 ${
                    isEven ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  {/* Timeline dot */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{
                      duration: 0.3,
                      delay: delay + 0.2,
                      type: 'spring',
                    }}
                    className={`relative z-10 h-16 w-16 rounded-full ${
                      isTimedSwim
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-400'
                        : 'bg-gradient-to-br from-emerald-400 to-cyan-400'
                    } flex items-center justify-center text-2xl shadow-lg ring-4 ${
                      isTimedSwim ? 'ring-yellow-900/50' : 'ring-emerald-900/50'
                    }`}
                  >
                    {isTimedSwim && record.stroke
                      ? strokeIcons[record.stroke.toLowerCase()] || '⏱️'
                      : recordIcons[record.type] || '🏆'}
                  </motion.div>

                  {/* Record card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: delay + 0.1 }}
                    className={`flex-1 rounded-2xl border bg-white/10 p-6 backdrop-blur-sm ${
                      isTimedSwim ? 'border-yellow-400/30' : 'border-white/20'
                    } ${isEven ? 'text-left' : 'text-right'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className={isEven ? '' : 'order-2'}>
                        <h3 className="mb-1 text-xl font-bold text-white">
                          {record.label}
                        </h3>
                        <p
                          className={`mb-2 text-3xl font-bold ${
                            isTimedSwim ? 'text-yellow-300' : 'text-emerald-300'
                          }`}
                        >
                          {record.value}
                        </p>
                        {record.description && (
                          <p className="text-sm text-white/70">
                            {record.description}
                          </p>
                        )}
                      </div>
                      <div
                        className={`text-sm text-white/40 ${isEven ? 'order-2' : 'order-1'}`}
                      >
                        {new Date(record.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Celebration at the end */}
        {isInView && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: allRecords.length * 0.15 + 0.5,
              type: 'spring',
            }}
            className="mt-12 text-center"
          >
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 2,
              }}
              className="mb-4 inline-block text-6xl"
            >
              🎉
            </motion.div>
            <p className="text-lg text-white/80">Amazing year!</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
