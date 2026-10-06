package com.fitme.tryon.dto;

import lombok.Builder;
import lombok.Data;

/** What an AI try-on of the given products would cost the current user right now. */
@Data
@Builder
public class TryOnQuoteResponse {
    /** The try-on would use a free daily try instead of Fitken. */
    private boolean free;
    /** Free tries left today; 0 for guests, who must log in before any AI try-on. */
    private int freeRemainingToday;
    private int freeDailyLimit;
    private int fitkenCost;
    /** Every product belongs to a brand with an active Brand Plus subscription. */
    private boolean allPlus;
}
