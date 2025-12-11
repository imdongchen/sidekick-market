'use client'

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { PanInfo } from 'framer-motion'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface CarouselProps {
  children: React.ReactNode[]
  currentIndex: number
  onIndexChange: (index: number) => void
}

export function ReviewCarousel({
  children,
  currentIndex,
  onIndexChange,
}: CarouselProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentIndex < children.length - 1) {
      onIndexChange(currentIndex + 1)
    }
    if (isRightSwipe && currentIndex > 0) {
      onIndexChange(currentIndex - 1)
    }
  }

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const threshold = 50
    if (info.offset.x > threshold && currentIndex > 0) {
      onIndexChange(currentIndex - 1)
    } else if (
      info.offset.x < -threshold &&
      currentIndex < children.length - 1
    ) {
      onIndexChange(currentIndex + 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < children.length - 1) {
      onIndexChange(currentIndex + 1)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onIndexChange(currentIndex - 1)
      }
      if (e.key === 'ArrowRight' && currentIndex < children.length - 1) {
        onIndexChange(currentIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex, children.length, onIndexChange])

  return (
    <div className="relative min-h-screen w-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="h-full w-full"
        >
          {children[currentIndex]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation dots */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {children.map((_, index) => (
          <button
            key={index}
            onClick={() => onIndexChange(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation arrows - hidden on mobile */}
      {currentIndex > 0 && (
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 backdrop-blur-sm transition-colors hover:bg-white md:flex"
          aria-label="Previous slide"
        >
          <ChevronLeftIcon className="h-6 w-6 text-gray-950" />
        </button>
      )}

      {currentIndex < children.length - 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 backdrop-blur-sm transition-colors hover:bg-white md:flex"
          aria-label="Next slide"
        >
          <ChevronRightIcon className="h-6 w-6 text-gray-950" />
        </button>
      )}

      {/* Swipe hint on first slide */}
      {currentIndex === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute bottom-12 left-1/2 z-20 -translate-x-1/2 text-sm text-white/70"
        >
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center gap-2"
          >
            <span>Swipe to explore</span>
            <ChevronRightIcon className="h-4 w-4" />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
