# Web UI/UX Slice 2 Accessibility And Overlay Verification

Date: 2026-07-23  
Status: implemented and locally verified  
Parent plan: `docs/WEB_UIUX_SCORE_IMPROVEMENT_EXECUTION_PLAN_2026_07_23.md`

## Delivered Scope

- Core theme contrast rules now cover body text, muted text, primary action white text, gradient secondary white text, and danger text.
- The default palette and all nine built-in palettes pass the five WCAG AA checks at 4.5:1 or better.
- Theme Lab keeps unrestricted live preview, but an invalid palette is not persisted, cannot be saved as a custom preset, and is reverted on close.
- Theme Lab and Interaction Setup now use the shared Headless UI `AppDialog` behavior for focus trapping, Escape, labelled close control, focus restoration, and background inertness.
- Functional emoji in Interaction Setup were replaced with Lucide icons. User-authored interaction emoji remain content and are hidden from the accessibility tree where decorative.
- Reviewed controls use a minimum 44px touch target.

## Browser Evidence

Verified against the local production build at `http://localhost:3001/demo`:

| Check | Result |
| --- | --- |
| 390x844 Theme Lab | one dialog; no horizontal overflow |
| 320x700 Theme Lab | no horizontal overflow; no dialog button below 44px |
| 1440x900 Theme Lab | 1152x810 focused panel; one opaque overlay |
| 1440 desktop at 200% equivalent (720 CSS px) | no clipped input or button; no horizontal overflow |
| Keyboard Escape | dialog closes and focus returns to `開啟主題實驗室` |
| Close button | labelled control closes and restores trigger focus |
| Invalid primary color preview | 1.00:1 is reported; save is disabled; close restores `96 123 130` |

## Automated Verification

Passed:

```powershell
npx.cmd tsx tests\theme-lab.test.ts
npx.cmd tsx tests\ui-primitives.test.ts
npx.cmd tsx tests\web-accessibility-overlay.test.ts
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit --project tsconfig.mobile.json
git diff --check
```

The full `npm.cmd test` run reached one pre-existing failure in `tests/sales-photo-evidence-owner-album.test.ts`: its read-only shell guard rejects the existing `navigator` reference in the owner album shell. Slice 2 does not change that component or sales-photo behavior.

## Intentionally Unchanged

- Capacitor and native plugin configuration
- Camera, photo upload, expiration, and deletion behavior
- Supabase schema, RLS, role capabilities, and sync routing
- Stored interaction button shape and existing user-authored emoji data
- Desktop authenticated shell, which remains Slice 3
