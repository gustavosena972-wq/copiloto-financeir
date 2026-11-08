package br.com.copiloto.financeiro

private val VOICE_LOCALES = mapOf(
    "pt" to "pt-BR",
    "en" to "en-US",
    "es" to "es-ES",
    "fr" to "fr-FR",
    "de" to "de-DE",
    "it" to "it-IT",
    "ja" to "ja-JP",
    "ko" to "ko-KR",
    "zh" to "zh-CN",
    "ar" to "ar-SA",
    "hi" to "hi-IN",
    "ru" to "ru-RU",
    "nl" to "nl-NL",
    "pl" to "pl-PL",
    "tr" to "tr-TR",
    "id" to "id-ID",
)

internal fun resolveVoiceLocale(languageCode: String?): String? =
    VOICE_LOCALES[languageCode?.trim()?.lowercase()]

internal fun supportedVoiceLanguages(): Set<String> = VOICE_LOCALES.keys
