import json, subprocess, sys
E=[["eyes","high-poly","Eyes"],["eyelashes","eyelashes01","Eyelashes"]]
def H(n): return ["hair",n,"Hair"]
def C(n): return ["clothes",n,"Clothes"]
def B(n): return ["eyebrows",n,"Eyebrows"]
race=lambda a,c,f:{"african":a,"caucasian":c,"asian":f}
cast={
 "player_curto":dict(macro=dict(gender=1.0,age=0.5,muscle=0.6,weight=0.5,height=0.55,race=race(.33,.34,.33)),skin="young_caucasian_male",assets=E+[B("eyebrow002"),H("short02"),C("toigo_suit_with_dinner_jacket"),C("shoes02")]),
 "player_coque":dict(macro=dict(gender=0.0,age=0.5,muscle=0.55,weight=0.5,height=0.55,race=race(.33,.34,.33)),skin="young_caucasian_female",assets=E+[B("eyebrow001"),H("elvs_reverse_french_braid_bun"),C("toigo_female_double-breasted_suit"),C("shoes06")]),
 "player_longo":dict(macro=dict(gender=0.0,age=0.5,muscle=0.5,weight=0.48,height=0.5,race=race(.33,.34,.33)),skin="young_caucasian_female",assets=E+[B("eyebrow001"),H("long01"),C("toigo_female_suit_2"),C("shoes06")]),
 "player_capuz":dict(macro=dict(gender=0.7,age=0.5,muscle=0.55,weight=0.5,height=0.55,race=race(.33,.34,.33)),skin="young_caucasian_male",assets=E+[B("eyebrow002"),C("donitz_monk_robe"),C("donitz_monk_robe_hood"),C("shoes02")]),
 "heloisa":dict(macro=dict(gender=0.0,age=0.88,weight=0.55,height=0.6,race=race(.55,.25,.2)),skin="middleage_african_female",assets=E+[B("eyebrow001"),H("elvs_reverse_french_braid_bun"),C("toigo_female_double-breasted_suit"),C("toigo_long_full_skirt"),C("shoes06")]),
 "iris":dict(macro=dict(gender=0.0,age=0.42,weight=0.42,height=0.4,muscle=0.55,race=race(.8,.1,.1)),skin="young_african_female",assets=E+[B("eyebrow001"),H("afro01"),C("toigo_fisherman_sweater"),C("toigo_wool_pants"),C("shoes06")]),
 "anselmo":dict(macro=dict(gender=1.0,age=0.92,weight=0.7,height=0.62,race=race(.1,.6,.3)),skin="old_caucasian_male",assets=E+[B("eyebrow002"),C("wdg_scruffy_beard"),C("frankyaye_glasses_library_male"),C("toigo_male_suit_3"),C("shoes03")]),
 "dalva":dict(macro=dict(gender=0.0,age=0.78,weight=0.72,height=0.45,muscle=0.6,race=race(.85,.1,.05)),skin="middleage_african_female",assets=E+[B("eyebrow001"),H("rehmanpolanski_hair_bun_brown"),C("toigo_fisherman_sweater"),C("toigo_long_full_skirt"),C("shoes06")]),
 "lia":dict(macro=dict(gender=0.0,age=0.4,weight=0.4,height=0.38,race=race(.05,.9,.05)),skin="toigo_light_skin_female_ginger",assets=E+[B("eyebrow001"),H("long01"),C("toigo_dress_with_tiered_skirt"),C("shoes06")]),
 "noemia":dict(macro=dict(gender=0.0,age=0.55,weight=0.48,height=0.55,race=race(.05,.85,.1)),skin="young_caucasian_female",assets=E+[B("eyebrow001"),H("elvs_french_braid_variation"),C("toigo_female_double-breasted_suit"),C("toigo_wool_pants"),C("shoes06")]),
 "tome":dict(macro=dict(gender=1.0,age=0.7,weight=0.6,height=0.6,muscle=0.6,race=race(.3,.3,.4)),skin="middleage_asian_male",assets=E+[B("eyebrow002"),H("short02"),C("grinsegold_beard_sigmund_wip"),C("jujube_newsboy_cap"),C("male_worksuit01"),C("shoes03")]),
 "vulto":dict(macro=dict(gender=0.8,age=0.6,weight=0.35,height=0.85,muscle=0.4,race=race(.33,.34,.33)),skin="old_caucasian_male",assets=E+[C("donitz_monk_robe"),C("donitz_monk_robe_hood")]),
}
PAL={'player_curto': {'short02':'8a7a6a','dinner_jacket': '9a9690', 'shoes': '2a1d16'}, 'player_coque': {'braid':'8a7a6a','double-breasted': '9a9690', 'shoes': '2a1d16'}, 'player_longo': {'long01':'8a7a6a','female_suit_2': '9a9690', 'shoes': '2a1d16'}, 'player_capuz': {'monk_robe': '9a9690', 'shoes': '2a1d16'}, 'heloisa': {'double-breasted': '4a1a2c', 'full_skirt': '231b20', 'shoes': '21170f', 'braid': 'b8b0a8'}, 'iris': {'sweater': '2c4a3e', 'wool_pants': '2e2b28', 'shoes': '2a1d16'}, 'anselmo': {'suit_3': '4a3826', 'shoes': '1e140e', 'beard': 'a8a098'}, 'dalva': {'sweater': '5a4632', 'full_skirt': '2a2a30', 'shoes': '21170f'}, 'lia': {'tiered': '2a3a52', 'shoes': '2a1d16'}, 'noemia': {'double-breasted': '3a2a4a', 'wool_pants': '24202a', 'shoes': '2a1d16'}, 'tome': {'worksuit': '3a3226', 'newsboy': '2a2620', 'shoes': '1e140e'}, 'vulto': {'monk_robe': '0e0c12'}}
for k_,v_ in PAL.items(): cast[k_]['recolor']=v_
clips=json.load(open('/tmp/claude-0/pipe/clips.json'))
only=sys.argv[1:] or list(cast)
for k in only:
    c=cast[k]
    hb=dict(blend=f'/tmp/claude-0/chars/{k}.blend',**c)
    r=subprocess.run(['/tmp/claude-0/bpyenv/bin/python','/tmp/claude-0/pipe/human.py',json.dumps(hb)],capture_output=True,text=True)
    miss=[l for l in r.stdout.splitlines() if 'MISSING' in l]
    a=subprocess.run(['/tmp/claude-0/bpyenv/bin/python','/tmp/claude-0/pipe/anim.py',json.dumps(dict(blend=hb['blend'],out=f'/tmp/claude-0/chars/{k}.glb',clips=clips,tex=1024,masks=True,recolor=c.get('recolor',{})))],capture_output=True,text=True)
    ok=[l for l in a.stdout.splitlines() if l.startswith('OK') or 'FALHOU' in l]
    print(k, miss, ok, (r.stderr[-300:] if r.returncode else ''), (a.stderr[-500:] if a.returncode else ''), flush=True)
