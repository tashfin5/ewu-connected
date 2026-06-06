!macro customInit
  ; Force close app first to prevent "is running" errors during uninstallation
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "EWU ConnectED.exe" /T'
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "EWU.ConnectED.exe" /T'
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "client.exe" /T'
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "ewu-connected.exe" /T'
  Sleep 2000

  ; explicitly run uninstaller if previous version installed
  ReadRegStr $R0 HKCU "${UNINSTALL_REGISTRY_KEY}" "QuietUninstallString"
  StrCmp $R0 "" check_hklm
  ExecWait "$R0 _?=$INSTDIR"
  Goto end_uninst

check_hklm:
  ReadRegStr $R0 HKLM "${UNINSTALL_REGISTRY_KEY}" "QuietUninstallString"
  StrCmp $R0 "" end_uninst
  ExecWait "$R0 _?=$INSTDIR"

end_uninst:
!macroend

!macro customCheckAppRunning
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "EWU ConnectED.exe" /T'
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "EWU.ConnectED.exe" /T'
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "client.exe" /T'
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "ewu-connected.exe" /T'
  Sleep 2000
!macroend

!macro customUnInit
  ; Uncomment the following line if you want to silently remove all components without asking
  ; MessageBox MB_YESNO "Are you sure you want to completely remove EWU ConnectED and all of its components?" /SD IDYES IDYES +2
  ; Abort
!macroend

