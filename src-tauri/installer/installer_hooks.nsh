; ─────────────────────────────────────────────────────────────────────────────
; Astra/log  |  Custom NSIS Installer Hooks
; Overrides default MUI2 string definitions with branded content.
; ─────────────────────────────────────────────────────────────────────────────

; ── Welcome page ─────────────────────────────────────────────────────────────
LangString MUI_TEXT_WELCOME_INFO_TITLE ${LANG_ENGLISH} \
  "Welcome to Astra/log"

LangString MUI_TEXT_WELCOME_INFO_TEXT ${LANG_ENGLISH} \
  "Astra/log is a zero-persistence workspace for rapid web-app exploration \
and AI-assisted architectural planning.$\r$\n$\r$\n\
Every session starts clean and ends with no trace. Your AI keys stay on \
your device \u2014 nothing is ever sent to our servers.$\r$\n$\r$\n\
Click $\"Next$\" to review the Terms of Service and License Agreement."

; ── License page ─────────────────────────────────────────────────────────────
LangString MUI_TEXT_LICENSE_SUBTITLE ${LANG_ENGLISH} \
  "Please review the Terms of Service and Source-Available License (SAL v1.3)."

; ── Install directory page ───────────────────────────────────────────────────
LangString MUI_TEXT_DIRECTORY_TITLE ${LANG_ENGLISH} \
  "Choose Install Location"

LangString MUI_TEXT_DIRECTORY_SUBTITLE ${LANG_ENGLISH} \
  "Choose the folder where Astra/log will be installed."

; ── Install progress page ────────────────────────────────────────────────────
LangString MUI_TEXT_INSTALLING_TITLE ${LANG_ENGLISH} \
  "Installing Astra/log"

LangString MUI_TEXT_INSTALLING_SUBTITLE ${LANG_ENGLISH} \
  "Setting up your transient workspace\u2026"

; ── Finish page ───────────────────────────────────────────────────────────────
LangString MUI_TEXT_FINISH_INFO_TITLE ${LANG_ENGLISH} \
  "Astra/log is Ready"

LangString MUI_TEXT_FINISH_INFO_TEXT ${LANG_ENGLISH} \
  "Installation complete.$\r$\n$\r$\n\
Launch Astra/log, upload a ZIP of your project, and let the AI help you \
explore, plan, and understand \u2014 all without leaving your machine.$\r$\n$\r$\n\
Click $\"Finish$\" to close the installer."

; ── Uninstall pages ───────────────────────────────────────────────────────────
LangString MUI_UNTEXT_WELCOME_INFO_TITLE ${LANG_ENGLISH} \
  "Uninstall Astra/log"

LangString MUI_UNTEXT_WELCOME_INFO_TEXT ${LANG_ENGLISH} \
  "This will remove Astra/log from your computer.$\r$\n$\r$\n\
Since Astra/log never stores sessions, workspace data, or AI keys on disk, \
there is nothing extra to clean up. Click $\"Next$\" to uninstall."

LangString MUI_UNTEXT_FINISH_INFO_TITLE ${LANG_ENGLISH} \
  "Astra/log Uninstalled"

LangString MUI_UNTEXT_FINISH_INFO_TEXT ${LANG_ENGLISH} \
  "Astra/log has been removed.$\r$\n$\r$\n\
Your exported artifacts and any locally stored AI keys were not affected. \
Click $\"Finish$\" to close."
