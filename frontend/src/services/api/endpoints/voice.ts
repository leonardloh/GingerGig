import { env } from "../../../config/env";
import { apiRequest } from "../http";
import type {
  AudioUploadUrlResponse,
  BatchVoiceLanguage,
  StreamingVoiceLanguage,
  VoiceBatchStatusResponse,
  VoiceBatchSubmitResponse,
} from "../types";

export function getAudioUploadUrl(payload: {
  language: BatchVoiceLanguage;
  contentType: string;
}): Promise<AudioUploadUrlResponse> {
  return apiRequest<AudioUploadUrlResponse>("/voice-to-profile/audio-upload-url", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadAudioToPresignedUrl(
  uploadUrl: string,
  audio: Blob,
  contentType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: audio,
  });

  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status}`);
  }
}

export function submitBatchJob(payload: {
  s3Key: string;
  language: BatchVoiceLanguage;
}): Promise<VoiceBatchSubmitResponse> {
  return apiRequest<VoiceBatchSubmitResponse>("/voice-to-profile/batch", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBatchStatus(jobId: string): Promise<VoiceBatchStatusResponse> {
  return apiRequest<VoiceBatchStatusResponse>(`/voice-to-profile/batch/${jobId}`);
}

export function createVoiceStream({
  token,
  language,
}: {
  token: string;
  language: StreamingVoiceLanguage;
}): WebSocket {
  const url = new URL(env.apiBaseUrl);
  if (url.protocol === "http:") {
    url.protocol = "ws:";
  } else if (url.protocol === "https:") {
    url.protocol = "wss:";
  }

  url.pathname = "/api/v1/voice-to-profile/stream";
  url.searchParams.set("token", token);

  const socket = new WebSocket(url);
  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ language }));
  });

  return socket;
}
