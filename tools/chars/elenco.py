# Receitas do elenco (bíblia de personagens PS2, 13/11/2026). Gera elenco.json: python3 tools/chars/elenco.py
# Cada receita: corpo MakeHuman (macro), peças de figurino, células do atlas (cor e tecido), clipes.
# Paleta: carvão, pedra, marfim velho, vinho, ameixa, couro escuro, bronze gasto; violeta só em fenômenos.
import json, os, copy

HUM = ["Spine1", "LeftShoulder", "RightShoulder", "Hips", "LowerBack", "Spine", "LHipJoint", "RHipJoint",
       "LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg", "LeftFoot", "RightFoot", "LeftToeBase", "RightToeBase", "LeftArm", "RightArm"]
NPC_CLIPS = ["idle", "walk", "run", "talk", "point", "listen", "wave", "shrug", "interact", "hit", "die"]
MOB_CLIPS = ["idle", "walk", "run", "attack", "heavy", "hit", "die", "cast", "listen", "talk"]
PC_CLIPS = None  # todos


def macro(g, age, h=0.5, w=0.5, m=0.5, prop=0.5, race=(0.15, 0.7, 0.15)):
    return {"gender": g, "age": age, "height": h, "weight": w, "muscle": m, "proportions": prop,
            "race": {"african": race[0], "caucasian": race[1], "asian": race[2]}}


def cloth(col, kind="la", **k):
    return {"col": col, "kind": kind, **k}


LEATHER = cloth("3a281c", "couro", folds=0, grime=0.2, seams=False)
BOOT = cloth("2a1e16", "couro", folds=0.1, grime=0.6, seams=False)
GLOVE = cloth("2e2018", "couro", folds=0, grime=0.3, seams=False)
METAL = {"pintura": "metal", "col": "8a6a3a", "rust": 0.35}
GLOW = {"pintura": "brilho", "col": "ffb35a"}


def hair(col, style, **k):
    return [{"tipo": "cabelo", "style": style, "cell": "cabelo", **k}], {"cabelo": {"pintura": "cabelo", "col": col}}


def R(id_, nome, corpo, pecas, celulas, clipes=NPC_CLIPS, **extra):
    r = {"id": id_, "nome": nome, "corpo": corpo, "pecas": pecas, "celulas": celulas, "esconder": HUM}
    if clipes: r["clipes"] = clipes
    r.update(extra)
    return r


E = {}

