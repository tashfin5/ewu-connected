!macro preInit
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "EWU ConnectED.exe" /T'
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "EWU.ConnectED.exe" /T'
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "client.exe" /T'
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "ewu-connected.exe" /T'
  Sleep 2000
!macroend

!macro customUnInit
  MessageBox MB_YESNO "Are you sure you want to completely remove EWU ConnectED and all of its components?" /SD IDYES IDYES +2
  Abort
!macroend
