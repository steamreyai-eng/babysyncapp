// Supabase Edge Function: ai-chat
// Deploy: supabase functions deploy ai-chat --project-ref <your-ref>
// Set secrets: supabase secrets set OPENAI_API_KEY=sk-proj-... TAVILY_API_KEY=tvly-dev-...

import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_TIMEOUT_MS = 30_000

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check that OPENAI_API_KEY is configured
    if (!OPENAI_API_KEY) {
      console.error('[ai-chat] OPENAI_API_KEY is not set in Supabase secrets')
      return new Response(JSON.stringify({ error: 'AI service not configured', code: 'NO_API_KEY' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the request has a valid Supabase JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { messages, contextData } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const systemMessage = {
      role: 'system',
      content: `Ты — высококвалифицированный педиатр-эксперт и персональный AI-ассистент в приложении BabySync. 
Твоя экспертиза базируется на актуальных медицинских стандартах, нормах ВОЗ, AAP и принципах доказательной медицины.
Текущая системная дата и время: ${new Date().toLocaleString('ru-RU')}.
Контекст ребёнка (анонимизированный):
${JSON.stringify(contextData || {})}

Твоя задача:
1. Анализировать предоставленные данные, выявлять паттерны и отклонения от норм.
2. Давать максимально персонализированные и детальные ответы.
3. Формировать понятные аналитические сводки (в формате Markdown) по запросу.
4. Быть эмпатичным. Всегда напоминать, что твои советы — не диагноз и не заменяют очную консультацию врача.`,
    }

    // Create an AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS)

    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [systemMessage, ...messages],
          max_tokens: 1500,
          temperature: 0.7,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!openaiRes.ok) {
        const errText = await openaiRes.text()
        console.error(`[ai-chat] OpenAI API error ${openaiRes.status}:`, errText)

        // Provide specific error codes for client-side handling
        let code = 'OPENAI_ERROR'
        if (openaiRes.status === 401) code = 'INVALID_API_KEY'
        else if (openaiRes.status === 429) code = 'RATE_LIMITED'
        else if (openaiRes.status === 500) code = 'OPENAI_DOWN'

        return new Response(JSON.stringify({ error: 'OpenAI API error', code, status: openaiRes.status }), {
          status: openaiRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const data = await openaiRes.json()
      const content = data.choices?.[0]?.message?.content || null

      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (fetchErr: any) {
      clearTimeout(timeoutId)

      if (fetchErr.name === 'AbortError') {
        console.error('[ai-chat] OpenAI request timed out after', OPENAI_TIMEOUT_MS, 'ms')
        return new Response(JSON.stringify({ error: 'Request timed out', code: 'TIMEOUT' }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.error('[ai-chat] Fetch error:', fetchErr.message)
      return new Response(JSON.stringify({ error: 'Network error', code: 'NETWORK_ERROR' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (err: any) {
    console.error('[ai-chat] Internal error:', err.message)
    return new Response(JSON.stringify({ error: 'Internal error', code: 'INTERNAL_ERROR' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
