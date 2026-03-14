import api from './api';
import { ChatRequest, ChatResponse, ChatSessionSummary, SessionMessageDto } from '../types/common';
import moment from 'moment';

export const sendChatMessage = async (
  userMessage: string,
  sessionId: string,
  confirmed = false
): Promise<ChatResponse> => {
  const currentDate = moment().format('YYYY-MM-DDTHH:mm:ssZ');
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const request: ChatRequest = {
    sessionId,
    userMessage,
    currentDate,
    timeZone,
    confirmed,
  };

  const response = await api.post<ChatResponse>('/api/chat', request, {
    headers: { 'Content-Type': 'application/json' },
  });

  return response.data;
};

export const getChatSessions = async (): Promise<ChatSessionSummary[]> => {
  const response = await api.get<ChatSessionSummary[]>('/api/chat/sessions');
  return response.data;
};

export const getSessionMessages = async (sessionId: string): Promise<SessionMessageDto[]> => {
  const response = await api.get<SessionMessageDto[]>(`/api/chat/sessions/${sessionId}/messages`);
  return response.data;
};
