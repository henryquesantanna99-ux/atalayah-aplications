import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface GoogleTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

interface GoogleCalendarResponse {
  id?: string
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[]
  }
  error?: {
    message?: string
  }
}

function missingConfig() {
  return [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
  ].filter((key) => !process.env[key])
}

function eventDateTime(date: string, time: string | null, fallbackHour: number) {
  const value = `${date}T${time?.slice(0, 5) ?? `${String(fallbackHour).padStart(2, '0')}:00`}:00-03:00`
  return value
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { supabase, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, error: null }
}

async function getAccessToken() {
  const missing = missingConfig()
  if (missing.length > 0) {
    return {
      error: NextResponse.json(
      {
        error: 'Google Calendar integration is not configured.',
        missing,
      },
      { status: 428 }
      ),
    }
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })

  const tokenJson = await tokenResponse.json() as GoogleTokenResponse
  if (!tokenResponse.ok || !tokenJson.access_token) {
    return {
      error: NextResponse.json(
      {
        error: tokenJson.error_description ?? tokenJson.error ?? 'Could not authorize Google Calendar.',
      },
      { status: 502 }
      ),
    }
  }

  return { accessToken: tokenJson.access_token, error: null }
}

export async function POST(request: Request) {
  const { supabase, error: adminError } = await requireAdmin()
  if (adminError) return adminError

  const { eventId } = await request.json()
  if (!eventId) {
    return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title, type, date, start_time, agenda_topic, location, meet_link, google_calendar_event_id')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.type !== 'comunhao') {
    return NextResponse.json({ error: 'Only communion events can create Meet links here.' }, { status: 400 })
  }

  if (event.meet_link && event.google_calendar_event_id) {
    return NextResponse.json({
      meetLink: event.meet_link,
      calendarEventId: event.google_calendar_event_id,
    })
  }

  const { accessToken, error: tokenError } = await getAccessToken()
  if (tokenError) return tokenError

  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'
  const startDateTime = eventDateTime(event.date, event.start_time, 20)
  const endDateTime = eventDateTime(event.date, event.start_time, 21)

  const calendarResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.agenda_topic ?? undefined,
        location: event.location ?? undefined,
        start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' },
        end: { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' },
        conferenceData: {
          createRequest: {
            requestId: `atalayah-${event.id}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    }
  )

  const calendarJson = await calendarResponse.json() as GoogleCalendarResponse
  if (!calendarResponse.ok) {
    return NextResponse.json(
      { error: calendarJson.error?.message ?? 'Could not create Google Calendar event.' },
      { status: 502 }
    )
  }

  const meetLink = calendarJson.hangoutLink ??
    calendarJson.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri

  if (!meetLink || !calendarJson.id) {
    return NextResponse.json({ error: 'Google did not return a Meet link.' }, { status: 502 })
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({
      is_online: true,
      meet_link: meetLink,
      google_calendar_event_id: calendarJson.id,
    })
    .eq('id', event.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    meetLink,
    calendarEventId: calendarJson.id,
  })
}

export async function DELETE(request: Request) {
  const { supabase, error: adminError } = await requireAdmin()
  if (adminError) return adminError

  const { eventId } = await request.json()
  if (!eventId) {
    return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, google_calendar_event_id')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const { accessToken, error: tokenError } = await getAccessToken()
  if (tokenError) return tokenError

  if (event.google_calendar_event_id) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.google_calendar_event_id)}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!calendarResponse.ok && calendarResponse.status !== 404 && calendarResponse.status !== 410) {
      const data = await calendarResponse.json().catch(() => null)
      return NextResponse.json(
        { error: data?.error?.message ?? 'Could not end Google Meet event.' },
        { status: 502 }
      )
    }
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({
      is_online: false,
      meet_link: null,
      google_calendar_event_id: null,
    })
    .eq('id', event.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
