import { EventEmitter } from 'events';
import type { FileChangePayload, AnalysisPayload, HypothesisPayload } from './types.js';

export declare interface AIStreamParser {
  on(event: 'checkpoint', listener: (content: string) => void): this;
  on(event: 'file_change', listener: (payload: FileChangePayload) => void): this;
  on(event: 'verify', listener: (cmd: string) => void): this;
  on(event: 'analysis', listener: (payload: AnalysisPayload) => void): this;
  on(event: 'hypothesis', listener: (payload: HypothesisPayload) => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this;
}

export class AIStreamParser extends EventEmitter {
  private buffer: string = '';

  public feed(chunk: string): void {
    this.buffer += chunk;
    this.scan();
  }

  public getBuffer(): string { return this.buffer; }
  public clear(): void { this.buffer = ''; }

  private scan(): void {
    const checkpointMatch = this.buffer.match(/<checkpoint>([\s\S]*?)<\/checkpoint>/);
    if (checkpointMatch) {
      this.emit('checkpoint', checkpointMatch[1]?.trim() ?? '');
      this.consume(checkpointMatch[0]);
    }

    const fileMatch = this.buffer.match(/<file_change path="(.*?)">([\s\S]*?)<\/file_change>/);
    if (fileMatch) {
      const [fullTag, path, content] = fileMatch;
      if (path && content !== undefined) {
        this.emit('file_change', { path, content: content.trim() });
      }
      if (fullTag) this.consume(fullTag);
    }

    const verifyMatch = this.buffer.match(/<verification_cmd>(.*?)<\/verification_cmd>/);
    if (verifyMatch) {
      this.emit('verify', verifyMatch[1]?.trim() ?? '');
      this.consume(verifyMatch[0]);
    }

    const analysisMatch = this.buffer.match(/<analysis(?:\s+type="(.*?)")?>([\s\S]*?)<\/analysis>/);
    if (analysisMatch) {
      const [fullTag, type, content] = analysisMatch;
      if (content !== undefined) {
        this.emit('analysis', { type: type ?? 'general', content: content.trim() });
      }
      if (fullTag) this.consume(fullTag);
    }

    const hypothesisMatch = this.buffer.match(/<hypothesis(?:\s+confidence="([\d.]+)")?>([\s\S]*?)<\/hypothesis>/);
    if (hypothesisMatch) {
      const [fullTag, confidence, content] = hypothesisMatch;
      if (content !== undefined) {
        this.emit('hypothesis', {
          confidence: confidence ? parseFloat(confidence) : undefined,
          content: content.trim()
        });
      }
      if (fullTag) this.consume(fullTag);
    }
  }

  private consume(str: string): void {
    this.buffer = this.buffer.replace(str, '');
  }
}
