#!/usr/bin/env python3
"""Generate footage and stills through OpenRouter (replaces Higgsfield). Every call is priced first; nothing is spent
without --yes, and --max-usd (default $3 a job) caps any single job.
  python3 tools/gen.py models [seedance]            list video + image models with their live prices
  python3 tools/gen.py balance                      credit left on the key
  python3 tools/gen.py video --model bytedance/seedance-2.5 --res 480p --aspect 9:16 --duration 8 \\
      --first-frame footage/ref/dana_v2_1.png --ref vo/ugc/dana_voice_ref_kitchen.mp3 \\
      --prompt-file prompts/x.txt --out footage/gen/x.mp4            -> prints the quote and stops
  ... same command + --yes                          -> submits, polls, downloads, logs
  python3 tools/gen.py image --model google/gemini-3-pro-image --res 2K --aspect 9:16 --ref footage/ref/dana_v2_1.png \\
      --prompt "..." --out footage/ref/x.png [--yes]
  python3 tools/gen.py fetch <job id> --out footage/gen/x.mp4    resume a job (poll + download) after an interrupt
Key: OPENROUTER_API_KEY (environment secret; never printed). Every submitted job is appended to footage/gen/jobs.jsonl
the moment it is accepted, then again with the billed cost (usage.cost) when it completes.
Local media go up as base64 data URLs (--media data, the default). --media github sends raw.githubusercontent.com URLs
of the pushed branch instead (only works while the repo is public, and the file must be pushed).
Video estimates: token-billed models (Seedance) = w x h x 24 fps x seconds / 1024 tokens at the listed rate, with w x h
taken from the model's own supported_sizes; per-second models use the matching SKU. The billed cost is logged after."""
import argparse, base64, datetime, io, json, mimetypes, os, subprocess, sys, time
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://openrouter.ai/api/v1'
LOG = os.path.join(ROOT, 'footage/gen/jobs.jsonl')
FPS = 24                                   # Seedance renders 24 fps; the token formula uses it
GEMINI_IMG_TOKENS = {'1K': 1120, '2K': 1120, '4K': 2000}   # output tokens per image (Gemini 3 Pro / 3.1 Flash Image)


def key():
    k = os.environ.get('OPENROUTER_API_KEY')
    if not k:
        sys.exit('OPENROUTER_API_KEY is not set (add it as an environment secret; a new session picks it up).')
    return k


def hdr():
    return {'Authorization': f'Bearer {key()}', 'Content-Type': 'application/json',
            'X-Title': 'MyFastRx ads (glp1-glass)'}


def get(path, auth=False):
    r = requests.get(API + path, headers=hdr() if auth else {}, timeout=60)
    if r.status_code != 200:
        sys.exit(f'GET {path}: {r.status_code} {r.text[:400]}')
    return r.json()


def log(rec):
    rec = {'t': datetime.datetime.now().isoformat(timespec='seconds'), **rec}
    with open(LOG, 'a') as f:
        f.write(json.dumps(rec) + '\n')


# ---- media -------------------------------------------------------------------------------------------------------

def media_url(path, mode):
    if path.startswith(('http://', 'https://', 'data:')):
        return path
    p = os.path.abspath(path)
    if not os.path.exists(p):
        sys.exit(f'missing file: {path}')
    if mode == 'github':
        rel = os.path.relpath(p, os.path.dirname(os.path.dirname(ROOT)))
        branch = subprocess.check_output(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=ROOT, text=True).strip()
        url = f'https://raw.githubusercontent.com/David0524/MyFastRX/{branch}/{rel}'
        if requests.head(url, timeout=30).status_code != 200:
            sys.exit(f'{url} is not reachable: push the file first (or the repo is private; use --media data)')
        return url
    data, mime = open(p, 'rb').read(), mimetypes.guess_type(p)[0] or 'application/octet-stream'
    if mime == 'image/png' and len(data) > 4_000_000:   # big PNG stills: send a q95 JPEG, same pixels to the eye
        from PIL import Image
        buf = io.BytesIO(); Image.open(p).convert('RGB').save(buf, 'JPEG', quality=95); data, mime = buf.getvalue(), 'image/jpeg'
    return f'data:{mime};base64,' + base64.b64encode(data).decode()