# ------------------------------------------------------------------ protagonistas (8 combinações: corpo x penteado)
def protag_m(style):
    hp, hc = hair("9a8a74", {"curto": "bagunca", "coque": "coque", "longo": "longo", "capuz": "curto"}[style], volume=0.014, length=0.22, locks=0 if style != "coque" else 2)
    p = [
        {"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.016, "collar": 0.05, "cell": "casaco"},
        {"tipo": "manga", "off": 0.02, "t1": 0.98, "cuff": 0.022, "cell": "manga"},
        {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.2", "off": 0.026, "flare": 0.12, "open_front": 0.42, "open_from": 1.0, "back_slit": 0.18, "cell": "aba", "follow": 0.9},
        {"tipo": "calca", "off": 0.012, "z_bot": "knee-0.1", "cell": "calca"},
        {"tipo": "bota", "z_top": "knee-0.06", "cell": "bota"},
        {"tipo": "cinto", "z": "waist", "off": 0.03, "cell": "couro"},
        {"tipo": "cachecol", "thick": 0.034, "tail": 0.3, "side": -1, "cell": "cachecol"},
        {"tipo": "luva", "cell": "luva"},
        {"tipo": "bolsa", "side": 1, "strap_from": -1, "cell": "couro"},
    ]
    if style == "capuz":
        p.append({"tipo": "capuz", "off": 0.04, "cell": "capuz"})
    else:
        p += hp
    c = {"casaco": cloth("3a2e2a", "la", trim="2a2020", trim_w=0.05, folds=0.3), "manga": cloth("3a2e2a", "la", folds=0.2, trim="2a2020", trim_w=0.08),
         "aba": cloth("3a2e2a", "la", folds=0.6, grime=0.6, trim="2a1e1e", trim_w=0.04), "calca": cloth("26222a", "la", folds=0.3, grime=0.5),
         "bota": BOOT, "couro": LEATHER, "cachecol": cloth("5e1a26", "la", folds=0.4, grime=0.2), "luva": GLOVE,
         "capuz": cloth("2e2626", "la", folds=0.3, grime=0.1)} | hc
    return R("PC_M_01", "Viajante (base masculina)", {"macro": macro(1.0, 0.45, 0.6, 0.5, 0.6, 0.6), "pele": "young_caucasian_male", "sobrancelha": "eyebrow002"},
             p, c, clipes=PC_CLIPS, tocha=True, cabelo_material=True, sobrancelha_cor="241812")


def protag_f(style):
    hp, hc = hair("9a8a74", {"curto": "curto", "coque": "coque", "longo": "longo", "capuz": "curto"}[style], volume=0.012, length=0.32, locks=2 if style in ("coque", "longo") else 0)
    p = [
        {"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.014, "collar": 0.05, "cell": "corpete"},
        {"tipo": "manga", "off": 0.016, "t1": 0.98, "cuff": 0.018, "cell": "manga"},
        {"tipo": "capa", "z_bot": "elbow+0.02", "off": 0.03, "flare": 0.07, "cell": "capa"},
        {"tipo": "saia", "id": "saia", "z_top": "waist", "z_hem": "knee-0.3", "off": 0.024, "flare": 0.13, "open_front": 0.5, "open_from": 0.75, "cell": "saia", "follow": 0.9},
        {"tipo": "calca", "off": 0.012, "z_bot": "knee-0.1", "cell": "calca"},
        {"tipo": "bota", "z_top": "knee-0.02", "cell": "bota"},
        {"tipo": "cinto", "z": "waist", "off": 0.028, "cell": "couro"},
        {"tipo": "luva", "cell": "luva"},
        {"tipo": "bolsa", "side": 1, "strap_from": -1, "cell": "couro"},
    ]
    if style == "capuz":
        p.append({"tipo": "capuz", "off": 0.04, "cell": "capa"})
    else:
        p += hp
    c = {"corpete": cloth("2e2228", "brocado", trim="6a1c2a", trim_w=0.05, folds=0.2), "manga": cloth("2e2228", "la", folds=0.2, trim="2a1e22", trim_w=0.08),
         "capa": cloth("3a2c30", "la", trim="6e5a3a", trim_w=0.07, motif_kind="arco", folds=0.35), "saia": cloth("4a1c2a", "brocado", folds=0.6, grime=0.5, trim="6e5a3a", trim_w=0.06, motif_kind="cruz"),
         "calca": cloth("221e24", "la", folds=0.3, grime=0.5), "bota": BOOT, "couro": LEATHER, "luva": GLOVE} | hc
    return R("PC_F_01", "Viajante (base feminina)", {"macro": macro(0.0, 0.42, 0.55, 0.45, 0.55, 0.65), "pele": "young_caucasian_female", "sobrancelha": "eyebrow001"},
             p, c, clipes=PC_CLIPS, tocha=True, cabelo_material=True, sobrancelha_cor="241812")


for st in ("curto", "coque", "longo", "capuz"):
    E[f"player_masc_{st}"] = protag_m(st)
    E[f"player_fem_{st}"] = protag_f(st)

# ------------------------------------------------------------------ NPCs
hp, hc = hair("2a2420", "curto", volume=0.01, hl_front=72)
E["npc_01_arquivista"] = R("NPC_01", "Monge Arquivista", {"macro": macro(1.0, 0.62, 0.75, 0.35, 0.4, 0.4), "pele": "middleage_caucasian_male", "sobrancelha": "eyebrow002"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.016, "collar": 0.03, "cell": "veste"},
     {"tipo": "manga", "off": 0.022, "cuff": 0.05, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": 0.05, "off": 0.024, "flare": 0.12, "cell": "batina"},
     {"tipo": "capa", "z_bot": "chest-0.04", "off": 0.035, "flare": 0.06, "cell": "murca"},
     {"tipo": "cinto", "z": "waist", "off": 0.034, "cell": "couro"},
     {"tipo": "bota", "z_top": "knee-0.15", "cell": "bota"},
     {"tipo": "oculos"}, {"tipo": "livro", "side": "R"}, {"tipo": "chaves", "side": 1},
     {"tipo": "bolsinha", "a": -1.3, "z": "hip-0.02"}] + hp,
    {"veste": cloth("2a1e22", "la", folds=0.3), "manga": cloth("2a1e22", "la", folds=0.3, trim="6e5a3a", trim_w=0.08, motif_kind="losango"),
     "batina": cloth("2a1e22", "la", folds=0.7, grime=0.5, trim="6e5a3a", trim_w=0.07, motif_kind="arco"), "murca": cloth("3e1a22", "veludo", folds=0.2, trim="6e5a3a", trim_w=0.1, motif_kind="losango"),
     "couro": LEATHER, "bota": BOOT, "metal": METAL} | hc, sobrancelha_cor="2a2420")

hp, hc = hair("3a2a20", "coque", volume=0.01, seed=11, locks=2)
E["npc_02_acendedora"] = R("NPC_02", "Acendedora de Lampiões", {"macro": macro(0.0, 0.55, 0.5, 0.5, 0.6, 0.6), "pele": "middleage_caucasian_female"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.014, "collar": 0.035, "cell": "tronco"},
     {"tipo": "manga", "off": 0.016, "t1": 0.72, "cuff": 0.02, "cell": "manga"},
     {"tipo": "saia", "id": "saia", "z_top": "waist", "z_hem": 0.06, "off": 0.02, "flare": 0.16, "cell": "saia"},
     {"tipo": "avental", "ref": "saia", "z_top": "waist", "z_hem": "knee-0.12", "width": 0.95, "bib": True, "cell": "avental"},
     {"tipo": "cinto", "z": "waist", "off": 0.032, "cell": "couro"},
     {"tipo": "cachecol", "thick": 0.03, "tail": 0.22, "side": 1, "cell": "cachecol"},
     {"tipo": "bota", "z_top": "knee-0.08", "cell": "bota"}, {"tipo": "luva", "cell": "luva"},
     {"tipo": "lampiao", "side": "L", "scale": 1.1},
     {"tipo": "ferramenta", "a": -1.25, "z": "hip+0.02", "kind": "alicate", "name": "alicate"},
     {"tipo": "ferramenta", "a": -0.95, "z": "hip+0.02", "kind": "chave", "name": "chave_inglesa"},
     {"tipo": "bolsinha", "a": 1.45, "z": "hip+0.04"}] + hp,
    {"tronco": cloth("4a3a2c", "la", trim="5a1c24", trim_w=0.08, folds=0.3), "manga": cloth("4a3a2c", "la", trim="3a2c22", trim_w=0.12, folds=0.2),
     "saia": cloth("2c2428", "la", trim="4a1820", trim_w=0.05, folds=0.7, grime=0.8, patches=2),
     "avental": cloth("5a4430", "couro", folds=0.25, grime=0.7, patches=3, trim="3a2a1e", trim_w=0.04), "couro": LEATHER,
     "cachecol": cloth("5e1a26", "la", folds=0.4, grime=0.2, stripes=["3e1018", 0.18, 3]), "bota": BOOT, "luva": GLOVE, "metal": METAL, "brilho": GLOW} | hc,
    lampiao_braco=True, sobrancelha_cor="2e2018", pele_tinta="e0ccbc")

E["npc_03_vigia"] = R("NPC_03", "Vigia da Catedral", {"macro": macro(1.0, 0.82, 0.62, 0.68, 0.7, 0.4), "pele": "old_caucasian_male", "sobrancelha": "eyebrow002"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.02, "collar": 0.03, "cell": "sobretudo"},
     {"tipo": "manga", "off": 0.024, "cuff": 0.03, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.25", "off": 0.03, "flare": 0.1, "open_front": 0.3, "cell": "aba", "follow": 0.9},
     {"tipo": "capa", "z_bot": "chest-0.02", "off": 0.04, "flare": 0.06, "cell": "murca"},
     {"tipo": "calca", "off": 0.014, "z_bot": "knee-0.1", "cell": "calca"},
     {"tipo": "bota", "z_top": "knee-0.04", "cell": "bota"},
     {"tipo": "cinto", "z": "waist", "off": 0.04, "cell": "couro"},
     {"tipo": "cachecol", "thick": 0.036, "tail": 0.18, "side": 1, "cell": "cachecol"},
     {"tipo": "luva", "cell": "luva"},
     {"tipo": "haste", "side": "R", "length": 2.05, "head": "alabarda"},
     {"tipo": "lampiao", "side": "L", "scale": 1.0},
     {"tipo": "barba", "full": True, "off": 0.01, "cell": "barba"},
     {"tipo": "cabelo", "style": "curto", "volume": 0.006, "cell": "cabelo", "hl_front": 70}],
    {"sobretudo": cloth("2a2a2e", "la", folds=0.3, emboss=["8a6a3a", 0.5, 0.45, 0.22, "cruz"]), "manga": cloth("2a2a2e", "la", folds=0.2),
     "aba": cloth("2a2a2e", "la", folds=0.6, grime=0.6, trim="6e5a3a", trim_w=0.06, motif_kind="losango"), "murca": cloth("33302e", "la", folds=0.2, trim="5a1c24", trim_w=0.06),
     "calca": cloth("221e20", "la", folds=0.3, grime=0.5), "bota": BOOT, "couro": LEATHER, "cachecol": cloth("5a1a24", "la", folds=0.4), "luva": GLOVE,
     "barba": {"pintura": "barba", "col": "a8a096"}, "cabelo": {"pintura": "cabelo", "col": "7a746c"}, "metal": METAL, "brilho": GLOW,
     "madeira": {"pintura": "madeira", "col": "3a2a1c"}}, lampiao_braco=True, sobrancelha_cor="6a645c")

hp, hc = hair("4a3e34", "coque", volume=0.01, locks=1, seed=5)
E["npc_04_estalajadeira"] = R("NPC_04", "Viúva da Estalagem", {"macro": macro(0.0, 0.7, 0.52, 0.6, 0.5, 0.5), "pele": "middleage_caucasian_female"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.014, "collar": 0.04, "cell": "corpete"},
     {"tipo": "manga", "off": 0.018, "t1": 0.85, "cuff": 0.03, "puff": 0.012, "cell": "manga"},
     {"tipo": "saia", "id": "saia", "z_top": "waist", "z_hem": 0.06, "off": 0.026, "flare": 0.2, "cell": "saia"},
     {"tipo": "avental", "ref": "saia", "z_top": "waist", "z_hem": "knee-0.25", "width": 0.85, "cell": "avental"},
     {"tipo": "capa", "z_bot": "chest-0.06", "off": 0.034, "flare": 0.1, "ragged": 0.02, "cell": "xale"},
     {"tipo": "cinto", "z": "waist", "off": 0.034, "cell": "faixa"},
     {"tipo": "bota", "z_top": "knee-0.1", "cell": "bota"},
     {"tipo": "chaves", "side": 1}, {"tipo": "livro", "side": "R", "size": [0.15, 0.04, 0.2]}] + hp,
    {"corpete": cloth("2a2024", "la", folds=0.2), "manga": cloth("2a2024", "la", folds=0.2, trim="c8b890", trim_w=0.1),
     "saia": cloth("3a1820", "brocado", folds=0.7, grime=0.5, trim="221a1e", trim_w=0.06), "avental": cloth("b8a888", "linho", folds=0.4, grime=0.6, patches=1),
     "xale": cloth("5a1a28", "brocado", folds=0.3, trim="8a6a3a", trim_w=0.12, motif_kind="arco"), "faixa": cloth("a8987c", "linho", folds=0),
     "bota": BOOT, "metal": METAL} | hc)

hp, hc = hair("3a2a20", "trancas", volume=0.01, length=0.3, locks=2)
E["npc_05_enfermeira"] = R("NPC_05", "Enfermeira da Neve", {"macro": macro(0.0, 0.48, 0.55, 0.48, 0.5, 0.6), "pele": "young_caucasian_female"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.018, "collar": 0.03, "cell": "casaco"},
     {"tipo": "manga", "off": 0.022, "cuff": 0.03, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.32", "off": 0.026, "flare": 0.15, "cell": "aba"},
     {"tipo": "capa", "z_bot": "chest-0.02", "off": 0.035, "flare": 0.06, "cell": "capa"},
     {"tipo": "cachecol", "thick": 0.045, "tail": 0.2, "side": 1, "cell": "cachecol"},
     {"tipo": "bota", "z_top": "knee", "cell": "bota"},
     {"tipo": "bolsa", "side": -1, "strap_from": 1, "cell": "couro", "size": [0.16, 0.07, 0.13]},
     {"tipo": "luva", "cell": "luva"}] + hp,
    {"casaco": cloth("2e2626", "la", folds=0.3), "manga": cloth("2e2626", "la", folds=0.25, emboss=["8a2a2a", 0.25, 0.85, 0.2, "cruz"]),
     "aba": cloth("2e2626", "la", folds=0.6, grime=0.8, grime_col="d8dce4"), "capa": cloth("3a3030", "la", folds=0.2),
     "cachecol": cloth("5a1e28", "la", folds=0.5, stripes=["3a1018", 0.2, 4]), "bota": cloth("2a1e16", "couro", folds=0.1, grime=0.8, grime_col="e0e4ec", seams=False),
     "couro": cloth("4a3020", "couro", folds=0, grime=0.3, seams=False, emboss=["c8b890", 0.5, 0.55, 0.45, "cruz"]), "luva": GLOVE} | hc)

hp, hc = hair("b8a888", "curto", volume=0.012, hl_front=68)
E["npc_06_novico"] = R("NPC_06", "Noviço do Coro", {"macro": macro(0.6, 0.3, 0.38, 0.4, 0.4, 0.5), "pele": "young_caucasian_male", "sobrancelha": "eyebrow001"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.014, "collar": 0.025, "cell": "veste"},
     {"tipo": "manga", "off": 0.026, "cuff": 0.06, "cell": "sobrepeliz"},
     {"tipo": "saia", "z_top": "waist", "z_hem": 0.08, "off": 0.02, "flare": 0.08, "cell": "veste_saia"},
     {"tipo": "saia", "z_top": "chest-0.05", "z_hem": "knee-0.08", "off": 0.035, "flare": 0.14, "cell": "sobrepeliz2", "name": "sobrepeliz"},
     {"tipo": "capa", "z_bot": "chest", "off": 0.04, "flare": 0.05, "cell": "sobrepeliz"},
     {"tipo": "bota", "z_top": "knee-0.12", "cell": "bota"},
     {"tipo": "livro", "side": "L", "size": [0.13, 0.03, 0.18]}] + hp,
    {"veste": cloth("1e1a20", "la", folds=0.2), "veste_saia": cloth("1e1a20", "la", folds=0.5, grime=0.4),
     "sobrepeliz": cloth("c0b49a", "linho", folds=0.4, trim="8a6a3a", trim_w=0.07, motif_kind="arco"),
     "sobrepeliz2": cloth("c0b49a", "linho", folds=0.6, grime=0.3, trim="8a6a3a", trim_w=0.08, motif_kind="arco"), "bota": BOOT} | hc,
    sobrancelha_cor="8a7a5a")

