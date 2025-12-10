Attribute VB_Name = "ufSmartPaste"
Option Explicit

' --- Control variables (existing controls are created dynamically in initialize) ---
Dim WithEvents btnParse As MSForms.CommandButton
Dim WithEvents btnSearch As MSForms.CommandButton
Dim WithEvents btnUpdate As MSForms.CommandButton
Dim WithEvents btnDelete As MSForms.CommandButton
Dim WithEvents btnSave As MSForms.CommandButton
Dim WithEvents btnClear As MSForms.CommandButton
Dim WithEvents lstMonitor As MSForms.ListBox

Dim txtRaw As MSForms.TextBox
Dim cbSearch As MSForms.ComboBox
Dim txtEditNum As MSForms.TextBox, txtEditTop As MSForms.TextBox, txtEditBtm As MSForms.TextBox
Dim lblTitle As MSForms.Label, frLeft As MSForms.Label, frRight As MSForms.Label

' Color constants
Const CLR_BG_MAIN = &H202020
Const CLR_BG_PANEL = &H303030
Const CLR_TEXT_MAIN = &HFFFFFF
Const CLR_TEXT_SUB = &HB0B0B0
Const CLR_ACCENT = &H80FF&

Private Sub UserForm_Initialize()
    Me.Caption = "LOTTO MANAGEMENT SUITE (PRO)"
    Me.Width = 1000
    Me.Height = 600
    Me.BackColor = CLR_BG_MAIN

    Set lblTitle = Me.Controls.Add("Forms.Label.1", "lblTitle")
    With lblTitle
        .Caption = "  L O T T O   C O M M A N D   C E N T E R"
        .Left = 20: .Top = 15: .Width = 960: .Height = 30
        .Font.Name = "Segoe UI": .Font.Size = 16: .Font.Bold = True
        .ForeColor = CLR_ACCENT: .BackStyle = 0: .TextAlign = 2
    End With

    Set frLeft = Me.Controls.Add("Forms.Label.1", "frLeft")
    With frLeft
        .Left = 20: .Top = 60: .Width = 280: .Height = 480
        .BackColor = CLR_BG_PANEL: .SpecialEffect = 2
    End With

    CreateLabel "lbl1", "  INPUT DATA (Smart Paste)", 30, 70, 260, 20, CLR_TEXT_MAIN, 11

    Set txtRaw = Me.Controls.Add("Forms.TextBox.1", "txtRaw")
    With txtRaw
        .Left = 30: .Top = 100: .Width = 260: .Height = 360
        .Multiline = True: .ScrollBars = 2: .Font.Name = "Consolas": .Font.Size = 10
        .BackColor = &H404040: .ForeColor = CLR_TEXT_MAIN: .BorderStyle = 0
        .Text = "' Paste your data here..." & vbCrLf & "12=100-100"
    End With

    Set btnParse = Me.Controls.Add("Forms.CommandButton.1", "btnParse")
    With btnParse
        .Caption = " PROCESS DATA": .Left = 30: .Top = 480: .Width = 260: .Height = 40
        .BackColor = CLR_ACCENT: .ForeColor = &H0: .Font.Bold = True: .Font.Size = 11
    End With

    Set frRight = Me.Controls.Add("Forms.Label.1", "frRight")
    With frRight
        .Left = 320: .Top = 60: .Width = 640: .Height = 480
        .BackColor = CLR_BG_PANEL: .SpecialEffect = 2
    End With

    CreateLabel "lbl2", "  BILL MANAGER", 340, 75, 150, 20, CLR_ACCENT, 11

    Set cbSearch = Me.Controls.Add("Forms.ComboBox.1", "cbSearch")
    With cbSearch
        .Left = 500: .Top = 75: .Width = 180: .Height = 24
        .Font.Name = "Segoe UI": .Font.Size = 10
        .BackColor = &HFFFFFF: .ForeColor = &H0
    End With

    Set btnSearch = Me.Controls.Add("Forms.CommandButton.1", "btnSearch")
    With btnSearch: .Caption = "LOAD BILL": .Left = 690: .Top = 75: .Width = 100: .Height = 24: .BackColor = &H808080: .ForeColor = &HFFFFFF: End With

    Set lstMonitor = Me.Controls.Add("Forms.ListBox.1", "lstMonitor")
    With lstMonitor
        .Left = 340: .Top = 120: .Width = 600: .Height = 280
        .ColumnCount = 9
        .ColumnWidths = "25;40;60;60;50;50;80;80;60"
        .Font.Name = "Segoe UI": .Font.Size = 9
        .BackColor = &H252525: .ForeColor = CLR_TEXT_MAIN: .BorderStyle = 0
    End With
    CreateListHeader 340, 100

    CreateLabel "lblEdit", " EDIT SELECTED:", 340, 420, 120, 20, CLR_TEXT_SUB, 10

    Set txtEditNum = Me.Controls.Add("Forms.TextBox.1", "txtEditNum")
    With txtEditNum: .Left = 470: .Top = 418: .Width = 50: .TextAlign = 2: .BackColor = &H505050: .ForeColor = vbWhite: End With

    Set txtEditTop = Me.Controls.Add("Forms.TextBox.1", "txtEditTop")
    With txtEditTop: .Left = 530: .Top = 418: .Width = 70: .TextAlign = 3: .BackColor = &H505050: .ForeColor = vbWhite: End With

    Set txtEditBtm = Me.Controls.Add("Forms.TextBox.1", "txtEditBtm")
    With txtEditBtm: .Left = 610: .Top = 418: .Width = 70: .TextAlign = 3: .BackColor = &H505050: .ForeColor = vbWhite: End With

    Set btnUpdate = Me.Controls.Add("Forms.CommandButton.1", "btnUpdate")
    With btnUpdate: .Caption = "UPDATE": .Left = 690: .Top = 416: .Width = 80: .Height = 24: .BackColor = &H808080: .ForeColor = vbWhite: End With

    Set btnDelete = Me.Controls.Add("Forms.CommandButton.1", "btnDelete")
    With btnDelete: .Caption = "DELETE": .Left = 780: .Top = 416: .Width = 80: .Height = 24: .BackColor = &H8080FF: .ForeColor = vbWhite: End With

    Set btnSave = Me.Controls.Add("Forms.CommandButton.1", "btnSave")
    With btnSave
        .Caption = "  SAVE TO DATABASE": .Font.Bold = True
        .Left = 340: .Top = 470: .Width = 290: .Height = 45
        .BackColor = &H80FF80: .ForeColor = &H0: .Font.Size = 12
    End With

    Set btnClear = Me.Controls.Add("Forms.CommandButton.1", "btnClear")
    With btnClear
        .Caption = "  CLEAR ALL": .Font.Bold = True
        .Left = 650: .Top = 470: .Width = 290: .Height = 45
        .BackColor = &H505050: .ForeColor = vbWhite: .Font.Size = 12
    End With

    PopulateBillList
    LoadDataToGrid
