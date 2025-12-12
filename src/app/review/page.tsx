'use client'

import { ReviewCarousel } from '@/components/review/carousel'
import { MonthlyBreakdownSlide } from '@/components/review/monthly-breakdown'
import { SummarySlide } from '@/components/review/summary'
import { TeamRaceSlide } from '@/components/review/team-race'
import { getReviewData } from '@/supabase/review'
import type { ReviewData } from '@/types/review'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function ReviewContent() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const type =
    (searchParams.get('type') as 'individual' | 'team') || 'individual'
  const year = parseInt(searchParams.get('year') || '2025', 10)
  const userSlug = searchParams.get('user') || undefined

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const data = await getReviewData(year, userSlug || '')
        if (data) {
          setReviewData(data)
        } else {
          setError('No data found for this review')
        }
      } catch (err) {
        console.error('Error fetching review data:', err)
        setError('Failed to load review data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [type, year, userSlug])

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="mb-4 text-2xl">Loading your review...</div>
          <div className="h-2 w-64 overflow-hidden rounded-full bg-gray-700">
            <div className="h-full animate-pulse bg-blue-500" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !reviewData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="mb-4 text-2xl text-red-400">Error</div>
          <div className="text-gray-400">{error || 'No data available'}</div>
        </div>
      </div>
    )
  }

  const slides = [
    <TeamRaceSlide
      key="team-race"
      data={reviewData}
      onNext={() => setCurrentIndex(currentIndex + 1)}
    />,
    <MonthlyBreakdownSlide key="monthly" data={reviewData} />,
    // <PersonalRecordsSlide key="records" data={reviewData} />,
    <SummarySlide key="summary" data={reviewData} />,
  ]

  return (
    <div>
      <div className="fixed inset-0 bg-gray-950" />
      <ReviewCarousel
        children={slides}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
      />
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-gray-950 text-white">
          Loading...
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  )
}
