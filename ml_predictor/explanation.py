import os
from openai import OpenAI

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

def generate_explanation(
    age_months: float,
    predicted_wake_window_sec: int,
    predicted_duration_sec: int,
    recent_sleeps: list,
    feed_count: int,
    walk_duration: int,
    is_sick: bool
) -> str:
    # Rule-based fallback if no OpenAI
    if not client:
        if is_sick:
            return "Сон может быть дольше или беспокойнее из-за болезни."
        if walk_duration > 3600:
            return "Долгая прогулка сегодня: малыш может уснуть быстрее и спать крепче."
        if len(recent_sleeps) > 0 and recent_sleeps[-1].get("duration_seconds", 0) < 1800:
            return "Предыдущий сон был очень коротким, поэтому бодрствование будет короче."
        
        return "Предсказание основано на привычном паттерне снов малыша."
        
    try:
        prompt = f"""
        Ты - эксперт-консультант по детскому сну в приложении BabySync.
        Малышу {age_months} мес. Мы предсказываем следующий сон через {predicted_wake_window_sec // 60} мин. 
        Длительность следующего сна ожидается около {predicted_duration_sec // 60} мин.
        
        Контекст за последние 24ч:
        - Кормлений: {feed_count}
        - Прогулок (сек): {walk_duration}
        - Болеет: {"Да" if is_sick else "Нет"}
        
        Напиши 1 краткое, теплое и полезное предложение-объяснение для мамы, почему ожидается такой сон.
        Не используй приветствия. Пиши сразу суть. Максимум 120 символов.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7
        )
        text = response.choices[0].message.content.strip()
        if len(text) > 150:
            text = text[:147] + "..."
        return text
    except Exception as e:
        print("OpenAI error:", e)
        return "Предсказание основано на недавних снах и активности вашего малыша."