hp, hc = hair("5a3a28", "longo", volume=0.012, length=0.38, locks=2)
E["npc_07_herbalista"] = R("NPC_07", "Herbalista dos Cogumelos", {"macro": macro(0.0, 0.45, 0.52, 0.45, 0.5, 0.6), "pele": "young_caucasian_female"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.014, "collar": 0.02, "cell": "corpete"},
     {"tipo": "manga", "off": 0.02, "cuff": 0.05, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": 0.06, "off": 0.024, "flare": 0.18, "ragged": 0.03, "cell": "saia"},
     {"tipo": "capa", "z_bot": "waist", "off": 0.035, "flare": 0.12, "ragged": 0.04, "cell": "capa"},
     {"tipo": "chapeu", "brim": 0.2, "crown_h": 0.11, "tip_bend": 0.0, "droop": 0.06},
     {"tipo": "cogumelos", "where": "chapeu", "n": 6},
     {"tipo": "bolsa", "side": 1, "strap_from": -1, "cell": "couro", "size": [0.16, 0.07, 0.13]},
     {"tipo": "bolsinha", "a": -1.3, "z": "hip"},
     {"tipo": "bota", "z_top": "knee-0.1", "cell": "bota"}] + hp,
    {"corpete": cloth("2a2230", "la", folds=0.2), "manga": cloth("2a2230", "la", folds=0.3, trim="4a3a5a", trim_w=0.1),
     "saia": cloth("2a2436", "la", folds=0.7, grime=0.6, trim="6a5a8a", trim_w=0.07, motif_kind="fungo"), "capa": cloth("3a3044", "la", folds=0.4, trim="6a5a8a", trim_w=0.06, motif_kind="fungo"),
     "chapeu": cloth("2e2838", "la", folds=0.2, grime=0.3), "couro": LEATHER, "bota": BOOT} | hc)

