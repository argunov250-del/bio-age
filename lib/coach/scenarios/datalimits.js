// Группа 12: данные и ограничения. Отсутствие данных не равно норме; причину по одному факту не угадываем.
import { V, BV, SC } from './kit';

const g = { group: 'data', topic: 'data' };
const dl = (id) => (n) => n.dataLimit === id;
const user = (n) => !!(n.userData && (n.userData.sleep || n.userData.steps));

export const DATALIMITS = [
  SC({ ...g, id: 'data_no_permission', match: dl('data_no_permission'),
    positives: ['нет разрешений', 'я не дал разрешение', 'no permission'], negatives: ['разрешение на кофе'],
    variants: [
      BV('data_no_permission_1', { main: ['Без разрешений Health Connect приложение не видит сон, шаги и пульс, и я не могу ничего по ним сказать.', 'Without Health Connect permissions the app cannot see sleep, steps or heart rate, so I cannot say anything about them.'], action: ['Разрешения можно выдать на экране доступа или в настройках Health Connect. Пока их нет, данные можно записать вручную.', 'You can grant permissions on the access screen or in Health Connect settings. Until then, data can be entered manually.'] }, { humorOk: false }),
      V('data_no_permission_2', ['Нет доступа к данным здоровья, значит, оценок по ним нет. Это не значит, что всё в норме: просто нечего оценивать.', 'Выдай доступ в Health Connect или запиши показатели вручную.'], ['There is no access to health data, so there are no scores for it. That does not mean everything is fine: there is just nothing to assess.', 'Grant access in Health Connect or enter metrics manually.'], { humorOk: false }),
    ] }),
  SC({ ...g, id: 'data_not_synced', match: dl('data_not_synced'),
    positives: ['шаги не обновились', 'нет синхронизации', 'данные старые', 'not syncing'], negatives: ['обновил план тренировок'],
    variants: [
      V('data_not_synced_1', 'Возможно, часы или другое приложение ещё не передали новые данные в Health Connect. Открой их приложение, дай синхронизироваться и потяни экран вниз для обновления.', 'The watch or another app may not have sent new data to Health Connect yet. Open its app, let it sync and pull the screen down to refresh.', { humorOk: false }),
      V('data_not_synced_2', 'Я показываю то, что есть в Health Connect. Если свежего нет, причина на стороне источника: часы не синхронизировались. Причину точнее назвать не могу.', 'I show what is in Health Connect. If nothing fresh is there, the cause is on the source side: the watch has not synced. I cannot name the cause more precisely.', { humorOk: false }),
      BV('data_not_synced_3', { main: ['Новых значений я не вижу, а придумывать их не буду.', 'I see no new values and I will not make them up.'], action: ['Синхронизируй часы и обнови экран, тогда цифры подтянутся.', 'Sync the watch and refresh the screen, then the numbers will load.'], extra: ['Шаги за 7 дней сейчас: {steps7|full} в среднем в день.', 'Steps over 7 days now: {steps7|full} average per day.', ['steps7']] }, { humorOk: false }),
    ] }),
  SC({ ...g, id: 'data_source_unavailable', match: dl('data_source_unavailable'),
    positives: ['нет данных', 'данных нет', 'источник недоступен', 'there is no data'], negatives: ['как улучшить сон', 'привет'],
    variants: [
      V('data_source_unavailable_1', ['Источник данных сейчас недоступен или пуст. Без него я не оцениваю восстановление и не гадаю.', 'Проверь Health Connect и разрешения или запиши сон и шаги вручную.'], ['The data source is unavailable or empty right now. Without it I do not assess recovery and do not guess.', 'Check Health Connect and permissions, or enter sleep and steps manually.'], { humorOk: false }),
      V('data_source_unavailable_2', 'Пустые данные означают, что оценивать нечего, а не что всё хорошо. Подключи источник или внеси значения вручную в «Записать вручную».', 'Empty data means there is nothing to assess, not that all is well. Connect a source or enter values in Log manually.', { humorOk: false }),
    ] }),
  SC({ ...g, id: 'data_partial', match: dl('data_partial'),
    positives: ['только часть данных', 'данные неполные', 'incomplete data'], negatives: ['только вчера начал'],
    variants: [
      V('data_partial_1', 'Когда данных только часть, я говорю только о том, что есть, и не достраиваю остальное. Оценки по недостающим показателям будут точнее, когда они появятся.', 'When only part of the data is there, I talk only about what exists and do not fill in the rest. Scores for the missing metrics get better when they appear.', { humorOk: false }),
      V('data_partial_2', 'Часть показателей не пришла, поэтому часть выводов я не делаю. Это честнее, чем строить их на пустом месте.', 'Some metrics did not arrive, so I skip some conclusions. That is more honest than building them on nothing.', { humorOk: false }),
    ] }),
  SC({ ...g, id: 'data_period', match: dl('data_period'),
    positives: ['за какой период эти цифры?', 'это среднее или за день', 'what period'], negatives: ['период цикла'],
    variants: [
      BV('data_period_1', { main: ['Шаги, пульс и сон в моих ответах — обычно средние за 7 дней, если я не называю другой период. Сон «прошлой ночью» относится к последней ночи.', 'Steps, heart rate and sleep in my answers are usually 7-day averages unless I name another period. Sleep "last night" refers to the last night.'], extra: ['Для сравнения: шаги за 30 дней — {steps30|full} в день.', 'For comparison: steps over 30 days — {steps30|full} per day.', ['steps30']] }, { humorOk: false }),
      V('data_period_2', 'Я не смешиваю периоды: если цифра про неделю, я так и скажу, а день и месяц называю отдельно.', 'I do not mix periods: if a number is about a week I say so, and days and months are named separately.', { humorOk: false }),
    ] }),
  SC({ ...g, id: 'data_user_stated', match: user,
    positives: ['Я спал 5 часов', 'я прошёл 7000 шагов', 'I slept 6 hours'], negatives: ['сколько нужно спать', 'как улучшить сон'],
    variants: [
      BV('data_user_stated_sleep', { main: ['Принял: ты говоришь, что спал около {userSleepH}. В расчётах приложения этого значения нет, оценки по твоим словам я не пересчитываю.', 'Noted: you say you slept about {userSleepH}. The app has no such value in its calculations, and I do not recalculate scores from your words.'], action: ['Чтобы оно учитывалось, запиши его в «Записать вручную».', 'To have it counted, enter it in Log manually.'] }, { humorOk: false }),
      BV('data_user_stated_steps', { main: ['Принял: по твоим словам, {userSteps|full}. В данных приложения этого числа нет, поэтому оценки по нему я не меняю.', 'Noted: by your account, {userSteps|full}. The app data has no such number, so I do not change scores because of it.'], action: ['Если хочешь, чтобы оно учитывалось, добавь значение вручную.', 'If you want it counted, add the value manually.'] }, { humorOk: false }),
    ] }),
];
