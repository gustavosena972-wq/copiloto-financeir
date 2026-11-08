package br.com.copiloto.financeiro

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class VoiceLocaleTest {
    @Test
    fun resolvesSupportedLanguageToAndroidLocale() {
        assertEquals("pt-BR", resolveVoiceLocale("pt"))
        assertEquals("en-US", resolveVoiceLocale("en"))
        assertEquals("es-ES", resolveVoiceLocale("es"))
        assertEquals("ja-JP", resolveVoiceLocale("ja"))
        assertEquals("zh-CN", resolveVoiceLocale("zh"))
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
}
