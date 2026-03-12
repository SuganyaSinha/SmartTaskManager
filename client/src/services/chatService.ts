import api from './api';
import { ChatRequest, ChatResponse } from '../types/common';
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
