// Simple Low-pass filter
export const lowPassFilter = (data: number[], alpha = 0.5): number[] => {
  const result: number[] = [];
  result[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    result[i] = alpha * data[i] + (1 - alpha) * result[i - 1];
  }
  return result;
};

// Simple peak detection
export const detectPeaks = (data: number[], threshold = 0.6): number[] => {
  const peaks: number[] = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
      peaks.push(i);
    }
  }
  return peaks;
};
