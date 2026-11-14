import { apiRequest } from './api';
import { MethodAnalysisData } from '../components/workspace/HintsDrawer';

export interface StudyGuidanceRequest {
  problemId: number;
  userCode: string;
  verdict?: string;
  executionResult?: unknown;
  hintLevel?: number;
  isSolved?: boolean;
  userQuestion?: string;
  requestMode?: 'analyze' | 'hint' | 'coach' | 'optimizer';
}

export interface StudyGuidanceResponse {
  message: string;
  hintLevel: number;
  mode: 'analyze' | 'coach' | 'optimizer' | 'nudge';
  provider?: 'gemini' | 'local';
  analysis?: MethodAnalysisData;
}

/**
 * Requests AI/local method analysis, mistake diagnostics, or progressive hints.
 */
export async function requestStudyGuidance(
  payload: StudyGuidanceRequest
): Promise<StudyGuidanceResponse> {
  const res = await apiRequest<{ feedback: StudyGuidanceResponse }>('/study/guidance', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.feedback;
}

