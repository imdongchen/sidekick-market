import { readFile } from 'fs/promises'
import { join } from 'path'

export async function loadMonthlyReviewHtml() {
  return readFile(
    join(process.cwd(), 'content/emails/monthly-swim-review.html'),
    'utf8',
  )
}
