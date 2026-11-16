import { apiRequest } from './api';
import { MethodAnalysisData } from '../components/workspace/HintsDrawer';

export interface CoachChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StudyGuidanceRequest {
  problemId: number;
  userCode: string;
  verdict?: string;
  executionResult?: unknown;
  hintLevel?: number;
  isSolved?: boolean;
  userQuestion?: string;
  requestMode?: 'analyze' | 'hint' | 'coach' | 'optimizer';
  conversationHistory?: CoachChatTurn[];
}

export interface StudyGuidanceResponse {
  message: string;
  hintLevel: number;
  mode: 'analyze' | 'coach' | 'optimizer' | 'nudge';
  provider?: 'gemini' | 'local';
  providerNote?: string;
  analysis?: MethodAnalysisData;
}

/**
 * Requests Gemini-powered or local method analysis, complexity check, progressive hints, and follow-up chat.
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
