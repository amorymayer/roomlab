# Design references
The interface takes an editorial direction: warm paper around a charcoal model stage, with the room as the focus. Keep fit feedback visible in the scene and the furniture list.

- [Interaction and motion reference](https://www.instagram.com/p/DfphRvFBx54/): stage attention, give controls adequate hit areas, and keep frequent actions quick.
- [Removing generic AI styling](https://www.instagram.com/p/DfUe1XXx6Jw/): use the visual vocabulary of an interior studio.
- [Status animation](https://www.instagram.com/p/DflFgmBjib8/): a future suggestion tool could signal whether it is working or needs input, with a readable text label.
- [Annnimate showcase](https://www.instagram.com/p/Dfrmh7UoG8k/) and [Glisse preview](https://www.instagram.com/p/DfS2zN8oPg-/): optional presentation inspiration. RoomLab does not incorporate these components.

## The listening loft

The starter scene draws on a private reference collection reviewed in Safari. Recurring elements were large black steel windows, chrome and smoked finishes, walnut and low seating, shelves of records and books, clustered framed art, and warm lamps after dark. Treat those as a material and lighting brief. Furniture meshes, skyline, artwork and room geometry are original code; no images from the private collection are included.

Use a charcoal viewport with warm ivory controls. Keep amber lighting distinct from fit warnings. The daylight switch changes the scene lighting; the floor plan stays legible under either setting.

## Reference pass

The saved interiors mix industrial structure with warmer objects. The steel window mullions and tubular sling chair establish the structure; the ribbed paper pendant, rounded modular sofa and record console soften it. The dark model stage takes the visual weight. The surrounding app reads like an interiors catalogue: quiet rows, one paper tone, compact type and no decorative icon grid.

Two design guides were reviewed from [Charles Skills](https://github.com/LemonFace0309/charles-skills/tree/7fbeb7e5e62b7e091142c828c0df15fdac21afc9): `charles-unslop` and `charles-ux-animation`. Their original folders are available locally under `.agents/skills/` and ignored by Git. Apply their useful principles here: remove competing chrome; preserve direct dragging; identify pending, successful and failed network states in words; give controls generous targets; keep the occasional disclosure brief and respect reduced motion. The clear feedback from the animated status reference was more useful here than adding an orb. The animation library examples remain references. See the Liquid Glass pass below for the Glisse integration.

## Liquid Glass pass

The [Glisse demo reel](https://www.instagram.com/p/DfS2zN8oPg-/) is now a direct implementation reference. RoomLab uses the actual MIT-licensed [Glisse](https://github.com/0kzh/glisse) segmented control and glass buttons over its 3D view. The glass is confined to overlays, uses a warm finish and retains contrasting labels. Safari uses the library's frosted treatment and lit rims over the live WebGL canvas. The room and layout editor remain the focus.

## Design desk and object edit

The app now follows a showroom sequence: compose the room, choose a material story, inspect at eye level, and add or finish individual pieces. Glass controls share a centered track across the stage. The quieter, warm design desk uses palette samples and two views for room-level versus object-level decisions. The catalogue draws the exact in-room objects at a consistent product-shot angle; its images are generated locally and don't depend on a retail feed.

## Small space design studies

The project now asks a concrete design question: how should a compact room be arranged for a particular kind of use? Brief captures the intent and constraints; Studio supports exploration at eye level and editing against the plan; Review records the decision and its trade-offs. The visual centre is a living blueprint, not an image of an ideal room: the displayed footprints and circulation overlay come from the same layout data as the 3D scene.

## Motion

The [dot matrix reference](https://www.instagram.com/p/DflFgmBjib8/) informed the layout search indicator. RoomLab uses a small cube at rest, rotating rings during the search, a check for results, and a warning mark when the brief needs attention. The status text and artwork follow actual search state. Page, room view, materials, and inspector changes use short transitions. Reduced motion presents the same controls and feedback without interpolation.
