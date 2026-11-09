package br.com.copiloto.financeiro

import org.junit.Assert.*
import org.junit.Test

class InternalReviewPolicyTest {
    @Test fun internalBuildCannotStartAnyPurchase() {
        for (id in listOf("copiloto_pro_30d", "copiloto_max_30d", "copiloto_ultra_30d")) {
            assertFalse(isAllowedBillingCommandForMode("purchase", id, true))
            assertTrue(isAllowedBillingCommandForMode("purchase", id, false))
        }
        assertFalse(isAllowedBillingCommandForMode("purchase", "unknown", false))
    }
    @Test fun readingTheCatalogDoesNotAuthorizePayments() {
        assertTrue(isAllowedBillingCommandForMode("queryProducts", null, true))
        assertFalse(isAllowedBillingCommandForMode("queryProducts", "copiloto_pro_30d", true))
    }
    @Test fun dictationHasBoundedRequestsAndDrafts() {
        assertTrue(VoiceInputPolicy.validRequest("voice_123"))
        assertFalse(VoiceInputPolicy.validRequest("user's request"))
        assertEquals("Olá", VoiceInputPolicy.draft(" Olá "))
        assertEquals(4000, VoiceInputPolicy.draft("a".repeat(5000)).length)
    }
}
