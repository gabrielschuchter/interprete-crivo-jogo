import bpy, sys, json, os, math
cfg = json.loads(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
import addon_utils
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.assetservice import AssetService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.exportservice import ExportService
from bl_ext.user_default.mpfb.services.objectservice import ObjectService
macro = TargetService.get_default_macro_info_dict()
for k, v in cfg.get('macro', {}).items(): macro[k] = v
basemesh = HumanService.create_human(macro_detail_dict=macro)
for t, w in cfg.get('targets', {}).items():
    TargetService.load_target(basemesh, os.path.join('/home/user/makehumancommunity/mpfb2/src/mpfb/data/targets', t + '.target.gz'), weight=w)
skin = AssetService.find_asset_absolute_path(cfg['skin'] + '.mhmat', asset_subdir='skins')
print('SKIN', skin)
HumanService.set_character_skin(skin, basemesh, skin_type='GAMEENGINE')
rig = HumanService.add_builtin_rig(basemesh, 'cmu_mb')
for sub, name, atype in cfg['assets']:
    p = AssetService.find_asset_absolute_path(name + '.mhclo', asset_subdir=sub)
    if not p: print('MISSING', sub, name); continue
    HumanService.add_mhclo_asset(p, basemesh, asset_type=atype, material_type='GAMEENGINE', subdiv_levels=0)
    print('ADDED', name)
bpy.ops.wm.save_as_mainfile(filepath=cfg['blend'])
print('RIG', rig.name, len(rig.data.bones), 'objs', [o.name for o in bpy.data.objects])