End Sub

' UI Helper Functions
Sub CreateLabel(N As String, c As String, l As Single, T As Single, w As Single, h As Single, Clr As Long, sz As Single)
    Dim lb As Object: Set lb = Me.Controls.Add("Forms.Label.1", N)
    With lb: .Caption = c: .Left = l: .Top = T: .Width = w: .Height = h: .BackStyle = 0: .Font.Name = "Segoe UI": .Font.Bold = True: .ForeColor = Clr: .Font.Size = sz: End With
End Sub

Sub CreateListHeader(StartL As Single, StartT As Single)
    Dim arrH, arrW, i, curL
    arrH = Array("#", "NUM", "TOP", "BTM", "R(T)", "R(B)", "CUR/LIM(T)", "CUR/LIM(B)", "STAT")
    arrW = Array(25, 40, 60, 60, 50, 50, 80, 80, 60)
    curL = StartL
    For i = 0 To UBound(arrH)
        CreateLabel "hd" & i, arrH(i), curL, StartT, arrW(i), 15, CLR_ACCENT, 8
        curL = curL + arrW(i)
    Next i
End Sub

' LOGIC: DATA & DISPLAY
Sub LoadDataToGrid()
    Dim tbl As ListObject, i As Long
    Dim Num As String, Top As Double, Btm As Double, TopR As Variant, BtmR As Variant
    Dim TopL As Double, BtmL As Double, CurTop As Double, CurBtm As Double, TopStat As String, BtmStat As String

    Set tbl = ThisWorkbook.Sheets("Main").ListObjects("tbl_Monitor")
    lstMonitor.Clear

    ' Pre-aggregate current totals from Database for performance
    Dim dictTop As Object, dictBtm As Object
    Set dictTop = AggregateTotalsFromTable(ThisWorkbook.Sheets("Database"), "tbl_Database", 3, 4, 11) ' Number=3, Top=4, Status=11
    Set dictBtm = AggregateTotalsFromTable(ThisWorkbook.Sheets("Database"), "tbl_Database", 3, 5, 11) ' Bottom=5

    If tbl.ListRows.Count > 0 Then
        For i = 1 To tbl.ListRows.Count
            Num = Trim(CStr(tbl.DataBodyRange(i, 2).Value))
            Top = Val(tbl.DataBodyRange(i, 3).Value): Btm = Val(tbl.DataBodyRange(i, 4).Value)
            TopR = tbl.DataBodyRange(i, 5).Value: BtmR = tbl.DataBodyRange(i, 6).Value
            TopL = tbl.DataBodyRange(i, 7).Value: BtmL = tbl.DataBodyRange(i, 8).Value

            CurTop = 0: CurBtm = 0
            If dictTop.Exists(Num) Then CurTop = dictTop(Num)
            If dictBtm.Exists(Num) Then CurBtm = dictBtm(Num)

            TopStat = "": BtmStat = ""
            If (CurTop + Top) > TopL Then TopStat = "!"
            If (CurBtm + Btm) > BtmL Then BtmStat = "!"

            lstMonitor.AddItem i
            lstMonitor.List(i - 1, 1) = Num
            lstMonitor.List(i - 1, 2) = Format(Top, "#,##0")
            lstMonitor.List(i - 1, 3) = Format(Btm, "#,##0")
            lstMonitor.List(i - 1, 4) = TopR
            lstMonitor.List(i - 1, 5) = BtmR
            lstMonitor.List(i - 1, 6) = Format(CurTop + Top, "#,##0") & "/" & Format(TopL, "#,##0")
            lstMonitor.List(i - 1, 7) = Format(CurBtm + Btm, "#,##0") & "/" & Format(BtmL, "#,##0")

            If TopStat <> "" Or BtmStat <> "" Then lstMonitor.List(i - 1, 8) = "OVER" Else lstMonitor.List(i - 1, 8) = "OK"
        Next i
    End If
