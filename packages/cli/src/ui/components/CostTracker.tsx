/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { uiTelemetryService, SessionMetrics } from '@sport/core';
import { PricingService } from '../../services/PricingService.js';
import { useSessionStats } from '../contexts/SessionContext.js';

export const CostTracker: React.FC = () => {
  const { updateCosts } = useSessionStats();
  const pricingService = PricingService.getInstance();
  const lastProcessedTokensRef = useRef<
    Record<string, { prompt: number; candidates: number }>
  >({});

  useEffect(() => {
    const handleUpdate = ({ metrics }: { metrics: SessionMetrics }) => {
      // Process each model's token usage
      Object.entries(metrics.models).forEach(([modelId, modelMetrics]) => {
        const lastTokens = lastProcessedTokensRef.current[modelId] || {
          prompt: 0,
          candidates: 0,
        };

        // Calculate new tokens since last update
        const newPromptTokens = modelMetrics.tokens.prompt - lastTokens.prompt;
        const newCandidateTokens =
          modelMetrics.tokens.candidates - lastTokens.candidates;

        if (newPromptTokens > 0 || newCandidateTokens > 0) {
          // Calculate cost for new tokens
          const costCalc = pricingService.calculateCost(
            modelId,
            newPromptTokens,
            newCandidateTokens,
          );

          if (costCalc) {
            // Update costs in session context
            updateCosts(
              modelId,
              costCalc.totalCost,
              newPromptTokens,
              newCandidateTokens,
            );
          }

          // Update last processed tokens
          lastProcessedTokensRef.current[modelId] = {
            prompt: modelMetrics.tokens.prompt,
            candidates: modelMetrics.tokens.candidates,
          };
        }
      });
    };

    // Subscribe to telemetry updates
    uiTelemetryService.on('update', handleUpdate);

    // Get initial state
    handleUpdate({ metrics: uiTelemetryService.getMetrics() });

    return () => {
      uiTelemetryService.off('update', handleUpdate);
    };
  }, [updateCosts, pricingService]);

  // This component doesn't render anything
  return null;
};
