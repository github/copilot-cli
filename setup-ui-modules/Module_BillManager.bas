Option Explicit

' PROJECT: LOTTO SYSTEM PRO (BILL MANAGER EDITION)
' FEATURES: DROPDOWN BILL LIST | SEARCH & EDIT | DELETE ROW | SMART UPDATE
' (Updated: added audit, performance improvements and input normalization)

Sub Setup_RunSystem()
    Call Setup_DatabaseStructure
    Call Setup_BuildDashboard_BillMgr
    Call UpdateBillDropDown
    AddAuditEntry "SYSTEM", "Setup_RunSystem", "System setup completed"
    MsgBox "SYSTEM READY: Bill Manager Mode Activated!", vbInformation
End Sub

Sub AddToMonitor(Num As String, Top As Currency, Bottom As Currency, Optional BillID As String = "")
    Dim ws As Worksheet, tbl As ListObject, newRow As ListRow
    Set ws = ThisWorkbook.Sheets("Main"): Set tbl = ws.ListObjects("tbl_Monitor")
    If Len(Num) <> 2 Then Exit Sub

    Set newRow = tbl.ListRows.Add
    With newRow
        .Range(1).Value = BillID
        .Range(2).Value = "'" & Num
        .Range(3).Value = Top: .Range(4).Value = Bottom
        .Range(5).Value = GetRate(Num, "2Top"): .Range(6).Value = GetRate(Num, "2Bottom")
        .Range(7).Value = GetLimit(Num, "2Top"): .Range(8).Value = GetLimit(Num, "2Bottom")
    End With

    AddAuditEntry "DATA", "AddToMonitor", "Added monitor row Num=" & Num & " Top=" & Top & " Bottom=" & Bottom & " BillID=" & BillID
End Sub

Function GetRate(Num As String, gType As String) As Double
    Dim wsSet As Worksheet, tbl As ListObject, f As Range
    On Error GoTo Fallback
    Set wsSet = ThisWorkbook.Sheets("Settings"): Set tbl = wsSet.ListObjects("tbl_Rate")
    If Not tbl.DataBodyRange Is Nothing Then
        Set f = tbl.ListColumns("Number").DataBodyRange.Find(Num, LookAt:=xlWhole)
        If Not f Is Nothing Then
            If InStr(gType, "Top") > 0 Then GetRate = wsSet.Cells(f.Row, tbl.ListColumns("Top_Rate").Range.Column).Value
            If InStr(gType, "Bottom") > 0 Then GetRate = wsSet.Cells(f.Row, tbl.ListColumns("Bottom_Rate").Range.Column).Value
            Exit Function
        End If
    End If
Fallback:
    On Error Resume Next
    If InStr(gType, "Top") > 0 Then GetRate = wsSet.Range("B2").Value
    If InStr(gType, "Bottom") > 0 Then GetRate = wsSet.Range("B3").Value
    On Error GoTo 0
End Function

Function GetLimit(Num As String, gType As String) As Currency
    Dim wsSet As Worksheet, tbl As ListObject, f As Range
    On Error GoTo Fallback
    Set wsSet = ThisWorkbook.Sheets("Settings"): Set tbl = wsSet.ListObjects("tbl_Limit")
    If Not tbl.DataBodyRange Is Nothing Then
        Set f = tbl.ListColumns("Number").DataBodyRange.Find(Num, LookAt:=xlWhole)
        If Not f Is Nothing Then
            If InStr(gType, "Top") > 0 Then GetLimit = wsSet.Cells(f.Row, tbl.ListColumns("Top_Limit").Range.Column).Value
            If InStr(gType, "Bottom") > 0 Then GetLimit = wsSet.Cells(f.Row, tbl.ListColumns("Bottom_Limit").Range.Column).Value
            Exit Function
        End If
    End If
Fallback:
    On Error Resume Next
    If InStr(gType, "Top") > 0 Then GetLimit = wsSet.Range("C2").Value
    If InStr(gType, "Bottom") > 0 Then GetLimit = wsSet.Range("C3").Value
    On Error GoTo 0
End Function

