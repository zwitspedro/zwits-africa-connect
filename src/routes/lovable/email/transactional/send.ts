import * as React from 'react'
import { render } from '@react-email/render'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { TEMPLATES } from '@/lib/email-templates/registry'

// Configuration baked in at scaffold time
const SITE_NAME = "Zwits Services"
// SENDER_DOMAIN is the verified sender FQDN: a delegated subdomain (e.g., "notify.example.com"), or, on a
// domain registered through Lovable, the domain itself or a name under it (e.g., "example.com", "app.example.com").
// It MUST match the sender verified in Lovable's email setup.
const SENDER_DOMAIN = "notify.zwits.co.zw"
// FROM_DOMAIN is the domain shown in the From: header (e.g., "example.com").
// Can be the root domain when display_from_root is enabled — this is cosmetic only.
const FROM_DOMAIN = "zwits.co.zw"

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

// Generate a cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const Route = createFileRoute("/lovable/email/transactional/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env['SUPABASE_URL']
        const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('Missing required environment variables')
          return Response.json(
            { error: 'Server configuration error' },
            { status: 500 }
          )
        }

        // Verify the caller has a valid Supabase auth token.
        // In TanStack, there is no Supabase gateway — we validate the JWT ourselves.
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.slice('Bearer '.length).trim()
        const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (supabaseServiceKey.startsWith('sb_') && h.get('Authorization') === `Bearer ${supabaseServiceKey}`) h.delete('Authorization'); h.set('apikey',supabaseServiceKey); return fetch(input,{...init,headers:h}); } } })
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Parse request body
        let templateName: string
        let recipientEmail: string
        let idempotencyKey: string
        let messageId: string
        let templateData: Record<string, any> = {}
        try {
          const body = await request.json()
          templateName = body.templateName || body.template_name
          recipientEmail = body.recipientEmail || body.recipient_email
          messageId = crypto.randomUUID()
          idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
          if (body.templateData && typeof body.templateData === 'object') {
            templateData = body.templateData
          }
        } catch {
          return Response.json(
            { error: 'Invalid JSON in request body' },
            { status: 400 }
          )
        }

        if (!templateName) {
          return Response.json(
            { error: 'templateName is required' },
            { status: 400 }
          )
        }

        // Recipient and content are derived from the authorized review event,
        // never from client-provided names, decisions, reasons or addresses.
        if (templateName !== 'provider-decision') return Response.json({ error: 'Unsupported app email' }, { status: 400 })
        const eventId = templateData.eventId
        if (typeof eventId !== 'string' || !/^[0-9a-f-]{36}$/i.test(eventId)) return Response.json({ error: 'A review event is required' }, { status: 400 })
        const { data: isAdmin, error: roleError } = await supabase.rpc('has_role',{ _user_id: user.id, _role: 'admin' })
        if (roleError || !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const { data: event, error: eventError } = await supabase.from('provider_review_events').select('*').eq('id',eventId).single()
        if (eventError || !event) return Response.json({ error: 'Review not found' }, { status: 404 })
        if (['queued','sent','suppressed'].includes(event.email_state)) return Response.json({ success: true, queued: event.email_state !== 'suppressed', reason: event.email_state === 'suppressed' ? 'email_suppressed' : undefined })
        const { data: recipient, error: recipientError } = await supabase.auth.admin.getUserById(event.provider_user_id)
        const { data: provider } = await supabase.from('providers').select('business_name').eq('id',event.provider_id).single()
        if (recipientError || !recipient.user?.email) return Response.json({ error: 'Provider email unavailable' }, { status: 400 })
        recipientEmail = recipient.user.email
        templateData = { name: provider?.business_name, status: event.status, reason: event.reason }
        idempotencyKey = `provider-decision:${event.id}`
        messageId = event.id

        // 1. Look up template from registry (early — needed to resolve recipient)
        const template = TEMPLATES[templateName]

        if (!template) {
          console.error('Template not found in registry', { templateName })
          return Response.json(
            {
              error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
            },
            { status: 404 }
          )
        }

        // Resolve effective recipient: template-level `to` takes precedence over
        // the caller-provided recipientEmail. This allows notification templates
        // to always send to a fixed address (e.g., site owner from env var).
        const effectiveRecipient = template.to || recipientEmail

        if (!effectiveRecipient) {
          return Response.json(
            {
              error: 'recipientEmail is required (unless the template defines a fixed recipient)',
            },
            { status: 400 }
          )
        }

        // 2. Check suppression list (fail-closed: if we can't verify, don't send)
        const { data: suppressed, error: suppressionError } = await supabase
          .from('suppressed_emails')
          .select('id')
          .eq('email', effectiveRecipient.toLowerCase())
          .maybeSingle()

        if (suppressionError) {
          console.error('Suppression check failed — refusing to send', {
            code: suppressionError.code,
            message: suppressionError.message,
            recipient_redacted: redactEmail(effectiveRecipient),
          })
          return Response.json(
            { error: 'Failed to verify suppression status' },
            { status: 500 }
          )
        }

        if (suppressed) {
          await supabase.from('provider_review_events').update({ email_state: 'suppressed' }).eq('id',event.id)
          // Log the suppressed attempt
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'suppressed',
          })

          console.log('Email suppressed', {
            templateName,
            recipient_redacted: redactEmail(effectiveRecipient),
          })
          return Response.json({ success: false, reason: 'email_suppressed' })
        }

        // 3. Get or create unsubscribe token (one token per email address)
        const normalizedEmail = effectiveRecipient.toLowerCase()
        let unsubscribeToken: string

        // Check for existing token for this email
        const { data: existingToken, error: tokenLookupError } = await supabase
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (tokenLookupError) {
          console.error('Token lookup failed', {
            code: tokenLookupError.code,
            message: tokenLookupError.message,
            email_redacted: redactEmail(normalizedEmail),
          })
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'failed',
            error_message: 'Failed to look up unsubscribe token',
          })
          return Response.json(
            { error: 'Failed to prepare email' },
            { status: 500 }
          )
        }

        if (existingToken && !existingToken.used_at) {
          // Reuse existing unused token
          unsubscribeToken = existingToken.token
        } else if (!existingToken) {
          // Create new token — upsert handles concurrent inserts gracefully
          unsubscribeToken = generateToken()
          const { error: tokenError } = await supabase
            .from('email_unsubscribe_tokens')
            .upsert(
              { token: unsubscribeToken, email: normalizedEmail },
              { onConflict: 'email', ignoreDuplicates: true }
            )

          if (tokenError) {
            console.error('Failed to create unsubscribe token', {
              code: tokenError.code,
              message: tokenError.message,
            })
            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: templateName,
              recipient_email: effectiveRecipient,
              status: 'failed',
              error_message: 'Failed to create unsubscribe token',
            })
            return Response.json(
              { error: 'Failed to prepare email' },
              { status: 500 }
            )
          }

          // If another request raced us, our upsert was silently ignored.
          // Re-read to get the actual stored token.
          const { data: storedToken, error: reReadError } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token')
            .eq('email', normalizedEmail)
            .maybeSingle()

          if (reReadError || !storedToken) {
            console.error('Failed to read back unsubscribe token after upsert', {
              code: reReadError?.code,
              message: reReadError?.message,
              email_redacted: redactEmail(normalizedEmail),
            })
            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: templateName,
              recipient_email: effectiveRecipient,
              status: 'failed',
              error_message: 'Failed to confirm unsubscribe token storage',
            })
            return Response.json(
              { error: 'Failed to prepare email' },
              { status: 500 }
            )
          }
          unsubscribeToken = storedToken.token
        } else {
          // Token exists but is already used — email should have been caught by suppression check above.
          // This is a safety fallback; log and skip sending.
          console.warn('Unsubscribe token already used but email not suppressed', {
            email_redacted: redactEmail(normalizedEmail),
          })
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'suppressed',
            error_message:
              'Unsubscribe token used but email missing from suppressed list',
          })
          return Response.json({ success: false, reason: 'email_suppressed' })
        }

        // 4. Render React Email template to HTML and plain text
        const element = React.createElement(template.component, templateData)
        const html = await render(element)
        const plainText = await render(element, { plainText: true })

        // Resolve subject — supports static string or dynamic function
        const resolvedSubject =
          typeof template.subject === 'function'
            ? template.subject(templateData)
            : template.subject

        // 5. Enqueue the pre-rendered email for async processing by the dispatcher.
        // The dispatcher (process-email-queue) handles sending, retries, and rate-limit backoff.

        const { data: claim, error: claimError } = await supabase.from('provider_review_events').update({ email_state: 'queueing' }).eq('id',event.id).in('email_state',['not_requested','failed']).select('id').maybeSingle()
        if (claimError) return Response.json({ error: 'Unable to prepare review email' }, { status: 500 })
        if (!claim) return Response.json({ success: false, reason: 'already_processing' })
        // Log pending BEFORE enqueue so we have a record even if enqueue crashes
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: 'pending',
        })

        const { error: enqueueError } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: effectiveRecipient,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: resolvedSubject,
            html,
            text: plainText,
            purpose: 'transactional',
            label: templateName,
            idempotency_key: idempotencyKey,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        })

        if (enqueueError) {
          await supabase.from('provider_review_events').update({ email_state: 'failed' }).eq('id',event.id)
          console.error('Failed to enqueue email', {
            code: enqueueError.code,
            message: enqueueError.message,
            templateName,
            recipient_redacted: redactEmail(effectiveRecipient),
          })

          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'failed',
            error_message: 'Failed to enqueue email',
          })

          return Response.json(
            { error: 'Failed to enqueue email' },
            { status: 500 }
          )
        }

        await supabase.from('provider_review_events').update({ email_state: 'queued' }).eq('id',event.id)
        console.log('Transactional email enqueued', {
          templateName,
          recipient_redacted: redactEmail(effectiveRecipient),
        })

        return Response.json({ success: true, queued: true })
      },
    },
  },
})
