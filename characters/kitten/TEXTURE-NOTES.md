# Ginger coat material

The current model uses an **original, locally authored procedural material**,
baked to 2048 × 2048 PNG base-colour and tangent-space normal maps. Both maps are
packed into the Blender file and embedded in the GLB. The separate PNGs live in
`textures/` for texture painting and further editing.

The coat combines a darker ginger base, low-contrast directional grain, soft
normal detail and restrained tabby variation. Cream markings and pink ear
interiors are masked out of the fur grain. It has no hair particles or geometric
displacement, so the established smooth silhouette is retained.

`coat_material.py` authors the fine grain and bakes it; `create_kitten.py` defines
the ginger palette, cream markings and larger tabby variation. Rebuilding the
model regenerates both maps. `--no-texture` skips the bake for geometry reviews.

## Texture search, 18 October 2026

Two suitable reusable sources were identified:

- [TextureCan: Fur Texture of Animals, Fabrics 0037](https://www.texturecan.com/details/266/):
  fine animal-fur grain that could be recoloured and softened for a ginger coat.
- [TextureCan: Stylized Fur and Hair, Fabric 0034](https://www.texturecan.com/details/219/):
  a more pronounced stylised fur pattern.

[TextureCan's terms](https://www.texturecan.com/terms/) state CC0 1.0 and permit
redistribution with 3D assets. The workspace download request for Fabrics 0037
returned HTTP 403 under the enforced network policy. No external texture was
downloaded or incorporated. The supplied material is independently authored;
the links above record the search results, not the provenance of the baked maps.
