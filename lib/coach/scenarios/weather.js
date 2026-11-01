// Погода. Только данные lib/weather.js (текущие условия и температура; прогноза, ветра, осадков нет).
// Политика: пользовательские условия приоритетнее; свежая (<= TTL) погода — «по последним данным»;
// старая/сохранённая НИКОГДА не выдаётся за текущую; погода другого места не считается местной;
// плохая погода не равна отмене (зал/дом); опасное (гроза, гололёд, жара, мороз) — ясная рекомендация первой и без шуток;
// место спрашиваем один раз и только если оно влияет.
import { BV, SC } from './kit';

const w = { group: 'weather', topic: 'weather' };
const ASK = ['Что задумал: улицу или зал?', 'What is the plan: outdoors or the gym?', ['askPlace']];
const BASE = ['{baseTrain}', '{baseTrain}'];
const RECENT = ['По последним данным за окном: {wxCond}.', 'Latest data says: {wxCond}.', ['wxCond']];
const askPlaceOpt = { pending: { key: 'place' } };

export const WEATHER = [
  SC({ ...w, id: 'wx_train_danger_outdoor', danger: true, humor: [], match: () => false,
    positives: ['На улице гроза. Пойти на пробежку?'], negatives: ['Идёт дождь. Пойду в зал'],
    variants: [
      BV('wx_train_danger_outdoor_1', { reaction: RECENT, main: ['Тренировку на улице сейчас лучше перенести: {dangerWhy}.', 'Better to postpone the outdoor workout: {dangerWhy}.'], action: ['Если хочется сохранить занятие, сделай его дома или в зале.', 'To keep the session, do it at home or in the gym.'], extra: BASE }, {}),
      BV('wx_train_danger_outdoor_2', { reaction: RECENT, main: ['Сейчас на улице небезопасно: {dangerWhy}. Занятие лучше перенести.', 'It is not safe outside right now: {dangerWhy}. Better to move the session.'], action: ['Вместо этого подойдёт занятие в помещении: дома или в зале.', 'An indoor session fits instead: at home or in the gym.'], extra: BASE }, {}),
      BV('wx_train_danger_outdoor_3', { reaction: RECENT, main: ['Пробежку на улице сейчас лучше отложить: {dangerWhy}.', 'Better to put the outdoor run off: {dangerWhy}.'], action: ['Можно выбрать занятие в помещении.', 'You can choose an indoor session.'] }, {}),
    ] }),
  SC({ ...w, id: 'wx_train_danger_indoor', danger: true, humor: [], match: () => false,
    positives: ['Гроза, но я иду в зал, тренироваться?'], negatives: [],
    variants: [
      BV('wx_train_danger_indoor_1', { reaction: RECENT, main: ['В помещении заниматься можно, по самочувствию.', 'Training indoors is fine, according to how you feel.'], action: ['Только на улицу сейчас лучше не выходить: {dangerWhy}.', 'Just do not go outside right now: {dangerWhy}.'], extra: BASE }, {}),
      BV('wx_train_danger_indoor_2', { reaction: RECENT, main: ['Зал или дом подойдут: погода там не мешает. Следи за самочувствием.', 'The gym or home works: the weather does not interfere there. Watch how you feel.'], action: ['А вот занятие на улице сейчас лучше перенести: {dangerWhy}.', 'An outdoor session should be moved though: {dangerWhy}.'], extra: BASE }, {}),
    ] }),
  SC({ ...w, id: 'wx_train_bad_indoor', match: () => false,
    positives: ['Идёт дождь. Пойду в зал, тренироваться?'], negatives: [],
    variants: [
      BV('wx_train_bad_indoor_1', { reaction: RECENT, main: ['{curCondCap} — это неудобство, а не повод отменять тренировку. В помещении занимайся по плану.', '{curCondCap} is an inconvenience, not a reason to cancel. Indoors, follow the plan.'], extra: BASE }),
      BV('wx_train_bad_indoor_2', { reaction: RECENT, main: ['В зале или дома погода не мешает, так что план остаётся прежним.', 'At the gym or at home the weather does not matter, so the plan stays.'], extra: BASE }),
      BV('wx_train_bad_indoor_3', { reaction: RECENT, main: ['Идти туда, где крыша, — хороший выбор. Тренировка не отменяется, меняется только место.', 'Going where there is a roof is a good choice. The workout is not cancelled, only the place changes.'], extra: BASE }),
    ] }),
  SC({ ...w, id: 'wx_train_bad_outdoor', match: () => false,
    positives: ['Дождь, но хочу пробежаться'], negatives: [],
    variants: [
      BV('wx_train_bad_outdoor_1', { reaction: RECENT, main: ['На улице можно, если одеться по погоде и быть осторожнее на скользком.', 'Outdoors is fine if you dress for it and take care on slippery spots.'], action: ['Не хочется — достаточно зала или дома.', 'If you would rather not, the gym or home is enough.'], extra: BASE }),
      BV('wx_train_bad_outdoor_2', { reaction: RECENT, main: ['Это неудобство, но не запрет: выйти можно, одевшись по погоде.', 'It is an inconvenience, not a ban: you can go out dressed for it.'], action: ['Можно и заменить занятием в помещении, тогда план сохранится.', 'You can also swap it for an indoor session and keep the plan.'], extra: BASE }),
    ] }),
  SC({ ...w, id: 'wx_train_bad_ask', humor: ['weather_ask'], match: () => false,
    positives: ['На улице дождь. Тренироваться сегодня?'], negatives: [],
    variants: [
      BV('wx_train_bad_ask_1', { reaction: RECENT, main: ['{curCondCap} — неудобство, а не повод отменять тренировку.', '{curCondCap} is an inconvenience, not a reason to cancel the workout.'], extra: BASE, clarify: ['Ты планировал улицу или зал?', 'Were you planning outdoors or the gym?', ['askPlace']] }, askPlaceOpt),
      BV('wx_train_bad_ask_2', { reaction: RECENT, main: ['Тренироваться можно, всё зависит от места.', 'You can train; it depends on the place.'], extra: BASE, clarify: ['Улица или зал?', 'Outdoors or the gym?', ['askPlace']] }, askPlaceOpt),
    ] }),
  SC({ ...w, id: 'wx_train_good', match: () => false,
    positives: ['Погода хорошая, хочу потренироваться.'], negatives: [],
    variants: [
      BV('wx_train_good_tired', { reaction: RECENT, main: ['Хорошая погода не отменяет того, что восстановление сегодня не лучшее.', 'Good weather does not change that recovery is not at its best today.'], extra: BASE }, { when: (e) => e.s.state === 'tired' }),
      BV('wx_train_good_1', { reaction: RECENT, main: ['Хорошая погода не повод нагружаться сильнее: ориентируйся на самочувствие. Если оно позволяет, можно начать с привычного плана.', 'Good weather is not a reason to push harder: go by how you feel. If it allows, start with your usual plan.'], extra: BASE, clarify: ASK }, { when: (e) => e.s.state !== 'tired' }),
      BV('wx_train_good_2', { reaction: RECENT, main: ['Погода тут союзник, но не начальник: планку определяет самочувствие.', 'The weather is an ally here, not the boss: how you feel sets the bar.'], extra: BASE, clarify: ASK }, { when: (e) => e.s.state !== 'tired' }),
    ] }),
  SC({ ...w, id: 'wx_train_ordinary', match: () => false,
    positives: [], negatives: [],
    variants: [
      BV('wx_train_ordinary_1', { reaction: RECENT, main: ['Погода сейчас обычная, ничего особенного.', 'The weather looks ordinary.'], extra: BASE, clarify: ASK }),
      BV('wx_train_ordinary_2', { reaction: RECENT, main: ['Погода тренировке не мешает.', 'The weather does not get in the way of training.'], extra: BASE, clarify: ASK }),
    ] }),
  SC({ ...w, id: 'wx_train_unknown', match: () => false,
    positives: ['Идти бегать сегодня на улице? Как там погода?'], negatives: [],
    variants: [
      BV('wx_train_unknown_1', { reaction: ['Последнее сохранённое измерение: {savedLabel}, {savedAgo}. Сейчас оно уже может не совпадать.', 'The last saved reading: {savedLabel}, {savedAgo}. It may no longer match.', ['savedLabel', 'savedAgo']], main: ['Погоду я сам не вижу и свежих данных у меня нет, так что не знаю, что за окном.', 'I cannot see the weather and have no fresh data, so I do not know what it is outside.'], action: ['Если гроза, гололёд, сильная жара или мороз, пробежку на улице лучше заменить занятием в помещении. Если просто дождь или ветер, можно тренироваться в помещении или выйти, одевшись по погоде.', 'With a thunderstorm, ice, extreme heat or frost, swap the outdoor run for an indoor session. With plain rain or wind, train indoors or dress for it and go out.'], extra: BASE, clarify: ASK }),
      BV('wx_train_unknown_2', { reaction: ['Сохранённое измерение ({savedLabel}, {savedAgo}) устарело, на него не ориентируюсь.', 'The saved reading ({savedLabel}, {savedAgo}) is out of date, so I do not rely on it.', ['savedLabel', 'savedAgo']], main: ['Свежей погоды у меня нет, поэтому не знаю, что за окном. Посмотри сам.', 'I have no fresh weather, so I do not know what it is like outside. Take a look yourself.'], action: ['Гроза или гололёд — повод заменить улицу помещением, остальное решает самочувствие.', 'A thunderstorm or ice is a reason to swap outdoors for indoors; the rest is up to how you feel.'], extra: BASE, clarify: ASK }),
    ] }),
  SC({ ...w, id: 'wx_now', match: () => false,
    positives: ['какая сейчас погода?'], negatives: [],
    variants: [
      BV('wx_now_place', { main: ['По последним данным, {wxPlace}: {wxLabel}, {wxTemp}.', 'Latest data for {wxPlace}: {wxLabel}, {wxTemp}.'], extra: ['Обновлено {wxAgeMin|full} назад.', 'Updated {wxAgeMin|full} ago.', ['wxAgeMin']] }, { humorOk: false }),
      BV('wx_now_noplace', { main: ['По последним данным за окном {wxLabel}, {wxTemp}.', 'Latest data says {wxLabel}, {wxTemp} outside.'], extra: ['Обновлено {wxAgeMin|full} назад.', 'Updated {wxAgeMin|full} ago.', ['wxAgeMin']] }, { humorOk: false }),
    ] }),
  SC({ ...w, id: 'wx_now_unknown', match: () => false,
    positives: [], negatives: [],
    variants: [
      BV('wx_now_stale', { main: ['Свежих данных о погоде у меня нет. Последнее сохранённое измерение: {savedLabel}, {savedAgo}; сейчас может быть иначе.', 'I have no fresh weather data. The last saved reading: {savedLabel}, {savedAgo}; it may be different now.'] }, { humorOk: false }),
      BV('wx_now_stale_2', { main: ['Сохранённое измерение ({savedLabel}, {savedAgo}) устарело, поэтому текущим его не называю.', 'The saved reading ({savedLabel}, {savedAgo}) is out of date, so I do not call it current.'], action: ['Что за окном, скажи сам — учту это в совете.', 'Tell me what it is like outside and I will take it into account.'] }, { humorOk: false, needs: ['savedLabel', 'savedAgo'] }),
      BV('wx_now_none', { main: ['Местной погоды у меня сейчас нет: она включается в Профиле (город или приблизительная геопозиция).', 'I have no local weather right now: it is switched on in Profile (a city or approximate location).'], action: ['Скажи, что за окном, — учту это в совете.', 'Tell me what it is like outside and I will take it into account.'] }, { humorOk: false, when: (e) => e.wstatus !== 'stale' }),
    ] }),
  SC({ ...w, id: 'wx_walk', match: () => false,
    positives: ['Как там погода для прогулки?'], negatives: [],
    variants: [
      BV('wx_walk_danger', { reaction: RECENT, main: ['Прогулку сейчас лучше перенести: {dangerWhy}.', 'Better to move the walk: {dangerWhy}.'], action: ['Подвигаться можно дома.', 'You can move at home.'] }, { humorOk: false, when: (e) => e.level === 'danger' }),
      BV('wx_walk_bad', { reaction: RECENT, main: ['За окном {curCond}: выйти можно, если одеться по погоде и быть осторожнее на скользком.', 'It is {curCond} outside: you can go if you dress for it and take care on slippery spots.'], action: ['Прогноза у меня нет, поэтому лучшее время не подскажу.', 'I have no forecast, so I cannot name a better time.'] }, { when: (e) => e.level === 'inconvenient' }),
      BV('wx_walk_good', { reaction: RECENT, main: ['Условия для прогулки хорошие. Ориентируйся на самочувствие.', 'Conditions for a walk look good. Go by how you feel.'] }, { when: (e) => e.level === 'good' && e.s.state !== 'tired' }),
      BV('wx_walk_good_tired', { reaction: RECENT, main: ['Погода подходит, но восстановление сегодня не лучшее, так что пусть прогулка будет спокойной и недолгой.', 'The weather suits, but recovery is not at its best today, so keep the walk easy and short.'] }, { when: (e) => e.level === 'good' && e.s.state === 'tired' }),
      BV('wx_walk_ordinary', { reaction: RECENT, main: ['Погода обычная, прогулке не мешает.', 'The weather is ordinary and does not get in the way of a walk.'] }, { when: (e) => e.src === 'cache' && !e.level }),
      BV('wx_walk_unknown', { reaction: ['Последнее сохранённое: {savedLabel}, {savedAgo}, это уже не показатель.', 'The last saved reading: {savedLabel}, {savedAgo}, no longer a guide.', ['savedLabel', 'savedAgo']], main: ['Свежей погоды я не вижу, оценить условия для прогулки не могу.', 'I cannot see fresh weather, so I cannot judge conditions for a walk.'], action: ['Гроза, гололёд, сильная жара или мороз — повод перенести; в остальном решай по самочувствию.', 'A thunderstorm, ice, extreme heat or frost is a reason to move it; otherwise go by how you feel.'] }, { when: (e) => e.src === 'none' }),
    ] }),
  SC({ ...w, id: 'wx_forecast', match: () => false,
    positives: ['какая погода будет завтра вечером?'], negatives: [],
    variants: [
      BV('wx_forecast_1', { main: ['Прогноза у меня нет: приложение получает только текущую погоду, поэтому о другом времени я ничего не скажу.', 'I have no forecast: the app gets only the current weather, so I cannot say anything about another time.'], extra: ['Сейчас: {wxLabel}, {wxTemp}, но это не прогноз.', 'Right now: {wxLabel}, {wxTemp}, but that is not a forecast.', ['wxLabel', 'wxTemp']] }, { humorOk: false }),
      BV('wx_forecast_2', { main: ['Увы, только текущие условия, на завтра или вечер данных нет.', 'Sadly only current conditions; there is no data for tomorrow or evening.'], action: ['Посмотри прогноз в погодном приложении, а я помогу подобрать занятие под него.', 'Check a weather app and I will help match the workout to it.'] }, { humorOk: false }),
    ] }),
  SC({ ...w, id: 'wx_other_place', match: () => false,
    positives: ['какая погода в Париже'], negatives: [],
    variants: [
      BV('wx_other_place_1', { main: ['Погоду в другом месте я не вижу: у меня только местная, по городу из Профиля или приблизительной геопозиции.', 'I cannot see the weather elsewhere: I only have local weather, from the Profile city or approximate location.'], extra: ['Местная погода сейчас: {wxLabel}, {wxTemp}.', 'Local weather right now: {wxLabel}, {wxTemp}.', ['wxLabel', 'wxTemp']] }, { humorOk: false }),
    ] }),
  SC({ ...w, id: 'wx_missing_field', match: () => false,
    positives: ['какой ветер сегодня?'], negatives: [],
    variants: [
      BV('wx_missing_field_1', { main: ['Ветер, «ощущается как», влажность и осадки приложение не получает: у меня только условия и температура.', 'The app does not get wind, feels-like, humidity or precipitation: I only have conditions and temperature.'], extra: ['Сейчас: {wxLabel}, {wxTemp}.', 'Right now: {wxLabel}, {wxTemp}.', ['wxLabel', 'wxTemp']] }, { humorOk: false }),
    ] }),
  SC({ ...w, id: 'wx_geo_denied', match: () => false,
    positives: ['я не дал геолокацию'], negatives: [],
    variants: [
      BV('wx_geo_denied_1', { main: ['Без геолокации коуч работает как обычно. Погоду можно взять по городу из Профиля, а если его нет, местные условия просто остаются неизвестными.', 'Without location the coach works as usual. Weather can come from the Profile city, and without one the local conditions simply stay unknown.'] }, { humorOk: false }),
      BV('wx_geo_denied_2', { main: ['Отказ от геолокации ничего не ломает: можно выбрать город в Профиле, а пока я не буду гадать о погоде.', 'Declining location breaks nothing: pick a city in Profile, and until then I will not guess about the weather.'] }, { humorOk: false }),
    ] }),
];