End Sub

Sub PopulateBillList()
    Dim wsDB As Worksheet, i As Long, BillCol As Range, bID As String, dict As Object
    Set wsDB = ThisWorkbook.Sheets("Database"): Set dict = CreateObject("Scripting.Dictionary")
    cbSearch.Clear
    On Error Resume Next
    If wsDB.ListObjects("tbl_Database").ListRows.Count > 0 Then
        Set BillCol = wsDB.ListObjects("tbl_Database").ListColumns("BillID").DataBodyRange
        For i = BillCol.Rows.Count To 1 Step -1
            bID = BillCol.Cells(i, 1).Value
            If bID <> "" And Not dict.Exists(bID) Then dict.Add bID, Nothing: cbSearch.AddItem bID
        Next i
    End If
    On Error GoTo 0
End Sub

' BUTTON EVENTS
Private Sub btnParse_Click()
    Dim txt As String, Lines As Variant, i As Long, N As String, T As Double, B As Double, cnt As Long, BillID As String
    txt = txtRaw.Text: If txt = "" Or Left(txt, 1) = "'" Then Exit Sub
    BillID = ThisWorkbook.Sheets("Main").Range("D9").Value
    txt = Replace(txt, vbCr, vbLf): txt = Replace(txt, vbLf & vbLf, vbLf): Lines = Split(txt, vbLf)
    For i = LBound(Lines) To UBound(Lines)
        If Trim(Lines(i)) <> "" Then
            N = "": T = 0: B = 0
            If ParseTextLine(Lines(i), N, T, B) Then
                Application.Run "AddToMonitor", N, T, B, BillID
                AddAuditEntry "DATA", "ParseLine", "Added to monitor: Num=" & N & " Top=" & T & " Bottom=" & B & " BillID=" & BillID
                cnt = cnt + 1
            End If
        End If
    Next i
    If cnt > 0 Then LoadDataToGrid: txtRaw.Text = "": MsgBox "IMPORTED " & cnt & " ITEMS", vbInformation
End Sub

Private Sub btnSearch_Click()
    If cbSearch.Value = "" Then Exit Sub
    ThisWorkbook.Sheets("Main").Range("D9").Value = cbSearch.Value
    Application.Run "Action_SearchBill"
    LoadDataToGrid
End Sub

Private Sub lstMonitor_Click()
    Dim idx As Long: idx = lstMonitor.ListIndex
    If idx > -1 Then
        txtEditNum.Text = lstMonitor.List(idx, 1)
        txtEditTop.Text = Replace(lstMonitor.List(idx, 2), ",", "")
        txtEditBtm.Text = Replace(lstMonitor.List(idx, 3), ",", "")
    End If
