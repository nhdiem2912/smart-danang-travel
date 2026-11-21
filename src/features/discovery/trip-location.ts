import * as Location from 'expo-location';

function usable(
  value: Location.LocationObject | null,
): value is Location.LocationObject {
  if (!value) return false;

  const coords = value.coords;

  return (
    Number.isFinite(coords.latitude) &&
    Math.abs(coords.latitude) <= 90 &&
    Number.isFinite(coords.longitude) &&
    Math.abs(coords.longitude) <= 180 &&
    coords.accuracy !== null &&
    Number.isFinite(coords.accuracy) &&
    coords.accuracy >= 0 &&
    coords.accuracy <= 250 &&
    Number.isFinite(value.timestamp) &&
    Math.abs(Date.now() - value.timestamp) <= 15000
  );
}

export async function getTripLocation(
  signal?: AbortSignal,
): Promise<Location.LocationObject> {
  let permission =
    await Location.getForegroundPermissionsAsync();

  if (
    permission.status !== 'granted' &&
    permission.canAskAgain
  ) {
    permission =
      await Location.requestForegroundPermissionsAsync();
  }

  if (permission.status !== 'granted') {
    throw new Error(
      'Hãy cấp quyền Vị trí cho ứng dụng trong Cài đặt Android.',
    );
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error(
      'Vị trí trên điện thoại đang tắt. Hãy bật GPS rồi thử lại.',
    );
  }

  if (signal?.aborted) {
    throw new Error('Đã hủy lấy vị trí.');
  }

  return new Promise<Location.LocationObject>(
    (resolve, reject) => {
      let done = false;
      let best: Location.LocationObject | null = null;

      let watcher:
        | Location.LocationSubscription
        | undefined;

      let grace:
        | ReturnType<typeof setTimeout>
        | undefined;

      const finish = (
        location: Location.LocationObject | null,
        error?: Error,
      ) => {
        if (done) return;

        done = true;

        clearTimeout(timeout);
        clearTimeout(grace);
        watcher?.remove();

        signal?.removeEventListener(
          'abort',
          cancel,
        );

        if (location) {
          resolve(location);
        } else {
          reject(
            error ?? new Error('Chưa lấy được vị trí.'),
          );
        }
      };

      const cancel = () =>
        finish(null, new Error('Đã hủy lấy vị trí.'));

      const timeout = setTimeout(() => {
        finish(
          usable(best) ? best : null,
          new Error(
            'Chưa có vị trí mới dùng được sau 30 giây. Bật Vị trí chính xác và cải thiện độ chính xác vị trí của Android, rồi thử ngoài trời. Có thể chọn địa chỉ xuất phát để lập lịch trước.',
          ),
        );
      }, 30000);

      const accept = (
        location: Location.LocationObject | null,
      ) => {
        if (done || !usable(location)) return;

        if (
          !usable(best) ||
          location.coords.accuracy! <
            best.coords.accuracy!
        ) {
          best = location;
        }

        if (best!.coords.accuracy! <= 50) {
          finish(best);
          return;
        }

        if (!grace) {
          grace = setTimeout(() => {
            grace = undefined;

            if (usable(best)) finish(best);
          }, 8000);
        }
      };

      signal?.addEventListener(
        'abort',
        cancel,
        { once: true },
      );

      if (signal?.aborted) {
        cancel();
        return;
      }

      void Location.getLastKnownPositionAsync({
        maxAge: 15000,
        requiredAccuracy: 250,
      })
        .then(accept)
        .catch(() => {});

      void Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then(accept)
        .catch(() => {});

      void Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 0,
          timeInterval: 1000,
        },
        accept,
      )
        .then(subscription => {
          watcher = subscription;

          if (done) subscription.remove();
        })
        .catch(() => {});
    },
  );
}