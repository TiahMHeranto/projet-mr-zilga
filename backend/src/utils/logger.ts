// src/utils/logger.ts
export const log = (message: string, data?: any) => {
  console.log(JSON.stringify({
    message,
    data,
    timestamp: new Date().toISOString(),
  }));
};