E["npc_08_cartografo"] = R("NPC_08", "Cartógrafo Ferroviário", {"macro": macro(1.0, 0.88, 0.5, 0.5, 0.45, 0.4), "pele": "old_caucasian_male", "sobrancelha": "eyebrow002"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.018, "collar": 0.03, "cell": "casaco"},
     {"tipo": "manga", "off": 0.022, "cuff": 0.03, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.2", "off": 0.028, "flare": 0.1, "open_front": 0.35, "cell": "aba", "follow": 0.9},
     {"tipo": "calca", "off": 0.014, "z_bot": "knee-0.1", "cell": "calca"},
     {"tipo": "bota", "z_top": "knee-0.04", "cell": "bota"},
     {"tipo": "cinto", "z": "waist", "off": 0.036, "cell": "couro"},
     {"tipo": "cachecol", "thick": 0.034, "tail": 0.16, "side": 1, "cell": "cachecol"},
     {"tipo": "mochila", "rolls": 3}, {"tipo": "oculos"}, {"tipo": "oculos_testa"},
     {"tipo": "lampiao", "side": "L", "scale": 0.85},
     {"tipo": "barba", "full": True, "off": 0.012, "cell": "barba"},
     {"tipo": "cabelo", "style": "bagunca", "volume": 0.014, "cell": "cabelo", "hl_front": 64}],
    {"casaco": cloth("3a3026", "la", folds=0.3), "manga": cloth("3a3026", "la", folds=0.25), "aba": cloth("3a3026", "la", folds=0.6, grime=0.7, trim="8a6a3a", trim_w=0.05, motif_kind="arco"),
     "calca": cloth("2a2420", "la", folds=0.3, grime=0.5), "bota": BOOT, "couro": LEATHER, "cachecol": cloth("5a1a24", "la"),
     "barba": {"pintura": "barba", "col": "c8c0b4"}, "cabelo": {"pintura": "cabelo", "col": "b8b0a4"}, "metal": METAL, "brilho": GLOW}, lampiao_braco=True, sobrancelha_cor="a8a094")

hp, hc = hair("2a1d16", "bagunca", volume=0.016, hl_front=66)
E["npc_09_orfao"] = R("NPC_09", "Órfão da Torre dos Sinos", {"macro": macro(0.7, 0.19, 0.3, 0.38, 0.4, 0.5), "pele": "young_caucasian_male", "sobrancelha": "eyebrow002"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.026, "collar": 0.05, "cell": "sobretudo"},
     {"tipo": "manga", "off": 0.032, "cuff": 0.04, "t1": 1.0, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.22", "off": 0.034, "flare": 0.14, "open_front": 0.3, "cell": "aba", "follow": 0.9},
     {"tipo": "capa", "z_bot": "chest-0.02", "off": 0.045, "flare": 0.05, "cell": "aba"},
     {"tipo": "calca", "off": 0.012, "z_bot": "knee-0.1", "cell": "calca"},
     {"tipo": "bota", "z_top": "knee-0.08", "cell": "bota"},
     {"tipo": "cachecol", "thick": 0.034, "tail": 0.2, "side": -1, "cell": "cachecol"},
     {"tipo": "bolsa", "side": 1, "strap_from": -1, "cell": "couro"}, {"tipo": "sino", "a": 1.1}] + hp,
    {"sobretudo": cloth("2e2a2a", "la", folds=0.35, patches=2), "manga": cloth("2e2a2a", "la", folds=0.3, patches=1), "aba": cloth("2e2a2a", "la", folds=0.6, grime=0.7, patches=2),
     "calca": cloth("3a342c", "la", folds=0.3, grime=0.6), "bota": BOOT, "couro": LEATHER, "cachecol": cloth("5e1a26", "la", folds=0.4),
     "metal": {"pintura": "metal", "col": "b08a40", "rust": 0.2}} | hc)

