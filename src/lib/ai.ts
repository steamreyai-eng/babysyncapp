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

export async function callAI(input: string | any[], contextData: any) {
  const messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;

  const anonymized = anonymizeContext(contextData);

  try {
    // Call Supabase Edge Function (API keys stay on server)
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        messages,
        contextData: anonymized,
      },
    });

    if (error) {
      if (__DEV__) console.warn('AI Edge Function error:', error.message);
      return null;
    }

    return data?.content || data?.message || null;
  } catch (e) {
    if (__DEV__) console.warn('AI call failed:', e);
    return null;
  }
}
