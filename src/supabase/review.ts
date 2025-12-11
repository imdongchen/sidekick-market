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
    longestStreak: data.longestStreak || 0,
    timedSwims: data.timedSwims || [],
    dailyData: data.dailyData || [],
    weeklyData: data.weeklyData || [],
    monthlyData: data.monthlyData || [],
  }
}