Function CheckLimitExceeded(Num As String, NewAmount As Currency, Limit As Currency, gType As String, ByRef DetailMsg As String, Optional EditBillID As String = "") As Boolean
    Dim wsDB As Worksheet, tblDB As ListObject
    Set wsDB = ThisWorkbook.Sheets("Database"): Set tblDB = wsDB.ListObjects("tbl_Database")

    Dim CurrentTotal As Currency, ExcludeAmount As Currency
    CurrentTotal = 0: ExcludeAmount = 0

    If Not tblDB.DataBodyRange Is Nothing Then
        Dim RngNum As Range, RngStat As Range, RngID As Range, RngSum As Range
        Set RngNum = tblDB.ListColumns("Number").DataBodyRange
        Set RngStat = tblDB.ListColumns("Status").DataBodyRange
        Set RngID = tblDB.ListColumns("BillID").DataBodyRange

        If InStr(gType, "Top") > 0 Then Set RngSum = tblDB.ListColumns("Top").DataBodyRange Else Set RngSum = tblDB.ListColumns("Bottom").DataBodyRange

        CurrentTotal = Application.WorksheetFunction.SumIfs(RngSum, RngNum, Num, RngStat, "Active")

        If EditBillID <> "" Then
            ExcludeAmount = Application.WorksheetFunction.SumIfs(RngSum, RngNum, Num, RngStat, "Active", RngID, EditBillID)
            CurrentTotal = CurrentTotal - ExcludeAmount
        End If
    End If

    Dim Available As Currency: Available = Limit - CurrentTotal
    If Available < 0 Then Available = 0

    If (CurrentTotal + NewAmount) > Limit Then
        CheckLimitExceeded = True
        DetailMsg = " Num: " & Num & " [" & gType & "]" & vbNewLine & _
                    "   - Current: " & Format(CurrentTotal, "#,##0") & vbNewLine & _
                    "   - New: " & Format(NewAmount, "#,##0") & vbNewLine & _
                    "   - Total: " & Format(CurrentTotal + NewAmount, "#,##0") & " (Limit: " & Format(Limit, "#,##0") & ")" & vbNewLine & _
                    "    Available: " & Format(Available, "#,##0")
    Else
        CheckLimitExceeded = False
    End If
End Function

Sub Action_AddManual()
    Dim ws As Worksheet, Num As String, Top As Currency, Bot As Currency
    Set ws = ThisWorkbook.Sheets("Main")
    Num = ws.Range("input_Num").Value: Top = Val(ws.Range("input_Top").Value): Bot = Val(ws.Range("input_Bottom").Value)
    If Len(Num) <> 2 Then MsgBox "Error: 2 Digits Only", vbExclamation: Exit Sub
    If Top = 0 And Bot = 0 Then MsgBox "Error: Enter Amount", vbExclamation: Exit Sub

    Dim CurrentBillID As String
    CurrentBillID = ws.Range("D9").Value

    Call AddToMonitor(Num, Top, Bot, CurrentBillID)
    AddAuditEntry "UI", "Action_AddManual", "Manual add Num=" & Num & " Top=" & Top & " Bottom=" & Bot & " BillID=" & CurrentBillID
    ws.Range("input_Num").Value = "": ws.Range("input_Top").Value = "": ws.Range("input_Bottom").Value = "": ws.Range("input_Num").Select
End Sub

Sub Action_SearchBill()
    Dim wsMain As Worksheet, wsDB As Worksheet, tblMon As ListObject, tblDB As ListObject
    Dim SearchID As String, cell As Range, Found As Boolean

    Set wsMain = ThisWorkbook.Sheets("Main"): Set tblMon = wsMain.ListObjects("tbl_Monitor")
    Set wsDB = ThisWorkbook.Sheets("Database"): Set tblDB = wsDB.ListObjects("tbl_Database")

    SearchID = wsMain.Range("D9").Value
    If SearchID = "" Then MsgBox "Please select Bill ID", vbExclamation: Exit Sub

    If Not tblMon.DataBodyRange Is Nothing Then tblMon.DataBodyRange.Delete

    Found = False
    Application.ScreenUpdating = False
    For Each cell In tblDB.ListColumns("BillID").DataBodyRange
        If cell.Value = SearchID And LCase(cell.Offset(0, 10).Value) = "active" Then
            Found = True
            Call AddToMonitor(cell.Offset(0, 2).Value, cell.Offset(0, 3).Value, cell.Offset(0, 4).Value, SearchID)
        End If
    Next cell
    Application.ScreenUpdating = True

    If Found Then
        AddAuditEntry "DATA", "Action_SearchBill", "Loaded bill " & SearchID
        MsgBox " Loaded Bill: " & SearchID, vbInformation
    Else
        MsgBox " Bill ID Not Found or Deleted", vbCritical
    End If
End Sub

Sub Action_DeleteRow()
    Dim tbl As ListObject
    Set tbl = ThisWorkbook.Sheets("Main").ListObjects("tbl_Monitor")

    On Error Resume Next
    If Not Application.Intersect(ActiveCell, tbl.DataBodyRange) Is Nothing Then
        If MsgBox("Delete this row?", vbYesNo) = vbYes Then
            Dim delNum As String: delNum = ActiveCell.EntireRow.Cells(1, 2).Value
            ActiveCell.EntireRow.Delete
            AddAuditEntry "UI", "Action_DeleteRow", "Deleted row Num=" & delNum
        End If
    Else
        MsgBox "Please click on a row in the table to delete.", vbExclamation
    End If
    On Error GoTo 0
End Sub

