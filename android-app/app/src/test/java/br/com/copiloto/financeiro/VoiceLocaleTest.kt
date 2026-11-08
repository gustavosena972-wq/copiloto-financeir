package br.com.copiloto.financeiro

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class VoiceLocaleTest {
    @Test
    fun resolvesSupportedLanguageToAndroidLocale() {
        assertEquals("pt-BR", resolveVoiceLocale("pt"))
        assertEquals("en-US", resolveVoiceLocale("en"))
        assertEquals("es-ES", resolveVoiceLocale("es"))
        assertEquals("ja-JP", resolveVoiceLocale("ja"))
        assertEquals("zh-CN", resolveVoiceLocale("zh"))
        assertEquals("uk-UA", resolveVoiceLocale("uk"))
        assertEquals("vi-VN", resolveVoiceLocale("vi"))
    }

    @Test
    fun rejectsUnknownLanguageInsteadOfFallingBackSilently() {
        assertNull(resolveVoiceLocale("xx"))
        assertNull(resolveVoiceLocale(""))
    }

    @Test
    fun normalizesLanguageCodesBeforeResolving() {
        assertEquals("pt-BR", resolveVoiceLocale(" PT "))
        assertEquals("en-US", resolveVoiceLocale("EN"))
    }

    @Test
    fun exposesExpandedLanguageSetForManualVoiceSelection() {
        val languages = supportedVoiceLanguages()
        assertTrue(languages.contains("pt"))
        assertTrue(languages.contains("en"))
        assertTrue(languages.contains("uk"))
        assertTrue(languages.contains("vi"))
        assertTrue(languages.size >= 30)
    }
}
