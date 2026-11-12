package br.com.copiloto.financeiro

import org.junit.Assert.*
import org.junit.Test

class ReminderPolicyTest {
    @Test fun anotherAccountOrFamilyCannotDeliverThePreviousReminder() {
        assertFalse(ReminderPolicy.canDeliver("family-b", "family-a", true, 150, 100, 200))
        assertFalse(ReminderPolicy.canDeliver(null, "family-a", true, 150, 100, 200))
        assertTrue(ReminderPolicy.canDeliver("family-a", "family-a", true, 150, 100, 200))
    }
    @Test fun consentAndExpiryAreRequired() {
        assertFalse(ReminderPolicy.canDeliver("a", "a", false, 150, 100, 200))
        assertFalse(ReminderPolicy.canDeliver("a", "a", true, 250, 100, 200))
        assertFalse(ReminderPolicy.canDeliver("a", "a", true, 90, 100, 200))
        assertFalse(ReminderPolicy.canDeliver("a", "a", true, 150, 100, 100 + ReminderPolicy.WINDOW + 1))
    }
    @Test fun onlyRealDatesCanBeScheduledAndScopeDoesNotStoreRawIds() {
        assertNull(ReminderPolicy.nineOClock("2026-02-30"))
        assertNull(ReminderPolicy.nineOClock("tomorrow"))
        assertNotNull(ReminderPolicy.nineOClock("2026-11-11"))
        assertEquals(64, ReminderPolicy.scope("[user,family]")!!.length)
        assertNotEquals(ReminderPolicy.scope("[a,b]"), ReminderPolicy.scope("[a,c]"))
    }
}
