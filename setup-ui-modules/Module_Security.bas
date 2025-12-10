Option Explicit

' No hard-coded password. Admin password and protection password are obfuscated and stored in Settings sheet (VeryHidden).
' NOTE: For production, use OS credential manager. This obfuscation is only to avoid plaintext in module.

Private Const OBSF_KEY As Integer = 123 ' simple XOR key for obfuscation (not real encryption)

Private Sub EnsureSettingsSheetExists()
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("Settings")
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(Before:=ThisWorkbook.Worksheets(1))
        ws.Name = "Settings"
        ws.Visible = xlSheetVeryHidden
    Else
        ws.Visible = xlSheetVeryHidden
    End If
End Sub

Private Function ObfuscateText(ByVal s As String) As String
    Dim i As Long, outS As String
    For i = 1 To Len(s)
        outS = outS & Chr$(Asc(Mid$(s, i, 1)) Xor OBSF_KEY)
    Next i
    ObfuscateText = outS
End Function

Public Sub SetAdminPassword()
    Dim pwd As String
    pwd = InputBox("Set Admin password (will be obfuscated inside workbook):", "Set Admin Password")
    If pwd = "" Then MsgBox "No password set.", vbInformation: Exit Sub
    EnsureSettingsSheetExists
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Settings")
    ws.Range("Z1").Value = ObfuscateText(pwd)
    ws.Visible = xlSheetVeryHidden
    AddAuditEntry "SECURITY", "SetAdminPassword", "Admin password set/updated"
    MsgBox "Admin password saved (obfuscated).", vbInformation
End Sub

Public Function PromptAdminPassword() As Boolean
    Dim inputPwd As String
    inputPwd = InputBox("Enter admin password:", "Admin Authentication")
    If inputPwd = "" Then PromptAdminPassword = False: Exit Function
    EnsureSettingsSheetExists
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Settings")
    Dim stored As String
    stored = ""
    On Error Resume Next
    stored = ws.Range("Z1").Value
    On Error GoTo 0
    If stored = "" Then MsgBox "No admin password configured. Run SetAdminPassword first.", vbExclamation: PromptAdminPassword = False: Exit Function
    If ObfuscateText(inputPwd) = stored Then
        AddAuditEntry "SECURITY", "Unlock", "Admin authenticated"
        PromptAdminPassword = True
    Else
        MsgBox "Wrong password.", vbExclamation
        PromptAdminPassword = False
    End If
End Function

Public Sub SetProtectionPassword()
    Dim pwd As String
    pwd = InputBox("Set workbook protection password (used by ProtectAllSheets):", "Set Protection Password")
    If pwd = "" Then MsgBox "No protection password set.", vbInformation: Exit Sub
    EnsureSettingsSheetExists
    ThisWorkbook.Worksheets("Settings").Range("Z2").Value = ObfuscateText(pwd)
    ThisWorkbook.Worksheets("Settings").Visible = xlSheetVeryHidden
    AddAuditEntry "SECURITY", "SetProtectPwd", "Protection password set"
    MsgBox "Protection password saved (obfuscated).", vbInformation
End Sub

Private Function GetProtectionPassword() As String
    On Error Resume Next
    EnsureSettingsSheetExists
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Settings")
    Dim s As String: s = ws.Range("Z2").Value
    If s = "" Then GetProtectionPassword = "" Else GetProtectionPassword = ObfuscateText(s) ' obfuscation reversible (same function)
End Function

Public Sub ProtectAllSheets()
    Dim pwd As String
    pwd = GetProtectionPassword
    If pwd = "" Then
        If MsgBox("No protection password set. Set it now?", vbYesNo + vbQuestion) = vbYes Then
            Call SetProtectionPassword
            pwd = GetProtectionPassword
            If pwd = "" Then Exit Sub
        Else
            Exit Sub
        End If
    End If
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        On Error Resume Next
        ws.Protect Password:=pwd, UserInterfaceOnly:=True, AllowFiltering:=True
        ws.EnableSelection = xlNoRestrictions
        On Error GoTo 0
    Next ws
    AddAuditEntry "SYSTEM", "ProtectAllSheets", "Applied UserInterfaceOnly protection"
End Sub

Public Sub UnprotectAllSheets()
    Dim ok As Boolean
    ok = PromptAdminPassword()
    If Not ok Then Exit Sub
    Dim pwd As String: pwd = GetProtectionPassword()
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        On Error Resume Next
        ws.Unprotect Password:=pwd
        On Error GoTo 0
    Next ws
    AddAuditEntry "SYSTEM", "UnprotectAllSheets", "Unprotected all sheets"
    MsgBox "All sheets unprotected.", vbInformation
End Sub
