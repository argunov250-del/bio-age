#!/usr/bin/env python3
"""Обучение локальной модели намерений «Хирона».

  python3 tools/intent/train.py [--dim-bits 14] [--C 20]

Признаки (должны совпадать с lib/coach/ml.js бит-в-бит по индексам):
  * текст = normalize() приложения (поле "norm" датасета), обрезка до 160 UTF-16 единиц;
  * символьные n-граммы n=2..5 по строке " " + norm + " " (пробелы входят в n-граммы => учёт границ слов);
  * слова ("w") и биграммы слов ("b", с маркерами ^ и $);
  * индекс = FNV-1a32(tag + единицы UTF-16, побайтно lo,hi) & (2^bits - 1);
  * значение = (1 + ln(count)), затем L2-нормировка.
Модель: мультиномиальная логистическая регрессия (sklearn), температурная калибровка на val,
веса int8 с масштабом на класс. Экспорт: tools/intent/model/intent.json + __tests__/fixtures/intent_xcheck.json.
"""
import argparse, base64, json, math, os, struct, sys
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = os.path.join(ROOT, 'tools', 'intent', 'data')
SEED = 20240611
MAXLEN = 160
FNV_OFF, FNV_PRIME = 2166136261, 16777619


def units(s):
    b = s.encode('utf-16-le')
    return list(struct.unpack('<%dH' % (len(b) // 2), b))


def fnv(tag, us, extra=None):
    h = FNV_OFF
    for u in [tag] + us + (extra or []):
        h = ((h ^ (u & 255)) * FNV_PRIME) & 0xFFFFFFFF
        h = ((h ^ (u >> 8)) * FNV_PRIME) & 0xFFFFFFFF
    return h


def features(norm, bits):
    mask = (1 << bits) - 1
    u = units(norm)[:MAXLEN]
    s = [32] + u + [32]
    cnt = {}
    def add(h):
        i = h & mask
        cnt[i] = cnt.get(i, 0) + 1
    for n in range(2, 6):
        for i in range(0, len(s) - n + 1):
            add(fnv(99, s[i:i + n]))  # 'c'
    ws = []
    cur = []
    for x in u:
        if x == 32:
            if cur: ws.append(cur); cur = []
        else:
            cur.append(x)
    if cur: ws.append(cur)
    for w in ws:
        add(fnv(119, w))  # 'w'
    seq = [[94]] + ws + [[36]]
    for a, b in zip(seq, seq[1:]):
        add(fnv(98, a + [1] + b))  # 'b'
    idx = sorted(cnt)
    val = np.array([1.0 + math.log(cnt[i]) for i in idx])
    nrm = math.sqrt(float((val * val).sum())) or 1.0
    return idx, (val / nrm)


def matrix(rows, bits):
    ind, dat, ptr = [], [], [0]
    for r in rows:
        i, v = features(r['norm'], bits)
        ind += i; dat += list(v); ptr.append(len(ind))
    return csr_matrix((dat, ind, ptr), shape=(len(rows), 1 << bits))


def load(name):
    return [json.loads(l) for l in open(os.path.join(DATA, name + '.jsonl'), encoding='utf-8')]


def softmax(z):
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dim-bits', type=int, default=14)
    ap.add_argument('--C', type=float, default=None)
    ap.add_argument('--sweep', action='store_true')
    a = ap.parse_args()
    labels = json.load(open(os.path.join(DATA, 'labels.json')))
    lid = {l: i for i, l in enumerate(labels)}
    tr, va, te = load('train'), load('val'), load('test')
    Xtr, Xva, Xte = (matrix(r, a.dim_bits) for r in (tr, va, te))
    ytr = np.array([lid[r['label']] for r in tr]); yva = np.array([lid[r['label']] for r in va]); yte = np.array([lid[r['label']] for r in te])

    def fit(C):
        m = LogisticRegression(C=C, max_iter=400, solver='lbfgs', random_state=SEED)
        m.fit(Xtr, ytr)
        return m
    def full_logits(m, X):
        z = np.full((X.shape[0], len(labels)), -30.0)
        z[:, m.classes_] = m.decision_function(X)
        return z
    best = None
    for C in ([a.C] if a.C else [100.0, 400.0]):
        m = fit(C)
        p = full_logits(m, Xva).argmax(1)
        f1 = f1_score(yva, p, average='macro', labels=np.unique(yva), zero_division=0)
        acc = float((p == yva).mean())
        print('C=%g val acc=%.4f macroF1=%.4f' % (C, acc, f1), file=sys.stderr)
        if best is None or f1 > best[0]: best = (f1, C, m)
    _, C, m = best
    W = np.zeros((1 << a.dim_bits, len(labels)))
    b = np.full(len(labels), -30.0)
    W[:, m.classes_] = m.coef_.T
    b[m.classes_] = m.intercept_
    # int8 с масштабом на класс
    scale = np.abs(W).max(axis=0) / 127.0
    scale[scale == 0] = 1.0
    Q = np.clip(np.round(W / scale), -127, 127).astype(np.int8)
    Wd = Q.astype(np.float64) * scale
    # температурная калибровка на val по КВАНТОВАННЫМ весам
    zva = np.asarray(Xva @ Wd) + b
    best_t = min((float(t) for t in np.arange(0.5, 4.01, 0.05)), key=lambda t: -np.log(softmax(zva / t)[np.arange(len(yva)), yva] + 1e-12).mean())
    T = best_t
    def metrics(X, y):
        z = np.asarray(X @ Wd) + b
        p = softmax(z / T)
        pred = p.argmax(1)
        return pred, p
    out = {'C': C, 'dim_bits': a.dim_bits, 'temperature': T, 'classes': len(labels)}
    for name, X, y in (('val', Xva, yva), ('test', Xte, yte)):
        pred, p = metrics(X, y)
        out[name] = {'acc': float((pred == y).mean()), 'macro_f1': float(f1_score(y, pred, average='macro', labels=np.unique(y), zero_division=0)), 'n': int(len(y))}
    print(json.dumps(out, ensure_ascii=False))
    # экспорт
    os.makedirs(os.path.join(ROOT, 'lib', 'coach', 'model'), exist_ok=True)
    model = {
        'v': 1,
        'hash': {'fn': 'fnv1a32', 'input': 'utf16le bytes of tag + code units (lo, hi)', 'tags': {'char': 99, 'word': 119, 'bigram': 98}, 'bigram_sep': 1, 'bigram_marks': [94, 36], 'ngram': [2, 5], 'char_pad': 32, 'maxlen': MAXLEN, 'bits': a.dim_bits, 'value': '(1+ln(count)) then L2'},
        'dim': 1 << a.dim_bits, 'labels': labels, 'temperature': T,
        'scale': [float('%.6g' % s) for s in scale], 'bias': [float('%.5g' % x) for x in b],
        'w': base64.b64encode(Q.tobytes()).decode('ascii'),  # feature-major: dim x classes, int8
    }
    path = os.path.join(ROOT, 'tools', 'intent', 'model', 'intent.json')
    json.dump(model, open(path, 'w'), separators=(',', ':'))
    size = os.path.getsize(path)
    print('model bytes', size, file=sys.stderr)
    out['model_bytes'] = size
    # векторы для кросс-проверки JS (хэш + вероятности по квантованной модели)
    rnd = np.random.RandomState(SEED)
    samples = [r for r in te + va][:0]
    pool = te + va
    pick = [pool[i] for i in rnd.choice(len(pool), 60, replace=False)]
    extra = [{'text': t} for t in ['Привет 😀 как дела?', 'ё' * 5 + ' ёж', 'ab' * 150, 'тренироваться 👍 сегодня', '100% -5 +3', "don't want", 'ЫЫЫ']]
    fx = []
    ex_norm = json.load(open(os.path.join(DATA, 'xcheck_norm.json'))) if os.path.exists(os.path.join(DATA, 'xcheck_norm.json')) else {}
    for r in pick:
        fx.append({'text': r['text'], 'norm': r['norm']})
    for e in extra:
        fx.append({'text': e['text'], 'norm': ex_norm.get(e['text'])})
    fx = [x for x in fx if x['norm'] is not None]
    for x in fx:
        i, v = features(x['norm'], a.dim_bits)
        z = np.asarray(csr_matrix(([*v], i, [0, len(i)]), shape=(1, 1 << a.dim_bits)) @ Wd) + b
        p = softmax(z / T)[0]
        top = np.argsort(-p)[:5]
        x['idx'] = [int(q) for q in i]; x['val'] = [float('%.9g' % q) for q in v]
        x['top'] = [[labels[int(k)], float('%.7g' % p[k])] for k in top]
    fdir = os.path.join(ROOT, '__tests__', 'fixtures')
    os.makedirs(fdir, exist_ok=True)
    json.dump({'bits': a.dim_bits, 'cases': fx}, open(os.path.join(fdir, 'intent_xcheck.json'), 'w'), ensure_ascii=False)
    json.dump(out, open(os.path.join(DATA, 'metrics_py.json'), 'w'), ensure_ascii=False, indent=1)
    # логиты val/test для калибровки порогов и отчёта
    np.savez_compressed(os.path.join(DATA, 'probs.npz'), val=metrics(Xva, yva)[1].astype(np.float32), test=metrics(Xte, yte)[1].astype(np.float32), yva=yva, yte=yte)


if __name__ == '__main__':
    main()
