import { supabase } from './supabase';

export async function callAI(input: string | any[], contextData: any) {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const tavilyKey = process.env.EXPO_PUBLIC_TAVILY_API_KEY;
  
  if (!apiKey) return null;

  const messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;

  const systemMessage = {
    role: "system",
    content: `Ты — высококвалифицированный педиатр-эксперт и персональный AI-ассистент в приложении BabySync. 
Твоя экспертиза базируется на актуальных медицинских стандартах, нормах ВОЗ, AAP и принципах доказательной медицины.
Текущая системная дата и время: ${new Date().toLocaleString('ru-RU')} (используй это для понимания слов "сегодня", "вчера" и расчета возраста).
Тебе предоставляются полные исторические данные профиля ребенка и статистика его активности за последнее время.
Контекст и Данные ребёнка (JSON):
${JSON.stringify(contextData)}

Твоя задача:
1. Анализировать предоставленные данные, выявлять паттерны и отклонения от норм.
2. Давать максимально персонализированные и детальные ответы, опираясь на эти данные.
3. Формировать понятные аналитические сводки, графики-таблицы (в формате Markdown) и статистику по запросу.
4. Если информации мало, используй интернет-поиск (search_internet). Возвращай только проверенную медицинскую информацию.
5. Быть эмпатичным. Всегда напоминать, что твои советы — не диагноз и не заменяют очную консультацию врача.`
  };

  const tools: any = tavilyKey ? [{
    type: "function",
    function: {
      name: "search_internet",
      description: "Искать медицинскую информацию в интернете (статьи, исследования, нормы ВОЗ, советы).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Поисковой запрос" }
        },
        required: ["query"]
      }
    }
  }] : undefined;

  let currentMessages = [systemMessage, ...messages];

  try {
    const makeRequest = async (msgs: any[]) => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: msgs,
          tools,
          tool_choice: "auto",
          max_tokens: 1500,
          temperature: 0.7,
        })
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    };

    let data = await makeRequest(currentMessages);
    let message = data.choices?.[0]?.message;

    if (!message) return "Ошибка ответа AI.";

    if (message.tool_calls && tavilyKey) {
      currentMessages.push(message);
      
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === 'search_internet') {
          const args = JSON.parse(toolCall.function.arguments);
          let searchResult = "Нет результатов.";
          try {
            const tRes = await fetch("https://api.tavily.com/search", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ api_key: tavilyKey, query: args.query, include_answer: true, max_results: 3 })
            });
            const tData = await tRes.json();
            searchResult = tData.answer || tData.results?.map((r: any) => r.content).join('\n') || "Нет результатов.";
          } catch(e) {
             searchResult = "Ошибка интернет-поиска.";
          }
          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: searchResult
          });
        }
      }
      
      data = await makeRequest(currentMessages);
      message = data.choices?.[0]?.message;
    }

    return message?.content || null;

  } catch (e) {
    console.warn("Direct API failed:", e);
    return null;
  }
}