End Sub

Private Sub btnUpdate_Click()
    Dim idx As Long: idx = lstMonitor.ListIndex: If idx = -1 Then Exit Sub
    Dim tbl As ListObject: Set tbl = ThisWorkbook.Sheets("Main").ListObjects("tbl_Monitor")
    With tbl.ListRows(idx + 1)
        .Range(2).Value = "'" & txtEditNum.Text: .Range(3).Value = Val(txtEditTop.Text): .Range(4).Value = Val(txtEditBtm.Text)
        .Range(5).Value = Application.Run("GetRate", txtEditNum.Text, "2Top"): .Range(6).Value = Application.Run("GetRate", txtEditNum.Text, "2Bottom")
        .Range(7).Value = Application.Run("GetLimit", txtEditNum.Text, "2Top"): .Range(8).Value = Application.Run("GetLimit", txtEditNum.Text, "2Bottom")
    End With
    AddAuditEntry "DATA", "UpdateMonitorRow", "Row " & (idx + 1) & " updated"
    LoadDataToGrid
End Sub

Private Sub btnDelete_Click()
    Dim idx As Long: idx = lstMonitor.ListIndex: If idx = -1 Then Exit Sub
    If MsgBox("CONFIRM DELETE", vbYesNo + vbExclamation) = vbYes Then
        Dim delNum As String: delNum = ThisWorkbook.Sheets("Main").ListObjects("tbl_Monitor").DataBodyRange(idx + 1, 2).Value
        ThisWorkbook.Sheets("Main").ListObjects("tbl_Monitor").ListRows(idx + 1).Delete
        AddAuditEntry "DATA", "DeleteMonitorRow", "Deleted monitor row for Num=" & delNum
        LoadDataToGrid: txtEditNum.Text = "": txtEditTop.Text = "": txtEditBtm.Text = ""
    End If
End Sub

Private Sub btnSave_Click()
    AddAuditEntry "UI", "SaveClick", "Save button clicked in SmartPaste form"
    Unload Me: Application.Run "Action_SaveData"
End Sub

Private Sub btnClear_Click()
    Application.Run "Action_ClearTable": LoadDataToGrid: cbSearch.Value = ""
    AddAuditEntry "DATA", "ClearMonitor", "Cleared monitor table"
End Sub

' PARSER LOGIC (robust)
Function ParseTextLine(ByVal txt As String, ByRef retNum As String, ByRef retTop As Double, ByRef retBtm As Double) As Boolean
    Dim s As String: s = Trim(txt)
    retNum = "": retTop = 0: retBtm = 0
    If s = "" Then ParseTextLine = False: Exit Function
    ' sanitize control chars
    Dim i As Long, ch As String, clean As String
    For i = 1 To Len(s)
        ch = Mid$(s, i, 1)
        If Asc(ch) >= 32 Then clean = clean & ch
    Next i
    s = Application.Trim(clean)
    On Error GoTo Fail
    ' normalize separators
    s = Replace(s, "-", " ")
    s = Replace(s, "/", " ")
    s = Replace(s, "=", " ")
    s = LCase(s)
    s = Application.Trim(s)
    ' Try patterns: "123 100 50", "123=100x50" (x handled below)
    If InStr(s, "x") > 0 And InStr(s, "=") > 0 Then
        Dim p1 As Variant, p2 As Variant
        p1 = Split(s, "=")
        retNum = NormalizeNumRaw(p1(0), 2)
        If UBound(Split(p1(1), "x")) >= 1 Then
            p2 = Split(p1(1), "x")
            retTop = Val(p2(0)): retBtm = Val(p2(1))
            ParseTextLine = True: Exit Function
        End If
    End If
    Dim parts As Variant: parts = Split(s, " ")
    If UBound(parts) >= 0 Then
        retNum = NormalizeNumRaw(parts(0), 2)
        If retNum = "" Then ParseTextLine = False: Exit Function
        If UBound(parts) >= 2 Then
            retTop = Val(parts(1)): retBtm = Val(parts(2))
            ParseTextLine = True: Exit Function
        ElseIf UBound(parts) = 1 Then
            retTop = Val(parts(1)): retBtm = 0
            ParseTextLine = True: Exit Function
        End If
    End If
Fail:
    ParseTextLine = False
End Function
