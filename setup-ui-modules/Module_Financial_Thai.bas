Option Explicit

Sub GenerateFinancialCenter_Thai()
    Dim wb As Workbook
    Dim wsDash As Worksheet, wsRaw As Worksheet, wsDB As Worksheet
    Dim tblRaw As ListObject, tblDB As ListObject

    Set wb = ThisWorkbook
    Set wsRaw = wb.Sheets("Rawdata"): Set tblRaw = wsRaw.ListObjects("tbl_Rawdata")
    Set wsDB = wb.Sheets("Database"): Set tblDB = wsDB.ListObjects("tbl_Database")

    Application.ScreenUpdating = False

    On Error Resume Next
    Set wsDash = wb.Sheets("Financial_Center")
    If wsDash Is Nothing Then
        Set wsDash = wb.Sheets.Add(After:=wb.Sheets(wb.Sheets.Count))
        wsDash.Name = "Financial_Center"
        SetupLayout_Thai wsDash
    End If
    On Error GoTo 0

    wsDash.Activate

    Dim TotalSales As Currency, WorstCaseRisk As Currency
    Dim EstProfit As Currency
    Dim TotalBills As Long

    Dim dictSaleTop As Object: Set dictSaleTop = CreateObject("Scripting.Dictionary")
    Dim dictSaleBtm As Object: Set dictSaleBtm = CreateObject("Scripting.Dictionary")
    Dim ArrRiskTop(0 To 99) As Currency, ArrRiskBtm(0 To 99) As Currency
    Dim MaxTopRisk As Currency, MaxBtmRisk As Currency

    If tblRaw.ListRows.Count > 0 Then
        Dim vRaw, i As Long, N As String, Typ As String, Risk As Currency, Amt As Currency
        vRaw = tblRaw.DataBodyRange.Value

        For i = 1 To UBound(vRaw, 1)
            If LCase(Trim(CStr(vRaw(i, 8)))) = "active" Then
                N = CStr(vRaw(i, 3)): Typ = CStr(vRaw(i, 4)): Amt = vRaw(i, 5): Risk = vRaw(i, 7)
                TotalSales = TotalSales + Amt

                If InStr(Typ, "Top") > 0 Then
                    If dictSaleTop.Exists(N) Then dictSaleTop(N) = dictSaleTop(N) + Amt Else dictSaleTop.Add N, Amt
                    ArrRiskTop(Val(N)) = ArrRiskTop(Val(N)) + Risk
                ElseIf InStr(Typ, "Bottom") > 0 Then
                    If dictSaleBtm.Exists(N) Then dictSaleBtm(N) = dictSaleBtm(N) + Amt Else dictSaleBtm.Add N, Amt
                    ArrRiskBtm(Val(N)) = ArrRiskBtm(Val(N)) + Risk
                End If
            End If
        Next i

        For i = 0 To 99
            If ArrRiskTop(i) > MaxTopRisk Then MaxTopRisk = ArrRiskTop(i)
            If ArrRiskBtm(i) > MaxBtmRisk Then MaxBtmRisk = ArrRiskBtm(i)
        Next i
        WorstCaseRisk = MaxTopRisk + MaxBtmRisk

        TotalBills = Application.WorksheetFunction.CountIf(tblDB.ListColumns("Status").DataBodyRange, "Active")
        EstProfit = TotalSales - (TotalSales * 0.9)
    End If

    wsDash.Range("C4").Value = Format(TotalSales, "#,##0.00")
    wsDash.Range("F4").Value = Format(WorstCaseRisk, "#,##0.00")
    wsDash.Range("I4").Value = Format(EstProfit, "#,##0.00")

    wsDash.Range("B10:C14").ClearContents
    wsDash.Range("E10:F14").ClearContents

    UpdateTable wsDash, dictSaleTop, "B10", 5
    UpdateTable wsDash, dictSaleBtm, "E10", 5

    wsDash.Range("C18").Value = Format(MaxTopRisk, "#,##0")
    wsDash.Range("C19").Value = Format(MaxBtmRisk, "#,##0")
    wsDash.Range("C20").Value = Format(WorstCaseRisk, "#,##0")

    AddAuditEntry "REPORT", "GenerateFinancialCenter", "Generated financial center summary"

    Application.ScreenUpdating = True
End Sub