E["npc_10_professor"] = R("NPC_10", "Professor Aposentado", {"macro": macro(1.0, 0.95, 0.55, 0.55, 0.4, 0.4), "pele": "old_caucasian_male", "sobrancelha": "eyebrow002"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.016, "collar": 0.02, "cell": "colete"},
     {"tipo": "manga", "off": 0.022, "cuff": 0.02, "cell": "manga"},
     {"tipo": "saia", "z_top": "chest", "z_hem": "knee-0.3", "off": 0.034, "flare": 0.14, "open_front": 0.38, "open_from": 1.0, "cell": "toga", "follow": 0.85},
     {"tipo": "calca", "off": 0.014, "z_bot": 0.1, "cell": "calca"},
     {"tipo": "bota", "z_top": "knee-0.3", "cell": "bota"},
     {"tipo": "oculos"}, {"tipo": "haste", "side": "R", "kind": "bengala", "head": "bengala"},
     {"tipo": "livro", "side": "L", "size": [0.15, 0.04, 0.21]},
     {"tipo": "barba", "full": True, "off": 0.01, "cell": "barba"},
     {"tipo": "cabelo", "style": "bagunca", "volume": 0.016, "cell": "cabelo", "hl_front": 60}],
    {"colete": cloth("3a2a22", "brocado", folds=0.2), "manga": cloth("2e2420", "la", folds=0.3, trim="6e5a3a", trim_w=0.08),
     "toga": cloth("2e2420", "la", folds=0.6, grime=0.4, trim="8a6a3a", trim_w=0.06, motif_kind="losango"), "calca": cloth("2a2420", "la", folds=0.3),
     "bota": BOOT, "barba": {"pintura": "barba", "col": "a8a098"}, "cabelo": {"pintura": "cabelo", "col": "9a948c"}, "metal": METAL,
     "madeira": {"pintura": "madeira", "col": "2a1e14"}}, sobrancelha_cor="8a847c")

hp, hc = hair("1a1412", "bagunca", volume=0.014, hl_front=64)
E["npc_11_detetive"] = R("NPC_11", "Detetive Mascarado", {"macro": macro(0.5, 0.4, 0.58, 0.42, 0.5, 0.55), "pele": "young_caucasian_female", "sobrancelha": "eyebrow003"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.016, "collar": 0.07, "cell": "sobretudo"},
     {"tipo": "manga", "off": 0.02, "cuff": 0.02, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.32", "off": 0.026, "flare": 0.12, "open_front": 0.36, "cell": "aba", "follow": 0.9},
     {"tipo": "capa", "z_bot": "chest", "off": 0.035, "flare": 0.05, "cell": "aba"},
     {"tipo": "calca", "off": 0.012, "z_bot": "knee-0.1", "cell": "calca"},
     {"tipo": "bota", "z_top": "knee+0.02", "cell": "bota"},
     {"tipo": "cachecol", "thick": 0.03, "tail": 0.26, "side": 1, "cell": "cachecol"},
     {"tipo": "luva", "cell": "luva"}, {"tipo": "mascara", "half": "domino", "off": 0.009, "cell": "mascara"},
     {"tipo": "livro", "side": "L", "size": [0.1, 0.02, 0.14]}, {"tipo": "bolsa", "side": 1, "strap_from": -1, "cell": "couro"}] + hp,
    {"sobretudo": cloth("26222a", "la", folds=0.3), "manga": cloth("26222a", "la", folds=0.25), "aba": cloth("26222a", "la", folds=0.6, grime=0.5, trim="6e5a3a", trim_w=0.05, motif_kind="cruz"),
     "calca": cloth("1e1a20", "la", folds=0.3), "bota": BOOT, "cachecol": cloth("5e1a26", "la", folds=0.4), "luva": GLOVE, "couro": LEATHER,
     "mascara": cloth("ece2c8", "linho", folds=0, grime=0.05, seams=False, trim="a07a38", trim_w=0.12, stripes=["b08a40", 0.06, 5])} | hc, sobrancelha_cor="1a1412")

hp, hc = hair("8a6a48", "trancas", volume=0.01, length=0.34, locks=2)
E["npc_12_acolita"] = R("NPC_12", "Acólita da Catedral", {"macro": macro(0.0, 0.32, 0.56, 0.42, 0.45, 0.6), "pele": "young_caucasian_female"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.014, "collar": 0.045, "cell": "veste"},
     {"tipo": "manga", "off": 0.028, "cuff": 0.07, "cell": "manga"},
     {"tipo": "saia", "id": "saia", "z_top": "waist", "z_hem": 0.05, "off": 0.024, "flare": 0.16, "cell": "alva"},
     {"tipo": "avental", "ref": "saia", "z_top": "waist", "z_hem": 0.2, "width": 0.32, "cell": "estola"},
     {"tipo": "capa", "z_bot": "chest-0.05", "off": 0.035, "flare": 0.07, "cell": "murca"},
     {"tipo": "cinto", "z": "waist", "off": 0.032, "cell": "couro"},
     {"tipo": "bota", "z_top": "knee-0.15", "cell": "bota"},
     {"tipo": "incensario", "side": "L"}] + hp,
    {"veste": cloth("4a1c2a", "brocado", folds=0.2), "manga": cloth("c0b49a", "linho", folds=0.4, trim="8a6a3a", trim_w=0.08),
     "alva": cloth("c0b49a", "linho", folds=0.7, grime=0.4, trim="8a6a3a", trim_w=0.07, motif_kind="arco"),
     "estola": cloth("5a1a2a", "veludo", folds=0.1, trim="a08040", trim_w=0.06, emboss=["a08040", 0.5, 0.5, 0.3, "cruz"]),
     "murca": cloth("5a1a2a", "veludo", folds=0.2, trim="a08040", trim_w=0.08, motif_kind="arco"), "couro": LEATHER, "bota": BOOT,
     "metal": {"pintura": "metal", "col": "a07a40", "rust": 0.2}} | hc)

