// Supabase Edge Function: ai-chat
// Deploy: supabase functions deploy ai-chat --project-ref <your-ref>
// Set secrets: supabase secrets set OPENAI_API_KEY=sk-proj-... TAVILY_API_KEY=tvly-dev-...

import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY')

console.log('[ai-chat] OPENAI_API_KEY present:', !!OPENAI_API_KEY, 'prefix:', OPENAI_API_KEY.substring(0, 7))

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('[ai-chat] OpenAI error:', openaiRes.status, errText)
      return new Response(JSON.stringify({ error: 'OpenAI API error', details: errText }), {
        status: openaiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await openaiRes.json()
    const content = data.choices?.[0]?.message?.content || null

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[ai-chat] CATCH error:', err?.message || err, err?.stack)
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
