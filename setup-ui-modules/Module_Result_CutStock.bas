Option Explicit

Sub Action_CheckPrize()
    Dim wb As Workbook: Set wb = ThisWorkbook
    Dim wsRes As Worksheet: Set wsRes = wb.Sheets("Result")
    Dim wsRaw As Worksheet: Set wsRaw = wb.Sheets("Rawdata")
    Dim tblWin As ListObject: Set tblWin = wsRes.ListObjects("tbl_WinningList")
    Dim WinTop As String, WinBtm As String

    On Error Resume Next
    WinTop = wsRes.ListObjects("tbl_ResultInput").DataBodyRange(1, 2).Value
    WinBtm = wsRes.ListObjects("tbl_ResultInput").DataBodyRange(1, 3).Value
    On Error GoTo 0

    If WinTop = "" And WinBtm = "" Then MsgBox "Enter winning numbers first!", vbExclamation: Exit Sub
    If Not tblWin.DataBodyRange Is Nothing Then tblWin.DataBodyRange.Delete

    Application.ScreenUpdating = False
    Dim vRaw, i As Long, N As String, Typ As String, Amt As Currency, Rate As Double, newRow As ListRow, IsWin As Boolean

    If wsRaw.ListObjects("tbl_Rawdata").ListRows.Count > 0 Then
        vRaw = wsRaw.ListObjects("tbl_Rawdata").DataBodyRange.Value
        For i = 1 To UBound(vRaw, 1)
            If LCase(Trim(CStr(vRaw(i, 8)))) = "active" Then
                N = CStr(vRaw(i, 3)): Typ = CStr(vRaw(i, 4)): Amt = vRaw(i, 5): Rate = vRaw(i, 6)
                IsWin = False
                If InStr(Typ, "Top") > 0 And N = WinTop Then IsWin = True
                If InStr(Typ, "Bottom") > 0 And N = WinBtm Then IsWin = True

                If IsWin Then
                    Set newRow = tblWin.ListRows.Add
                    newRow.Range(1).Value = vRaw(i, 1)
                    newRow.Range(2).Value = vRaw(i, 2)
                    newRow.Range(3).Value = "'" & N
                    newRow.Range(4).Value = Typ
                    newRow.Range(5).Value = Amt
                    newRow.Range(6).Value = Rate
                    newRow.Range(7).Value = Amt * Rate
                    newRow.Range(8).Value = "WIN"
                End If
            End If
        Next i
    End If
    Application.ScreenUpdating = True
    AddAuditEntry "PROCESS", "Action_CheckPrize", "Checked prize for Top=" & WinTop & " Bottom=" & WinBtm
    MsgBox "Check Complete!", vbInformation
End Sub

Action_CalculateManual and Action_ClearManual are unchanged except for audit entries (assume kept in module)
