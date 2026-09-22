# Vibrant color-only UI enhancement

## Scope
- Preserve the current layout, spacing, content, navigation, interactions, data, and responsive behavior exactly.
- Keep all four existing themes functional and retain the premium dark Neon Academic appearance.

## Changes
- Expand the existing semantic palette with blue, cyan, violet, magenta, teal, green, orange, and gold accent roles.
- Apply subtle theme-aware gradients, tinted borders, and restrained glows to existing cards, controls, icons, and progress indicators.
- Give dashboard statistics, study sections, feature links, and subject cards distinct color identities without changing their size or placement.
- Improve sidebar/header accent variety through CSS-only styling while preserving every control and state.
- Maintain readable text contrast and avoid overly bright or playful effects.

## Technical details
- Update color tokens and scoped theme selectors in `src/styles.css`.
- Adjust only color-related classes and accent mappings in the existing dashboard/sidebar/shell files; no markup hierarchy, data logic, routes, or behavior changes.
- Verify the build and inspect the dashboard at the current mobile viewport and desktop viewport for contrast, overflow, and unchanged structure.
