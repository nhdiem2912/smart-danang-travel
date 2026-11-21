import {
    getAccountToken,
} from '@/features/account/account-store';

import {
    findPlaceById,
} from '@/data/places.local';

import {
    validateDraft,
} from './trip-store-core';

import type {
    TripDraft,
} from './trip-model';

const BASE =
  'https://firestore.googleapis.com/v1/projects/' +
  'smart-da-nang-travel-5f0b7/' +
  'databases/(default)/documents/';

export type TripArchive = {
  version: 1;
  trip: TripDraft;
  completedAt: string;
  places: {
    id: string;
    name: string;
    address: string | null;
  }[];
};

function path(
  uid: string,
  id?: string,
) {
  return (
    `users/${encodeURIComponent(uid)}/trips` +
    (
      id
        ? `/${encodeURIComponent(id)}`
        : ''
    )
  );
}

async function request(
  uid: string,
  endpoint: string,
  method = 'GET',
  body?: unknown,
  signal?: AbortSignal,
) {
  const controller = new AbortController();

  const abort = () => controller.abort();

  signal?.addEventListener(
    'abort',
    abort,
  );

  if (signal?.aborted) {
    controller.abort();
  }

  const timeout = setTimeout(
    abort,
    20000,
  );

  try {
    const token = await getAccountToken(uid);

    return await fetch(
      BASE + endpoint,
      {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(body
          ? {
              body: JSON.stringify(body),
            }
          : {}),
      },
    );
  } finally {
    clearTimeout(timeout);

    signal?.removeEventListener(
      'abort',
      abort,
    );
  }
}

function httpError(status: number) {
  return new Error(
    status === 403
      ? (
          'Chưa được phép lưu lịch sử. ' +
          'Kiểm tra Firestore Rules.'
        )
      : (
          `Không truy cập được lịch sử ` +
          `(HTTP ${status}). ` +
          'Dữ liệu hiện tại vẫn được giữ.'
        ),
  );
}

export function decodeArchive(
  value: unknown,
): TripArchive {
  const payload = (
    value as {
      fields?: {
        payload?: {
          stringValue?: string;
        };
      };
    }
  )?.fields?.payload?.stringValue;

  if (!payload) {
    throw new Error(
      'Bản ghi lịch sử thiếu dữ liệu.',
    );
  }

  const archive = JSON.parse(
    payload,
  ) as TripArchive;

  validateDraft(archive.trip);

  if (
    archive.version !== 1 ||
    !archive.trip.review ||
    !archive.trip.stops.length ||
    archive.trip.stops.some(
      stop => !stop.completed,
    ) ||
    !Number.isFinite(
      Date.parse(archive.completedAt),
    ) ||
    !Array.isArray(archive.places) ||
    archive.places.some(
      place =>
        !place ||
        typeof place.id !== 'string' ||
        typeof place.name !== 'string' ||
        (
          place.address !== null &&
          typeof place.address !== 'string'
        ),
    )
  ) {
    throw new Error(
      'Bản ghi lịch sử không hợp lệ.',
    );
  }

  return archive;
}

export async function getArchivedTrip(
  uid: string,
  id: string,
  signal?: AbortSignal,
): Promise<TripArchive | null> {
  const response = await request(
    uid,
    path(uid, id),
    'GET',
    undefined,
    signal,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw httpError(response.status);
  }

  return decodeArchive(
    await response.json(),
  );
}

export async function archiveTrip(
  uid: string,
  draft: TripDraft,
): Promise<TripArchive> {
  validateDraft(draft);

  if (
    !draft.review ||
    !draft.stops.length ||
    draft.stops.some(
      stop =>
        !stop.completed ||
        stop.progress,
    )
  ) {
    throw new Error(
      'Hoàn tất mọi địa điểm và đánh giá ' +
      'trước khi lưu lịch sử.',
    );
  }

  const placeIds = [
    ...new Set(
      draft.stops.map(
        stop => stop.placeId,
      ),
    ),
  ];

  const value: TripArchive = {
    version: 1,
    trip: draft,
    completedAt:
      draft.review.submittedAt,
    places: placeIds.map(id => {
      const place = findPlaceById(id);

      return {
        id,
        name: place?.name || id,
        address: place?.address ?? null,
      };
    }),
  };

  const payload = JSON.stringify(value);

  if (payload.length > 100000) {
    throw new Error(
      'Dữ liệu chuyến quá lớn để lưu. ' +
      'Chuyến hiện tại vẫn được giữ.',
    );
  }

  const body = {
    fields: {
      version: {
        integerValue: '1',
      },
      tripId: {
        stringValue: draft.id,
      },
      completedAt: {
        stringValue: value.completedAt,
      },
      payload: {
        stringValue: payload,
      },
    },
  };

  const response = await request(
    uid,
    path(uid, draft.id) +
      '?currentDocument.exists=false',
    'PATCH',
    body,
  );

  if (response.ok) {
    return decodeArchive(
      await response.json(),
    );
  }

  if (
    response.status === 409 ||
    response.status === 412
  ) {
    const existing =
      await getArchivedTrip(
        uid,
        draft.id,
      );

    const sameTrip =
      existing &&
      existing.trip.id === draft.id &&
      existing.trip.startDate ===
        draft.startDate &&
      JSON.stringify(
        existing.trip.stops,
      ) === JSON.stringify(draft.stops);

    if (sameTrip) {
      return existing;
    }

    throw new Error(
      'Mã chuyến trùng với lịch sử khác. ' +
      'Dữ liệu chưa bị xóa.',
    );
  }

  throw httpError(response.status);
}

export async function listTripHistory(
  uid: string,
  pageToken?: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    pageSize: '20',
    orderBy: 'completedAt desc',
  });

  if (pageToken) {
    params.set(
      'pageToken',
      pageToken,
    );
  }

  const response = await request(
    uid,
    path(uid) + '?' + params,
    'GET',
    undefined,
    signal,
  );

  if (!response.ok) {
    throw httpError(response.status);
  }

  const body = await response.json() as {
    documents?: unknown[];
    nextPageToken?: string;
  };

  return {
    trips: (
      body.documents ?? []
    ).map(decodeArchive),

    nextPageToken:
      body.nextPageToken ?? null,
  };
}