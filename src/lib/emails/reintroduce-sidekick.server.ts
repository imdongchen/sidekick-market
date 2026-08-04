import { readFile } from 'fs/promises'
import { join } from 'path'

export async function loadReintroduceHtml() {
  return readFile(
    join(process.cwd(), 'content/emails/reintroduce-sidekick-swim-app.html'),
    'utf8',
  )
}
