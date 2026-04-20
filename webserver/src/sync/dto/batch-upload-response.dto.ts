export type BatchResultStatus = 'CREATED' | 'REJECTED';

export interface BatchResultError {
  error: string;
  message: string;
}

export interface BatchUploadResultDto {
  client_scan_id: string;
  status: BatchResultStatus;
  server_scan_id: string | null;
  error: BatchResultError | null;
}

export interface BatchUploadResponseDto {
  results: BatchUploadResultDto[];
}