# ------------------------------------------------------------------ mobs humanoides (MOB_02 é criatura.py)
hp, hc = hair("1a1412", "bagunca", volume=0.016, hl_front=62, seed=3)
E["mob_01_erudito"] = R("MOB_01", "Erudito Oco", {"macro": macro(1.0, 0.3, 0.68, 0.2, 0.3, 0.3), "pele": "young_caucasian_male", "sobrancelha": "eyebrow002"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.016, "collar": 0.02, "cell": "colete"},
     {"tipo": "manga", "off": 0.018, "t1": 0.9, "cuff": 0.03, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.12", "off": 0.026, "flare": 0.1, "open_front": 0.4, "ragged": 0.06, "back_slit": 0.2, "cell": "aba", "follow": 0.9},
     {"tipo": "calca", "off": 0.012, "z_bot": "knee-0.12", "cell": "calca"},
     {"tipo": "bota", "z_top": "knee-0.08", "cell": "bota"},
     {"tipo": "cachecol", "thick": 0.02, "tail": 0.3, "side": 1, "cell": "cachecol"},
     {"tipo": "bolsa", "side": -1, "strap_from": 1, "cell": "couro", "size": [0.12, 0.04, 0.1]}] + hp,
    {"colete": cloth("2e2a2c", "la", folds=0.3, patches=3), "manga": cloth("3a3438", "la", folds=0.3, grime=0.5, patches=2),
     "aba": cloth("3a3438", "la", folds=0.6, grime=0.9, patches=3, trim="1a1618", trim_w=0.1), "calca": cloth("2a2628", "la", folds=0.3, grime=0.7, patches=2),
     "bota": BOOT, "cachecol": cloth("4a1a22", "la", folds=0.3, grime=0.6), "couro": LEATHER} | hc,
    clipes=MOB_CLIPS, pele_tinta="a8aab0", pele_sat=0.35, olheiras=0.7, postura={"Spine": 10, "Spine1": 12, "Neck": 8}, sem_nivelar=True, sobrancelha_cor="1a1412")

E["mob_03_errante"] = R("MOB_03", "Errante do Gelo", {"macro": macro(1.0, 0.6, 0.68, 0.85, 0.75, 0.35), "pele": "old_caucasian_male", "sobrancelha": "eyebrow002"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.04, "collar": 0.05, "cell": "casacao"},
     {"tipo": "manga", "off": 0.045, "cuff": 0.05, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.2", "off": 0.05, "flare": 0.14, "ragged": 0.05, "cell": "aba", "follow": 0.9},
     {"tipo": "calca", "off": 0.02, "z_bot": "knee-0.1", "cell": "calca"},
     {"tipo": "bota", "z_top": "knee-0.02", "cell": "bota", "off": 0.024},
     {"tipo": "cachecol", "thick": 0.06, "tail": 0.25, "side": 1, "cell": "cachecol"},
     {"tipo": "cinto", "z": "waist", "off": 0.06, "cell": "couro"},
     {"tipo": "cristais", "n": 14}, {"tipo": "luva", "cell": "luva", "off": 0.01},
     {"tipo": "barba", "full": True, "off": 0.012, "cell": "barba"},
     {"tipo": "cabelo", "style": "bagunca", "volume": 0.02, "cell": "cabelo", "hl_front": 60}],
    {"casacao": cloth("4a4448", "la", folds=0.4, grime=0.9, grime_col="dfe6ee", patches=2), "manga": cloth("4a4448", "la", folds=0.4, grime=0.9, grime_col="dfe6ee"),
     "aba": cloth("3e383c", "la", folds=0.7, grime=1.0, grime_col="e6ecf2", patches=2), "calca": cloth("2e2a2c", "la", grime=0.9, grime_col="dfe6ee"),
     "bota": cloth("2a221c", "couro", grime=1.0, grime_col="e6ecf2", seams=False), "cachecol": cloth("4a1a22", "la", folds=0.4, grime=0.7, grime_col="dfe6ee"),
     "couro": LEATHER, "luva": cloth("3a3434", "la", grime=0.8, grime_col="dfe6ee"),
     "barba": {"pintura": "barba", "col": "c8ccd4"}, "cabelo": {"pintura": "cabelo", "col": "b8bcc4"}},
    clipes=MOB_CLIPS, pele_tinta="b8c0cc", pele_sat=0.3, olheiras=0.5, postura={"Spine": 6, "Spine1": 8}, sem_nivelar=True, sobrancelha_cor="a8acb4")

E["mob_04_suplicante"] = R("MOB_04", "Suplicante Encapuzado", {"macro": macro(0.8, 0.45, 0.55, 0.45, 0.5, 0.5), "pele": "young_caucasian_male"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.016, "collar": 0.02, "cell": "manto"},
     {"tipo": "manga", "off": 0.03, "cuff": 0.06, "cell": "manto_m"},
     {"tipo": "saia", "id": "saia", "z_top": "waist", "z_hem": 0.04, "off": 0.026, "flare": 0.16, "cell": "batina"},
     {"tipo": "avental", "ref": "saia", "z_top": "waist", "z_hem": 0.15, "width": 0.4, "cell": "faixa"},
     {"tipo": "capa", "z_bot": "elbow", "off": 0.035, "flare": 0.08, "ragged": 0.03, "cell": "manto"},
     {"tipo": "capuz", "off": 0.045, "peak": 0.08, "cell": "capuz"},
     {"tipo": "mascara", "half": "toda", "off": 0.004, "cell": "vazio"},
     {"tipo": "cinto", "z": "waist", "off": 0.034, "cell": "corda"},
     {"tipo": "lamina", "side": "R", "kind": "punhal"}, {"tipo": "luva", "cell": "luva"}],
    {"manto": cloth("1e1a1e", "la", folds=0.3, trim="5a1a24", trim_w=0.06), "manto_m": cloth("1e1a1e", "la", folds=0.3, trim="5a1a24", trim_w=0.08),
     "batina": cloth("2a1a20", "la", folds=0.7, grime=0.5, trim="5a1a24", trim_w=0.05), "faixa": cloth("4a1a24", "veludo", folds=0.1, trim="8a6a3a", trim_w=0.05, emboss=["8a6a3a", 0.5, 0.6, 0.3, "cruz"]),
     "capuz": cloth("1e1a1e", "la", folds=0.2, trim="5a1a24", trim_w=0.08), "corda": cloth("6a5a44", "linho", folds=0), "luva": GLOVE, "metal": {"pintura": "metal", "col": "9a9aa0", "rust": 0.2}},
    clipes=MOB_CLIPS, postura={"Spine1": 5, "Neck": 6}, sem_nivelar=True)

