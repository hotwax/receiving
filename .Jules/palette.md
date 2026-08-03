## 2024-04-26 - [Use `translate` for `aria-label`s on icon-only buttons]
**Learning:** Icon-only buttons need an `aria-label` for screen readers to convey their purpose. When the app is localized, the `aria-label` should also be localized using the app's standard `translate` helper.
**Action:** Always add an `:aria-label="translate('...description...')"` to icon-only buttons (`<ion-button>` containing only an `<ion-icon>`) to improve accessibility.
