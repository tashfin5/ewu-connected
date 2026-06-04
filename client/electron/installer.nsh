!include "WinMessages.nsh"

Function un.changeButtonText
  GetDlgItem $0 $HWNDPARENT 1
  SendMessage $0 ${WM_SETTEXT} 0 "STR:Uninstall"
FunctionEnd

!macro customUnWelcomePage
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW un.changeButtonText
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

!macro customUnConfirmPage
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW un.changeButtonText
  !insertmacro MUI_UNPAGE_CONFIRM
!macroend