# ------------------------------------------------------------------ mini-chefes
E["mini_01_carrasco"] = R("MINI_01", "Carrasco da Torre dos Sinos", {"macro": macro(1.0, 0.5, 1.0, 0.8, 1.0, 0.3), "pele": "middleage_caucasian_male"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.03, "collar": 0.02, "cell": "gibao"},
     {"tipo": "manga", "off": 0.035, "cuff": 0.04, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.25", "off": 0.04, "flare": 0.16, "ragged": 0.08, "cell": "aba", "follow": 0.9},
     {"tipo": "capa", "z_bot": "chest-0.08", "off": 0.06, "flare": 0.12, "ragged": 0.05, "cell": "ombreira"},
     {"tipo": "calca", "off": 0.02, "z_bot": "knee-0.1", "cell": "calca"},
     {"tipo": "bota", "z_top": "knee", "cell": "bota", "off": 0.024},
     {"tipo": "cinto", "z": "waist", "off": 0.05, "cell": "couro"},
     {"tipo": "correntes", "n": 5}, {"tipo": "elmo_sino"}, {"tipo": "martelo", "side": "R"}, {"tipo": "luva", "cell": "luva", "off": 0.01}],
    {"gibao": cloth("3a1820", "la", folds=0.3, grime=0.6, patches=2), "manga": cloth("2a2224", "la", folds=0.3, grime=0.5),
     "aba": cloth("4a1a22", "la", folds=0.7, grime=0.9, patches=3, trim="2a1418", trim_w=0.08), "ombreira": cloth("3a3234", "couro", folds=0.1, grime=0.5, trim="8a6a3a", trim_w=0.08, motif_kind="cruz"),
     "calca": cloth("221e20", "la", grime=0.6), "bota": BOOT, "couro": LEATHER, "luva": GLOVE, "metal": METAL,
     "bronze": {"pintura": "metal", "col": "8a6a38", "rust": 0.45}, "madeira": {"pintura": "madeira", "col": "3a2a1c"}},
    clipes=MOB_CLIPS, postura={"Spine1": 6}, sem_nivelar=True)

hp, hc = hair("a8a49c", "longo", volume=0.014, length=0.3, locks=2)
E["mini_02_duelista"] = R("MINI_02", "Duelista das Cinzas", {"macro": macro(1.0, 0.4, 0.85, 0.3, 0.55, 0.6), "pele": "young_caucasian_male", "sobrancelha": "eyebrow002"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.014, "collar": 0.08, "cell": "gibao"},
     {"tipo": "manga", "off": 0.018, "cuff": 0.05, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.08", "off": 0.024, "flare": 0.12, "open_front": 0.45, "cell": "aba", "follow": 0.9},
     {"tipo": "saia", "z_top": "neck-0.03", "z_hem": "knee-0.35", "off": 0.05, "flare": 0.3, "front_only": [1.9, 4.38], "ragged": 0.05, "cell": "capa", "name": "capa_longa"},
     {"tipo": "calca", "off": 0.01, "z_bot": "knee-0.1", "cell": "calca"},
     {"tipo": "bota", "z_top": "knee+0.06", "cell": "bota"},
     {"tipo": "cinto", "z": "waist", "off": 0.03, "cell": "couro"},
     {"tipo": "lamina", "side": "R", "kind": "florete", "length": 1.0}, {"tipo": "luva", "cell": "luva"}] + hp,
    {"gibao": cloth("2a2026", "brocado", folds=0.2, trim="8a6a3a", trim_w=0.06), "manga": cloth("2a2026", "brocado", folds=0.3, trim="d8ccb4", trim_w=0.12),
     "aba": cloth("2a2026", "la", folds=0.6, grime=0.4, trim="8a6a3a", trim_w=0.05, motif_kind="losango"), "capa": cloth("3a1826", "veludo", folds=0.6, grime=0.4, trim="6a1a2c", trim_w=0.06),
     "calca": cloth("1e1a1e", "la"), "bota": BOOT, "couro": LEATHER, "luva": GLOVE, "metal": {"pintura": "metal", "col": "b0aaa0", "rust": 0.1}} | hc,
    clipes=MOB_CLIPS, pele_tinta="d8d4d4", pele_sat=0.45, olheiras=0.4, sobrancelha_cor="8a867e")

