import type { BuiltRegion, RegionCtx, RegionId } from './region';
import { buildAtrio } from './atrio';
import { buildBosque } from './bosque';
import { buildArquivo } from './arquivo';
import { buildObservatorio } from './observatorio';
import { applyPs2Skin } from './ps2skin';

export function buildRegion(id: RegionId, ctx: RegionCtx): BuiltRegion {
  const r = build(id, ctx);
  if (ctx.ps2 !== false) applyPs2Skin(id, r.root);
  return r;
}

function build(id: RegionId, ctx: RegionCtx): BuiltRegion {
  switch (id) {
    case 'bosque':
      return buildBosque(ctx);
    case 'arquivo':
      return buildArquivo(ctx);
    case 'observatorio':
      return buildObservatorio(ctx);
    default:
      return buildAtrio(ctx);
  }
}