Sub Action_SaveData()
    Dim wsMain As Worksheet, wsDB As Worksheet, wsRaw As Worksheet
    Dim tblMon As ListObject, tblDB As ListObject, tblRaw As ListObject
    Dim r As ListRow, newDB As ListRow, newRaw As ListRow
    Dim BillID As String, IsLimitExceeded As Boolean, RowErrorMsg As String, OverLimitMsg As String
    Dim IsUpdateMode As Boolean

    Set wsMain = ThisWorkbook.Sheets("Main"): Set tblMon = wsMain.ListObjects("tbl_Monitor")
    Set wsDB = ThisWorkbook.Sheets("Database"): Set tblDB = wsDB.ListObjects("tbl_Database")
    Set wsRaw = ThisWorkbook.Sheets("Rawdata"): Set tblRaw = wsRaw.ListObjects("tbl_Rawdata")

    If tblMon.ListRows.Count = 0 Then Exit Sub

    If wsMain.Range("D9").Value <> "" Then
        IsUpdateMode = True
        BillID = wsMain.Range("D9").Value
    Else
        IsUpdateMode = False
        BillID = "BILL-" & Format(Now, "YYMMDD-HHMMSS")
    End If

    ' 1. Check Limits
    IsLimitExceeded = False
    For Each r In tblMon.ListRows
        If r.Range(3).Value > 0 Then
            If CheckLimitExceeded(r.Range(2).Value, r.Range(3).Value, r.Range(7).Value, "2Top", RowErrorMsg, BillID) Then
                IsLimitExceeded = True: OverLimitMsg = OverLimitMsg & RowErrorMsg & vbNewLine & "----------------" & vbNewLine
            End If
        End If
        If r.Range(4).Value > 0 Then
            If CheckLimitExceeded(r.Range(2).Value, r.Range(4).Value, r.Range(8).Value, "2Bottom", RowErrorMsg, BillID) Then
                IsLimitExceeded = True: OverLimitMsg = OverLimitMsg & RowErrorMsg & vbNewLine & "----------------" & vbNewLine
            End If
        End If
    Next r

    If IsLimitExceeded Then
        MsgBox " SAVE FAILED: Limit Exceeded!" & vbNewLine & vbNewLine & OverLimitMsg, vbCritical
        AddAuditEntry "DATA", "SaveFailed", "Limit exceeded on save for BillID=" & BillID
        Exit Sub
    End If

    Application.ScreenUpdating = False

    ' Delete Old Data if update
    If IsUpdateMode Then
        Dim i As Long
        For i = tblDB.ListRows.Count To 1 Step -1
            If tblDB.DataBodyRange(i, 1).Value = BillID Then tblDB.ListRows(i).Delete
        Next i
        For i = tblRaw.ListRows.Count To 1 Step -1
            If tblRaw.DataBodyRange(i, 1).Value = BillID Then tblRaw.ListRows(i).Delete
        Next i
    End If

    ' Save New Data
    For Each r In tblMon.ListRows
        If r.Range(3).Value > 0 Then
            Set newRaw = tblRaw.ListRows.Add: newRaw.Range(1) = BillID: newRaw.Range(2) = Now: newRaw.Range(3) = "'" & r.Range(2)
            newRaw.Range(4) = "2Top": newRaw.Range(5) = r.Range(3): newRaw.Range(6) = r.Range(5): newRaw.Range(7) = r.Range(3) * r.Range(5): newRaw.Range(8) = "Active"
        End If
        If r.Range(4).Value > 0 Then
            Set newRaw = tblRaw.ListRows.Add: newRaw.Range(1) = BillID: newRaw.Range(2) = Now: newRaw.Range(3) = "'" & r.Range(2)
            newRaw.Range(4) = "2Bottom": newRaw.Range(5) = r.Range(4): newRaw.Range(6) = r.Range(6): newRaw.Range(7) = r.Range(4) * r.Range(6): newRaw.Range(8) = "Active"
        End If
        Set newDB = tblDB.ListRows.Add: newDB.Range(1) = BillID: newDB.Range(2) = Now: newDB.Range(3) = "'" & r.Range(2)
        newDB.Range(4) = r.Range(3): newDB.Range(5) = r.Range(4): newDB.Range(6) = r.Range(3) + r.Range(4)
        newDB.Range(7) = r.Range(5): newDB.Range(8) = r.Range(6): newDB.Range(9) = r.Range(7): newDB.Range(10) = r.Range(8): newDB.Range(11) = "Active"
    Next r

    ' Cleanup
    tblMon.DataBodyRange.Delete
    wsMain.Range("D9").Value = ""
    Call UpdateBillDropDown
    Application.ScreenUpdating = True

    AddAuditEntry "DATA", "SaveBill", "BillID=" & BillID
    If IsUpdateMode Then
        MsgBox " UPDATE SUCCESS: " & BillID, vbInformation
    Else
        MsgBox " NEW BILL SAVED: " & BillID, vbInformation
    End If
End Sub

Sub Action_ClearTable()
    Dim tbl As ListObject: Set tbl = ThisWorkbook.Sheets("Main").ListObjects("tbl_Monitor")
    If Not tbl.DataBodyRange Is Nothing Then If MsgBox("Clear Table?", vbYesNo) = vbYes Then tbl.DataBodyRange.Delete
    ThisWorkbook.Sheets("Main").Range("D9").Value = ""
    AddAuditEntry "DATA", "ClearTable", "Monitor cleared"
End Sub

Sub ShowSmartParserForm()
    ufSmartPaste.Show
End Sub
