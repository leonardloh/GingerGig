import type {
  AudioUploadUrlResponse,
  BatchVoiceLanguage,
  ListingDraft,
  StreamingVoiceLanguage,
  VoiceBatchStatusResponse,
  VoiceBatchSubmitResponse,
  VoiceTextDraftRequest,
} from "../types";
import { mockDelay } from "./delay";

const CATEGORY_KEYWORDS: Array<[ListingDraft["category"], string[]]> = [
  ["home_cooking", ["cook", "food", "meal", "nasi", "rendang", "kuih", "cake", "bake"]],
  ["traditional_crafts", ["craft", "sew", "knit", "batik", "basket", "weave"]],
  ["pet_sitting", ["pet", "cat", "dog", "animal"]],
  ["household_help", ["clean", "laundry", "house", "garden", "home"]],
];

const PRICE_UNIT_KEYWORDS: Array<[NonNullable<ListingDraft["price_unit"]>, string[]]> = [
  ["per_meal", ["meal", "plate", "pack", "bungkus", "portion"]],
  ["per_hour", ["hour", "jam"]],
  ["per_day", ["day", "hari"]],
  ["per_month", ["month", "bulan"]],
];

function extractPrice(text: string): number | null {
  const match = text.match(/(?:rm\s*)?(\d+(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : null;
}

function pickCategory(text: string): ListingDraft["category"] {
  const lowered = text.toLowerCase();
  return CATEGORY_KEYWORDS.find(([, words]) => words.some((word) => lowered.includes(word)))?.[0] ?? "other";
}

function pickPriceUnit(text: string): ListingDraft["price_unit"] {
  const lowered = text.toLowerCase();
  return PRICE_UNIT_KEYWORDS.find(([, words]) => words.some((word) => lowered.includes(word)))?.[0] ?? null;
}

export async function createListingDraftFromText(
  payload: VoiceTextDraftRequest,
): Promise<ListingDraft> {
  await mockDelay(500, 900);
  const transcript = payload.transcript.trim();

  if (!transcript) {
    throw { status: 400, message: "Transcript is required." };
  }

  return {
    name: null,
    service_offer: transcript,
    category: pickCategory(transcript),
    price_amount: extractPrice(transcript),
    price_unit: pickPriceUnit(transcript),
    capacity: null,
    dietary_tags: transcript.toLowerCase().includes("halal") ? ["halal"] : [],
    location_hint: null,
    language: payload.language,
  };
}

export async function getAudioUploadUrl(_payload: {
  language: BatchVoiceLanguage;
  contentType: string;
}): Promise<AudioUploadUrlResponse> {
  void _payload;
  await mockDelay();
  return {
    uploadUrl: "mock://voice-upload",
    s3Key: "mock/voice/audio.wav",
    expiresIn: 900,
  };
}

export async function uploadAudioToPresignedUrl(
  _uploadUrl: string,
  _audio: Blob,
  _contentType: string,
): Promise<void> {
  void _uploadUrl;
  void _audio;
  void _contentType;
  await mockDelay(80, 160);
}

export async function submitBatchJob(_payload: {
  s3Key: string;
  language: BatchVoiceLanguage;
}): Promise<VoiceBatchSubmitResponse> {
  void _payload;
  await mockDelay();
  return {
    jobId: "mock-voice-job",
    status: "pending",
    estimatedSeconds: 2,
  };
}

export async function getBatchStatus(jobId: string): Promise<VoiceBatchStatusResponse> {
  await mockDelay();
  return {
    jobId,
    status: "failed",
    message: "Mock batch transcription needs browser SpeechRecognition text.",
  };
}

export function createVoiceStream(_payload: {
  token: string;
  language: StreamingVoiceLanguage;
}): WebSocket {
  void _payload;
  const target = new EventTarget() as EventTarget & Partial<WebSocket>;
  let readyState: number = WebSocket.OPEN;
  Object.defineProperty(target, "readyState", {
    get: () => readyState,
  });
  target.send = () => {};
  target.close = () => {
    readyState = WebSocket.CLOSED;
    target.dispatchEvent(new CloseEvent("close"));
  };
  return target as WebSocket;
}
