!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Uninstall ${PRODUCT_NAME}"
  !define MUI_WELCOMEPAGE_TEXT "Click Uninstall to continue with the uninstallation of ${PRODUCT_NAME}."
  !define MUI_BTN_TEXT_NEXT "Uninstall"
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

!macro customUnConfirmPage
  !define MUI_BTN_TEXT_NEXT "Uninstall"
  !insertmacro MUI_UNPAGE_CONFIRM
!macroend