E["mini_03_carcereiro"] = R("MINI_03", "Carcereiro dos Trilhos", {"macro": macro(1.0, 0.55, 0.95, 0.95, 1.0, 0.25), "pele": "middleage_caucasian_male"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.045, "collar": 0.03, "cell": "couraca"},
     {"tipo": "manga", "off": 0.045, "cuff": 0.04, "cell": "manga"},
     {"tipo": "saia", "z_top": "waist", "z_hem": "knee-0.12", "off": 0.05, "flare": 0.14, "ragged": 0.08, "cell": "aba", "follow": 0.9},
     {"tipo": "capa", "z_bot": "chest-0.04", "off": 0.07, "flare": 0.1, "cell": "ombreira"},
     {"tipo": "calca", "off": 0.024, "z_bot": "knee-0.1", "cell": "calca"},
     {"tipo": "bota", "z_top": "knee+0.02", "cell": "bota", "off": 0.03},
     {"tipo": "cinto", "z": "waist", "off": 0.06, "cell": "couro"},
     {"tipo": "mochila", "rolls": 0}, {"tipo": "elmo_grade"}, {"tipo": "cogumelos", "where": "ombros", "n": 9, "size": 0.05},
     {"tipo": "gancho", "side": "R"}, {"tipo": "lampiao", "side": "L", "scale": 1.5}, {"tipo": "luva", "cell": "luva", "off": 0.012}],
    {"couraca": cloth("3a3430", "couro", folds=0.1, grime=0.7, patches=3, trim="5a4a3a", trim_w=0.05), "manga": cloth("2e2a28", "la", grime=0.7),
     "aba": cloth("3a2024", "la", folds=0.6, grime=0.9, patches=3), "ombreira": cloth("4a4440", "couro", folds=0, grime=0.6, trim="8a6a3a", trim_w=0.06),
     "calca": cloth("2a2624", "la", grime=0.8), "bota": BOOT, "couro": LEATHER, "luva": GLOVE, "metal": {"pintura": "metal", "col": "6a645c", "rust": 0.6},
     "brilho": {"pintura": "brilho", "col": "b080ff"}, "madeira": {"pintura": "madeira", "col": "3a2a1c"}},
    clipes=MOB_CLIPS, postura={"Spine": 6, "Spine1": 8}, sem_nivelar=True, lampiao_braco=True)

hp, hc = hair("c8c4bc", "longo", volume=0.012, length=0.5, locks=2)
E["mini_04_matriarca"] = R("MINI_04", "Matriarca do Coro Velado", {"macro": macro(0.0, 0.6, 0.9, 0.35, 0.4, 0.6), "pele": "old_caucasian_female"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.016, "collar": 0.06, "cell": "veste"},
     {"tipo": "manga", "off": 0.035, "cuff": 0.1, "cell": "veu_m"},
     {"tipo": "saia", "z_top": "waist", "z_hem": -0.05, "off": 0.03, "flare": 0.28, "ragged": 0.08, "cell": "veu"},
     {"tipo": "capa", "z_bot": "waist-0.1", "off": 0.05, "flare": 0.2, "ragged": 0.06, "cell": "veu"},
     {"tipo": "capuz", "off": 0.03, "opening": 1.1, "peak": 0.02, "cell": "veu_c"},
     {"tipo": "aureola"}, {"tipo": "incensario", "side": "L"}, {"tipo": "incensario", "side": "R", "name": "incensario2"}] + hp,
    {"veste": cloth("4a1c2a", "brocado", folds=0.2, trim="a08040", trim_w=0.06), "veu_m": cloth("8a8478", "linho", folds=0.5, grime=0.3),
     "veu": cloth("8a8478", "linho", folds=0.7, grime=0.5, trim="a08040", trim_w=0.04, motif_kind="arco"), "veu_c": cloth("8a8478", "linho", folds=0.3),
     "bronze": {"pintura": "metal", "col": "a88a48", "rust": 0.2}, "metal": {"pintura": "metal", "col": "a07a40", "rust": 0.2}} | hc,
    clipes=MOB_CLIPS, pele_tinta="dcdce4", pele_sat=0.35, olheiras=0.5)

hp, hc = hair("d0ccc0", "longo", volume=0.014, length=0.55, locks=2)
E["boss_01_grande_interprete"] = R("BOSS_01", "O Grande Intérprete", {"macro": macro(1.0, 0.75, 1.0, 0.4, 0.5, 0.5), "pele": "old_caucasian_male", "sobrancelha": "eyebrow002"},
    [{"tipo": "tronco", "z_bot": "hip", "z_top": "neck", "off": 0.02, "collar": 0.08, "cell": "veste"},
     {"tipo": "manga", "off": 0.04, "cuff": 0.12, "cell": "manga"},
     {"tipo": "saia", "id": "saia", "z_top": "waist", "z_hem": 0.0, "off": 0.03, "flare": 0.3, "ragged": 0.06, "cell": "manto"},
     {"tipo": "avental", "ref": "saia", "z_top": "waist", "z_hem": 0.08, "width": 0.36, "cell": "estola"},
     {"tipo": "saia", "z_top": "neck-0.02", "z_hem": 0.02, "off": 0.07, "flare": 0.35, "front_only": [1.4, 4.88], "ragged": 0.1, "cell": "capa", "name": "manto_externo"},
     {"tipo": "capa", "z_bot": "chest-0.1", "off": 0.06, "flare": 0.12, "ragged": 0.04, "cell": "murca"},
     {"tipo": "coroa", "spires": 9, "h": 0.32}, {"tipo": "haste", "side": "R", "length": 2.3, "head": "anel"},
     {"tipo": "livro", "side": "L", "size": [0.3, 0.07, 0.4]}] + hp,
    {"veste": cloth("2a1e26", "brocado", folds=0.2, trim="a08040", trim_w=0.05), "manga": cloth("2a1e26", "brocado", folds=0.5, trim="a08040", trim_w=0.08, motif_kind="arco"),
     "manto": cloth("221a22", "veludo", folds=0.7, grime=0.5, trim="a08040", trim_w=0.05, motif_kind="arco"),
     "estola": cloth("5a1a2a", "veludo", folds=0.1, trim="a08040", trim_w=0.06, emboss=["a08040", 0.5, 0.6, 0.25, "cruz"]),
     "capa": cloth("2e2028", "veludo", folds=0.7, grime=0.4, trim="6a1a2c", trim_w=0.06, motif_kind="arco"),
     "murca": cloth("3a1a28", "brocado", folds=0.2, trim="a08040", trim_w=0.1, motif_kind="cruz"), "bronze": {"pintura": "metal", "col": "a88a48", "rust": 0.25},
     "metal": {"pintura": "metal", "col": "b0904a", "rust": 0.2}, "livro": {"pintura": "tecido", "col": "3a1a20", "kind": "couro", "folds": 0, "trim": "b0904a", "trim_w": 0.12}} | hc,
    clipes=MOB_CLIPS, pele_tinta="dcd8dc", pele_sat=0.4, sobrancelha_cor="b0aca4")

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'elenco.json')
    json.dump({'elenco': E}, open(out, 'w'), ensure_ascii=False, indent=1)
    print(len(E), 'receitas em', out)
