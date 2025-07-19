/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StatsDisplay } from './StatsDisplay.js';
import { PricingService } from '../../services/PricingService.js';

interface SessionSummaryDisplayProps {
  duration: string;
  totalCost?: number;
  costBreakdown?: Record<
    string,
    {
      cost: number;
      inputTokens: number;
      outputTokens: number;
    }
  >;
}

export const SessionSummaryDisplay: React.FC<SessionSummaryDisplayProps> = ({
  duration,
  totalCost,
  costBreakdown,
}) => {
  const pricingService = PricingService.getInstance();

  // Format cost info for display
  let costInfo: string | undefined;
  if (totalCost !== undefined && totalCost > 0) {
    costInfo = `Total cost: ${pricingService.formatCost(totalCost)}`;

    // Add model breakdown if available
    if (costBreakdown && Object.keys(costBreakdown).length > 0) {
      const modelCosts = Object.entries(costBreakdown)
        .filter(([_, data]) => data.cost > 0)
        .map(
          ([model, data]) =>
            `  ${model}: ${pricingService.formatCost(data.cost)}`,
        )
        .join('\n');

      if (modelCosts) {
        costInfo += '\n' + modelCosts;
      }
    }
  }

  return (
    <StatsDisplay
      title="Agent powering down. Goodbye!"
      duration={duration}
      additionalInfo={costInfo}
    />
  );
};
