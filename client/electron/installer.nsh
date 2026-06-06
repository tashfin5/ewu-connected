!macro customInit
  nsExec::ExecToStack 'taskkill /F /IM "EWU ConnectED.exe" /T'
  nsExec::ExecToStack 'taskkill /F /IM "EWU.ConnectED.exe" /T'
  nsExec::ExecToStack 'taskkill /F /IM "client.exe" /T'
  nsExec::ExecToStack 'taskkill /F /IM "ewu-connected.exe" /T'
  Sleep 2500
!macroend

!macro customUnInit
  MessageBox MB_YESNO "Are you sure you want to completely remove EWU ConnectED and all of its components?" /SD IDYES IDYES +2
  Abort
!macroend
