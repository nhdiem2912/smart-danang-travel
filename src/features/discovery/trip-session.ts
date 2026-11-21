import type {
  LegCheckpoint,
  LegResult,
  TravelMode,
} from './trip-model';
import {
  assertCanStart,
} from './trip-time-policy';

import { assertLegResult } from './trip-metrics';
import { tripStore } from './use-trip-draft';

export async function beginLeg(
  id: string,
  mode: TravelMode,
) {
  if (mode === 'two_wheeler') {
    throw new Error(
      'Chọn đi bộ hoặc ô tô trong cấu hình. Chưa hỗ trợ tuyến xe máy.',
    );
  }

  return tripStore.update(draft => {
    const target = draft.stops.find(stop => stop.id === id);

    if (!target) {
      throw new Error('Điểm này đã bị xóa.');
    }
    assertCanStart(draft, target);

    if (target.progress) return draft;
    if (target.progress) return draft;

    if (draft.stops.some(stop => stop.progress)) {
      throw new Error(
        'Có chặng đang dở. Hãy tiếp tục hoặc hủy chặng đó trước khi bắt đầu điểm khác.',
      );
    }

    return {
      ...draft,
      stops: draft.stops.map(stop =>
        stop.id !== id
          ? stop
          : {
              ...stop,
              progress: {
                id:
                  `${Date.now()}-` +
                  Math.random().toString(36).slice(2),
                travelMode: mode,
                savedAt: new Date().toISOString(),
                checkpoint: {
                  startedAt: null,
                  elapsedMs: 0,
                  meters: 0,
                  pairs: 0,
                  partial: false,
                },
              },
            },
      ),
    };
  });
}

export function saveLeg(
  id: string,
  sessionId: string,
  checkpoint: LegCheckpoint,
) {
  return tripStore.update(draft => {
    const target = draft.stops.find(stop => stop.id === id);

    if (!target || target.progress?.id !== sessionId) {
      return draft;
    }

    return {
      ...draft,
      stops: draft.stops.map(stop =>
        stop.id !== id
          ? stop
          : {
              ...stop,
              progress: {
                ...target.progress!,
                savedAt: new Date().toISOString(),
                checkpoint,
              },
            },
      ),
    };
  });
}

export function finishLeg(
  id: string,
  sessionId: string,
  result: LegResult,
) {
  assertLegResult(result);

  return tripStore.update(draft => {
    const target = draft.stops.find(stop => stop.id === id);

    if (!target || target.progress?.id !== sessionId) {
      throw new Error(
        'Chặng đã thay đổi. Hãy quay lại danh sách.',
      );
    }

    if (target.progress.travelMode !== result.travelMode) {
      throw new Error('Phương tiện của chặng không khớp.');
    }

    return {
      ...draft,
      review: undefined,
      stops: draft.stops.map(stop => {
        if (stop.id !== id) return stop;

        const next = {
          ...stop,
          completed: true,
          result,
        };

        if (stop.result) {
          next.previousResults = [
            ...(stop.previousResults ?? []),
            stop.result,
          ];
        }

        delete next.progress;

        return next;
      }),
    };
  });
}

export function cancelLeg(id: string) {
  return tripStore.update(draft => ({
    ...draft,
    stops: draft.stops.map(stop => {
      if (stop.id !== id) return stop;

      const next = { ...stop };
      delete next.progress;

      return next;
    }),
  }));
}