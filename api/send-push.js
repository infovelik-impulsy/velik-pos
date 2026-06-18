import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:info.velik@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { profesional_id, title, body } = req.body
  if (!profesional_id) return res.status(400).json({ error: 'profesional_id required' })

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('profesional_id', profesional_id)

  if (error) return res.status(500).json({ error: error.message })
  if (!subs?.length) return res.status(200).json({ sent: 0, note: 'no subscriptions' })

  const payload = JSON.stringify({ title, body, tag: 'velik-cita-' + Date.now() })

  let sent = 0
  await Promise.all(subs.map(async ({ subscription }) => {
    try {
      await webpush.sendNotification(subscription, payload)
      sent++
    } catch (e) {
      if (e.statusCode === 410) {
        await supabase.from('push_subscriptions').delete()
          .eq('profesional_id', profesional_id)
          .eq('subscription', subscription)
      }
    }
  }))

  res.status(200).json({ sent })
}