def ref_part(path, mode):
    kind = (mimetypes.guess_type(path)[0] or 'image/').split('/')[0]
    kind = {'image': 'image_url', 'audio': 'audio_url', 'video': 'video_url'}.get(kind)
    if not kind:
        sys.exit(f'--ref {path}: unknown media type (image, audio or video)')
    return {'type': kind, kind: {'url': media_url(path, mode)}}


def short(body):
    """The request body with data URLs shortened, for printing and the log."""
    s = json.dumps(body)
    while 'data:' in s:
        i = s.index('data:'); j = s.index('"', i)
        s = s[:i] + f'<data {(j - i) * 3 // 4 // 1024} KB>' + s[j:]
    return json.loads(s)


# ---- pricing -----------------------------------------------------------------------------------------------------

def video_model(mid):
    for m in get('/videos/models')['data']:
        if m['id'] == mid:
            return m
    sys.exit(f'unknown video model {mid} (python3 tools/gen.py models)')


def dims(m, res, aspect):
    aw, ah = map(int, aspect.split(':'))
    short_side = {'480p': 480, '720p': 720, '1080p': 1080, '4k': 2160}[res.lower()]
    for s in m.get('supported_sizes') or []:
        w, h = map(int, s.split('x'))
        if min(w, h) == short_side and abs(w / h - aw / ah) < 0.03:
            return w, h
    long_side = round(short_side * max(aw, ah) / min(aw, ah))
    return (long_side, short_side) if aw >= ah else (short_side, long_side)


def video_quote(m, res, aspect, dur, audio, has_video_ref, n_images):
    """(usd, how) for one job, from the model's live pricing_skus."""
    sk, r = m['pricing_skus'], res.lower()
    if 'video_tokens' in sk:
        w, h = dims(m, res, aspect)
        tokens = w * h * FPS * dur / 1024
        names = ([f'video_tokens_{r}_with_video_input', 'video_tokens_with_video_input'] if has_video_ref else []) + \
                ([] if audio else [f'video_tokens_{r}_without_audio']) + [f'video_tokens_{r}'] + \
                ([] if audio else ['video_tokens_without_audio']) + ['video_tokens']
        name = next(n for n in names if n in sk)
        return tokens * float(sk[name]), f'{w}x{h} x {FPS} fps x {dur} s / 1024 = {tokens:,.0f} tokens @ {name}'
    mode = 'image_to_video' if n_images else 'text_to_video'
    a = 'with_audio' if audio else 'without_audio'
    names = [f'duration_seconds_{a}_{r}', f'duration_seconds_{a}', f'{mode}_duration_seconds_{r}',
             f'duration_seconds_{r}', 'duration_seconds', f'cents_per_video_output_second_{r}',
             f'cents_per_second_output_{r}', 'cents_per_second_output']
    name = next((n for n in names if n in sk), None)
    if not name:
        return None, f'no matching SKU in {sorted(sk)}'
    rate = float(sk[name]) / (100 if name.startswith('cents') else 1)
    usd = rate * dur + n_images * float(sk.get('cents_per_image_input', 0)) / 100
    return usd, f'{dur} s @ ${rate:.4f}/s ({name})'


def image_quote(mid, res, n_refs):
    eps = get(f'/images/models/{mid}/endpoints')['endpoints']
    price = {p['billable']: p for p in eps[0]['pricing']}
    out = price.get('output_image')
    if not out:
        return None, 'no output_image price'
    if out['unit'] == 'image':
        usd = out['cost_usd']
    elif out['unit'] == 'token' and 'gemini' in mid:
        usd = GEMINI_IMG_TOKENS[res] * out['cost_usd'] + n_refs * 560 * price.get('input_image', {}).get('cost_usd', 0)
    else:
        return None, f"output priced per {out['unit']}: check the model page"
    return usd, f"{eps[0]['provider_name']}, {res}, {n_refs} reference(s)"


# ---- commands ----------------------------------------------------------------------------------------------------

