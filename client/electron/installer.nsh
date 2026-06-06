!macro customInit
  nsExec::ExecToStack 'taskkill /F /T /IM "EWU ConnectED.exe"'
!macroend

!macro customUnInit
  MessageBox MB_YESNO "Are you sure you want to completely remove EWU ConnectED and all of its components?" /SD IDYES IDYES +2
  Abort
!macroend
