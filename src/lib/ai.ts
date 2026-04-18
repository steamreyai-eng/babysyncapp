import { supabase } from './supabase';

/**
 * AI Chat module — calls OpenAI through Supabase Edge Function.
 * API keys stay server-side; only anonymized context is sent.
 */

/** Calculate age in months from birthdate string */
function ageInMonths(birthdate: string | undefined): number | null {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

/**
 * Anonymize baby/context data before sending to AI.
 * Removes PII: names, exact dates, city. Keeps only age + stats.
 */
function anonymizeContext(contextData: any): any {
  if (!contextData) return {};

  const { baby, ...rest } = contextData;

  const anonymizedBaby = baby
    ? {
        age_months: ageInMonths(baby.birthdate),
        gender: baby.gender,
        // NO name, NO birthdate, NO city, NO country, NO parent names
      }
    : null;

  return {
    baby: anonymizedBaby,
    ...rest,
  };
}

/** Error codes returned by the Edge Function */
export type AIErrorCode =
  | 'NO_API_KEY'
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'OPENAI_DOWN'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR'
  | 'OFFLINE'
  | 'UNKNOWN';

/** Human-readable error messages for each code */
const ERROR_MESSAGES: Record<AIErrorCode, string> = {
  NO_API_KEY: 'AI-сервис не настроен. Обратитесь к разработчику.',
  INVALID_API_KEY: 'Неверный API-ключ AI. Обратитесь к разработчику.',
  RATE_LIMITED: 'Слишком много запросов. Подождите минуту и попробуйте снова.',
  OPENAI_DOWN: 'Сервис OpenAI временно недоступен. Попробуйте позже.',
  TIMEOUT: 'AI не ответил вовремя. Попробуйте ещё раз.',
  NETWORK_ERROR: 'Ошибка сети. Проверьте интернет-соединение.',
  INTERNAL_ERROR: 'Внутренняя ошибка сервера. Попробуйте позже.',
  OFFLINE: 'Нет подключения к интернету. AI-функции недоступны.',
  UNKNOWN: 'Не удалось получить ответ. Попробуйте позже.',
};

export function getAIErrorMessage(code: AIErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN;
}

export interface AIResult {
  content: string | null;
  error: AIErrorCode | null;
  errorMessage: string | null;
}

const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 1;

export async function callAI(input: string | any[], contextData: any, retries = MAX_RETRIES): Promise<string | null> {
  const result = await callAIWithDetails(input, contextData, retries);
  return result.content;
}

/**
 * Enhanced AI call that returns structured error information.
 * Use this when you need to show specific error messages to the user.
 */
export async function callAIWithDetails(input: string | any[], contextData: any, retries = MAX_RETRIES): Promise<AIResult> {
  const messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  const anonymized = anonymizeContext(contextData);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages,
          contextData: anonymized,
        },
      });

      if (error) {
        if (__DEV__) console.warn(`AI Edge Function error (attempt ${attempt + 1}):`, error.message);

        // Check if it's a FunctionsRelayError with context
        const errorCode: AIErrorCode = (data as any)?.code || 'UNKNOWN';

        // Retry on transient errors
        if (attempt < retries && (errorCode === 'TIMEOUT' || errorCode === 'NETWORK_ERROR' || errorCode === 'OPENAI_DOWN')) {
          if (__DEV__) console.log(`Retrying AI call in ${RETRY_DELAY_MS}ms...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }

        return {
          content: null,
          error: errorCode,
          errorMessage: getAIErrorMessage(errorCode),
        };
      }

      const content = data?.content || data?.message || null;

      if (!content) {
        return {
          content: null,
          error: 'UNKNOWN',
          errorMessage: getAIErrorMessage('UNKNOWN'),
        };
      }

      return { content, error: null, errorMessage: null };
    } catch (e: any) {
      if (__DEV__) console.warn(`AI call failed (attempt ${attempt + 1}):`, e);

      if (attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      // Check if offline
      const isOffline = e?.message?.includes('Network') || e?.message?.includes('fetch');
      const code: AIErrorCode = isOffline ? 'OFFLINE' : 'NETWORK_ERROR';

      return {
        content: null,
        error: code,
        errorMessage: getAIErrorMessage(code),
      };
    }
  }

  return {
    content: null,
    error: 'UNKNOWN',
    errorMessage: getAIErrorMessage('UNKNOWN'),
  };
}
