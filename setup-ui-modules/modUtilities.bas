Option Explicit

' Utility functions: Normalize number, Aggregate totals, Audit log helper, basic error wrapper

Public Sub EnsureAuditLogExists()
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("AuditLog")
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = "AuditLog"
        ws.Range("A1:D1").Value = Array("Timestamp", "User", "Action", "Details")
        ws.Columns("A:D").ColumnWidth = 20
        ws.Visible = xlSheetVeryHidden
    End If
End Sub

Public Sub AddAuditEntry(ActionType As String, ActionSub As String, Details As String)
    On Error Resume Next
    EnsureAuditLogExists
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("AuditLog")
    Dim lRow As Long: lRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row + 1
    ws.Cells(lRow, "A").Value = Now
    ws.Cells(lRow, "B").Value = Environ("USERNAME")
    ws.Cells(lRow, "C").Value = ActionType & " - " & ActionSub
    ws.Cells(lRow, "D").Value = Details
End Sub

Public Function NormalizeNumRaw(s As String, Optional totalDigits As Long = 2) As String
    Dim i As Long, ch As String, outS As String, t As String
    t = Trim(s)
    For i = 1 To Len(t)
        ch = Mid$(t, i, 1)
        If ch Like "[0-9]" Then outS = outS & ch
    Next i
    If outS = "" Then NormalizeNumRaw = "" Else NormalizeNumRaw = Right$(String(totalDigits, "0") & outS, totalDigits)
End Function

Public Function AggregateTotalsFromTable(ws As Worksheet, tableName As String, numColIndex As Long, amountColIndex As Long, Optional statusColIndex As Long = 0) As Object
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    On Error GoTo Done
    Dim lo As ListObject
    Set lo = ws.ListObjects(tableName)
    If lo.ListRows.Count = 0 Then GoTo Done
    Dim v As Variant: v = lo.DataBodyRange.Value
    Dim i As Long, k As String, amt As Double
    For i = 1 To UBound(v, 1)
        If statusColIndex > 0 Then
            If LCase(Trim(CStr(v(i, statusColIndex)))) <> "active" Then GoTo NextRow
        End If
        k = CStr(v(i, numColIndex))
        amt = Val(v(i, amountColIndex))
        If dict.Exists(k) Then dict(k) = dict(k) + amt Else dict.Add k, amt
NextRow:
    Next i
Done:
    Set AggregateTotalsFromTable = dict
End Function
