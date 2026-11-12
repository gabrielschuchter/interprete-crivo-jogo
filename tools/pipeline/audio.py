import subprocess, numpy as np, os, json, sys
SRC="/mnt/user-data/uploads/Assets jogo interprete/"
OUT="/home/user/interprete-crivo-jogo/public/audio/"
os.makedirs(OUT+"musica",exist_ok=True); os.makedirs(OUT+"ambiente",exist_ok=True); os.makedirs(OUT+"efeitos",exist_ok=True)
def ff(*a): subprocess.run(["ffmpeg","-v","error","-y",*a],check=True)
def load(f,sr=44100):
    p=subprocess.run(["ffmpeg","-v","error","-i",SRC+f,"-ac","1","-ar",str(sr),"-f","f32le","-"],capture_output=True,check=True)
    return np.frombuffer(p.stdout,np.float32)
def save(x,out,sr=44100,br="112k"):
    p=subprocess.Popen(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(sr),"-ac","1","-i","-","-c:a","libmp3lame","-b:a",br,out],stdin=subprocess.PIPE)
    p.communicate(x.astype(np.float32).tobytes())
# música
mus={"atrio":"Night Vigil.mp3","bosque":"Equatorial Complex.mp3","arquivo":"Aquarium.mp3","observatorio":"Ether Vox.mp3","menu":"That Zen Moment.mp3"}
for k,f in mus.items():
    lim=["-t","300"] if k=="menu" else []
    ff("-i",SRC+f,*lim,"-af","loudnorm=I=-20:TP=-2:LRA=11,afade=t=in:d=2","-ac","2","-ar","44100","-c:a","libmp3lame","-b:a","96k",OUT+f"musica/{k}.mp3")
# ambiências em laço (crossfade no fim para emendar)
def loopify(x,sr=44100,fade=2.0):
    n=int(fade*sr); a=x[:n]; b=x[-n:]; t=np.linspace(0,1,n)
    mid=x[n:-n]; return np.concatenate([b*(1-t)+a*t, mid]) if len(mid)>0 else x
amb={"sala":"766206__dolineh__university-classroom.wav","salao":"789860__klankbeeld__chatting-people-in-large-hall-1029-am-250223_1003.flac","agua":"878005__starsoundzzz__splashing-water.wav","poca":"877999__starsoundzzz__puddle.wav"}
for k,f in amb.items():
    x=load(f); x=x/ (np.sqrt(np.mean(x**2))+1e-9)*0.08; x=np.clip(x,-0.95,0.95)
    save(loopify(x),OUT+f"ambiente/{k}.mp3",br="80k")
# efeitos: recorte por envoltória
def env(x,sr,win=0.01):
    w=int(win*sr); e=np.sqrt(np.convolve(x**2,np.ones(w)/w,"same")); return e
def hits(x,sr,thr_rel=0.25,mindist=0.25,maxn=8,pre=0.02,dur=0.45):
    e=env(x,sr); thr=thr_rel*np.percentile(e,99.5)
    idx=[];i=0
    above=np.where(e>thr)[0]
    last=-1e9
    for a in above:
        if a-last>mindist*sr: idx.append(a); last=a
        else: last=a if False else last
    segs=[]
    for a in idx:
        s=max(0,a-int(pre*sr)); t=min(len(x),s+int(dur*sr)); seg=x[s:t].copy()
        f=int(0.03*sr); seg[-f:]*=np.linspace(1,0,f); seg[:int(0.003*sr)]*=np.linspace(0,1,int(0.003*sr))
        pk=np.max(np.abs(seg)); 
        if pk<1e-4: continue
        segs.append((pk,seg/pk*0.85))
    segs.sort(key=lambda s:-s[0])
    return [s for _,s in segs[:maxn]]
rep={}
for k,f,mx,dur,md in [("passo-pedra","878006__starsoundzzz__steps-on-marble.m4a",6,0.42,0.3),("passo-terra","878026__duranburrus__footsteps-dirt.wav",8,0.5,0.35),("passo-entulho","878286__loganzsound__wood-and-metal-rubble-steps.wav",6,0.55,0.35),("espada","877860__incrediblesgm__swords.wav",3,0.7,0.4),("lamina","877796__isalreky__sword.wav",4,0.9,0.5),("passo-agua","877999__starsoundzzz__puddle.wav",6,0.6,0.4)]:
    x=load(f); s=hits(x,44100,maxn=mx,dur=dur,mindist=md)
    for i,seg in enumerate(s): save(seg,OUT+f"efeitos/{k}-{i+1}.mp3",br="96k")
    rep[k]=len(s)
x=load("877794__isalreky__dark-energy.wav"); x=x/np.max(np.abs(x))*0.85; save(x,OUT+"efeitos/energia.mp3",br="96k")
json.dump(rep,open(OUT+"efeitos/indice.json","w"))
print(rep)
