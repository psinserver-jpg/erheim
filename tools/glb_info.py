#!/usr/bin/env python3
"""GLB 파일의 구조 요약(노드·스킨·애니메이션·텍스처)을 출력한다."""
import json, struct, sys
for path in sys.argv[1:]:
    d = open(path, 'rb').read()
    magic, ver, length = struct.unpack('<III', d[:12])
    clen, ctype = struct.unpack('<II', d[12:20])
    j = json.loads(d[20:20 + clen])
    print(f"== {path}  {len(d)/1e6:.2f} MB")
    print(" meshes:", [(m['name'], len(m['primitives'])) for m in j.get('meshes', [])])
    tri = 0
    for m in j.get('meshes', []):
        for p in m['primitives']:
            if 'indices' in p:
                tri += j['accessors'][p['indices']]['count'] // 3
    print(" triangles:", tri)
    for s in j.get('skins', []):
        print(" skin:", s.get('name'), "joints", len(s['joints']))
    print(" nodes:", len(j.get('nodes', [])), "| materials:", [m['name'] for m in j.get('materials', [])])
    print(" images:", [(im.get('name'), im.get('mimeType')) for im in j.get('images', [])])
    print(" extensionsUsed:", j.get('extensionsUsed'))
    for a in j.get('animations', []):
        tmax = max(j['accessors'][s['input']]['max'][0] for s in a['samplers'])
        print(f"  anim {a['name']:10s} channels {len(a['channels']):3d}  duration {tmax:.3f}s")
    # 소켓 뼈에 붙은 자식 노드
    names = {i: n.get('name') for i, n in enumerate(j['nodes'])}
    for i, n in enumerate(j['nodes']):
        if n.get('name') in ('weapon.R', 'shield.L', 'weapon.L'):
            print("  socket", n['name'], "children:", [names[c] for c in n.get('children', [])])