def cmd_models(a):
    for m in get('/videos/models')['data']:
        if not a.filter or a.filter in m['id']:
            print(f"video  {m['id']:38} {','.join(m.get('supported_resolutions') or []):24} "
                  f"{json.dumps(m['pricing_skus'])[:150]}")
    for m in get('/images/models')['data']:
        if not a.filter or a.filter in m['id']:
            print(f"image  {m['id']}")


def cmd_balance(a):
    d = get('/key', auth=True)['data']
    print(f"used ${d.get('usage', 0):.2f}; limit {d.get('limit')}; remaining {d.get('limit_remaining')}")


def guard(usd, how, a):
    print(f'ESTIMATE: ${usd:.2f}  ({how})' if usd is not None else f'ESTIMATE: unknown ({how})')
    if not a.yes:
        print('Quote only. Add --yes to spend.'); sys.exit(0)
    if usd is None and not a.allow_unpriced:
        sys.exit('No price for this request; pass --allow-unpriced to run it anyway.')
    if usd is not None and usd > a.max_usd:
        sys.exit(f'${usd:.2f} is over --max-usd {a.max_usd:.2f}.')


def cmd_video(a):
    m = video_model(a.model)
    for v, field in ((a.res, 'supported_resolutions'), (a.aspect, 'supported_aspect_ratios'), (a.duration, 'supported_durations')):
        if m.get(field) and v not in m[field]:
            sys.exit(f'{a.model}: {v} not in {field} {m[field]}')
    body = {'model': a.model, 'prompt': prompt(a), 'duration': a.duration, 'resolution': a.res,
            'aspect_ratio': a.aspect, 'generate_audio': not a.no_audio}
    frames = [(a.first_frame, 'first_frame'), (a.last_frame, 'last_frame')]
    if any(p for p, _ in frames):
        body['frame_images'] = [{'type': 'image_url', 'image_url': {'url': media_url(p, a.media)}, 'frame_type': t}
                                for p, t in frames if p]
    if a.ref:
        body['input_references'] = [ref_part(p, a.media) for p in a.ref]
        if 'frame_images' in body:   # OpenRouter docs: with both, the job is treated as image-to-video
            print('WARNING: --first/--last-frame with --ref: OpenRouter may ignore the references. For a start image'
                  ' plus a voice reference (Higgsfield omni_reference), try passing the still as --ref instead.')
    if a.seed is not None:
        body['seed'] = a.seed
    if a.model.startswith('bytedance/'):
        body['provider'] = {'options': {'byteplus': {'watermark': False}}}
    n_img = len(body.get('frame_images', [])) + sum(r['type'] == 'image_url' for r in body.get('input_references', []))
    has_vid = any(r['type'] == 'video_url' for r in body.get('input_references', []))
    usd, how = video_quote(m, a.res, a.aspect, a.duration, not a.no_audio, has_vid, n_img)
    print(json.dumps(short(body), indent=1))
    guard(usd, how, a)
    r = requests.post(API + '/videos', headers=hdr(), json=body, timeout=600)
    if r.status_code not in (200, 202):
        sys.exit(f'submit failed: {r.status_code} {r.text[:800]}')
    job = r.json()
    log({'kind': 'video', 'status': 'submitted', 'id': job['id'], 'out': a.out, 'estimate_usd': round(usd or 0, 4),
         'request': short(body), 'label': a.label})
    print(f"submitted {job['id']}  (resume: python3 tools/gen.py fetch {job['id']} --out {a.out})")
    fetch(job['id'], a.out, a.label)


