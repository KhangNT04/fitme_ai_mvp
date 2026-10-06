package com.fitme.auth.entity;

import com.fitme.common.enums.ConsumerPlan;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores the enum name; reads legacy PRO/PLUS rows as PREMIUM. */
@Converter
public class ConsumerPlanConverter implements AttributeConverter<ConsumerPlan, String> {

    @Override
    public String convertToDatabaseColumn(ConsumerPlan plan) {
        return (plan != null ? plan : ConsumerPlan.FREE).name();
    }

    @Override
    public ConsumerPlan convertToEntityAttribute(String raw) {
        try {
            return ConsumerPlan.fromValue(raw);
        } catch (IllegalArgumentException ex) {
            return ConsumerPlan.FREE;
        }
    }
}
