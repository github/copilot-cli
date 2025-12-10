Option Explicit

Private Sub Workbook_Open()
    On Error Resume Next
    ' Apply protection (if protection password exists)
    Call ProtectAllSheets
    AddAuditEntry "SYSTEM", "Workbook_Open", "Workbook opened"
End Sub
