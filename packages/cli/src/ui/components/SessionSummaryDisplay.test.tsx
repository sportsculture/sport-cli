/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { SessionSummaryDisplay } from './SessionSummaryDisplay.js';
import * as SessionContext from '../contexts/SessionContext.js';
import type { SessionMetrics } from '../contexts/SessionContext.js';

vi.mock('../contexts/SessionContext.js', async (importOriginal) => {
  const actual = await importOriginal<typeof SessionContext>();
  return {
    ...actual,
    useSessionStats: vi.fn(),
  };
});

const useSessionStatsMock = vi.mocked(SessionContext.useSessionStats);

const renderWithMockedStats = (metrics: SessionMetrics) => {
  useSessionStatsMock.mockReturnValue({
    stats: {
      sessionStartTime: new Date(),
      metrics,
      lastPromptTokenCount: 0,
      promptCount: 5,
      costTracking: {
        totalCost: 0,
        byModel: {},
      },
    },

    getPromptCount: () => 5,
    startNewPrompt: vi.fn(),
    updateCosts: vi.fn(),
  });

  return render(<SessionSummaryDisplay duration="1h 23m 45s" />);
};

const renderWithMockedStatsAndCost = (
  metrics: SessionMetrics,
  totalCost?: number,
  costBreakdown?: Record<
    string,
    { cost: number; inputTokens: number; outputTokens: number }
  >,
) => {
  useSessionStatsMock.mockReturnValue({
    stats: {
      sessionStartTime: new Date(),
      metrics,
      lastPromptTokenCount: 0,
      promptCount: 5,
      costTracking: {
        totalCost: totalCost || 0,
        byModel: costBreakdown || {},
      },
    },

    getPromptCount: () => 5,
    startNewPrompt: vi.fn(),
    updateCosts: vi.fn(),
  });

  return render(
    <SessionSummaryDisplay
      duration="1h 23m 45s"
      totalCost={totalCost}
      costBreakdown={costBreakdown}
    />,
  );
};

describe('<SessionSummaryDisplay />', () => {
  it('renders the summary display with a title', () => {
    const metrics: SessionMetrics = {
      models: {
        'gemini-2.5-pro': {
          api: { totalRequests: 10, totalErrors: 1, totalLatencyMs: 50234 },
          tokens: {
            prompt: 1000,
            candidates: 2000,
            total: 3500,
            cached: 500,
            thoughts: 300,
            tool: 200,
          },
        },
      },
      tools: {
        totalCalls: 0,
        totalSuccess: 0,
        totalFail: 0,
        totalDurationMs: 0,
        totalDecisions: { accept: 0, reject: 0, modify: 0 },
        byName: {},
      },
      files: {
        totalLinesAdded: 42,
        totalLinesRemoved: 15,
      },
    };

    const { lastFrame } = renderWithMockedStats(metrics);
    const output = lastFrame();

    expect(output).toContain('Agent powering down. Goodbye!');
    expect(output).toMatchSnapshot();
  });

  it('renders cost information when provided', () => {
    const metrics: SessionMetrics = {
      models: {
        'openai/gpt-4o': {
          api: { totalRequests: 5, totalErrors: 0, totalLatencyMs: 25000 },
          tokens: {
            prompt: 5000,
            candidates: 3000,
            total: 8000,
            cached: 0,
            thoughts: 0,
            tool: 0,
          },
        },
      },
      tools: {
        totalCalls: 0,
        totalSuccess: 0,
        totalFail: 0,
        totalDurationMs: 0,
        totalDecisions: { accept: 0, reject: 0, modify: 0 },
        byName: {},
      },
    };

    const totalCost = 0.0425;
    const costBreakdown = {
      'openai/gpt-4o': {
        cost: 0.0425,
        inputTokens: 5000,
        outputTokens: 3000,
      },
    };

    const { lastFrame } = renderWithMockedStatsAndCost(
      metrics,
      totalCost,
      costBreakdown,
    );
    const output = lastFrame();

    expect(output).toContain('Session Cost');
    expect(output).toContain('Total cost: $0.043');
    expect(output).toContain('openai/gpt-4o: $0.043');
  });
});
