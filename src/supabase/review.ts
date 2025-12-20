import type { ReviewData, SwimmerData } from '@/types/review'
import { getUserAvatarLink } from '@/utils/userAvatar'
import { supabase } from './client'

export async function getReviewData(
  year: number,
  userSlug: string,
): Promise<ReviewData | null> {
  try {
    const { data, error } = await supabase.from('year_review_2025').select('*')
    // .eq('slug', userSlug)

    if (error) {
      console.error('Error fetching review data:', error)
      return null
    }

    const self = data.find((row) => row.slug === userSlug) || {}

    return {
      type: 'individual',
      year,
      swimmer: transformData(self),
      swimmers: data.map(transformData),
      personalRecords: self.personal_records || [],
    }
  } catch (error) {
    console.error('Error in getReviewData:', error)
    return null
  }
}

function transformData(data: any): SwimmerData {
  return {
    id: data.userId,
    slug: data.slug,
    name: data.firstName + ' ' + data.lastName,
    photo: getUserAvatarLink(data.avatar) || undefined,
    distance: data.distance || 0,
    count: data.count || 0,
    longestStreak: getLongestStreak(data.weeklyData || []),
    timedSwims: data.timedSwims || [],
    dailyData: data.dailyData || [],
    weeklyData: data.weeklyData || [],
    monthlyData: data.monthlyData || [],
  }
}

function getLongestStreak(
  weeklyData: {
    start: string // YYYY-MM-DD
    end: string // YYYY-MM-DD
    distance: number
    count: number
  }[],
): {
  start: string
  end: string
  count: number
} {
  if (!weeklyData || weeklyData.length === 0) {
    return {
      start: '',
      end: '',
      count: 0,
    }
  }

  // A streak requires at least 2 continuous weeks
  let longestStreak = {
    start: weeklyData[0].start,
    end: weeklyData[0].end,
    count: 1,
  }

  let currentStreak = {
    start: weeklyData[0].start,
    end: weeklyData[0].end,
    count: 1,
  }

  // Helper function to check if two weeks are continuous
  // Weeks are continuous if the end of week1 is within 7 days of the start of week2
  const areContinuous = (week1End: string, week2Start: string): boolean => {
    const week1EndDate = new Date(week1End)
    const week2StartDate = new Date(week2Start)
    const diffTime = Math.abs(week2StartDate.getTime() - week1EndDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7
  }

  // Iterate through sorted weeks to find continuous streaks
  for (let i = 1; i < weeklyData.length; i++) {
    const prevWeek = weeklyData[i - 1]
    const currentWeek = weeklyData[i]

    if (areContinuous(prevWeek.end, currentWeek.start)) {
      // Continue the streak
      currentStreak.end = currentWeek.end
      currentStreak.count += 1
    } else {
      // Streak broken - check if current streak is longer than longest
      if (
        currentStreak.count >= 2 &&
        currentStreak.count > longestStreak.count
      ) {
        longestStreak = { ...currentStreak }
      }
      // Start a new streak
      currentStreak = {
        start: currentWeek.start,
        end: currentWeek.end,
        count: 1,
      }
    }
  }

  // Check the last streak
  if (currentStreak.count >= 2 && currentStreak.count > longestStreak.count) {
    longestStreak = { ...currentStreak }
  }

  // Only return streak if it has at least 2 weeks
  if (longestStreak.count < 2) {
    return {
      start: '',
      end: '',
      count: 0,
    }
  }

  return longestStreak
}
