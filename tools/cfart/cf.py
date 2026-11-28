#!/usr/bin/env python3
"""Anropar Cloudflare Workers AI och sparar bilden i raw/. Nyckeln läggs in av proxyn.
Användning: cf.py <namn> <modell> <prompt> [width height steps]
Loggar varje anrop i raw/log.jsonl."""
import sys, json, base64, time, urllib.request, os, uuid
ACC = os.environ['CF_ACCOUNT_ID']  # Cloudflare-kontots id; nyckeln läggs in av proxyn eller som Authorization
HERE = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(HERE, '..', 'raw')
name, model, prompt = sys.argv[1], sys.argv[2], sys.argv[3]
w = int(sys.argv[4]) if len(sys.argv) > 4 else 1024; h = int(sys.argv[5]) if len(sys.argv) > 5 else 1024
steps = int(sys.argv[6]) if len(sys.argv) > 6 else None
url = f'https://api.cloudflare.com/client/v4/accounts/{ACC}/ai/run/@cf/{model}'
if model.startswith('black-forest-labs/flux-2'):
    b = uuid.uuid4().hex; parts = []
    fields = {'prompt': prompt, 'width': str(w), 'height': str(h)}
    if steps: fields['steps'] = str(steps)
    for k, v in fields.items(): parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    body = b''.join(parts) + f'--{b}--\r\n'.encode(); ct = f'multipart/form-data; boundary={b}'
else:
    d = {'prompt': prompt}
    if model.endswith('flux-1-schnell'): d['steps'] = steps or 4
    else: d.update({'width': w, 'height': h}); d.update({'num_steps': steps} if steps else {})
    body = json.dumps(d).encode(); ct = 'application/json'
t = time.time()
req = urllib.request.Request(url, data=body, headers={'content-type': ct}, method='POST')
try:
    r = urllib.request.urlopen(req, timeout=180); raw = r.read(); rct = r.headers.get('content-type', '')
except urllib.error.HTTPError as e:
    raw = e.read(); print('HTTP', e.code, raw[:600]); rct = 'err'
ok = False
if rct.startswith('image/'):
    open(os.path.join(RAW, name + '.' + rct.split('/')[1].split(';')[0]), 'wb').write(raw); ok = True
elif rct != 'err':
    j = json.loads(raw); img = (j.get('result') or {}).get('image')
    if img: open(os.path.join(RAW, name + '.jpg'), 'wb').write(base64.b64decode(img)); ok = True
    else: print(str(j)[:600])
with open(os.path.join(RAW, 'log.jsonl'), 'a') as f: f.write(json.dumps({'name': name, 'model': model, 'prompt': prompt, 'w': w, 'h': h, 'steps': steps, 'ok': ok, 's': round(time.time() - t, 1)}) + '\n')
print(name, 'OK' if ok else 'FAIL', round(time.time() - t, 1), 's')
