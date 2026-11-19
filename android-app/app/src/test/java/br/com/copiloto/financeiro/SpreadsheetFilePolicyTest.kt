package br.com.copiloto.financeiro

import org.junit.Assert.*
import org.junit.Test

class SpreadsheetFilePolicyTest {
    @Test fun onlySupportedBoundedExportsAreAccepted() {
        assertTrue(SpreadsheetFilePolicy.validExport("text/csv", 250, "request-1"))
        assertFalse(SpreadsheetFilePolicy.validExport("text/html", 250, "request-1"))
        assertFalse(SpreadsheetFilePolicy.validExport("text/csv", 0, "request-1"))
        assertFalse(SpreadsheetFilePolicy.validExport("text/csv", SpreadsheetFilePolicy.MAX_BYTES + 1, "request-1"))
        assertFalse(SpreadsheetFilePolicy.validExport("text/csv", 250, "quote'"))
    }
    @Test fun documentPickerCannotReturnFilesystemOrRemoteUrls() {
        assertTrue(SpreadsheetFilePolicy.permitsResultScheme("content"))
        for (scheme in listOf("file", "https", "javascript", null)) assertFalse(SpreadsheetFilePolicy.permitsResultScheme(scheme))
    }
    @Test fun filenameCannotKeepPathsOrAnExecutableExtension() {
        assertEquals("fatura.csv", SpreadsheetFilePolicy.filename("fatura.exe", "text/csv"))
        assertEquals("_.._privado.xlsx", SpreadsheetFilePolicy.filename("../../privado.xls", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        assertEquals("copiloto-financeiro.json", SpreadsheetFilePolicy.filename("...", "application/json"))
    }
}