def fetch(jid, out, label=None):
    t0 = time.time()
    while True:
        j = get(f'/videos/{jid}', auth=True)
        if j['status'] == 'completed':
            break
        if j['status'] in ('failed', 'cancelled', 'expired'):
            log({'kind': 'video', 'status': j['status'], 'id': jid, 'error': j.get('error'), 'out': out})
            sys.exit(f"{j['status']}: {j.get('error')}")
        print(f"  {j['status']} {time.time() - t0:.0f} s", flush=True)
        time.sleep(15)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    outs = []
    for i, u in enumerate(j.get('unsigned_urls') or [f'{API}/videos/{jid}/content?index=0']):
        p = out if i == 0 else out.replace('.mp4', f'_{i}.mp4')
        with requests.get(u, headers=hdr(), stream=True, timeout=600) as r:
            r.raise_for_status()
            with open(p, 'wb') as f:
                for chunk in r.iter_content(1 << 20):
                    f.write(chunk)
        outs.append(p)
    cost = (j.get('usage') or {}).get('cost')
    log({'kind': 'video', 'status': 'completed', 'id': jid, 'generation_id': j.get('generation_id'), 'out': outs,
         'cost_usd': cost, 'label': label})
    for p in outs:
        probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                'stream=width,height,r_frame_rate:format=duration', '-of', 'csv=p=0', p],
                               capture_output=True, text=True).stdout.split()
        print(f'saved {p}  {" ".join(probe)}')
    print(f'billed: ${cost}' if cost is not None else 'billed: (not reported yet; see the OpenRouter activity page)')
    print(f'| {os.path.basename(outs[0])} | {jid} | ${cost} | {label or ""} |   <- footage/gen/README.md row')


def cmd_fetch(a):
    fetch(a.job, a.out, a.label)


def cmd_image(a):
    usd, how = image_quote(a.model, a.res, len(a.ref or []))
    body = {'model': a.model, 'prompt': prompt(a), 'resolution': a.res, 'aspect_ratio': a.aspect, 'n': 1}
    if a.ref:
        body['input_references'] = [{'type': 'image_url', 'image_url': {'url': media_url(p, 'data')}} for p in a.ref]
    print(json.dumps(short(body), indent=1))
    guard(usd, how, a)
    r = requests.post(API + '/images', headers=hdr(), json=body, timeout=600)
    if r.status_code != 200:
        sys.exit(f'image failed: {r.status_code} {r.text[:800]}')
    d = r.json()
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    outs = []
    for i, img in enumerate(d['data']):
        p = a.out if i == 0 else a.out.replace('.png', f'_{i}.png')
        open(p, 'wb').write(base64.b64decode(img['b64_json']))
        outs.append(p)
    cost = (d.get('usage') or {}).get('cost')
    log({'kind': 'image', 'status': 'completed', 'id': d.get('id'), 'out': outs, 'cost_usd': cost,
         'estimate_usd': round(usd or 0, 4), 'request': short(body), 'label': a.label})
    print(f'saved {", ".join(outs)}; billed: ${cost}')


def prompt(a):
    p = open(a.prompt_file).read().strip() if a.prompt_file else a.prompt
    if not p:
        sys.exit('--prompt or --prompt-file is required')
    return p


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('models'); s.add_argument('filter', nargs='?'); s.set_defaults(f=cmd_models)
    s = sub.add_parser('balance'); s.set_defaults(f=cmd_balance)
    s = sub.add_parser('fetch'); s.add_argument('job'); s.add_argument('--out', required=True)
    s.add_argument('--label'); s.set_defaults(f=cmd_fetch)
    for name, f in (('video', cmd_video), ('image', cmd_image)):
        s = sub.add_parser(name); s.set_defaults(f=f)
        s.add_argument('--model', required=True)
        s.add_argument('--prompt'); s.add_argument('--prompt-file')
        s.add_argument('--aspect', default='9:16')
        s.add_argument('--ref', action='append', help='reference image (video: also audio or video), repeatable')
        s.add_argument('--out', required=True); s.add_argument('--label', help='a note for the log')
        s.add_argument('--yes', action='store_true', help='actually spend (default: quote only)')
        s.add_argument('--max-usd', type=float, default=3.0, help='refuse any single job over this (default 3)')
        s.add_argument('--allow-unpriced', action='store_true')
        if name == 'video':
            s.add_argument('--res', default='480p'); s.add_argument('--duration', type=int, default=5)
            s.add_argument('--first-frame'); s.add_argument('--last-frame')
            s.add_argument('--no-audio', action='store_true'); s.add_argument('--seed', type=int)
            s.add_argument('--media', choices=['data', 'github'], default='data')
        else:
            s.add_argument('--res', default='2K')
    a = ap.parse_args()
    a.f(a)


if __name__ == '__main__':
    main()
