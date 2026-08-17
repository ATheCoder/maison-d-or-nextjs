-- The five JS-object themes (lightAiry, coastalBlue, sageEarth, blushGold,
-- nightMode) were retired in favor of the seven primitives-based themes
-- (parchment, sage, rose, lavender, periwinkle, dark, navy). Old keys fail the
-- new isThemeKey whitelist and would silently fall back to parchment anyway;
-- clearing them makes every profile an honest "not chosen yet" so children
-- re-pick from the new set.
UPDATE "child_profile" SET "theme_preference" = NULL;
