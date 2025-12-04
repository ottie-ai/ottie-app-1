# Language Guidelines

## Critical Rule: English Only

**This application is English-only.** All user-facing text, error messages, UI labels, and code comments must be in English.

## Rules

### ✅ Always Use English For:

- **UI Text**: All buttons, labels, messages, dialogs, tooltips
- **Error Messages**: All error messages and warnings
- **User Notifications**: All alerts, toasts, and notifications
- **Code Comments**: All code comments and documentation
- **API Responses**: All user-facing API error messages
- **Form Labels**: All form field labels and placeholders
- **Dialog Titles**: All dialog and modal titles
- **Button Text**: All button labels

### ❌ Never Use:

- Slovak, Czech, or any other non-English language in UI
- Mixed languages (e.g., "Potvrdiť downgrade")
- Non-English text in user-facing components
- Non-English error messages

## Examples

### ✅ Correct (English):
```tsx
<Button>Confirm Downgrade</Button>
<AlertDialogTitle>Confirm Downgrade</AlertDialogTitle>
<p>Other users (3) will lose access to the workspace.</p>
<p>All sites above the plan limit (5) will be unpublished.</p>
```

### ❌ Incorrect (Slovak):
```tsx
<Button>Potvrdiť downgrade</Button>
<AlertDialogTitle>Potvrdenie downgrade</AlertDialogTitle>
<p>Ostatní používatelia (3) stratia prístup k workspace.</p>
<p>Všetky sites nad limit plánu (5) budú unpublished.</p>
```

## Why This Matters

1. **Consistency**: Ensures consistent user experience
2. **Maintainability**: Easier for international developers
3. **Professionalism**: Professional English-only application
4. **Scalability**: Easier to add i18n later if needed

## Code Review Checklist

When reviewing code, check:
- [ ] All UI text is in English
- [ ] All error messages are in English
- [ ] All comments are in English
- [ ] No mixed languages (e.g., Slovak + English)
- [ ] All user-facing strings are in English

## Enforcement

This is a **hard requirement**. Code with non-English user-facing text will be rejected in code reviews.

