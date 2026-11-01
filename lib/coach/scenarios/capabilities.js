// Группа 10: возможности. Честно: локальный коуч со сценариями и правилами, без языковой модели.
// Фраза о сети: ответы формируются локально; для погоды приложение обращается к погодному сервису.
import { V, SC } from './kit';

const g = { group: 'capabilities', topic: 'capabilities', humorOk: false };
const cap = (id) => (n) => n.capability === id;
const NET = ['Ответы коуча формируются локально. Для погоды приложение обращается к погодному сервису.', 'The coach\'s answers are produced locally. For weather the app contacts a weather service.'];

export const CAPABILITIES = [
  SC({ ...g, id: 'cap_ai', match: cap('cap_ai'),
    positives: ['Ты настоящий искусственный интеллект?', 'ты бот?', 'ты нейросеть', 'are you a real AI'], negatives: ['как улучшить сон', 'мой ии-ассистент спит'],
    variants: [
      V('cap_ai_1', 'Я локальный коуч со сценариями и правилами, без языковой модели. Умею помогать в поддерживаемых темах, но сложную формулировку иногда лучше уточнить.', 'I am a local coach with scenarios and rules, with no language model. I can help with supported topics, but a complex phrasing is sometimes better clarified.'),
      V('cap_ai_2', 'Не нейросеть: у меня набор сценариев и правил, который работает на твоём телефоне. Поэтому я хорош в знакомых темах и теряюсь в незнакомых.', 'Not a neural network: I am a set of scenarios and rules running on your phone. So I am good at familiar topics and lost in unfamiliar ones.'),
      V('cap_ai_3', 'Честно: я не человек и не языковая модель, а программа с правилами. Если не понял, уточню.', 'To be honest: I am not a person or a language model, but a rule-based program. If I do not get it, I will ask.'),
    ] }),
  SC({ ...g, id: 'cap_offline', match: cap('cap_offline'),
    positives: ['Ты работаешь без интернета?', 'нужен ли интернет', 'работаешь офлайн?', 'do you work offline'], negatives: ['пропал интернет у соседей', 'как сон'],
    variants: [
      V('cap_offline_1', NET[0], NET[1]),
      V('cap_offline_2', ['Сами ответы собираются на телефоне, без сети.', 'Интернет нужен только погоде: приложение обращается к погодному сервису.'], ['The answers are put together on the phone, without a network.', 'The internet is needed only for weather: the app contacts a weather service.']),
    ] }),
  SC({ ...g, id: 'cap_privacy', match: cap('cap_privacy'),
    positives: ['Куда уходят мои сообщения?', 'ты отправляешь мои данные?', 'где хранятся мои данные', 'do you send my data'], negatives: ['отправь мне план'],
    variants: [
      V('cap_privacy_1', ['Сообщения и показатели здоровья не отправляются ни в какие внешние ИИ-сервисы: ответы формируются локально.', 'Единственное внешнее обращение — погода: в погодный сервис уходят координаты, округлённые до 0,1°, или название города для поиска.'], ['Your messages and health data are not sent to any external AI service: answers are produced locally.', 'The only outside request is weather: coordinates rounded to 0.1°, or a city name for lookup, go to the weather service.']),
      V('cap_privacy_2', ['Диалог и данные остаются на телефоне. Для погоды приложение запрашивает погодный сервис, передавая округлённые координаты или город.', 'Память коуча можно стереть: Профиль → «Очистить память Хирона».'], ['The chat and data stay on the phone. For weather the app asks a weather service, sending rounded coordinates or a city.', 'You can erase the coach memory: Profile → Clear Hiron\'s memory.']),
    ] }),
  SC({ ...g, id: 'cap_whatknow', match: cap('cap_whatknow'),
    positives: ['Что ты обо мне знаешь?', 'какие мои данные у тебя', 'what do you know about me'], negatives: ['что знаешь про сон'],
    variants: [
      V('cap_whatknow_1', ['Я вижу то, что посчитало приложение: сон, шаги, пульс, HRV, оценки и твой профиль. Если чего-то нет, так и скажу, а не придумаю.', 'Из разговора помню только тему, последний совет и пару настроек (например, без шуток) — без текстов сообщений.'], ['I see what the app has calculated: sleep, steps, heart rate, HRV, scores and your profile. If something is missing, I say so instead of inventing it.', 'From our chat I keep only the topic, the last advice and a few settings (such as no jokes) — not message texts.']),
      V('cap_whatknow_2', 'Знаю твой профиль и показатели, которые уже есть в приложении. Всё остальное неизвестно, пока ты сам не скажешь.', 'I know your profile and the metrics already in the app. Everything else is unknown until you tell me.'),
    ] }),
  SC({ ...g, id: 'cap_sources', match: cap('cap_sources'),
    positives: ['Откуда показатели?', 'откуда берутся данные', 'where does the data come from'], negatives: ['откуда ты родом'],
    variants: [
      V('cap_sources_1', 'Данные приходят из Health Connect (часы, браслет, другие приложения), а то, что нет, можно записать вручную в «Записать вручную». Оценки считает само приложение.', 'Data comes from Health Connect (watch, band, other apps), and anything missing can be entered in Log manually. The app itself calculates the scores.'),
      V('cap_sources_2', 'Все цифры берутся из источников, которые подключены к приложению, и из ручных записей. Если источник не отдал значение, я не додумываю его.', 'All numbers come from the sources connected to the app and from manual entries. If a source gave no value, I do not fill it in.'),
    ] }),
  SC({ ...g, id: 'cap_diagnose', match: cap('cap_diagnose'),
    positives: ['Ты умеешь ставить диагноз?', 'ты врач?', 'can you diagnose'], negatives: ['у меня болит колено'],
    variants: [
      V('cap_diagnose_1', 'Нет. Я не ставлю диагнозы и не заменяю врача: могу объяснить показатели и предложить режим. При тревожных симптомах нужен врач.', 'No. I do not diagnose and do not replace a doctor: I can explain metrics and suggest a routine. With worrying symptoms, see a doctor.'),
      V('cap_diagnose_2', 'Диагностика не моя область. Я работаю с общими советами по сну, нагрузке и привычкам. Всё, что тревожит, лучше показать врачу.', 'Diagnosis is not my area. I give general advice on sleep, load and habits. Anything that worries you is best shown to a doctor.'),
    ] }),
  SC({ ...g, id: 'cap_nounderstand', match: cap('cap_nounderstand'),
    positives: ['почему ты меня не понимаешь', 'ты ничего не понимаешь', 'you don\'t understand me'], negatives: ['почему болит спина'],
    variants: [
      V('cap_nounderstand_1', 'Я не понимаю свободную речь, как человек: у меня сценарии и правила. Помогает короткая формулировка с одной темой: «сколько спать», «что делать сегодня».', 'I do not understand free speech like a person: I have scenarios and rules. A short phrasing with one topic helps: "how much to sleep", "what to do today".'),
      V('cap_nounderstand_2', 'Бывает: я распознаю знакомые темы и формулировки, а нестандартное могу пропустить. Скажи проще или одним словом, и попробуем снова.', 'It happens: I recognize familiar topics and phrasings and may miss unusual ones. Say it simpler or in one word and we will try again.'),
      V('cap_nounderstand_3', 'Прости, что не попал. Я локальный коуч без языковой модели. Выбери тему кнопкой под чатом или напиши коротко.', 'Sorry I missed. I am a local coach without a language model. Pick a topic with the chips under the chat or write briefly.'),
    ] }),
  SC({ ...g, id: 'cap_humor_off', match: cap('cap_humor_off'),
    positives: ['Как отключить юмор?', 'как выключить шутки', 'how do I turn off the jokes'], negatives: ['включи юмор'],
    variants: [
      V('cap_humor_off_1', 'Профиль → Юмор Хирона → «Без шуток». Или напиши мне «без шуток», и я отключу их в разговоре.', 'Profile → Hiron\'s humor → No jokes. Or just write "no jokes" here and I will stop in this chat.'),
      V('cap_humor_off_2', 'Настройка в Профиле: «Юмор Хирона», вариант «Без шуток». Сказать мне «не шути» тоже работает сразу.', 'It is in Profile: Hiron\'s humor, the No jokes option. Telling me "stop joking" works at once too.'),
    ] }),
  SC({ ...g, id: 'cap_clear', match: cap('cap_clear'),
    positives: ['как очистить память?', 'очисти память', 'clear your memory'], negatives: ['очисти стол'],
    variants: [
      V('cap_clear_1', 'Профиль → «Очистить память Хирона». Это сотрёт состояние коуча и переписку в чате, данные Health Connect не затрагиваются.', 'Profile → Clear Hiron\'s memory. It erases the coach state and the chat; Health Connect data is not touched.'),
    ] }),
  SC({ ...g, id: 'cap_can', match: cap('cap_can'),
    positives: ['Что ты умеешь?', 'как ты работаешь', 'what can you do'], negatives: ['что умеет мой пульс'],
    variants: [
      V('cap_can_1', 'Помогаю с планом на день, сном, тренировками, шагами, пульсом и HRV, стрессом и привычками — по данным приложения. Диагнозов не ставлю, работаю на правилах, без языковой модели.', 'I help with the day plan, sleep, workouts, steps, heart rate and HRV, stress and habits — based on the app data. I do not diagnose and I run on rules, without a language model.'),
      V('cap_can_2', 'Смотрю на твои показатели и подсказываю, что сделать сегодня: нагрузка, сон, шаги. Могу объяснить, почему так, и упростить план.', 'I look at your metrics and suggest what to do today: load, sleep, steps. I can explain why and simplify the plan.'),
    ] }),
];
