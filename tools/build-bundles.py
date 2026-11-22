#!/usr/bin/env python3
"""Rebuilds js/bundle-<site>.<hash>.js from the individual source scripts and points every site page at it.
Source files (js/config.js, data.js, site-*.js, pages-extra.js, product-extra.js, core.js) stay the editable originals;
run this script after editing any of them:  python3 tools/build-bundles.py
Why: the pages used to request 5 separate scripts one after another. One deferred, content-hashed bundle means
one request, discovered while the head is parsed, never blocking the parser, and a new URL whenever the code changes."""
import re,glob,hashlib,os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
SETS={'main':['config','data','site-main','pages-extra','core'],'bizflow':['config','data','site-bizflow','product-extra','core'],'downflow':['config','data','site-downflow','product-extra','core']}
out={}
for k,parts in SETS.items():
    src='\n;\n'.join(open(R+'js/%s.js'%p,encoding='utf-8').read() for p in parts)+'\n'
    h=hashlib.sha256(src.encode('utf-8')).hexdigest()[:10]
    name='bundle-%s.%s.js'%(k,h)
    for old in glob.glob(R+'js/bundle-%s.*.js'%k): os.remove(old)
    open(R+'js/'+name,'w',encoding='utf-8').write(src); out[k]=name
def key_of(files):
    n=[os.path.basename(f)[:-3] for f in files]
    for k,parts in SETS.items():
        if n==parts: return k
pages=glob.glob(R+'*.html')+glob.glob(R+'bizflow/*.html')+glob.glob(R+'downflow/*.html')
done=0
for f in pages:
    t=open(f,encoding='utf-8').read()
    # already bundled: just refresh the file name
    t2=re.sub(r'<script defer src="((?:\.\./|/)?)js/bundle-(main|bizflow|downflow)\.[0-9a-f]+\.js"></script>',lambda m:'<script defer src="%sjs/%s"></script>'%(m.group(1),out[m.group(2)]),t)
    if t2!=t: open(f,'w',encoding='utf-8').write(t2); done+=1; continue
    m=re.search(r'(?:<script src="((?:\.\./|/)?)js/[^"]+"></script>){5}',t)
    if not m: continue
    files=re.findall(r'<script src="((?:\.\./|/)?js/[^"]+)"></script>',m.group(0)); k=key_of(files)
    if not k: print('skip (unknown set):',f); continue
    pre='../' if files[0].startswith('../') else ('/' if files[0].startswith('/') else '')
    t=t.replace(m.group(0),'',1)
    t=t.replace('</head>','<script defer src="%sjs/%s"></script></head>'%(pre,out[k]),1)
    open(f,'w',encoding='utf-8').write(t); done+=1
print('bundles:',out,'| pages updated:',done)
