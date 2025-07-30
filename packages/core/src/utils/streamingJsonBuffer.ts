/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A buffer for handling incomplete JSON chunks in streaming responses.
 * This helps prevent JSON parsing errors when chunks are split mid-object.
 */
export class StreamingJsonBuffer {
  private buffer: string = '';
  private readonly maxBufferSize: number;
  private readonly timeout: number;
  private lastChunkTime: number = Date.now();

  constructor(maxBufferSize: number = 1024 * 1024, timeout: number = 30000) {
    this.maxBufferSize = maxBufferSize;
    this.timeout = timeout;
  }

  /**
   * Add a chunk to the buffer and attempt to extract complete JSON objects
   */
  addChunk(chunk: string): string[] {
    this.buffer += chunk;
    this.lastChunkTime = Date.now();

    // Check buffer size limit
    if (this.buffer.length > this.maxBufferSize) {
      throw new Error(
        `JSON buffer exceeded maximum size of ${this.maxBufferSize} bytes`,
      );
    }

    const completeJsonObjects: string[] = [];

    // Try to extract complete JSON objects from the buffer
    let startIndex = 0;
    while (startIndex < this.buffer.length) {
      // Skip whitespace
      while (
        startIndex < this.buffer.length &&
        /\s/.test(this.buffer[startIndex])
      ) {
        startIndex++;
      }

      if (startIndex >= this.buffer.length) break;

      // Look for the start of a JSON object
      if (this.buffer[startIndex] === '{') {
        const result = this.extractJsonObject(startIndex);
        if (result) {
          completeJsonObjects.push(result.json);
          startIndex = result.endIndex + 1;
        } else {
          // No complete object found, keep the rest in buffer
          this.buffer = this.buffer.substring(startIndex);
          break;
        }
      } else {
        // Invalid character, skip it
        startIndex++;
      }
    }

    // If we've processed everything, clear the buffer
    if (startIndex >= this.buffer.length) {
      this.buffer = '';
    }

    return completeJsonObjects;
  }

  /**
   * Extract a complete JSON object starting at the given index
   */
  private extractJsonObject(
    startIndex: number,
  ): { json: string; endIndex: number } | null {
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIndex; i < this.buffer.length; i++) {
      const char = this.buffer[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            // Found complete object
            const json = this.buffer.substring(startIndex, i + 1);
            // Validate that it's actually valid JSON
            try {
              JSON.parse(json);
              return { json, endIndex: i };
            } catch {
              // Not valid JSON, continue searching
              return null;
            }
          }
        }
      }
    }

    // No complete object found
    return null;
  }

  /**
   * Get any remaining incomplete data in the buffer
   */
  getIncompleteData(): string {
    return this.buffer;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = '';
  }

  /**
   * Check if the buffer has timed out
   */
  isTimedOut(): boolean {
    return Date.now() - this.lastChunkTime > this.timeout;
  }

  /**
   * Process SSE (Server-Sent Events) formatted data
   */
  processSSEChunk(chunk: string): Array<{ event?: string; data: string }> {
    const lines = chunk.split('\n');
    const events: Array<{ event?: string; data: string }> = [];
    let currentEvent: { event?: string; data: string } | null = null;

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        if (currentEvent && currentEvent.data) {
          events.push(currentEvent);
        }
        currentEvent = { event: line.slice(7).trim(), data: '' };
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (currentEvent) {
          currentEvent.data = currentEvent.data
            ? currentEvent.data + '\n' + data
            : data;
        } else {
          currentEvent = { data };
        }
      } else if (line === '' && currentEvent) {
        if (currentEvent.data) {
          events.push(currentEvent);
        }
        currentEvent = null;
      }
    }

    // Don't forget the last event if there's no trailing empty line
    if (currentEvent && currentEvent.data) {
      events.push(currentEvent);
    }

    return events;
  }
}
