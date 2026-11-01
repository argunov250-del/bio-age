// Помощники для описания сценариев. Схема сценария:
// { id, group, topic?, match(nlu, env)?, applies(env)?, blocked(env)?, variants:[вариант], continuations:{why,simpler,other},
//   positives:[фразы, которые должны срабатывать], negatives:[фразы, где правило не должно срабатывать],
//   sensitive?, danger? (без юмора), humor?:[ситуации для каталога юмора], compose?(env, ack) }
// Вариант: цельный { id, text:{ru:[...],en:[...]}, short?, humorOk?, needs? } или блочный
// { id, blocks:{reaction,main,explain,action,clarify: [ru, en, needs?]}, humorOk?, needs?, pending?:{key} }.
export const V = (id, ru, en, o) => ({ id, text: { ru: [].concat(ru), en: [].concat(en) }, ...(o || {}) });
export const BV = (id, blocks, o) => ({ id, blocks, ...(o || {}) });
export const SC = (o) => ({ variants: [], continuations: {}, positives: [], negatives: [], ...o });
