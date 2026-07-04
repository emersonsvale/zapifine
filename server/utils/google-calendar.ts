const API = 'https://www.googleapis.com/calendar/v3'

type FetchOpts = {
  accessToken: string
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
}

async function gfetch<T>(path: string, opts: FetchOpts): Promise<T> {
  const query = opts.query
    ? Object.fromEntries(
        Object.entries(opts.query).filter(([, v]) => v !== undefined && v !== null),
      )
    : undefined
  try {
    const res = await $fetch(`${API}${path}`, {
      method: opts.method ?? 'GET',
      query,
      body: opts.body as Record<string, unknown> | undefined,
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        'content-type': 'application/json',
      },
    })
    return res as T
  } catch (err) {
    const e = err as { data?: { error?: { message?: string } }; message?: string; statusCode?: number }
    throw createError({
      statusCode: e.statusCode ?? 502,
      statusMessage: `Google Calendar: ${e.data?.error?.message ?? e.message ?? 'erro desconhecido'}`,
    })
  }
}

export type CalendarResource = {
  id: string
  summary: string
  timeZone?: string
}

export type EventDateTime = {
  dateTime?: string // ISO 8601 with timezone
  date?: string     // YYYY-MM-DD (all-day)
  timeZone?: string
}

export type EventAttendee = {
  email: string
  displayName?: string
  responseStatus?: 'needsAction' | 'accepted' | 'declined' | 'tentative'
  organizer?: boolean
  self?: boolean
}

export type CalendarEvent = {
  id: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  summary?: string
  description?: string
  location?: string
  start?: EventDateTime
  end?: EventDateTime
  htmlLink?: string
  hangoutLink?: string
  attendees?: EventAttendee[]
  extendedProperties?: {
    private?: Record<string, string>
    shared?: Record<string, string>
  }
  conferenceData?: unknown
  created?: string
  updated?: string
}

export type CreateEventInput = {
  summary: string
  description?: string
  location?: string
  start: EventDateTime
  end: EventDateTime
  attendees?: EventAttendee[]
  extendedProperties?: { private?: Record<string, string> }
  withMeet?: boolean
  sendUpdates?: 'all' | 'externalOnly' | 'none'
}

export type UpdateEventInput = Partial<CreateEventInput>

// ============================================================================
// Calendars
// ============================================================================

export async function createCalendar(
  accessToken: string,
  body: { summary: string; timeZone?: string; description?: string },
): Promise<CalendarResource> {
  return gfetch<CalendarResource>('/calendars', {
    accessToken,
    method: 'POST',
    body,
  })
}

export async function getCalendar(
  accessToken: string,
  calendarId: string,
): Promise<CalendarResource> {
  return gfetch<CalendarResource>(`/calendars/${encodeURIComponent(calendarId)}`, {
    accessToken,
  })
}

export type CalendarListEntry = {
  id: string
  summary?: string
  summaryOverride?: string
  description?: string
  timeZone?: string
  primary?: boolean
  accessRole?: 'owner' | 'writer' | 'reader' | 'freeBusyReader'
  backgroundColor?: string
  selected?: boolean
  deleted?: boolean
}

export type CalendarListResponse = {
  items: CalendarListEntry[]
  nextPageToken?: string
}

export async function listCalendarList(
  accessToken: string,
): Promise<CalendarListEntry[]> {
  const all: CalendarListEntry[] = []
  let pageToken: string | undefined = undefined
  for (let i = 0; i < 5; i++) {
    const res: CalendarListResponse = await gfetch<CalendarListResponse>(
      '/users/me/calendarList',
      {
        accessToken,
        query: { pageToken, maxResults: 250, showHidden: false, showDeleted: false },
      },
    )
    all.push(...res.items)
    if (!res.nextPageToken) break
    pageToken = res.nextPageToken
  }
  return all
}

// ============================================================================
// Events
// ============================================================================

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  input: CreateEventInput,
): Promise<CalendarEvent> {
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: input.start,
    end: input.end,
    attendees: input.attendees,
    extendedProperties: input.extendedProperties,
  }
  if (input.withMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: `zap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    }
  }
  return gfetch<CalendarEvent>(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    accessToken,
    method: 'POST',
    query: {
      conferenceDataVersion: input.withMeet ? 1 : undefined,
      sendUpdates: input.sendUpdates ?? 'all',
    },
    body,
  })
}

export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<CalendarEvent> {
  return gfetch<CalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      accessToken,
      method: 'PATCH',
      query: { sendUpdates: input.sendUpdates ?? 'all' },
      body: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: input.start,
        end: input.end,
        attendees: input.attendees,
        extendedProperties: input.extendedProperties,
      },
    },
  )
}

export async function moveEvent(
  accessToken: string,
  fromCalendarId: string,
  eventId: string,
  toCalendarId: string,
  sendUpdates: 'all' | 'externalOnly' | 'none' = 'none',
): Promise<CalendarEvent> {
  return gfetch<CalendarEvent>(
    `/calendars/${encodeURIComponent(fromCalendarId)}/events/${encodeURIComponent(eventId)}/move`,
    {
      accessToken,
      method: 'POST',
      query: { destination: toCalendarId, sendUpdates },
    },
  )
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  sendUpdates: 'all' | 'externalOnly' | 'none' = 'all',
): Promise<void> {
  await gfetch<void>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      accessToken,
      method: 'DELETE',
      query: { sendUpdates },
    },
  )
}

export async function getEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<CalendarEvent> {
  return gfetch<CalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { accessToken },
  )
}

export type ListEventsParams = {
  syncToken?: string
  pageToken?: string
  timeMin?: string
  timeMax?: string
  maxResults?: number
  showDeleted?: boolean
  singleEvents?: boolean
}

export type ListEventsResponse = {
  items: CalendarEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

// ============================================================================
// Watch channels (push notifications)
// ============================================================================

export type WatchChannelResponse = {
  kind: 'api#channel'
  id: string
  resourceId: string
  resourceUri: string
  token?: string
  expiration?: string // millis epoch como string
}

export async function startWatch(
  accessToken: string,
  calendarId: string,
  body: { id: string; address: string; token?: string; ttl?: number },
): Promise<WatchChannelResponse> {
  const params: Record<string, unknown> = {
    id: body.id,
    type: 'web_hook',
    address: body.address,
  }
  if (body.token) params.token = body.token
  if (body.ttl) params.params = { ttl: String(body.ttl) }

  return gfetch<WatchChannelResponse>(
    `/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    { accessToken, method: 'POST', body: params },
  )
}

export async function stopWatch(
  accessToken: string,
  channelId: string,
  resourceId: string,
): Promise<void> {
  await gfetch<void>('/channels/stop', {
    accessToken,
    method: 'POST',
    body: { id: channelId, resourceId },
  })
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  params: ListEventsParams = {},
): Promise<ListEventsResponse> {
  return gfetch<ListEventsResponse>(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      accessToken,
      query: {
        syncToken: params.syncToken,
        pageToken: params.pageToken,
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        maxResults: params.maxResults ?? 250,
        showDeleted: params.showDeleted ?? true,
        singleEvents: params.singleEvents ?? true,
      },
    },
  )
}
