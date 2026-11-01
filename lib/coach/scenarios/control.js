// Группа 11: управление диалогом (короче, подробнее, без шуток, повеселее, проще, повтори, не повторяйся,
// почему, другой вариант, ладно, спасибо, нет, да). Варианты здесь — подтверждения; содержательная часть
// (объяснение, упрощение, альтернатива) собирается из данных приложения в engine.js через env.legacy.
import { V, SC } from './kit';

const has = (c) => (n) => n.cont === c;
const common = { group: 'control', topic: 'control' };

export const CONTROL = [
  SC({ ...common, id: 'ctl_short', match: has('short'), humor: [],
    positives: ['короче', 'Коротко, пожалуйста', 'покороче', 'shorter'], negatives: ['Как коротко описать мой сон?', 'сколько шагов в коротком круге'],
    variants: [
      V('ctl_short_1', 'Хорошо, дальше коротко.', 'Okay, short from here.', { humorOk: false }),
      V('ctl_short_2', 'Принято: меньше слов.', 'Noted: fewer words.', { humorOk: false }),
      V('ctl_short_3', 'Понял, буду в двух словах.', 'Got it, I will keep it brief.', { humorOk: false }),
      V('ctl_short_4', 'Договорились, только главное.', 'Deal, just the essentials.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_detailed', match: has('detailed'),
    positives: ['подробнее', 'объясни', 'расскажи подробнее', 'explain'], negatives: ['подробнее про сон не надо, у меня болит колено'],
    variants: [
      V('ctl_detailed_1', 'Хорошо, буду объяснять подробнее.', 'Okay, I will explain in more detail.', { humorOk: false }),
      V('ctl_detailed_2', 'Понял, добавлю объяснений.', 'Got it, I will add explanations.', { humorOk: false }),
      V('ctl_detailed_3', 'Ладно, разверну ответы.', 'Alright, I will expand my answers.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_nojokes', match: has('nojokes'), sensitive: true,
    positives: ['Без шуток, пожалуйста', 'не шути', 'хватит шутить', 'no jokes', 'не смешно'], negatives: ['Расскажи шутку про сон', 'почему 1749 шагов'],
    variants: [
      V('ctl_nojokes_1', 'Понял, дальше по делу.', 'Understood, straight to the point from here.', { humorOk: false }),
      V('ctl_nojokes_2', 'Принято, шутки в сторону.', 'Noted, jokes aside.', { humorOk: false }),
      V('ctl_nojokes_3', 'Хорошо, дальше без шуток.', 'Okay, no more jokes.', { humorOk: false }),
      V('ctl_nojokes_4', 'Услышал. Дальше только по делу.', 'Heard. Only business from now on.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_funnier', match: has('funnier'),
    positives: ['повеселее', 'пошути', 'добавь юмора', 'more jokes'], negatives: ['не шути', 'без шуток'],
    variants: [
      V('ctl_funnier_1', 'Хорошо, добавлю юмора там, где это уместно.', 'Okay, I will add humor where it fits.', { humorOk: false }),
      V('ctl_funnier_2', 'Принято: буду шутить чаще, но по ситуации.', 'Noted: more jokes, but only when the situation allows.', { humorOk: false }),
      V('ctl_funnier_3', 'Постараюсь. Шутки на заказ не обещаю, но повод поищу.', 'I will try. No jokes on demand, but I will look for a reason.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_funnier_blocked', match: () => false,
    variants: [V('ctl_funnier_blocked_1', 'Юмор сейчас выключен в Профиле → Юмор Хирона. Выбери «В меру» или «Побольше», и я поостроумничаю.', 'Humor is switched off in Profile → Hiron\'s humor. Pick Balanced or More and I will lighten up.', { humorOk: false })] }),
  SC({ ...common, id: 'ctl_simpler', match: has('simpler'),
    positives: ['проще', 'а попроще?', 'слишком сложно', 'не понял', 'simpler'], negatives: ['проще говоря, сколько мне спать?', 'мне нужен простой план'],
    variants: [
      V('ctl_simpler_1', 'Давай проще.', 'Let us make it simpler.', { humorOk: false }),
      V('ctl_simpler_2', 'Тогда упростим.', 'Then we simplify.', { humorOk: false }),
      V('ctl_simpler_3', 'Хорошо, без лишнего.', 'Okay, without the extras.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_simpler_ask', match: () => false,
    variants: [
      V('ctl_simpler_ask_1', 'Что упростить: тренировку или обычную повседневную активность?', 'What should I simplify: the workout or everyday activity?', { humorOk: false, pending: { key: 'simplify_what' } }),
      V('ctl_simpler_ask_2', 'Упростить что именно: тренировку или дела на день?', 'Simplify what exactly: the workout or the day\'s tasks?', { humorOk: false, pending: { key: 'simplify_what' } }),
    ] }),
  SC({ ...common, id: 'ctl_repeat', match: has('repeat'),
    positives: ['повтори', 'ещё раз', 'скажи ещё раз', 'say that again'], negatives: ['повтори упражнение для спины на тренировке силовой'],
    variants: [
      V('ctl_repeat_1', 'Повторяю.', 'Repeating.', { humorOk: false }),
      V('ctl_repeat_2', 'Ещё раз.', 'Once more.', { humorOk: false }),
      V('ctl_repeat_3', 'Скажу то же самое.', 'Here it is again.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_norepeat', match: has('norepeat'),
    positives: ['ты это уже говорил', 'не повторяйся', 'ты повторяешься', 'опять то же самое', 'you said that'], negatives: ['повтори', 'не повторяй упражнения два дня подряд'],
    variants: [
      V('ctl_norepeat_1', 'Да, повторился. Давай иначе.', 'Yes, I repeated myself. Let us do it differently.', { humorOk: false }),
      V('ctl_norepeat_2', 'Справедливо, это уже было. Попробую по-другому.', 'Fair, that was already said. Let me try another way.', { humorOk: false }),
      V('ctl_norepeat_3', 'Верно подмечено. Скажу иначе.', 'Good catch. I will say it differently.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_why', match: has('why'),
    positives: ['почему', 'почему так', 'а почему?', 'почему ты так советуешь', 'почему ты советуешь тренироваться?', 'why'], negatives: ['почему у меня 1749 шагов', 'почему шагов меньше, чем в другом приложении', 'почему болит колено'],
    variants: [
      V('ctl_why_1', 'Объясню.', 'Let me explain.', { humorOk: false }),
      V('ctl_why_2', 'Вот на чём это основано.', 'Here is what it is based on.', { humorOk: false }),
      V('ctl_why_3', 'Коротко о причине.', 'The short reason.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_why_unknown', match: () => false,
    variants: [
      V('ctl_why_unknown_1', 'Про что именно спросить «почему»? Я не уверен, к какому ответу это относится.', 'Why about what exactly? I am not sure which answer that refers to.', { humorOk: false }),
      V('ctl_why_unknown_2', 'Уточни, что объяснить: пока у меня нет предыдущего совета, к которому это относится.', 'Tell me what to explain: I have no earlier advice this could refer to.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_other', match: has('other'),
    positives: ['другой вариант', 'что-нибудь другое', 'есть другие варианты?', 'what else'], negatives: ['другой день', 'у меня другой телефон и другие шаги'],
    variants: [
      V('ctl_other_1', 'Вот другой вариант.', 'Here is another option.', { humorOk: false }),
      V('ctl_other_2', 'Можно и так.', 'It can be done this way too.', { humorOk: false }),
      V('ctl_other_3', 'Смотри, иначе.', 'Look, another way.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_no_other', match: () => false,
    variants: [
      V('ctl_no_other_1', 'Других вариантов по этой теме у меня честно нет: данные те же, поэтому и совет прежний.', 'I honestly have no other options on this topic: the data is the same, so the advice stays.', { humorOk: false }),
      V('ctl_no_other_2', 'Придумывать другой совет ради разнообразия не буду: факты не изменились.', 'I will not invent different advice for variety: the facts have not changed.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_no_other_topic', match: () => false,
    variants: [
      V('ctl_no_other_topic_1', 'Если хочется другого, назови тему: сон, шаги, тренировка или план дня.', 'If you want something different, name a topic: sleep, steps, training or the day plan.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_context_lost', match: () => false,
    variants: [
      V('ctl_context_lost_1', 'Я потерял нить: к чему это относится? Скажи тему одним словом: сон, тренировка, шаги, план дня.', 'I lost the thread: what does that refer to? Name the topic in one word: sleep, training, steps, daily plan.', { humorOk: false }),
      V('ctl_context_lost_2', 'Не уверен, о чём речь. Напиши тему: сон, шаги, тренировка или план на день.', 'Not sure what we are on. Name the topic: sleep, steps, training or the day plan.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_ok', match: has('ok'),
    positives: ['ладно', 'хорошо', 'ок', 'понятно', 'ясно', 'ok', '👍'], negatives: ['ладно, а что с пульсом?', 'ок, сколько спать'],
    variants: [
      V('ctl_ok_1', 'Договорились.', 'Agreed.', { humorOk: false }),
      V('ctl_ok_2', 'Хорошо. Я рядом, если что.', 'Okay. I am here if you need me.', { humorOk: false }),
      V('ctl_ok_3', 'Принято.', 'Noted.', { humorOk: false }),
      V('ctl_ok_4', 'Отлично, тогда так и оставим.', 'Great, we will leave it at that.', { humorOk: false }),
      V('ctl_ok_5', 'Понял тебя. Без спешки.', 'Got you. No rush.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_thanks', match: has('thanks'),
    positives: ['спасибо', 'спс', 'Спасибо большое', 'благодарю', 'thanks', 'ладно, спасибо'], negatives: ['спасибо, а что с пульсом?', 'не за что благодарить'],
    variants: [
      V('ctl_thanks_1', 'Пожалуйста.', 'You are welcome.', { humorOk: false }),
      V('ctl_thanks_2', 'Рад помочь. Возвращайся, когда понадобится.', 'Glad to help. Come back whenever you need.', { humorOk: false }),
      V('ctl_thanks_3', 'Не за что. Береги силы.', 'No problem. Save your energy.', { humorOk: false }),
      V('ctl_thanks_4', 'На здоровье. Дальше всё в твоих руках, а я рядом.', 'Anytime. The rest is in your hands, and I am nearby.', { humorOk: true }),
      V('ctl_thanks_5', 'Обращайся.', 'Anytime.', { humorOk: false }),
      V('ctl_thanks_6', 'Пожалуйста. Если что-то окажется непонятным, спроси ещё раз.', 'You are welcome. If anything is unclear, just ask again.', { humorOk: false }),
      V('ctl_thanks_7', 'Рад, что пригодилось.', 'Glad it was useful.', { humorOk: false }),
      V('ctl_thanks_8', 'Всегда пожалуйста. Одно маленькое действие сегодня уже хороший результат.', 'Always welcome. One small action today is already a good result.', { humorOk: true }),
      V('ctl_thanks_9', 'Взаимно. Приятно работать, когда вопросы по делу.', 'Likewise. It is nice when the questions are to the point.', { humorOk: true }),
      V('ctl_thanks_10', 'Пожалуйста. Остальное подождёт, пока не понадобится.', 'You are welcome. The rest can wait until you need it.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_no', match: has('no'),
    positives: ['нет', 'не надо', 'не хочу', 'не сейчас', 'no'], negatives: ['нет данных о сне', 'не хочу бегать, предложи что-то дома'],
    variants: [
      V('ctl_no_after', ['Хорошо, не будем. Если передумаешь, скажи — подберу вариант полегче.'], ['Okay, we will skip it. If you change your mind, tell me and I will find something lighter.'], { humorOk: false }),
      V('ctl_no_after_2', ['Ладно, оставим как есть. Можем вернуться к этому позже.'], ['Alright, we will leave it. We can come back to it later.'], { humorOk: false }),
      V('ctl_no_after_3', ['Понял. Тогда без этого, а в остальном я на связи.'], ['Understood. No need then, and I am here for anything else.'], { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_no_lost', match: () => false,
    variants: [
      V('ctl_no_lost_1', 'Хорошо. Если что-то нужно, скажи, с чего начать.', 'Okay. If you need something, tell me where to start.', { humorOk: false }),
      V('ctl_no_lost_2', 'Принято, ничего не навязываю.', 'Noted, I am not pushing anything.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_yes', match: has('yes'),
    positives: ['да', 'давай', 'конечно', 'yes', 'ага'], negatives: ['да ну, шутишь', 'да, а ещё у меня болит спина'],
    variants: [
      V('ctl_yes_1', 'Хорошо, начнём с малого.', 'Good, let us start small.', { humorOk: false }),
      V('ctl_yes_2', 'Договорились, один шаг за раз.', 'Deal, one step at a time.', { humorOk: false }),
      V('ctl_yes_3', 'Отлично, делаем так.', 'Great, we do it that way.', { humorOk: false }),
    ] }),
  SC({ ...common, id: 'ctl_yes_lost', match: () => false,
    variants: [
      V('ctl_yes_lost_1', 'Да — на что именно? Скажи, что сделать: план на день, сон, шаги или тренировка.', 'Yes to what exactly? Tell me what to do: daily plan, sleep, steps or training.', { humorOk: false }),
      V('ctl_yes_lost_2', 'Рад согласию, но я не уверен, что ты подтверждаешь. Напиши тему.', 'Glad you agree, but I am not sure what you are confirming. Name the topic.', { humorOk: false }),
    ] }),
];
